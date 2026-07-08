import React from 'react';
import { Image, StyleSheet, View, type ImageStyle, type StyleProp, type ViewStyle } from 'react-native';

/** Padded splash asset — reads smaller than the full-bleed 1024px store icon. */
const LOGO = require('@/assets/images/splash-icon.png');

interface FluxLogoProps {
  size?: number;
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
}

/** In-app logo mark (splash-icon). Store icon.png is only for the home-screen icon. */
export default function FluxLogo({ size = 56, style, imageStyle }: FluxLogoProps) {
  const pad = Math.round(size * 0.12);
  const inner = size - pad * 2;

  return (
    <View style={[styles.wrap, { width: size, height: size, borderRadius: size * 0.28 }, style]}>
      <Image
        source={LOGO}
        style={[{ width: inner, height: inner, borderRadius: inner * 0.22 }, imageStyle]}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
