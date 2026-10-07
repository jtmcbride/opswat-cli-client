import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { Ledger } from '@/lib/sync';

export type SyncStatus = 'off' | 'idle' | 'syncing' | 'error';

export interface SyncState {
  /** Account the ledger belongs to; a different sign-in starts a fresh merge. */
  userId: string | null;
  cursor: number;
  dirty: Record<string, number>;
  lastSync: number | null;

  // Not persisted.
  email: string | null;
  status: SyncStatus;
  error: string | null;
}

export const useSync = create<SyncState>()(
  persist(
    (): SyncState => ({
      userId: null,
      cursor: 0,
      dirty: {},
      lastSync: null,
      email: null,
      status: 'off',
      error: null,
    }),
    {
      name: 'lingo.sync',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ userId, cursor, dirty, lastSync }) => ({ userId, cursor, dirty, lastSync }),
    },
  ),
);

export const ledger: Ledger = {
  cursor: () => useSync.getState().cursor,
  setCursor: (cursor) => useSync.setState({ cursor }),
  dirty: () => useSync.getState().dirty,
  markDirty: (keys, t) => {
    if (!keys.length) return;
    const dirty = { ...useSync.getState().dirty };
    for (const k of keys) dirty[k] = Math.max(dirty[k] ?? t, t);
    useSync.setState({ dirty });
  },
  clean: (key, t) => {
    const { dirty } = useSync.getState();
    if (dirty[key] === undefined || dirty[key] > t) return;
    const { [key]: _, ...rest } = dirty;
    useSync.setState({ dirty: rest });
  },
};
