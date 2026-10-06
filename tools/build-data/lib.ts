/**
 * Pure transforms for building the bundled dictionaries from open data:
 * - word frequencies (FrequencyWords, OpenSubtitles 2018; CC BY-SA 4.0)
 * - glosses and inflections (English Wiktionary via kaikki.org/wiktextract; CC BY-SA)
 * - sentence pairs (Tatoeba; CC BY 2.0 FR)
 */
import type { GeneratedDictionary } from '../../src/data/format';
import { DictIndex } from '../../src/lib/dictionary';
import type { DictEntry, SentencePair } from '../../src/lib/types';

export interface WikiSense {
  glosses?: string[];
  tags?: string[];
  form_of?: { word: string }[];
  alt_of?: { word: string }[];
}

export interface WikiEntry {
  word: string;
  pos: string;
  senses?: WikiSense[];
  forms?: { form: string; tags?: string[] }[];
}

const POS: Record<string, string> = {
  noun: 'n',
  verb: 'v',
  adj: 'adj',
  adv: 'adv',
  pron: 'pron',
  prep: 'prep',
  conj: 'conj',
  det: 'det',
  article: 'art',
  intj: 'intj',
  num: 'num',
  particle: 'part',
  contraction: 'contr',
};
const SKIP_SENSE_TAGS = new Set(['obsolete', 'archaic', 'dated', 'rare', 'historical', 'misspelling', 'nonstandard']);
const SKIP_FORM_TAGS = new Set(['table-tags', 'inflection-template', 'class', 'romanization', 'error-unrecognized-form']);
const MAX_GLOSSES = 3;
const MAX_GLOSS_LEN = 60;
const MAX_TOTAL_GLOSS = 70;
/** Glosses that describe grammar rather than translate; used only if nothing better exists. */
const DESCRIPTIVE = /^(used|indicates?|denotes|forms?|expresses|introduces|substitutes|links|marks|refers)\b/i;
/** Inflected forms that collide with a rare noun/interjection (French "est" = east) count as the inflection. */
const WEAK_LEMMA_POS = new Set(['n', 'intj']);
const STRONG_TARGET_POS = new Set(['v', 'art', 'det', 'pron']);

const lower = (s: string) => s.toLocaleLowerCase();

interface LemmaRecord {
  display: string;
  pos: string;
  glosses: string[];
  forms: Set<string>;
  /** True once a lowercase spelling has been seen ("a" vs "A", "ce" vs "CE"). */
  lowercase: boolean;
}

/** Glosses and form→lemma links aggregated from wiktextract JSONL entries. */
export class WikiIndex {
  readonly lemmas = new Map<string, LemmaRecord>();
  readonly formOf = new Map<string, Set<string>>();

  add(entry: WikiEntry) {
    const pos = POS[entry.pos];
    if (!pos || !entry.word || /\s/.test(entry.word)) return;
    const key = lower(entry.word);
    const glosses: string[] = [];

    for (const sense of entry.senses ?? []) {
      const targets = [...(sense.form_of ?? []), ...(sense.alt_of ?? [])].map((t) => lower(t.word)).filter(Boolean);
      // Italian clitic compounds: "compound of the infinitive trovare with mi".
      const compound = /^compound of (?:the )?(?:[a-z]+ )*?(\p{L}+) with /iu.exec(sense.glosses?.at(-1) ?? '');
      if (compound) targets.push(lower(compound[1]));
      if (targets.length) {
        let set = this.formOf.get(key);
        if (!set) this.formOf.set(key, (set = new Set()));
        targets.forEach((t) => t !== key && set!.add(t));
        continue;
      }
      if (sense.tags?.some((t) => SKIP_SENSE_TAGS.has(t) || t === 'form-of' || t === 'alt-of')) continue;
      const gloss = cleanGloss(sense.glosses?.at(-1));
      if (gloss) glosses.push(gloss);
    }
    if (!glosses.length) return;

    const isLower = entry.word === key;
    let rec = this.lemmas.get(key);
    if (!rec) {
      this.lemmas.set(key, (rec = { display: entry.word, pos, glosses, forms: new Set(), lowercase: isLower }));
    } else if (isLower && !rec.lowercase) {
      // Prefer the lowercase word's meaning over an abbreviation or proper noun ("a" over "A").
      Object.assign(rec, { display: entry.word, pos, glosses: [...glosses, ...rec.glosses], lowercase: true });
    } else {
      rec.glosses.push(...glosses);
    }
    for (const f of entry.forms ?? []) {
      if (!f.form || /\s/.test(f.form) || f.tags?.some((t) => SKIP_FORM_TAGS.has(t))) continue;
      const lf = lower(f.form);
      if (lf === key) continue;
      rec.forms.add(lf);
      // Also link the form back, so its frequency counts toward this lemma.
      let set = this.formOf.get(lf);
      if (!set) this.formOf.set(lf, (set = new Set()));
      set.add(key);
    }
  }
}

export function cleanGloss(raw: string | undefined): string | null {
  if (!raw) return null;
  let g = raw.replace(/\s+/g, ' ').trim().replace(/\.$/, '');
  if (!g || /^(alternative|obsolete|archaic|misspelling|abbreviation) (form|spelling|of)/i.test(g)) return null;
  if (/^the name of the latin(-| )script letter/i.test(g) || /^compound of /i.test(g)) return null;
  // Drop parenthetical asides from longer glosses: "American (of or relating to the USA)".
  if (g.length > 30) g = g.replace(/\s*\([^()]*\)/g, '').trim() || g;
  if (g.length > MAX_GLOSS_LEN) {
    // Prefer the first clause of long, sentence-like glosses.
    const cut = g.slice(0, MAX_GLOSS_LEN);
    const at = Math.max(cut.lastIndexOf(';'), cut.lastIndexOf(','));
    g = at > 15 ? cut.slice(0, at) : `${cut.trimEnd()}…`;
  }
  return g;
}

