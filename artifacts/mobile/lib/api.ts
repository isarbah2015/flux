import { setBaseUrl } from '@workspace/api-client-react';

/**
 * Resolve the base URL of the Flux API server.
 *
 * Precedence:
 *   1. EXPO_PUBLIC_API_URL — explicit full origin (e.g. http://192.168.1.20:8080)
 *   2. EXPO_PUBLIC_DOMAIN  — Replit dev domain; served over https
 *   3. http://localhost:8080 — local dev default
 *
 * The generated client requests relative paths like `/api/screenshots`, so the
 * base URL must NOT include the `/api` prefix.
 */
function resolveBaseUrl(): string {
  const explicit = process.env.EXPO_PUBLIC_API_URL;
  if (explicit) return explicit.replace(/\/+$/, '');

  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  if (domain) return `https://${domain.replace(/^https?:\/\//, '').replace(/\/+$/, '')}`;

  return 'http://localhost:8080';
}

export const API_BASE_URL = resolveBaseUrl();

setBaseUrl(API_BASE_URL);
