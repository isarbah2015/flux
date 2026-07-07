import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, profilesTable } from "@workspace/db";
import { requireAuth, userId } from "../middlewares/auth";

const router: IRouter = Router();

const PROFILE_ID_RE = /^[a-z0-9_]{3,24}$/;

router.use(requireAuth);

async function getOrCreate(uid: string) {
  const [row] = await db.select().from(profilesTable).where(eq(profilesTable.userId, uid)).limit(1);
  if (row) return row;
  const [created] = await db.insert(profilesTable).values({ userId: uid }).returning();
  return created;
}

// GET /api/profile
router.get("/profile", async (req, res) => {
  const profile = await getOrCreate(userId(req));
  res.json(profile);
});

// PATCH /api/profile
router.patch("/profile", async (req, res) => {
  const uid = userId(req);
  const displayName =
    typeof req.body?.displayName === "string" ? req.body.displayName.trim().slice(0, 60) : undefined;
  const rawProfileId =
    typeof req.body?.profileId === "string" ? req.body.profileId.trim().toLowerCase() : undefined;

  if (rawProfileId !== undefined && rawProfileId !== "" && !PROFILE_ID_RE.test(rawProfileId)) {
    res.status(400).json({
      error: "Profile ID must be 3–24 characters: lowercase letters, numbers, underscore.",
    });
    return;
  }

  if (rawProfileId) {
    const [taken] = await db
      .select({ userId: profilesTable.userId })
      .from(profilesTable)
      .where(eq(profilesTable.profileId, rawProfileId))
      .limit(1);
    if (taken && taken.userId !== uid) {
      res.status(409).json({ error: "That profile ID is already taken." });
      return;
    }
  }

  await getOrCreate(uid);

  const [updated] = await db
    .update(profilesTable)
    .set({
      ...(displayName !== undefined ? { displayName } : {}),
      ...(rawProfileId !== undefined ? { profileId: rawProfileId || null } : {}),
      updatedAt: new Date(),
    })
    .where(eq(profilesTable.userId, uid))
    .returning();

  res.json(updated);
});

export default router;
