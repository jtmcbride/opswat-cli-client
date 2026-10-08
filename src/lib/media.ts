import { Platform } from 'react-native';

/** CORS proxy for the web build (see proxy/README.md). Native apps fetch directly. */
const PROXY = process.env.EXPO_PUBLIC_MEDIA_PROXY;

const viaProxy = (url: string) => `${PROXY}?url=${encodeURIComponent(url)}`;

/**
 * Fetches a podcast feed or audio file. On web, most podcast hosts block cross-origin requests,
 * so a failed direct request is retried through the media proxy.
 */
export async function fetchMedia(url: string): Promise<Response> {
  if (!/^https?:\/\//i.test(url)) throw new Error('Enter a link starting with http:// or https://');
  let res: Response;
  try {
    res = await fetch(url);
  } catch (e) {
    if (Platform.OS !== 'web') throw e;
    if (!PROXY) throw new Error("This site doesn't allow loading from a browser, and no media proxy is set up.");
    res = await fetch(viaProxy(url));
  }
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Couldn't load that link (HTTP ${res.status})${detail && detail.length < 200 ? `: ${detail}` : '.'}`);
  }
  return res;
}
