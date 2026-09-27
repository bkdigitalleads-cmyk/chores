import * as SQLite from 'expo-sqlite';
import { PRESET_ROOMS, firstDueOffset } from './presets';

/**
 * Chores data model (distinct from every sibling app):
 *   rooms       — Kitchen, Bathroom, Car, "Whole home"
 *   members     — the people who share the chores (optional)
 *   tasks       — a repeating chore in a room: every N days, next due date,
 *                 optional assignee, optional rotation between members
 *   completions — one row each time a chore is done (who, when, points),
 *                 carrying the task's previous state so "undo" is exact
 */

export interface Room {
  id: number;
  name: string;
  emoji: string;
  sortKey: number;
  createdAt: number;
}

export interface Member {
  id: number;
  name: string;
  color: string;
  sortKey: number;
}

export interface Task {
  id: number;
  roomId: number;
  roomName: string;
  roomEmoji: string;
  name: string;
  freqDays: number;
  minutes: number;
  points: number;
  memberId: number | null;
  rotate: boolean;
  notes: string;
  /** YYYY-MM-DD local. */
  nextDue: string;
  lastDone: string | null;
  createdAt: number;
}

export interface Completion {
  id: number;
  taskId: number;
  taskName: string;
  roomEmoji: string;
  memberId: number | null;
  date: string;
  points: number;
  createdAt: number;
}

