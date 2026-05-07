import { Router } from "express";
import { db } from "@workspace/db";
import {
  clients,
  guarantors,
  loans,
  documents,
  userProfiles,
} from "@workspace/db/schema";
import { eq, sql, desc, and } from "drizzle-orm";
import { requireAuth, requireRole } from "../middleware/auth";
import { insertAuditLog, getIp, getDevice } from "../lib/auditLogger";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isUUID(val: string) { return UUID_RE.test(val); }

const router = Router();
router.use(requireAuth);

async function nextClientNumber() {
  const [row] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(clients);
  const n = Number(row.count) + 1;
  return `CLT-${String(n).padStart(4, "0")}`;
}

// All authenticated roles can view clients
router.get("/clients", async (req, res) => {
  try {
    const { status, search } = req.query as Record<string, string>;

    const rows = await db
      .select({
        id: clients.id,
        client_number: clients.client_number,
        first_name: clients.first_name,
        last_name: clients.last_name,
        id_number: clients.id_number,
        id_type: clients.id_type,
        date_of_birth: clients.date_of_birth,
        gender: clients.gender,
        phone: clients.phone,
        email: clients.email,
        address: clients.address,
        city: clients.city,
        province: clients.province,
        employment_status: clients.employment_status,
        employer: clients.employer,
        monthly_income: clients.monthly_income,
        client_type: clients.client_type,
        business_name: clients.business_name,
        business_reg_number: clients.business_reg_number,
        kyc_verified: clients.kyc_verified,
        assigned_officer_id: clients.assigned_officer_id,
        status: clients.status,
        created_by: clients.created_by,
        created_at: clients.created_at,
        updated_at: clients.updated_at,
        officer_name: userProfiles.full_name,
      })
      .from(clients)
      .leftJoin(userProfiles, eq(clients.assigned_officer_id, userProfiles.id))
      .orderBy(desc(clients.created_at));

    let result = rows;
    if (status) result = result.filter((r) => r.status === status);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (r) =>
          r.first_name.toLowerCase().includes(q) ||
          r.last_name.toLowerCase().includes(q) ||
          r.client_number.toLowerCase().includes(q) ||
          r.phone.toLowerCase().includes(q) ||
          r.id_number.toLowerCase().includes(q),
      );
    }

    res.json(
      result.map((r) => ({
        ...r,
        assigned_officer: r.officer_name ? { full_name: r.officer_name } : null,
      })),
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load clients" });
  }
});

// Admin, manager, loan_officer can create clients
router.post(
  "/clients",
  requireRole("admin", "manager", "loan_officer"),
  async (req, res) => {
    try {
      const client_number = await nextClientNumber();
      const [row] = await db
        .insert(clients)
        .values({
          ...req.body,
          client_number,
          created_by: req.user!.id,
          monthly_income: Number(req.body.monthly_income || 0),
        })
        .returning();

      await insertAuditLog({
        user_id: req.user!.id,
        user_role: req.user!.role_name,
        action: "client_created",
        module: "clients",
        entity_id: row.id,
        entity_type: "client",
        details: { client_number: row.client_number, name: `${row.first_name} ${row.last_name}`, client_type: row.client_type },
        ip_address: getIp(req),
        device_info: getDevice(req),
      });

      res.json(row);
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message || "Failed to create client" });
    }
  },
);

// All authenticated roles can view a client detail
router.get("/clients/:id", async (req, res) => {
  try {
    const clientId = req.params.id as string;
    if (!isUUID(clientId)) { res.status(404).json({ error: "Client not found" }); return; }
    const [row] = await db
      .select({
        id: clients.id,
        client_number: clients.client_number,
        first_name: clients.first_name,
        last_name: clients.last_name,
        id_number: clients.id_number,
        id_type: clients.id_type,
        date_of_birth: clients.date_of_birth,
        gender: clients.gender,
        phone: clients.phone,
        email: clients.email,
        address: clients.address,
        city: clients.city,
        province: clients.province,
        employment_status: clients.employment_status,
        employer: clients.employer,
        monthly_income: clients.monthly_income,
        client_type: clients.client_type,
        business_name: clients.business_name,
        business_reg_number: clients.business_reg_number,
        kyc_verified: clients.kyc_verified,
        assigned_officer_id: clients.assigned_officer_id,
        status: clients.status,
        created_by: clients.created_by,
        created_at: clients.created_at,
        updated_at: clients.updated_at,
        officer_name: userProfiles.full_name,
      })
      .from(clients)
      .leftJoin(userProfiles, eq(clients.assigned_officer_id, userProfiles.id))
      .where(eq(clients.id, clientId))
      .limit(1);

    if (!row) {
      res.status(404).json({ error: "Client not found" });
      return;
    }
    res.json({ ...row, assigned_officer: row.officer_name ? { full_name: row.officer_name } : null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load client" });
  }
});

// Admin, manager, loan_officer can update client details
router.put(
  "/clients/:id",
  requireRole("admin", "manager", "loan_officer"),
  async (req, res) => {
    try {
      const [row] = await db
        .update(clients)
        .set({
          ...req.body,
          updated_at: new Date(),
          monthly_income: Number(req.body.monthly_income || 0),
        })
        .where(eq(clients.id, req.params.id as string))
        .returning();

      await insertAuditLog({
        user_id: req.user!.id,
        user_role: req.user!.role_name,
        action: "client_updated",
        module: "clients",
        entity_id: row.id,
        entity_type: "client",
        details: { client_number: row.client_number, name: `${row.first_name} ${row.last_name}` },
        ip_address: getIp(req),
        device_info: getDevice(req),
      });

      res.json(row);
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message || "Failed to update client" });
    }
  },
);

