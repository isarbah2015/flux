import React from 'react';
import { PremiumProvider } from '@/context/PremiumContext';
import { ProfileProvider } from '@/context/ProfileContext';
import { ScreenshotsProvider } from '@/context/ScreenshotsContext';

/** Screenshots / billing contexts — split out so Expo Go does not parse them at cold start. */
export default function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <PremiumProvider>
      <ProfileProvider>
        <ScreenshotsProvider>{children}</ScreenshotsProvider>
      </ProfileProvider>
    </PremiumProvider>
  );
}
