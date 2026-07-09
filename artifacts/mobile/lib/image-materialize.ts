import { Platform } from 'react-native';
import {
  copyAsync,
  documentDirectory,
  getInfoAsync,
  makeDirectoryAsync,
  readAsStringAsync,
  writeAsStringAsync,
} from 'expo-file-system/legacy';

const IMAGE_DIR = `${documentDirectory}flux-images/`;

async function ensureImageDir(): Promise<void> {
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

/** Copy or decode an image into app storage as a readable file:// URI. */
export async function materializeImageToCache(
  uri: string | null | undefined,
  base64?: string | null,
  screenshotId?: string | null,
): Promise<string | null> {
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

  const clean = uri?.split('#')[0];
  if (!clean) return null;

  if (clean.startsWith('file://') || (Platform.OS === 'ios' && clean.startsWith('/'))) {
    if (await fileUriExists(clean)) return clean;
    if (screenshotId) {
      try {
        await copyAsync({ from: clean, to: target });
        return target;
      } catch {
        return null;
      }
    }
    return clean;
  }

  if (
    clean.startsWith('content://') ||
    clean.startsWith('ph://') ||
    clean.startsWith('http://') ||
    clean.startsWith('https://')
  ) {
    try {
      await copyAsync({ from: clean, to: target });
      return target;
    } catch {
      return null;
    }
  }

  return clean;
}

/** Read base64 from any supported gallery URI. */
export async function readImageBase64(
  uri: string | null | undefined,
  base64?: string | null,
): Promise<string | null> {
  if (base64?.trim()) return base64;

  const materialized = await materializeImageToCache(uri);
  if (!materialized) return null;

  try {
    const data = await readAsStringAsync(materialized, { encoding: 'base64' });
    if (!data || data.length > 5_500_000) return null;
    return data;
  } catch {
    return null;
  }
}
