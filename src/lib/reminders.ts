import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/** Daily local reminders work on iOS/Android only; browsers can't schedule them. */
export const remindersSupported = Platform.OS !== 'web';

/** Days of reminders scheduled ahead; topped up whenever the app opens. */
const DAYS_AHEAD = 7;

export interface ReminderTime {
  hour: number;
  minute: number;
}

export interface Reminder {
  at: number;
  title: string;
  body: string;
}

/**
 * The reminders to schedule from `now`: one a day at `time`, skipping today once the day's goal
 * is met. Today's mentions the streak at stake; later days can't know it yet.
 */
export function planReminders(
  now: number,
  time: ReminderTime,
  today: { goalMet: boolean; streak: number; reviewed: number; goal: number },
  days = DAYS_AHEAD,
): Reminder[] {
  const out: Reminder[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    d.setHours(time.hour, time.minute, 0, 0);
    if (d.getTime() <= now) continue;
    if (i === 0) {
      if (today.goalMet) continue;
      const left = Math.max(1, today.goal - today.reviewed);
      out.push({
        at: d.getTime(),
        title: today.streak > 0 ? `Keep your ${today.streak}-day streak` : 'Time to practice',
        body:
          today.reviewed > 0
            ? `${left} more review${left === 1 ? '' : 's'} to reach today's goal.`
            : 'A few minutes of reviews keeps your words fresh.',
      });
    } else {
      out.push({ at: d.getTime(), title: 'Time to practice', body: 'A few minutes of reviews keeps your words fresh.' });
    }
  }
  return out;
}

/**
 * Replaces scheduled reminders with `plan` (or clears them when null). `ask` requests permission if
 * needed, as when the learner turns reminders on; background refreshes never prompt. Returns false
 * without permission.
 */
export async function scheduleReminders(plan: Reminder[] | null, { ask = false } = {}): Promise<boolean> {
  if (!remindersSupported) return false;
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!plan) return true;
  const { granted } = ask ? await Notifications.requestPermissionsAsync() : await Notifications.getPermissionsAsync();
  if (!granted) return false;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('reminders', {
      name: 'Daily reminder',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  for (const r of plan) {
    await Notifications.scheduleNotificationAsync({
      content: { title: r.title, body: r.body },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: r.at, channelId: 'reminders' },
    });
  }
  return true;
}
