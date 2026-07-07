import React from 'react';
import { useScreenshots } from '@/context/ScreenshotsContext';
import OnboardingScreen from '@/components/OnboardingScreen';

/** First-run product tour — shown once after sign-in, before the main app. */
export default function OnboardingGate({ children }: { children: React.ReactNode }) {
  const { hasOnboarded, onboardingChecked } = useScreenshots();

  if (!onboardingChecked) return null;
  if (!hasOnboarded) return <OnboardingScreen />;
  return <>{children}</>;
}
