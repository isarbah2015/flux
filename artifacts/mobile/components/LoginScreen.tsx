import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';
import { isGoogleSignInConfigured, useGoogleSignIn } from '@/lib/google-sign-in';
import { injectWebStyles } from '@/lib/webStyles';
import FluxLogo from '@/components/FluxLogo';

type Mode = 'signin' | 'signup';

function friendlyError(e: unknown): string {
  const code = (e as { code?: string })?.code ?? '';
  switch (code) {
    case 'auth/invalid-email':
      return 'That email address looks invalid.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Email or password is incorrect.';
    case 'auth/email-already-in-use':
      return 'An account already exists for that email.';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters.';
    case 'auth/account-exists-with-different-credential':
      return 'An account already exists with this email using a different sign-in method.';
    case 'auth/popup-closed-by-user':
      return 'Sign-in was cancelled.';
    default:
      return e instanceof Error ? e.message : 'Something went wrong. Try again.';
  }
}

export default function LoginScreen() {
  injectWebStyles();

  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { signInWithEmail, signUpWithEmail, signInWithGoogleIdToken } = useAuth();
  const google = useGoogleSignIn();
  const googleEnabled = isGoogleSignInConfigured();

  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitGoogle() {
    setBusy(true);
    setError(null);
    try {
      const idToken = await google.signIn();
      if (!idToken) return;
      await signInWithGoogleIdToken(idToken);
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (mode === 'signin') await signInWithEmail(email.trim(), password);
      else await signUpWithEmail(email.trim(), password);
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }

  const inputStyle = [
    styles.input,
    {
      backgroundColor: colors.input,
      color: colors.foreground,
      borderColor: colors.border,
    },
  ];

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      {/* Ambient glow */}
      <LinearGradient
        colors={[`${colors.primary}22`, 'transparent', `${colors.accent}11`]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 0.55 }}
      />

      <View style={[styles.inner, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.hero}>
          <FluxLogo size={88} />
          <Text style={[styles.title, { color: colors.foreground }]}>Flux</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            {mode === 'signin'
              ? 'Your screenshots, finally intelligent'
              : 'Create your screenshot brain'}
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>
            {mode === 'signin' ? 'Welcome back' : 'Get started'}
          </Text>

          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Email"
            placeholderTextColor={colors.mutedForeground}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            textContentType="emailAddress"
            importantForAutofill="yes"
            style={inputStyle}
          />
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Password"
            placeholderTextColor={colors.mutedForeground}
            secureTextEntry
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            textContentType={mode === 'signin' ? 'password' : 'newPassword'}
            importantForAutofill="yes"
            style={inputStyle}
          />

          {error && (
            <View style={[styles.errorBox, { backgroundColor: colors.destructive + '18' }]}>
              <Feather name="alert-circle" size={14} color={colors.destructive} />
              <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text>
            </View>
          )}

          <Pressable
            onPress={submit}
            disabled={busy}
            style={({ pressed }) => [
              styles.button,
              { opacity: busy ? 0.7 : pressed ? 0.9 : 1 },
            ]}
          >
            <LinearGradient
              colors={[colors.primary, '#9B8FFF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.buttonGrad}
            >
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>
                  {mode === 'signin' ? 'Sign in' : 'Create account'}
                </Text>
              )}
            </LinearGradient>
          </Pressable>

          {googleEnabled && (
            <>
              <View style={styles.dividerRow}>
                <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
                <Text style={[styles.dividerText, { color: colors.mutedForeground }]}>or</Text>
                <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
              </View>

              <Pressable
                onPress={submitGoogle}
                disabled={busy || !google.ready}
                style={({ pressed }) => [
                  styles.googleBtn,
                  {
                    backgroundColor: colors.secondary,
                    borderColor: colors.border,
                    opacity: busy || !google.ready ? 0.6 : pressed ? 0.85 : 1,
                  },
                ]}
              >
                {busy ? (
                  <ActivityIndicator color={colors.foreground} />
                ) : (
                  <>
                    <Feather name="globe" size={18} color={colors.foreground} />
                    <Text style={[styles.googleBtnText, { color: colors.foreground }]}>
                      Continue with Google
                    </Text>
                  </>
                )}
              </Pressable>
            </>
          )}

          <Pressable
            onPress={() => {
              setMode(mode === 'signin' ? 'signup' : 'signin');
              setError(null);
            }}
          >
            <Text style={[styles.toggle, { color: colors.mutedForeground }]}>
              {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
              <Text style={{ color: colors.primary, fontFamily: 'DMSans_600SemiBold' }}>
                {mode === 'signin' ? 'Sign up' : 'Sign in'}
              </Text>
            </Text>
          </Pressable>
        </View>

        <Text style={[styles.note, { color: colors.mutedForeground }]}>
          {googleEnabled
            ? 'Sign in securely with Firebase'
            : 'Add EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID to enable Google sign-in'}
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1, justifyContent: 'center', paddingHorizontal: 24, gap: 28 },
  hero: { alignItems: 'center', gap: 10 },
  logo: {
    width: 72,
    height: 72,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  title: { fontSize: 36, fontFamily: 'DMSans_700Bold', letterSpacing: -1.2 },
  subtitle: {
    fontSize: 15,
    fontFamily: 'DMSans_400Regular',
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 22,
  },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 22,
    gap: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontFamily: 'DMSans_600SemiBold',
    marginBottom: 4,
  },
  input: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 15,
    fontFamily: 'DMSans_400Regular',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 10,
  },
  error: { fontSize: 13, fontFamily: 'DMSans_500Medium', flex: 1 },
  button: { borderRadius: 16, overflow: 'hidden', marginTop: 4 },
  buttonGrad: {
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { fontSize: 16, fontFamily: 'DMSans_600SemiBold', color: '#fff' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 4 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: 13, fontFamily: 'DMSans_400Regular' },
  googleBtn: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  googleBtnText: { fontSize: 15, fontFamily: 'DMSans_600SemiBold' },
  toggle: { fontSize: 14, fontFamily: 'DMSans_400Regular', textAlign: 'center', marginTop: 4 },
  note: { fontSize: 12, fontFamily: 'DMSans_400Regular', textAlign: 'center' },
});
