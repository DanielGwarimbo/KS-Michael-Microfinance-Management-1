import { Router } from "express";
import multer from "multer";
import { db } from "@workspace/db";
import { documents, userProfiles } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireAuth, requireRole } from "../middleware/auth";
import { ObjectStorageService } from "../lib/objectStorage";

const router = Router();
router.use(requireAuth);

const objectStorageService = new ObjectStorageService();

/** multer stores the uploaded file in memory (max 10 MB) */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    const allowed = ["application/pdf", "image/jpeg", "image/png", "image/webp", "image/gif"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF and image files are allowed"));
    }
  },
});

// All roles can view documents
router.get("/documents", async (req, res) => {
  try {
    const { entity_type, entity_id, verified } = req.query as Record<string, string>;

    const rows = await db
      .select({
        id: documents.id,
        entity_type: documents.entity_type,
        entity_id: documents.entity_id,
        document_type: documents.document_type,
        file_name: documents.file_name,
        file_path: documents.file_path,
        file_size: documents.file_size,
        mime_type: documents.mime_type,
        uploaded_by: documents.uploaded_by,
        verified: documents.verified,
        verified_by: documents.verified_by,
        verified_at: documents.verified_at,
        created_at: documents.created_at,
        uploader_name: userProfiles.full_name,
      })
      .from(documents)
      .leftJoin(userProfiles, eq(documents.uploaded_by, userProfiles.id))
      .orderBy(desc(documents.created_at));

    let result = rows;
    if (entity_type) result = result.filter((r) => r.entity_type === entity_type);
    if (entity_id) result = result.filter((r) => r.entity_id === entity_id);
    if (verified === "true") result = result.filter((r) => r.verified === true);
    else if (verified === "false") result = result.filter((r) => r.verified === false);

    res.json(result.map((r) => ({ ...r, uploader: { full_name: r.uploader_name } })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load documents" });
  }
});

/**
 * POST /api/documents  (multipart/form-data)
 *
 * Accepts a file upload along with document metadata. The file is uploaded
 * directly from the server to Replit Object Storage (GCS). A document record
 * is then saved in the database referencing the stored object path.
 *
 * Fields:
 *   file          — the file to upload (required)
 *   entity_type   — 'client_kyc' | 'guarantor_kyc' | 'loan' | 'collateral'
 *   entity_id     — UUID of the owning entity (client, guarantor, or loan)
 *   document_type — 'national_id' | 'passport' | 'proof_of_residence' | ...
 */
router.post("/documents", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "No file uploaded" });
      return;
    }

    const { entity_type, entity_id, document_type } = req.body as {
      entity_type?: string;
      entity_id?: string;
      document_type?: string;
    };

    if (!entity_type || !entity_id || !document_type) {
      res.status(400).json({ error: "entity_type, entity_id and document_type are required" });
      return;
    }

    // Upload the file buffer to Replit Object Storage
    const objectPath = await objectStorageService.uploadBuffer(
      req.file.buffer,
      req.file.mimetype,
    );

    // Persist the document metadata in the database
    const [doc] = await db
      .insert(documents)
      .values({
        entity_type,
        entity_id,
        document_type,
        file_name: req.file.originalname,
        file_path: objectPath,
        file_size: req.file.size,
        mime_type: req.file.mimetype,
        uploaded_by: req.user!.id,
      })
      .returning();

    res.json(doc);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message || "Failed to upload document" });
  }
});

// Only admin/manager can verify documents
router.put(
  "/documents/:id/verify",
  requireRole("admin", "manager"),
  async (req, res) => {
    try {
      const docId = req.params.id as string;
      const [updated] = await db
        .update(documents)
        .set({ verified: true, verified_by: req.user!.id, verified_at: new Date() })
        .where(eq(documents.id, docId))
        .returning();

      res.json(updated);
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message || "Failed to verify document" });
    }
  },
);

export default router;
