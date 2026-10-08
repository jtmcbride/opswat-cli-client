import { applePodcastId, isAudioUrl, isMp3, parseDuration, parseFeed } from '@/lib/podcast';

const FEED = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd">
  <channel>
    <title>Café &amp; Charla</title>
    <item>
      <title><![CDATA[Episodio 2: el mercado]]></title>
      <pubDate>Tue, 06 Oct 2026 08:00:00 GMT</pubDate>
      <itunes:duration>1:02:03</itunes:duration>
      <enclosure url="https://cdn.example.com/ep2.mp3?x=1" length="31457280" type="audio/mpeg"/>
    </item>
    <item>
      <title>Notas del programa</title>
    </item>
    <item>
      <title>Episodio 1</title>
      <itunes:duration>754</itunes:duration>
      <enclosure url="https://cdn.example.com/ep1.m4a" length="0" type="audio/x-m4a"/>
    </item>
  </channel>
</rss>`;

describe('parseFeed', () => {
  it('reads episodes with audio, skipping items without an enclosure', () => {
    const feed = parseFeed(FEED);
    expect(feed.title).toBe('Café & Charla');
    expect(feed.episodes).toEqual([
      {
        title: 'Episodio 2: el mercado',
        url: 'https://cdn.example.com/ep2.mp3?x=1',
        date: Date.UTC(2026, 9, 6, 8),
        duration: 3723,
        size: 31457280,
        type: 'audio/mpeg',
      },
      { title: 'Episodio 1', url: 'https://cdn.example.com/ep1.m4a', date: undefined, duration: 754, size: undefined, type: 'audio/x-m4a' },
    ]);
  });

  it('rejects things that are not RSS', () => {
    expect(() => parseFeed('<html><body>hi</body></html>')).toThrow('podcast feed');
    expect(() => parseFeed('not xml at all')).toThrow('podcast feed');
  });
});

describe('helpers', () => {
  it('parses durations', () => {
    expect(parseDuration('1:02:03')).toBe(3723);
    expect(parseDuration('62:03')).toBe(3723);
    expect(parseDuration('90')).toBe(90);
    expect(parseDuration('')).toBeUndefined();
    expect(parseDuration('abc')).toBeUndefined();
  });

  it('recognizes audio URLs and MP3 episodes', () => {
    expect(isAudioUrl('https://x.com/a/ep.mp3?token=1')).toBe(true);
    expect(isAudioUrl('https://x.com/feed.xml')).toBe(false);
    expect(isMp3({ url: 'https://x.com/a.m4a', type: 'audio/mpeg' })).toBe(true);
    expect(isMp3({ url: 'https://x.com/a.mp3' })).toBe(true);
    expect(isMp3({ url: 'https://x.com/a.m4a', type: 'audio/x-m4a' })).toBe(false);
  });

  it('extracts the show id from Apple Podcasts links', () => {
    expect(applePodcastId('https://podcasts.apple.com/us/podcast/coffee-break-spanish/id201384466')).toBe('201384466');
    expect(applePodcastId('https://podcasts.apple.com/es/podcast/x/id123?i=1000600')).toBe('123');
    expect(applePodcastId('https://feeds.example.com/id123.xml')).toBeNull();
  });
});
