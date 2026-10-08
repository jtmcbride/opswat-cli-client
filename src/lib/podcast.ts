import { XMLParser } from 'fast-xml-parser';

export interface Episode {
  title: string;
  url: string;
  /** Milliseconds since the epoch, when the feed gives a parseable date. */
  date?: number;
  /** Seconds. */
  duration?: number;
  /** Bytes, as the feed declares it (often missing or approximate). */
  size?: number;
  type?: string;
}

export interface Feed {
  title: string;
  episodes: Episode[];
}

const AUDIO_EXT = /\.(mp3|m4a|aac|wav|ogg|oga|opus|flac|mp4)(\?|#|$)/i;

/** The show id in an Apple Podcasts link (podcasts.apple.com/…/id123456789), if it is one. */
export function applePodcastId(url: string): string | null {
  const m = /^https?:\/\/(?:podcasts|itunes)\.apple\.com\/.*\bid(\d+)/i.exec(url.trim());
  return m ? m[1] : null;
}

/** Apple's public lookup endpoint, which returns a show's RSS feed URL. */
export const appleLookupUrl = (id: string) => `https://itunes.apple.com/lookup?id=${id}&entity=podcast`;

/** Whether a URL points straight at an audio file rather than a feed. */
export const isAudioUrl = (url: string) => AUDIO_EXT.test(url);

/** Whether an episode is MP3, which is the only format long files can be split from. */
export const isMp3 = (e: { url: string; type?: string }) =>
  e.type ? /mpeg|mp3/i.test(e.type) : /\.mp3(\?|#|$)/i.test(e.url);

/** Parses "1:02:03", "62:03" or "3723" into seconds. */
export function parseDuration(value: unknown): number | undefined {
  const s = String(value ?? '').trim();
  if (!s) return undefined;
  const parts = s.split(':').map(Number);
  if (parts.some((n) => !Number.isFinite(n))) return undefined;
  return parts.reduce((total, n) => total * 60 + n, 0) || undefined;
}

const text = (v: unknown): string => {
  if (v == null) return '';
  if (typeof v === 'object') return text((v as Record<string, unknown>)['#text']);
  return String(v).trim();
};

const list = <T>(v: T | T[] | undefined): T[] => (v == null ? [] : Array.isArray(v) ? v : [v]);

/** Parses a podcast RSS feed. Throws if the text isn't an RSS feed. */
export function parseFeed(xml: string): Feed {
  let doc: Record<string, unknown>;
  try {
    doc = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_', processEntities: true }).parse(xml);
  } catch {
    throw new Error("That doesn't look like a podcast feed.");
  }
  const channel = (doc?.rss as Record<string, unknown> | undefined)?.channel as Record<string, unknown> | undefined;
  if (!channel) throw new Error("That doesn't look like a podcast feed.");

  const episodes: Episode[] = [];
  for (const item of list(channel.item as Record<string, unknown> | Record<string, unknown>[])) {
    const enclosure = list(item.enclosure as Record<string, string> | Record<string, string>[])[0];
    const url = enclosure?.['@_url'];
    if (!url) continue;
    const size = Number(enclosure['@_length']);
    const date = Date.parse(text(item.pubDate));
    episodes.push({
      title: text(item.title) || 'Untitled episode',
      url,
      date: Number.isFinite(date) ? date : undefined,
      duration: parseDuration(text(item['itunes:duration'])),
      size: size > 0 ? size : undefined,
      type: enclosure['@_type'] || undefined,
    });
  }
  return { title: text(channel.title) || 'Podcast', episodes };
}
