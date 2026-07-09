import { Platform } from 'react-native';
import {
  copyAsync,
  documentDirectory,
  downloadAsync,
  getInfoAsync,
  makeDirectoryAsync,
  readAsStringAsync,
  writeAsStringAsync,
} from 'expo-file-system/legacy';

const IMAGE_DIR = `${documentDirectory}flux-images/`;

function normalizeUri(uri: string): string {
  const clean = uri.split('#')[0];
  if (clean.startsWith('file://') || clean.startsWith('content://') || clean.startsWith('ph://')) {
    return clean;
  }
  if (clean.startsWith('/')) return `file://${clean}`;
  return clean;
}

async function ensureImageDir(): Promise<void> {
  if (!documentDirectory) return;
  await makeDirectoryAsync(IMAGE_DIR, { intermediates: true }).catch(() => undefined);
}

function persistentImagePath(screenshotId?: string | null): string {
  if (screenshotId) return `${IMAGE_DIR}${screenshotId}.jpg`;
  return `${IMAGE_DIR}flux-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
}

export async function fileUriExists(uri: string | null | undefined): Promise<boolean> {
  const clean = uri?.split('#')[0];
  if (!clean?.startsWith('file://')) return false;
  try {
    const info = await getInfoAsync(clean);
    return info.exists;
  } catch {
    return false;
  }
}

async function copyToPersistentFile(from: string, to: string): Promise<string | null> {
  try {
    await copyAsync({ from, to });
    if (await fileUriExists(to)) return to;
  } catch {
    // copyAsync can fail for some content:// URIs on Android.
  }

  try {
    const result = await downloadAsync(from, to);
    if (result.status >= 200 && result.status < 300 && (await fileUriExists(result.uri))) {
      return result.uri;
    }
  } catch {
    return null;
  }

  return null;
}

/** Copy or decode an image into app storage as a readable file:// URI. */
export async function materializeImageToCache(
  uri: string | null | undefined,
  base64?: string | null,
  screenshotId?: string | null,
): Promise<string | null> {
  if (!documentDirectory) return uri ? normalizeUri(uri) : null;

  await ensureImageDir();
  const target = persistentImagePath(screenshotId);

  if (screenshotId) {
    const existing = await fileUriExists(target);
    if (existing) return target;
  }

  if (base64?.trim()) {
    try {
      await writeAsStringAsync(target, base64, { encoding: 'base64' });
      return target;
    } catch {
      return null;
    }
  }

  const clean = uri ? normalizeUri(uri) : null;
  if (!clean) return null;

  if (screenshotId) {
    const copied = await copyToPersistentFile(clean, target);
    if (copied) return copied;
  }

  if (clean.startsWith('file://') || (Platform.OS === 'ios' && clean.startsWith('/'))) {
    const fileUri = clean.startsWith('/') ? `file://${clean}` : clean;
    if (await fileUriExists(fileUri)) return fileUri;
    return null;
  }

  if (
    clean.startsWith('content://') ||
    clean.startsWith('ph://') ||
    clean.startsWith('http://') ||
    clean.startsWith('https://')
  ) {
    return clean.startsWith('content://') || clean.startsWith('ph://') ? clean : null;
  }

  return clean;
}

/** Read base64 from any supported gallery URI. */
export async function readImageBase64(
  uri: string | null | undefined,
  base64?: string | null,
): Promise<string | null> {
  if (base64?.trim()) return base64;

  const materialized = await materializeImageToCache(uri, null, uri ? `read-${Date.now()}` : null);
  if (!materialized) return null;

  const readUri =
    materialized.startsWith('content://') || materialized.startsWith('ph://')
      ? materialized
      : normalizeUri(materialized);

  if (readUri.startsWith('content://') || readUri.startsWith('ph://')) {
    const persisted = await materializeImageToCache(readUri, null, `read-${Date.now()}`);
    if (!persisted || persisted.startsWith('content://')) return null;
    try {
      const data = await readAsStringAsync(persisted, { encoding: 'base64' });
      if (!data || data.length > 5_500_000) return null;
      return data;
    } catch {
      return null;
    }
  }

  try {
    const data = await readAsStringAsync(readUri, { encoding: 'base64' });
    if (!data || data.length > 5_500_000) return null;
    return data;
  } catch {
    return null;
  }
}
