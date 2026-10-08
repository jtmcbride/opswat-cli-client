import { Ionicons } from '@expo/vector-icons';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { Sentence } from '@/components/Sentence';
import { Button, Row, Screen, T } from '@/components/ui';
import { radius, space, useTheme } from '@/constants/theme';
import { downloadAudio } from '@/lib/audioFiles';
import { getAudioUri, releaseAudioUri, saveAudio } from '@/lib/audioStore';
import type { DictIndex } from '@/lib/dictionary';
import type { AudioSegment, ReadingText } from '@/lib/types';

type OnWord = (surface: string, lemmas: string[], sentence: string) => void;

interface Props {
  text: ReadingText & { segments: AudioSegment[] };
  index: DictIndex;
  known: Set<string>;
  onWord: OnWord;
  /** Rendered above and below the transcript, inside the scroll view. */
  header?: ReactNode;
  footer?: ReactNode;
}

/** Height reserved under the transcript for the pinned player bar. */
export const PLAYER_BAR_SPACE = 84;

/**
 * Page body for a transcribed text: the timed lines, and a player bar pinned to the bottom when the
 * audio is on this device.
 */
export function Transcript({ text, index, known, onWord, header, footer }: Props) {
  const [uri, setUri] = useState<string | null | undefined>(text.audioName ? undefined : null);
  const [fetching, setFetching] = useState<{ progress: number | null } | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    if (!text.audioName) return;
    let live = true;
    getAudioUri(text.id).then((u) => {
      if (live) setUri(u);
      else if (u) releaseAudioUri(u);
    });
    return () => {
      live = false;
    };
  }, [text.id, text.audioName]);

  // Release each loaded URI (web object URLs) when it's replaced or the page closes.
  useEffect(
    () => () => {
      if (uri) releaseAudioUri(uri);
    },
    [uri],
  );

  const fetchAgain = async () => {
    if (!text.audioUrl) return;
    setFetching({ progress: null });
    setFetchError(null);
    try {
      const audio = await downloadAudio(text.audioUrl, text.audioName ?? 'episode.mp3', (progress) => setFetching({ progress }));
      await saveAudio(text.id, audio);
      setUri(await getAudioUri(text.id));
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : String(e));
    } finally {
      setFetching(null);
    }
  };

  if (!uri) {
    return (
      <Screen edges={['bottom']}>
        {header}
        {uri === undefined ? (
          <T variant="muted">Loading audio…</T>
        ) : text.audioUrl ? (
          <>
            <Button
              variant="secondary"
              icon="cloud-download-outline"
              title={
                fetching
                  ? `Downloading audio…${fetching.progress != null ? ` ${Math.round(fetching.progress * 100)}%` : ''}`
                  : 'Download audio to listen'
              }
              disabled={!!fetching}
              onPress={fetchAgain}
            />
            {fetchError && <T variant="small">{fetchError}</T>}
          </>
        ) : (
          <T variant="small">
            {text.audioName
              ? 'The audio for this transcript is only on the device that imported it.'
              : 'No audio was saved with this transcript.'}
          </T>
        )}
        <Lines segments={text.segments} index={index} known={known} onWord={onWord} />
        {footer}
      </Screen>
    );
  }
  return <Player key={uri} uri={uri} {...{ text, index, known, onWord, header, footer }} />;
}

