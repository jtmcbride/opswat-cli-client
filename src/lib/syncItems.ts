import type { AppState } from '@/store/useStore';

import type { DayActivity } from './activity';
import type { ChatTurn } from './ai';
import { migrateSrs } from './srs';
import { normalize } from './tokenize';
import type { CustomLanguage, KnownWord, ReadingText, SentencePair, Settings, UserDictMeta } from './types';

/**
 * The synced parts of the app state, split into items that merge independently across devices:
 * `word:<lang>:<word>`, `text:<id>`, `chat:<lang>`, `settings`, `lang:<code>`, `sentences:<lang>`,
 * `activity:<lang>:<day>` and `dict:<id>`. Words are keyed by spelling, so the same word added on
 * two devices becomes one item.
 */
export type Synced = Pick<
  AppState,
  'settings' | 'customLanguages' | 'words' | 'userDicts' | 'extraSentences' | 'chats' | 'chatScenarios' | 'texts' | 'activity'
>;

interface Item {
  key: string;
  value: unknown;
  /** Store objects the value is built from; an item changed when any of them did. */
  refs: unknown[];
}

interface Kind {
  slices: (keyof Synced)[];
  items(s: Synced): Item[];
  /** State patch applying remote values (`upserts`) and deletions; keys exclude the kind prefix. */
  apply(s: Synced, upserts: Map<string, unknown>, deletes: Set<string>): Partial<Synced>;
}

/** Settings that only make sense on the device that set them. */
type DeviceSettings = 'reminder';
const deviceOnly = ({ reminder: _, ...rest }: Settings): Omit<Settings, DeviceSettings> => rest;

const wordKey = (w: KnownWord) => `${w.lang}:${normalize(w.word)}`;

function applyList<T>(
  list: T[],
  keyOf: (x: T) => string,
  upserts: Map<string, unknown>,
  deletes: Set<string>,
  fromRemote: (value: unknown, local: T | undefined) => T,
): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const x of list) {
    const k = keyOf(x);
    seen.add(k);
    if (deletes.has(k)) continue;
    out.push(upserts.has(k) ? fromRemote(upserts.get(k), x) : x);
  }
  for (const [k, v] of upserts) if (!seen.has(k)) out.push(fromRemote(v, undefined));
  return out;
}

function applyRecord<T>(rec: Record<string, T>, upserts: Map<string, unknown>, deletes: Set<string>): Record<string, T> {
  const out = { ...rec };
  for (const k of deletes) delete out[k];
  for (const [k, v] of upserts) out[k] = v as T;
  return out;
}

const KINDS: Record<string, Kind> = {
  word: {
    slices: ['words'],
    items: (s) => s.words.map((w) => ({ key: wordKey(w), value: w, refs: [w] })),
    apply: (s, up, del) => ({
      // Keep the local id so open screens keep pointing at the word.
      words: applyList(s.words, wordKey, up, del, (v, local) => {
        const w = v as KnownWord;
        return { ...w, id: local?.id ?? w.id, srs: migrateSrs(w.srs) };
      }),
    }),
  },
  text: {
    slices: ['texts'],
    items: (s) => s.texts.map((t) => ({ key: t.id, value: t, refs: [t] })),
    apply: (s, up, del) => ({
      texts: applyList(s.texts, (t) => t.id, up, del, (v) => v as ReadingText).sort((a, b) => b.createdAt - a.createdAt),
    }),
  },
  chat: {
    slices: ['chats', 'chatScenarios'],
    items: (s) =>
      [...new Set([...Object.keys(s.chats), ...Object.keys(s.chatScenarios)])].map((lang) => ({
        key: lang,
        value: { turns: s.chats[lang] ?? [], scenario: s.chatScenarios[lang] ?? null },
        refs: [s.chats[lang], s.chatScenarios[lang]],
      })),
    apply: (s, up, del) => {
      const chats = { ...s.chats };
      const chatScenarios = { ...s.chatScenarios };
      for (const lang of del) {
        delete chats[lang];
        delete chatScenarios[lang];
      }
      for (const [lang, v] of up) {
        const { turns, scenario } = v as { turns: ChatTurn[]; scenario: string | null };
        chats[lang] = turns;
        chatScenarios[lang] = scenario ?? undefined;
      }
      return { chats, chatScenarios };
    },
  },
  settings: {
    slices: ['settings'],
    items: (s) => [{ key: '', value: deviceOnly(s.settings), refs: [s.settings] }],
    apply: (s, up) =>
      up.has('') ? { settings: { ...s.settings, ...(up.get('') as Partial<Settings>), reminder: s.settings.reminder } } : {},
  },
  lang: {
    slices: ['customLanguages'],
    items: (s) => s.customLanguages.map((l) => ({ key: l.code, value: l, refs: [l] })),
    apply: (s, up, del) => ({
      customLanguages: applyList(s.customLanguages, (l) => l.code, up, del, (v) => v as CustomLanguage),
    }),
  },
  sentences: {
    slices: ['extraSentences'],
    items: (s) => Object.entries(s.extraSentences).map(([lang, list]) => ({ key: lang, value: list, refs: [list] })),
    apply: (s, up, del) => ({ extraSentences: applyRecord<SentencePair[]>(s.extraSentences, up, del) }),
  },
  activity: {
    slices: ['activity'],
    items: (s) =>
      Object.entries(s.activity).flatMap(([lang, days]) =>
        Object.entries(days).map(([day, a]) => ({ key: `${lang}:${day}`, value: a, refs: [a] })),
      ),
    apply: (s, up, del) => {
      const activity = { ...s.activity };
      const edit = (k: string, fn: (days: Record<string, DayActivity>, day: string) => void) => {
        const i = k.lastIndexOf(':');
        const lang = k.slice(0, i);
        const days = { ...activity[lang] };
        fn(days, k.slice(i + 1));
        activity[lang] = days;
      };
      for (const k of del) edit(k, (days, day) => delete days[day]);
      for (const [k, v] of up) edit(k, (days, day) => (days[day] = v as DayActivity));
      return { activity };
    },
  },
  dict: {
    slices: ['userDicts'],
    items: (s) => s.userDicts.map((d) => ({ key: d.id, value: d, refs: [d] })),
    apply: (s, up, del) => ({ userDicts: applyList(s.userDicts, (d) => d.id, up, del, (v) => v as UserDictMeta) }),
  },
};

