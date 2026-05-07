import { Router } from "express";
import { db } from "@workspace/db";
import {
  clients,
  guarantors,
  loans,
  documents,
  userProfiles,
} from "@workspace/db/schema";
import { eq, ilike, or, sql, desc } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.use(requireAuth);

async function nextClientNumber() {
  const [row] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(clients);
  const n = Number(row.count) + 1;
  return `CLT-${String(n).padStart(4, "0")}`;
}

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
      .leftJoin(
        userProfiles,
        eq(clients.assigned_officer_id, userProfiles.id),
      )
      .orderBy(desc(clients.created_at));

    let result = rows;

    if (status) {
      result = result.filter((r) => r.status === status);
    }

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
        assigned_officer: r.officer_name
          ? { full_name: r.officer_name }
          : null,
      })),
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load clients" });
  }
});

router.post("/clients", async (req, res) => {
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
    res.json(row);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message || "Failed to create client" });
  }
});

router.get("/clients/:id", async (req, res) => {
  try {
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
      .leftJoin(
        userProfiles,
        eq(clients.assigned_officer_id, userProfiles.id),
      )
      .where(eq(clients.id, req.params.id))
      .limit(1);

    if (!row) {
      res.status(404).json({ error: "Client not found" });
      return;
    }

    res.json({
      ...row,
      assigned_officer: row.officer_name ? { full_name: row.officer_name } : null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load client" });
  }
});

router.put("/clients/:id", async (req, res) => {
  try {
    const [row] = await db
      .update(clients)
      .set({
        ...req.body,
        updated_at: new Date(),
        monthly_income: Number(req.body.monthly_income || 0),
      })
      .where(eq(clients.id, req.params.id))
      .returning();
    res.json(row);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message || "Failed to update client" });
  }
});

router.put("/clients/:id/kyc", async (req, res) => {
  try {
    const [row] = await db
      .update(clients)
      .set({ kyc_verified: req.body.kyc_verified, updated_at: new Date() })
      .where(eq(clients.id, req.params.id))
      .returning();
    res.json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update KYC" });
  }
});

router.get("/clients/:id/guarantors", async (req, res) => {
  try {
    const rows = await db
      .select()
      .from(guarantors)
      .where(eq(guarantors.client_id, req.params.id));
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load guarantors" });
  }
});

router.post("/clients/:id/guarantors", async (req, res) => {
  try {
    const [row] = await db
      .insert(guarantors)
      .values({
        ...req.body,
        client_id: req.params.id,
        monthly_income: Number(req.body.monthly_income || 0),
      })
      .returning();
    res.json(row);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message || "Failed to add guarantor" });
  }
});

router.get("/clients/:id/loans", async (req, res) => {
  try {
    const rows = await db
      .select()
      .from(loans)
      .where(eq(loans.client_id, req.params.id))
      .orderBy(desc(loans.created_at));
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load loans" });
  }
});

router.get("/clients/:id/documents", async (req, res) => {
  try {
    const rows = await db
      .select()
      .from(documents)
      .where(eq(documents.entity_id, req.params.id));
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load documents" });
  }
});

export default router;