function Player({ uri, text, index, known, onWord, header, footer }: Props & { uri: string }) {
  const t = useTheme();
  const player = useAudioPlayer(uri, { updateInterval: 250 });
  const status = useAudioPlayerStatus(player);
  const time = status.currentTime;
  const current = text.segments.findIndex((s, i) => time >= s.start && (time < s.end || i === text.segments.length - 1));

  // Follow along: keep the playing line in view until the learner scrolls away themselves.
  const { height } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const linesY = useRef(0);
  const lineYs = useRef<number[]>([]);
  const autoScrollUntil = useRef(0);
  const [follow, setFollow] = useState(true);

  const scrollToLine = (i: number) => {
    if (i < 0) return;
    autoScrollUntil.current = Date.now() + 800;
    // Approximate (ignores the page padding), which is fine for placing the line about a third down.
    const y = linesY.current + (lineYs.current[i] ?? 0);
    scrollRef.current?.scrollTo({ y: Math.max(0, y - height * 0.3), animated: true });
  };

  useEffect(() => {
    if (follow) scrollToLine(current);
    // Only when the playing line changes or following is turned back on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, follow]);

  const onScroll = () => {
    if (follow && Date.now() > autoScrollUntil.current) setFollow(false);
  };

  const seek = (seconds: number) => {
    void player.seekTo(Math.max(0, seconds));
  };
  const playFrom = (seconds: number) => {
    seek(seconds);
    setFollow(true);
    player.play();
  };

  return (
    <>
      <Screen edges={['bottom']} scrollRef={scrollRef} onScroll={onScroll}>
        {header}
        <Lines
          segments={text.segments}
          index={index}
          known={known}
          onWord={onWord}
          current={current}
          onPlay={playFrom}
          onLayout={(y) => (linesY.current = y)}
          onLineLayout={(i, y) => (lineYs.current[i] = y)}
        />
        {footer}
        <View style={{ height: PLAYER_BAR_SPACE }} />
      </Screen>
      <Row style={[styles.bar, { backgroundColor: t.surface, borderColor: t.border }]}>
        <IconButton icon="play-back" label="Back 10 seconds" onPress={() => seek(time - 10)} />
        <IconButton
          icon={status.playing ? 'pause-circle' : 'play-circle'}
          label={status.playing ? 'Pause' : 'Play'}
          size={44}
          onPress={() => (status.playing ? player.pause() : player.play())}
        />
        <IconButton icon="play-forward" label="Forward 10 seconds" onPress={() => seek(time + 10)} />
        <IconButton
          icon={follow ? 'locate' : 'locate-outline'}
          label={follow ? 'Following along' : 'Follow along'}
          muted={!follow}
          onPress={() => (follow ? scrollToLine(current) : setFollow(true))}
        />
        <T variant="small" style={{ marginLeft: 'auto' }}>
          {clock(time)} / {clock(status.duration || text.segments.at(-1)?.end || 0)}
        </T>
      </Row>
    </>
  );
}

function Lines({
  segments,
  index,
  known,
  onWord,
  current,
  onPlay,
  onLayout,
  onLineLayout,
}: {
  segments: AudioSegment[];
  index: DictIndex;
  known: Set<string>;
  onWord: OnWord;
  current?: number;
  onPlay?: (seconds: number) => void;
  onLayout?: (y: number) => void;
  onLineLayout?: (i: number, y: number) => void;
}) {
  const t = useTheme();
  return (
    <View style={{ gap: space.xs }} onLayout={onLayout && ((e) => onLayout(e.nativeEvent.layout.y))}>
      {segments.map((s, i) => (
        <View
          key={i}
          style={[styles.line, i === current && { backgroundColor: t.primarySoft }]}
          onLayout={onLineLayout && ((e) => onLineLayout(i, e.nativeEvent.layout.y))}>
          {onPlay && <IconButton icon="play" label={`Play from ${clock(s.start)}`} size={18} onPress={() => onPlay(s.start)} />}
          <Text style={{ flex: 1, color: t.text, fontSize: 19, lineHeight: 30 }}>
            <Sentence
              text={s.text}
              index={index}
              known={known}
              style={{ fontSize: 19, lineHeight: 30 }}
              onWordPress={(w, ls) => onWord(w, ls, s.text)}
            />
          </Text>
        </View>
      ))}
    </View>
  );
}

function IconButton({
  icon,
  label,
  onPress,
  size = 24,
  muted,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  size?: number;
  muted?: boolean;
}) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => ({ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}>
      <Ionicons name={icon} size={size} color={muted ? t.textMuted : t.primary} />
    </Pressable>
  );
}

const clock = (seconds: number) => {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const mm = String(Math.floor((s % 3600) / 60)).padStart(h ? 2 : 1, '0');
  return `${h ? `${h}:` : ''}${mm}:${String(s % 60).padStart(2, '0')}`;
};

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: space.sm,
    right: space.sm,
    bottom: space.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    paddingHorizontal: space.sm,
    flexWrap: 'nowrap',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  line: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm, borderRadius: radius.sm, paddingRight: space.sm },
});
