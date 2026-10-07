import type { Session } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

import { deleteRemoteData, supabase, supabaseRemote } from '@/lib/supabase';
import { markAllDirty, syncOnce, type Local } from '@/lib/sync';
import { changedKeys } from '@/lib/syncItems';

import { deleteDictEntries, loadDictEntries, saveDictEntries } from './userDicts';
import { useStore } from './useStore';
import { ledger, useSync } from './useSync';

/** Wait after a local change before uploading, so a review session becomes one sync. */
const DEBOUNCE_MS = 3000;
/** While the app is open, also check for changes from other devices this often. */
const POLL_MS = 2 * 60 * 1000;

export const syncConfigured = supabase !== null;

let applying = false;
let running = false;
let again = false;
let timer: ReturnType<typeof setTimeout> | undefined;

const local: Local = {
  get: () => useStore.getState(),
  apply: (patch) => {
    applying = true;
    try {
      useStore.setState(patch);
    } finally {
      applying = false;
    }
  },
  loadDict: loadDictEntries,
  saveDict: saveDictEntries,
  deleteDict: deleteDictEntries,
};

export async function syncNow(): Promise<void> {
  const { userId } = useSync.getState();
  if (!supabase || !userId) return;
  if (running) {
    again = true;
    return;
  }
  running = true;
  clearTimeout(timer);
  useSync.setState({ status: 'syncing', error: null });
  try {
    await syncOnce(local, supabaseRemote(supabase, userId), ledger);
    useSync.setState({ status: 'idle', lastSync: Date.now() });
  } catch (e) {
    useSync.setState({ status: 'error', error: e instanceof Error ? e.message : String(e) });
  } finally {
    running = false;
  }
  if (again) {
    again = false;
    await syncNow();
  }
}

function scheduleSync() {
  clearTimeout(timer);
  timer = setTimeout(() => void syncNow(), DEBOUNCE_MS);
}

function onSession(session: Session | null) {
  if (!session) {
    useSync.setState({ userId: null, cursor: 0, dirty: {}, lastSync: null, email: null, status: 'off', error: null });
    return;
  }
  useSync.setState({ email: session.user.email ?? null });
  if (useSync.getState().userId !== session.user.id) {
    // New account on this device: merge everything already here into it.
    useSync.setState({ userId: session.user.id, cursor: 0, dirty: {}, lastSync: null });
    markAllDirty(local, ledger);
  }
  void syncNow();
}

let started = false;

/** Starts tracking local changes and syncing while signed in. Call once, after the app state loads. */
export async function startCloudSync() {
  const client = supabase;
  if (!client || started) return;
  started = true;
  if (!useSync.persist.hasHydrated()) await new Promise<void>((r) => useSync.persist.onFinishHydration(() => r()));

  useStore.subscribe((next, prev) => {
    if (applying || !useSync.getState().userId) return;
    const keys = changedKeys(prev, next);
    if (!keys.length) return;
    ledger.markDirty(keys, Date.now());
    scheduleSync();
  });

  // Supabase calls inside this callback can deadlock, so handle the session on the next tick.
  client.auth.onAuthStateChange((_event, session) => setTimeout(() => onSession(session), 0));

  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      if (Platform.OS !== 'web') void client.auth.startAutoRefresh();
      void syncNow();
    } else if (Platform.OS !== 'web') {
      void client.auth.stopAutoRefresh();
    }
  });
  setInterval(() => {
    if (AppState.currentState === 'active') void syncNow();
  }, POLL_MS);
}

export async function sendCode(email: string) {
  if (!supabase) return;
  const { error } = await supabase.auth.signInWithOtp({ email: email.trim() });
  if (error) throw new Error(error.message);
}

export async function verifyCode(email: string, code: string) {
  if (!supabase) return;
  const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'email' });
  if (error) throw new Error(error.message);
}

/** Uploads pending changes, then signs out. Local data stays on the device. */
export async function signOut() {
  if (!supabase) return;
  await syncNow();
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
}

/** Deletes this account's synced data from the server and signs out. */
export async function deleteCloudData() {
  const { userId } = useSync.getState();
  if (!supabase || !userId) return;
  await deleteRemoteData(supabase, userId);
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
}
