import { Router } from "express";
import { db, recommendationsTable, workOrdersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { desc } from "drizzle-orm";

const router = Router();

router.get("/recommendations", async (req, res): Promise<void> => {
  const recs = await db
    .select()
    .from(recommendationsTable)
    .orderBy(desc(recommendationsTable.createdAt));
  res.json(
    recs.map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
    }))
  );
});

router.post("/recommendations/:id/work-order", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const [rec] = await db
    .select()
    .from(recommendationsTable)
    .where(eq(recommendationsTable.id, id));
  if (!rec) {
    res.status(404).json({ error: "Recommendation not found" });
    return;
  }

  const reference = `WO-${Date.now()}-${id}`;
  const [workOrder] = await db
    .insert(workOrdersTable)
    .values({ recommendationId: id, reference })
    .returning();

  await db
    .update(recommendationsTable)
    .set({ workOrderGenerated: true })
    .where(eq(recommendationsTable.id, id));

  res.json({ ...workOrder, createdAt: workOrder.createdAt.toISOString() });
});

router.post("/recommendations/:id/reminder", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const { reminderDate } = req.body;
  if (!reminderDate) {
    res.status(400).json({ error: "reminderDate is required" });
    return;
  }

  const [rec] = await db
    .update(recommendationsTable)
    .set({ reminderDate })
    .where(eq(recommendationsTable.id, id))
    .returning();

  if (!rec) {
    res.status(404).json({ error: "Recommendation not found" });
    return;
  }

  res.json({ ...rec, createdAt: rec.createdAt.toISOString() });
});

export default router;
