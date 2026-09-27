import React from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Theme, fonts, freshnessColor } from './theme';

export function Card({
  theme,
  children,
  style,
}: {
  theme: Theme;
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }, style]}>
      {children}
    </View>
  );
}

export function PillButton({
  theme,
  label,
  onPress,
  kind = 'primary',
  disabled = false,
}: {
  theme: Theme;
  label: string;
  onPress: () => void;
  kind?: 'primary' | 'ghost' | 'danger';
  disabled?: boolean;
}) {
  const bg = kind === 'primary' ? theme.accent : 'transparent';
  const fg = kind === 'primary' ? theme.onAccent : kind === 'danger' ? theme.danger : theme.accent;
  const border = kind === 'danger' ? theme.danger : theme.accent;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.pill,
        {
          backgroundColor: bg,
          borderColor: border,
          borderWidth: kind === 'primary' ? 0 : 1,
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
        },
      ]}
    >
      <Text style={[styles.pillLabel, { color: fg }]}>{label}</Text>
    </Pressable>
  );
}

export function SectionTitle({
  theme,
  children,
  right,
}: {
  theme: Theme;
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <View style={styles.sectionRow}>
      <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>{children}</Text>
      {right}
    </View>
  );
}

export function ProBadge({ theme }: { theme: Theme }) {
  return (
    <View style={[styles.proBadge, { backgroundColor: theme.accentSoft }]}>
      <Text style={[styles.proBadgeText, { color: theme.accent }]}>PRO</Text>
    </View>
  );
}

export function Chip({
  theme,
  label,
  active,
  onPress,
  color,
  locked,
}: {
  theme: Theme;
  label: string;
  active: boolean;
  onPress: () => void;
  color?: string;
  locked?: boolean;
}) {
  const tint = color ?? theme.accent;
  return (
    <Pressable
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: active ? tint : theme.card,
          borderColor: active ? tint : theme.border,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <Text
        style={[
          styles.chipText,
          { color: active ? (color ? '#FFFFFF' : theme.onAccent) : theme.text },
        ]}
      >
        {label}
      </Text>
      {locked ? <Text style={[styles.chipLock, { color: theme.textFaint }]}>PRO</Text> : null}
    </Pressable>
  );
}

/** The round checkbox on every chore row. */
export function CheckCircle({
  theme,
  done,
  color,
  onPress,
  size = 28,
}: {
  theme: Theme;
  done: boolean;
  color?: string;
  onPress: () => void;
  size?: number;
}) {
  const c = color ?? theme.accent;
  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: done }}
      style={({ pressed }) => [
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 2,
          borderColor: done ? c : theme.textFaint,
          backgroundColor: done ? c : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
          transform: [{ scale: pressed ? 0.9 : 1 }],
        },
      ]}
    >
      {done ? <Text style={{ color: '#FFFFFF', fontSize: size * 0.55, fontWeight: fonts.weight.bold }}>✓</Text> : null}
    </Pressable>
  );
}

/** Thin bar that drains from green to red as a chore comes due. */
export function FreshnessBar({ theme, value, height = 4 }: { theme: Theme; value: number; height?: number }) {
  const v = Math.max(0, Math.min(1, value));
  return (
    <View style={[styles.barTrack, { height, backgroundColor: theme.cardAlt }]}>
      <View
        style={{
          width: `${Math.max(v, 0.04) * 100}%`,
          height,
          borderRadius: height,
          backgroundColor: freshnessColor(theme, v),
        }}
      />
    </View>
  );
}

export function ProgressBar({
  theme,
  value,
  height = 10,
  color,
}: {
  theme: Theme;
  value: number;
  height?: number;
  color?: string;
}) {
  const v = Math.max(0, Math.min(1, value));
  return (
    <View style={[styles.barTrack, { height, backgroundColor: theme.cardAlt }]}>
      <View style={{ width: `${v * 100}%`, height, borderRadius: height, backgroundColor: color ?? theme.accent }} />
    </View>
  );
}

export function MemberDot({ name, color, size = 22 }: { name: string; color: string; size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color: '#FFFFFF', fontSize: size * 0.5, fontWeight: fonts.weight.bold }}>
        {name.trim().charAt(0).toUpperCase() || '?'}
      </Text>
    </View>
  );
}

export function EmptyState({
  theme,
  emoji,
  title,
  body,
  children,
}: {
  theme: Theme;
  emoji: string;
  title: string;
  body: string;
  children?: React.ReactNode;
}) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyEmoji}>{emoji}</Text>
      <Text style={[styles.emptyTitle, { color: theme.text }]}>{title}</Text>
      <Text style={[styles.emptyBody, { color: theme.textSecondary }]}>{body}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
  },
  pill: {
    borderRadius: 24,
    paddingVertical: 13,
    paddingHorizontal: 22,
    alignItems: 'center',
  },
  pillLabel: {
    fontSize: 16,
    fontWeight: fonts.weight.semibold,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: fonts.weight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  proBadge: {
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  proBadgeText: {
    fontSize: 10,
    fontWeight: fonts.weight.bold,
    letterSpacing: 0.5,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 18,
    paddingVertical: 7,
    paddingHorizontal: 13,
  },
  chipText: { fontSize: 14, fontWeight: fonts.weight.medium },
  chipLock: { fontSize: 9, fontWeight: fonts.weight.bold, letterSpacing: 0.5 },
  barTrack: { borderRadius: 10, overflow: 'hidden', width: '100%' },
  empty: { alignItems: 'center', paddingHorizontal: 28, paddingVertical: 40 },
  emptyEmoji: { fontSize: 44, marginBottom: 10 },
  emptyTitle: { fontSize: 19, fontWeight: fonts.weight.bold, textAlign: 'center' },
  emptyBody: { fontSize: 15, lineHeight: 21, textAlign: 'center', marginTop: 6, marginBottom: 16 },
});
