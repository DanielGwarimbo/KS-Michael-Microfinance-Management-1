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
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
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
