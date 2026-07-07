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
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useScreenshots } from '@/context/ScreenshotsContext';
import { formatApiError } from '@/lib/format-api-error';

export default function ImportScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { addScreenshot, isImporting } = useScreenshots();

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function pickImage() {
    setError(null);
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setError('Photo library access is needed to import screenshots.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      setImageBase64(result.assets[0].base64 ?? null);
      Haptics.selectionAsync();
    }
  }

  async function handleImport() {
    if (!imageBase64 && !text.trim()) {
      setError('Choose a screenshot or add its text so Flux can classify it.');
      return;
    }
    try {
      setError(null);
      await addScreenshot({
        extractedText: text.trim() || undefined,
        imageBase64,
        imageUri,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (e) {
      setError(formatApiError(e));
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.foreground }]}>Import screenshot</Text>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Feather name="x" size={24} color={colors.mutedForeground} />
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={insets.top + 8}
      >
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <Pressable
            onPress={pickImage}
            style={[styles.picker, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.preview} contentFit="cover" />
            ) : (
              <View style={styles.pickerEmpty}>
                <Feather name="image" size={34} color={colors.mutedForeground} />
                <Text style={[styles.pickerText, { color: colors.mutedForeground }]}>
                  Tap to choose a screenshot
                </Text>
              </View>
            )}
          </Pressable>

          <Text style={[styles.label, { color: colors.foreground }]}>
            Screenshot text {imageBase64 ? '(optional)' : ''}
          </Text>
          <Text style={[styles.hint, { color: colors.mutedForeground }]}>
            {imageBase64
              ? 'Flux will read the image automatically. Add or correct text here if you like.'
              : 'Paste or type the text in the screenshot so Flux can detect the category, prices, promises, and events.'}
          </Text>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="e.g. Nike Air Max 270  $129.99  Add to Cart"
            placeholderTextColor={colors.mutedForeground}
            multiline
            style={[
              styles.input,
              { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border },
            ]}
          />

          {error && <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text>}
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <Pressable
            onPress={handleImport}
            disabled={isImporting}
            style={[styles.button, { backgroundColor: colors.primary, opacity: isImporting ? 0.7 : 1 }]}
          >
            {isImporting ? (
              <ActivityIndicator color={colors.primaryForeground} />
            ) : (
              <>
                <Feather name="zap" size={18} color={colors.primaryForeground} />
                <Text style={[styles.buttonText, { color: colors.primaryForeground }]}>
                  Classify & import
                </Text>
              </>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingBottom: 12,
  },
  title: { fontSize: 24, fontFamily: 'DMSans_700Bold', letterSpacing: -0.5 },
  body: { paddingHorizontal: 22, paddingBottom: 24, gap: 10 },
  picker: {
    height: 220,
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  pickerEmpty: { alignItems: 'center', gap: 10 },
  pickerText: { fontSize: 14, fontFamily: 'DMSans_500Medium' },
  preview: { width: '100%', height: '100%' },
  label: { fontSize: 16, fontFamily: 'DMSans_600SemiBold' },
  hint: { fontSize: 13, fontFamily: 'DMSans_400Regular', lineHeight: 18 },
  input: {
    minHeight: 120,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    fontSize: 15,
    fontFamily: 'DMSans_400Regular',
    textAlignVertical: 'top',
  },
  error: { fontSize: 13, fontFamily: 'DMSans_500Medium', marginTop: 4 },
  footer: { paddingHorizontal: 22, paddingTop: 8 },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 54,
    borderRadius: 16,
  },
  buttonText: { fontSize: 16, fontFamily: 'DMSans_600SemiBold' },
});
