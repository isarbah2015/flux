export type PaystackMode = 'live' | 'test' | 'none';

export interface LocalPaystackConfig {
  configured: boolean;
  mode: PaystackMode;
}

/** Public key baked into the app bundle at build time. */
export function getLocalPaystackConfig(): LocalPaystackConfig {
  const key = process.env.EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY?.trim() ?? '';
  if (!key) return { configured: false, mode: 'none' };
  if (key.startsWith('pk_live_')) return { configured: true, mode: 'live' };
  if (key.startsWith('pk_test_')) return { configured: true, mode: 'test' };
  return { configured: true, mode: 'none' };
}

export function mergePaystackStatus(
  apiConfigured: boolean,
  apiMode: PaystackMode | undefined,
): { paystackConfigured: boolean; paystackMode: PaystackMode } {
  const local = getLocalPaystackConfig();
  const mode = apiMode && apiMode !== 'none' ? apiMode : local.mode;
  return {
    paystackConfigured: apiConfigured || local.configured,
    paystackMode: mode,
  };
}
