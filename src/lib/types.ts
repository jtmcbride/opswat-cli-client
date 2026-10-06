export type LangCode = string;

/** A dictionary entry. `forms` are inflected/alternate spellings that map back to `lemma`. */
export interface DictEntry {
  lemma: string;
  gloss: string;
  pos?: string;
  forms?: string[];
  /** 1 = most frequent. Undefined for user entries without a rank. */
  rank?: number;
  /** Grammatical gender of nouns: "m", "f", "n", or combinations like "fm". */
  gender?: string;
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
  state: 'new' | 'learning' | 'review' | 'relearning';
  /** FSRS stability: days until recall probability drops to 90%. 0 for new cards. */
  stability: number;
  /** FSRS difficulty, 1 (easy) – 10 (hard). 0 for new cards. */
  difficulty: number;
  /** Number of reviews. */
  reps: number;
  /** Times forgotten after being learned. */
  lapses: number;
  /** Epoch ms when the card is next due. */
  due: number;
  lastReview?: number;
  /** When the card was first reviewed; used for the daily new-card limit. */
  firstReview?: number;
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
  /** Excluded from reviews (e.g. a leech the learner set aside). */
  suspended?: boolean;
}

export type Grade = 'again' | 'hard' | 'good' | 'easy';

export interface ReadingText {
  id: string;
  lang: LangCode;
  title: string;
  body: string;
  source: 'user' | 'ai';
  createdAt: number;
  /** Meanings for words the dictionary lacks (from AI generation or lookups), keyed by lowercase word. */
  glosses?: Record<string, string>;
}

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
  /** Target recall probability for scheduling (FSRS desired retention). */
  retention: number;
  /** New cards introduced per day per language; 0 = no limit. */
  dailyNewLimit: number;
  /** Reviews per day to aim for. */
  dailyGoal: number;
  /** Local daily reminder time (native only); null = off. */
  reminder: { hour: number; minute: number } | null;
}
