import * as Font from 'expo-font';
import { Feather } from '@expo/vector-icons';

let iconFontsLoaded = false;

/** Load vector icon fonts after DM Sans so boot stays stable in Expo Go. */
export async function loadIconFonts(): Promise<void> {
  if (iconFontsLoaded) return;
  try {
    await Font.loadAsync(Feather.font);
    iconFontsLoaded = true;
  } catch (err) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn('[Flux] Icon font load failed — icons may show as letters briefly:', err);
    }
  }
}
