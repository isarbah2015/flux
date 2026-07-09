import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';

const STORAGE_KEY = 'flux_app_lock_enabled';

export async function loadAppLockEnabled(): Promise<boolean> {
  const value = await AsyncStorage.getItem(STORAGE_KEY);
  return value === '1';
}

export async function saveAppLockEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, enabled ? '1' : '0');
}

export type BiometricSupport = {
  supported: boolean;
  enrolled: boolean;
  label: string;
};

export async function getBiometricSupport(): Promise<BiometricSupport> {
  if (Platform.OS === 'web') {
    return { supported: false, enrolled: false, label: 'Biometrics' };
  }

  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  const enrolled = await LocalAuthentication.isEnrolledAsync();
  const types = await LocalAuthentication.supportedAuthenticationTypesAsync();

  let label = 'Biometrics';
  if (Platform.OS === 'ios') {
    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      label = 'Face ID';
    } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      label = 'Touch ID';
    }
  } else if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
    label = 'Face unlock';
  } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
    label = 'Fingerprint';
  }

  return {
    supported: hasHardware && enrolled,
    enrolled: hasHardware && enrolled,
    label,
  };
}

export async function authenticateWithBiometrics(promptMessage?: string): Promise<boolean> {
  if (Platform.OS === 'web') return true;

  const support = await getBiometricSupport();
  if (!support.supported) return false;

  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: promptMessage ?? 'Unlock Flux',
    cancelLabel: 'Cancel',
    disableDeviceFallback: false,
    fallbackLabel: 'Use passcode',
  });

  return result.success;
}
