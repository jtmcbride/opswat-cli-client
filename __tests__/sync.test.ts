import { newSrs, schedule } from '@/lib/srs';
import { markAllDirty, syncOnce, type Ledger, type Local, type Remote, type Row } from '@/lib/sync';
import { applyItems, changedKeys, jsonEqual, type Synced } from '@/lib/syncItems';
import type { DictEntry, KnownWord, Settings } from '@/lib/types';

/** In-memory stand-in for the sync_items table, with the same last-write-wins trigger. */
class FakeServer implements Remote {
  rows = new Map<string, Row>();
  seq = 0;
  async pull(after: number, limit: number) {
    return [...this.rows.values()]
      .filter((r) => r.seq > after)
      .sort((a, b) => a.seq - b.seq)
      .slice(0, limit)
      .map((r) => JSON.parse(JSON.stringify(r)) as Row);
  }
  async push(rows: Omit<Row, 'seq'>[]) {
    for (const r of rows) {
      const old = this.rows.get(r.key);
      if (old && r.updated_at < old.updated_at) continue;
      this.rows.set(r.key, { ...JSON.parse(JSON.stringify(r)), seq: ++this.seq });
    }
  }
}

const settings: Settings = {
  activeLang: 'es',
  nativeLang: 'English',
  reviewDirection: 'target',
  aiModel: 'm',
  speechRate: 'normal',
  autoSpeak: false,
  reviewStyle: 'mixed',
  listening: true,
  retention: 0.9,
  dailyNewLimit: 20,
  dailyGoal: 20,
  reminder: null,
  speaking: true,
  chatAutoSpeak: false,
  fsrsWeights: null,
  fsrsFit: null,
  transcriptionEngine: 'openai',
  localModel: null,
};

const empty = (): Synced => ({
  settings,
  customLanguages: [],
  words: [],
  userDicts: [],
  extraSentences: {},
  chats: {},
  chatScenarios: {},
  texts: [],
  podcasts: [],
  activity: {},
  reviewLog: {},
});

/** A device: local state with change tracking like the app's store subscriber. */
class Device {
  state = empty();
  dirty: Record<string, number> = {};
  cursor = 0;
  dicts = new Map<string, DictEntry[]>();
  clock = 1000;
  ledger: Ledger = {
    cursor: () => this.cursor,
    setCursor: (c) => (this.cursor = c),
    dirty: () => this.dirty,
    markDirty: (keys, t) => keys.forEach((k) => (this.dirty[k] = Math.max(this.dirty[k] ?? t, t))),
    clean: (k, t) => {
      if (this.dirty[k] !== undefined && this.dirty[k] <= t) delete this.dirty[k];
    },
  };
  local: Local = {
    get: () => this.state,
    apply: (patch) => (this.state = { ...this.state, ...patch }),
    loadDict: async (id) => this.dicts.get(id) ?? [],
    saveDict: async (id, e) => void this.dicts.set(id, e),
    deleteDict: async (id) => void this.dicts.delete(id),
  };
  constructor(public server: FakeServer) {}
  edit(fn: (s: Synced) => Partial<Synced>) {
    const next = { ...this.state, ...fn(this.state) };
    this.ledger.markDirty(changedKeys(this.state, next), ++this.clock);
    this.state = next;
  }
  sync() {
    return syncOnce(this.local, this.server, this.ledger);
  }
}

const word = (w: string, id = w, lang = 'es'): KnownWord => ({ id, lang, word: w, gloss: w, addedAt: 1, srs: newSrs(1) });

describe('changedKeys', () => {
  it('finds added, edited and removed items by reference', () => {
    const a = word('casa');
    const b = word('perro');
    const s1 = { ...empty(), words: [a, b] };
    const s2 = { ...s1, words: [{ ...a, gloss: 'house' }, word('gato')] };
    expect(changedKeys(s1, s2).sort()).toEqual(['word:es:casa', 'word:es:gato', 'word:es:perro']);
    expect(changedKeys(s1, { ...s1 })).toEqual([]);
  });

  it('tracks chats, settings and activity', () => {
    const s1 = empty();
    const s2 = {
      ...s1,
      chats: { es: [{ role: 'user' as const, text: 'hola' }] },
      settings: { ...settings, dailyGoal: 30 },
      activity: { es: { '2026-10-06': { reviews: 1, again: 0, added: 0 } } },
    };
    expect(changedKeys(s1, s2).sort()).toEqual(['activity:es:2026-10-06', 'chat:es', 'settings']);
  });
});

describe('applyItems', () => {
  it('keeps device-only settings and local word ids', () => {
    const s = { ...empty(), settings: { ...settings, reminder: { hour: 9, minute: 0 } }, words: [word('casa', 'local')] };
    const patch = applyItems(
      s,
      new Map<string, unknown>([
        ['settings', { ...settings, dailyGoal: 50, reminder: null }],
        ['word:es:casa', { ...word('casa', 'remote'), gloss: 'house' }],
      ]),
    );
    expect(patch.settings).toMatchObject({ dailyGoal: 50, reminder: { hour: 9, minute: 0 } });
    expect(patch.words).toEqual([expect.objectContaining({ id: 'local', gloss: 'house' })]);
  });
});

