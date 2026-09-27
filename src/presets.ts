/**
 * Starter rooms and the chores that usually go with them, with sensible
 * frequencies (in days) and rough effort (in minutes). Used by first-run
 * setup and by the "suggestions" row when adding a task to a room.
 */

export interface PresetTask {
  name: string;
  freq: number;
  minutes: number;
  /** Ticked by default in the chore picker: the everyday essentials. */
  pick?: boolean;
}

export interface PresetRoom {
  key: string;
  name: string;
  emoji: string;
  /** One of the everyday rooms (listed first). Nothing is pre-selected. */
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
      { name: 'Wipe counters', freq: 1, minutes: 5, pick: true },
      { name: 'Do the dishes', freq: 1, minutes: 15, pick: true },
      { name: 'Take out the trash', freq: 3, minutes: 5, pick: true },
      { name: 'Clean the stovetop', freq: 7, minutes: 10 },
      { name: 'Wipe the microwave', freq: 7, minutes: 5 },
      { name: 'Mop the floor', freq: 7, minutes: 15, pick: true },
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
      { name: 'Wipe sink and mirror', freq: 3, minutes: 5, pick: true },
      { name: 'Clean the toilet', freq: 7, minutes: 10, pick: true },
      { name: 'Scrub shower and tub', freq: 7, minutes: 20, pick: true },
      { name: 'Change towels', freq: 7, minutes: 5, pick: true },
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
      { name: 'Make the bed', freq: 1, minutes: 2, pick: true },
      { name: 'Change the sheets', freq: 7, minutes: 10, pick: true },
      { name: 'Dust surfaces', freq: 7, minutes: 10 },
      { name: 'Vacuum the floor', freq: 7, minutes: 10, pick: true },
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
      { name: 'Quick tidy', freq: 1, minutes: 5, pick: true },
      { name: 'Dust surfaces', freq: 7, minutes: 10, pick: true },
      { name: 'Vacuum the floor', freq: 7, minutes: 15, pick: true },
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
      { name: 'Wash a load', freq: 3, minutes: 10, pick: true },
      { name: 'Fold and put away', freq: 3, minutes: 15, pick: true },
      { name: 'Clean the lint trap', freq: 7, minutes: 2 },
      { name: 'Clean the washer', freq: 30, minutes: 15 },
    ],
  },
  {
    key: 'dog',
    name: 'Dog',
    emoji: '🐕',
    tasks: [
      { name: 'Morning walk', freq: 1, minutes: 20, pick: true },
      { name: 'Evening walk', freq: 1, minutes: 20, pick: true },
      { name: 'Feed the dog', freq: 1, minutes: 5, pick: true },
      { name: 'Fresh water', freq: 1, minutes: 2, pick: true },
      { name: 'Wash the bowls', freq: 3, minutes: 5 },
      { name: 'Brush the dog', freq: 7, minutes: 10 },
      { name: 'Bath time', freq: 30, minutes: 30 },
      { name: 'Wash the dog bed', freq: 30, minutes: 10 },
      { name: 'Flea and tick treatment', freq: 30, minutes: 5 },
    ],
  },
  {
    key: 'cat',
    name: 'Cat',
    emoji: '🐈',
    tasks: [
      { name: 'Feed the cat', freq: 1, minutes: 5, pick: true },
      { name: 'Scoop the litter', freq: 1, minutes: 5, pick: true },
      { name: 'Fresh water', freq: 1, minutes: 2, pick: true },
      { name: 'Wash the bowls', freq: 3, minutes: 5 },
      { name: 'Brush the cat', freq: 7, minutes: 5 },
      { name: 'Change all the litter', freq: 14, minutes: 15 },
    ],
  },
  {
    key: 'yard',
    name: 'Yard',
    emoji: '🌿',
    tasks: [
      { name: 'Water the garden', freq: 3, minutes: 15, pick: true },
      { name: 'Take the bins to the curb', freq: 7, minutes: 5, pick: true },
      { name: 'Mow the lawn', freq: 7, minutes: 45, pick: true },
      { name: 'Pull weeds', freq: 14, minutes: 20 },
      { name: 'Sweep the patio', freq: 14, minutes: 10 },
      { name: 'Rake leaves', freq: 14, minutes: 30 },
      { name: 'Wipe down outdoor furniture', freq: 30, minutes: 15 },
      { name: 'Clean the gutters', freq: 182, minutes: 60 },
    ],
  },
  {
    key: 'car',
    name: 'Car',
    emoji: '🚗',
    tasks: [
      { name: 'Clear out the trash', freq: 7, minutes: 5 },
      { name: 'Wash the car', freq: 30, minutes: 30, pick: true },
      { name: 'Vacuum the interior', freq: 30, minutes: 20 },
      { name: 'Check tire pressure', freq: 30, minutes: 10, pick: true },
      { name: 'Top up washer fluid', freq: 90, minutes: 5 },
      { name: 'Oil change', freq: 182, minutes: 60, pick: true },
    ],
  },
  {
    key: 'plants',
    name: 'Plants',
    emoji: '🪴',
    tasks: [
      { name: 'Water the plants', freq: 7, minutes: 10, pick: true },
      { name: 'Dust the leaves', freq: 30, minutes: 10 },
      { name: 'Feed the plants', freq: 30, minutes: 5 },
    ],
  },
  {
    key: 'entry',
    name: 'Entryway',
    emoji: '🚪',
    tasks: [
      { name: 'Sweep the entry', freq: 7, minutes: 5, pick: true },
      { name: 'Sort shoes and coats', freq: 14, minutes: 5 },
      { name: 'Wipe the front door', freq: 30, minutes: 5 },
    ],
  },
  {
    key: 'kids',
    name: 'Kids’ room',
    emoji: '🧸',
    tasks: [
      { name: 'Pick up toys', freq: 1, minutes: 10, pick: true },
      { name: 'Change the sheets', freq: 7, minutes: 10, pick: true },
      { name: 'Sort outgrown clothes', freq: 90, minutes: 20 },
    ],
  },
  {
    key: 'office',
    name: 'Home office',
    emoji: '💻',
    tasks: [
      { name: 'Clear the desk', freq: 7, minutes: 5, pick: true },
      { name: 'Empty the paper bin', freq: 7, minutes: 2 },
      { name: 'Dust electronics', freq: 14, minutes: 5 },
    ],
  },
  {
    key: 'garage',
    name: 'Garage',
    emoji: '🧰',
    tasks: [
      { name: 'Sweep the floor', freq: 30, minutes: 15, pick: true },
      { name: 'Tidy the shelves', freq: 30, minutes: 20 },
      { name: 'Declutter', freq: 90, minutes: 45 },
    ],
  },
  {
    key: 'home',
    name: 'Whole home',
    emoji: '🏠',
    tasks: [
      { name: 'Take out recycling', freq: 7, minutes: 5, pick: true },
      { name: 'Wipe light switches and handles', freq: 30, minutes: 10 },
      { name: 'Change the HVAC filter', freq: 90, minutes: 10, pick: true },
      { name: 'Test smoke alarms', freq: 182, minutes: 5, pick: true },
    ],
  },
];

