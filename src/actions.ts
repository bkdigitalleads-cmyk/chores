import { Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import { completeTask, countCompletions, Member, Task, todayIso } from './db';
import { maybeRequestReview } from './reviews';

/**
 * Mark a chore done. If it's nobody's in particular and more than one person
 * shares the house, ask who did it so the chart and points stay fair. With
 * just one person in the household, they get the credit.
 */
export function checkOff(task: Task, members: Member[], onDone: () => void): void {
  const today = todayIso();
  const finish = async (by: number | null) => {
    await completeTask(task.id, by, today);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    onDone();
    try {
      if ((await countCompletions()) >= 3) maybeRequestReview();
    } catch {
      // never let the review prompt affect the app
    }
  };
  if (task.memberId == null && members.length > 1) {
    Alert.alert('Who did it?', task.name, [
      ...members.map((m) => ({ text: m.name, onPress: () => finish(m.id) })),
      { text: 'Just mark it done', onPress: () => finish(null) },
      { text: 'Cancel', style: 'cancel' as const },
    ]);
    return;
  }
  finish(task.memberId == null && members.length === 1 ? members[0].id : null);
}
