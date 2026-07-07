import * as SQLite from 'expo-sqlite';
import type { Category, Screenshot } from '@/context/ScreenshotsContext';
import type { ScreenshotMetadata } from '@/lib/on-device-classifier';

export interface LocalScreenshotRow {
  id: string;
  localAssetId: string | null;
  imageUri: string | null;
  capturedAt: string;
  category: Category;
  tags: string[];
  extractedText: string;
  summary: string;
  colorHex: string;
  metadata: ScreenshotMetadata;
  synced: number;
}

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync('flux.db');
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS screenshots (
          id TEXT PRIMARY KEY NOT NULL,
          local_asset_id TEXT,
          image_uri TEXT,
          captured_at TEXT NOT NULL,
          category TEXT NOT NULL,
          tags TEXT NOT NULL,
          extracted_text TEXT NOT NULL DEFAULT '',
          summary TEXT NOT NULL DEFAULT '',
          color_hex TEXT NOT NULL,
          metadata TEXT NOT NULL DEFAULT '{}',
          synced INTEGER NOT NULL DEFAULT 0
        );
        CREATE VIRTUAL TABLE IF NOT EXISTS screenshots_fts USING fts5(
          screenshot_id UNINDEXED,
          extracted_text,
          summary,
          tags,
          category,
          tokenize='porter unicode61'
        );
      `);
      return db;
    })();
  }
  return dbPromise;
}

function rowToScreenshot(row: LocalScreenshotRow): Screenshot {
  return {
    id: row.id,
    imageUri: row.imageUri,
    capturedAt: row.capturedAt,
    category: row.category,
    tags: row.tags,
    extractedText: row.extractedText,
    summary: row.summary,
    colorHex: row.colorHex,
    priceTracking: row.metadata.priceTracking,
    promise: row.metadata.promise,
    calendarEvent: row.metadata.calendarEvent,
  };
}

function parseRow(raw: Record<string, unknown>): LocalScreenshotRow {
  return {
    id: String(raw.id),
    localAssetId: raw.local_asset_id ? String(raw.local_asset_id) : null,
    imageUri: raw.image_uri ? String(raw.image_uri) : null,
    capturedAt: String(raw.captured_at),
    category: String(raw.category) as Category,
    tags: JSON.parse(String(raw.tags || '[]')) as string[],
    extractedText: String(raw.extracted_text ?? ''),
    summary: String(raw.summary ?? ''),
    colorHex: String(raw.color_hex),
    metadata: JSON.parse(String(raw.metadata || '{}')) as ScreenshotMetadata,
    synced: Number(raw.synced ?? 0),
  };
}

export async function initLocalDb(): Promise<void> {
  await getDb();
}

export async function insertLocalScreenshot(row: LocalScreenshotRow): Promise<void> {
  const db = await getDb();
  const tagsJson = JSON.stringify(row.tags);
  const metadataJson = JSON.stringify(row.metadata);

  await db.runAsync(
    `INSERT OR REPLACE INTO screenshots
      (id, local_asset_id, image_uri, captured_at, category, tags, extracted_text, summary, color_hex, metadata, synced)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    row.id,
    row.localAssetId,
    row.imageUri,
    row.capturedAt,
    row.category,
    tagsJson,
    row.extractedText,
    row.summary,
    row.colorHex,
    metadataJson,
    row.synced,
  );

  await db.runAsync(`DELETE FROM screenshots_fts WHERE screenshot_id = ?`, row.id);
  await db.runAsync(
    `INSERT INTO screenshots_fts (screenshot_id, extracted_text, summary, tags, category)
     VALUES (?, ?, ?, ?, ?)`,
    row.id,
    row.extractedText,
    row.summary,
    tagsJson,
    row.category,
  );
}

export async function getAllLocalScreenshots(): Promise<Screenshot[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM screenshots ORDER BY captured_at DESC`,
  );
  return rows.map((r) => rowToScreenshot(parseRow(r)));
}

export async function markLocalSynced(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(`UPDATE screenshots SET synced = 1 WHERE id = ?`, id);
}

/** FTS5 full-text search — on-device, no server. */
export async function searchLocalScreenshots(query: string): Promise<Screenshot[]> {
  const q = query.trim();
  if (!q) return [];

  const db = await getDb();
  const ftsQuery = q
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => `"${word.replace(/"/g, '""')}"*`)
    .join(' ');

  try {
    const rows = await db.getAllAsync<Record<string, unknown>>(
      `SELECT s.* FROM screenshots_fts fts
       JOIN screenshots s ON s.id = fts.screenshot_id
       WHERE screenshots_fts MATCH ?
       ORDER BY rank`,
      ftsQuery,
    );
    if (rows.length > 0) {
      return rows.map((r) => rowToScreenshot(parseRow(r)));
    }
  } catch {
    // FTS syntax error — fall through to LIKE
  }

  const like = `%${q}%`;
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM screenshots
     WHERE extracted_text LIKE ? OR summary LIKE ? OR tags LIKE ?
     ORDER BY captured_at DESC`,
    like,
    like,
    like,
  );
  return rows.map((r) => rowToScreenshot(parseRow(r)));
}

export function newScreenshotId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
