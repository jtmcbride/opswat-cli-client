import { Ionicons } from '@expo/vector-icons';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Sentence } from '@/components/Sentence';
import { Row, Screen, T } from '@/components/ui';
import { radius, space, useTheme } from '@/constants/theme';
import { getAudioUri, releaseAudioUri } from '@/lib/audioStore';
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

  useEffect(() => {
    if (!text.audioName) return;
    let live = true;
    let loaded: string | null = null;
    getAudioUri(text.id).then((u) => {
      loaded = u;
      if (live) setUri(u);
      else if (u) releaseAudioUri(u);
    });
    return () => {
      live = false;
      if (loaded) releaseAudioUri(loaded);
    };
  }, [text.id, text.audioName]);

  if (!uri) {
    return (
      <Screen edges={['bottom']}>
        {header}
        {uri === undefined ? (
          <T variant="muted">Loading audio…</T>
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

  const seek = (seconds: number) => {
    void player.seekTo(Math.max(0, seconds));
  };
  const playFrom = (seconds: number) => {
    seek(seconds);
    player.play();
  };

  return (
    <>
      <Screen edges={['bottom']}>
        {header}
        <Lines segments={text.segments} index={index} known={known} onWord={onWord} current={current} onPlay={playFrom} />
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
}: {
  segments: AudioSegment[];
  index: DictIndex;
  known: Set<string>;
  onWord: OnWord;
  current?: number;
  onPlay?: (seconds: number) => void;
}) {
  const t = useTheme();
  return (
    <View style={{ gap: space.xs }}>
      {segments.map((s, i) => (
        <Row key={i} style={[styles.line, i === current && { backgroundColor: t.primarySoft }]}>
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
        </Row>
      ))}
    </View>
  );
}

function IconButton({
  icon,
  label,
  onPress,
  size = 24,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  size?: number;
}) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => ({ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}>
      <Ionicons name={icon} size={size} color={t.primary} />
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
  line: { alignItems: 'flex-start', flexWrap: 'nowrap', borderRadius: radius.sm, paddingRight: space.sm },
});
