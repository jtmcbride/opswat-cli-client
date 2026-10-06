/**
 * Builds src/data/generated/<lang>.json from downloaded open data (see download.sh).
 *
 *   npx tsx tools/build-data/build.ts <source-dir> <out-dir> [lang...]
 */
import { createReadStream, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createInterface } from 'node:readline';

import { parseRawDictionary } from '../../src/data/format';
import de from '../../src/data/dictionaries/de';
import es from '../../src/data/dictionaries/es';
import fr from '../../src/data/dictionaries/fr';
import it from '../../src/data/dictionaries/it';
import pt from '../../src/data/dictionaries/pt';
import { DictIndex } from '../../src/lib/dictionary';
import { parseFrequencyList, rankLemmas, selectSentences, toGenerated, WikiIndex, type Candidate } from './lib';

const LANGS = {
  es: { iso3: 'spa', starter: es },
  fr: { iso3: 'fra', starter: fr },
  de: { iso3: 'deu', starter: de },
  it: { iso3: 'ita', starter: it },
  pt: { iso3: 'por', starter: pt },
} as const;
type Lang = keyof typeof LANGS;

const WORDS = 5000;
const SAMPLES: Record<Lang, string[]> = {
  es: ['tener', 'casa', 'bueno'],
  fr: ['avoir', 'maison', 'bon'],
  de: ['haben', 'Haus', 'gut'],
  it: ['avere', 'casa', 'buono'],
  pt: ['ter', 'casa', 'bom'],
};
const SOURCES = [
  'Word frequencies: FrequencyWords by Hermit Dave (OpenSubtitles 2018), CC BY-SA 4.0',
  'Meanings and inflections: English Wiktionary via kaikki.org (wiktextract), CC BY-SA 4.0',
  'Sentences: Tatoeba (tatoeba.org), CC BY 2.0 FR',
];

async function* lines(path: string) {
  const rl = createInterface({ input: createReadStream(path, 'utf8'), crlfDelay: Infinity });
  for await (const line of rl) yield line;
}

/** Tatoeba sentence export: id \t lang \t text */
async function readSentences(path: string, into: Map<number, string>) {
  for await (const line of lines(path)) {
    const [id, , text] = line.split('\t');
    if (id && text) into.set(Number(id), text);
  }
}

async function main() {
  const [src, out, ...only] = process.argv.slice(2);
  if (!src || !out) throw new Error('usage: build.ts <source-dir> <out-dir> [lang...]');
  const langs = (only.length ? only : Object.keys(LANGS)) as Lang[];

  // Dictionaries first: sentence selection needs them.
  const indexes = new Map<Lang, { index: DictIndex; entries: ReturnType<typeof rankLemmas> }>();
  for (const lang of langs) {
    const wikiPath = join(src, 'wiktionary', `${lang}.jsonl`);
    const freqPath = join(src, 'freq', `${lang}.txt`);
    if (!existsSync(wikiPath) || !existsSync(freqPath)) {
      console.warn(`[${lang}] missing ${wikiPath} or ${freqPath}; skipping`);
      continue;
    }
    const wiki = new WikiIndex();
    let n = 0;
    const samples = new Set(SAMPLES[lang]);
    for await (const line of lines(wikiPath)) {
      if (!line) continue;
      try {
        const entry = JSON.parse(line);
        wiki.add(entry);
        n++;
        // Log one raw entry per sample word to document the source format in CI logs.
        if (samples.has(entry.word) && ['verb', 'noun', 'adj'].includes(entry.pos)) {
          samples.delete(entry.word);
          const { word, pos, forms, head_templates, tags, senses } = entry;
          console.log(`[${lang}] sample ${JSON.stringify({ word, pos, tags, head_templates, senseTags: senses?.slice(0, 3).map((x: { tags?: string[] }) => x.tags), forms: forms?.slice(0, 80) })}`.slice(0, 6000));
        }
      } catch {
        // Skip malformed lines.
      }
    }
    const entries = rankLemmas(parseFrequencyList(readFileSync(freqPath, 'utf8')), wiki, WORDS);
    // Hand-written starter entries add curated glosses and elision forms (l', j', qu'...).
    const starter = parseRawDictionary(LANGS[lang].starter).entries.map(({ rank: _rank, ...e }) => e);
    const index = new DictIndex([entries, starter]);
    indexes.set(lang, { index, entries });
    console.log(`[${lang}] ${n} wiktionary entries, ${wiki.lemmas.size} lemmas, kept ${entries.length}`);
  }

  // Sentences: target-language sentences linked to an English translation.
  const tatoeba = join(src, 'tatoeba');
  const eng = new Map<number, string>();
  const targets = new Map<number, { lang: Lang; text: string }>();
  if (existsSync(join(tatoeba, 'links.csv'))) {
    await readSentences(join(tatoeba, 'eng_sentences.tsv'), eng);
    for (const lang of indexes.keys()) {
      const m = new Map<number, string>();
      const p = join(tatoeba, `${LANGS[lang].iso3}_sentences.tsv`);
      if (existsSync(p)) await readSentences(p, m);
      for (const [id, text] of m) targets.set(id, { lang, text });
      console.log(`[${lang}] ${m.size} tatoeba sentences`);
    }
  } else {
    console.warn('No Tatoeba links found; sentences will be empty');
  }

  const candidates = new Map<Lang, Candidate[]>();
  const paired = new Set<number>();
  if (targets.size) {
    for await (const line of lines(join(tatoeba, 'links.csv'))) {
      const [a, b] = line.split('\t').map(Number);
      const t = targets.get(a);
      const en = eng.get(b);
      if (!t || en === undefined || paired.has(a)) continue;
      paired.add(a);
      let list = candidates.get(t.lang);
      if (!list) candidates.set(t.lang, (list = []));
      list.push({ text: t.text, translation: en });
    }
  }

  for (const [lang, { index, entries }] of indexes) {
    const starterTexts = new Set(parseRawDictionary(LANGS[lang].starter).sentences.map((s) => s.text.toLowerCase()));
    const pool = (candidates.get(lang) ?? []).filter((c) => !starterTexts.has(c.text.trim().toLowerCase()));
    const sentences = selectSentences(pool, index);
    const data = toGenerated(lang, entries, sentences, SOURCES);
    writeFileSync(join(out, `${lang}.json`), JSON.stringify(data));
    console.log(`[${lang}] ${pool.length} paired sentences -> ${sentences.length} selected; wrote ${lang}.json`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
