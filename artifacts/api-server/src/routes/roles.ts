import { Router } from "express";
import { db } from "@workspace/db";
import { roles } from "@workspace/db/schema";
import { requireAuth } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

router.get("/roles", async (req, res) => {
  try {
    const rows = await db.select().from(roles);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load roles" });
  }
});

export default router;
