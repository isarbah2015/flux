import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, View } from 'react-native';
import FluxLogoMark from '@/components/FluxLogoMark';

const NATIVE = Platform.OS !== 'web';
const SPLASH_TOTAL_MS = 3000;
const FADE_MS = 320;

interface Props {
  onDone: () => void;
}

/** Branded splash — RN Animated only (stable on Hermes/Android). */
export default function AnimatedSplash({ onDone }: Props) {
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  const finishedRef = useRef(false);

  const screenOp = useRef(new Animated.Value(1)).current;
  const logoOp = useRef(new Animated.Value(0)).current;
  const logoSc = useRef(new Animated.Value(0.84)).current;
  const glowOp = useRef(new Animated.Value(0.15)).current;
  const glowSc = useRef(new Animated.Value(0.95)).current;
  const ringSpin = useRef(new Animated.Value(0)).current;
  const shimmerOp = useRef(new Animated.Value(0)).current;
  const shimmerY = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    void SplashScreen.hideAsync();

    const finish = () => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      onDoneRef.current();
    };

    const glowLoop = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(glowOp, {
            toValue: 0.45,
            duration: 1100,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: NATIVE,
          }),
          Animated.timing(glowOp, {
            toValue: 0.15,
            duration: 1100,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: NATIVE,
          }),
        ]),
        Animated.sequence([
          Animated.timing(glowSc, {
            toValue: 1.12,
            duration: 1100,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: NATIVE,
          }),
          Animated.timing(glowSc, {
            toValue: 0.95,
            duration: 1100,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: NATIVE,
          }),
        ]),
      ]),
    );

    const ringLoop = Animated.loop(
      Animated.timing(ringSpin, {
        toValue: 1,
        duration: 4800,
        easing: Easing.linear,
        useNativeDriver: NATIVE,
      }),
    );

    const shimmerLoop = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(shimmerOp, {
            toValue: 0.35,
            duration: 900,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: NATIVE,
          }),
          Animated.timing(shimmerOp, {
            toValue: 0,
            duration: 900,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: NATIVE,
          }),
        ]),
        Animated.sequence([
          Animated.timing(shimmerY, {
            toValue: -24,
            duration: 900,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: NATIVE,
          }),
          Animated.timing(shimmerY, {
            toValue: 24,
            duration: 900,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: NATIVE,
          }),
        ]),
      ]),
    );

    const intro = Animated.parallel([
      Animated.timing(logoOp, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: NATIVE,
      }),
      Animated.sequence([
        Animated.timing(logoSc, {
          toValue: 1.08,
          duration: 420,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: NATIVE,
        }),
        Animated.timing(logoSc, {
          toValue: 1,
          duration: 260,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: NATIVE,
        }),
      ]),
    ]);

    const exit = Animated.sequence([
      Animated.delay(SPLASH_TOTAL_MS - FADE_MS),
      Animated.timing(screenOp, {
        toValue: 0,
        duration: FADE_MS,
        easing: Easing.in(Easing.quad),
        useNativeDriver: NATIVE,
      }),
    ]);

    glowLoop.start();
    ringLoop.start();
    shimmerLoop.start();
    intro.start(() => {
      exit.start(({ finished }) => {
        if (finished) finish();
      });
    });

    const hardDone = setTimeout(finish, SPLASH_TOTAL_MS);

    return () => {
      clearTimeout(hardDone);
      glowLoop.stop();
      ringLoop.stop();
      shimmerLoop.stop();
      intro.stop();
      exit.stop();
    };
  }, [glowOp, glowSc, logoOp, logoSc, ringSpin, screenOp, shimmerOp, shimmerY]);

  const ringRotate = ringSpin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View style={[styles.root, { opacity: screenOp }]}>
      <View style={styles.stage}>
        <Animated.View
          style={[
            styles.glowOuter,
            { opacity: glowOp, transform: [{ scale: glowSc }] },
          ]}
        />
        <Animated.View
          style={[
            styles.glowInner,
            {
              opacity: glowOp,
              transform: [{ scale: glowSc.interpolate({ inputRange: [0.95, 1.12], outputRange: [0.9, 1.02] }) }],
            },
          ]}
        />
        <Animated.View
          style={[styles.ring, { transform: [{ rotate: ringRotate }, { scale: 1.32 }] }]}
        />
        <Animated.View style={{ opacity: logoOp, transform: [{ scale: logoSc }] }}>
          <FluxLogoMark size={96} />
          <Animated.View
            pointerEvents="none"
            style={[
              styles.shimmer,
              { opacity: shimmerOp, transform: [{ translateY: shimmerY }] },
            ]}
          />
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    backgroundColor: '#0C0C14',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stage: {
    width: 180,
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowOuter: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#7C72FF',
  },
  glowInner: {
    position: 'absolute',
    width: 118,
    height: 118,
    borderRadius: 59,
    backgroundColor: '#22D3EE',
  },
  ring: {
    position: 'absolute',
    width: 132,
    height: 132,
    borderRadius: 66,
    borderWidth: 1.5,
    borderColor: 'rgba(167,139,250,0.5)',
  },
  shimmer: {
    position: 'absolute',
    left: -10,
    right: -10,
    top: '38%',
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
});
