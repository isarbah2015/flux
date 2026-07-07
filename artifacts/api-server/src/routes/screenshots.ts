import { Router, type IRouter } from "express";
import { and, desc, eq } from "drizzle-orm";
import { db, screenshotsTable } from "@workspace/db";
import type { Screenshot, ScreenshotCategory } from "@workspace/db";
import {
  CreateScreenshotBody,
  GetScreenshotParams,
  GetScreenshotsQueryParams,
} from "@workspace/api-zod";
import { classifyScreenshot } from "../lib/classify";
import { requireAuth, userId } from "../middlewares/auth";

const router: IRouter = Router();

// Every screenshot route is scoped to the authenticated user.
router.use(requireAuth);

function matchesQuery(s: Screenshot, q: string): boolean {
  const needle = q.toLowerCase();
  return (
    s.extractedText.toLowerCase().includes(needle) ||
    s.summary.toLowerCase().includes(needle) ||
    s.category.toLowerCase().includes(needle) ||
    s.tags.some((t) => t.toLowerCase().includes(needle))
  );
}

// GET /api/screenshots?category=&q=
router.get("/screenshots", async (req, res) => {
  const parsed = GetScreenshotsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { category, q } = parsed.data;
  const uid = userId(req);

  const rows = await db
    .select()
    .from(screenshotsTable)
    .where(
      category
        ? and(
            eq(screenshotsTable.userId, uid),
            eq(screenshotsTable.category, category as ScreenshotCategory),
          )
        : eq(screenshotsTable.userId, uid),
    )
    .orderBy(desc(screenshotsTable.capturedAt));

  const filtered = q ? rows.filter((s) => matchesQuery(s, q)) : rows;
  res.json(filtered);
});

// POST /api/screenshots
router.post("/screenshots", async (req, res) => {
  const parsed = CreateScreenshotBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const input = parsed.data;

  const classification = await classifyScreenshot({
    extractedText: input.extractedText,
    imageBase64: input.imageBase64,
    override: input.category as ScreenshotCategory | undefined,
  });

  const [row] = await db
    .insert(screenshotsTable)
    .values({
      userId: userId(req),
      imageUri: input.imageUri ?? null,
      extractedText: classification.extractedText,
      category: classification.category,
      summary: classification.summary,
      tags: classification.tags,
      colorHex: classification.colorHex,
      metadata: classification.metadata,
      capturedAt: input.capturedAt ?? new Date(),
    })
    .returning();

  res.status(201).json(row);
});

// GET /api/screenshots/:id
router.get("/screenshots/:id", async (req, res) => {
  const parsed = GetScreenshotParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [row] = await db
    .select()
    .from(screenshotsTable)
    .where(and(eq(screenshotsTable.id, parsed.data.id), eq(screenshotsTable.userId, userId(req))))
    .limit(1);

  if (!row) {
    res.status(404).json({ error: "Screenshot not found" });
    return;
  }
  res.json(row);
});

export default router;
