import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { startOverdueScheduler } from "./scheduler/overdueChecker";
import { db } from "@workspace/db";
import { roles } from "@workspace/db/schema";

const REQUIRED_ROLES = [
  { name: "admin",        description: "System Administrator - full access" },
  { name: "ceo",          description: "Chief Executive Officer - full read access, view reports and accounting" },
  { name: "manager",      description: "Branch Manager - approve loans, view reports" },
  { name: "loan_officer", description: "Loan Officer - manage clients and loans" },
  { name: "cashier",      description: "Cashier - record repayments, disburse loans" },
  { name: "accountant",   description: "Accountant - view accounting entries and reports" },
];

async function ensureRoles() {
  try {
    const existing = await db.select({ name: roles.name }).from(roles);
    const existingNames = new Set(existing.map((r) => r.name));
    for (const role of REQUIRED_ROLES) {
      if (!existingNames.has(role.name)) {
        await db.insert(roles).values({
          id: crypto.randomUUID(),
          name: role.name,
          description: role.description,
        });
        logger.info({ role: role.name }, "Seeded missing role");
      }
    }
  } catch (err) {
    logger.error({ err }, "Failed to seed roles on startup");
  }
}

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use("/api", router);

startOverdueScheduler();
ensureRoles();

export default app;
