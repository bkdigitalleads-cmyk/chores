/**
 * When may Chores ask for an App Store rating? Pure decision logic, no storage,
 * no React Native, no clock: everything comes in as arguments so
 * scripts/check-review-rules.mjs can check it with plain Node.
 *
 * Rating moments, each with its own stored key and each at most once ever:
 * - checkOff: the first chore checked off (unchanged since 1.0.2; was the third check-off before that).
 * - chart:    the first printed or shared chore chart.
 * - allDone:  the first time every chore due today is checked off, on a day with at least 3 due.
 * - laterDay: the first cold launch on a later calendar day than the install day,
 *             once at least 3 chores have been completed in total.
 * - purchase: right after a trial or purchase starts on the paywall.
 *
 * On top of that: at most one ask per app launch, never two asks within 3 days,
 * and never while the Lifetime launch offer is free (or the offering is unknown).
 * A moment counts as used only once it has actually asked, so a moment that is
 * held back (gap, same launch, launch offer) can still ask on a later occasion.
 */

export type ReviewMoment = 'checkOff' | 'chart' | 'allDone' | 'laterDay' | 'purchase';

export const REVIEW_MOMENTS: ReviewMoment[] = ['checkOff', 'chart', 'allDone', 'laterDay', 'purchase'];

export const MIN_DAYS_BETWEEN_ASKS = 3;
const DAY_MS = 24 * 60 * 60 * 1000;
/** Chores due on a day before clearing it counts as the allDone moment. */
export const ALL_DONE_MIN_DUE = 3;
/** Chores completed in total before the laterDay moment may ask. */
export const LATER_DAY_MIN_COMPLETED = 3;

export interface ReviewState {
  /** When each moment asked (ISO timestamp). Missing = not used yet. */
  fired: Partial<Record<ReviewMoment, string>>;
  /** The 1.0.2 shared flag (chores.reviewAsked.v1). Counts as the checkOff ask. */
  legacyAsked: boolean;
  /** Local calendar day (YYYY-MM-DD) of the first launch of 1.0.3 or later. */
  installDay: string | null;
  /** Something already asked during this app launch. */
  askedThisLaunch: boolean;
}

export interface ReviewContext {
  nowMs: number;
  /** Local calendar day, YYYY-MM-DD. */
  today: string;
  /** Lifetime launch offer is free right now, or the offering is unknown. */
  launchOfferFree: boolean;
  /** All check-offs ever (completions table). */
  totalCompleted?: number;
  /** Chores on today's list, done or not: overdue + due today + done today. */
  dueToday?: number;
  /** Chores on today's list still not done. */
  remainingToday?: number;
}

/** The launch-offer rule (same as Attendance Tracker): free Lifetime or an unknown offering means no asks. */
export function isLaunchOfferFree(
  offering: { lifetime?: { product: { price: number } } | null } | null | undefined
): boolean {
  if (!offering) return true;
  return offering.lifetime?.product.price === 0;
}

export function isMomentUsed(moment: ReviewMoment, state: ReviewState): boolean {
  return !!state.fired[moment] || (moment === 'checkOff' && state.legacyAsked);
}

/** Most recent ask we know the time of, in ms. The 1.0.2 flag has no time, so it is not counted. */
export function lastAskMs(state: ReviewState): number | null {
  let last: number | null = null;
  for (const m of REVIEW_MOMENTS) {
    const iso = state.fired[m];
    if (!iso) continue;
    const t = Date.parse(iso);
    if (!Number.isNaN(t) && (last === null || t > last)) last = t;
  }
  return last;
}

/** The moment's own condition, ignoring the shared rules. */
export function momentConditionMet(moment: ReviewMoment, state: ReviewState, ctx: ReviewContext): boolean {
  switch (moment) {
    case 'checkOff':
      return (ctx.totalCompleted ?? 0) >= 1;
    case 'chart':
      return true;
    case 'allDone':
      return (ctx.dueToday ?? 0) >= ALL_DONE_MIN_DUE && ctx.remainingToday === 0;
    case 'laterDay':
      return (
        state.installDay !== null &&
        ctx.today > state.installDay &&
        (ctx.totalCompleted ?? 0) >= LATER_DAY_MIN_COMPLETED
      );
    case 'purchase':
      return true;
  }
}

/**
 * The moment that should ask now, or null. Candidates are the moments the
 * caller's event could satisfy, in priority order.
 */
export function pickReviewMoment(
  candidates: ReviewMoment[],
  state: ReviewState,
  ctx: ReviewContext
): ReviewMoment | null {
  if (ctx.launchOfferFree) return null;
  if (state.askedThisLaunch) return null;
  const last = lastAskMs(state);
  // A clock set back before the last ask also counts as too soon.
  if (last !== null && ctx.nowMs - last < MIN_DAYS_BETWEEN_ASKS * DAY_MS) return null;
  for (const m of candidates) {
    if (!isMomentUsed(m, state) && momentConditionMet(m, state, ctx)) return m;
  }
  return null;
}
