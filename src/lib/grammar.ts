import type { LangCode } from './types';

const VOWEL = /^[aeiouàâäéèêëíìîïóòôöúùûüh]/i;

/** "das Haus", "la casa", "l'homme (m.)": the noun with its article, for nouns with a known gender. */
export function withArticle(lang: LangCode, lemma: string, gender?: string): string {
  if (!gender) return lemma;
  const g = gender.length > 1 ? 'mf' : gender;
  switch (lang) {
    case 'de':
      return `${{ m: 'der', f: 'die', n: 'das', mf: 'der/die' }[g] ?? ''} ${lemma}`.trim();
    case 'es':
      return `${{ m: 'el', f: 'la', mf: 'el/la' }[g] ?? ''} ${lemma}`.trim();
    case 'pt':
      return `${{ m: 'o', f: 'a', mf: 'o/a' }[g] ?? ''} ${lemma}`.trim();
    case 'fr':
      if (VOWEL.test(lemma) && g !== 'mf') return `l'${lemma} (${g}.)`;
      return `${{ m: 'le', f: 'la', mf: 'le/la' }[g] ?? ''} ${lemma}`.trim();
    case 'it':
      if (/^[aeiou]/i.test(lemma) && g !== 'mf') return `l'${lemma} (${g}.)`;
      if (g === 'm') return /^(s[^aeiou]|z|gn|ps|x|y)/i.test(lemma) ? `lo ${lemma}` : `il ${lemma}`;
      return `${{ f: 'la', mf: 'il/la' }[g] ?? ''} ${lemma}`.trim();
    default:
      return `${lemma} (${g}.)`;
  }
}

const PRONOUNS: Record<string, Record<string, string>> = {
  es: {
    '1s': 'yo',
    '2s': 'tú',
    '3s': 'él/ella',
    '1p': 'nosotros',
    '2p': 'vosotros',
    '3p': 'ellos',
    '2sf': 'usted',
    '2pf': 'ustedes',
    '3sf': 'usted',
    '3pf': 'ustedes',
    '2sv': 'vos',
  },
  fr: { '1s': 'je', '2s': 'tu', '3s': 'il/elle', '1p': 'nous', '2p': 'vous', '3p': 'ils/elles' },
  de: { '1s': 'ich', '2s': 'du', '3s': 'er/sie/es', '1p': 'wir', '2p': 'ihr', '3p': 'sie/Sie' },
  it: { '1s': 'io', '2s': 'tu', '3s': 'lui/lei', '1p': 'noi', '2p': 'voi', '3p': 'loro' },
  pt: { '1s': 'eu', '2s': 'tu', '3s': 'ele/ela/você', '1p': 'nós', '2p': 'vós', '3p': 'eles/elas/vocês' },
  hr: { '1s': 'ja', '2s': 'ti', '3s': 'on/ona/ono', '1p': 'mi', '2p': 'vi', '3p': 'oni/one/ona' },
};
const PERSON: Record<string, string> = { 'first-person': '1', 'second-person': '2', 'third-person': '3' };
const NUMBER: Record<string, string> = { singular: 's', plural: 'p' };
const MOODS = ['subjunctive', 'subjunctive-i', 'subjunctive-ii', 'imperative', 'conditional'];
/** Tags that only describe the row (who), not the table (which tense). */
const ROW_TAGS = new Set([...Object.keys(PERSON), ...Object.keys(NUMBER), 'formal', 'informal', 'vos-form']);
const NOISE = new Set(['indicative', 'definite', 'indefinite', 'with-ellipsis', 'second-person-semantically']);
/** Non-finite form names go last so labels read naturally: "past participle". */
const NONFINITE = ['infinitive', 'gerund', 'participle', 'supine'];
const naturalOrder = (tags: string[]) => [
  ...tags.filter((t) => !NONFINITE.includes(t)),
  ...tags.filter((t) => NONFINITE.includes(t)),
];

