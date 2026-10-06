import { AppState } from 'react-native';

import { dayKey, streak } from '@/lib/activity';
import { planReminders, remindersSupported, scheduleReminders, type ReminderTime } from '@/lib/reminders';

import { useStore, type AppState as Store } from './useStore';

function today(s: Store, now: number) {
  const days = s.activity[s.settings.activeLang];
  const reviewed = days?.[dayKey(now)]?.reviews ?? 0;
  const goal = Math.max(1, s.settings.dailyGoal);
  return { reviewed, goal, goalMet: reviewed >= goal, streak: streak(days, now) };
}

/** The reminders for `time` given today's progress in the active language. */
export function reminderPlan(time: ReminderTime, now = Date.now()) {
  return planReminders(now, time, today(useStore.getState(), now));
}

let queue = Promise.resolve();

/** Reschedules one at a time, so overlapping refreshes can't interleave cancels and schedules. */
function refresh() {
  queue = queue
    .then(async () => {
      const { reminder } = useStore.getState().settings;
      if (reminder) await scheduleReminders(reminderPlan(reminder));
    })
    .catch(() => {});
}

let started = false;

/**
 * Keeps scheduled reminders current: today's is dropped once the goal is met, and the week ahead
 * is topped up whenever the app comes to the foreground.
 */
export function startReminderSync() {
  if (!remindersSupported || started) return;
  started = true;
  let last = '';
  const check = () => {
    const s = useStore.getState();
    const now = Date.now();
    const { goalMet } = today(s, now);
    const key = JSON.stringify([dayKey(now), goalMet, s.settings.reminder, s.settings.activeLang, s.settings.dailyGoal]);
    if (key === last) return;
    last = key;
    refresh();
  };
  check();
  useStore.subscribe(check);
  AppState.addEventListener('change', (state) => {
    if (state !== 'active') return;
    last = '';
    check();
  });
}
