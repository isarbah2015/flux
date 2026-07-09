/** Days of full Premium access for new accounts before paywall. */
export const PREMIUM_TRIAL_DAYS = 14;
export const PREMIUM_TRIAL_MS = PREMIUM_TRIAL_DAYS * 24 * 60 * 60 * 1000;

export function trialEndsAt(started: Date): Date {
  return new Date(started.getTime() + PREMIUM_TRIAL_MS);
}

export function isTrialActive(started: Date | null | undefined, now = Date.now()): boolean {
  if (!started) return false;
  return now < trialEndsAt(started).getTime();
}

export function trialDaysLeft(started: Date | null | undefined, now = Date.now()): number {
  if (!started) return 0;
  const ms = trialEndsAt(started).getTime() - now;
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
}

export function trialStatusPayload(started: Date | null | undefined) {
  const active = isTrialActive(started);
  const ends = started ? trialEndsAt(started) : null;
  return {
    isOnTrial: active,
    trialEndsAt: active && ends ? ends.toISOString() : null,
    trialDaysLeft: active ? trialDaysLeft(started) : 0,
  };
}
