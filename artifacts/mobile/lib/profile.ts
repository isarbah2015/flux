import { API_BASE_URL } from './api';
import { auth } from './firebase';

export interface UserProfile {
  userId: string;
  displayName: string;
  profileId: string | null;
  updatedAt: string;
}

async function authHeaders(): Promise<Record<string, string>> {
  const token = auth?.currentUser ? await auth.currentUser.getIdToken() : null;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function fetchProfile(): Promise<UserProfile> {
  const res = await fetch(`${API_BASE_URL}/api/profile`, { headers: await authHeaders() });
  if (!res.ok) throw new Error('Could not load profile');
  return res.json() as Promise<UserProfile>;
}

export async function updateProfile(input: {
  displayName?: string;
  profileId?: string;
}): Promise<UserProfile> {
  const res = await fetch(`${API_BASE_URL}/api/profile`, {
    method: 'PATCH',
    headers: await authHeaders(),
    body: JSON.stringify(input),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? 'Could not save profile');
  return body as UserProfile;
}
