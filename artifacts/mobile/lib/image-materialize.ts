import { Platform } from 'react-native';
import { cacheDirectory, copyAsync, readAsStringAsync, writeAsStringAsync } from 'expo-file-system/legacy';

function cacheImagePath(): string {
  return `${cacheDirectory}flux-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
}

/** Copy or decode an image into app cache as a readable file:// URI. */
export async function materializeImageToCache(
  uri: string | null | undefined,
  base64?: string | null,
): Promise<string | null> {
  if (base64?.trim()) {
    const target = cacheImagePath();
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
    return clean;
  }

  if (clean.startsWith('content://') || clean.startsWith('ph://')) {
    const target = cacheImagePath();
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
export async function readImageBase64(uri: string | null | undefined, base64?: string | null): Promise<string | null> {
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
