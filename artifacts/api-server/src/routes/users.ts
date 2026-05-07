import { Router } from "express";
import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import { userProfiles, roles } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

// Only admins can list all users
router.get("/users", requireRole("admin"), async (req, res) => {
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

// Only admins can create users
router.post("/users", requireRole("admin"), async (req, res) => {
  try {
    const { email, password, full_name, role_id, phone, is_active } = req.body;
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
        is_active: is_active !== false,
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

// Only admins can toggle user active status (and not their own)
router.put("/users/:id/toggle-active", requireRole("admin"), async (req, res) => {
  try {
    const userId = req.params.id as string;
    if (userId === req.user!.id) {
      res.status(400).json({ error: "Cannot deactivate your own account" });
      return;
    }
    const existing = await db
      .select({ is_active: userProfiles.is_active })
      .from(userProfiles)
      .where(eq(userProfiles.id, userId))
      .limit(1);

    if (!existing.length) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const [updated] = await db
      .update(userProfiles)
      .set({ is_active: !existing[0].is_active, updated_at: new Date() })
      .where(eq(userProfiles.id, userId))
      .returning();

    const { password_hash: _, ...safe } = updated;
    res.json(safe);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message || "Failed to update user" });
  }
});

// All authenticated users can fetch officers (for dropdowns)
router.get("/officers", async (req, res) => {
  try {
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
