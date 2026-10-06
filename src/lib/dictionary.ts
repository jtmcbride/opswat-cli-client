import { normalize, splitElision, tokenize } from './tokenize';
import type { DictEntry } from './types';

/** Fast lookup over one or more dictionaries for a language. Later sources override earlier ones. */
export class DictIndex {
  readonly entries: DictEntry[] = [];
  private byLemma = new Map<string, DictEntry>();
  private formToLemma = new Map<string, string>();
  /** Forms from full inflection tables: used to resolve words, not for autocomplete. */
  private tableForms = new Map<string, string>();
  /** Forms of curated entries, which win even over another entry with that headword. */
  private curatedForms = new Map<string, string>();

  constructor(sources: DictEntry[][]) {
    let rank = 0;
    for (const source of sources) {
      for (const raw of source) {
        const lemma = normalize(raw.lemma);
        if (!lemma) continue;
        // Unranked entries are placed after everything ranked so far.
        if (raw.rank !== undefined) rank = Math.max(rank, raw.rank);
        const entry: DictEntry = { ...raw, lemma: raw.lemma.trim(), rank: raw.rank ?? ++rank };
        const existing = this.byLemma.get(lemma);
        if (existing) {
          // Keep the better (lower) frequency rank, take the newer gloss.
          entry.rank = Math.min(existing.rank ?? Infinity, entry.rank ?? Infinity);
          entry.forms = [...new Set([...(existing.forms ?? []), ...(entry.forms ?? [])])];
          // Keep grammatical info from earlier sources when a later one (e.g. curated glosses) lacks it.
          entry.gender ??= existing.gender;
          entry.pos ??= existing.pos;
          this.entries[this.entries.indexOf(existing)] = entry;
        } else {
          this.entries.push(entry);
        }
        this.byLemma.set(lemma, entry);
        for (const f of entry.forms ?? []) {
          const nf = normalize(f);
          if (!this.formToLemma.has(nf)) this.formToLemma.set(nf, lemma);
        }
      }
    }
    const curated = this.entries.filter((e) => e.formsWin);
    const curatedLemmas = new Set(curated.map((e) => normalize(e.lemma)));
    for (const e of curated) {
      for (const f of e.forms ?? []) {
        const nf = normalize(f);
        if (!curatedLemmas.has(nf) && !this.curatedForms.has(nf)) this.curatedForms.set(nf, normalize(e.lemma));
      }
    }
  }

  /**
   * A copy that also resolves every form in the given inflection tables (all conjugations and
   * declensions, not just forms seen in the frequency list). Lemmas and dictionary forms keep
   * priority; a form shared by several lemmas goes to the most frequent one.
   */
  withTableForms(tables: Iterable<[lemma: string, forms: string[]]>): DictIndex {
    const copy = Object.assign(Object.create(DictIndex.prototype) as DictIndex, this);
    copy.tableForms = new Map(this.tableForms);
    const ranked = [...tables]
      .map(([lemma, forms]) => [this.byLemma.get(normalize(lemma)), forms] as const)
      .filter((x): x is readonly [DictEntry, string[]] => !!x[0])
      .sort((a, b) => (a[0].rank ?? 1e9) - (b[0].rank ?? 1e9));
    for (const [entry, forms] of ranked) {
      const lemma = normalize(entry.lemma);
      for (const f of forms) {
        const nf = normalize(f);
        // Skip table artifacts like "¿no".
        if (!/^\p{L}[\p{L}\p{M}'’-]*$/u.test(nf)) continue;
        if (this.byLemma.has(nf) || this.formToLemma.has(nf) || this.curatedForms.has(nf) || copy.tableForms.has(nf)) continue;
        copy.tableForms.set(nf, lemma);
      }
    }
    return copy;
  }

  get size() {
    return this.entries.length;
  }

  get(lemma: string): DictEntry | undefined {
    return this.byLemma.get(normalize(lemma));
  }

  /** Resolve a surface form (e.g. "tengo") to its normalized lemma key ("tener"). Returns the input if unknown. */
  lemmaOf(word: string): string {
    const n = normalize(word);
    const curated = this.curatedForms.get(n);
    if (curated) return curated;
    if (this.byLemma.has(n)) return n;
    return this.formToLemma.get(n) ?? this.tableForms.get(n) ?? n;
  }

  lookup(word: string): DictEntry | undefined {
    return this.byLemma.get(this.lemmaOf(word));
  }

  /** Prefix search on lemmas and forms, ranked by frequency. */
  search(prefix: string, limit = 8): DictEntry[] {
    const p = normalize(prefix);
    if (!p) return [];
    const hits = new Set<DictEntry>();
    for (const e of this.entries) {
      if (normalize(e.lemma).startsWith(p)) hits.add(e);
    }
    for (const [form, lemma] of this.formToLemma) {
      if (form.startsWith(p)) {
        const e = this.byLemma.get(lemma);
        if (e) hits.add(e);
      }
    }
    return [...hits]
      .sort(
        (a, b) =>
          Number(normalize(b.lemma) === p) - Number(normalize(a.lemma) === p) ||
          (a.rank ?? 1e9) - (b.rank ?? 1e9),
      )
      .slice(0, limit);
  }

  /** Lemmas of every word in a sentence. */
  sentenceLemmas(text: string): string[] {
    const out: string[] = [];
    for (const t of tokenize(text)) {
      if (!t.isWord) continue;
      out.push(...this.tokenLemmas(t.norm));
    }
    return out;
  }

  /**
   * Lemmas for one word token. Whole-token matches win ("aujourd'hui"); otherwise the token is
   * split on hyphens ("allez-vous") and elisions ("c'est" -> "c'", "est").
   */
  tokenLemmas(norm: string): string[] {
    if (this.knows(norm)) return [this.lemmaOf(norm)];
    return norm
      .split('-')
      .filter(Boolean)
      .flatMap((part) => (this.knows(part) ? [part] : splitElision(part)))
      .map((part) => this.lemmaOf(part));
  }

  knows(word: string): boolean {
    return this.lookup(word) !== undefined;
  }
}
