import { useColorScheme } from 'react-native';

export interface Theme {
  bg: string;
  card: string;
  cardAlt: string;
  text: string;
  textSecondary: string;
  textFaint: string;
  accent: string;
  /** Text and icons drawn on top of `accent`. */
  onAccent: string;
  accentSoft: string;
  highlight: string;
  danger: string;
  border: string;
  success: string;
  warn: string;
  muted: string;
  isDark: boolean;
}

// Chores palette: sage green on a soft linen white with a sunny yellow
// highlight. Fresh and calm, like a just-cleaned kitchen. Distinct from the
// navy clipboard (Attendance), the medal (Merit), the flame (Hearth) and the
// gift (Given). Night mode is a deep forest with mint up front.
export const lightTheme: Theme = {
  bg: '#F4F7F2',
  card: '#FFFFFF',
  cardAlt: '#E8F0E9',
  text: '#16231B',
  textSecondary: '#4B5D52',
  textFaint: '#8A998F',
  accent: '#2E7D5B',
  onAccent: '#FFFFFF',
  accentSoft: '#DCEFE3',
  highlight: '#F4C23D',
  danger: '#CF4A3F',
  border: '#D7E2D9',
  success: '#2E9E62',
  warn: '#DE9D16',
  muted: '#6F8076',
  isDark: false,
};

export const darkTheme: Theme = {
  bg: '#0E1611',
  card: '#16211A',
  cardAlt: '#1E2C23',
  text: '#E8F1EA',
  textSecondary: '#AEBFB4',
  textFaint: '#738479',
  accent: '#6FD3A0',
  onAccent: '#0E1611',
  accentSoft: '#1C3828',
  highlight: '#F4C23D',
  danger: '#F06A5E',
  border: '#26352B',
  success: '#6FD3A0',
  warn: '#F4C23D',
  muted: '#8C9C92',
  isDark: true,
};

export function useTheme(): Theme {
  const scheme = useColorScheme();
  return scheme === 'dark' ? darkTheme : lightTheme;
}

export const fonts = {
  weight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
};

/** Member colors: readable in light and dark, distinct from each other. */
export const MEMBER_COLORS = [
  '#2E7D5B', // sage
  '#3B6FD8', // blue
  '#D9534F', // coral red
  '#E39A12', // amber
  '#8E5CD9', // violet
  '#D6538F', // pink
  '#1F9FB0', // teal
  '#7A6A55', // walnut
];

/** Freshness color: full = fresh green, half = sunny, empty = due red. */
export function freshnessColor(theme: Theme, f: number): string {
  if (f > 0.5) return theme.success;
  if (f > 0.2) return theme.warn;
  return theme.danger;
}
