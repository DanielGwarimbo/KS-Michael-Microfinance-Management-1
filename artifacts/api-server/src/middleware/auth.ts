import type { Request, Response, NextFunction } from "express";
import { db } from "@workspace/db";
import {
  sessions,
  userProfiles,
  roles,
} from "@workspace/db/schema";
import { eq } from "drizzle-orm";

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  role_id: string;
  role_name: string;
  is_active: boolean;
  phone: string;
  avatar_url: string | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

type RoleName = "admin" | "manager" | "loan_officer" | "cashier" | "accountant";

/**
 * Middleware factory — requires the authenticated user to have one of the allowed roles.
 * Must be used AFTER requireAuth in the middleware chain.
 */
export function requireRole(...allowedRoles: RoleName[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const roleName = req.user?.role_name as RoleName | undefined;
    if (!roleName || !allowedRoles.includes(roleName)) {
      res.status(403).json({ error: "Insufficient permissions" });
      return;
    }
    next();
  };
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const sessionId = req.cookies?.ksmms_session;
  if (!sessionId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const sessionRows = await db
    .select()
    .from(sessions)
    .where(eq(sessions.id, sessionId))
    .limit(1);

  if (!sessionRows.length || sessionRows[0].expires_at < new Date()) {
    res.status(401).json({ error: "Session expired" });
    return;
  }

  const userRows = await db
    .select({
      id: userProfiles.id,
      email: userProfiles.email,
      full_name: userProfiles.full_name,
      role_id: userProfiles.role_id,
      role_name: roles.name,
      is_active: userProfiles.is_active,
      phone: userProfiles.phone,
      avatar_url: userProfiles.avatar_url,
    })
    .from(userProfiles)
    .leftJoin(roles, eq(userProfiles.role_id, roles.id))
    .where(eq(userProfiles.id, sessionRows[0].user_id))
    .limit(1);

  if (!userRows.length || !userRows[0].is_active) {
    res.status(401).json({ error: "User not found or inactive" });
    return;
  }

  req.user = userRows[0] as AuthUser;
  next();
}
