import { Router } from "express";
import { db } from "@workspace/db";
import { documents, userProfiles } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

// All roles can view documents
router.get("/documents", async (req, res) => {
  try {
    const { entity_type, verified } = req.query as Record<string, string>;

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
    if (verified === "true") result = result.filter((r) => r.verified === true);
    else if (verified === "false") result = result.filter((r) => r.verified === false);

    res.json(result.map((r) => ({ ...r, uploader: { full_name: r.uploader_name } })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load documents" });
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
