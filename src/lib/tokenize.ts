export interface Token {
  text: string;
  /** Lowercased form used for lookup. Empty for punctuation/whitespace. */
  norm: string;
  isWord: boolean;
}

// Letters (any script) plus apostrophes/hyphens inside words.
const WORD_RE = /[\p{L}\p{M}]+(?:['’\-][\p{L}\p{M}]+)*|\p{N}+/gu;

export function normalize(word: string): string {
  return word.trim().toLocaleLowerCase().replace(/’/g, "'");
}

/** Splits text into word and non-word tokens, preserving everything so it can be re-rendered. */
export function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  let last = 0;
  for (const m of text.matchAll(WORD_RE)) {
    const start = m.index ?? 0;
    if (start > last) tokens.push({ text: text.slice(last, start), norm: '', isWord: false });
    const isNumber = /^\p{N}+$/u.test(m[0]);
    tokens.push({ text: m[0], norm: isNumber ? '' : normalize(m[0]), isWord: !isNumber });
    last = start + m[0].length;
  }
  if (last < text.length) tokens.push({ text: text.slice(last), norm: '', isWord: false });
  return tokens;
}

/** Splits an elided article/pronoun: "l'homme" -> ["l'", "homme"], "quest'anno" -> ["quest'", "anno"]. */
export function splitElision(norm: string): string[] {
  const m = /^(\p{L}+')(\p{L}.*)$/u.exec(norm);
  return m ? [m[1], m[2]] : [norm];
}
