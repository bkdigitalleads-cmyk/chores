/**
 * Starter rooms and the chores that usually go with them, with sensible
 * frequencies (in days) and rough effort (in minutes). Used by first-run
 * setup and by the "suggestions" row when adding a task to a room.
 */

export interface PresetTask {
  name: string;
  freq: number;
  minutes: number;
}

export interface PresetRoom {
  key: string;
  name: string;
  emoji: string;
  /** Pre-selected in first-run setup. */
  common?: boolean;
  tasks: PresetTask[];
}

export const PRESET_ROOMS: PresetRoom[] = [
  {
    key: 'kitchen',
    name: 'Kitchen',
    emoji: '🍳',
    common: true,
    tasks: [
      { name: 'Wipe counters', freq: 1, minutes: 5 },
      { name: 'Do the dishes', freq: 1, minutes: 15 },
      { name: 'Take out the trash', freq: 3, minutes: 5 },
      { name: 'Clean the stovetop', freq: 7, minutes: 10 },
      { name: 'Wipe the microwave', freq: 7, minutes: 5 },
      { name: 'Mop the floor', freq: 7, minutes: 15 },
      { name: 'Clear out the fridge', freq: 14, minutes: 20 },
      { name: 'Wipe cabinet fronts', freq: 30, minutes: 15 },
      { name: 'Descale the coffee maker', freq: 30, minutes: 10 },
      { name: 'Clean the oven', freq: 90, minutes: 45 },
    ],
  },
  {
    key: 'bathroom',
    name: 'Bathroom',
    emoji: '🛁',
    common: true,
    tasks: [
      { name: 'Wipe sink and mirror', freq: 3, minutes: 5 },
      { name: 'Clean the toilet', freq: 7, minutes: 10 },
      { name: 'Scrub shower and tub', freq: 7, minutes: 20 },
      { name: 'Change towels', freq: 7, minutes: 5 },
      { name: 'Mop the floor', freq: 7, minutes: 10 },
      { name: 'Wash the bath mat', freq: 14, minutes: 5 },
      { name: 'Scrub the grout', freq: 90, minutes: 30 },
    ],
  },
  {
    key: 'bedroom',
    name: 'Bedroom',
    emoji: '🛏️',
    common: true,
    tasks: [
      { name: 'Make the bed', freq: 1, minutes: 2 },
      { name: 'Change the sheets', freq: 7, minutes: 10 },
      { name: 'Dust surfaces', freq: 7, minutes: 10 },
      { name: 'Vacuum the floor', freq: 7, minutes: 10 },
      { name: 'Declutter the nightstand', freq: 14, minutes: 5 },
      { name: 'Wash pillows', freq: 90, minutes: 10 },
      { name: 'Rotate the mattress', freq: 180, minutes: 10 },
    ],
  },
  {
    key: 'living',
    name: 'Living room',
    emoji: '🛋️',
    common: true,
    tasks: [
      { name: 'Quick tidy', freq: 1, minutes: 5 },
      { name: 'Dust surfaces', freq: 7, minutes: 10 },
      { name: 'Vacuum the floor', freq: 7, minutes: 15 },
      { name: 'Wipe remotes and switches', freq: 14, minutes: 5 },
      { name: 'Vacuum the sofa', freq: 30, minutes: 15 },
      { name: 'Clean the windows', freq: 30, minutes: 20 },
    ],
  },
  {
    key: 'laundry',
    name: 'Laundry',
    emoji: '🧺',
    common: true,
    tasks: [
      { name: 'Wash a load', freq: 3, minutes: 10 },
      { name: 'Fold and put away', freq: 3, minutes: 15 },
      { name: 'Clean the lint trap', freq: 7, minutes: 2 },
      { name: 'Clean the washer', freq: 30, minutes: 15 },
    ],
  },
  {
    key: 'entry',
    name: 'Entryway',
    emoji: '🚪',
    tasks: [
      { name: 'Sweep the entry', freq: 7, minutes: 5 },
      { name: 'Sort shoes and coats', freq: 14, minutes: 5 },
      { name: 'Wipe the front door', freq: 30, minutes: 5 },
    ],
  },
  {
    key: 'kids',
    name: 'Kids’ room',
    emoji: '🧸',
    tasks: [
      { name: 'Pick up toys', freq: 1, minutes: 10 },
      { name: 'Change the sheets', freq: 7, minutes: 10 },
      { name: 'Sort outgrown clothes', freq: 90, minutes: 20 },
    ],
  },
  {
    key: 'office',
    name: 'Home office',
    emoji: '💻',
    tasks: [
      { name: 'Clear the desk', freq: 7, minutes: 5 },
      { name: 'Empty the paper bin', freq: 7, minutes: 2 },
      { name: 'Dust electronics', freq: 14, minutes: 5 },
    ],
  },
  {
    key: 'pets',
    name: 'Pets',
    emoji: '🐾',
    tasks: [
      { name: 'Feed the pets', freq: 1, minutes: 5 },
      { name: 'Scoop the litter', freq: 1, minutes: 5 },
      { name: 'Wash pet bowls', freq: 3, minutes: 5 },
      { name: 'Wash the pet bed', freq: 30, minutes: 10 },
    ],
  },
  {
    key: 'outdoor',
    name: 'Outdoor',
    emoji: '🌿',
    tasks: [
      { name: 'Water the plants', freq: 3, minutes: 10 },
      { name: 'Mow the lawn', freq: 7, minutes: 45 },
      { name: 'Sweep the patio', freq: 14, minutes: 10 },
      { name: 'Clean the gutters', freq: 180, minutes: 60 },
    ],
  },
  {
    key: 'car',
    name: 'Car',
    emoji: '🚗',
    tasks: [
      { name: 'Clear out the trash', freq: 7, minutes: 5 },
      { name: 'Vacuum the interior', freq: 30, minutes: 20 },
      { name: 'Wash the car', freq: 30, minutes: 30 },
    ],
  },
  {
    key: 'home',
    name: 'Whole home',
    emoji: '🏠',
    tasks: [
      { name: 'Take out recycling', freq: 7, minutes: 5 },
      { name: 'Change the HVAC filter', freq: 90, minutes: 10 },
      { name: 'Test smoke alarms', freq: 180, minutes: 5 },
    ],
  },
];

/** Emoji choices when a user makes a custom room. */
export const ROOM_EMOJIS = ['🍳', '🛁', '🛏️', '🛋️', '🧺', '🚪', '🧸', '💻', '🐾', '🌿', '🚗', '🏠', '🧹', '🪴', '🍽️', '📦', '🏋️', '🎮'];

export function presetForRoomName(name: string): PresetRoom | undefined {
  const n = name.trim().toLowerCase();
  return PRESET_ROOMS.find((r) => r.name.toLowerCase() === n || n.includes(r.key));
}

export const FREQ_OPTIONS: { days: number; label: string }[] = [
  { days: 1, label: 'Daily' },
  { days: 2, label: 'Every 2 days' },
  { days: 3, label: 'Every 3 days' },
  { days: 7, label: 'Weekly' },
  { days: 14, label: 'Every 2 weeks' },
  { days: 30, label: 'Monthly' },
  { days: 90, label: 'Every 3 months' },
  { days: 182, label: 'Every 6 months' },
  { days: 365, label: 'Yearly' },
];

export function freqLabel(days: number): string {
  const hit = FREQ_OPTIONS.find((o) => o.days === days);
  if (hit) return hit.label;
  if (days % 7 === 0) return `Every ${days / 7} weeks`;
  return `Every ${days} days`;
}
