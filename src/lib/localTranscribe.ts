import type { AudioInput } from '@/lib/transcribe';
import type { AudioSegment, LangCode } from '@/lib/types';

// On-device transcription is web-only for now (see localTranscribe.web.ts); native comes later.

export type LocalModel = 'fast' | 'accurate';
export interface LocalSupport {
  supported: boolean;
  webgpu: boolean;
  f16: boolean;
}
/** A status message and, when known, the fraction done. */
export type Progress = (message: string, fraction: number | null) => void;

const unsupported = () => Promise.reject(new Error('On-device transcription is only available in the web app for now.'));

export const localSupport = async (): Promise<LocalSupport> => ({ supported: false, webgpu: false, f16: false });
export const recommendedModel = async (): Promise<LocalModel> => 'fast';
export const prepareModel = (model: LocalModel, onProgress?: Progress, signal?: AbortSignal): Promise<void> => {
  void [model, onProgress, signal];
  return unsupported();
};
export const isModelDownloaded = async (model: LocalModel): Promise<boolean> => {
  void model;
  return false;
};
export const removeModel = async (model: LocalModel): Promise<void> => {
  void model;
};
export const transcribeLocal = (opts: {
  audio: AudioInput;
  lang: LangCode;
  model: LocalModel;
  onProgress?: Progress;
  signal?: AbortSignal;
}): Promise<AudioSegment[]> => {
  void opts;
  return unsupported();
};
