import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
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
import { useTheme, fonts } from '../theme';
import { Card, CheckCircle, Chip, EmptyState, PillButton } from '../components';
import { useApp, FREE_ROOM_LIMIT } from '../state';
import {
  daysBetween,
  deleteRoom,
  dueLabel,
  getMembers,
  getRooms,
  getTasks,
  insertTask,
  Member,
  prettyDate,
  Room,
  Task,
  todayIso,
  updateRoom,
} from '../db';
import { PRESET_ROOMS, PresetRoom, ROOM_EMOJIS, freqLabel, presetForRoomName } from '../presets';
import { DraftArea, createAreas, draftFromName, draftFromPreset, pickedCount, pointsFor } from '../areas';
import ChoreChecklist from './ChoreChecklist';
import { checkOff } from '../actions';
import TaskEditor, { EditorTarget } from './TaskEditor';

interface RoomStats {
  room: Room;
  tasks: Task[];
  dueToday: number;
  overdue: number;
  thisWeek: number;
  /** Earliest upcoming due date, if any. */
  nextDue: string | null;
}

/** "2 due today · 1 overdue", in plain words. Red is only for overdue. */
function statusParts(s: { dueToday: number; overdue: number; thisWeek: number; nextDue: string | null }): {
  text: string;
  late: boolean;
} {
  const parts: string[] = [];
  if (s.overdue > 0) parts.push(`${s.overdue} overdue`);
  if (s.dueToday > 0) parts.push(`${s.dueToday} due today`);
  if (parts.length === 0) {
    if (s.thisWeek > 0) parts.push(`${s.thisWeek} due this week`);
    else if (s.nextDue) parts.push(`next due ${prettyDate(s.nextDue)}`);
    else parts.push('nothing scheduled');
  }
  return { text: parts.join(' · '), late: s.overdue > 0 };
}

