import React from 'react';
import { Image, StyleSheet, View, type ImageStyle, type StyleProp, type ViewStyle } from 'react-native';

const LOGO = require('@/assets/images/icon.png');

interface FluxLogoProps {
  size?: number;
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
}

/** Renders the Flux app icon from bundled assets (same as native icon + splash). */
export default function FluxLogo({ size = 72, style, imageStyle }: FluxLogoProps) {
  return (
    <View style={[styles.wrap, { width: size, height: size, borderRadius: size * 0.28 }, style]}>
      <Image
        source={LOGO}
        style={[{ width: size, height: size, borderRadius: size * 0.28 }, imageStyle]}
        resizeMode="cover"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: 'hidden' },
});
