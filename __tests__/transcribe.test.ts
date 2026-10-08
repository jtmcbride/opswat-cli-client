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
});