describe('podcasts', () => {
  it('syncs saved podcasts keyed by language and feed URL', () => {
    const pod = { lang: 'es', url: 'https://feeds.example.com/cafe', title: 'Café', addedAt: 1, seenAt: 1 };
    const s1 = empty();
    const s2 = { ...s1, podcasts: [pod] };
    expect(changedKeys(s1, s2)).toEqual(['podcast:es:https://feeds.example.com/cafe']);
    const patch = applyItems(s1, new Map([['podcast:es:https://feeds.example.com/cafe', { ...pod, seenAt: 5 }]]));
    expect(patch.podcasts).toEqual([{ ...pod, seenAt: 5 }]);
    expect(applyItems(s2, new Map([['podcast:es:https://feeds.example.com/cafe', undefined]])).podcasts).toEqual([]);
  });
});

describe('jsonEqual', () => {
  it('ignores key order and undefined fields', () => {
    expect(jsonEqual({ a: 1, b: [1, { c: 2 }] }, { b: [1, { c: 2 }], a: 1, d: undefined })).toBe(true);
    expect(jsonEqual({ a: 1 }, { a: 2 })).toBe(false);
    expect(jsonEqual([1], { 0: 1 })).toBe(false);
  });
});

describe('syncOnce', () => {
  it('merges two devices that already had data', async () => {
    const server = new FakeServer();
    const phone = new Device(server);
    const web = new Device(server);
    phone.state.words = [word('casa'), word('perro')];
    web.state.words = [word('casa', 'other'), word('gato')];
    markAllDirty(phone.local, phone.ledger);
    markAllDirty(web.local, web.ledger);

    await phone.sync();
    await web.sync();
    await phone.sync();

    const words = (d: Device) => d.state.words.map((w) => w.word).sort();
    expect(words(phone)).toEqual(['casa', 'gato', 'perro']);
    expect(words(web)).toEqual(['casa', 'gato', 'perro']);
    expect(server.rows.size).toBe(4); // three words + settings
    expect(phone.dirty).toEqual({});
  });

  it('propagates edits and deletions, newest edit winning', async () => {
    const server = new FakeServer();
    const a = new Device(server);
    const b = new Device(server);
    a.edit(() => ({ words: [word('casa'), word('perro')] }));
    await a.sync();
    await b.sync();
    expect(b.state.words).toHaveLength(2);

    // Both review "casa" offline; b's review is later.
    a.edit((s) => ({ words: s.words.map((w) => (w.word === 'casa' ? { ...w, srs: schedule(w.srs, 'again', 5000) } : w)) }));
    b.clock = 2000;
    b.edit((s) => ({ words: s.words.map((w) => (w.word === 'casa' ? { ...w, srs: schedule(w.srs, 'easy', 6000) } : w)) }));
    // a also deletes "perro".
    a.edit((s) => ({ words: s.words.filter((w) => w.word !== 'perro') }));

    await b.sync();
    await a.sync();
    await b.sync();
    for (const d of [a, b]) {
      expect(d.state.words.map((w) => w.word)).toEqual(['casa']);
      expect(d.state.words[0].srs.lapses).toBe(0); // b's "easy" wins
    }
    expect(server.rows.get('word:es:perro')?.deleted).toBe(true);
  });

  it('adds up activity logged on both devices the same day', async () => {
    const server = new FakeServer();
    const a = new Device(server);
    const b = new Device(server);
    a.edit(() => ({ activity: { es: { d: { reviews: 10, again: 1, added: 0 } } } }));
    b.edit(() => ({ activity: { es: { d: { reviews: 4, again: 2, added: 3 } } } }));
    await a.sync();
    await b.sync();
    await a.sync();
    expect(a.state.activity.es.d).toEqual({ reviews: 10, again: 2, added: 3 });
    expect(b.state.activity.es.d).toEqual({ reviews: 10, again: 2, added: 3 });
  });

  it('keeps every review logged on either device', async () => {
    const server = new FakeServer();
    const a = new Device(server);
    const b = new Device(server);
    a.edit(() => ({ reviewLog: { d: [[1, 'es:casa', 0, 3, 1]] } }));
    b.edit(() => ({ reviewLog: { d: [[2, 'es:gato', 1, 1, 0]] } }));
    await a.sync();
    await b.sync();
    await a.sync();
    for (const d of [a, b]) expect(d.state.reviewLog.d.map((e) => e[1])).toEqual(['es:casa', 'es:gato']);
  });

  it('syncs imported dictionaries with their entries', async () => {
    const server = new FakeServer();
    const a = new Device(server);
    const b = new Device(server);
    const entries: DictEntry[] = [{ lemma: 'kot', gloss: 'cat' }];
    a.dicts.set('d1', entries);
    a.edit(() => ({ userDicts: [{ id: 'd1', lang: 'pl', name: 'Polish', count: 1, enabled: true, importedAt: 5 }] }));
    await a.sync();
    await b.sync();
    expect(b.state.userDicts.map((d) => d.name)).toEqual(['Polish']);
    expect(b.dicts.get('d1')).toEqual(entries);

    b.edit(() => ({ userDicts: [] }));
    await b.sync();
    await a.sync();
    expect(a.state.userDicts).toEqual([]);
    expect(a.dicts.has('d1')).toBe(false);
  });

  it('does not re-apply its own pushes', async () => {
    const server = new FakeServer();
    const a = new Device(server);
    a.edit(() => ({ words: [word('casa')] }));
    await a.sync();
    const before = a.state.words;
    const r = await a.sync();
    expect(r.pulled).toBe(0);
    expect(a.state.words).toBe(before);
  });
});
