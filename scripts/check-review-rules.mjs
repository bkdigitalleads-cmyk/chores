// Checks for the rating-prompt rules in src/reviewRules.ts.
// Run: npm test   (needs `npm ci` first; uses only Node and the TypeScript already in devDependencies)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const file = fileURLToPath(new URL('../src/reviewRules.ts', import.meta.url));
const js = ts.transpileModule(readFileSync(file, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const mod = { exports: {} };
new Function('module', 'exports', js)(mod, mod.exports);
const { pickReviewMoment, isLaunchOfferFree, MIN_DAYS_BETWEEN_ASKS } = mod.exports;

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.parse('2026-11-24T15:00:00Z');
const fresh = (over = {}) => ({ fired: {}, legacyAsked: false, installDay: '2026-11-20', askedThisLaunch: false, ...over });
const ctx = (over = {}) => ({
  nowMs: NOW,
  today: '2026-11-24',
  launchOfferFree: false,
  totalCompleted: 5,
  dueToday: 4,
  remainingToday: 2,
  ...over,
});
const ago = (days) => new Date(NOW - days * DAY).toISOString();
const ALL = ['checkOff', 'chart', 'allDone', 'laterDay', 'purchase'];

test('each moment fires on a fresh install', () => {
  for (const m of ALL) {
    const c = m === 'allDone' ? ctx({ remainingToday: 0 }) : ctx();
    assert.equal(pickReviewMoment([m], fresh(), c), m, m);
  }
});

test('each moment fires at most once ever', () => {
  for (const m of ALL) {
    const c = m === 'allDone' ? ctx({ remainingToday: 0 }) : ctx();
    assert.equal(pickReviewMoment([m], fresh({ fired: { [m]: ago(400) } }), c), null, m);
  }
});

test('a used moment does not block the others', () => {
  const s = fresh({ fired: { checkOff: ago(10) } });
  assert.equal(pickReviewMoment(['checkOff', 'allDone'], s, ctx({ remainingToday: 0 })), 'allDone');
  assert.equal(pickReviewMoment(['chart'], s, ctx()), 'chart');
});

test('at most one ask per app launch', () => {
  for (const m of ALL) {
    const c = m === 'allDone' ? ctx({ remainingToday: 0 }) : ctx();
    assert.equal(pickReviewMoment([m], fresh({ askedThisLaunch: true }), c), null, m);
  }
});

test('never two asks within 3 days', () => {
  assert.equal(MIN_DAYS_BETWEEN_ASKS, 3);
  const c = ctx();
  assert.equal(pickReviewMoment(['chart'], fresh({ fired: { checkOff: ago(0) } }), c), null);
  assert.equal(pickReviewMoment(['chart'], fresh({ fired: { checkOff: ago(2.99) } }), c), null);
  assert.equal(pickReviewMoment(['chart'], fresh({ fired: { checkOff: ago(3) } }), c), 'chart');
  assert.equal(pickReviewMoment(['chart'], fresh({ fired: { checkOff: ago(30) } }), c), 'chart');
  // The newest ask counts, whichever moment it was.
  assert.equal(pickReviewMoment(['chart'], fresh({ fired: { checkOff: ago(30), purchase: ago(1) } }), c), null);
  // A clock set back before the last ask is also too soon.
  assert.equal(pickReviewMoment(['chart'], fresh({ fired: { checkOff: ago(-1) } }), c), null);
});

test('old 1.0.2 flag counts as the first check-off ask only', () => {
  const s = fresh({ legacyAsked: true });
  assert.equal(pickReviewMoment(['checkOff'], s, ctx()), null);
  assert.equal(pickReviewMoment(['checkOff', 'allDone'], s, ctx({ remainingToday: 0 })), 'allDone');
  for (const m of ['chart', 'laterDay', 'purchase']) assert.equal(pickReviewMoment([m], s, ctx()), m, m);
  // The old flag has no date, so it does not start a 3-day gap.
  assert.equal(pickReviewMoment(['chart'], s, ctx()), 'chart');
});

test('launch offer free (or offering unknown) blocks every moment', () => {
  assert.equal(isLaunchOfferFree(null), true);
  assert.equal(isLaunchOfferFree(undefined), true);
  assert.equal(isLaunchOfferFree({ lifetime: { product: { price: 0 } } }), true);
  assert.equal(isLaunchOfferFree({ lifetime: { product: { price: 59.99 } } }), false);
  assert.equal(isLaunchOfferFree({ lifetime: null }), false);
  for (const m of ALL) {
    const c = ctx({ launchOfferFree: true, remainingToday: 0 });
    assert.equal(pickReviewMoment([m], fresh(), c), null, m);
  }
});

test('a held-back moment stays available for later', () => {
  const blocked = pickReviewMoment(['chart'], fresh(), ctx({ launchOfferFree: true }));
  assert.equal(blocked, null);
  assert.equal(pickReviewMoment(['chart'], fresh(), ctx()), 'chart');
});

test('first check-off needs at least one completion', () => {
  assert.equal(pickReviewMoment(['checkOff'], fresh(), ctx({ totalCompleted: 0 })), null);
  assert.equal(pickReviewMoment(['checkOff'], fresh(), ctx({ totalCompleted: 1 })), 'checkOff');
});

test('allDone: every chore on today\'s list done, on a day with at least 3 due', () => {
  const s = fresh({ fired: { checkOff: ago(10) } });
  assert.equal(pickReviewMoment(['allDone'], s, ctx({ dueToday: 3, remainingToday: 0 })), 'allDone');
  assert.equal(pickReviewMoment(['allDone'], s, ctx({ dueToday: 8, remainingToday: 0 })), 'allDone');
  assert.equal(pickReviewMoment(['allDone'], s, ctx({ dueToday: 2, remainingToday: 0 })), null);
  assert.equal(pickReviewMoment(['allDone'], s, ctx({ dueToday: 3, remainingToday: 1 })), null);
  assert.equal(pickReviewMoment(['allDone'], s, ctx({ dueToday: undefined, remainingToday: undefined })), null);
});

test('check-off event: first check-off wins over allDone, allDone fires on a later clearing', () => {
  const c = ctx({ dueToday: 3, remainingToday: 0 });
  assert.equal(pickReviewMoment(['checkOff', 'allDone'], fresh(), c), 'checkOff');
  assert.equal(pickReviewMoment(['checkOff', 'allDone'], fresh({ fired: { checkOff: ago(4) } }), c), 'allDone');
});

test('laterDay: a later calendar day than the install day, with at least 3 completions', () => {
  const s = fresh({ installDay: '2026-11-23' });
  assert.equal(pickReviewMoment(['laterDay'], s, ctx({ totalCompleted: 3 })), 'laterDay');
  assert.equal(pickReviewMoment(['laterDay'], s, ctx({ totalCompleted: 2 })), null);
  assert.equal(pickReviewMoment(['laterDay'], s, ctx({ totalCompleted: undefined })), null);
  // Same day as the install (or the first 1.0.3 launch for updaters): never.
  assert.equal(pickReviewMoment(['laterDay'], fresh({ installDay: '2026-11-24' }), ctx({ totalCompleted: 50 })), null);
  // No install day recorded yet: never.
  assert.equal(pickReviewMoment(['laterDay'], fresh({ installDay: null }), ctx({ totalCompleted: 50 })), null);
  // Month and year boundaries compare as calendar days.
  assert.equal(
    pickReviewMoment(['laterDay'], fresh({ installDay: '2026-12-31' }), ctx({ today: '2027-01-01', totalCompleted: 3 })),
    'laterDay'
  );
});

test('chart is its own moment, separate from the first check-off', () => {
  const s = fresh({ fired: { checkOff: ago(5) } });
  assert.equal(pickReviewMoment(['chart'], s, ctx()), 'chart');
  assert.equal(pickReviewMoment(['chart'], fresh({ fired: { checkOff: ago(5), chart: ago(4) } }), ctx()), null);
});

test('a full lifetime of asks: five moments, each once, spaced at least 3 days', () => {
  let state = fresh({ installDay: '2026-11-01' });
  const fired = [];
  const start = Date.parse('2026-11-01T12:00:00Z');
  for (let day = 0; day < 60; day++) {
    for (const event of [['purchase'], ['checkOff', 'allDone'], ['chart'], ['laterDay']]) {
      const nowMs = start + day * DAY;
      const today = new Date(nowMs).toISOString().slice(0, 10);
      const m = pickReviewMoment(event, state, ctx({ nowMs, today, remainingToday: 0 }));
      if (m) {
        fired.push({ m, nowMs });
        state = { ...state, fired: { ...state.fired, [m]: new Date(nowMs).toISOString() }, askedThisLaunch: true };
      }
    }
    state = { ...state, askedThisLaunch: false }; // next day, next launch
  }
  assert.deepEqual(fired.map((f) => f.m).sort(), [...ALL].sort());
  for (let i = 1; i < fired.length; i++) assert.ok(fired[i].nowMs - fired[i - 1].nowMs >= 3 * DAY);
});
