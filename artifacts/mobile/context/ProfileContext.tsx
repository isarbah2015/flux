import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { updateProfile as fbUpdateProfile } from 'firebase/auth';
import { useAuth } from '@/context/AuthContext';
import { fetchProfile, updateProfile as apiUpdateProfile, type UserProfile } from '@/lib/profile';
import { auth } from '@/lib/firebase';

interface ProfileContextType {
  profile: UserProfile | null;
  isLoading: boolean;
  refresh: () => Promise<void>;
  saveProfile: (input: { displayName?: string; profileId?: string }) => Promise<void>;
}

const ProfileContext = createContext<ProfileContextType | null>(null);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const { authEnabled, isReady, user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const canFetch = !authEnabled || (isReady && !!user);

  const refresh = useCallback(async () => {
    if (!canFetch) {
      setProfile(null);
      return;
    }
    setIsLoading(true);
    try {
      const p = await fetchProfile();
      setProfile(p);
    } catch {
      setProfile(null);
    } finally {
      setIsLoading(false);
    }
  }, [canFetch]);

  useEffect(() => {
    void refresh();
  }, [refresh, user?.uid]);

  const saveProfile = useCallback(
    async (input: { displayName?: string; profileId?: string }) => {
      const updated = await apiUpdateProfile(input);
      setProfile(updated);
      if (input.displayName !== undefined && auth?.currentUser) {
        await fbUpdateProfile(auth.currentUser, { displayName: input.displayName });
      }
    },
    [],
  );

  const value = useMemo(
    () => ({ profile, isLoading, refresh, saveProfile }),
    [profile, isLoading, refresh, saveProfile],
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error('useProfile must be used within ProfileProvider');
  return ctx;
}
