import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';

import { Button, Input, Row, T } from '@/components/ui';
import { radius, space, useTheme } from '@/constants/theme';
import { downloadAudio } from '@/lib/audioFiles';
import { fetchMedia, resolveFeedUrl } from '@/lib/media';
import { isAudioUrl, isMp3, parseFeed, type Episode, type Feed } from '@/lib/podcast';
import { MAX_AUDIO_BYTES, type AudioInput } from '@/lib/transcribe';
import { MAX_EPISODE_BYTES } from '@/lib/transcribeLong';
import type { LangCode, SavedPodcast } from '@/lib/types';
import { useStore } from '@/store/useStore';

const PAGE = 30;

const fileName = (url: string) => {
  try {
    return decodeURIComponent(new URL(url).pathname.split('/').pop() || '') || 'episode.mp3';
  } catch {
    return 'episode.mp3';
  }
};

const mb = (bytes: number) =>
  bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${Math.round(bytes / 1024 / 1024)} MB`;

/** Why an episode can't be transcribed, if it can't. */
function blocked(e: Episode): string | null {
  if (e.size && e.size > MAX_EPISODE_BYTES) return `Too large (${mb(e.size)})`;
  if (e.size && e.size > MAX_AUDIO_BYTES && !isMp3(e)) return 'Too long to transcribe (only MP3 can be split)';
  return null;
}

async function loadFeed(url: string): Promise<Feed> {
  const feed = parseFeed(await (await fetchMedia(url)).text());
  if (!feed.episodes.length) throw new Error('This feed has no episodes with audio.');
  return feed;
}

const newCount = (feed: Feed, since: number) => feed.episodes.filter((e) => (e.date ?? 0) > since).length;

/** Load a podcast (saved, RSS, Apple Podcasts link) or audio link, and download an episode from it. */
export function PodcastPicker({
  lang,
  onPicked,
}: {
  lang: LangCode;
  onPicked: (audio: AudioInput, title: string, url: string) => void;
}) {
  const t = useTheme();
  const allPodcasts = useStore((s) => s.podcasts);
  const texts = useStore((s) => s.texts);
  const savePodcast = useStore((s) => s.savePodcast);
  const removePodcast = useStore((s) => s.removePodcast);
  const markPodcastSeen = useStore((s) => s.markPodcastSeen);
  const saved = allPodcasts.filter((p) => p.lang === lang);

  const [url, setUrl] = useState('');
  const [feed, setFeed] = useState<(Feed & { url: string; newSince?: number }) | null>(null);
  const [shown, setShown] = useState(PAGE);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState<{ url: string; progress: number | null } | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** New-episode counts for saved podcasts, checked in the background. */
  const [fresh, setFresh] = useState<Record<string, number>>({});

  useEffect(() => {
    let live = true;
    (async () => {
      for (const p of useStore.getState().podcasts.filter((x) => x.lang === lang)) {
        try {
          const n = newCount(await loadFeed(p.url), p.seenAt);
          if (live) setFresh((f) => ({ ...f, [p.url]: n }));
        } catch {
          // Offline or the feed moved; the list still works.
        }
      }
    })();
    return () => {
      live = false;
    };
  }, [lang]);

  const transcribed = (episodeUrl: string) => texts.find((x) => x.audioUrl === episodeUrl);
  const isSaved = (feedUrl: string) => saved.some((p) => p.url === feedUrl);

  const download = async (audioUrl: string, title: string) => {
    setError(null);
    setDownloading({ url: audioUrl, progress: null });
    try {
      const audio = await downloadAudio(audioUrl, fileName(audioUrl), (progress) => setDownloading({ url: audioUrl, progress }));
      onPicked(audio, title, audioUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setDownloading(null);
    }
  };

  const open = async (link: string, podcast?: SavedPodcast) => {
    link = link.trim();
    setError(null);
    setFeed(null);
    if (isAudioUrl(link)) return download(link, fileName(link).replace(/\.[^.]+$/, ''));
    setLoading(true);
    try {
      const feedUrl = await resolveFeedUrl(link);
      const res = await fetchMedia(feedUrl);
      if (/^audio\//i.test(res.headers.get('content-type') ?? '')) {
        void res.body?.cancel();
        setLoading(false);
        return download(feedUrl, fileName(feedUrl).replace(/\.[^.]+$/, ''));
      }
      const parsed = parseFeed(await res.text());
      if (!parsed.episodes.length) throw new Error('This feed has no episodes with audio.');
      const known = podcast ?? saved.find((p) => p.url === feedUrl);
      setFeed({ ...parsed, url: feedUrl, newSince: known?.seenAt });
      setShown(PAGE);
      if (known) {
        markPodcastSeen(lang, feedUrl, parsed.title);
        setFresh((f) => ({ ...f, [feedUrl]: 0 }));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const busy = loading || !!downloading;

  return (
    <View style={{ gap: space.sm }}>
      {!feed && saved.length > 0 && (
        <View style={{ gap: space.xs }}>
          <T variant="small">Your podcasts</T>
          {saved.map((p) => (
            <Pressable
              key={p.url}
              accessibilityRole="button"
              accessibilityLabel={`Open ${p.title}`}
              disabled={busy}
              onPress={() => open(p.url, p)}
              style={({ pressed }) => [styles(t).row, { opacity: pressed ? 0.7 : 1 }]}>
              <Ionicons name="headset-outline" size={18} color={t.textMuted} />
              <T style={{ flex: 1, fontWeight: '600' }} numberOfLines={1}>
                {p.title}
              </T>
              {!!fresh[p.url] && <Badge label={`${fresh[p.url]} new`} />}
            </Pressable>
          ))}
        </View>
      )}

      <Input
        accessibilityLabel="Podcast feed or audio link"
        placeholder="Feed, Apple Podcasts or audio link"
        value={url}
        onChangeText={setUrl}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        onSubmitEditing={() => open(url)}
      />
      <Button
        variant="secondary"
        icon="cloud-download-outline"
        title="Load"
        onPress={() => open(url)}
        loading={loading}
        disabled={!url.trim() || busy}
      />
      {downloading && (
        <T variant="small">
          Downloading episode…{downloading.progress != null ? ` ${Math.round(downloading.progress * 100)}%` : ''}
        </T>
      )}
      {error && <T style={{ color: t.danger }}>{error}</T>}

      {feed && (
        <View style={{ gap: space.xs }}>
          <Row style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}>
            <T variant="heading" style={{ flex: 1 }} numberOfLines={2}>
              {feed.title}
            </T>
            {isSaved(feed.url) ? (
              <Button compact variant="ghost" icon="bookmark" title="Saved" onPress={() => removePodcast(lang, feed.url)} />
            ) : (
              <Button
                compact
                variant="secondary"
                icon="bookmark-outline"
                title="Save"
                onPress={() => savePodcast({ lang, url: feed.url, title: feed.title })}
              />
            )}
          </Row>
          <Button variant="ghost" icon="arrow-back" title="All podcasts" onPress={() => setFeed(null)} />
          {feed.episodes.slice(0, shown).map((e) => {
            const reason = blocked(e);
            const done = transcribed(e.url);
            const isNew = feed.newSince !== undefined && (e.date ?? 0) > feed.newSince;
            const meta = [
              e.date ? new Date(e.date).toLocaleDateString() : null,
              e.duration ? `${Math.round(e.duration / 60)} min` : null,
              e.size ? mb(e.size) : null,
            ].filter(Boolean);
            return (
              <Pressable
                key={e.url}
                accessibilityRole="button"
                accessibilityState={{ disabled: busy || (!!reason && !done) }}
                disabled={busy || (!!reason && !done)}
                onPress={() => {
                  if (done) return router.push({ pathname: '/read/[id]', params: { id: done.id } });
                  // Picking an episode keeps the podcast in "Your podcasts".
                  savePodcast({ lang, url: feed.url, title: feed.title });
                  void download(e.url, e.title);
                }}
                style={({ pressed }) => [
                  styles(t).episode,
                  {
                    backgroundColor: downloading?.url === e.url ? t.primarySoft : t.surface,
                    opacity: reason && !done ? 0.5 : pressed ? 0.7 : 1,
                  },
                ]}>
                <Row style={{ flexWrap: 'nowrap', alignItems: 'flex-start' }}>
                  <T style={{ flex: 1, fontWeight: '600' }} numberOfLines={2}>
                    {e.title}
                  </T>
                  {done ? <Badge label="Transcribed" muted /> : isNew ? <Badge label="New" /> : null}
                </Row>
                {meta.length > 0 && <T variant="small">{meta.join(' · ')}</T>}
                {reason && !done && <T variant="small">{reason}</T>}
              </Pressable>
            );
          })}
          {feed.episodes.length > shown && (
            <Button variant="ghost" title={`Show more (${feed.episodes.length - shown})`} onPress={() => setShown(shown + PAGE)} />
          )}
        </View>
      )}
    </View>
  );
}

function Badge({ label, muted }: { label: string; muted?: boolean }) {
  const t = useTheme();
  return (
    <View style={{ paddingHorizontal: space.sm, paddingVertical: 2, borderRadius: radius.pill, backgroundColor: muted ? t.surfaceAlt : t.primarySoft }}>
      <T variant="small" style={{ color: muted ? t.textMuted : t.primary, fontWeight: '600' }}>
        {label}
      </T>
    </View>
  );
}

const styles = (t: ReturnType<typeof useTheme>) => ({
  row: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: t.border,
    backgroundColor: t.surface,
  },
  episode: { padding: space.md, borderRadius: radius.md, borderWidth: 1, borderColor: t.border, gap: 2 },
});
