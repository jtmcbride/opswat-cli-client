import Anthropic from '@anthropic-ai/sdk';

import { normalize } from './tokenize';
import type { SentencePair } from './types';

export const DEFAULT_MODEL = 'claude-opus-5-5';

export interface Correction {
  /** The learner's sentence as written. */
  original: string;
  /** The corrected sentence. */
  corrected: string;
  /** Translation of the corrected sentence into the learner's language. */
  translation: string;
  /** One-line explanation of the mistake. */
  note: string;
}

export interface ChatTurn {
  role: 'user' | 'assistant';
  text: string;
  /** Not shown in the conversation (e.g. the turn that starts a role-play). */
  hidden?: boolean;
  /** On user turns: mistakes the tutor pointed out. */
  corrections?: Correction[];
  /** On assistant turns: meanings of words the learner doesn't know yet, keyed by lowercase word. */
  glosses?: Record<string, string>;
}

export interface ChatResult {
  reply: string;
  corrections: Correction[];
  glosses: Record<string, string>;
}

export class AiError extends Error {}
const glossArraySchema = {
  type: 'array',
  items: {
    type: 'object',
    properties: { word: { type: 'string' }, gloss: { type: 'string' } },
    required: ['word', 'gloss'],
    additionalProperties: false,
  },
} as const;


function client(apiKey: string) {
  // The key is the user's own and never leaves their device except to call the API.
  return new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
}

/** Caps the vocabulary sent in prompts; most recently learned words first. */
function vocabList(words: string[], max = 400) {
  return words.slice(-max).join(', ');
}

async function create(apiKey: string, params: Omit<Anthropic.Beta.MessageCreateParamsNonStreaming, 'betas' | 'fallbacks'>) {
  try {
    const res = await client(apiKey).beta.messages.create({
      ...params,
      // Re-run on a fallback model if the primary model declines a request.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
    });
    if (res.stop_reason === 'refusal') throw new AiError('The model declined to respond to that.');
    return res;
  } catch (e) {
    if (e instanceof AiError) throw e;
    if (e instanceof Anthropic.AuthenticationError) throw new AiError('Invalid API key. Check it in Settings.');
    if (e instanceof Anthropic.RateLimitError) throw new AiError('Rate limited — try again in a moment.');
    if (e instanceof Anthropic.APIError) throw new AiError(`API error ${e.status ?? ''}: ${e.message}`);
    throw new AiError(e instanceof Error ? e.message : String(e));
  }
}

const textOf = (res: Anthropic.Beta.BetaMessage) =>
  res.content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('')
    .trim();

export async function chatReply(opts: {
  apiKey: string;
  model: string;
  language: string;
  nativeLanguage: string;
  knownWords: string[];
  history: ChatTurn[];
  /** Role-play setup; free conversation when absent. */
  scenario?: string;
}): Promise<ChatResult> {
  const system = `You are a friendly ${opts.language} conversation partner for a language learner whose native language is ${opts.nativeLanguage}.
Write your reply only in ${opts.language}. Keep replies short (1-3 sentences) and natural, and end with a question or prompt that keeps the conversation going.
Build your replies mostly from the learner's known words. Introduce at most one or two new words per reply, choosing common, useful ones that are guessable from context.
If the learner writes in ${opts.nativeLanguage}, reply in simple ${opts.language}.
${opts.scenario ? `\nRole-play: ${opts.scenario}\nStay in character and keep the situation realistic and simple.\n` : ''}
Also return:
- "corrections": for each sentence in the learner's LAST message that has a real mistake (grammar, wrong word, spelling; not style), give the original sentence, the corrected sentence, its ${opts.nativeLanguage} translation, and a one-line ${opts.nativeLanguage} note on what was wrong. Empty if there were no mistakes or the message wasn't in ${opts.language}.
- "new_words": every word in your reply that is not in the known list, as written in the reply (lowercase), with a short ${opts.nativeLanguage} meaning.

Learner's known words: ${vocabList(opts.knownWords) || '(none yet: use very simple, common words)'}`;

  const res = await create(opts.apiKey, {
    model: opts.model,
    max_tokens: 2048,
    output_config: {
      effort: 'low',
      format: {
        type: 'json_schema',
        schema: {
          type: 'object',
          properties: {
            reply: { type: 'string' },
            corrections: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  original: { type: 'string' },
                  corrected: { type: 'string' },
                  translation: { type: 'string' },
                  note: { type: 'string' },
                },
                required: ['original', 'corrected', 'translation', 'note'],
                additionalProperties: false,
              },
            },
            new_words: glossArraySchema,
          },
          required: ['reply', 'corrections', 'new_words'],
          additionalProperties: false,
        },
      },
    },
    system,
    messages: opts.history.map((t) => ({ role: t.role, content: t.text })),
  });
  const parsed = JSON.parse(textOf(res)) as {
    reply: string;
    corrections: Correction[];
    new_words: { word: string; gloss: string }[];
  };
  return {
    reply: parsed.reply,
    corrections: parsed.corrections.filter((c) => c.corrected.trim() && c.corrected.trim() !== c.original.trim()),
    glosses: Object.fromEntries(parsed.new_words.map((w) => [normalize(w.word), w.gloss])),
  };
}

