import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme, fonts } from '../theme';
import { Card, CheckCircle, Chip, EmptyState, PillButton, ProgressBar, SectionTitle } from '../components';
import { useApp } from '../state';
import {
  Completion,
  daysBetween,
  dueLabel,
  getCompletionsBetween,
  getMembers,
  getStreak,
  getTasks,
  Member,
  Task,
  todayIso,
  undoCompletion,
} from '../db';
import { checkOff } from '../actions';
import { EditorTarget } from './TaskEditor';

export default function TodayScreen({
  onEdit,
  onPickChores,
}: {
  onEdit: (t: EditorTarget) => void;
  onPickChores: () => void;
}) {
  const theme = useTheme();
  const { dataVersion, bumpData } = useApp();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [doneToday, setDoneToday] = useState<Completion[]>([]);
  const [streak, setStreak] = useState(0);
  const [filter, setFilter] = useState<number | 'all'>('all');
  const [loaded, setLoaded] = useState(false);
  const [showAllUpcoming, setShowAllUpcoming] = useState(false);
  const today = todayIso();

  const load = useCallback(async () => {
    const [ts, ms, cs, st] = await Promise.all([
      getTasks(),
      getMembers(),
      getCompletionsBetween(today, today),
      getStreak(today),
    ]);
    setTasks(ts);
    setMembers(ms);
    setDoneToday(cs);
    setStreak(st);
    setLoaded(true);
  }, [today]);

  useEffect(() => {
    load();
  }, [load, dataVersion]);

  // A filter pointing at a deleted member falls back to everyone.
  useEffect(() => {
    if (filter !== 'all' && !members.some((m) => m.id === filter)) setFilter('all');
  }, [members, filter]);

  const memberById = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);
  const doneTaskIds = useMemo(() => new Set(doneToday.map((c) => c.taskId)), [doneToday]);

  const visible = (t: Task) => filter === 'all' || t.memberId === filter || t.memberId == null;
  const overdue = tasks.filter((t) => t.nextDue < today && visible(t));
  const dueToday = tasks.filter((t) => t.nextDue === today && visible(t));
  const upcomingAll = tasks.filter(
    (t) => t.nextDue > today && daysBetween(today, t.nextDue) <= 7 && !doneTaskIds.has(t.id) && visible(t)
  );
  const upcoming = showAllUpcoming ? upcomingAll : upcomingAll.slice(0, 6);
  const doneRows = doneToday
    .filter((c) => filter === 'all' || c.memberId === filter || c.memberId == null)
    .reduce<Completion[]>((acc, c) => (acc.some((x) => x.taskId === c.taskId) ? acc : [...acc, c]), []);

  const remaining = overdue.length + dueToday.length;
  const total = remaining + doneRows.length;
  const minutesLeft = [...overdue, ...dueToday].reduce((s, t) => s + t.minutes, 0);

  const onCheck = (task: Task) => checkOff(task, members, bumpData);

  const onUndo = async (c: Completion) => {
    const ok = await undoCompletion(c.taskId, today);
    if (ok) {
      Haptics.selectionAsync().catch(() => {});
      bumpData();
    }
  };

  const dateLine = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  const row = (t: Task, late: boolean) => {
    const m = t.memberId != null ? memberById.get(t.memberId) : undefined;
    return (
      <Pressable
        key={t.id}
        onPress={() => onEdit({ taskId: t.id })}
        style={({ pressed }) => [styles.row, { borderBottomColor: theme.border, opacity: pressed ? 0.7 : 1 }]}
      >
        <CheckCircle theme={theme} done={false} color={m?.color} onPress={() => onCheck(t)} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.rowTitle, { color: theme.text }]} numberOfLines={1}>
            {t.name}
          </Text>
          <Text style={[styles.rowMeta, { color: theme.textSecondary }]} numberOfLines={1}>
            {t.roomEmoji} {t.roomName} · {t.minutes} min{m ? ` · ${m.name}` : ''}
            {t.rotate ? ' ↻' : ''}
          </Text>
        </View>
        {t.nextDue !== today ? (
          <Text style={[styles.due, { color: late ? theme.danger : theme.textFaint }]}>{dueLabel(t.nextDue, today)}</Text>
        ) : null}
      </Pressable>
    );
  };

  if (loaded && tasks.length === 0) {
    return (
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[styles.title, { color: theme.text }]}>Today</Text>
        <Text style={[styles.date, { color: theme.textSecondary }]}>{dateLine}</Text>
        <EmptyState
          theme={theme}
          emoji="🧽"
          title="No chores yet"
          body="Pick chores for your rooms, pets, yard or car from a list of the usual ones, or add one of your own. Each shows up here the day it’s due."
        >
          <View style={{ gap: 10, alignSelf: 'stretch', paddingHorizontal: 24 }}>
            <PillButton theme={theme} label="Pick chores" onPress={onPickChores} />
            <PillButton theme={theme} label="Add my own chore" kind="ghost" onPress={() => onEdit({})} />
          </View>
        </EmptyState>
      </ScrollView>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[styles.title, { color: theme.text }]}>Today</Text>
        <Text style={[styles.date, { color: theme.textSecondary }]}>{dateLine}</Text>

        <Card theme={theme} style={{ marginTop: 14 }}>
          {remaining === 0 ? (
            <View style={styles.summaryTop}>
              <Text style={styles.bigEmoji}>✨</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.summaryTitle, { color: theme.text }]}>All caught up</Text>
                <Text style={[styles.summarySub, { color: theme.textSecondary }]}>
                  {doneRows.length > 0
                    ? `${doneRows.length} chore${doneRows.length === 1 ? '' : 's'} done today. Enjoy the clean house.`
                    : 'Nothing due today. Check what’s coming up below.'}
                </Text>
              </View>
            </View>
          ) : (
            <View>
              <View style={styles.summaryTop}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.summaryTitle, { color: theme.text }]}>
                    {doneRows.length} of {total} done
                  </Text>
                  <Text style={[styles.summarySub, { color: theme.textSecondary }]}>
                    About {minutesLeft} min left{overdue.length > 0 ? ` · ${overdue.length} catching up` : ''}
                  </Text>
                </View>
              </View>
              <View style={{ marginTop: 12 }}>
                <ProgressBar theme={theme} value={total === 0 ? 0 : doneRows.length / total} />
              </View>
            </View>
          )}
          {streak > 1 ? (
            <Text style={[styles.streak, { color: theme.warn }]}>🔥 {streak}-day streak</Text>
          ) : null}
        </Card>

        {members.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
            <Chip theme={theme} label="Everyone" active={filter === 'all'} onPress={() => setFilter('all')} />
            {members.map((m) => (
              <Chip
                key={m.id}
                theme={theme}
                label={m.name}
                color={m.color}
                active={filter === m.id}
                onPress={() => setFilter(m.id)}
              />
            ))}
          </ScrollView>
        ) : null}

        {overdue.length > 0 ? (
          <>
            <SectionTitle theme={theme}>Catch up · {overdue.length}</SectionTitle>
            <Card theme={theme} style={styles.listCard}>
              {overdue.map((t) => row(t, true))}
            </Card>
          </>
        ) : null}

        {dueToday.length > 0 ? (
          <>
            <SectionTitle theme={theme}>Due today · {dueToday.length}</SectionTitle>
            <Card theme={theme} style={styles.listCard}>
              {dueToday.map((t) => row(t, false))}
            </Card>
          </>
        ) : null}

        {doneRows.length > 0 ? (
          <>
            <SectionTitle theme={theme}>Done today · {doneRows.length}</SectionTitle>
            <Card theme={theme} style={styles.listCard}>
              {doneRows.map((c) => {
                const m = c.memberId != null ? memberById.get(c.memberId) : undefined;
                return (
                  <View key={c.id} style={[styles.row, { borderBottomColor: theme.border }]}>
                    <CheckCircle theme={theme} done color={m?.color ?? theme.success} onPress={() => onUndo(c)} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.rowTitle, styles.doneTitle, { color: theme.textFaint }]} numberOfLines={1}>
                        {c.taskName}
                      </Text>
                      <Text style={[styles.rowMeta, { color: theme.textFaint }]} numberOfLines={1}>
                        {c.roomEmoji} {m ? `by ${m.name} · ` : ''}+{c.points} pt{c.points === 1 ? '' : 's'} · tap ✓ to undo
                      </Text>
                    </View>
                  </View>
                );
              })}
            </Card>
          </>
        ) : null}

        {upcomingAll.length > 0 ? (
          <>
            <SectionTitle theme={theme}>Coming up</SectionTitle>
            <Card theme={theme} style={styles.listCard}>
              {upcoming.map((t) => row(t, false))}
            </Card>
            {upcomingAll.length > 6 ? (
              // Centered under the list so the + button never covers it.
              <Pressable onPress={() => setShowAllUpcoming((v) => !v)} hitSlop={8} style={styles.moreBtn}>
                <Text style={[styles.more, { color: theme.accent }]}>
                  {showAllUpcoming ? 'Show less' : `Show all ${upcomingAll.length} coming up`}
                </Text>
              </Pressable>
            ) : null}
            <Text style={[styles.footnote, { color: theme.textFaint }]}>
              Done something early? Tick it here and it moves to its next date.
            </Text>
          </>
        ) : null}
      </ScrollView>

      <Pressable
        onPress={() => onEdit({})}
        style={({ pressed }) => [styles.fab, { backgroundColor: theme.accent, opacity: pressed ? 0.85 : 1 }]}
        accessibilityLabel="Add a chore"
      >
        <Text style={[styles.fabText, { color: theme.onAccent }]}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 20, paddingTop: 24, paddingBottom: 110 },
  title: { fontSize: 32, fontWeight: fonts.weight.bold, letterSpacing: -0.6 },
  date: { fontSize: 15, marginTop: 2 },
  summaryTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  bigEmoji: { fontSize: 34 },
  summaryTitle: { fontSize: 20, fontWeight: fonts.weight.bold },
  summarySub: { fontSize: 14, marginTop: 2, lineHeight: 19 },
  streak: { fontSize: 13, fontWeight: fonts.weight.semibold, marginTop: 10 },
  filters: { gap: 8, paddingTop: 14 },
  listCard: { paddingVertical: 4, paddingHorizontal: 14 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowTitle: { fontSize: 16, fontWeight: fonts.weight.medium },
  doneTitle: { textDecorationLine: 'line-through' },
  rowMeta: { fontSize: 13, marginTop: 2 },
  due: { fontSize: 12, fontWeight: fonts.weight.semibold },
  more: { fontSize: 14, fontWeight: fonts.weight.semibold },
  moreBtn: { alignSelf: 'center', marginTop: 12, paddingVertical: 4, paddingHorizontal: 10 },
  footnote: { fontSize: 12, textAlign: 'center', marginTop: 10 },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  fabText: { fontSize: 32, fontWeight: fonts.weight.medium, marginTop: -2 },
});
