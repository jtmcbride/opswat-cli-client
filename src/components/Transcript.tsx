import { Ionicons } from '@expo/vector-icons';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { memo, useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { Sentence } from '@/components/Sentence';
import { Button, Row, Screen, T } from '@/components/ui';
import { radius, space, useTheme } from '@/constants/theme';
import { downloadAudio } from '@/lib/audioFiles';
import { getAudioUri, releaseAudioUri, saveAudio } from '@/lib/audioStore';
import type { DictIndex } from '@/lib/dictionary';
import type { AudioSegment, ReadingText } from '@/lib/types';
import { wordAt } from '@/lib/wordSync';

/** `at` is where to start playback to hear the word in context (only when the audio is playable). */
type OnWord = (surface: string, lemmas: string[], sentence: string, at?: number) => void;

/** Lead-in before a word when playing it in context, in seconds. */
const CONTEXT_LEAD = 1.5;

export interface TranscriptControls {
  playFrom: (seconds: number) => void;
}

interface Props {
  text: ReadingText & { segments: AudioSegment[] };
  index: DictIndex;
  known: Set<string>;
  onWord: OnWord;
  /** Rendered above and below the transcript, inside the scroll view. */
  header?: ReactNode;
  footer?: ReactNode;
  /** Set while the audio player is available, so the page can start playback (e.g. from a word). */
  controlsRef?: RefObject<TranscriptControls | null>;
}

/** Height reserved under the transcript for the pinned player bar. */
export const PLAYER_BAR_SPACE = 84;

/**
 * Page body for a transcribed text: the timed lines, and a player bar pinned to the bottom when the
 * audio is on this device.
 */
export function Transcript({ text, index, known, onWord, header, footer, controlsRef }: Props) {
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
  return <Player key={uri} uri={uri} {...{ text, index, known, onWord, header, footer, controlsRef }} />;
}

function Player({ uri, text, index, known, onWord, header, footer, controlsRef }: Props & { uri: string }) {
  const t = useTheme();
  // Frequent updates so the word highlight keeps pace with speech.
  const player = useAudioPlayer(uri, { updateInterval: 100 });
  const status = useAudioPlayerStatus(player);
  const time = status.currentTime;
  const current = text.segments.findIndex((s, i) => time >= s.start && (time < s.end || i === text.segments.length - 1));
  const starts = current >= 0 ? text.segments[current].wordStarts : undefined;
  const activeWord = starts ? wordAt(starts, time) : undefined;

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

  useEffect(() => {
    if (!controlsRef) return;
    controlsRef.current = { playFrom };
    return () => {
      controlsRef.current = null;
    };
  });

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
          activeWord={activeWord}
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
  activeWord,
  onPlay,
  onLayout,
  onLineLayout,
}: {
  segments: AudioSegment[];
  index: DictIndex;
  known: Set<string>;
  onWord: OnWord;
  current?: number;
  activeWord?: number;
  onPlay?: (seconds: number) => void;
  onLayout?: (y: number) => void;
  onLineLayout?: (i: number, y: number) => void;
}) {
  // Stable handlers, so only the lines whose highlight changes re-render as playback advances.
  const latest = useRef({ onWord, onPlay, onLineLayout });
  useEffect(() => {
    latest.current = { onWord, onPlay, onLineLayout };
  });
  const handlers = useMemo<LineHandlers>(
    () => ({
      word: (...args) => latest.current.onWord(...args),
      play: (seconds) => latest.current.onPlay?.(seconds),
      layout: (i, y) => latest.current.onLineLayout?.(i, y),
    }),
    [],
  );
  return (
    <View style={{ gap: space.xs }} onLayout={onLayout && ((e) => onLayout(e.nativeEvent.layout.y))}>
      {segments.map((s, i) => (
        <Line
          key={i}
          segment={s}
          i={i}
          index={index}
          known={known}
          current={i === current}
          activeWord={i === current ? activeWord : undefined}
          playable={!!onPlay}
          handlers={handlers}
        />
      ))}
    </View>
  );
}

interface LineHandlers {
  word: OnWord;
  play: (seconds: number) => void;
  layout: (i: number, y: number) => void;
}

const Line = memo(function Line({
  segment: s,
  i,
  index,
  known,
  current,
  activeWord,
  playable,
  handlers,
}: {
  segment: AudioSegment;
  i: number;
  index: DictIndex;
  known: Set<string>;
  current: boolean;
  activeWord?: number;
  playable: boolean;
  handlers: LineHandlers;
}) {
  const t = useTheme();
  return (
    <View
      style={[styles.line, current && { backgroundColor: t.primarySoft }]}
      onLayout={(e) => handlers.layout(i, e.nativeEvent.layout.y)}>
      {playable && <IconButton icon="play" label={`Play from ${clock(s.start)}`} size={18} onPress={() => handlers.play(s.start)} />}
      <Text style={{ flex: 1, color: t.text, fontSize: 19, lineHeight: 30 }}>
        <Sentence
          text={s.text}
          index={index}
          known={known}
          activeWord={activeWord}
          style={{ fontSize: 19, lineHeight: 30 }}
          onWordPress={(w, ls, wi) =>
            handlers.word(
              w,
              ls,
              s.text,
              playable ? Math.max(s.start, (s.wordStarts?.[wi] ?? s.start) - CONTEXT_LEAD) : undefined,
            )
          }
        />
      </Text>
    </View>
  );
});

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
