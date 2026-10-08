import { parseSegments } from '@/lib/transcribe';

describe('parseSegments', () => {
  it('keeps timed segments, trimming text and dropping empty ones', () => {
    expect(
      parseSegments({
        text: 'Hola. ¿Qué tal?',
        segments: [
          { id: 0, start: 0, end: 1.5, text: ' Hola. ' },
          { id: 1, start: 1.5, end: 2, text: '  ' },
          { id: 2, start: 2, end: 3.2, text: ' ¿Qué tal?' },
        ],
      }),
    ).toEqual([
      { start: 0, end: 1.5, text: 'Hola.' },
      { start: 2, end: 3.2, text: '¿Qué tal?' },
    ]);
  });

  it('falls back to the full text as one segment', () => {
    expect(parseSegments({ text: ' Hola. ', duration: 4 })).toEqual([{ start: 0, end: 4, text: 'Hola.' }]);
  });

  it('rejects a response with no speech', () => {
    expect(() => parseSegments({ text: ' ', segments: [] })).toThrow('No speech');
  });

  it('attaches word start times aligned to each line', () => {
    const segments = parseSegments({
      segments: [
        { start: 0, end: 2, text: ' Hola, ¿qué tal?' },
        { start: 2, end: 4, text: ' Muy bien.' },
      ],
      words: [
        { word: 'Hola', start: 0.1, end: 0.5 },
        { word: 'qué', start: 0.8, end: 1.1 },
        { word: 'tal', start: 1.2, end: 1.6 },
        { word: 'Muy', start: 2.1, end: 2.4 },
        { word: 'bien', start: 2.5, end: 2.9 },
      ],
    });
    expect(segments.map((s) => s.wordStarts)).toEqual([
      [0.1, 0.8, 1.2],
      [2.1, 2.5],
    ]);
  });

  it('leaves word timings out when the response has none', () => {
    expect(parseSegments({ segments: [{ start: 0, end: 1, text: 'Hola' }] })[0].wordStarts).toBeUndefined();
  });
});