export default function RoomsScreen({ addSignal = 0, onAddHandled }: { addSignal?: number; onAddHandled?: () => void }) {
  const theme = useTheme();
  const { isPro, showPaywall, dataVersion, bumpData } = useApp();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [openRoomId, setOpenRoomId] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const today = todayIso();

  const load = useCallback(async () => {
    const [rs, ts, ms] = await Promise.all([getRooms(), getTasks(), getMembers()]);
    setRooms(rs);
    setTasks(ts);
    setMembers(ms);
  }, []);

  useEffect(() => {
    load();
  }, [load, dataVersion]);

  // "Pick chores" on an empty Today tab lands here with the add sheet open.
  useEffect(() => {
    if (addSignal > 0) {
      startAdd();
      onAddHandled?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addSignal]);

  const stats: RoomStats[] = useMemo(
    () =>
      rooms.map((room) => {
        const ts = tasks.filter((t) => t.roomId === room.id);
        const overdue = ts.filter((t) => t.nextDue < today).length;
        const dueToday = ts.filter((t) => t.nextDue === today).length;
        const thisWeek = ts.filter((t) => t.nextDue > today && daysBetween(today, t.nextDue) <= 7).length;
        const upcoming = ts.map((t) => t.nextDue).filter((d) => d > today).sort();
        return { room, tasks: ts, dueToday, overdue, thisWeek, nextDue: upcoming[0] ?? null };
      }),
    [rooms, tasks, today]
  );

  const open = stats.find((s) => s.room.id === openRoomId) ?? null;

  const startAdd = () => {
    if (!isPro && rooms.length >= FREE_ROOM_LIMIT) {
      showPaywall();
      return;
    }
    setAdding(true);
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[styles.title, { color: theme.text }]}>Areas</Text>
        <Text style={[styles.sub, { color: theme.textSecondary }]}>Rooms, pets, the yard and the car.</Text>

        {rooms.length === 0 ? (
          <EmptyState
            theme={theme}
            emoji="🏠"
            title="Add your first area"
            body="Pick a room, a pet, the yard or the car, then tick the chores you actually do."
          >
            <PillButton theme={theme} label="Add an area" onPress={startAdd} />
          </EmptyState>
        ) : (
          <>
            <View style={{ marginTop: 14, gap: 10 }}>
              {stats.map((s) => {
                const st = statusParts(s);
                return (
                  <Pressable
                    key={s.room.id}
                    onPress={() => setOpenRoomId(s.room.id)}
                    style={({ pressed }) => [
                      styles.roomCard,
                      { backgroundColor: theme.card, borderColor: theme.border, opacity: pressed ? 0.8 : 1 },
                    ]}
                  >
                    <Text style={styles.roomEmoji}>{s.room.emoji}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.roomName, { color: theme.text }]} numberOfLines={1}>
                        {s.room.name}
                      </Text>
                      <Text style={[styles.roomMeta, { color: theme.textSecondary }]} numberOfLines={1}>
                        {s.tasks.length === 0
                          ? 'No chores yet'
                          : `${s.tasks.length} chore${s.tasks.length === 1 ? '' : 's'} · `}
                        {s.tasks.length > 0 ? (
                          <Text style={{ color: st.late ? theme.danger : s.dueToday > 0 ? theme.accent : theme.textFaint }}>
                            {st.text}
                          </Text>
                        ) : null}
                      </Text>
                    </View>
                    <Text style={[styles.chevron, { color: theme.textFaint }]}>›</Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={{ marginTop: 18 }}>
              <PillButton theme={theme} label="+ Add an area" kind="ghost" onPress={startAdd} />
              {!isPro ? (
                <Text style={[styles.limit, { color: theme.textFaint }]}>
                  Free includes {FREE_ROOM_LIMIT} areas. Pro covers the whole house, pets, yard and car.
                </Text>
              ) : null}
            </View>
          </>
        )}
      </ScrollView>

      <RoomDetail
        stats={open}
        members={members}
        onClose={() => setOpenRoomId(null)}
        onChanged={bumpData}
      />
      <AddRoomSheet
        visible={adding}
        existing={rooms}
        onClose={() => setAdding(false)}
        onAdded={() => {
          setAdding(false);
          bumpData();
        }}
      />
    </View>
  );
}

function RoomDetail({
  stats,
  members,
  onClose,
  onChanged,
}: {
  stats: RoomStats | null;
  members: Member[];
  onClose: () => void;
  onChanged: () => void;
}) {
  const theme = useTheme();
  // The chore editor opens inside this sheet (iOS presents one modal from another only when nested).
  const [editor, setEditor] = useState<EditorTarget | null>(null);
  const onEdit = (t: EditorTarget) => setEditor(t);
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('🏠');
  const today = todayIso();
  const memberById = new Map(members.map((m) => [m.id, m]));

  useEffect(() => {
    if (stats) {
      setName(stats.room.name);
      setEmoji(stats.room.emoji);
    }
    setRenaming(false);
  }, [stats?.room.id]);

  if (!stats) return <Modal visible={false} />;

  const sorted = [...stats.tasks].sort((a, b) => a.nextDue.localeCompare(b.nextDue) || a.name.localeCompare(b.name));
  const st = statusParts(stats);
  const have = new Set(stats.tasks.map((t) => t.name.toLowerCase()));
  const suggestions = (presetForRoomName(stats.room.name)?.tasks ?? []).filter((p) => !have.has(p.name.toLowerCase()));

  const saveRename = async () => {
    if (!name.trim()) return;
    await updateRoom(stats.room.id, name, emoji);
    setRenaming(false);
    onChanged();
  };

  const remove = () => {
    Alert.alert(`Delete ${stats.room.name}?`, 'Its chores and their history are deleted too.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete area',
        style: 'destructive',
        onPress: async () => {
          await deleteRoom(stats.room.id);
          onClose();
          onChanged();
        },
      },
    ]);
  };

  const addSuggestion = async (p: { name: string; freq: number; minutes: number }) => {
    await insertTask({
      roomId: stats.room.id,
      name: p.name,
      freqDays: p.freq,
      minutes: p.minutes,
      points: pointsFor(p.minutes),
      memberId: null,
      rotate: false,
      notes: '',
      nextDue: today,
    });
    onChanged();
  };

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: theme.bg }}>
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <Pressable onPress={onClose} hitSlop={10}>
            <Text style={[styles.headerBtn, { color: theme.accent }]}>Close</Text>
          </Pressable>
          <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1}>
            {stats.room.emoji} {stats.room.name}
          </Text>
          <Pressable onPress={() => setRenaming((v) => !v)} hitSlop={10}>
            <Text style={[styles.headerBtn, { color: theme.accent }]}>{renaming ? 'Close' : 'Edit'}</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.detailScroll} keyboardShouldPersistTaps="handled">
          {renaming ? (
            <Card theme={theme} style={{ marginBottom: 14 }}>
              <TextInput
                style={[styles.renameInput, { color: theme.text, borderBottomColor: theme.border }]}
                value={name}
                onChangeText={setName}
                placeholder="Area name"
                placeholderTextColor={theme.textFaint}
              />
              <View style={styles.emojiGrid}>
                {ROOM_EMOJIS.map((e) => (
                  <Pressable
                    key={e}
                    onPress={() => setEmoji(e)}
                    style={[styles.emojiCell, { backgroundColor: emoji === e ? theme.accentSoft : 'transparent' }]}
                  >
                    <Text style={styles.emojiText}>{e}</Text>
                  </Pressable>
                ))}
              </View>
              <View style={{ gap: 10, marginTop: 12 }}>
                <PillButton theme={theme} label="Save" onPress={saveRename} />
                <PillButton theme={theme} label="Delete area" kind="danger" onPress={remove} />
              </View>
            </Card>
          ) : null}

          <Text style={[styles.detailSummary, { color: theme.textSecondary }]}>
            {stats.tasks.length === 0 ? (
              'No chores here yet. Add one below.'
            ) : (
              <>
                {stats.tasks.length} chore{stats.tasks.length === 1 ? '' : 's'} ·{' '}
                <Text style={{ color: st.late ? theme.danger : stats.dueToday > 0 ? theme.accent : theme.textFaint }}>
                  {st.text}
                </Text>
              </>
            )}
          </Text>

          <View style={{ marginTop: 16, gap: 8 }}>
            {sorted.map((t) => {
              const m = t.memberId != null ? memberById.get(t.memberId) : undefined;
              const late = t.nextDue < today;
              return (
                <Pressable
                  key={t.id}
                  onPress={() => onEdit({ taskId: t.id })}
                  style={({ pressed }) => [
                    styles.taskCard,
                    { backgroundColor: theme.card, borderColor: theme.border, opacity: pressed ? 0.8 : 1 },
                  ]}
                >
                  <CheckCircle theme={theme} done={false} color={m?.color} onPress={() => checkOff(t, members, onChanged)} />
                  <View style={{ flex: 1 }}>
                    <View style={styles.taskTop}>
                      <Text style={[styles.taskName, { color: theme.text }]} numberOfLines={1}>
                        {t.name}
                      </Text>
                      <Text style={[styles.taskDue, { color: late ? theme.danger : t.nextDue === today ? theme.accent : theme.textFaint }]}>
                        {dueLabel(t.nextDue, today)}
                      </Text>
                    </View>
                    <Text style={[styles.taskMeta, { color: theme.textSecondary }]} numberOfLines={1}>
                      {freqLabel(t.freqDays)} · {t.minutes} min{m ? ` · ${m.name}` : ''}
                      {t.rotate ? ' ↻' : ''}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>

          <View style={{ marginTop: 16 }}>
            <PillButton theme={theme} label="+ Add a chore" kind="ghost" onPress={() => onEdit({ roomId: stats.room.id })} />
          </View>

          {suggestions.length > 0 ? (
            <>
              <Text style={[styles.suggestTitle, { color: theme.textSecondary }]}>More you could add</Text>
              <View style={styles.wrapRow}>
                {suggestions.map((p) => (
                  <Chip key={p.name} theme={theme} label={`+ ${p.name}`} active={false} onPress={() => addSuggestion(p)} />
                ))}
              </View>
            </>
          ) : null}
        </ScrollView>
        <TaskEditor target={editor} onClose={() => setEditor(null)} />
      </View>
    </Modal>
  );
}

function AddRoomSheet({
  visible,
  existing,
  onClose,
  onAdded,
}: {
  visible: boolean;
  existing: Room[];
  onClose: () => void;
  onAdded: () => void;
}) {
  const theme = useTheme();
  const [custom, setCustom] = useState('');
  const [emoji, setEmoji] = useState('🧹');
  const [draft, setDraft] = useState<DraftArea | null>(null);
  const [saving, setSaving] = useState(false);
  const today = todayIso();

  useEffect(() => {
    if (visible) {
      setCustom('');
      setEmoji('🧹');
      setDraft(null);
    }
  }, [visible]);

  const taken = new Set(existing.map((r) => r.name.toLowerCase()));
  const presets = PRESET_ROOMS.filter((p) => !taken.has(p.name.toLowerCase()));

  const pickPreset = (p: PresetRoom) => setDraft(draftFromPreset(p, existing.length));
  const pickCustom = () => {
    const n = custom.trim();
    if (!n) return;
    setDraft(draftFromName(n, emoji));
  };

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      await createAreas([draft], today);
      onAdded();
    } catch (e: any) {
      Alert.alert('Couldn’t add that area', e?.message ?? 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const count = draft ? pickedCount([draft]) : 0;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: theme.bg }}>
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <Pressable onPress={draft ? () => setDraft(null) : onClose} hitSlop={10}>
            <Text style={[styles.headerBtn, { color: theme.textSecondary }]}>{draft ? '‹ Back' : 'Cancel'}</Text>
          </Pressable>
          <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1}>
            {draft ? `${draft.emoji} ${draft.name}` : 'Add an area'}
          </Text>
          <View style={{ width: 56 }} />
        </View>

        {draft ? (
          <>
            <ScrollView contentContainerStyle={styles.detailScroll} keyboardShouldPersistTaps="handled">
              <Text style={[styles.pickIntro, { color: theme.textSecondary }]}>
                {draft.chores.length > 0
                  ? 'Tick the chores you do. We ticked the everyday ones. First dates are spread out so they don’t all land today.'
                  : 'Add the chores you do here. You can always add more later.'}
              </Text>
              <View style={{ marginTop: 14 }}>
                <ChoreChecklist
                  areas={[draft]}
                  onChange={(next) => setDraft(next[0] ?? null)}
                  today={today}
                  showAreaHeaders={false}
                />
              </View>
            </ScrollView>
            <View style={[styles.sheetFooter, { borderTopColor: theme.border, backgroundColor: theme.bg }]}>
              <PillButton
                theme={theme}
                label={
                  saving
                    ? 'Adding…'
                    : count > 0
                      ? `Add ${draft.name} with ${count} chore${count === 1 ? '' : 's'}`
                      : `Add ${draft.name} with no chores yet`
                }
                onPress={save}
                disabled={saving}
              />
            </View>
          </>
        ) : (
          <ScrollView contentContainerStyle={styles.detailScroll} keyboardShouldPersistTaps="handled">
            <View style={{ gap: 8 }}>
              {presets.map((p) => (
                <Pressable
                  key={p.key}
                  onPress={() => pickPreset(p)}
                  style={({ pressed }) => [
                    styles.presetRow,
                    { backgroundColor: theme.card, borderColor: theme.border, opacity: pressed ? 0.8 : 1 },
                  ]}
                >
                  <Text style={styles.roomEmoji}>{p.emoji}</Text>
                  <Text style={[styles.roomName, { color: theme.text, flex: 1 }]}>{p.name}</Text>
                  <Text style={[styles.chevron, { color: theme.textFaint }]}>›</Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.suggestTitle, { color: theme.textSecondary }]}>Or make your own</Text>
            <Card theme={theme}>
              <TextInput
                style={[styles.renameInput, { color: theme.text, borderBottomColor: theme.border }]}
                value={custom}
                onChangeText={setCustom}
                placeholder="Guest room, Pool, Chickens…"
                placeholderTextColor={theme.textFaint}
                returnKeyType="next"
                onSubmitEditing={pickCustom}
              />
              <View style={styles.emojiGrid}>
                {ROOM_EMOJIS.map((e) => (
                  <Pressable
                    key={e}
                    onPress={() => setEmoji(e)}
                    style={[styles.emojiCell, { backgroundColor: emoji === e ? theme.accentSoft : 'transparent' }]}
                  >
                    <Text style={styles.emojiText}>{e}</Text>
                  </Pressable>
                ))}
              </View>
              <View style={{ marginTop: 12 }}>
                <PillButton theme={theme} label="Next: pick the chores" onPress={pickCustom} disabled={!custom.trim()} />
              </View>
            </Card>
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 20, paddingTop: 24, paddingBottom: 60 },
  title: { fontSize: 32, fontWeight: fonts.weight.bold, letterSpacing: -0.6 },
  sub: { fontSize: 15, marginTop: 2 },
  roomCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    padding: 14,
  },
  roomEmoji: { fontSize: 30 },
  roomName: { fontSize: 17, fontWeight: fonts.weight.semibold, flexShrink: 1 },
  roomMeta: { fontSize: 13, marginTop: 2 },
  limit: { fontSize: 12, textAlign: 'center', marginTop: 8 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 17, fontWeight: fonts.weight.semibold, flexShrink: 1, textAlign: 'center' },
  headerBtn: { fontSize: 16, fontWeight: fonts.weight.semibold },
  detailScroll: { padding: 20, paddingBottom: 60 },
  detailSummary: { fontSize: 15, marginBottom: 4 },
  pickIntro: { fontSize: 15, lineHeight: 21 },
  sheetFooter: { borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 30 },
  chevron: { fontSize: 24, fontWeight: fonts.weight.medium },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    padding: 12,
  },
  taskTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  taskName: { fontSize: 16, fontWeight: fonts.weight.medium, flexShrink: 1 },
  taskDue: { fontSize: 12, fontWeight: fonts.weight.semibold },
  taskMeta: { fontSize: 13, marginTop: 2 },
  suggestTitle: { fontSize: 13, fontWeight: fonts.weight.semibold, marginTop: 22, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.8 },
  wrapRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  renameInput: { fontSize: 18, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 12 },
  emojiCell: { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  emojiText: { fontSize: 24 },
  presetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    padding: 12,
  },
});
