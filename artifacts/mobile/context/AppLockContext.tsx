import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState, type AppStateStatus, Platform } from 'react-native';
import {
  authenticateWithBiometrics,
  getBiometricSupport,
  loadAppLockEnabled,
  saveAppLockEnabled,
  type BiometricSupport,
} from '@/lib/app-lock';

interface AppLockContextType {
  enabled: boolean;
  unlocked: boolean;
  isLocked: boolean;
  biometricLabel: string;
  biometricSupported: boolean;
  isLoading: boolean;
  setGuardActive: (active: boolean) => void;
  unlock: () => Promise<boolean>;
  setEnabled: (value: boolean) => Promise<boolean>;
}

const AppLockContext = createContext<AppLockContextType | null>(null);

const EMPTY_SUPPORT: BiometricSupport = {
  supported: false,
  enrolled: false,
  label: Platform.OS === 'ios' ? 'Face ID' : 'Biometrics',
};

export function AppLockProvider({ children }: { children: React.ReactNode }) {
  const [enabled, setEnabledState] = useState(false);
  const [unlocked, setUnlocked] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [support, setSupport] = useState<BiometricSupport>(EMPTY_SUPPORT);
  const [guardActive, setGuardActive] = useState(false);

  const enabledRef = useRef(enabled);
  const guardActiveRef = useRef(guardActive);
  const unlockInFlightRef = useRef(false);
  const wentBackgroundRef = useRef(false);
  const skipNextLockRef = useRef(false);

  enabledRef.current = enabled;
  guardActiveRef.current = guardActive;

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const [stored, biometric] = await Promise.all([
        loadAppLockEnabled(),
        getBiometricSupport(),
      ]);
      if (cancelled) return;
      setSupport(biometric);
      setEnabledState(stored && biometric.supported);
      setIsLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const unlock = useCallback(async () => {
    if (unlockInFlightRef.current) return false;
    unlockInFlightRef.current = true;
    try {
      const ok = await authenticateWithBiometrics(`Unlock Flux with ${support.label}`);
      if (ok) setUnlocked(true);
      return ok;
    } finally {
      unlockInFlightRef.current = false;
    }
  }, [support.label]);

  const lock = useCallback(() => {
    setUnlocked(false);
  }, []);

  const isLocked = enabled && guardActive && !unlocked;

  useEffect(() => {
    if (!guardActive || !enabled || Platform.OS === 'web') {
      setUnlocked(true);
      return;
    }
    if (skipNextLockRef.current) {
      skipNextLockRef.current = false;
      return;
    }
    lock();
  }, [enabled, guardActive, lock]);

  useEffect(() => {
    if (!isLocked) return;
    void unlock();
  }, [isLocked, unlock]);

  useEffect(() => {
    const onChange = (next: AppStateStatus) => {
      if (next === 'background' || next === 'inactive') {
        wentBackgroundRef.current = true;
        return;
      }
      if (
        next === 'active' &&
        wentBackgroundRef.current &&
        enabledRef.current &&
        guardActiveRef.current
      ) {
        wentBackgroundRef.current = false;
        lock();
        void unlock();
      }
    };

    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, [lock, unlock]);

  const setEnabled = useCallback(async (value: boolean) => {
    if (value) {
      const biometric = await getBiometricSupport();
      setSupport(biometric);
      if (!biometric.supported) return false;

      const ok = await authenticateWithBiometrics(`Confirm ${biometric.label} to lock Flux`);
      if (!ok) return false;
      skipNextLockRef.current = true;
      setUnlocked(true);
    }

    await saveAppLockEnabled(value);
    setEnabledState(value);
    if (!value) setUnlocked(true);
    return true;
  }, []);

  const value = useMemo(
    () => ({
      enabled,
      unlocked,
      isLocked,
      biometricLabel: support.label,
      biometricSupported: support.supported,
      isLoading,
      setGuardActive,
      unlock,
      setEnabled,
    }),
    [
      enabled,
      unlocked,
      isLocked,
      support.label,
      support.supported,
      isLoading,
      unlock,
      setEnabled,
    ],
  );

  return <AppLockContext.Provider value={value}>{children}</AppLockContext.Provider>;
}

export function useAppLock() {
  const ctx = useContext(AppLockContext);
  if (!ctx) throw new Error('useAppLock must be used within AppLockProvider');
  return ctx;
}
