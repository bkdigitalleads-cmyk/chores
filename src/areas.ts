/**
 * Draft areas and chores for the chore picker. Nothing is written to the
 * database until the person confirms, and only the chores they ticked are
 * created. Used by first-run setup and by "Add an area".
 */
import { insertRoom, insertTask, shiftDate, prettyDate } from './db';
import { PresetRoom, firstDueOffset, presetForRoomName } from './presets';

export interface DraftChore {
  id: string;
  name: string;
  freq: number;
  minutes: number;
  picked: boolean;
  /** Days from today until it's first due. */
  offset: number;
  custom?: boolean;
}

export interface DraftArea {
  key: string;
  name: string;
  emoji: string;
  chores: DraftChore[];
}

export function pointsFor(minutes: number): number {
  return minutes >= 30 ? 3 : minutes >= 15 ? 2 : 1;
}

/** A preset area with its usual chores; only the everyday ones start ticked. */
export function draftFromPreset(p: PresetRoom, areaIndex = 0): DraftArea {
  return {
    key: p.key,
    name: p.name,
    emoji: p.emoji,
    chores: p.tasks.map((t, i) => ({
      id: `${p.key}-${i}`,
      name: t.name,
      freq: t.freq,
      minutes: t.minutes,
      picked: !!t.pick,
      offset: firstDueOffset(t.freq, i, areaIndex),
    })),
  };
}

/** A custom-named area. "Backyard" still gets the yard suggestions. */
export function draftFromName(name: string, emoji: string): DraftArea {
  const match = presetForRoomName(name);
  const base = match ? draftFromPreset(match) : null;
  return {
    key: `custom-${Date.now()}`,
    name: name.trim(),
    emoji,
    chores: base ? base.chores : [],
  };
}

let customSeq = 0;
export function customChore(name: string, freq: number): DraftChore {
  customSeq += 1;
  return { id: `own-${Date.now()}-${customSeq}`, name: name.trim(), freq, minutes: 10, picked: true, offset: 0, custom: true };
}

export function pickedCount(areas: DraftArea[]): number {
  return areas.reduce((s, a) => s + a.chores.filter((c) => c.picked).length, 0);
}

/** "starts today", "starts tomorrow", "starts in 3 days", "starts Oct 16". */
export function startsLabel(offset: number, today: string): string {
  if (offset <= 0) return 'starts today';
  if (offset === 1) return 'starts tomorrow';
  if (offset < 7) return `starts in ${offset} days`;
  return `starts ${prettyDate(shiftDate(today, offset))}`;
}

/**
 * Create the areas and the ticked chores. Throws on failure so the caller
 * can tell the person instead of silently continuing with an empty app.
 */
export async function createAreas(areas: DraftArea[], today: string): Promise<number> {
  let created = 0;
  for (const area of areas) {
    const roomId = await insertRoom(area.name, area.emoji);
    for (const c of area.chores) {
      if (!c.picked) continue;
      await insertTask({
        roomId,
        name: c.name,
        freqDays: c.freq,
        minutes: c.minutes,
        points: pointsFor(c.minutes),
        memberId: null,
        rotate: false,
        notes: '',
        nextDue: shiftDate(today, c.offset),
      });
      created += 1;
    }
  }
  return created;
}

