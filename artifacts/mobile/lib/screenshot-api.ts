import { API_BASE_URL } from '@/lib/api';
import { auth } from '@/lib/firebase';

export async function deleteScreenshotOnApi(id: string): Promise<void> {
  const token = auth?.currentUser ? await auth.currentUser.getIdToken() : null;
  if (!token) return;

  const res = await fetch(`${API_BASE_URL}/api/screenshots/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok && res.status !== 404) {
    throw new Error('Could not delete screenshot from cloud');
  }
}