export type TaskInput = {
  roomId: number;
  name: string;
  freqDays: number;
  minutes: number;
  points: number;
  memberId: number | null;
  rotate: boolean;
  notes: string;
  nextDue: string;
};

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync('chores.db');
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
        PRAGMA foreign_keys = ON;
        CREATE TABLE IF NOT EXISTS rooms (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          emoji TEXT NOT NULL DEFAULT '🏠',
          sort_key INTEGER NOT NULL DEFAULT 0,
          created_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS members (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          color TEXT NOT NULL,
          sort_key INTEGER NOT NULL DEFAULT 0,
          created_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS tasks (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          freq_days INTEGER NOT NULL DEFAULT 7,
          minutes INTEGER NOT NULL DEFAULT 10,
          points INTEGER NOT NULL DEFAULT 1,
          member_id INTEGER REFERENCES members(id) ON DELETE SET NULL,
          rotate INTEGER NOT NULL DEFAULT 0,
          notes TEXT NOT NULL DEFAULT '',
          next_due TEXT NOT NULL,
          last_done TEXT,
          created_at INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_tasks_room ON tasks(room_id);
        CREATE INDEX IF NOT EXISTS idx_tasks_due ON tasks(next_due);
        CREATE TABLE IF NOT EXISTS completions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
          member_id INTEGER REFERENCES members(id) ON DELETE SET NULL,
          date TEXT NOT NULL,
          points INTEGER NOT NULL DEFAULT 1,
          prev_next_due TEXT NOT NULL,
          prev_last_done TEXT,
          prev_member_id INTEGER,
          created_at INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_completions_date ON completions(date);
        CREATE INDEX IF NOT EXISTS idx_completions_task ON completions(task_id);
      `);
      return db;
    })();
  }
  return dbPromise;
}

// ---------- dates ----------

const pad = (n: number) => String(n).padStart(2, '0');

export function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function shiftDate(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d + days);
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
}

/** Whole days from a to b (b - a). */
export function daysBetween(a: string, b: string): number {
  const [y1, m1, d1] = a.split('-').map(Number);
  const [y2, m2, d2] = b.split('-').map(Number);
  const t1 = Date.UTC(y1, m1 - 1, d1);
  const t2 = Date.UTC(y2, m2 - 1, d2);
  return Math.round((t2 - t1) / 86400000);
}

export function weekdayOf(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).getDay(); // 0 = Sunday
}

/** First day of the week containing iso. */
export function startOfWeek(iso: string, mondayFirst: boolean): string {
  const wd = weekdayOf(iso);
  const back = mondayFirst ? (wd + 6) % 7 : wd;
  return shiftDate(iso, -back);
}

export function prettyDate(iso: string, withYear = false): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: withYear ? 'numeric' : undefined,
  });
}

export function shortWeekday(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'short' });
}

/** "Today", "Tomorrow", "Yesterday", "In 3 days", "4 days late". */
export function dueLabel(nextDue: string, today: string): string {
  const n = daysBetween(today, nextDue);
  if (n === 0) return 'Today';
  if (n === 1) return 'Tomorrow';
  if (n === -1) return '1 day late';
  if (n < 0) return `${-n} days late`;
  if (n < 7) return `In ${n} days`;
  return prettyDate(nextDue);
}

/**
 * How fresh a chore is, 1 = just done, 0 = due or overdue. Drives the
 * colored bar under each chore and a room's "clean" percentage.
 */
export function freshness(task: Pick<Task, 'nextDue' | 'freqDays'>, today: string): number {
  const left = daysBetween(today, task.nextDue);
  if (left <= 0) return 0;
  return Math.max(0, Math.min(1, left / Math.max(1, task.freqDays)));
}

// ---------- rows ----------

function rowToTask(r: any): Task {
  return {
    id: r.id,
    roomId: r.room_id,
    roomName: r.room_name ?? '',
    roomEmoji: r.room_emoji ?? '🏠',
    name: r.name,
    freqDays: r.freq_days,
    minutes: r.minutes,
    points: r.points,
    memberId: r.member_id ?? null,
    rotate: !!r.rotate,
    notes: r.notes ?? '',
    nextDue: r.next_due,
    lastDone: r.last_done ?? null,
    createdAt: r.created_at,
  };
}

const TASK_SELECT = `
  SELECT t.*, r.name AS room_name, r.emoji AS room_emoji
  FROM tasks t JOIN rooms r ON r.id = t.room_id
`;

/** next_due for a one-time chore that's been done: off every list, kept for history and undo. */
export const DONE_FOREVER = '9999-12-31';

// ---------- rooms ----------

export async function getRooms(): Promise<Room[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<any>('SELECT * FROM rooms ORDER BY sort_key, id');
  return rows.map((r) => ({ id: r.id, name: r.name, emoji: r.emoji, sortKey: r.sort_key, createdAt: r.created_at }));
}

export async function countRooms(): Promise<number> {
  const db = await getDb();
  const r = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM rooms');
  return r?.n ?? 0;
}

export async function insertRoom(name: string, emoji: string): Promise<number> {
  const db = await getDb();
  const max = await db.getFirstAsync<{ m: number | null }>('SELECT MAX(sort_key) AS m FROM rooms');
  const res = await db.runAsync(
    'INSERT INTO rooms (name, emoji, sort_key, created_at) VALUES (?, ?, ?, ?)',
    name.trim(),
    emoji,
    (max?.m ?? 0) + 1,
    Date.now()
  );
  return res.lastInsertRowId;
}

export async function updateRoom(id: number, name: string, emoji: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE rooms SET name = ?, emoji = ? WHERE id = ?', name.trim(), emoji, id);
}

export async function deleteRoom(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM rooms WHERE id = ?', id);
}

// ---------- members ----------

export async function getMembers(): Promise<Member[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<any>('SELECT * FROM members ORDER BY sort_key, id');
  return rows.map((r) => ({ id: r.id, name: r.name, color: r.color, sortKey: r.sort_key }));
}

export async function insertMember(name: string, color: string): Promise<number> {
  const db = await getDb();
  const max = await db.getFirstAsync<{ m: number | null }>('SELECT MAX(sort_key) AS m FROM members');
  const res = await db.runAsync(
    'INSERT INTO members (name, color, sort_key, created_at) VALUES (?, ?, ?, ?)',
    name.trim(),
    color,
    (max?.m ?? 0) + 1,
    Date.now()
  );
  return res.lastInsertRowId;
}

export async function updateMember(id: number, name: string, color: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE members SET name = ?, color = ? WHERE id = ?', name.trim(), color, id);
}

export async function deleteMember(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM members WHERE id = ?', id);
}

// ---------- tasks ----------

export async function getTasks(): Promise<Task[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<any>(
    `${TASK_SELECT} WHERE t.next_due < ? ORDER BY t.next_due, r.sort_key, t.id`,
    DONE_FOREVER
  );
  return rows.map(rowToTask);
}

export async function getTask(id: number): Promise<Task | null> {
  const db = await getDb();
  const r = await db.getFirstAsync<any>(`${TASK_SELECT} WHERE t.id = ?`, id);
  return r ? rowToTask(r) : null;
}

export async function insertTask(t: TaskInput): Promise<number> {
  const db = await getDb();
  const res = await db.runAsync(
    `INSERT INTO tasks (room_id, name, freq_days, minutes, points, member_id, rotate, notes, next_due, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    t.roomId,
    t.name.trim(),
    Math.max(0, Math.round(t.freqDays)),
    t.minutes,
    t.points,
    t.memberId,
    t.rotate ? 1 : 0,
    t.notes,
    t.nextDue,
    Date.now()
  );
  return res.lastInsertRowId;
}

export async function updateTask(id: number, t: TaskInput): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE tasks SET room_id = ?, name = ?, freq_days = ?, minutes = ?, points = ?, member_id = ?,
       rotate = ?, notes = ?, next_due = ? WHERE id = ?`,
    t.roomId,
    t.name.trim(),
    Math.max(0, Math.round(t.freqDays)),
    t.minutes,
    t.points,
    t.memberId,
    t.rotate ? 1 : 0,
    t.notes,
    t.nextDue,
    id
  );
}

export async function deleteTask(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM tasks WHERE id = ?', id);
}

/** Push a chore to a new due date without counting it as done. */
export async function setNextDue(id: number, nextDue: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE tasks SET next_due = ? WHERE id = ?', nextDue, id);
}

/**
 * Mark a chore done today. Credits `doneBy` (or the assignee), schedules the
 * next one, and hands the chore to the next person if it rotates.
 */
export async function completeTask(taskId: number, doneBy: number | null, today: string): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    const t = await db.getFirstAsync<any>('SELECT * FROM tasks WHERE id = ?', taskId);
    if (!t) return;
    const credit = doneBy ?? t.member_id ?? null;
    await db.runAsync(
      `INSERT INTO completions (task_id, member_id, date, points, prev_next_due, prev_last_done, prev_member_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      taskId,
      credit,
      today,
      t.points,
      t.next_due,
      t.last_done,
      t.member_id,
      Date.now()
    );
    let nextMember: number | null = t.member_id ?? null;
    if (t.rotate && t.freq_days > 0) {
      const members = await db.getAllAsync<{ id: number }>('SELECT id FROM members ORDER BY sort_key, id');
      if (members.length > 1) {
        const from = t.member_id ?? credit;
        const i = members.findIndex((m) => m.id === from);
        nextMember = members[(i + 1) % members.length].id;
      }
    }
    await db.runAsync(
      'UPDATE tasks SET last_done = ?, next_due = ?, member_id = ? WHERE id = ?',
      today,
      t.freq_days > 0 ? shiftDate(today, t.freq_days) : DONE_FOREVER,
      nextMember,
      taskId
    );
  });
}

