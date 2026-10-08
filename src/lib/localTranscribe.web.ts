import { readAudioBytes } from '@/lib/audioFiles';
import { linesFromWords, quietestCut } from '@/lib/localLines';
import type { LocalModel, LocalSupport, Progress } from '@/lib/localTranscribe';
import { splitMp3 } from '@/lib/mp3';
import type { AudioInput } from '@/lib/transcribe';
import type { AudioSegment, LangCode } from '@/lib/types';
import type { TimedWord } from '@/lib/wordSync';

export type { LocalModel, LocalSupport, Progress } from '@/lib/localTranscribe';

/**
 * On-device transcription for the web build: Whisper via transformers.js in a Web Worker, using
 * WebGPU when the browser has it and WebAssembly otherwise. The library is loaded from a pinned
 * CDN URL only when this is used; models download from Hugging Face once and stay in the
 * browser's cache.
 */

const TRANSFORMERS_URL = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.1/dist/transformers.min.js';
const MODEL_REPOS: Record<LocalModel, string> = { fast: 'Xenova/whisper-base', accurate: 'Xenova/whisper-small' };
const CACHE_NAME = 'transformers-cache';
const RATE = 16000;
/** Whisper hears at most 30 s at a time; windows are cut at a quiet moment before that. */
const WINDOW_MAX = 29.5 * RATE;
const WINDOW_MIN = 22 * RATE;

type Dtype = string | Record<string, string>;
interface LoadConfig {
  device: 'webgpu' | 'wasm';
  dtype: Dtype;
}

const WORKER_SOURCE = `
import { pipeline, env } from '${TRANSFORMERS_URL}';
env.allowLocalModels = false;
let asr = null;
let loadedKey = null;
self.onmessage = async ({ data }) => {
  try {
    if (data.type === 'load') {
      const key = JSON.stringify([data.repo, data.config]);
      if (loadedKey !== key) {
        if (asr) await asr.dispose?.();
        asr = null;
        loadedKey = null;
        const files = {};
        asr = await pipeline('automatic-speech-recognition', data.repo, {
          ...data.config,
          progress_callback: (p) => {
            if (p.status !== 'progress' || !p.total) return;
            files[p.file] = [p.loaded, p.total];
            let loaded = 0, total = 0;
            for (const [l, t] of Object.values(files)) { loaded += l; total += t; }
            self.postMessage({ type: 'progress', loaded, total });
          },
        });
        loadedKey = key;
      }
      self.postMessage({ type: 'ready' });
    } else if (data.type === 'run') {
      const out = await asr(data.audio, { return_timestamps: 'word', language: data.language ?? undefined, task: 'transcribe' });
      self.postMessage({ type: 'result', chunks: out.chunks ?? [] });
    }
  } catch (err) {
    self.postMessage({ type: 'error', message: String(err?.message ?? err) });
  }
};
`;

let worker: Worker | null = null;

function getWorker(): Worker {
  if (!worker) {
    const url = URL.createObjectURL(new Blob([WORKER_SOURCE], { type: 'text/javascript' }));
    worker = new Worker(url, { type: 'module' });
  }
  return worker;
}

function stopWorker() {
  worker?.terminate();
  worker = null;
}

/** Sends one request to the worker and waits for its answer, relaying download progress. */
function ask<T>(message: object, transfer: Transferable[] = [], onDownload?: (fraction: number) => void, signal?: AbortSignal): Promise<T> {
  const w = getWorker();
  return new Promise<T>((resolve, reject) => {
    const cleanup = () => {
      w.removeEventListener('message', onMessage);
      w.removeEventListener('error', onError);
      signal?.removeEventListener('abort', onAbort);
    };
    const onMessage = ({ data }: MessageEvent) => {
      if (data.type === 'progress') return onDownload?.(data.loaded / data.total);
      cleanup();
      if (data.type === 'error') reject(new Error(data.message));
      else resolve(data as T);
    };
    const onError = (e: ErrorEvent) => {
      cleanup();
      stopWorker();
      reject(new Error(e.message || "Couldn't start on-device transcription (the speech library failed to load)."));
    };
    const onAbort = () => {
      cleanup();
      // Stopping the worker is the only way to interrupt a running model.
      stopWorker();
      reject(new DOMException('Cancelled', 'AbortError'));
    };
    w.addEventListener('message', onMessage);
    w.addEventListener('error', onError);
    signal?.addEventListener('abort', onAbort);
    w.postMessage(message, transfer);
  });
}

