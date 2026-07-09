import React from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import FluxLogoMark from '@/components/FluxLogoMark';

interface FluxLogoProps {
  size?: number;
  style?: StyleProp<ViewStyle>;
}

/** In-app logo mark — same clean vector as the splash screen. */
export default function FluxLogo({ size = 56, style }: FluxLogoProps) {
  return <FluxLogoMark size={size} style={[styles.mark, style]} />;
}

const styles = StyleSheet.create({
  mark: {},
});
