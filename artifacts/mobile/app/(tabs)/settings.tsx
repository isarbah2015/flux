import React from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useScreenshots } from '@/context/ScreenshotsContext';
import { Feather } from '@expo/vector-icons';

interface RowProps {
  icon: string;
  iconColor?: string;
  label: string;
  value?: string;
  onPress?: () => void;
  destructive?: boolean;
}

function SettingsRow({ icon, iconColor, label, value, onPress, destructive }: RowProps) {
  const colors = useColors();
  const ic = iconColor ?? colors.mutedForeground;
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.row,
        { borderColor: colors.border, opacity: pressed ? 0.75 : 1 },
      ]}
    >
      <View style={[styles.rowIcon, { backgroundColor: ic + '22' }]}>
        <Feather name={icon as any} size={16} color={ic} />
      </View>
      <Text
        style={[
          styles.rowLabel,
          { color: destructive ? colors.destructive : colors.foreground },
        ]}
      >
        {label}
      </Text>
      <View style={styles.rowRight}>
        {value && (
          <Text style={[styles.rowValue, { color: colors.mutedForeground }]}>{value}</Text>
        )}
        {onPress && <Feather name="chevron-right" size={16} color={colors.mutedForeground} />}
      </View>
    </Pressable>
  );
}

function SectionHeader({ title }: { title: string }) {
  const colors = useColors();
  return (
    <Text style={[styles.sectionHeader, { color: colors.mutedForeground }]}>{title}</Text>
  );
}

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { totalIndexed } = useScreenshots();

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const botPad = Platform.OS === 'web' ? 34 + 84 : insets.bottom + 60;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: topPad + 12, paddingBottom: botPad }]}
        showsVerticalScrollIndicator={false}
      >
        {/* App identity */}
        <View style={styles.appHeader}>
          <View style={[styles.appIcon, { backgroundColor: colors.primary + '22' }]}>
            <Feather name="zap" size={28} color={colors.primary} />
          </View>
          <Text style={[styles.appName, { color: colors.foreground }]}>Flux</Text>
          <Text style={[styles.appTagline, { color: colors.mutedForeground }]}>
            Your screenshots, alive.
          </Text>
          <View style={[styles.statsRow]}>
            <View style={[styles.statPill, { backgroundColor: colors.primary + '18' }]}>
              <Text style={[styles.statNum, { color: colors.primary }]}>{totalIndexed}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Indexed</Text>
            </View>
            <View style={[styles.statPill, { backgroundColor: '#30D158' + '18' }]}>
              <Text style={[styles.statNum, { color: '#30D158' }]}>100%</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>On-device</Text>
            </View>
            <View style={[styles.statPill, { backgroundColor: '#FF9F0A' + '18' }]}>
              <Text style={[styles.statNum, { color: '#FF9F0A' }]}>0</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Cloud calls</Text>
            </View>
          </View>
        </View>

        {/* Privacy */}
        <SectionHeader title="PRIVACY" />
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <SettingsRow
            icon="shield"
            iconColor="#30D158"
            label="On-device processing"
            value="Always on"
          />
          <SettingsRow
            icon="cloud-off"
            iconColor="#30D158"
            label="Cloud sync"
            value="Disabled"
          />
          <SettingsRow
            icon="eye-off"
            iconColor="#30D158"
            label="Analytics"
            value="Disabled"
          />
        </View>

        {/* Storage */}
        <SectionHeader title="STORAGE" />
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <SettingsRow
            icon="database"
            iconColor={colors.primary}
            label="Screenshots indexed"
            value={String(totalIndexed)}
          />
          <SettingsRow
            icon="hard-drive"
            iconColor={colors.primary}
            label="Local storage used"
            value="4.2 MB"
          />
        </View>

        {/* Premium */}
        <SectionHeader title="PREMIUM" />
        <View style={[styles.premiumCard, { backgroundColor: colors.primary + '18', borderColor: colors.primary + '44' }]}>
          <View style={styles.premiumHeader}>
            <Feather name="star" size={18} color={colors.primary} />
            <Text style={[styles.premiumTitle, { color: colors.primary }]}>Upgrade to Premium</Text>
          </View>
          <Text style={[styles.premiumSub, { color: colors.mutedForeground }]}>
            Price tracking, promise reminders, calendar sync, and unlimited AI classification.
          </Text>
          <View style={styles.premiumFeatures}>
            {['Price drop alerts', 'Promise tracker', 'Calendar sync', 'Unlimited OCR'].map((f) => (
              <View key={f} style={styles.premiumFeature}>
                <Feather name="check" size={13} color={colors.primary} />
                <Text style={[styles.premiumFeatureText, { color: colors.foreground }]}>{f}</Text>
              </View>
            ))}
          </View>
          <Pressable
            style={({ pressed }) => [
              styles.premiumBtn,
              { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Text style={styles.premiumBtnText}>$9.99 / month — Start Free Trial</Text>
          </Pressable>
        </View>

        {/* About */}
        <SectionHeader title="ABOUT" />
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <SettingsRow icon="info" label="Version" value="1.0.0" />
          <SettingsRow icon="file-text" label="Privacy Policy" onPress={() => {}} />
          <SettingsRow icon="message-square" label="Send Feedback" onPress={() => {}} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    paddingHorizontal: 16,
    gap: 0,
  },
  appHeader: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  appIcon: {
    width: 72,
    height: 72,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  appName: {
    fontSize: 26,
    fontFamily: 'Inter_700Bold',
    letterSpacing: -0.5,
  },
  appTagline: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  statPill: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    gap: 2,
  },
  statNum: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
  },
  statLabel: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
  },
  sectionHeader: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginTop: 20,
    marginBottom: 8,
    marginLeft: 4,
  },
  section: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rowValue: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
  premiumCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  premiumHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  premiumTitle: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
  },
  premiumSub: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    lineHeight: 19,
  },
  premiumFeatures: {
    gap: 6,
  },
  premiumFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  premiumFeatureText: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
  },
  premiumBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  premiumBtnText: {
    color: '#fff',
    fontSize: 15,
    fontFamily: 'Inter_700Bold',
  },
});
