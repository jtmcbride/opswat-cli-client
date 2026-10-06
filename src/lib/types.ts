export type LangCode = string;

/** A dictionary entry. `forms` are inflected/alternate spellings that map back to `lemma`. */
export interface DictEntry {
  lemma: string;
  gloss: string;
  pos?: string;
  forms?: string[];
  /** 1 = most frequent. Undefined for user entries without a rank. */
  rank?: number;
}

export interface SentencePair {
  text: string;
  translation: string;
  /** Glosses for words that may be missing from the dictionary (e.g. in AI-generated sentences). */
  glosses?: Record<string, string>;
}

export interface DictionaryData {
  lang: LangCode;
  name: string;
  entries: DictEntry[];
  sentences: SentencePair[];
  /** Attribution for generated data. */
  sources?: string[];
}

export interface SrsState {
  ease: number;
  /** Interval in days. 0 = new / relearning. */
  interval: number;
  reps: number;
  lapses: number;
  /** Epoch ms when the card is next due. */
  due: number;
}

export interface KnownWord {
  id: string;
  lang: LangCode;
  /** The word as displayed, usually the dictionary lemma. Compare via `normalize()`. */
  word: string;
  gloss: string;
  addedAt: number;
  srs: SrsState;
  /** The sentence the word was learned from, used for fill-in-the-blank reviews. */
  context?: SentencePair;
}

export type Grade = 'again' | 'hard' | 'good' | 'easy';

export interface UserDictMeta {
  id: string;
  lang: LangCode;
  name: string;
  count: number;
  enabled: boolean;
  importedAt: number;
}

export interface CustomLanguage {
  code: LangCode;
  name: string;
}

export type ReviewDirection = 'target' | 'native' | 'mixed';

export interface Settings {
  activeLang: LangCode;
  nativeLang: string;
  reviewDirection: ReviewDirection;
  aiModel: string;
  speechRate: 'normal' | 'slow';
  /** Speak the word automatically when a flashcard shows it. */
  autoSpeak: boolean;
  /** "mixed" adds typed recall, fill-in-the-blank and listening exercises to reviews. */
  reviewStyle: 'flip' | 'mixed';
  /** Include listening exercises in mixed reviews (needs a voice for the language). */
  listening: boolean;
}
