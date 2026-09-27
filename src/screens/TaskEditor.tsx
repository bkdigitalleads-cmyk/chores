import React, { useEffect, useState } from 'react';
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
import { Chip, PillButton, ProBadge } from '../components';
import { useApp } from '../state';
import {
  deleteTask,
  dueLabel,
  getMembers,
  getRooms,
  getTask,
  getTasks,
  insertTask,
  Member,
  prettyDate,
  Room,
  shiftDate,
  Task,
  todayIso,
  updateTask,
} from '../db';
import { FREQ_OPTIONS, freqLabel, presetForRoomName } from '../presets';

export interface EditorTarget {
  /** Edit an existing chore. */
  taskId?: number;
  /** New chore: start in this room. */
  roomId?: number;
  /** New chore: prefilled name (from a suggestion). */
  name?: string;
  freq?: number;
  minutes?: number;
}

const MINUTE_OPTIONS = [2, 5, 10, 15, 30, 45, 60];
const POINT_OPTIONS = [1, 2, 3, 5];

export default function TaskEditor({ target, onClose }: { target: EditorTarget | null; onClose: () => void }) {
  const theme = useTheme();
  const { isPro, showPaywall, bumpData } = useApp();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [name, setName] = useState('');
  const [roomId, setRoomId] = useState<number | null>(null);
  const [freq, setFreq] = useState(7);
  const [customFreq, setCustomFreq] = useState(false);
  const [minutes, setMinutes] = useState(10);
  const [points, setPoints] = useState(1);
  const [memberId, setMemberId] = useState<number | null>(null);
  const [rotate, setRotate] = useState(false);
  const [notes, setNotes] = useState('');
  const [nextDue, setNextDue] = useState(todayIso());
  const [saving, setSaving] = useState(false);
  const [existing, setExisting] = useState<Task[]>([]);

  const isEdit = target?.taskId != null;
  const today = todayIso();

  useEffect(() => {
    if (!target) return;
    (async () => {
      const [rs, ms, ts] = await Promise.all([getRooms(), getMembers(), getTasks()]);
      setRooms(rs);
      setMembers(ms);
      setExisting(ts);
      if (target.taskId != null) {
        const t = await getTask(target.taskId);
        if (!t) return;
        setName(t.name);
        setRoomId(t.roomId);
        setFreq(t.freqDays);
        setCustomFreq(!FREQ_OPTIONS.some((o) => o.days === t.freqDays));
        setMinutes(t.minutes);
        setPoints(t.points);
        setMemberId(t.memberId);
        setRotate(t.rotate);
        setNotes(t.notes);
        setNextDue(t.nextDue);
      } else {
        setName(target.name ?? '');
        setRoomId(target.roomId ?? rs[0]?.id ?? null);
        setFreq(target.freq ?? 7);
        setCustomFreq(false);
        setMinutes(target.minutes ?? 10);
        setPoints(1);
        setMemberId(null);
        setRotate(false);
        setNotes('');
        setNextDue(todayIso());
      }
    })();
  }, [target]);

  const room = rooms.find((r) => r.id === roomId);
  const suggestions =
    !isEdit && room
      ? (presetForRoomName(room.name)?.tasks ?? [])
          .filter((p) => !existing.some((e) => e.roomId === room.id && e.name.toLowerCase() === p.name.toLowerCase()))
          .slice(0, 6)
      : [];

  const save = async () => {
    const n = name.trim();
    if (!n) {
      Alert.alert('Name the chore', 'For example: Wipe counters.');
      return;
    }
    if (roomId == null) {
      Alert.alert('Pick a room', 'Every chore lives in a room.');
      return;
    }
    setSaving(true);
    const input = {
      roomId,
      name: n,
      freqDays: freq,
      minutes,
      points,
      memberId,
      rotate: rotate && memberId != null && members.length > 1 && freq > 0,
      notes: notes.trim(),
      nextDue,
    };
    try {
      if (isEdit && target?.taskId != null) await updateTask(target.taskId, input);
      else await insertTask(input);
      bumpData();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const remove = () => {
    if (!target?.taskId) return;
    Alert.alert('Delete this chore?', 'Its history goes with it.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteTask(target.taskId!);
          bumpData();
          onClose();
        },
      },
    ]);
  };

  const pickMember = (id: number | null) => {
    if (id != null && !isPro) {
      // Close this sheet first: the paywall is presented from the app root.
      onClose();
      setTimeout(showPaywall, 450);
      return;
    }
    setMemberId(id);
    if (id == null) setRotate(false);
  };

  return (
    <Modal visible={target != null} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, backgroundColor: theme.bg }}
      >
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <Pressable onPress={onClose} hitSlop={10}>
            <Text style={[styles.headerBtn, { color: theme.textSecondary }]}>Cancel</Text>
          </Pressable>
          <Text style={[styles.headerTitle, { color: theme.text }]}>{isEdit ? 'Edit chore' : 'New chore'}</Text>
          <Pressable onPress={save} hitSlop={10} disabled={saving}>
            <Text style={[styles.headerBtn, { color: theme.accent, fontWeight: fonts.weight.bold }]}>Save</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <TextInput
            style={[styles.nameInput, { color: theme.text, borderBottomColor: theme.border }]}
            value={name}
            onChangeText={setName}
            placeholder="Chore name"
            placeholderTextColor={theme.textFaint}
            autoFocus={!isEdit && !target?.name}
            returnKeyType="done"
          />

          {suggestions.length > 0 && !name.trim() ? (
            <View style={styles.wrapRow}>
              {suggestions.map((s) => (
                <Chip
                  key={s.name}
                  theme={theme}
                  label={`+ ${s.name}`}
                  active={false}
                  onPress={() => {
                    setName(s.name);
                    setFreq(s.freq);
                    setMinutes(s.minutes);
                    setCustomFreq(!FREQ_OPTIONS.some((o) => o.days === s.freq));
                  }}
                />
              ))}
            </View>
          ) : null}

          <Text style={[styles.label, { color: theme.textSecondary }]}>Room</Text>
          <View style={styles.wrapRow}>
            {rooms.map((r) => (
              <Chip
                key={r.id}
                theme={theme}
                label={`${r.emoji} ${r.name}`}
                active={roomId === r.id}
                onPress={() => setRoomId(r.id)}
              />
            ))}
          </View>

          <Text style={[styles.label, { color: theme.textSecondary }]}>How often</Text>
          <View style={styles.wrapRow}>
            {FREQ_OPTIONS.map((o) => (
              <Chip
                key={o.days}
                theme={theme}
                label={o.label}
                active={!customFreq && freq === o.days}
                onPress={() => {
                  setCustomFreq(false);
                  setFreq(o.days);
                }}
              />
            ))}
            <Chip theme={theme} label="Custom" active={customFreq} onPress={() => setCustomFreq(true)} />
          </View>
          {customFreq ? (
            <View style={styles.stepper}>
              <Pressable
                onPress={() => setFreq((f) => Math.max(1, f - 1))}
                style={[styles.stepBtn, { borderColor: theme.border, backgroundColor: theme.card }]}
              >
                <Text style={[styles.stepBtnText, { color: theme.text }]}>−</Text>
              </Pressable>
              <Text style={[styles.stepValue, { color: theme.text }]}>{freqLabel(freq)}</Text>
              <Pressable
                onPress={() => setFreq((f) => Math.min(730, f + 1))}
                style={[styles.stepBtn, { borderColor: theme.border, backgroundColor: theme.card }]}
              >
                <Text style={[styles.stepBtnText, { color: theme.text }]}>+</Text>
              </Pressable>
            </View>
          ) : null}

          <Text style={[styles.label, { color: theme.textSecondary }]}>Next due</Text>
          <View style={styles.stepper}>
            <Pressable
              onPress={() => setNextDue((d) => (d > today ? shiftDate(d, -1) : d))}
              style={[styles.stepBtn, { borderColor: theme.border, backgroundColor: theme.card }]}
            >
              <Text style={[styles.stepBtnText, { color: theme.text }]}>−</Text>
            </Pressable>
            <View style={{ alignItems: 'center', minWidth: 150 }}>
              <Text style={[styles.stepValue, { color: theme.text }]}>{dueLabel(nextDue, today)}</Text>
              <Text style={[styles.stepSub, { color: theme.textFaint }]}>{prettyDate(nextDue, true)}</Text>
            </View>
            <Pressable
              onPress={() => setNextDue((d) => shiftDate(d < today ? today : d, 1))}
              style={[styles.stepBtn, { borderColor: theme.border, backgroundColor: theme.card }]}
            >
              <Text style={[styles.stepBtnText, { color: theme.text }]}>+</Text>
            </Pressable>
          </View>

          <View style={styles.labelRow}>
            <Text style={[styles.label, { color: theme.textSecondary, marginTop: 0 }]}>Who does it</Text>
            {!isPro ? <ProBadge theme={theme} /> : null}
          </View>
          {members.length === 0 ? (
            <Text style={[styles.hint, { color: theme.textFaint }]}>
              Add your household on the Chart tab to assign and rotate chores.
            </Text>
          ) : (
            <View style={styles.wrapRow}>
              <Chip theme={theme} label="Anyone" active={memberId == null} onPress={() => pickMember(null)} />
              {members.map((m) => (
                <Chip
                  key={m.id}
                  theme={theme}
                  label={m.name}
                  color={m.color}
                  active={memberId === m.id}
                  onPress={() => pickMember(m.id)}
                />
              ))}
            </View>
          )}
          {members.length > 1 && memberId != null && freq > 0 ? (
            <View style={[styles.switchRow, { borderColor: theme.border, backgroundColor: theme.card }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.switchTitle, { color: theme.text }]}>Take turns</Text>
                <Text style={[styles.hint, { color: theme.textFaint, marginTop: 2 }]}>
                  After it’s done, the chore passes to the next person.
                </Text>
              </View>
              <Switch value={rotate} onValueChange={setRotate} trackColor={{ true: theme.accent }} />
            </View>
          ) : null}

          <Text style={[styles.label, { color: theme.textSecondary }]}>Takes about</Text>
          <View style={styles.wrapRow}>
            {MINUTE_OPTIONS.map((m) => (
              <Chip key={m} theme={theme} label={`${m} min`} active={minutes === m} onPress={() => setMinutes(m)} />
            ))}
          </View>

          <Text style={[styles.label, { color: theme.textSecondary }]}>Points</Text>
          <View style={styles.wrapRow}>
            {POINT_OPTIONS.map((p) => (
              <Chip key={p} theme={theme} label={`${p} pt${p === 1 ? '' : 's'}`} active={points === p} onPress={() => setPoints(p)} />
            ))}
          </View>

          <Text style={[styles.label, { color: theme.textSecondary }]}>Notes</Text>
          <TextInput
            style={[styles.notes, { color: theme.text, backgroundColor: theme.card, borderColor: theme.border }]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Supplies, how-to, anything to remember"
            placeholderTextColor={theme.textFaint}
            multiline
          />

          <View style={{ marginTop: 24, gap: 10 }}>
            <PillButton theme={theme} label={saving ? 'Saving…' : 'Save chore'} onPress={save} disabled={saving} />
            {isEdit ? <PillButton theme={theme} label="Delete chore" kind="danger" onPress={remove} /> : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
  scroll: { padding: 20, paddingBottom: 60 },
  nameInput: {
    fontSize: 22,
    fontWeight: fonts.weight.semibold,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  wrapRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  label: { fontSize: 13, fontWeight: fonts.weight.semibold, marginTop: 22, textTransform: 'uppercase', letterSpacing: 0.8 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 22 },
  hint: { fontSize: 13, lineHeight: 18, marginTop: 8 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 10 },
  stepBtn: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  stepBtnText: { fontSize: 22, fontWeight: fonts.weight.semibold },
  stepValue: { fontSize: 17, fontWeight: fonts.weight.semibold, textAlign: 'center' },
  stepSub: { fontSize: 12, marginTop: 2, textAlign: 'center' },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    padding: 14,
    marginTop: 12,
  },
  switchTitle: { fontSize: 16, fontWeight: fonts.weight.semibold },
  notes: { borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 15, minHeight: 80, marginTop: 10, textAlignVertical: 'top' },
});