export function parseFrequencyList(text: string): [string, number][] {
  const out: [string, number][] = [];
  for (const line of text.split('\n')) {
    const [w, c] = line.trim().split(/\s+/);
    const n = Number(c);
    if (w && Number.isFinite(n)) out.push([lower(w), n]);
  }
  return out;
}

/** Picks up to three short, translation-like glosses, keeping Wiktionary's sense order otherwise. */
export function pickGlosses(glosses: string[]): string {
  const unique = [...new Set(glosses)];
  const good = unique.filter((g) => !DESCRIPTIVE.test(g));
  const ordered = [...good.filter((g) => g.length <= 30), ...good.filter((g) => g.length > 30), ...unique.filter((g) => DESCRIPTIVE.test(g))];
  const out: string[] = [];
  let len = 0;
  for (const g of ordered) {
    if (out.length >= MAX_GLOSSES || (out.length && len + g.length > MAX_TOTAL_GLOSS)) break;
    out.push(g);
    len += g.length + 2;
  }
  return out.join('; ');
}

/**
 * Ranks lemmas by the summed frequency of their surface forms. A surface form that is itself a
 * lemma counts for that lemma; otherwise it counts for the lemma it inflects. Only forms that
 * actually occur in the frequency list are kept, which keeps the output small.
 */
export function rankLemmas(freq: [string, number][], wiki: WikiIndex, limit: number): DictEntry[] {
  const credit = new Map<string, number>();
  const seenForms = new Map<string, Set<string>>();
  const addForm = (lemma: string, form: string) => {
    if (form === lemma) return;
    let s = seenForms.get(lemma);
    if (!s) seenForms.set(lemma, (s = new Set()));
    s.add(form);
  };

  const dropped = new Set<string>();
  for (const [w, c] of freq) {
    if (/\d/.test(w)) continue;
    const formTarget = [...(wiki.formOf.get(w) ?? [])].find((t) => wiki.lemmas.has(t) && t !== w);
    let target: string | undefined;
    const own = wiki.lemmas.get(w);
    if (own && formTarget && WEAK_LEMMA_POS.has(own.pos) && STRONG_TARGET_POS.has(wiki.lemmas.get(formTarget)!.pos)) {
      // "est" is far more likely "is" (être) than "east"; drop the noun so the app resolves the form.
      target = formTarget;
      dropped.add(w);
    } else {
      target = own ? w : formTarget;
    }
    if (!target) continue;
    credit.set(target, (credit.get(target) ?? 0) + c);
    addForm(target, w);
  }

  return [...credit.entries()]
    .filter(([key]) => !dropped.has(key))
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([key], i) => {
      const rec = wiki.lemmas.get(key)!;
      const forms = [...(seenForms.get(key) ?? [])].slice(0, 40);
      return {
        lemma: rec.display,
        gloss: pickGlosses(rec.glosses),
        pos: rec.pos,
        rank: i + 1,
        ...(forms.length ? { forms } : {}),
      };
    });
}

export interface Candidate {
  text: string;
  translation: string;
}

/**
 * Keeps sentences whose every word is in the dictionary, then, walking lemmas from most to least
 * frequent, takes a few of the shortest sentences in which that lemma is the rarest word. This gives
 * every word "i+1" sentences once everything more common is known.
 */
export function selectSentences(
  candidates: Iterable<Candidate>,
  index: DictIndex,
  opts: { perLemma?: number; max?: number; maxChars?: number; maxWords?: number } = {},
): SentencePair[] {
  const { perLemma = 3, max = 12000, maxChars = 90, maxWords = 14 } = opts;
  const buckets = new Map<string, Candidate[]>();
  const seen = new Set<string>();

  for (const c of candidates) {
    const text = c.text.trim();
    const key = lower(text);
    if (text.length > maxChars || seen.has(key)) continue;
    const lemmas = index.sentenceLemmas(text);
    if (lemmas.length < 2 || lemmas.length > maxWords) continue;
    let hardest: string | null = null;
    let hardestRank = -1;
    let ok = true;
    for (const l of lemmas) {
      const rank = index.get(l)?.rank;
      if (rank === undefined) {
        ok = false;
        break;
      }
      if (rank > hardestRank) {
        hardestRank = rank;
        hardest = l;
      }
    }
    if (!ok || !hardest) continue;
    seen.add(key);
    let b = buckets.get(hardest);
    if (!b) buckets.set(hardest, (b = []));
    b.push({ text, translation: c.translation.trim() });
  }

  const out: SentencePair[] = [];
  const byRank = [...index.entries].sort((a, b) => (a.rank ?? 1e9) - (b.rank ?? 1e9));
  for (const e of byRank) {
    const b = buckets.get(lower(e.lemma));
    if (!b) continue;
    b.sort((x, y) => x.text.length - y.text.length);
    for (const c of b.slice(0, perLemma)) {
      out.push(c);
      if (out.length >= max) return out;
    }
  }
  return out;
}

export function toGenerated(lang: string, entries: DictEntry[], sentences: SentencePair[], sources: string[]): GeneratedDictionary {
  return {
    lang,
    sources,
    entries: entries.map((e) => (e.forms?.length ? [e.lemma, e.gloss, e.pos ?? '', e.forms] : [e.lemma, e.gloss, e.pos ?? ''])),
    sentences: sentences.map((s) => [s.text, s.translation]),
  };
}
