import { Router } from "express";
import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import {
  userProfiles,
  roles,
  sessions,
  clients,
  loans,
  repayments,
  accountingEntries,
  documents,
  auditLogs,
} from "@workspace/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { requireAuth, requireRole } from "../middleware/auth";
import { insertAuditLog, getIp, getDevice } from "../lib/auditLogger";

const router = Router();
router.use(requireAuth);

// Only admins can list all users
router.get("/users", requireRole("admin", "ceo"), async (req, res) => {
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
router.post("/users", requireRole("admin", "ceo"), async (req, res) => {
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

    await insertAuditLog({
      user_id: req.user!.id,
      user_role: req.user!.role_name,
      action: "user_created",
      module: "users",
      entity_id: row.id,
      entity_type: "user",
      details: { email: row.email, full_name: row.full_name, role_id: row.role_id, is_active: row.is_active },
      ip_address: getIp(req),
      device_info: getDevice(req),
    });

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

// Only admins can reset any user's password
router.put("/users/:id/reset-password", requireRole("admin", "ceo"), async (req, res) => {
  try {
    const userId = req.params.id as string;
    const { new_password } = req.body;

    if (!new_password) {
      res.status(400).json({ error: "New password is required" });
      return;
    }
    if (new_password.length < 6) {
      res.status(400).json({ error: "Password must be at least 6 characters" });
      return;
    }

    const existing = await db
      .select({ id: userProfiles.id, full_name: userProfiles.full_name, email: userProfiles.email })
      .from(userProfiles)
      .where(eq(userProfiles.id, userId))
      .limit(1);

    if (!existing.length) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const password_hash = await bcrypt.hash(new_password, 10);
    await db
      .update(userProfiles)
      .set({ password_hash, updated_at: new Date() })
      .where(eq(userProfiles.id, userId));

    await insertAuditLog({
      user_id: req.user!.id,
      user_role: req.user!.role_name,
      action: "user_password_reset",
      module: "users",
      entity_id: userId,
      entity_type: "user",
      details: { target_user_email: existing[0].email, target_user_name: existing[0].full_name },
      ip_address: getIp(req),
      device_info: getDevice(req),
    });

    res.json({ success: true });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message || "Failed to reset password" });
  }
});

// Only admins can toggle user active status (and not their own)
router.put("/users/:id/toggle-active", requireRole("admin", "ceo"), async (req, res) => {
  try {
    const userId = req.params.id as string;
    if (userId === req.user!.id) {
      res.status(400).json({ error: "Cannot deactivate your own account" });
      return;
    }
    const existing = await db
      .select({ is_active: userProfiles.is_active, full_name: userProfiles.full_name, email: userProfiles.email })
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

    await insertAuditLog({
      user_id: req.user!.id,
      user_role: req.user!.role_name,
      action: updated.is_active ? "user_activated" : "user_deactivated",
      module: "users",
      entity_id: userId,
      entity_type: "user",
      details: { target_user_email: existing[0].email, target_user_name: existing[0].full_name, is_active: updated.is_active },
      ip_address: getIp(req),
      device_info: getDevice(req),
    });

    const { password_hash: _, ...safe } = updated;
    res.json(safe);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message || "Failed to update user" });
  }
});

