import { API_BASE_URL } from '@/lib/api';

/**
 * Turn fetch / API errors into actionable copy for physical-device dev.
 */
export function formatApiError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();

  if (
    lower.includes('network request failed') ||
    lower.includes('failed to fetch') ||
    lower.includes('network error') ||
    lower.includes('could not connect')
  ) {
    return (
      `Can't reach the Flux API at ${API_BASE_URL}. ` +
      'On your phone, use your Mac\'s Wi‑Fi IP (not localhost). ' +
      'Keep the API server running and both devices on the same network.'
    );
  }

  if (lower.includes('timeout') || lower.includes('timed out')) {
    return `Request timed out talking to ${API_BASE_URL}. Check your connection and try again.`;
  }

  return message || 'Something went wrong. Try again in a moment.';
}
