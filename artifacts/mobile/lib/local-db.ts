import type * as SQLiteTypes from 'expo-sqlite';
import type { Category, Screenshot } from '@/context/ScreenshotsContext';
import type { ScreenshotMetadata } from '@/lib/on-device-classifier';
import { supportsLocalDb } from '@/lib/runtime';

/**
 * expo-sqlite is a native module. To keep the startup import graph free of any
 * native access (which can crash the app before first paint if the runtime does
 * not include the module), we resolve it lazily and cache the result. When it is
 * unavailable the store degrades to a no-op and the app falls back to API data.
 */
let sqliteModule: typeof SQLiteTypes | null | undefined;

function getSQLite(): typeof SQLiteTypes | null {
  if (sqliteModule !== undefined) return sqliteModule;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    sqliteModule = require('expo-sqlite') as typeof SQLiteTypes;
  } catch {
    sqliteModule = null;
  }
  return sqliteModule;
}

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

let dbPromise: Promise<SQLiteTypes.SQLiteDatabase> | null = null;
/** FTS5 disabled — virtual tables have caused native Hermes crashes on Android. */
const ENABLE_FTS5 = false;
let ftsEnabled = false;

async function initSchema(db: SQLiteTypes.SQLiteDatabase): Promise<void> {
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
  `);

  try {
    if (!ENABLE_FTS5) throw new Error('FTS disabled');
    await db.execAsync(`
      CREATE VIRTUAL TABLE IF NOT EXISTS screenshots_fts USING fts5(
        screenshot_id UNINDEXED,
        extracted_text,
        summary,
        tags,
        category,
        tokenize='porter unicode61'
      );
    `);
    ftsEnabled = true;
  } catch {
    ftsEnabled = false;
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn('[Flux DB] FTS5 unavailable — using LIKE search fallback.');
    }
  }
}

function getDb(): Promise<SQLiteTypes.SQLiteDatabase> {
  if (!supportsLocalDb) {
    return Promise.reject(new Error('Local DB disabled in Expo Go'));
  }
  if (!dbPromise) {
    dbPromise = (async () => {
      const SQLite = getSQLite();
      if (!SQLite) {
        throw new Error('expo-sqlite unavailable in this runtime');
      }
      const db = await SQLite.openDatabaseAsync('flux.db');
      await initSchema(db);
      return db;
    })();
  }
  return dbPromise;
}

function rowToScreenshot(row: LocalScreenshotRow): Screenshot {
  return {
    id: row.id,
    imageUri: row.imageUri,
    localAssetId: row.localAssetId,
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
  if (!supportsLocalDb) return;
  await getDb();
}

export async function insertLocalScreenshot(row: LocalScreenshotRow): Promise<void> {
  if (!supportsLocalDb) return;
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

  if (ftsEnabled) {
    try {
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
    } catch {
      ftsEnabled = false;
    }
  }
}

export async function getAllLocalScreenshots(): Promise<Screenshot[]> {
  if (!supportsLocalDb) return [];
  const db = await getDb();
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM screenshots ORDER BY captured_at DESC`,
  );
  return rows.map((r) => rowToScreenshot(parseRow(r)));
}

export async function getAllLocalScreenshotRows(): Promise<LocalScreenshotRow[]> {
  if (!supportsLocalDb) return [];
  const db = await getDb();
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM screenshots ORDER BY captured_at DESC`,
  );
  return rows.map((r) => parseRow(r));
}

export async function markLocalSynced(id: string): Promise<void> {
  if (!supportsLocalDb) return;
  const db = await getDb();
  await db.runAsync(`UPDATE screenshots SET synced = 1 WHERE id = ?`, id);
}

export interface LocalScreenshotApiPatch {
  extractedText: string;
  category: Category;
  summary: string;
  tags: string[];
  colorHex: string;
  metadata: ScreenshotMetadata;
}

export async function updateLocalScreenshotFromApi(
  id: string,
  patch: LocalScreenshotApiPatch,
): Promise<void> {
  if (!supportsLocalDb) return;
  const db = await getDb();
  const metadataJson = JSON.stringify(patch.metadata);
  const tagsJson = JSON.stringify(patch.tags);

  await db.runAsync(
    `UPDATE screenshots
     SET extracted_text = ?, category = ?, summary = ?, tags = ?, color_hex = ?, metadata = ?, synced = 1
     WHERE id = ?`,
    patch.extractedText,
    patch.category,
    patch.summary,
    tagsJson,
    patch.colorHex,
    metadataJson,
    id,
  );

  if (ftsEnabled) {
    try {
      await db.runAsync(`DELETE FROM screenshots_fts WHERE screenshot_id = ?`, id);
      await db.runAsync(
        `INSERT INTO screenshots_fts (screenshot_id, extracted_text, summary, tags, category)
         VALUES (?, ?, ?, ?, ?)`,
        id,
        patch.extractedText,
        patch.summary,
        tagsJson,
        patch.category,
      );
    } catch {
      ftsEnabled = false;
    }
  }
}

/** FTS5 full-text search — on-device, no server. */
export async function searchLocalScreenshots(query: string): Promise<Screenshot[]> {
  if (!supportsLocalDb) return [];
  const q = query.trim();
  if (!q) return [];

  const db = await getDb();
  const ftsQuery = q
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => `"${word.replace(/"/g, '""')}"*`)
    .join(' ');

  try {
    if (!ftsEnabled) throw new Error('FTS disabled');
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

export async function deleteLocalScreenshot(id: string): Promise<void> {
  if (!supportsLocalDb) return;
  const db = await getDb();
  await db.runAsync(`DELETE FROM screenshots WHERE id = ?`, id);
  if (ftsEnabled) {
    try {
      await db.runAsync(`DELETE FROM screenshots_fts WHERE screenshot_id = ?`, id);
    } catch {
      ftsEnabled = false;
    }
  }
}

export function newScreenshotId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
