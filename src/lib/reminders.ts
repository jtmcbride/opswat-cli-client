import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/** Daily local reminders work on iOS/Android only; browsers can't schedule them. */
export const remindersSupported = Platform.OS !== 'web';

/**
 * Replaces any scheduled reminder with a daily one at `hour:minute`, or clears it when `time` is
 * null. Returns false if notification permission was denied.
 */
export async function scheduleDailyReminder(time: { hour: number; minute: number } | null): Promise<boolean> {
  if (!remindersSupported) return false;
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!time) return true;
  const { granted } = await Notifications.requestPermissionsAsync();
  if (!granted) return false;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('reminders', {
      name: 'Daily reminder',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  await Notifications.scheduleNotificationAsync({
    content: { title: 'Time to practice', body: 'A few minutes of reviews keeps your streak going.' },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: time.hour, minute: time.minute, channelId: 'reminders' },
  });
  return true;
}
