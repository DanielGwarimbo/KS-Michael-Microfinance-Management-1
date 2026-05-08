import { Router, type IRouter, type Request, type Response } from "express";
import { Readable } from "stream";
import multer from "multer";
import { db } from "@workspace/db";
import { documents, userProfiles } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { ObjectStorageService, ObjectNotFoundError } from "../lib/objectStorage";
import { requireAuth } from "../middleware/auth";

const router: IRouter = Router();
const objectStorageService = new ObjectStorageService();

const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only image files (JPEG, PNG, WebP, GIF) are allowed"));
    }
  },
});

/**
 * GET /storage/public-objects/*
 * Serve public assets from PUBLIC_OBJECT_SEARCH_PATHS.
 * No auth required — these are unconditionally public app assets.
 */
router.get("/storage/public-objects/*filePath", async (req: Request, res: Response) => {
  try {
    const raw = req.params.filePath;
    const filePath = Array.isArray(raw) ? raw.join("/") : raw;
    const file = await objectStorageService.searchPublicObject(filePath);
    if (!file) {
      res.status(404).json({ error: "File not found" });
      return;
    }
    const response = await objectStorageService.downloadObject(file);
    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));
    if (response.body) {
      const nodeStream = Readable.fromWeb(response.body as ReadableStream<Uint8Array>);
      nodeStream.pipe(res);
    } else {
      res.end();
    }
  } catch (error) {
    console.error("Error serving public object", error);
    res.status(500).json({ error: "Failed to serve public object" });
  }
});

/**
 * GET /storage/objects/*
 * Serve KYC/loan documents uploaded by staff.
 *
 * Access control:
 *   1. requireAuth — user must be logged in (any role).
 *   2. DB ownership check — the requested objectPath must match a document
 *      record in the documents table, confirming it was legitimately uploaded
 *      through the application and not a path traversal or guessing attempt.
 *
 * All authenticated staff roles (admin, manager, loan_officer, cashier,
 * accountant) are permitted to view any document — this matches the existing
 * policy on GET /documents where all authenticated roles can list documents.
 */
router.get("/storage/objects/*path", requireAuth, async (req: Request, res: Response) => {
  try {
    const raw = req.params.path;
    const wildcardPath = Array.isArray(raw) ? raw.join("/") : raw;
    const objectPath = `/objects/${wildcardPath}`;

    // Verify this objectPath corresponds to a document the application created.
    // This prevents arbitrary object enumeration / path guessing.
    const [doc] = await db
      .select({ id: documents.id })
      .from(documents)
      .where(eq(documents.file_path, objectPath))
      .limit(1);

    if (!doc) {
      res.status(404).json({ error: "Document not found" });
      return;
    }

    const objectFile = await objectStorageService.getObjectEntityFile(objectPath);
    const response = await objectStorageService.downloadObject(objectFile);

    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));

    if (response.body) {
      const nodeStream = Readable.fromWeb(response.body as ReadableStream<Uint8Array>);
      nodeStream.pipe(res);
    } else {
      res.end();
    }
  } catch (error) {
    if (error instanceof ObjectNotFoundError) {
      res.status(404).json({ error: "Object not found" });
      return;
    }
    console.error("Error serving object", error);
    res.status(500).json({ error: "Failed to serve object" });
  }
});

/**
 * POST /storage/avatars/upload
 * Upload an avatar image for the currently authenticated user.
 * Stores the image in object storage and returns the object path.
 */
router.post("/storage/avatars/upload", requireAuth, avatarUpload.single("avatar"), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "No image file provided" });
      return;
    }

    // Fetch the current avatar_url so we can delete the old object after uploading the new one
    const [existing] = await db
      .select({ avatar_url: userProfiles.avatar_url })
      .from(userProfiles)
      .where(eq(userProfiles.id, req.user!.id))
      .limit(1);

    const objectPath = await objectStorageService.uploadBuffer(req.file.buffer, req.file.mimetype);

    await db
      .update(userProfiles)
      .set({ avatar_url: objectPath, updated_at: new Date() })
      .where(eq(userProfiles.id, req.user!.id));

    // Best-effort delete of the previous avatar object to avoid orphaned storage
    if (existing?.avatar_url) {
      await objectStorageService.deleteObject(existing.avatar_url).catch(() => {});
    }

    res.json({ avatar_url: objectPath });
  } catch (error: any) {
    console.error("Error uploading avatar", error);
    res.status(500).json({ error: error.message || "Failed to upload avatar" });
  }
});

/**
 * DELETE /storage/avatars/me
 * Remove the avatar for the currently authenticated user.
 */
router.delete("/storage/avatars/me", requireAuth, async (req: Request, res: Response) => {
  try {
    const [user] = await db
      .select({ avatar_url: userProfiles.avatar_url })
      .from(userProfiles)
      .where(eq(userProfiles.id, req.user!.id))
      .limit(1);

    if (user?.avatar_url) {
      await objectStorageService.deleteObject(user.avatar_url).catch(() => {});
    }

    await db
      .update(userProfiles)
      .set({ avatar_url: null, updated_at: new Date() })
      .where(eq(userProfiles.id, req.user!.id));

    res.json({ success: true });
  } catch (error: any) {
    console.error("Error removing avatar", error);
    res.status(500).json({ error: error.message || "Failed to remove avatar" });
  }
});

/**
 * GET /storage/avatars/*
 * Serve avatar images. Requires auth; any authenticated user can view any avatar
 * (avatars are visible in the UI to all staff).
 */
router.get("/storage/avatars/*path", requireAuth, async (req: Request, res: Response) => {
  try {
    const raw = req.params.path;
    const wildcardPath = Array.isArray(raw) ? raw.join("/") : raw;
    const objectPath = `/objects/${wildcardPath}`;

    const objectFile = await objectStorageService.getObjectEntityFile(objectPath);
    const response = await objectStorageService.downloadObject(objectFile, 86400);

    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));

    if (response.body) {
      const nodeStream = Readable.fromWeb(response.body as ReadableStream<Uint8Array>);
      nodeStream.pipe(res);
    } else {
      res.end();
    }
  } catch (error) {
    if (error instanceof ObjectNotFoundError) {
      res.status(404).json({ error: "Avatar not found" });
      return;
    }
    console.error("Error serving avatar", error);
    res.status(500).json({ error: "Failed to serve avatar" });
  }
});

export default router;