const join = (kind: string, sub: string) => (sub ? `${kind}:${sub}` : kind);

/** Splits `word:es:casa` into `['word', 'es:casa']`. */
export function splitKey(key: string): [string, string] {
  const i = key.indexOf(':');
  return i < 0 ? [key, ''] : [key.slice(0, i), key.slice(i + 1)];
}

export function allItems(s: Synced): Map<string, unknown> {
  const out = new Map<string, unknown>();
  for (const [kind, k] of Object.entries(KINDS)) for (const it of k.items(s)) out.set(join(kind, it.key), it.value);
  return out;
}

/** Keys of items added, changed or removed between two states (by reference, so it's cheap). */
export function changedKeys(prev: Synced, next: Synced): string[] {
  const changed: string[] = [];
  for (const [kind, k] of Object.entries(KINDS)) {
    if (k.slices.every((sl) => prev[sl] === next[sl])) continue;
    const before = new Map(k.items(prev).map((it) => [it.key, it.refs]));
    for (const it of k.items(next)) {
      const refs = before.get(it.key);
      before.delete(it.key);
      if (!refs || refs.some((r, i) => r !== it.refs[i])) changed.push(join(kind, it.key));
    }
    for (const key of before.keys()) changed.push(join(kind, key));
  }
  return changed;
}

/** State patch applying remote item values (`undefined` = deleted). Unknown kinds are ignored. */
export function applyItems(s: Synced, items: Map<string, unknown>): Partial<Synced> {
  const byKind = new Map<string, { up: Map<string, unknown>; del: Set<string> }>();
  for (const [key, value] of items) {
    const [kind, sub] = splitKey(key);
    if (!KINDS[kind]) continue;
    const g = byKind.get(kind) ?? { up: new Map(), del: new Set() };
    if (value === undefined) g.del.add(sub);
    else g.up.set(sub, value);
    byKind.set(kind, g);
  }
  let patch: Partial<Synced> = {};
  for (const [kind, { up, del }] of byKind) patch = { ...patch, ...KINDS[kind].apply({ ...s, ...patch }, up, del) };
  return patch;
}

/** Best guess at when a pre-existing item last changed, used when a device first joins an account. */
export function itemTime(key: string, value: unknown): number {
  const [kind] = splitKey(key);
  if (kind === 'word') {
    const w = value as KnownWord;
    return w.srs.lastReview ?? w.addedAt;
  }
  if (kind === 'text') return (value as ReadingText).createdAt;
  if (kind === 'dict') return (value as UserDictMeta).importedAt;
  return 0;
}

/** Same-day activity from two devices: keep the larger tally of each count. */
export function mergeActivity(a: DayActivity, b: DayActivity): DayActivity {
  return { reviews: Math.max(a.reviews, b.reviews), again: Math.max(a.again, b.again), added: Math.max(a.added, b.added) };
}

/** Structural equality for JSON values (key order ignored, as Postgres `jsonb` reorders keys). */
export function jsonEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a).filter((k) => (a as Record<string, unknown>)[k] !== undefined);
  const kb = Object.keys(b).filter((k) => (b as Record<string, unknown>)[k] !== undefined);
  if (ka.length !== kb.length) return false;
  return ka.every((k) => jsonEqual((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]));
}
