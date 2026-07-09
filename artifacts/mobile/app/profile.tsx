import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';
import { useProfile } from '@/context/ProfileContext';
import { usePremium } from '@/context/PremiumContext';
import FluxLogo from '@/components/FluxLogo';
import { injectWebStyles } from '@/lib/webStyles';

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export default function ProfileScreen() {
  injectWebStyles();

  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { profile, saveProfile } = useProfile();
  const { isPremium, isPaidPremium, isOnTrial, trialDaysLeft } = usePremium();

  const [displayName, setDisplayName] = useState(profile?.displayName ?? user?.displayName ?? '');
  const [profileId, setProfileId] = useState(profile?.profileId ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  React.useEffect(() => {
    setDisplayName(profile?.displayName ?? user?.displayName ?? '');
    setProfileId(profile?.profileId ?? '');
  }, [profile, user?.displayName]);

  async function handleSave() {
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      await saveProfile({
        displayName: displayName.trim(),
        profileId: profileId.trim().toLowerCase(),
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save profile');
    } finally {
      setBusy(false);
    }
  }

  const name = displayName.trim() || user?.email?.split('@')[0] || 'Flux User';
  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Profile</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <LinearGradient
            colors={[colors.primary + '40', colors.accent + '25']}
            style={styles.avatarRing}
          >
            <View style={[styles.avatar, { backgroundColor: colors.card }]}>
              <Text style={[styles.avatarText, { color: colors.primary }]}>{initials(name)}</Text>
            </View>
          </LinearGradient>
          <FluxLogo size={28} style={styles.badgeLogo} />
          <Text style={[styles.heroName, { color: colors.foreground }]}>{name}</Text>
          <Text style={[styles.heroEmail, { color: colors.mutedForeground }]}>{user?.email}</Text>
          <View style={[styles.planPill, { backgroundColor: isPremium ? colors.primary + '22' : colors.secondary }]}>
            <Text style={{ color: isPremium ? (isOnTrial && !isPaidPremium ? '#FFD60A' : colors.primary) : colors.mutedForeground, fontFamily: 'DMSans_600SemiBold', fontSize: 12 }}>
              {isPaidPremium ? 'Premium' : isOnTrial ? `Trial · ${trialDaysLeft}d left` : 'Free plan'}
            </Text>
          </View>
        </View>

        <Text style={[styles.section, { color: colors.mutedForeground }]}>PUBLIC PROFILE</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.label, { color: colors.foreground }]}>Display name</Text>
          <TextInput
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Your name"
            placeholderTextColor={colors.mutedForeground}
            style={[styles.input, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
          />

          <Text style={[styles.label, { color: colors.foreground, marginTop: 14 }]}>Profile ID</Text>
          <Text style={[styles.hint, { color: colors.mutedForeground }]}>
            Your unique @handle. Lowercase letters, numbers, underscore (3–24 chars).
          </Text>
          <View style={[styles.idRow, { backgroundColor: colors.input, borderColor: colors.border }]}>
            <Text style={[styles.at, { color: colors.mutedForeground }]}>@</Text>
            <TextInput
              value={profileId}
              onChangeText={(t) => setProfileId(t.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              placeholder="flux_user"
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="none"
              autoCorrect={false}
              style={[styles.idInput, { color: colors.foreground }]}
            />
          </View>
        </View>

        {error && <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text>}
        {saved && <Text style={[styles.saved, { color: '#30D158' }]}>Profile saved</Text>}

        <Pressable
          onPress={() => { void handleSave(); }}
          disabled={busy}
          style={({ pressed }) => [{ opacity: pressed || busy ? 0.85 : 1 }]}
        >
          <LinearGradient colors={[colors.primary, '#9B8FFF']} style={styles.saveBtn}>
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveText}>Save profile</Text>
            )}
          </LinearGradient>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontFamily: 'DMSans_700Bold' },
  body: { paddingHorizontal: 22, paddingBottom: 40 },
  hero: { alignItems: 'center', paddingVertical: 20, gap: 6 },
  avatarRing: { padding: 4, borderRadius: 40, marginBottom: 4 },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 28, fontFamily: 'DMSans_700Bold' },
  badgeLogo: { position: 'absolute', top: 88, right: '32%' },
  heroName: { fontSize: 22, fontFamily: 'DMSans_700Bold', marginTop: 8 },
  heroEmail: { fontSize: 14, fontFamily: 'DMSans_400Regular' },
  planPill: { marginTop: 8, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  section: {
    fontSize: 11,
    fontFamily: 'DMSans_600SemiBold',
    letterSpacing: 1,
    marginBottom: 8,
    marginTop: 8,
  },
  card: { borderRadius: 18, borderWidth: 1, padding: 16, marginBottom: 16 },
  label: { fontSize: 14, fontFamily: 'DMSans_600SemiBold', marginBottom: 8 },
  hint: { fontSize: 12, fontFamily: 'DMSans_400Regular', marginBottom: 8, lineHeight: 17 },
  input: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 15,
    fontFamily: 'DMSans_400Regular',
  },
  idRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    height: 48,
  },
  at: { fontSize: 16, fontFamily: 'DMSans_600SemiBold', marginRight: 2 },
  idInput: { flex: 1, fontSize: 15, fontFamily: 'DMSans_500Medium' },
  error: { fontSize: 13, fontFamily: 'DMSans_500Medium', marginBottom: 8 },
  saved: { fontSize: 13, fontFamily: 'DMSans_600SemiBold', marginBottom: 8, textAlign: 'center' },
  saveBtn: {
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  saveText: { color: '#fff', fontSize: 16, fontFamily: 'DMSans_700Bold' },
});
