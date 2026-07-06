export const CATEGORY_COLORS = {
  shopping: '#FF9F0A',
  work: '#7C72FF',
  travel: '#00D4FF',
  receipt: '#30D158',
  conversation: '#FF375F',
  unknown: '#636384',
} as const;

export const CATEGORY_LABELS = {
  shopping: 'Shopping',
  work: 'Work',
  travel: 'Travel',
  receipt: 'Receipt',
  conversation: 'Conversation',
  unknown: 'Other',
} as const;

export const CATEGORY_ICONS: Record<string, string> = {
  shopping: 'shopping-bag',
  work: 'briefcase',
  travel: 'map-pin',
  receipt: 'file-text',
  conversation: 'message-circle',
  unknown: 'help-circle',
};

const colors = {
  light: {
    text: '#0a0a0a',
    tint: '#7C72FF',
    background: '#F4F4F9',
    foreground: '#0a0a0a',
    card: '#FFFFFF',
    cardForeground: '#0a0a0a',
    primary: '#7C72FF',
    primaryForeground: '#FFFFFF',
    secondary: '#F0F0F8',
    secondaryForeground: '#1a1a1a',
    muted: '#F0F0F8',
    mutedForeground: '#737373',
    accent: '#00D4FF',
    accentForeground: '#0a0a0a',
    destructive: '#ef4444',
    destructiveForeground: '#ffffff',
    border: '#E5E5EF',
    input: '#F0F0F8',
  },
  dark: {
    text: '#EDEDF8',
    tint: '#7C72FF',
    background: '#0C0C14',
    foreground: '#EDEDF8',
    card: '#13131F',
    cardForeground: '#EDEDF8',
    primary: '#7C72FF',
    primaryForeground: '#FFFFFF',
    secondary: '#1C1C2A',
    secondaryForeground: '#EDEDF8',
    muted: '#1C1C2A',
    mutedForeground: '#6A6A85',
    accent: '#00D4FF',
    accentForeground: '#0C0C14',
    destructive: '#FF453A',
    destructiveForeground: '#FFFFFF',
    border: '#252535',
    input: '#1C1C2A',
  },
  radius: 12,
};

export default colors;
