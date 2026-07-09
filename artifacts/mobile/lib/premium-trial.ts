import AsyncStorage from '@react-native-async-storage/async-storage';
import { getReferralBonusDays, effectiveTrialDays } from '@/lib/referral';

const TRIAL_STARTED_KEY = 'flux_trial_started_at';

/** Days of full Premium access for new installs before paywall. */
export const PREMIUM_TRIAL_DAYS = 14;

export async function getEffectiveTrialDays(): Promise<number> {
  const bonus = await getReferralBonusDays();
  return effectiveTrialDays(PREMIUM_TRIAL_DAYS, bonus);
}

async function trialMs(): Promise<number> {
  const days = await getEffectiveTrialDays();
  return days * 24 * 60 * 60 * 1000;
}

export interface TrialStatus {
  trialStartedAt: string | null;
  isOnTrial: boolean;
  trialEndsAt: string | null;
  trialDaysLeft: number;
}

export function trialEndsAtFromStart(started: Date, trialMs: number): Date {
  return new Date(started.getTime() + trialMs);
}

export function isTrialActiveFromStart(started: Date | null, trialMs: number, now = Date.now()): boolean {
  if (!started) return false;
  return now < trialEndsAtFromStart(started, trialMs).getTime();
}

export function trialDaysLeftFromStart(started: Date | null, trialMs: number, now = Date.now()): number {
  if (!started) return 0;
  const ms = trialEndsAtFromStart(started, trialMs).getTime() - now;
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
}

export async function buildTrialStatus(startedIso: string | null): Promise<TrialStatus> {
  const ms = await trialMs();
  const started = startedIso ? new Date(startedIso) : null;
  const active = isTrialActiveFromStart(started, ms);
  const ends = started ? trialEndsAtFromStart(started, ms) : null;
  return {
    trialStartedAt: startedIso,
    isOnTrial: active,
    trialEndsAt: active && ends ? ends.toISOString() : null,
    trialDaysLeft: active ? trialDaysLeftFromStart(started, ms) : 0,
  };
}

/** Start the device trial on first app use (idempotent). */
export async function ensureLocalTrialStarted(): Promise<TrialStatus> {
  const existing = await AsyncStorage.getItem(TRIAL_STARTED_KEY);
  if (existing) return buildTrialStatus(existing);

  const started = new Date().toISOString();
  await AsyncStorage.setItem(TRIAL_STARTED_KEY, started);
  return buildTrialStatus(started);
}

export async function readLocalTrialStatus(): Promise<TrialStatus> {
  const existing = await AsyncStorage.getItem(TRIAL_STARTED_KEY);
  return buildTrialStatus(existing);
}

export function trialStatusLabel(status: TrialStatus): string {
  if (!status.isOnTrial) return '';
  if (status.trialDaysLeft <= 1) return 'Trial · ends today';
  return `Trial · ${status.trialDaysLeft} days left`;
}
