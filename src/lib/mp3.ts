/**
 * Minimal MP3 frame scanner, used to split long episodes into upload-sized chunks at frame
 * boundaries and to know each chunk's start time (MP3 frames decode independently, so a chunk
 * starting on a frame is a valid MP3 file on its own).
 */

const BITRATES: Record<string, number[]> = {
  // kbps by bitrate index 1-14, keyed by MPEG version (1 or 2; 2.5 uses 2) and layer.
  '1-1': [32, 64, 96, 128, 160, 192, 224, 256, 288, 320, 352, 384, 416, 448],
  '1-2': [32, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 384],
  '1-3': [32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320],
  '2-1': [32, 48, 56, 64, 80, 96, 112, 128, 144, 160, 176, 192, 224, 256],
  '2-2': [8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160],
  '2-3': [8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160],
};
const SAMPLE_RATES: Record<string, number[]> = {
  '1': [44100, 48000, 32000],
  '2': [22050, 24000, 16000],
  '2.5': [11025, 12000, 8000],
};

interface Frame {
  length: number;
  /** Seconds of audio in this frame. */
  duration: number;
}

/** Parses the frame header at `pos`, or returns null if there isn't a valid one there. */
export function readFrame(bytes: Uint8Array, pos: number): Frame | null {
  if (pos + 4 > bytes.length) return null;
  const [b0, b1, b2] = [bytes[pos], bytes[pos + 1], bytes[pos + 2]];
  if (b0 !== 0xff || (b1 & 0xe0) !== 0xe0) return null;
  const versionBits = (b1 >> 3) & 3;
  const layerBits = (b1 >> 1) & 3;
  const bitrateIndex = b2 >> 4;
  const rateIndex = (b2 >> 2) & 3;
  if (versionBits === 1 || layerBits === 0 || bitrateIndex === 0 || bitrateIndex === 15 || rateIndex === 3) return null;
  const version = versionBits === 3 ? '1' : versionBits === 2 ? '2' : '2.5';
  const layer = 4 - layerBits;
  const bitrate = BITRATES[`${version === '1' ? 1 : 2}-${layer}`][bitrateIndex - 1] * 1000;
  const sampleRate = SAMPLE_RATES[version][rateIndex];
  const padding = (b2 >> 1) & 1;
  let length: number;
  let samples: number;
  if (layer === 1) {
    length = (Math.floor((12 * bitrate) / sampleRate) + padding) * 4;
    samples = 384;
  } else {
    const mono = layer === 3 && version !== '1';
    length = Math.floor(((mono ? 72 : 144) * bitrate) / sampleRate) + padding;
    samples = mono ? 576 : 1152;
  }
  return { length, duration: samples / sampleRate };
}

/** Byte offset just past a leading ID3v2 tag (0 if there is none). */
function skipId3(bytes: Uint8Array): number {
  if (bytes.length < 10 || bytes[0] !== 0x49 || bytes[1] !== 0x44 || bytes[2] !== 0x33) return 0;
  const size = ((bytes[6] & 0x7f) << 21) | ((bytes[7] & 0x7f) << 14) | ((bytes[8] & 0x7f) << 7) | (bytes[9] & 0x7f);
  return 10 + size + (bytes[5] & 0x10 ? 10 : 0);
}

/** Finds the next offset where two consecutive valid frames start, to avoid false sync words. */
function resync(bytes: Uint8Array, from: number): number {
  for (let i = from; i + 4 <= bytes.length; i++) {
    const f = readFrame(bytes, i);
    if (f && (i + f.length >= bytes.length || readFrame(bytes, i + f.length))) return i;
  }
  return -1;
}

export interface Mp3Chunk {
  start: number;
  end: number;
  /** Seconds from the start of the episode. */
  startTime: number;
}

/**
 * Splits MP3 bytes into consecutive chunks of at most `maxBytes`, cut at frame boundaries.
 * Returns null if the data doesn't look like MP3.
 */
export function splitMp3(bytes: Uint8Array, maxBytes: number): { chunks: Mp3Chunk[]; duration: number } | null {
  let pos = resync(bytes, skipId3(bytes));
  if (pos < 0) return null;
  const chunks: Mp3Chunk[] = [];
  let chunk: Mp3Chunk = { start: pos, end: pos, startTime: 0 };
  let time = 0;
  let frames = 0;
  while (pos < bytes.length) {
    let frame = readFrame(bytes, pos);
    if (!frame) {
      // Junk between frames (or a trailing tag): skip ahead to the next real frame.
      const next = resync(bytes, pos + 1);
      if (next < 0) break;
      pos = next;
      frame = readFrame(bytes, pos)!;
    }
    if (pos + frame.length - chunk.start > maxBytes && chunk.end > chunk.start) {
      chunks.push(chunk);
      chunk = { start: pos, end: pos, startTime: time };
    }
    pos += frame.length;
    chunk.end = Math.min(pos, bytes.length);
    time += frame.duration;
    frames++;
  }
  if (frames === 0) return null;
  chunks.push(chunk);
  return { chunks, duration: time };
}
