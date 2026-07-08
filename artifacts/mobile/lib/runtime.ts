import Constants from 'expo-constants';

/** True when running inside the Expo Go client (not a dev/production build). */
export const isExpoGo = Constants.appOwnership === 'expo';

/**
 * On-device SQLite + FTS. Disabled in Expo Go — the module can hard-crash Hermes
 * on some Android builds when FTS5 is enabled.
 */
export const supportsLocalDb = !isExpoGo;

/** On-device OCR via expo-text-extractor — dev/production builds only. */
export const supportsOnDeviceOcr = !isExpoGo;
