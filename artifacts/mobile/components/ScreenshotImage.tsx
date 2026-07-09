import React, { useEffect, useState } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { resolveScreenshotDisplayUri } from '@/lib/screenshot-uri';

interface Props {
  imageUri?: string | null;
  localAssetId?: string | null;
  fallbackColor?: string;
  style?: StyleProp<ViewStyle>;
  contentFit?: 'cover' | 'contain';
  iconSize?: number;
}

export default function ScreenshotImage({
  imageUri,
  localAssetId,
  fallbackColor = '#636384',
  style,
  contentFit = 'cover',
  iconSize = 28,
}: Props) {
  const [uri, setUri] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setFailed(false);

    void (async () => {
      const resolved = await resolveScreenshotDisplayUri(imageUri, localAssetId);
      if (!cancelled) setUri(resolved);
    })();

    return () => {
      cancelled = true;
    };
  }, [imageUri, localAssetId]);

  const showImage = !!uri && !failed;

  return (
    <View style={[styles.wrap, style]}>
      {showImage ? (
        <Image
          source={{ uri }}
          style={StyleSheet.absoluteFill}
          contentFit={contentFit}
          transition={200}
          onError={() => setFailed(true)}
        />
      ) : (
        <LinearGradient
          colors={[fallbackColor + '30', fallbackColor + '10']}
          style={StyleSheet.absoluteFill}
        >
          <View style={styles.fallback}>
            <Feather name="image" size={iconSize} color={fallbackColor} />
          </View>
        </LinearGradient>
      )}
      <LinearGradient
        colors={['transparent', 'rgba(12,12,20,0.55)']}
        style={styles.bottomFade}
        pointerEvents="none"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
    backgroundColor: '#12121C',
  },
  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '40%',
  },
});