/** Generates short "i+1" sentences: all known words plus one new target word. */
export async function generateSentences(opts: {
  apiKey: string;
  model: string;
  language: string;
  nativeLanguage: string;
  knownWords: string[];
  targetWord: string;
  count?: number;
}): Promise<SentencePair[]> {
  const count = opts.count ?? 3;
  const res = await create(opts.apiKey, {
    model: opts.model,
    max_tokens: 2048,
    output_config: {
      effort: 'low',
      format: {
        type: 'json_schema',
        schema: {
          type: 'object',
          properties: {
            sentences: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  text: { type: 'string' },
                  translation: { type: 'string' },
                  glosses: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: { word: { type: 'string' }, gloss: { type: 'string' } },
                      required: ['word', 'gloss'],
                      additionalProperties: false,
                    },
                  },
                },
                required: ['text', 'translation', 'glosses'],
                additionalProperties: false,
              },
            },
          },
          required: ['sentences'],
          additionalProperties: false,
        },
      },
    },
    messages: [
      {
        role: 'user',
        content: `Write ${count} short, natural ${opts.language} sentences for a learner. Each sentence must use the word "${opts.targetWord}" and otherwise use only words from the known list (any inflection is fine), so the new word can be guessed from context. Give each a ${opts.nativeLanguage} translation, and in "glosses" give the ${opts.nativeLanguage} meaning of every word in the sentence exactly as it appears (lowercase).

Known words: ${vocabList(opts.knownWords)}`,
      },
    ],
  });
  const parsed = JSON.parse(textOf(res)) as {
    sentences: { text: string; translation: string; glosses: { word: string; gloss: string }[] }[];
  };
  return parsed.sentences
    .filter((s) => s.text && s.translation)
    .map((s) => ({
      text: s.text,
      translation: s.translation,
      glosses: Object.fromEntries(s.glosses.map((g) => [normalize(g.word), g.gloss])),
    }));
}


/** A short graded-reader story built almost entirely from known words. */
export async function generateStory(opts: {
  apiKey: string;
  model: string;
  language: string;
  nativeLanguage: string;
  knownWords: string[];
  topic?: string;
  length: 'short' | 'medium';
}): Promise<{ title: string; text: string; glosses: Record<string, string> }> {
  const words = opts.length === 'short' ? '80-120' : '200-300';
  const res = await create(opts.apiKey, {
    model: opts.model,
    max_tokens: 4096,
    output_config: {
      effort: 'low',
      format: {
        type: 'json_schema',
        schema: {
          type: 'object',
          properties: { title: { type: 'string' }, text: { type: 'string' }, glosses: glossArraySchema },
          required: ['title', 'text', 'glosses'],
          additionalProperties: false,
        },
      },
    },
    messages: [
      {
        role: 'user',
        content: `Write an engaging ${words}-word story in ${opts.language} for a learner${opts.topic ? ` about: ${opts.topic}` : ''}.
At least 95% of the running words must come from the learner's known words (any inflection is fine). Use a handful of new, common, useful words that can be guessed from context, and repeat each new word at least twice. Use short paragraphs separated by blank lines. Give a short title in ${opts.language}.
In "glosses", give the ${opts.nativeLanguage} meaning of every word you used that is not in the known list, exactly as it appears in the text (lowercase).

Known words: ${vocabList(opts.knownWords, 800) || '(none yet: use the most basic, common words only)'}`,
      },
    ],
  });
  const parsed = JSON.parse(textOf(res)) as { title: string; text: string; glosses: { word: string; gloss: string }[] };
  return {
    title: parsed.title,
    text: parsed.text,
    glosses: Object.fromEntries(parsed.glosses.map((g) => [normalize(g.word), g.gloss])),
  };
}

/** Meaning of a word as used in a specific sentence, for words missing from the dictionary. */
export async function glossInContext(opts: {
  apiKey: string;
  model: string;
  language: string;
  nativeLanguage: string;
  word: string;
  sentence: string;
}): Promise<{ lemma: string; gloss: string }> {
  const res = await create(opts.apiKey, {
    model: opts.model,
    max_tokens: 512,
    output_config: {
      effort: 'low',
      format: {
        type: 'json_schema',
        schema: {
          type: 'object',
          properties: { lemma: { type: 'string' }, gloss: { type: 'string' } },
          required: ['lemma', 'gloss'],
          additionalProperties: false,
        },
      },
    },
    messages: [
      {
        role: 'user',
        content: `In the ${opts.language} sentence "${opts.sentence}", what does "${opts.word}" mean? Reply with its dictionary form (lemma) and a short ${opts.nativeLanguage} gloss (a few words) for this context.`,
      },
    ],
  });
  return JSON.parse(textOf(res)) as { lemma: string; gloss: string };
}

/** A brief, learner-friendly grammar explanation of one sentence. */
export async function explainSentence(opts: {
  apiKey: string;
  model: string;
  language: string;
  nativeLanguage: string;
  sentence: string;
  translation?: string;
  focus?: string;
}): Promise<string> {
  const res = await create(opts.apiKey, {
    model: opts.model,
    max_tokens: 1024,
    output_config: { effort: 'low' },
    system: `You explain ${opts.language} grammar to a learner whose native language is ${opts.nativeLanguage}. Be brief and concrete: 2-5 short bullet points ("• "), plain text, no headings or markdown emphasis. Cover only what's useful in this sentence: verb forms (tense, person, why), agreement (gender/number), pronouns and word order, idioms. Write in ${opts.nativeLanguage}.`,
    messages: [
      {
        role: 'user',
        content: `Sentence: ${opts.sentence}${opts.translation ? `\nTranslation: ${opts.translation}` : ''}${opts.focus ? `\nFocus especially on: ${opts.focus}` : ''}`,
      },
    ],
  });
  return textOf(res);
}
