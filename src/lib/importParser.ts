import type { DictEntry } from './types';

const HEADER_WORDS = new Set(['word', 'lemma', 'term', 'front', 'translation', 'gloss', 'meaning', 'back']);

export interface ParseResult {
  entries: DictEntry[];
  skipped: number;
}

/**
 * Parses a user-supplied dictionary. Accepts:
 * - JSON: `[{word, translation, pos?, forms?}]`, `[[word, translation, pos?]]`, or `{word: translation}`
 * - Delimited text (TSV, CSV, `;`, or ` = `), one entry per line: `word, translation[, pos]`
 *   Anki text exports work (lines starting with `#` and HTML tags are ignored).
 */
export function parseDictionary(text: string): ParseResult {
  const trimmed = text.trim();
  if (!trimmed) return { entries: [], skipped: 0 };
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    try {
      return parseJson(JSON.parse(trimmed));
    } catch {
      // Fall through to line parsing.
    }
  }
  return parseLines(trimmed);
}

function parseJson(data: unknown): ParseResult {
  const entries: DictEntry[] = [];
  let skipped = 0;
  const push = (lemma: unknown, gloss: unknown, pos?: unknown, forms?: unknown) => {
    if (typeof lemma === 'string' && typeof gloss === 'string' && lemma.trim() && gloss.trim()) {
      entries.push({
        lemma: lemma.trim(),
        gloss: gloss.trim(),
        ...(typeof pos === 'string' && pos ? { pos } : {}),
        ...(Array.isArray(forms) ? { forms: forms.filter((f): f is string => typeof f === 'string') } : {}),
      });
    } else {
      skipped++;
    }
  };

  if (Array.isArray(data)) {
    for (const item of data) {
      if (Array.isArray(item)) push(item[0], item[1], item[2], item[3]);
      else if (item && typeof item === 'object') {
        const o = item as Record<string, unknown>;
        push(o.word ?? o.lemma ?? o.term, o.translation ?? o.gloss ?? o.meaning ?? o.definition, o.pos, o.forms);
      } else skipped++;
    }
  } else if (data && typeof data === 'object') {
    for (const [k, v] of Object.entries(data)) push(k, v);
  }
  return { entries, skipped };
}

function detectDelimiter(lines: string[]): string | RegExp {
  const sample = lines.slice(0, 20).join('\n');
  if (sample.includes('\t')) return '\t';
  if (sample.includes(' = ')) return ' = ';
  if (sample.includes(';')) return ';';
  return ',';
}

function splitCsv(line: string, delim: string): string[] {
  if (delim !== ',' && delim !== ';') return line.split(delim);
  const out: string[] = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quoted) {
      if (c === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cur += c;
    } else if (c === '"') quoted = true;
    else if (c === delim) {
      out.push(cur);
      cur = '';
    } else cur += c;
  }
  out.push(cur);
  return out;
}

const stripHtml = (s: string) => s.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

function parseLines(text: string): ParseResult {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() && !l.startsWith('#'));
  const delim = detectDelimiter(lines);
  const entries: DictEntry[] = [];
  let skipped = 0;
  lines.forEach((line, i) => {
    const cols = splitCsv(line, delim as string).map(stripHtml);
    if (i === 0 && HEADER_WORDS.has(cols[0]?.toLowerCase())) return;
    const [lemma, gloss, pos] = cols;
    if (lemma && gloss) entries.push({ lemma, gloss, ...(pos ? { pos } : {}) });
    else skipped++;
  });
  return { entries, skipped };
}
