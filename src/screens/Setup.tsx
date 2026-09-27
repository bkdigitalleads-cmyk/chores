import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme, fonts } from '../theme';
import { PillButton } from '../components';
import { useApp, FREE_ROOM_LIMIT } from '../state';
import { PRESET_ROOMS } from '../presets';
import { seedRooms, todayIso } from '../db';

/**
 * First-run setup, right after the paywall: pick your rooms and get their
 * usual chores on sensible schedules. One screen, then you're in.
 */
export default function Setup({ onDone }: { onDone: () => void }) {
  const theme = useTheme();
  const { isPro, showPaywall, bumpData } = useApp();
  const common = PRESET_ROOMS.filter((r) => r.common).map((r) => r.key);
  const [picked, setPicked] = useState<string[]>(isPro ? common : common.slice(0, FREE_ROOM_LIMIT));
  const [saving, setSaving] = useState(false);

  const toggle = (key: string) => {
    Haptics.selectionAsync().catch(() => {});
    if (picked.includes(key)) {
      setPicked(picked.filter((k) => k !== key));
      return;
    }
    if (!isPro && picked.length >= FREE_ROOM_LIMIT) {
      showPaywall();
      return;
    }
    setPicked([...picked, key]);
  };

  const choreCount = PRESET_ROOMS.filter((r) => picked.includes(r.key)).reduce((s, r) => s + r.tasks.length, 0);

  const go = async () => {
    setSaving(true);
    try {
      if (picked.length) await seedRooms(picked, todayIso());
      bumpData();
    } finally {
      setSaving(false);
      onDone();
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.icon}>🏡</Text>
        <Text style={[styles.title, { color: theme.text }]}>What do you look after?</Text>
        <Text style={[styles.body, { color: theme.textSecondary }]}>
          Rooms, pets, the yard, the car. Each one comes with its usual chores on sensible schedules, spread out so day one isn’t overwhelming. Change anything later.
        </Text>

        <View style={styles.grid}>
          {PRESET_ROOMS.map((r) => {
            const on = picked.includes(r.key);
            return (
              <Pressable
                key={r.key}
                onPress={() => toggle(r.key)}
                style={({ pressed }) => [
                  styles.cell,
                  {
                    backgroundColor: on ? theme.accentSoft : theme.card,
                    borderColor: on ? theme.accent : theme.border,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
              >
                <Text style={styles.cellEmoji}>{r.emoji}</Text>
                <Text style={[styles.cellName, { color: theme.text }]} numberOfLines={1}>
                  {r.name}
                </Text>
                <Text style={[styles.cellCount, { color: on ? theme.accent : theme.textFaint }]}>
                  {on ? '✓ ' : ''}
                  {r.tasks.length} chores
                </Text>
              </Pressable>
            );
          })}
        </View>
        {!isPro ? (
          <Text style={[styles.limit, { color: theme.textFaint }]}>
            Free covers {FREE_ROOM_LIMIT} areas. Pro covers the whole house, pets, yard and car, and everyone in it.
          </Text>
        ) : null}
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: theme.border, backgroundColor: theme.bg }]}>
        <PillButton
          theme={theme}
          label={
            saving
              ? 'Setting up…'
              : picked.length
                ? `Start with ${picked.length} area${picked.length === 1 ? '' : 's'} · ${choreCount} chores`
                : 'Continue'
          }
          onPress={go}
          disabled={saving}
        />
        <Pressable onPress={onDone} hitSlop={10} style={styles.skip}>
          <Text style={[styles.skipText, { color: theme.textFaint }]}>Skip, I’ll add my own</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 24, paddingTop: 36, paddingBottom: 24 },
  icon: { fontSize: 44, marginBottom: 10 },
  title: { fontSize: 28, fontWeight: fonts.weight.bold, letterSpacing: -0.5 },
  body: { fontSize: 16, lineHeight: 23, marginTop: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 22 },
  cell: {
    width: '31%',
    flexGrow: 1,
    borderWidth: 1.5,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  cellEmoji: { fontSize: 30 },
  cellName: { fontSize: 14, fontWeight: fonts.weight.semibold, marginTop: 6 },
  cellCount: { fontSize: 11, marginTop: 2, fontWeight: fonts.weight.medium },
  limit: { fontSize: 12, textAlign: 'center', marginTop: 14 },
  footer: { borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: 24, paddingTop: 12, paddingBottom: 30 },
  skip: { alignSelf: 'center', marginTop: 12, padding: 4 },
  skipText: { fontSize: 14 },
});