// Only admin/manager can verify KYC
router.put(
  "/clients/:id/kyc",
  requireRole("admin", "manager"),
  async (req, res) => {
    try {
      const [row] = await db
        .update(clients)
        .set({ kyc_verified: req.body.kyc_verified, updated_at: new Date() })
        .where(eq(clients.id, req.params.id as string))
        .returning();

      await insertAuditLog({
        user_id: req.user!.id,
        user_role: req.user!.role_name,
        action: req.body.kyc_verified ? "client_kyc_verified" : "client_kyc_unverified",
        module: "clients",
        entity_id: row.id,
        entity_type: "client",
        details: { client_number: row.client_number, name: `${row.first_name} ${row.last_name}`, kyc_verified: row.kyc_verified },
        ip_address: getIp(req),
        device_info: getDevice(req),
      });

      res.json(row);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to update KYC" });
    }
  },
);

// Only admin/manager can verify a guarantor's KYC
router.put(
  "/clients/:clientId/guarantors/:guarantorId/kyc",
  requireRole("admin", "manager"),
  async (req, res) => {
    try {
      const { clientId, guarantorId } = req.params as { clientId: string; guarantorId: string };
      if (!isUUID(clientId) || !isUUID(guarantorId)) {
        res.status(404).json({ error: "Not found" });
        return;
      }
      const kyc_verified = req.body.kyc_verified;
      if (typeof kyc_verified !== "boolean") {
        res.status(400).json({ error: "kyc_verified must be a boolean" });
        return;
      }
      const [row] = await db
        .update(guarantors)
        .set({ kyc_verified, updated_at: new Date() })
        .where(and(eq(guarantors.id, guarantorId), eq(guarantors.client_id, clientId)))
        .returning();
      if (!row) { res.status(404).json({ error: "Guarantor not found" }); return; }

      await insertAuditLog({
        user_id: req.user!.id,
        user_role: req.user!.role_name,
        action: kyc_verified ? "guarantor_kyc_verified" : "guarantor_kyc_unverified",
        module: "clients",
        entity_id: guarantorId,
        entity_type: "guarantor",
        details: { guarantor_id: guarantorId, client_id: clientId, guarantor_name: `${row.first_name} ${row.last_name}`, kyc_verified },
        ip_address: getIp(req),
        device_info: getDevice(req),
      });

      res.json(row);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to update guarantor KYC" });
    }
  },
);

// All roles can view guarantors
router.get("/clients/:id/guarantors", async (req, res) => {
  try {
    const rows = await db
      .select()
      .from(guarantors)
      .where(eq(guarantors.client_id, req.params.id as string));
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load guarantors" });
  }
});

// Admin, manager, loan_officer can add guarantors
router.post(
  "/clients/:id/guarantors",
  requireRole("admin", "manager", "loan_officer"),
  async (req, res) => {
    try {
      const [row] = await db
        .insert(guarantors)
        .values({
          ...req.body,
          client_id: req.params.id as string,
          monthly_income: Number(req.body.monthly_income || 0),
        })
        .returning();

      await insertAuditLog({
        user_id: req.user!.id,
        user_role: req.user!.role_name,
        action: "guarantor_added",
        module: "clients",
        entity_id: row.id,
        entity_type: "guarantor",
        details: { guarantor_name: `${row.first_name} ${row.last_name}`, client_id: req.params.id },
        ip_address: getIp(req),
        device_info: getDevice(req),
      });

      res.json(row);
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message || "Failed to add guarantor" });
    }
  },
);

// All roles can view a client's loans
router.get("/clients/:id/loans", async (req, res) => {
  try {
    const rows = await db
      .select()
      .from(loans)
      .where(eq(loans.client_id, req.params.id as string))
      .orderBy(desc(loans.created_at));
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load loans" });
  }
});

// All roles can view a client's documents
router.get("/clients/:id/documents", async (req, res) => {
  try {
    const rows = await db
      .select()
      .from(documents)
      .where(eq(documents.entity_id, req.params.id as string));
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load documents" });
  }
});

export default router;
