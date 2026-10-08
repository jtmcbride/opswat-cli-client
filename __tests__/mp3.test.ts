import { readFrame, splitMp3 } from '@/lib/mp3';

// MPEG-1 Layer III, 128 kbps, 44.1 kHz, no padding: 417-byte frames of 1152 samples.
const HEADER = [0xff, 0xfb, 0x90, 0x00];
const FRAME_LEN = 417;
const FRAME_SECONDS = 1152 / 44100;

function mp3(frames: number, { id3 = 0 } = {}): Uint8Array {
  const tag = id3 ? [0x49, 0x44, 0x33, 4, 0, 0, 0, 0, (id3 >> 7) & 0x7f, id3 & 0x7f, ...new Array(id3).fill(0)] : [];
  const out = new Uint8Array(tag.length + frames * FRAME_LEN);
  out.set(tag);
  for (let i = 0; i < frames; i++) out.set(HEADER, tag.length + i * FRAME_LEN);
  return out;
}

describe('readFrame', () => {
  it('reads MPEG-1 Layer III frame size and duration', () => {
    const f = readFrame(new Uint8Array([...HEADER, 0, 0]), 0);
    expect(f?.length).toBe(FRAME_LEN);
    expect(f?.duration).toBeCloseTo(FRAME_SECONDS);
  });

  it('rejects non-frames', () => {
    expect(readFrame(new Uint8Array([0x49, 0x44, 0x33, 4]), 0)).toBeNull();
    expect(readFrame(new Uint8Array([0xff, 0xfb, 0xf0, 0]), 0)).toBeNull(); // bad bitrate index
  });
});

describe('splitMp3', () => {
  it('cuts chunks at frame boundaries with their start times', () => {
    const r = splitMp3(mp3(10), FRAME_LEN * 4)!;
    expect(r.chunks.map((c) => [c.start, c.end])).toEqual([
      [0, FRAME_LEN * 4],
      [FRAME_LEN * 4, FRAME_LEN * 8],
      [FRAME_LEN * 8, FRAME_LEN * 10],
    ]);
    expect(r.chunks[1].startTime).toBeCloseTo(4 * FRAME_SECONDS);
    expect(r.chunks[2].startTime).toBeCloseTo(8 * FRAME_SECONDS);
    expect(r.duration).toBeCloseTo(10 * FRAME_SECONDS);
  });

  it('skips a leading ID3 tag', () => {
    const r = splitMp3(mp3(3, { id3: 200 }), 1e6)!;
    expect(r.chunks).toEqual([{ start: 210, end: 210 + FRAME_LEN * 3, startTime: 0 }]);
  });

  it('returns null for data that is not MP3', () => {
    expect(splitMp3(new Uint8Array(5000).fill(7), 1e6)).toBeNull();
  });
});
