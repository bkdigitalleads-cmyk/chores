import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useTheme, fonts } from '../theme';
import { Card, CheckCircle, Chip, EmptyState, FreshnessBar, PillButton, ProgressBar } from '../components';
import { useApp, FREE_ROOM_LIMIT } from '../state';
import {
  deleteRoom,
  dueLabel,
  freshness,
  getMembers,
  getRooms,
  getTasks,
  insertRoom,
  insertTask,
  Member,
  Room,
  shiftDate,
  Task,
  todayIso,
  updateRoom,
} from '../db';
import { PRESET_ROOMS, PresetRoom, ROOM_EMOJIS, freqLabel, presetForRoomName } from '../presets';
import { checkOff } from '../actions';
import TaskEditor, { EditorTarget } from './TaskEditor';

interface RoomStats {
  room: Room;
  tasks: Task[];
  fresh: number;
  due: number;
}

export default function RoomsScreen() {
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

  const stats: RoomStats[] = useMemo(
    () =>
      rooms.map((room) => {
        const ts = tasks.filter((t) => t.roomId === room.id);
        const fresh = ts.length ? ts.reduce((s, t) => s + freshness(t, today), 0) / ts.length : 1;
        const due = ts.filter((t) => t.nextDue <= today).length;
        return { room, tasks: ts, fresh, due };
      }),
    [rooms, tasks, today]
  );

  const homeFresh = tasks.length ? tasks.reduce((s, t) => s + freshness(t, today), 0) / tasks.length : 1;
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
        <Text style={[styles.title, { color: theme.text }]}>Rooms</Text>
        <Text style={[styles.sub, { color: theme.textSecondary }]}>How fresh each part of your home is right now.</Text>

        {rooms.length === 0 ? (
          <EmptyState
            theme={theme}
            emoji="🏠"
            title="Start with a room"
            body="Pick a room and it comes with its usual chores and sensible schedules. Change anything later."
          >
            <PillButton theme={theme} label="Add a room" onPress={startAdd} />
          </EmptyState>
        ) : (
          <>
            <Card theme={theme} style={{ marginTop: 14 }}>
              <View style={styles.homeRow}>
                <Text style={[styles.homeLabel, { color: theme.text }]}>Whole home</Text>
                <Text style={[styles.homePct, { color: theme.accent }]}>{Math.round(homeFresh * 100)}% fresh</Text>
              </View>
              <View style={{ marginTop: 10 }}>
                <ProgressBar theme={theme} value={homeFresh} />
              </View>
            </Card>

            <View style={{ marginTop: 14, gap: 10 }}>
              {stats.map((s) => (
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
                    <View style={styles.roomTop}>
                      <Text style={[styles.roomName, { color: theme.text }]} numberOfLines={1}>
                        {s.room.name}
                      </Text>
                      <Text style={[styles.roomPct, { color: theme.textSecondary }]}>{Math.round(s.fresh * 100)}%</Text>
                    </View>
                    <Text style={[styles.roomMeta, { color: s.due > 0 ? theme.danger : theme.textFaint }]}>
                      {s.tasks.length} chore{s.tasks.length === 1 ? '' : 's'}
                      {s.due > 0 ? ` · ${s.due} due` : ' · all fresh'}
                    </Text>
                    <View style={{ marginTop: 8 }}>
                      <FreshnessBar theme={theme} value={s.fresh} height={6} />
                    </View>
                  </View>
                </Pressable>
              ))}
            </View>

            <View style={{ marginTop: 18 }}>
              <PillButton theme={theme} label="+ Add a room" kind="ghost" onPress={startAdd} />
              {!isPro ? (
                <Text style={[styles.limit, { color: theme.textFaint }]}>
                  Free includes {FREE_ROOM_LIMIT} rooms. Pro covers every room in the house.
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

  const sorted = [...stats.tasks].sort((a, b) => freshness(a, today) - freshness(b, today) || a.nextDue.localeCompare(b.nextDue));
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
        text: 'Delete room',
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
      points: p.minutes >= 30 ? 3 : p.minutes >= 15 ? 2 : 1,
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
            <Text style={[styles.headerBtn, { color: theme.accent }]}>Done</Text>
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
                placeholder="Room name"
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
                <PillButton theme={theme} label="Delete room" kind="danger" onPress={remove} />
              </View>
            </Card>
          ) : null}

          <View style={styles.freshRow}>
            <Text style={[styles.freshPct, { color: theme.text }]}>{Math.round(stats.fresh * 100)}%</Text>
            <Text style={[styles.freshLabel, { color: theme.textSecondary }]}>fresh · {stats.tasks.length} chores</Text>
          </View>
          <FreshnessBar theme={theme} value={stats.fresh} height={8} />

          <View style={{ marginTop: 16, gap: 8 }}>
            {sorted.map((t) => {
              const f = freshness(t, today);
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
                      <Text style={[styles.taskDue, { color: late || t.nextDue === today ? theme.danger : theme.textFaint }]}>
                        {dueLabel(t.nextDue, today)}
                      </Text>
                    </View>
                    <Text style={[styles.taskMeta, { color: theme.textSecondary }]} numberOfLines={1}>
                      {freqLabel(t.freqDays)} · {t.minutes} min{m ? ` · ${m.name}` : ''}
                      {t.rotate ? ' ↻' : ''}
                    </Text>
                    <View style={{ marginTop: 8 }}>
                      <FreshnessBar theme={theme} value={f} />
                    </View>
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
              <Text style={[styles.suggestTitle, { color: theme.textSecondary }]}>Usual chores for this room</Text>
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
  const [withChores, setWithChores] = useState(true);
  const today = todayIso();

  useEffect(() => {
    if (visible) {
      setCustom('');
      setEmoji('🧹');
      setWithChores(true);
    }
  }, [visible]);

  const taken = new Set(existing.map((r) => r.name.toLowerCase()));
  const presets = PRESET_ROOMS.filter((p) => !taken.has(p.name.toLowerCase()));

  const addPreset = async (p: PresetRoom) => {
    const roomId = await insertRoom(p.name, p.emoji);
    if (withChores) {
      for (let i = 0; i < p.tasks.length; i++) {
        const t = p.tasks[i];
        const span = t.freq <= 7 ? t.freq : Math.min(t.freq, 28);
        const offset = span <= 1 ? 0 : (i * 3) % span;
        await insertTask({
          roomId,
          name: t.name,
          freqDays: t.freq,
          minutes: t.minutes,
          points: t.minutes >= 30 ? 3 : t.minutes >= 15 ? 2 : 1,
          memberId: null,
          rotate: false,
          notes: '',
          nextDue: shiftDate(today, offset),
        });
      }
    }
    onAdded();
  };

  const addCustom = async () => {
    const n = custom.trim();
    if (!n) return;
    await insertRoom(n, emoji);
    onAdded();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: theme.bg }}>
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <Pressable onPress={onClose} hitSlop={10}>
            <Text style={[styles.headerBtn, { color: theme.textSecondary }]}>Cancel</Text>
          </Pressable>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Add a room</Text>
          <View style={{ width: 50 }} />
        </View>
        <ScrollView contentContainerStyle={styles.detailScroll} keyboardShouldPersistTaps="handled">
          <View style={[styles.switchRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.switchText, { color: theme.text }]}>Include its usual chores</Text>
            <Switch value={withChores} onValueChange={setWithChores} trackColor={{ true: theme.accent }} />
          </View>

          <View style={{ gap: 8, marginTop: 14 }}>
            {presets.map((p) => (
              <Pressable
                key={p.key}
                onPress={() => addPreset(p)}
                style={({ pressed }) => [
                  styles.presetRow,
                  { backgroundColor: theme.card, borderColor: theme.border, opacity: pressed ? 0.8 : 1 },
                ]}
              >
                <Text style={styles.roomEmoji}>{p.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.roomName, { color: theme.text }]}>{p.name}</Text>
                  <Text style={[styles.taskMeta, { color: theme.textFaint }]} numberOfLines={1}>
                    {withChores ? p.tasks.map((t) => t.name).join(', ') : 'Empty room'}
                  </Text>
                </View>
                <Text style={[styles.plus, { color: theme.accent }]}>+</Text>
              </Pressable>
            ))}
          </View>

          <Text style={[styles.suggestTitle, { color: theme.textSecondary }]}>Or make your own</Text>
          <Card theme={theme}>
            <TextInput
              style={[styles.renameInput, { color: theme.text, borderBottomColor: theme.border }]}
              value={custom}
              onChangeText={setCustom}
              placeholder="Garage, Basement, Guest room…"
              placeholderTextColor={theme.textFaint}
              returnKeyType="done"
              onSubmitEditing={addCustom}
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
              <PillButton theme={theme} label="Add room" onPress={addCustom} disabled={!custom.trim()} />
            </View>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 20, paddingTop: 24, paddingBottom: 60 },
  title: { fontSize: 32, fontWeight: fonts.weight.bold, letterSpacing: -0.6 },
  sub: { fontSize: 15, marginTop: 2 },
  homeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  homeLabel: { fontSize: 17, fontWeight: fonts.weight.semibold },
  homePct: { fontSize: 17, fontWeight: fonts.weight.bold },
  roomCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    padding: 14,
  },
  roomEmoji: { fontSize: 30 },
  roomTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  roomName: { fontSize: 17, fontWeight: fonts.weight.semibold, flexShrink: 1 },
  roomPct: { fontSize: 14, fontWeight: fonts.weight.semibold },
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
  freshRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 8 },
  freshPct: { fontSize: 34, fontWeight: fonts.weight.bold },
  freshLabel: { fontSize: 15 },
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
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    padding: 14,
  },
  switchText: { fontSize: 16, fontWeight: fonts.weight.medium },
  presetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    padding: 12,
  },
  plus: { fontSize: 26, fontWeight: fonts.weight.medium },
});
