import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme, fonts, Theme } from '../theme';
import { Chip } from '../components';
import { freqLabel } from '../presets';
import { DraftArea, customChore, startsLabel } from '../areas';

const QUICK_FREQS: { days: number; label: string }[] = [
  { days: 1, label: 'Daily' },
  { days: 7, label: 'Weekly' },
  { days: 30, label: 'Monthly' },
];

function Checkbox({ theme, on }: { theme: Theme; on: boolean }) {
  return (
    <View
      style={[
        styles.box,
        { borderColor: on ? theme.accent : theme.textFaint, backgroundColor: on ? theme.accent : 'transparent' },
      ]}
    >
      {on ? <Text style={[styles.tick, { color: theme.onAccent }]}>✓</Text> : null}
    </View>
  );
}

/**
 * The chore picker: every suggested chore for each area, with the everyday
 * ones already ticked, and a way to add your own. Nothing is saved here;
 * the parent decides when to create what's ticked.
 */
export default function ChoreChecklist({
  areas,
  onChange,
  today,
  showAreaHeaders = true,
}: {
  areas: DraftArea[];
  onChange: (next: DraftArea[]) => void;
  today: string;
  showAreaHeaders?: boolean;
}) {
  const theme = useTheme();
  const [ownName, setOwnName] = useState<Record<string, string>>({});
  const [ownFreq, setOwnFreq] = useState<Record<string, number>>({});

  const update = (key: string, fn: (a: DraftArea) => DraftArea) =>
    onChange(areas.map((a) => (a.key === key ? fn(a) : a)));

  const toggle = (areaKey: string, choreId: string) => {
    Haptics.selectionAsync().catch(() => {});
    update(areaKey, (a) => ({
      ...a,
      chores: a.chores.map((c) => (c.id === choreId ? { ...c, picked: !c.picked } : c)),
    }));
  };

  const setAll = (areaKey: string, picked: boolean) =>
    update(areaKey, (a) => ({ ...a, chores: a.chores.map((c) => ({ ...c, picked })) }));

  const addOwn = (areaKey: string) => {
    const name = (ownName[areaKey] ?? '').trim();
    if (!name) return;
    const freq = ownFreq[areaKey] ?? 7;
    update(areaKey, (a) => ({ ...a, chores: [...a.chores, customChore(name, freq)] }));
    setOwnName((s) => ({ ...s, [areaKey]: '' }));
  };

  return (
    <View style={{ gap: 18 }}>
      {areas.map((area) => {
        const allOn = area.chores.length > 0 && area.chores.every((c) => c.picked);
        const freq = ownFreq[area.key] ?? 7;
        return (
          <View key={area.key}>
            {showAreaHeaders ? (
              <View style={styles.areaHeader}>
                <Text style={[styles.areaName, { color: theme.text }]} numberOfLines={1}>
                  {area.emoji} {area.name}
                </Text>
                {area.chores.length > 0 ? (
                  <Pressable onPress={() => setAll(area.key, !allOn)} hitSlop={8}>
                    <Text style={[styles.allBtn, { color: theme.accent }]}>{allOn ? 'Clear' : 'Select all'}</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : area.chores.length > 0 ? (
              <View style={[styles.areaHeader, { justifyContent: 'flex-end' }]}>
                <Pressable onPress={() => setAll(area.key, !allOn)} hitSlop={8}>
                  <Text style={[styles.allBtn, { color: theme.accent }]}>{allOn ? 'Clear' : 'Select all'}</Text>
                </Pressable>
              </View>
            ) : null}

            <View style={[styles.list, { backgroundColor: theme.card, borderColor: theme.border }]}>
              {area.chores.map((c, i) => (
                <Pressable
                  key={c.id}
                  onPress={() => toggle(area.key, c.id)}
                  style={({ pressed }) => [
                    styles.row,
                    { borderBottomColor: theme.border, borderBottomWidth: StyleSheet.hairlineWidth, opacity: pressed ? 0.7 : 1 },
                  ]}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: c.picked }}
                  accessibilityLabel={c.name}
                >
                  <Checkbox theme={theme} on={c.picked} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.name, { color: c.picked ? theme.text : theme.textSecondary }]} numberOfLines={1}>
                      {c.name}
                    </Text>
                    <Text style={[styles.meta, { color: theme.textFaint }]} numberOfLines={1}>
                      {c.custom ? 'Your own · ' : ''}
                      {freqLabel(c.freq)} · {startsLabel(c.offset, today)}
                    </Text>
                  </View>
                </Pressable>
              ))}

              <View style={styles.ownBlock}>
                <View style={styles.ownRow}>
                  <TextInput
                    style={[styles.ownInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.bg }]}
                    value={ownName[area.key] ?? ''}
                    onChangeText={(v) => setOwnName((s) => ({ ...s, [area.key]: v }))}
                    placeholder="Add your own chore"
                    placeholderTextColor={theme.textFaint}
                    returnKeyType="done"
                    onSubmitEditing={() => addOwn(area.key)}
                  />
                  <Pressable
                    onPress={() => addOwn(area.key)}
                    disabled={!(ownName[area.key] ?? '').trim()}
                    style={({ pressed }) => [
                      styles.addBtn,
                      {
                        backgroundColor: theme.accent,
                        opacity: !(ownName[area.key] ?? '').trim() ? 0.4 : pressed ? 0.85 : 1,
                      },
                    ]}
                  >
                    <Text style={[styles.addBtnText, { color: theme.onAccent }]}>Add</Text>
                  </Pressable>
                </View>
                <View style={styles.freqRow}>
                  {QUICK_FREQS.map((f) => (
                    <Chip
                      key={f.days}
                      theme={theme}
                      label={f.label}
                      active={freq === f.days}
                      onPress={() => setOwnFreq((s) => ({ ...s, [area.key]: f.days }))}
                    />
                  ))}
                </View>
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  areaHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, gap: 8 },
  areaName: { fontSize: 18, fontWeight: fonts.weight.bold, flexShrink: 1 },
  allBtn: { fontSize: 14, fontWeight: fonts.weight.semibold },
  list: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14 },
  box: { width: 24, height: 24, borderRadius: 7, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  tick: { fontSize: 15, fontWeight: fonts.weight.bold, marginTop: -1 },
  name: { fontSize: 16, fontWeight: fonts.weight.medium },
  meta: { fontSize: 13, marginTop: 2 },
  ownBlock: { padding: 12, gap: 10 },
  ownRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ownInput: { flex: 1, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  addBtn: { borderRadius: 12, paddingHorizontal: 16, paddingVertical: 11 },
  addBtnText: { fontSize: 15, fontWeight: fonts.weight.semibold },
  freqRow: { flexDirection: 'row', gap: 8 },
});
