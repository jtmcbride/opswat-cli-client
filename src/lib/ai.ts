import Anthropic from '@anthropic-ai/sdk';

import { normalize } from './tokenize';
import type { SentencePair } from './types';

export const DEFAULT_MODEL = 'claude-opus-5-5';

export interface ChatTurn {
  role: 'user' | 'assistant';
  text: string;
}

export class AiError extends Error {}

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
}): Promise<string> {
  const system = `You are a friendly ${opts.language} conversation partner for a language learner whose native language is ${opts.nativeLanguage}.
Write only in ${opts.language}. Keep replies short (1-3 sentences) and natural, and end with a question or prompt that keeps the conversation going.
Build your replies mostly from the learner's known words. Introduce at most one or two new words per reply, choosing common, useful ones that are guessable from context.
If the learner makes a mistake, model the correct form naturally in your reply; only explain grammar if asked. If the learner writes in ${opts.nativeLanguage}, reply in simple ${opts.language}.

Learner's known words: ${vocabList(opts.knownWords) || '(none yet: use very simple, common words)'}`;

  const res = await create(opts.apiKey, {
    model: opts.model,
    max_tokens: 1024,
    output_config: { effort: 'low' },
    system,
    messages: opts.history.map((t) => ({ role: t.role, content: t.text })),
  });
  return textOf(res);
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
