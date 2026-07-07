import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { setBaseUrl } from '@workspace/api-client-react';

/**
 * On a physical device, Expo Go exposes the Metro host IP (your Mac's LAN address).
 * When EXPO_PUBLIC_API_URL is localhost, swap it for that IP so the phone can reach the API.
 */
function resolveDevApiOrigin(): string | null {
  if (Platform.OS === 'web') return null;

  const debuggerHost =
    Constants.expoGoConfig?.debuggerHost ??
    Constants.expoConfig?.hostUri?.replace(/^exp:\/\//, '');

  if (!debuggerHost) return null;

  const host = debuggerHost.split(':')[0];
  if (!host || host === 'localhost') return null;
  return `http://${host}:8080`;
}

/**
 * Resolve the base URL of the Flux API server.
 *
 * Precedence:
 *   1. EXPO_PUBLIC_API_URL — unless it is localhost on a physical device (use LAN IP)
 *   2. Expo Metro debugger host → http://<lan-ip>:8080
 *   3. EXPO_PUBLIC_DOMAIN — Replit
 *   4. http://localhost:8080 — simulator / web
 */
function resolveBaseUrl(): string {
  const explicit = process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, '');
  const devOrigin = resolveDevApiOrigin();

  if (explicit?.includes('localhost') && devOrigin) return devOrigin;
  if (explicit) return explicit;
  if (devOrigin) return devOrigin;

  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  if (domain) return `https://${domain.replace(/^https?:\/\//, '').replace(/\/+$/, '')}`;

  return 'http://localhost:8080';
}

export const API_BASE_URL = resolveBaseUrl();

setBaseUrl(API_BASE_URL);

if (__DEV__) {
  // eslint-disable-next-line no-console
  console.log('[Flux] API base URL:', API_BASE_URL);
}
