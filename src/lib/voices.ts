import type { LangCode } from './types';

export interface VoiceInfo {
  identifier: string;
  language: string;
  quality?: string;
}

/** Preferred regional voices per language, best first. Portuguese prefers Brazil to match the built-in content. */
export const PREFERRED_LOCALES: Record<LangCode, string[]> = {
  es: ['es-ES', 'es-MX', 'es-US'],
  fr: ['fr-FR', 'fr-CA'],
  de: ['de-DE', 'de-AT', 'de-CH'],
  it: ['it-IT'],
  pt: ['pt-BR', 'pt-PT'],
};

const norm = (locale: string) => locale.replace(/_/g, '-').toLowerCase();

/** BCP 47 tag to request when no specific voice is known. */
export function localeFor(lang: LangCode): string {
  return PREFERRED_LOCALES[lang]?.[0] ?? lang;
}

/**
 * Picks the best installed voice for a language: preferred region first, then enhanced quality.
 * Returns null when the device reports voices but none for this language.
 */
export function pickVoice(voices: VoiceInfo[], lang: LangCode): VoiceInfo | null {
  const prefix = lang.toLowerCase();
  const matching = voices.filter((v) => {
    const l = norm(v.language);
    return l === prefix || l.startsWith(`${prefix}-`);
  });
  if (!matching.length) return null;
  const preferred = (PREFERRED_LOCALES[lang] ?? []).map(norm);
  const regionRank = (v: VoiceInfo) => {
    const i = preferred.indexOf(norm(v.language));
    return i === -1 ? preferred.length : i;
  };
  const qualityRank = (v: VoiceInfo) => (v.quality === 'Enhanced' ? 0 : 1);
  return [...matching].sort((a, b) => regionRank(a) - regionRank(b) || qualityRank(a) - qualityRank(b))[0];
}
