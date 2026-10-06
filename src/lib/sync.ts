import type { DayActivity } from './activity';
import { allItems, applyItems, itemTime, jsonEqual, mergeActivity, splitKey, type Synced } from './syncItems';
import type { DictEntry, UserDictMeta } from './types';

/** A synced item as stored remotely. `data` is null for deletions. */
export interface Row {
  key: string;
  data: unknown;
  deleted: boolean;
  /** Client time of the change (ms); the newer write wins. */
  updated_at: number;
  /** Server write counter; pulls resume after the highest seen. */
  seq: number;
}

export interface Remote {
  /** Rows written after `seq`, oldest first. */
  pull(afterSeq: number, limit: number): Promise<Row[]>;
  /** Upserts rows; the server keeps whichever version of a row has the newer `updated_at`. */
  push(rows: Omit<Row, 'seq'>[]): Promise<void>;
}

export interface Local {
  get(): Synced;
  /** Applies remote changes without marking them as local edits. */
  apply(patch: Partial<Synced>): void;
  loadDict(id: string): Promise<DictEntry[]>;
  saveDict(id: string, entries: DictEntry[]): Promise<void>;
  deleteDict(id: string): Promise<void>;
}

/** Sync bookkeeping, kept on the device. */
export interface Ledger {
  cursor(): number;
  setCursor(seq: number): void;
  /** Items changed locally and not yet pushed, with the time of the change. */
  dirty(): Record<string, number>;
  markDirty(keys: string[], t: number): void;
  /** Clears a dirty mark unless the item changed again after `t`. */
  clean(key: string, t: number): void;
}

const PAGE = 500;
const PUSH_BATCH = 100;

/** Marks every local item for upload, e.g. when this device joins an account. */
export function markAllDirty(local: Local, ledger: Ledger) {
  const dirty = ledger.dirty();
  const byTime = new Map<number, string[]>();
  for (const [key, value] of allItems(local.get())) {
    if (key in dirty) continue;
    const t = itemTime(key, value);
    byTime.set(t, [...(byTime.get(t) ?? []), key]);
  }
  for (const [t, keys] of byTime) ledger.markDirty(keys, t);
}

/** Pulls remote changes, merges them into local state, then pushes local changes. */
export async function syncOnce(local: Local, remote: Remote, ledger: Ledger): Promise<{ pulled: number; pushed: number }> {
  let pulled = 0;
  for (;;) {
    const rows = await remote.pull(ledger.cursor(), PAGE);
    if (!rows.length) break;
    pulled += await applyRows(local, ledger, rows);
    ledger.setCursor(Math.max(ledger.cursor(), ...rows.map((r) => r.seq)));
    if (rows.length < PAGE) break;
  }

  let pushed = 0;
  const pending = Object.entries(ledger.dirty());
  for (let i = 0; i < pending.length; i += PUSH_BATCH) {
    const batch = pending.slice(i, i + PUSH_BATCH);
    const items = allItems(local.get());
    const rows = await Promise.all(
      batch.map(async ([key, t]) => {
        const value = items.get(key);
        let data: unknown = value ?? null;
        if (value !== undefined && splitKey(key)[0] === 'dict') {
          const meta = value as UserDictMeta;
          data = { meta, entries: await local.loadDict(meta.id) };
        }
        return { key, data, deleted: value === undefined, updated_at: t };
      }),
    );
    await remote.push(rows);
    for (const [key, t] of batch) ledger.clean(key, t);
    pushed += rows.length;
  }
  return { pulled, pushed };
}

async function applyRows(local: Local, ledger: Ledger, rows: Row[]): Promise<number> {
  const dirty = ledger.dirty();
  const items = allItems(local.get());
  const changes = new Map<string, unknown>();
  for (const row of rows) {
    const [kind, sub] = splitKey(row.key);
    const localT = dirty[row.key];
    const current = items.get(row.key);
    let value: unknown = row.deleted ? undefined : row.data;

    if (localT !== undefined) {
      if (kind === 'activity' && current !== undefined && value !== undefined) {
        // Both devices logged activity that day: combine, and push the combined tally.
        value = mergeActivity(current as DayActivity, value as DayActivity);
        ledger.markDirty([row.key], Math.max(localT, row.updated_at));
      } else if (localT > row.updated_at) {
        continue; // Our edit is newer; it gets pushed below.
      } else {
        ledger.clean(row.key, localT);
      }
    }

    if (kind === 'dict') {
      if (value === undefined) await local.deleteDict(sub);
      else {
        const { meta, entries } = value as { meta: UserDictMeta; entries: DictEntry[] };
        if (!jsonEqual(current, meta)) await local.saveDict(meta.id, entries);
        value = meta;
      }
    }
    // Our own pushes come back on the next pull; skip what we already have.
    if (value === undefined ? current === undefined : jsonEqual(current, value)) continue;
    changes.set(row.key, value);
  }
  if (changes.size) local.apply(applyItems(local.get(), changes));
  return changes.size;
}
