import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useTheme, fonts, MEMBER_COLORS } from '../theme';
import { Card, MemberDot, PillButton, ProBadge, SectionTitle } from '../components';
import { useApp } from '../state';
import {
  Completion,
  deleteMember,
  getCompletionsBetween,
  getMembers,
  insertMember,
  Member,
  prettyDate,
  setCompletionMember,
  shiftDate,
  shortWeekday,
  startOfWeek,
  todayIso,
  updateMember,
} from '../db';
import { printChart } from '../chart';
import { maybeRequestReview } from '../reviews';

export default function ChartScreen() {
  const theme = useTheme();
  const { isPro, showPaywall, settings, dataVersion, bumpData } = useApp();
  const today = todayIso();
  const thisWeek = startOfWeek(today, settings.mondayFirst);
  const [weekStart, setWeekStart] = useState(thisWeek);
  const [members, setMembers] = useState<Member[]>([]);
  const [done, setDone] = useState<Completion[]>([]);
  const [editing, setEditing] = useState<Member | 'new' | null>(null);
  const [printing, setPrinting] = useState(false);

  // Follow a change to the week-start setting.
  useEffect(() => {
    setWeekStart(startOfWeek(today, settings.mondayFirst));
  }, [settings.mondayFirst, today]);

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => shiftDate(weekStart, i)), [weekStart]);

  const load = useCallback(async () => {
    const [ms, cs] = await Promise.all([getMembers(), getCompletionsBetween(weekStart, shiftDate(weekStart, 6))]);
    setMembers(ms);
    setDone(cs);
  }, [weekStart]);

  useEffect(() => {
    load();
  }, [load, dataVersion]);

  const rows: { key: string; name: string; color: string; member: Member | null }[] = [
    ...members.map((m) => ({ key: String(m.id), name: m.name, color: m.color, member: m })),
  ];
  const known = new Set(members.map((m) => m.id));
  const unassignedDone = done.filter((c) => c.memberId == null || !known.has(c.memberId));
  if (members.length === 0 || unassignedDone.length > 0) {
    // Before anyone is added it's all yours. After that, check-offs nobody
    // claimed sit in their own row until someone is given the credit.
    rows.push({ key: 'anyone', name: members.length ? 'Unclaimed' : 'You', color: members.length ? theme.textFaint : theme.accent, member: null });
  }

  const cellCount = (memberId: number | null, day: string) =>
    done.filter((c) => c.date === day && (memberId == null ? c.memberId == null || !known.has(c.memberId) : c.memberId === memberId)).length;
  const pointsFor = (memberId: number | null) =>
    done
      .filter((c) => (memberId == null ? c.memberId == null || !known.has(c.memberId) : c.memberId === memberId))
      .reduce((s, c) => s + c.points, 0);
  const leaderPoints = Math.max(0, ...rows.map((r) => pointsFor(r.member?.id ?? null)));

  const claim = (c: Completion) => {
    if (members.length === 0) return;
    const current = members.find((m) => m.id === c.memberId);
    Alert.alert('Who did it?', c.taskName, [
      ...members.map((m) => ({
        text: m.id === current?.id ? `${m.name} ✓` : m.name,
        onPress: async () => {
          await setCompletionMember(c.id, m.id);
          bumpData();
        },
      })),
      ...(current
        ? [
            {
              text: 'Nobody in particular',
              onPress: async () => {
                await setCompletionMember(c.id, null);
                bumpData();
              },
            },
          ]
        : []),
      { text: 'Cancel', style: 'cancel' as const },
    ]);
  };

  const onAddPerson = () => {
    if (!isPro) {
      showPaywall();
      return;
    }
    setEditing('new');
  };

  const onPrint = async () => {
    if (!isPro) {
      showPaywall();
      return;
    }
    setPrinting(true);
    try {
      await printChart(weekStart, settings.householdName);
      maybeRequestReview();
    } catch (e: any) {
      Alert.alert('Couldn’t make the chart', e?.message ?? 'Please try again.');
    } finally {
      setPrinting(false);
    }
  };

  const weekLabel =
    weekStart === thisWeek ? 'This week' : weekStart === shiftDate(thisWeek, -7) ? 'Last week' : weekStart === shiftDate(thisWeek, 7) ? 'Next week' : `Week of ${prettyDate(weekStart)}`;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[styles.title, { color: theme.text }]}>Chart</Text>
        <Text style={[styles.sub, { color: theme.textSecondary }]}>Who did what, and a chart for the fridge.</Text>

        <SectionTitle
          theme={theme}
          right={
            !isPro ? (
              <ProBadge theme={theme} />
            ) : undefined
          }
        >
          Household
        </SectionTitle>
        {members.length === 0 ? (
          <Card theme={theme}>
            <Text style={[styles.pitchTitle, { color: theme.text }]}>Share the load</Text>
            <Text style={[styles.pitchBody, { color: theme.textSecondary }]}>
              Add everyone who helps. Assign chores, let them take turns automatically, and see points add up through the week.
            </Text>
            <View style={{ marginTop: 12 }}>
              <PillButton theme={theme} label="Add your household" onPress={onAddPerson} />
            </View>
          </Card>
        ) : (
          <Card theme={theme} style={{ paddingVertical: 8 }}>
            {members.map((m) => (
              <Pressable key={m.id} onPress={() => setEditing(m)} style={[styles.memberRow, { borderBottomColor: theme.border }]}>
                <MemberDot name={m.name} color={m.color} size={30} />
                <Text style={[styles.memberName, { color: theme.text }]}>{m.name}</Text>
                <Text style={[styles.memberPts, { color: theme.textSecondary }]}>
                  {pointsFor(m.id)} pt{pointsFor(m.id) === 1 ? '' : 's'}
                  {pointsFor(m.id) > 0 && pointsFor(m.id) === leaderPoints ? ' 🏆' : ''}
                </Text>
              </Pressable>
            ))}
            <Pressable onPress={onAddPerson} style={styles.addRow}>
              <Text style={[styles.addText, { color: theme.accent }]}>+ Add a person</Text>
            </Pressable>
          </Card>
        )}

        <View style={styles.weekNav}>
          <Pressable onPress={() => setWeekStart((w) => shiftDate(w, -7))} hitSlop={12} style={styles.navBtn}>
            <Text style={[styles.navArrow, { color: theme.accent }]}>‹</Text>
          </Pressable>
          <View style={{ alignItems: 'center' }}>
            <Text style={[styles.weekLabel, { color: theme.text }]}>{weekLabel}</Text>
            <Text style={[styles.weekRange, { color: theme.textFaint }]}>
              {prettyDate(days[0])} to {prettyDate(days[6])}
            </Text>
          </View>
          <Pressable onPress={() => setWeekStart((w) => shiftDate(w, 7))} hitSlop={12} style={styles.navBtn}>
            <Text style={[styles.navArrow, { color: theme.accent }]}>›</Text>
          </Pressable>
        </View>

        <Card theme={theme} style={{ paddingHorizontal: 10 }}>
          <View style={styles.gridRow}>
            <View style={styles.nameCol} />
            {days.map((d) => (
              <View key={d} style={styles.dayCol}>
                <Text style={[styles.dayHead, { color: d === today ? theme.accent : theme.textFaint }]}>
                  {shortWeekday(d).charAt(0)}
                </Text>
              </View>
            ))}
            <View style={styles.ptsCol}>
              <Text style={[styles.dayHead, { color: theme.textFaint }]}>Pts</Text>
            </View>
          </View>
          {rows.map((r) => (
            <View key={r.key} style={[styles.gridRow, { borderTopColor: theme.border, borderTopWidth: StyleSheet.hairlineWidth }]}>
              <View style={[styles.nameCol, { flexDirection: 'row', alignItems: 'center', gap: 6 }]}>
                <MemberDot name={r.member || members.length === 0 ? r.name : '?'} color={r.color} size={20} />
                <Text style={[styles.gridName, { color: theme.text }]} numberOfLines={1}>
                  {r.name}
                </Text>
              </View>
              {days.map((d) => {
                const n = cellCount(r.member?.id ?? null, d);
                return (
                  <View key={d} style={styles.dayCol}>
                    {n > 0 ? (
                      <View style={[styles.cellDone, { backgroundColor: r.color }]}>
                        <Text style={styles.cellText}>{n > 1 ? n : '✓'}</Text>
                      </View>
                    ) : (
                      <Text style={[styles.cellEmpty, { color: theme.border }]}>·</Text>
                    )}
                  </View>
                );
              })}
              <View style={styles.ptsCol}>
                <Text style={[styles.ptsText, { color: theme.text }]}>{pointsFor(r.member?.id ?? null)}</Text>
              </View>
            </View>
          ))}
        </Card>
        {members.length > 0 && unassignedDone.length > 0 ? (
          <Text style={[styles.claimHint, { color: theme.textFaint }]}>
            Unclaimed means nobody was picked when it was ticked off. Tap a chore below to give someone the points.
          </Text>
        ) : null}

        {done.length > 0 ? (
          <>
            <SectionTitle theme={theme}>Done {weekLabel.toLowerCase().startsWith('week') ? 'that week' : weekLabel.toLowerCase()}</SectionTitle>
            <Card theme={theme} style={{ paddingVertical: 6 }}>
              {[...done]
                .reverse()
                .slice(0, 25)
                .map((c) => {
                  const m = members.find((x) => x.id === c.memberId);
                  return (
                    <Pressable
                      key={c.id}
                      onPress={() => claim(c)}
                      disabled={members.length === 0}
                      style={({ pressed }) => [styles.logRow, { borderBottomColor: theme.border, opacity: pressed ? 0.6 : 1 }]}
                    >
                      <Text style={styles.logEmoji}>{c.roomEmoji}</Text>
                      <Text style={[styles.logName, { color: theme.text }]} numberOfLines={1}>
                        {c.taskName}
                      </Text>
                      <Text style={[styles.logMeta, { color: theme.textFaint }]}>
                        {m ? `${m.name} · ` : members.length ? 'Unclaimed · ' : ''}
                        {shortWeekday(c.date)}
                      </Text>
                    </Pressable>
                  );
                })}
            </Card>
          </>
        ) : (
          <Text style={[styles.emptyWeek, { color: theme.textFaint }]}>Nothing checked off {weekLabel.toLowerCase().startsWith('week') ? 'that week' : weekLabel.toLowerCase()} yet.</Text>
        )}

        <View style={{ marginTop: 22 }}>
          <PillButton
            theme={theme}
            label={printing ? 'Making your chart…' : `🖨️  Print ${weekStart === thisWeek ? 'this week’s' : 'this'} chore chart`}
            onPress={onPrint}
            disabled={printing}
          />
          {printing ? <ActivityIndicator style={{ marginTop: 10 }} color={theme.accent} /> : null}
          <Text style={[styles.printHint, { color: theme.textFaint }]}>
            A PDF with everyone’s chores and a box for each day they’re due.{!isPro ? ' Part of Pro.' : ''}
          </Text>
        </View>
      </ScrollView>

      <MemberSheet
        target={editing}
        usedColors={members.map((m) => m.color)}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          bumpData();
        }}
      />
    </View>
  );
}

