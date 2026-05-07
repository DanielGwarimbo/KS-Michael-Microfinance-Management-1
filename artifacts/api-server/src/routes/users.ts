import { Router } from "express";
import bcrypt from 'bcryptjs';
import { db } from "@workspace/db";
import { userProfiles, roles } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

router.get("/users", async (req, res) => {
  try {
    const rows = await db
      .select({
        id: userProfiles.id,
        email: userProfiles.email,
        full_name: userProfiles.full_name,
        role_id: userProfiles.role_id,
        role_name: roles.name,
        is_active: userProfiles.is_active,
        phone: userProfiles.phone,
        created_at: userProfiles.created_at,
        updated_at: userProfiles.updated_at,
      })
      .from(userProfiles)
      .leftJoin(roles, eq(userProfiles.role_id, roles.id))
      .orderBy(desc(userProfiles.created_at));

    res.json(
      rows.map((r) => ({
        ...r,
        role: { id: r.role_id, name: r.role_name },
      })),
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load users" });
  }
});

router.post("/users", async (req, res) => {
  try {
    const { email, password, full_name, role_id, phone } = req.body;
    if (!password) {
      res.status(400).json({ error: "Password is required" });
      return;
    }
    const password_hash = await bcrypt.hash(password, 10);
    const [row] = await db
      .insert(userProfiles)
      .values({
        email: email.toLowerCase(),
        password_hash,
        full_name,
        role_id,
        phone: phone || "",
      })
      .returning();

    const { password_hash: _, ...safe } = row;
    res.json(safe);
  } catch (err: any) {
    console.error(err);
    if (err.message?.includes("unique")) {
      res.status(400).json({ error: "Email already exists" });
    } else {
      res.status(500).json({ error: err.message || "Failed to create user" });
    }
  }
});

router.put("/users/:id/toggle-active", async (req, res) => {
  try {
    const existing = await db
      .select({ is_active: userProfiles.is_active })
      .from(userProfiles)
      .where(eq(userProfiles.id, req.params.id))
      .limit(1);

    if (!existing.length) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const [updated] = await db
      .update(userProfiles)
      .set({ is_active: !existing[0].is_active, updated_at: new Date() })
      .where(eq(userProfiles.id, req.params.id))
      .returning();

    const { password_hash: _, ...safe } = updated;
    res.json(safe);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message || "Failed to update user" });
  }
});

router.get("/officers", async (req, res) => {
  try {
    const officerRole = await db
      .select({ id: roles.id })
      .from(roles)
      .where(eq(roles.name, "loan_officer"))
      .limit(1);

    const rows = await db
      .select({
        id: userProfiles.id,
        full_name: userProfiles.full_name,
        email: userProfiles.email,
        phone: userProfiles.phone,
        is_active: userProfiles.is_active,
        role_id: userProfiles.role_id,
        role_name: roles.name,
      })
      .from(userProfiles)
      .leftJoin(roles, eq(userProfiles.role_id, roles.id))
      .where(eq(userProfiles.is_active, true));

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load officers" });
  }
});

export default router;
