import { Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import { completeTask, countCompletions, getCompletionsBetween, getTasks, Member, Task, todayIso } from './db';
import { maybeRequestReview } from './reviews';

/** Counts for the checkOff and allDone rating moments; today's list is counted like the Today tab (everyone). */
async function checkOffFacts(today: string) {
  const [tasks, doneToday, totalCompleted] = await Promise.all([
    getTasks(),
    getCompletionsBetween(today, today),
    countCompletions(),
  ]);
  const remainingToday = tasks.filter((t) => t.nextDue <= today).length;
  const doneTasks = new Set(doneToday.map((c) => c.taskId)).size;
  return { totalCompleted, remainingToday, dueToday: remainingToday + doneTasks };
}

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
    // Rating moments: the first check-off (as in 1.0.2), then the first fully cleared day.
    maybeRequestReview(['checkOff', 'allDone'], () => checkOffFacts(today));
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