const CASES = ['nominative', 'genitive', 'dative', 'accusative', 'vocative', 'locative', 'instrumental'];
const ANIMACY: Record<string, string> = { animate: ' (animate)', inanimate: ' (inanimate)' };
/** Words in a case table's title, in reading order: "Masculine singular". */
const CASE_TITLE_ORDER = ['masculine', 'feminine', 'neuter', 'singular', 'plural'];
const caseTitleRank = (t: string) => (CASE_TITLE_ORDER.includes(t) ? CASE_TITLE_ORDER.indexOf(t) : CASE_TITLE_ORDER.length);

export interface InflectionRow {
  label: string;
  forms: string[];
}
export interface InflectionSection {
  title: string;
  rows: InflectionRow[];
}

const readable = (tags: string[]) => tags.map((t) => t.replace(/-/g, ' ')).join(' ');
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function title(tags: string[]): string {
  // German "subjunctive-i/-ii" already says subjunctive.
  const specific = tags.some((t) => t.startsWith('subjunctive-'));
  const rest = tags.filter((t) => !MOODS.includes(t) && !NOISE.has(t));
  const moods = tags.filter((t) => MOODS.includes(t) && !(specific && t === 'subjunctive'));
  const words = readable([...rest, ...moods])
    .split(' ')
    .filter((w, i, a) => a.indexOf(w) === i) // "imperfect imperfect-se" -> "imperfect se"
    .map((w) => (w === 'i' || w === 'ii' ? w.toUpperCase() : w));
  return capitalize(words.join(' ')) || 'Forms';
}

/**
 * Groups Wiktionary inflections into tables: conjugated forms by tense/mood with one row per person
 * (labelled with pronouns), and everything else (participles, plurals, cases) as labelled rows.
 */
export function groupInflections(lang: LangCode, forms: [string, string[]][]): InflectionSection[] {
  const sections = new Map<string, InflectionSection>();
  const other: InflectionSection = { title: 'Other forms', rows: [] };
  const addRow = (section: InflectionSection, label: string, form: string) => {
    const row = section.rows.find((r) => r.label === label);
    if (row) {
      if (!row.forms.includes(form)) row.forms.push(form);
    } else section.rows.push({ label, forms: [form] });
  };

  for (const [form, tags] of forms) {
    const person = tags.map((t) => PERSON[t]).find(Boolean);
    const number = tags.map((t) => NUMBER[t]).find(Boolean);
    if (person && number) {
      const tableTags = tags.filter((t) => !ROW_TAGS.has(t) && !NOISE.has(t));
      const key = [...tableTags].sort().join(' ');
      let section = sections.get(key);
      if (!section) sections.set(key, (section = { title: title(tableTags), rows: [] }));
      const variant = tags.includes('formal') ? 'f' : tags.includes('vos-form') ? 'v' : '';
      const id = `${person}${number}${variant}`;
      const label = PRONOUNS[lang]?.[id] ?? `${readable(tags.filter((t) => t in PERSON || t in NUMBER || t === 'formal'))}`;
      addRow(section, label, form);
    } else if (tags.some((t) => CASES.includes(t))) {
      // Declension: one table per gender/number, one row per case.
      const kase = tags.find((t) => CASES.includes(t))!;
      const tableTags = tags
        .filter((t) => !CASES.includes(t) && !NOISE.has(t) && !(t in ANIMACY) && t !== 'positive')
        .sort((a, b) => caseTitleRank(a) - caseTitleRank(b));
      const key = `case:${tableTags.join(' ')}`;
      let section = sections.get(key);
      if (!section) sections.set(key, (section = { title: capitalize(readable(tableTags)) || 'Cases', rows: [] }));
      const animacy = tags.map((t) => ANIMACY[t]).find(Boolean) ?? '';
      addRow(section, `${capitalize(kase)}${animacy}`, form);
    } else {
      addRow(other, capitalize(readable(naturalOrder(tags.filter((t) => !NOISE.has(t))))) || 'Form', form);
    }
  }
  const caseRank = (label: string) => CASES.indexOf(label.split(' ')[0].toLowerCase());
  for (const [key, section] of sections) if (key.startsWith('case:')) section.rows.sort((a, b) => caseRank(a.label) - caseRank(b.label));
  return [...sections.values(), ...(other.rows.length ? [other] : [])];
}