// Only admins can permanently delete a user (cannot delete self)
router.delete("/users/:id", requireRole("admin", "ceo"), async (req, res) => {
  try {
    const userId = req.params.id as string;
    const adminId = req.user!.id;

    if (userId === adminId) {
      res.status(400).json({ error: "Cannot delete your own account" });
      return;
    }

    const existing = await db
      .select({ id: userProfiles.id, full_name: userProfiles.full_name, email: userProfiles.email })
      .from(userProfiles)
      .where(eq(userProfiles.id, userId))
      .limit(1);

    if (!existing.length) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    // Clean up all FK references before deleting the user.
    // 1. Delete their active sessions.
    await db.delete(sessions).where(eq(sessions.user_id, userId));

    // 2. Delete their audit log entries (user_id is NOT NULL here).
    await db.delete(auditLogs).where(eq(auditLogs.user_id, userId));

    // 3. Nullify nullable FK references in clients.
    await db.update(clients)
      .set({ assigned_officer_id: null, updated_at: new Date() })
      .where(eq(clients.assigned_officer_id, userId));
    await db.update(clients)
      .set({ created_by: null, updated_at: new Date() })
      .where(eq(clients.created_by, userId));

    // 4. Nullify nullable FK references in loans.
    await db.update(loans)
      .set({ approved_by: null })
      .where(eq(loans.approved_by, userId));
    await db.update(loans)
      .set({ rejected_by: null })
      .where(eq(loans.rejected_by, userId));
    await db.update(loans)
      .set({ disbursed_by: null })
      .where(eq(loans.disbursed_by, userId));

    // 5. Reassign NOT NULL FK references to the deleting admin so records are preserved.
    await db.update(loans)
      .set({ created_by: adminId })
      .where(eq(loans.created_by, userId));
    await db.update(repayments)
      .set({ received_by: adminId })
      .where(eq(repayments.received_by, userId));
    await db.update(accountingEntries)
      .set({ created_by: adminId })
      .where(eq(accountingEntries.created_by, userId));

    // 6. Handle documents: NOT NULL uploaded_by → reassign; nullable verified_by → null.
    await db.update(documents)
      .set({ uploaded_by: adminId })
      .where(eq(documents.uploaded_by, userId));
    await db.update(documents)
      .set({ verified_by: null })
      .where(eq(documents.verified_by, userId));

    // 7. Finally delete the user.
    await db.delete(userProfiles).where(eq(userProfiles.id, userId));

    await insertAuditLog({
      user_id: adminId,
      user_role: req.user!.role_name,
      action: "user_deleted",
      module: "users",
      entity_id: userId,
      entity_type: "user",
      details: { email: existing[0].email, full_name: existing[0].full_name },
      ip_address: getIp(req),
      device_info: getDevice(req),
    });

    res.json({ success: true });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message || "Failed to delete user" });
  }
});

// Any authenticated user can update their own profile (name, phone)
router.put("/users/me", async (req, res) => {
  try {
    const { full_name, phone } = req.body;
    if (!full_name || !full_name.trim()) {
      res.status(400).json({ error: "Full name is required" });
      return;
    }
    const [updated] = await db
      .update(userProfiles)
      .set({ full_name: full_name.trim(), phone: phone || "", updated_at: new Date() })
      .where(eq(userProfiles.id, req.user!.id))
      .returning();

    await insertAuditLog({
      user_id: req.user!.id,
      user_role: req.user!.role_name,
      action: "profile_updated",
      module: "users",
      entity_id: req.user!.id,
      entity_type: "user",
      details: { full_name: updated.full_name, phone: updated.phone },
      ip_address: getIp(req),
      device_info: getDevice(req),
    });

    const { password_hash: _, ...safe } = updated;
    res.json(safe);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message || "Failed to update profile" });
  }
});

// Any authenticated user can change their own password
router.put("/users/me/password", async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password) {
      res.status(400).json({ error: "Current and new password are required" });
      return;
    }
    if (new_password.length < 6) {
      res.status(400).json({ error: "New password must be at least 6 characters" });
      return;
    }

    const [row] = await db
      .select({ password_hash: userProfiles.password_hash })
      .from(userProfiles)
      .where(eq(userProfiles.id, req.user!.id))
      .limit(1);

    if (!row) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const valid = await bcrypt.compare(current_password, row.password_hash);
    if (!valid) {
      res.status(400).json({ error: "Current password is incorrect" });
      return;
    }

    const password_hash = await bcrypt.hash(new_password, 10);
    await db
      .update(userProfiles)
      .set({ password_hash, updated_at: new Date() })
      .where(eq(userProfiles.id, req.user!.id));

    await insertAuditLog({
      user_id: req.user!.id,
      user_role: req.user!.role_name,
      action: "password_changed",
      module: "users",
      entity_id: req.user!.id,
      entity_type: "user",
      details: { email: req.user!.email },
      ip_address: getIp(req),
      device_info: getDevice(req),
    });

    res.json({ success: true });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message || "Failed to change password" });
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