/** Undo today's most recent completion of a chore, restoring its schedule exactly. */
export async function undoCompletion(taskId: number, today: string): Promise<boolean> {
  const db = await getDb();
  let undone = false;
  await db.withTransactionAsync(async () => {
    const c = await db.getFirstAsync<any>(
      'SELECT * FROM completions WHERE task_id = ? AND date = ? ORDER BY id DESC LIMIT 1',
      taskId,
      today
    );
    if (!c) return;
    await db.runAsync(
      'UPDATE tasks SET next_due = ?, last_done = ?, member_id = ? WHERE id = ?',
      c.prev_next_due,
      c.prev_last_done,
      c.prev_member_id,
      taskId
    );
    await db.runAsync('DELETE FROM completions WHERE id = ?', c.id);
    undone = true;
  });
  return undone;
}

// ---------- completions ----------

export async function getCompletionsBetween(start: string, end: string): Promise<Completion[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<any>(
    `SELECT c.*, t.name AS task_name, r.emoji AS room_emoji
     FROM completions c
     JOIN tasks t ON t.id = c.task_id
     JOIN rooms r ON r.id = t.room_id
     WHERE c.date >= ? AND c.date <= ?
     ORDER BY c.date, c.id`,
    start,
    end
  );
  return rows.map((r) => ({
    id: r.id,
    taskId: r.task_id,
    taskName: r.task_name,
    roomEmoji: r.room_emoji,
    memberId: r.member_id ?? null,
    date: r.date,
    points: r.points,
    createdAt: r.created_at,
  }));
}

export async function countCompletions(): Promise<number> {
  const db = await getDb();
  const r = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM completions');
  return r?.n ?? 0;
}

/** Days in a row (ending today, or yesterday if nothing yet today) with at least one chore done. */
export async function getStreak(today: string): Promise<number> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ date: string }>(
    'SELECT DISTINCT date FROM completions WHERE date <= ? ORDER BY date DESC LIMIT 400',
    today
  );
  const days = new Set(rows.map((r) => r.date));
  let cursor = days.has(today) ? today : shiftDate(today, -1);
  let n = 0;
  while (days.has(cursor)) {
    n += 1;
    cursor = shiftDate(cursor, -1);
  }
  return n;
}

// ---------- setup ----------

/**
 * Create the chosen starter rooms with their usual chores. First due dates are
 * spread out so day one is a normal day, not every chore in the house at once:
 * daily chores start today, weekly ones across this week, rarer ones across
 * the next four weeks.
 */
export async function seedRooms(roomKeys: string[], today: string): Promise<void> {
  const db = await getDb();
  const chosen = PRESET_ROOMS.filter((r) => roomKeys.includes(r.key));
  await db.withTransactionAsync(async () => {
    const max = await db.getFirstAsync<{ m: number | null }>('SELECT MAX(sort_key) AS m FROM rooms');
    let sort = (max?.m ?? 0) + 1;
    for (let ri = 0; ri < chosen.length; ri++) {
      const room = chosen[ri];
      const res = await db.runAsync(
        'INSERT INTO rooms (name, emoji, sort_key, created_at) VALUES (?, ?, ?, ?)',
        room.name,
        room.emoji,
        sort++,
        Date.now()
      );
      const roomId = res.lastInsertRowId;
      for (let ti = 0; ti < room.tasks.length; ti++) {
        const p = room.tasks[ti];
        const offset = firstDueOffset(p.freq, ti, ri);
        await db.runAsync(
          `INSERT INTO tasks (room_id, name, freq_days, minutes, points, member_id, rotate, notes, next_due, created_at)
           VALUES (?, ?, ?, ?, ?, NULL, 0, '', ?, ?)`,
          roomId,
          p.name,
          p.freq,
          p.minutes,
          p.minutes >= 30 ? 3 : p.minutes >= 15 ? 2 : 1,
          shiftDate(today, offset),
          Date.now()
        );
      }
    }
  });
}

export async function deleteAllData(): Promise<void> {
  const db = await getDb();
  await db.execAsync('DELETE FROM completions; DELETE FROM tasks; DELETE FROM members; DELETE FROM rooms;');
}
