import { localeFor, pickVoice } from '@/lib/voices';

const voices = [
  { identifier: 'mx', language: 'es-MX', quality: 'Default' },
  { identifier: 'es', language: 'es-ES', quality: 'Default' },
  { identifier: 'es-enh', language: 'es-ES', quality: 'Enhanced' },
  { identifier: 'br', language: 'pt_BR', quality: 'Default' },
  { identifier: 'pt', language: 'pt-PT', quality: 'Enhanced' },
  { identifier: 'ja', language: 'ja-JP' },
];

describe('pickVoice', () => {
  it('prefers the first preferred region, then enhanced quality', () => {
    expect(pickVoice(voices, 'es')?.identifier).toBe('es-enh');
  });

  it('prefers region over quality and accepts underscore locales', () => {
    expect(pickVoice(voices, 'pt')?.identifier).toBe('br');
  });

  it('matches custom languages by prefix', () => {
    expect(pickVoice(voices, 'ja')?.identifier).toBe('ja');
  });

  it('returns null when no voice exists for the language', () => {
    expect(pickVoice(voices, 'de')).toBeNull();
  });

  it('does not match languages that merely share a prefix', () => {
    expect(pickVoice([{ identifier: 'x', language: 'esx-AA' }], 'es')).toBeNull();
  });
});

describe('localeFor', () => {
  it('uses the preferred region, or the code itself', () => {
    expect(localeFor('pt')).toBe('pt-BR');
    expect(localeFor('ja')).toBe('ja');
  });
});
