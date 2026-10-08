import { Platform } from 'react-native';

import { appleLookupUrl, applePodcastId } from '@/lib/podcast';

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

/** Turns an Apple Podcasts show link into its RSS feed URL; other links pass through unchanged. */
export async function resolveFeedUrl(url: string): Promise<string> {
  const id = applePodcastId(url);
  if (!id) return url.trim();
  const res = await fetchMedia(appleLookupUrl(id));
  const body = (await res.json().catch(() => null)) as { results?: { feedUrl?: string }[] } | null;
  const feed = body?.results?.find((r) => r.feedUrl)?.feedUrl;
  if (!feed) throw new Error("Couldn't find this show's feed on Apple Podcasts.");
  return feed;
}
