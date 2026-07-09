/** Shared trial constants (no imports from premium-trial or referral). */

export const PREMIUM_TRIAL_DAYS = 14;

export function effectiveTrialDays(baseDays: number, bonusDays: number): number {
  return baseDays + bonusDays;
}