let support: Promise<LocalSupport> | null = null;

export function localSupport(): Promise<LocalSupport> {
  support ??= (async () => {
    const supported = typeof Worker !== 'undefined' && typeof WebAssembly !== 'undefined' && typeof OfflineAudioContext !== 'undefined';
    let webgpu = false;
    let f16 = false;
    try {
      const gpu = (navigator as Navigator & { gpu?: { requestAdapter(): Promise<{ features: Set<string> } | null> } }).gpu;
      const adapter = await gpu?.requestAdapter();
      webgpu = !!adapter;
      f16 = !!adapter?.features.has('shader-f16');
    } catch {
      // No WebGPU.
    }
    return { supported, webgpu, f16 };
  })();
  return support;
}

/** The model this device handles well: Accurate with a GPU, Fast without. */
export async function recommendedModel(): Promise<LocalModel> {
  return (await localSupport()).webgpu ? 'accurate' : 'fast';
}

const remembered = (model: LocalModel) => `lingo.localModelConfig.${model}`;

/** Ways to load a model, best first; the first that loads is remembered for next time. */
async function loadConfigs(model: LocalModel): Promise<LoadConfig[]> {
  const wasm: LoadConfig = { device: 'wasm', dtype: 'q8' };
  try {
    const saved = globalThis.localStorage?.getItem(remembered(model));
    if (saved) return [JSON.parse(saved) as LoadConfig, wasm];
  } catch {
    // Ignore unreadable storage.
  }
  const { webgpu, f16 } = await localSupport();
  if (!webgpu) return [wasm];
  return [
    { device: 'webgpu', dtype: { encoder_model: f16 ? 'fp16' : 'fp32', decoder_model_merged: 'q4' } },
    { device: 'webgpu', dtype: 'q8' },
    wasm,
  ];
}

