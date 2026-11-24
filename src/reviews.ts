import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import * as StoreReview from 'expo-store-review';
import { getOffering } from './purchases';
import { isLaunchOfferFree, isMomentUsed, pickReviewMoment, REVIEW_MOMENTS, ReviewMoment, ReviewState } from './reviewRules';

/** 1.0.2 and earlier: one shared flag, set at the first check-off or first printed chart. Read only now. */
const LEGACY_ASKED_KEY = 'chores.reviewAsked.v1';
const INSTALL_DAY_KEY = 'chores.installDay.v1';
const momentKey = (m: ReviewMoment) => `chores.review.${m}.v1`;

// Per app launch (the JS runtime starts fresh on a cold launch).
let askedThisLaunch = false;
// Calls run one after another, so two quick check-offs cannot both ask or skip each other.
let queue: Promise<void> = Promise.resolve();

export interface ReviewFacts {
  totalCompleted?: number;
  dueToday?: number;
  remainingToday?: number;
}

function localDay(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

async function loadState(): Promise<ReviewState> {
  const keys = [LEGACY_ASKED_KEY, INSTALL_DAY_KEY, ...REVIEW_MOMENTS.map(momentKey)];
  const pairs = await AsyncStorage.multiGet(keys);
  const value = new Map(pairs);
  const fired: ReviewState['fired'] = {};
  for (const m of REVIEW_MOMENTS) {
    const v = value.get(momentKey(m));
    if (v) fired[m] = v;
  }
  return {
    fired,
    legacyAsked: !!value.get(LEGACY_ASKED_KEY),
    installDay: value.get(INSTALL_DAY_KEY) ?? null,
    askedThisLaunch,
  };
}

/**
 * Record the install day the first time this version runs. For people updating
 * from 1.0.2 that is the day they first open 1.0.3, so laterDay cannot fire that day.
 */
export async function noteInstallDay(): Promise<void> {
  try {
    if (!(await AsyncStorage.getItem(INSTALL_DAY_KEY))) await AsyncStorage.setItem(INSTALL_DAY_KEY, localDay());
  } catch {
    // never let review plumbing affect the app
  }
}

/**
 * Ask for an App Store rating if one of `candidates` (in priority order) may
 * ask now; see reviewRules.ts for the rules. `facts` is only read when an
 * unused candidate is left, so routine calls stay cheap.
 */
export function maybeRequestReview(
  candidates: ReviewMoment[],
  facts?: () => Promise<ReviewFacts>,
  delayMs = 1200
): Promise<void> {
  queue = queue.then(() => askIfAllowed(candidates, facts, delayMs));
  return queue;
}

async function askIfAllowed(
  candidates: ReviewMoment[],
  facts: (() => Promise<ReviewFacts>) | undefined,
  delayMs: number
): Promise<void> {
  if (askedThisLaunch) return;
  try {
    const state = await loadState();
    const open = candidates.filter((m) => !isMomentUsed(m, state));
    if (open.length === 0) return;
    const [offering, known] = await Promise.all([getOffering(), facts ? facts() : Promise.resolve({})]);
    const now = new Date();
    const moment = pickReviewMoment(open, state, {
      nowMs: now.getTime(),
      today: localDay(now),
      launchOfferFree: isLaunchOfferFree(offering),
      ...known,
    });
    if (!moment) return;
    if (!(await StoreReview.hasAction())) return;
    askedThisLaunch = true;
    await AsyncStorage.setItem(momentKey(moment), now.toISOString());
    setTimeout(() => {
      StoreReview.requestReview().catch(() => {});
    }, delayMs);
  } catch {
    // never let review plumbing affect the app
  }
}

/** Resolves true once the app is active (Apple's purchase confirmation gone), false after `timeoutMs`. */
function whenActive(timeoutMs: number): Promise<boolean> {
  if (AppState.currentState === 'active') return Promise.resolve(true);
  return new Promise((resolve) => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s !== 'active') return;
      clearTimeout(timer);
      sub.remove();
      resolve(true);
    });
    const timer = setTimeout(() => {
      sub.remove();
      resolve(false);
    }, timeoutMs);
  });
}

/**
 * The purchase moment: after a trial or purchase starts on the paywall. Waits
 * for Apple's own confirmation to be dismissed and the paywall to slide away.
 */
export function requestReviewAfterPurchase(): void {
  setTimeout(async () => {
    if (await whenActive(60_000)) maybeRequestReview(['purchase'], undefined, 1500);
  }, 800);
}
