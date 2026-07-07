import { Platform } from 'react-native';
import colors from '@/constants/colors';

/**
 * Injects global CSS for the web build (react-native-web).
 *
 * The primary purpose is to kill the browser's default autofill styling —
 * Chrome/Safari paint autofilled inputs with an opaque yellow/blue background
 * that ignores React styles. We override it by painting an inset box-shadow the
 * same color as our input surface and pinning the text fill color. The absurd
 * transition delay keeps the override from flashing back to yellow.
 *
 * No-op on native. Safe to import for its side effect; runs once.
 */
let injected = false;

export function injectWebStyles(): void {
  if (Platform.OS !== 'web' || injected) return;
  if (typeof document === 'undefined') return;
  injected = true;

  const { input, foreground } = colors.dark;

  const style = document.createElement('style');
  style.setAttribute('data-flux', 'global');
  style.textContent = `
    input:-webkit-autofill,
    input:-webkit-autofill:hover,
    input:-webkit-autofill:focus,
    input:-webkit-autofill:active,
    textarea:-webkit-autofill,
    textarea:-webkit-autofill:hover,
    textarea:-webkit-autofill:focus {
      -webkit-box-shadow: 0 0 0px 1000px ${input} inset !important;
      box-shadow: 0 0 0px 1000px ${input} inset !important;
      -webkit-text-fill-color: ${foreground} !important;
      caret-color: ${foreground} !important;
      transition: background-color 100000s ease-in-out 0s !important;
    }
    input, textarea, [contenteditable] { outline: none !important; }
    * { -webkit-tap-highlight-color: transparent; }
  `;
  document.head.appendChild(style);
}
