import { useAuth } from '@/context/AuthContext';
import { useScreenshots } from '@/context/ScreenshotsContext';

export type BootPhase = 'splash' | 'checking' | 'onboarding' | 'login' | 'ready';

export function useBootReady(splashDone: boolean) {
  const { authEnabled, isReady: authReady, user, guestMode, guestModeChecked } = useAuth();
  const { hasOnboarded, onboardingChecked } = useScreenshots();

  const authGatePending = authEnabled && (!authReady || !guestModeChecked);
  const checking = !splashDone || !onboardingChecked || authGatePending;

  let phase: BootPhase = 'ready';
  if (!splashDone) phase = 'splash';
  else if (!onboardingChecked || authGatePending) phase = 'checking';
  else if (!hasOnboarded) phase = 'onboarding';
  else if (authEnabled && !user && !guestMode) phase = 'login';
  else phase = 'ready';

  const bootReady = phase === 'ready';

  return { bootReady, checking, phase, showOnboarding: phase === 'onboarding', showLogin: phase === 'login' };
}
