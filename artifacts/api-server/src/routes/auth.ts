import { Router } from "express";
import bcrypt from 'bcryptjs';
import { db } from "@workspace/db";
import { sessions, userProfiles, roles } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";

const router = Router();

const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;
const COOKIE_NAME = "ksmms_session";

router.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: "Email and password required" });
      return;
    }

    const userRows = await db
      .select({
        id: userProfiles.id,
        email: userProfiles.email,
        full_name: userProfiles.full_name,
        password_hash: userProfiles.password_hash,
        role_id: userProfiles.role_id,
        role_name: roles.name,
        is_active: userProfiles.is_active,
        phone: userProfiles.phone,
      })
      .from(userProfiles)
      .leftJoin(roles, eq(userProfiles.role_id, roles.id))
      .where(eq(userProfiles.email, email.toLowerCase()))
      .limit(1);

    if (!userRows.length) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const user = userRows[0];
    if (!user.is_active) {
      res.status(401).json({ error: "Account is inactive" });
      return;
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
    const [session] = await db
      .insert(sessions)
      .values({ user_id: user.id, expires_at: expiresAt })
      .returning();

    res.cookie(COOKIE_NAME, session.id, {
      httpOnly: true,
      sameSite: "lax",
      expires: expiresAt,
      secure: process.env.NODE_ENV === "production",
    });

    const { password_hash: _, ...safeUser } = user;
    res.json({ user: safeUser });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Login failed" });
  }
});

router.post("/auth/logout", async (req, res) => {
  const sessionId = req.cookies?.[COOKIE_NAME];
  if (sessionId) {
    await db.delete(sessions).where(eq(sessions.id, sessionId)).catch(() => {});
  }
  res.clearCookie(COOKIE_NAME);
  res.json({ ok: true });
});

router.get("/auth/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

export default router;
