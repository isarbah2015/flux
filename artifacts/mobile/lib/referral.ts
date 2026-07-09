import AsyncStorage from '@react-native-async-storage/async-storage';

const REFERRAL_BONUS_KEY = 'flux_referral_bonus_days';
const REFERRAL_CODE_KEY = 'flux_referral_redeemed';

const VALID_CODES: Record<string, number> = {
  FLUXFRIEND: 7,
  FLUXVIP: 14,
};

export async function getReferralBonusDays(): Promise<number> {
  const raw = await AsyncStorage.getItem(REFERRAL_BONUS_KEY);
  return raw ? Number.parseInt(raw, 10) || 0 : 0;
}

export async function redeemReferralCode(code: string): Promise<{ ok: boolean; message: string; bonusDays: number }> {
  const normalized = code.trim().toUpperCase();
  const bonus = VALID_CODES[normalized];
  if (!bonus) {
    return { ok: false, message: 'Invalid code', bonusDays: 0 };
  }

  const redeemed = await AsyncStorage.getItem(REFERRAL_CODE_KEY);
  if (redeemed) {
    return { ok: false, message: 'You already redeemed a referral code', bonusDays: 0 };
  }

  await AsyncStorage.setItem(REFERRAL_BONUS_KEY, String(bonus));
  await AsyncStorage.setItem(REFERRAL_CODE_KEY, normalized);
  return {
    ok: true,
    message: `+${bonus} bonus trial days added`,
    bonusDays: bonus,
  };
}