/** Downloads (first time) and loads the model, reporting download progress. */
export async function prepareModel(model: LocalModel, onProgress?: Progress, signal?: AbortSignal): Promise<void> {
  const repo = MODEL_REPOS[model];
  let lastError: unknown;
  for (const config of await loadConfigs(model)) {
    try {
      onProgress?.('Loading the speech model…', null);
      await ask({ type: 'load', repo, config }, [], (f) => onProgress?.('Downloading the speech model…', f), signal);
      try {
        globalThis.localStorage?.setItem(remembered(model), JSON.stringify(config));
      } catch {
        // Not remembering is fine.
      }
      return;
    } catch (e) {
      if ((e as Error).name === 'AbortError') throw e;
      lastError = e;
      stopWorker();
    }
  }
  throw new Error(`Couldn't load the speech model: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
}

async function cachedKeys(model: LocalModel): Promise<Request[]> {
  if (typeof caches === 'undefined') return [];
  const cache = await caches.open(CACHE_NAME);
  const repo = MODEL_REPOS[model];
  return (await cache.keys()).filter((r) => r.url.includes(`/${repo}/`));
}

/** Whether the model's weights are already in this browser's cache. */
export async function isModelDownloaded(model: LocalModel): Promise<boolean> {
  return (await cachedKeys(model)).some((r) => r.url.endsWith('.onnx'));
}

export async function removeModel(model: LocalModel): Promise<void> {
  stopWorker();
  const cache = await caches.open(CACHE_NAME);
  await Promise.all((await cachedKeys(model)).map((r) => cache.delete(r)));
  try {
    globalThis.localStorage?.removeItem(remembered(model));
  } catch {
    // Ignore.
  }
}

/** Decodes audio to 16 kHz mono, piece by piece (MP3s are split first so long episodes fit in memory). */
async function* decodePieces(audio: AudioInput): AsyncGenerator<{ samples: Float32Array; total?: number }> {
  const bytes = await readAudioBytes(audio);
  const split = splitMp3(bytes, 4 * 1024 * 1024);
  const parts = split ? split.chunks.map((c) => bytes.subarray(c.start, c.end)) : [bytes];
  for (const part of parts) {
    const ctx = new OfflineAudioContext(1, 1, RATE);
    let buffer: AudioBuffer;
    try {
      // decodeAudioData takes ownership of its buffer, so give it a copy; it resamples to 16 kHz.
      buffer = await ctx.decodeAudioData(part.slice().buffer);
    } catch {
      throw new Error("This browser can't decode this audio file.");
    }
    let samples = buffer.getChannelData(0);
    if (buffer.numberOfChannels > 1) {
      samples = new Float32Array(samples);
      for (let c = 1; c < buffer.numberOfChannels; c++) {
        const ch = buffer.getChannelData(c);
        for (let i = 0; i < samples.length; i++) samples[i] += ch[i];
      }
      for (let i = 0; i < samples.length; i++) samples[i] /= buffer.numberOfChannels;
    }
    yield { samples, total: split?.duration ?? buffer.duration };
  }
}

const concat = (a: Float32Array, b: Float32Array) => {
  const out = new Float32Array(a.length + b.length);
  out.set(a);
  out.set(b, a.length);
  return out;
};

const rms = (s: Float32Array) => {
  let sum = 0;
  for (let i = 0; i < s.length; i++) sum += s[i] * s[i];
  return Math.sqrt(sum / Math.max(1, s.length));
};

/** Transcribes audio on this device, returning timed lines with word timings. */
export async function transcribeLocal({
  audio,
  lang,
  model,
  onProgress,
  signal,
}: {
  audio: AudioInput;
  lang: LangCode;
  model: LocalModel;
  onProgress?: Progress;
  signal?: AbortSignal;
}): Promise<AudioSegment[]> {
  await prepareModel(model, onProgress, signal);
  const iso = lang.toLowerCase().split(/[-_]/)[0];
  const language = /^[a-z]{2}$/.test(iso) ? iso : null;

  const words: TimedWord[] = [];
  let total = 0;
  let pending = new Float32Array(0);
  let pendingStart = 0;

  const run = async (window: Float32Array, start: number) => {
    // Read before the samples are handed (transferred) to the worker, which empties `window`.
    const length = window.length / RATE;
    // Whisper tends to invent text for silence (music beds, pauses), so skip near-silent windows.
    if (rms(window) >= 0.002) {
      const { chunks } = await ask<{ chunks: { text: string; timestamp: [number, number | null] }[] }>(
        { type: 'run', audio: window, language },
        [window.buffer],
        undefined,
        signal,
      );
      // Whisper stretches a window's last word to the window's end; keep every word inside its window.
      for (const c of chunks) {
        const [s, e] = c.timestamp;
        words.push({ word: c.text, start: start + Math.min(s, length), end: start + Math.min(e ?? s, length) });
      }
    }
    if (total) onProgress?.('Transcribing on this device…', Math.min(1, (start + length) / total));
  };

  onProgress?.('Preparing audio…', null);
  for await (const piece of decodePieces(audio)) {
    if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
    total = piece.total ?? total;
    pending = concat(pending, piece.samples);
    while (pending.length >= WINDOW_MAX) {
      const cut = quietestCut(pending, WINDOW_MIN, WINDOW_MAX, RATE);
      const window = pending.slice(0, cut);
      pending = pending.slice(cut);
      const start = pendingStart;
      pendingStart += cut / RATE;
      await run(window, start);
    }
  }
  if (pending.length > RATE * 0.3) await run(pending, pendingStart);

  // A word ends no later than the next one starts, so lines never overlap.
  for (let i = 0; i < words.length - 1; i++) words[i].end = Math.max(words[i].start, Math.min(words[i].end, words[i + 1].start));
  const lines = linesFromWords(words);
  if (!lines.length) throw new Error('No speech was found in this audio.');
  return lines;
}
