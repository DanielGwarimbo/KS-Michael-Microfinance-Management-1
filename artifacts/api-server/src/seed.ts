import { db } from "@workspace/db";
import { roles, userProfiles } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from 'bcryptjs';

async function seed() {
  console.log("Seeding database...");

  const roleData = [
    { name: "admin", description: "System Administrator - full access" },
    { name: "manager", description: "Branch Manager - approve loans, view reports" },
    { name: "loan_officer", description: "Loan Officer - manage clients and loans" },
    { name: "cashier", description: "Cashier - record repayments, disburse loans" },
    { name: "accountant", description: "Accountant - view accounting entries and reports" },
  ];

  const insertedRoles: Record<string, string> = {};
  for (const r of roleData) {
    const existing = await db
      .select()
      .from(roles)
      .where(eq(roles.name, r.name))
      .limit(1);
    if (existing.length > 0) {
      insertedRoles[r.name] = existing[0].id;
      console.log(`Role '${r.name}' already exists (id: ${existing[0].id})`);
    } else {
      const [inserted] = await db.insert(roles).values(r).returning();
      insertedRoles[r.name] = inserted.id;
      console.log(`Created role: ${r.name} (id: ${inserted.id})`);
    }
  }

  const adminRoleId = insertedRoles["admin"];
  const adminEmail = "admin@ksmms.co.zw";

  const existingAdmin = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.email, adminEmail))
    .limit(1);

  if (existingAdmin.length > 0) {
    console.log(`Admin user already exists: ${adminEmail}`);
  } else {
    const passwordHash = await bcrypt.hash("admin123", 12);
    const [admin] = await db
      .insert(userProfiles)
      .values({
        full_name: "System Administrator",
        email: adminEmail,
        password_hash: passwordHash,
        role_id: adminRoleId,
        phone: "+263771000001",
        is_active: true,
      })
      .returning();
    console.log(`Created admin: ${adminEmail} / admin123 (id: ${admin.id})`);
  }

  console.log("Seed complete!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
