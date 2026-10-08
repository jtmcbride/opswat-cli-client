import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Button, Input, T } from '@/components/ui';
import { radius, space, useTheme } from '@/constants/theme';
import { downloadAudio } from '@/lib/audioFiles';
import { fetchMedia } from '@/lib/media';
import { isAudioUrl, isMp3, parseFeed, type Episode, type Feed } from '@/lib/podcast';
import { MAX_AUDIO_BYTES, type AudioInput } from '@/lib/transcribe';
import { MAX_EPISODE_BYTES } from '@/lib/transcribeLong';

const PAGE = 30;

const fileName = (url: string) => {
  try {
    return decodeURIComponent(new URL(url).pathname.split('/').pop() || '') || 'episode.mp3';
  } catch {
    return 'episode.mp3';
  }
};

const mb = (bytes: number) => `${Math.round(bytes / 1024 / 1024)} MB`;

/** Why an episode can't be transcribed, if it can't. */
function blocked(e: Episode): string | null {
  if (e.size && e.size > MAX_EPISODE_BYTES) return `Too large (${mb(e.size)})`;
  if (e.size && e.size > MAX_AUDIO_BYTES && !isMp3(e)) return 'Too long to transcribe (only MP3 can be split)';
  return null;
}

/** Load a podcast feed or audio link and download an episode from it. */
export function PodcastPicker({ onPicked }: { onPicked: (audio: AudioInput, title: string, url: string) => void }) {
  const t = useTheme();
  const [url, setUrl] = useState('');
  const [feed, setFeed] = useState<Feed | null>(null);
  const [shown, setShown] = useState(PAGE);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState<{ url: string; progress: number | null } | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  const load = async () => {
    const link = url.trim();
    setError(null);
    setFeed(null);
    if (isAudioUrl(link)) return download(link, fileName(link).replace(/\.[^.]+$/, ''));
    setLoading(true);
    try {
      const res = await fetchMedia(link);
      if (/^audio\//i.test(res.headers.get('content-type') ?? '')) {
        void res.body?.cancel();
        setLoading(false);
        return download(link, fileName(link).replace(/\.[^.]+$/, ''));
      }
      const parsed = parseFeed(await res.text());
      if (!parsed.episodes.length) throw new Error('This feed has no episodes with audio.');
      setFeed(parsed);
      setShown(PAGE);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const busy = loading || !!downloading;

  return (
    <View style={{ gap: space.sm }}>
      <Input
        accessibilityLabel="Podcast feed or audio link"
        placeholder="Podcast RSS feed or audio file link"
        value={url}
        onChangeText={setUrl}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        onSubmitEditing={load}
      />
      <Button variant="secondary" icon="cloud-download-outline" title="Load" onPress={load} loading={loading} disabled={!url.trim() || busy} />
      {downloading && (
        <T variant="small">
          Downloading episode…{downloading.progress != null ? ` ${Math.round(downloading.progress * 100)}%` : ''}
        </T>
      )}
      {error && <T style={{ color: t.danger }}>{error}</T>}

      {feed && (
        <View style={{ gap: space.xs }}>
          <T variant="heading">{feed.title}</T>
          {feed.episodes.slice(0, shown).map((e) => {
            const reason = blocked(e);
            const meta = [
              e.date ? new Date(e.date).toLocaleDateString() : null,
              e.duration ? `${Math.round(e.duration / 60)} min` : null,
              e.size ? mb(e.size) : null,
            ].filter(Boolean);
            return (
              <Pressable
                key={e.url}
                accessibilityRole="button"
                accessibilityState={{ disabled: busy || !!reason }}
                disabled={busy || !!reason}
                onPress={() => download(e.url, e.title)}
                style={({ pressed }) => ({
                  padding: space.md,
                  borderRadius: radius.md,
                  borderWidth: 1,
                  borderColor: t.border,
                  backgroundColor: downloading?.url === e.url ? t.primarySoft : t.surface,
                  opacity: reason ? 0.5 : pressed ? 0.7 : 1,
                  gap: 2,
                })}>
                <T style={{ fontWeight: '600' }} numberOfLines={2}>
                  {e.title}
                </T>
                {meta.length > 0 && <T variant="small">{meta.join(' · ')}</T>}
                {reason && <T variant="small">{reason}</T>}
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