/** Emoji choices when a user makes a custom room. */
export const ROOM_EMOJIS = ['🍳', '🛁', '🛏️', '🛋️', '🧺', '🚪', '🧸', '💻', '🐕', '🐈', '🐾', '🌿', '🚗', '🪴', '🧰', '🏠', '🧹', '🍽️', '📦', '🏋️', '🏊', '🎮', '👶', '🧓'];

/** Words that point a custom room at a starter set of chores ("Backyard" gets the yard chores). */
const ALIASES: Record<string, string[]> = {
  kitchen: ['kitchen', 'kitchenette'],
  bathroom: ['bathroom', 'bath', 'washroom', 'restroom', 'toilet', 'ensuite'],
  bedroom: ['bedroom', 'bedrooms'],
  living: ['living', 'lounge', 'family', 'den'],
  laundry: ['laundry', 'utility'],
  dog: ['dog', 'dogs', 'puppy'],
  cat: ['cat', 'cats', 'kitten'],
  yard: ['yard', 'backyard', 'garden', 'outdoor', 'outdoors', 'outside', 'lawn', 'patio', 'deck'],
  car: ['car', 'cars', 'truck', 'vehicle', 'van'],
  plants: ['plants', 'plant'],
  entry: ['entry', 'entryway', 'hallway', 'hall', 'mudroom', 'foyer'],
  kids: ['kids', 'kid', 'nursery', 'playroom'],
  office: ['office', 'study'],
  garage: ['garage', 'shed', 'basement', 'attic'],
  home: ['home', 'house'],
};

export function presetForRoomName(name: string): PresetRoom | undefined {
  const n = name.trim().toLowerCase();
  const words = n.split(/[^a-z]+/).filter(Boolean);
  return (
    PRESET_ROOMS.find((r) => r.name.toLowerCase() === n) ??
    PRESET_ROOMS.find((r) => (ALIASES[r.key] ?? [r.key]).some((a) => words.includes(a)))
  );
}

/**
 * Days from today until a starter chore is first due. Spreads a new home's
 * chores out so day one is a normal day: only the daily ones start today,
 * weekly and monthly ones spread across the rest of their first cycle, and rare jobs (oven, oil change,
 * gutters) no sooner than a week out and within about three months.
 */
export function firstDueOffset(freq: number, taskIndex: number, roomIndex: number): number {
  const seed = taskIndex * 3 + roomIndex * 2;
  if (freq <= 1) return 0;
  if (freq <= 30) return 1 + (seed % (freq - 1));
  return 7 + (seed % Math.min(freq - 7, 83));
}

/** 0 = a one-time chore: once it's done it drops off the list (kept in history). */
export const ONE_TIME = 0;

export const FREQ_OPTIONS: { days: number; label: string }[] = [
  { days: ONE_TIME, label: 'Just once' },
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
  if (days === ONE_TIME) return 'One time';
  const hit = FREQ_OPTIONS.find((o) => o.days === days);
  if (hit) return hit.label;
  if (days % 7 === 0) return `Every ${days / 7} weeks`;
  return `Every ${days} days`;
}
