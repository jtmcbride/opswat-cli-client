import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { BUILTIN_LANGUAGES } from '@/data';
import { DEFAULT_MODEL, type ChatTurn } from '@/lib/ai';
import { newSrs, schedule } from '@/lib/srs';
import { normalize } from '@/lib/tokenize';
import type {
  CustomLanguage,
  DictEntry,
  Grade,
  KnownWord,
  LangCode,
  SentencePair,
  Settings,
  UserDictMeta,
} from '@/lib/types';

import { deleteDictEntries, saveDictEntries } from './userDicts';

const RECENT_LIMIT = 30;

export interface AppState {
  settings: Settings;
  customLanguages: CustomLanguage[];
  words: KnownWord[];
  userDicts: UserDictMeta[];
  /** Recently shown built-in sentence indexes per language, so practice doesn't repeat. */
  recentSentences: Record<LangCode, number[]>;
  /** AI-generated practice sentences per language. */
  extraSentences: Record<LangCode, SentencePair[]>;
  chats: Record<LangCode, ChatTurn[]>;

  setSettings: (patch: Partial<Settings>) => void;
  addWord: (lang: LangCode, word: string, gloss: string, context?: SentencePair) => KnownWord | null;
  addWords: (lang: LangCode, items: { word: string; gloss: string }[]) => number;
  updateWord: (id: string, patch: Partial<Pick<KnownWord, 'word' | 'gloss'>>) => void;
  removeWord: (id: string) => void;
  gradeWord: (id: string, grade: Grade) => void;
  addCustomLanguage: (lang: CustomLanguage) => void;
  importDictionary: (lang: LangCode, name: string, entries: DictEntry[]) => Promise<void>;
  toggleUserDict: (id: string) => void;
  removeUserDict: (id: string) => Promise<void>;
  markSentenceSeen: (lang: LangCode, key: number) => void;
  addExtraSentences: (lang: LangCode, sentences: SentencePair[]) => void;
  setChat: (lang: LangCode, turns: ChatTurn[]) => void;
  restore: (backup: Backup) => void;
}

export type Backup = Pick<
  AppState,
  'settings' | 'customLanguages' | 'words' | 'userDicts' | 'extraSentences' | 'chats'
> & { version: 1; dictEntries?: Record<string, DictEntry[]> };

const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      settings: {
        activeLang: 'es',
        nativeLang: 'English',
        reviewDirection: 'target',
        aiModel: DEFAULT_MODEL,
        speechRate: 'normal',
        autoSpeak: false,
        reviewStyle: 'mixed',
        listening: true,
      },
      customLanguages: [],
      words: [],
      userDicts: [],
      recentSentences: {},
      extraSentences: {},
      chats: {},

      setSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),

      addWord: (lang, word, gloss, context) => {
        const w = word.trim();
        if (!w) return null;
        const exists = get().words.some((k) => k.lang === lang && normalize(k.word) === normalize(w));
        if (exists) return null;
        const kw: KnownWord = {
          id: uid(),
          lang,
          word: w,
          gloss: gloss.trim(),
          addedAt: Date.now(),
          srs: newSrs(),
          ...(context ? { context: { text: context.text, translation: context.translation } } : {}),
        };
        set((s) => ({ words: [...s.words, kw] }));
        return kw;
      },

      addWords: (lang, items) => {
        const seen = new Set(get().words.filter((k) => k.lang === lang).map((k) => normalize(k.word)));
        const now = Date.now();
        const added: KnownWord[] = [];
        for (const { word, gloss } of items) {
          const n = normalize(word);
          if (!n || seen.has(n)) continue;
          seen.add(n);
          added.push({ id: uid(), lang, word: word.trim(), gloss: gloss.trim(), addedAt: now, srs: newSrs(now) });
        }
        if (added.length) set((s) => ({ words: [...s.words, ...added] }));
        return added.length;
      },

      updateWord: (id, patch) =>
        set((s) => ({ words: s.words.map((w) => (w.id === id ? { ...w, ...patch } : w)) })),

      removeWord: (id) => set((s) => ({ words: s.words.filter((w) => w.id !== id) })),

      gradeWord: (id, grade) =>
        set((s) => ({
          words: s.words.map((w) => (w.id === id ? { ...w, srs: schedule(w.srs, grade) } : w)),
        })),

      addCustomLanguage: (lang) =>
        set((s) =>
          s.customLanguages.some((l) => l.code === lang.code) ||
          BUILTIN_LANGUAGES.some((l) => l.code === lang.code)
            ? s
            : { customLanguages: [...s.customLanguages, lang] },
        ),

      importDictionary: async (lang, name, entries) => {
        const id = uid();
        await saveDictEntries(id, entries);
        const meta: UserDictMeta = { id, lang, name, count: entries.length, enabled: true, importedAt: Date.now() };
        set((s) => ({ userDicts: [...s.userDicts, meta] }));
      },

      toggleUserDict: (id) =>
        set((s) => ({ userDicts: s.userDicts.map((d) => (d.id === id ? { ...d, enabled: !d.enabled } : d)) })),

      removeUserDict: async (id) => {
        await deleteDictEntries(id);
        set((s) => ({ userDicts: s.userDicts.filter((d) => d.id !== id) }));
      },

      markSentenceSeen: (lang, key) =>
        set((s) => {
          const prev = (s.recentSentences[lang] ?? []).filter((k) => k !== key);
          return { recentSentences: { ...s.recentSentences, [lang]: [...prev, key].slice(-RECENT_LIMIT) } };
        }),

      addExtraSentences: (lang, sentences) =>
        set((s) => {
          const existing = s.extraSentences[lang] ?? [];
          const texts = new Set(existing.map((x) => x.text));
          const fresh = sentences.filter((x) => !texts.has(x.text));
          return { extraSentences: { ...s.extraSentences, [lang]: [...existing, ...fresh] } };
        }),

      setChat: (lang, turns) => set((s) => ({ chats: { ...s.chats, [lang]: turns } })),

      restore: (backup) => {
        for (const [id, entries] of Object.entries(backup.dictEntries ?? {})) void saveDictEntries(id, entries);
        set({
          settings: { ...get().settings, ...backup.settings },
          customLanguages: backup.customLanguages ?? [],
          words: backup.words ?? [],
          userDicts: backup.userDicts ?? [],
          extraSentences: backup.extraSentences ?? {},
          chats: backup.chats ?? {},
          recentSentences: {},
        });
      },
    }),
    {
      name: 'lingo.state',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      // Deep-merge settings so fields added in later versions get their defaults.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<AppState>;
        return { ...current, ...p, settings: { ...current.settings, ...p.settings } };
      },
      partialize: ({ settings, customLanguages, words, userDicts, recentSentences, extraSentences, chats }) => ({
        settings,
        customLanguages,
        words,
        userDicts,
        recentSentences,
        extraSentences,
        chats,
      }),
    },
  ),
);

export function useLanguages() {
  const custom = useStore((s) => s.customLanguages);
  return [...BUILTIN_LANGUAGES, ...custom];
}

export function languageName(code: LangCode, custom: CustomLanguage[]) {
  return [...BUILTIN_LANGUAGES, ...custom].find((l) => l.code === code)?.name ?? code;
}