function MemberSheet({
  target,
  usedColors,
  onClose,
  onSaved,
}: {
  target: Member | 'new' | null;
  usedColors: string[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const theme = useTheme();
  const [name, setName] = useState('');
  const [color, setColor] = useState(MEMBER_COLORS[0]);
  const isNew = target === 'new';

  useEffect(() => {
    if (target === 'new') {
      setName('');
      setColor(MEMBER_COLORS.find((c) => !usedColors.includes(c)) ?? MEMBER_COLORS[0]);
    } else if (target) {
      setName(target.name);
      setColor(target.color);
    }
  }, [target]);

  const save = async () => {
    const n = name.trim();
    if (!n) return;
    if (target === 'new') await insertMember(n, color);
    else if (target) await updateMember(target.id, n, color);
    onSaved();
  };

  const remove = () => {
    if (!target || target === 'new') return;
    Alert.alert(`Remove ${target.name}?`, 'Their chores become “Anyone” chores. Their past check-offs stay in the history as unclaimed.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await deleteMember(target.id);
          onSaved();
        },
      },
    ]);
  };

  return (
    <Modal visible={target != null} animationType="slide" presentationStyle="formSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: theme.bg }}>
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <Pressable onPress={onClose} hitSlop={10}>
            <Text style={[styles.headerBtn, { color: theme.textSecondary }]}>Cancel</Text>
          </Pressable>
          <Text style={[styles.headerTitle, { color: theme.text }]}>{isNew ? 'Add a person' : 'Edit person'}</Text>
          <Pressable onPress={save} hitSlop={10}>
            <Text style={[styles.headerBtn, { color: theme.accent, fontWeight: fonts.weight.bold }]}>Save</Text>
          </Pressable>
        </View>
        <View style={{ padding: 20 }}>
          <View style={{ alignItems: 'center', marginBottom: 16 }}>
            <MemberDot name={name || '?'} color={color} size={64} />
          </View>
          <TextInput
            style={[styles.nameInput, { color: theme.text, borderBottomColor: theme.border }]}
            value={name}
            onChangeText={setName}
            placeholder="Name"
            placeholderTextColor={theme.textFaint}
            autoFocus={isNew}
            returnKeyType="done"
            onSubmitEditing={save}
          />
          <View style={styles.colorRow}>
            {MEMBER_COLORS.map((c) => (
              <Pressable
                key={c}
                onPress={() => setColor(c)}
                style={[
                  styles.colorDot,
                  { backgroundColor: c, borderColor: color === c ? theme.text : 'transparent' },
                ]}
                accessibilityLabel={`Color ${c}`}
              />
            ))}
          </View>
          <View style={{ gap: 10, marginTop: 24 }}>
            <PillButton theme={theme} label="Save" onPress={save} disabled={!name.trim()} />
            {!isNew ? <PillButton theme={theme} label="Remove person" kind="danger" onPress={remove} /> : null}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 20, paddingTop: 24, paddingBottom: 60 },
  title: { fontSize: 32, fontWeight: fonts.weight.bold, letterSpacing: -0.6 },
  sub: { fontSize: 15, marginTop: 2 },
  pitchTitle: { fontSize: 18, fontWeight: fonts.weight.bold },
  pitchBody: { fontSize: 14, lineHeight: 20, marginTop: 4 },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  memberName: { flex: 1, fontSize: 16, fontWeight: fonts.weight.medium },
  memberPts: { fontSize: 14, fontWeight: fonts.weight.semibold },
  addRow: { paddingVertical: 12 },
  addText: { fontSize: 15, fontWeight: fonts.weight.semibold },
  weekNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 24, marginBottom: 10 },
  navBtn: { paddingHorizontal: 14, paddingVertical: 4 },
  navArrow: { fontSize: 30, fontWeight: fonts.weight.medium },
  weekLabel: { fontSize: 17, fontWeight: fonts.weight.bold },
  weekRange: { fontSize: 12, marginTop: 2 },
  gridRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  nameCol: { width: 92 },
  dayCol: { flex: 1, alignItems: 'center' },
  ptsCol: { width: 34, alignItems: 'flex-end' },
  dayHead: { fontSize: 12, fontWeight: fonts.weight.bold },
  gridName: { fontSize: 13, fontWeight: fonts.weight.medium, flexShrink: 1 },
  cellDone: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cellText: { color: '#FFFFFF', fontSize: 12, fontWeight: fonts.weight.bold },
  cellEmpty: { fontSize: 18 },
  ptsText: { fontSize: 14, fontWeight: fonts.weight.bold },
  logRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth },
  logEmoji: { fontSize: 18 },
  logName: { flex: 1, fontSize: 15 },
  logMeta: { fontSize: 12 },
  claimHint: { fontSize: 12, lineHeight: 17, textAlign: 'center', marginTop: 8, paddingHorizontal: 8 },
  emptyWeek: { textAlign: 'center', marginTop: 18, fontSize: 14 },
  printHint: { fontSize: 12, textAlign: 'center', marginTop: 8, lineHeight: 17 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 17, fontWeight: fonts.weight.semibold },
  headerBtn: { fontSize: 16 },
  nameInput: { fontSize: 20, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 18, justifyContent: 'center' },
  colorDot: { width: 36, height: 36, borderRadius: 18, borderWidth: 3 },
});
