import React, { useId } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

interface Props {
  size?: number;
  style?: StyleProp<ViewStyle>;
}

/** Clean vector lightning mark — no tile, no background box. */
export default function FluxLogoMark({ size = 96, style }: Props) {
  const gradId = useId().replace(/:/g, '');

  return (
    <View style={[styles.wrap, { width: size, height: size }, style]}>
      <Svg width={size} height={size} viewBox="0 0 100 100" fill="none">
        <Defs>
          <LinearGradient id={gradId} x1="50" y1="8" x2="50" y2="92" gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor="#A78BFA" />
            <Stop offset="0.45" stopColor="#7C72FF" />
            <Stop offset="1" stopColor="#22D3EE" />
          </LinearGradient>
        </Defs>
        <Path d="M54 8 L36 46 H48 L30 92 L66 46 H54 L70 8 Z" fill={`url(#${gradId})`} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
