import AsyncStorage from '@react-native-async-storage/async-storage';
import * as StoreReview from 'expo-store-review';

const ASKED_KEY = 'chores.reviewAsked.v1';

/**
 * Ask for an App Store rating exactly once, at a moment of value: after the
 * first chore is checked off, or after the first printed chore chart.
 * Never solicited anywhere else. (Was the third check-off until 1.0.2: most
 * launch-offer installs never got that far, so they were never asked.)
 */
export async function maybeRequestReview(): Promise<void> {
  try {
    const asked = await AsyncStorage.getItem(ASKED_KEY);
    if (asked) return;
    if (!(await StoreReview.hasAction())) return;
    await AsyncStorage.setItem(ASKED_KEY, '1');
    setTimeout(() => {
      StoreReview.requestReview().catch(() => {});
    }, 1200);
  } catch {
    // never let review plumbing affect the app
  }
}
