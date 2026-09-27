import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme, fonts } from '../theme';
import { PillButton } from '../components';
import { useApp, FREE_ROOM_LIMIT } from '../state';
import { PRESET_ROOMS } from '../presets';
import { todayIso } from '../db';
import { DraftArea, createAreas, draftFromPreset, pickedCount } from '../areas';
import ChoreChecklist from './ChoreChecklist';

/**
 * First-run setup, right after the paywall. Step 1: pick what you look
 * after (nothing pre-selected). Step 2: tick the chores you actually do,
 * with the everyday ones suggested. Only ticked chores are created.
 */
export default function Setup({ onDone }: { onDone: () => void }) {
  const theme = useTheme();
  const { isPro, showPaywall, bumpData } = useApp();
  const [picked, setPicked] = useState<string[]>([]);
  const [step, setStep] = useState<1 | 2>(1);
  const [drafts, setDrafts] = useState<DraftArea[]>([]);
  const [saving, setSaving] = useState(false);
  const today = todayIso();

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

  const toChores = () => {
    // Keep ticks the person already changed if they go back and forth.
    const next = PRESET_ROOMS.filter((r) => picked.includes(r.key)).map((r, i) => {
      const prev = drafts.find((d) => d.key === r.key);
      return prev ?? draftFromPreset(r, i);
    });
    setDrafts(next);
    setStep(2);
  };

  const finish = async () => {
    setSaving(true);
    try {
      await createAreas(drafts, today);
      bumpData();
      onDone();
    } catch (e: any) {
      Alert.alert('Couldn’t save your chores', e?.message ?? 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const count = pickedCount(drafts);

  if (step === 2) {
    return (
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: theme.bg }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Pressable onPress={() => setStep(1)} hitSlop={10} style={{ alignSelf: 'flex-start' }}>
            <Text style={[styles.back, { color: theme.accent }]}>‹ Back</Text>
          </Pressable>
          <Text style={[styles.title, { color: theme.text, marginTop: 14 }]}>Tick the chores you do</Text>
          <Text style={[styles.body, { color: theme.textSecondary }]}>
            We ticked the everyday ones. Untick anything you don’t do, tick anything you do, or add your own. First dates are spread out so day one isn’t a pile-up. You can change any of it later.
          </Text>
          <View style={{ marginTop: 20 }}>
            <ChoreChecklist areas={drafts} onChange={setDrafts} today={today} />
          </View>
        </ScrollView>
        <View style={[styles.footer, { borderTopColor: theme.border, backgroundColor: theme.bg }]}>
          <PillButton
            theme={theme}
            label={saving ? 'Setting up…' : count > 0 ? `Add ${count} chore${count === 1 ? '' : 's'}` : 'Continue without chores'}
            onPress={finish}
            disabled={saving}
          />
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.icon}>🏡</Text>
        <Text style={[styles.title, { color: theme.text }]}>What do you look after?</Text>
        <Text style={[styles.body, { color: theme.textSecondary }]}>
          Pick your rooms, pets, the yard or the car. Next, you’ll choose the chores for each one.
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
                {on ? <Text style={[styles.cellCheck, { color: theme.accent }]}>✓</Text> : null}
              </Pressable>
            );
          })}
        </View>
        {!isPro ? (
          <Text style={[styles.limit, { color: theme.textFaint }]}>
            Free covers {FREE_ROOM_LIMIT} areas. Pro covers the whole house, pets, yard and car.
          </Text>
        ) : null}
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: theme.border, backgroundColor: theme.bg }]}>
        <PillButton
          theme={theme}
          label={picked.length ? 'Next: pick the chores' : 'Pick at least one'}
          onPress={toChores}
          disabled={picked.length === 0}
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
  back: { fontSize: 16, fontWeight: fonts.weight.semibold },
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
    minHeight: 96,
  },
  cellEmoji: { fontSize: 30 },
  cellName: { fontSize: 14, fontWeight: fonts.weight.semibold, marginTop: 6 },
  cellCheck: { fontSize: 13, marginTop: 2, fontWeight: fonts.weight.bold },
  limit: { fontSize: 12, textAlign: 'center', marginTop: 14 },
  footer: { borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: 24, paddingTop: 12, paddingBottom: 30 },
  skip: { alignSelf: 'center', marginTop: 12, padding: 4 },
  skipText: { fontSize: 14 },
});
