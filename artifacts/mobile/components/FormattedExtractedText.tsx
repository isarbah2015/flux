import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { formatExtractedText } from '@/lib/format-extracted-text';

interface Props {
  text: string;
  color: string;
  mutedColor: string;
  emptyMessage: string;
}

export default function FormattedExtractedText({ text, color, mutedColor, emptyMessage }: Props) {
  const paragraphs = useMemo(() => formatExtractedText(text), [text]);

  if (paragraphs.length === 0) {
    return <Text style={[styles.body, { color: mutedColor }]}>{emptyMessage}</Text>;
  }

  return (
    <View style={styles.wrap}>
      {paragraphs.map((paragraph, index) => (
        <Text
          key={`p-${index}`}
          style={[
            styles.body,
            { color },
            index > 0 && styles.paragraphGap,
          ]}
        >
          {paragraph}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 0 },
  body: {
    fontSize: 15,
    fontFamily: 'DMSans_400Regular',
    lineHeight: 24,
    letterSpacing: 0.15,
  },
  paragraphGap: { marginTop: 14 },
});
