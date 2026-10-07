import { matchSpeech } from '@/lib/pronunciation';

describe('matchSpeech', () => {
  it('marks each target word heard or missed, ignoring case, accents and punctuation', () => {
    const m = matchSpeech('¿Dónde está la playa?', ['donde esta la plaza']);
    expect(m.words).toEqual([
      { text: 'Dónde', heard: true },
      { text: 'está', heard: true },
      { text: 'la', heard: true },
      { text: 'playa', heard: false },
    ]);
    expect(m.score).toBe(0.75);
  });

  it('picks the best recognition alternative', () => {
    const m = matchSpeech('Tengo hambre', ['tengo hombre', 'tengo hambre']);
    expect(m.score).toBe(1);
    expect(m.transcript).toBe('tengo hambre');
  });

  it('handles extra and missing words', () => {
    expect(matchSpeech('el perro grande', ['el perro es muy grande']).score).toBe(1);
    expect(matchSpeech('el perro grande', ['']).score).toBe(0);
  });
});
