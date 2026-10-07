import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Button, Row, T } from '@/components/ui';
import { useTheme, useWideLayout } from '@/constants/theme';

export function DailyReviewCard({ due, streak, reviews, goal }: { due: number; streak: number; reviews: number; goal: number }) {
  const t = useTheme();
  const wide = useWideLayout();
  const progress = Math.min(1, reviews / Math.max(1, goal));
  return (
    <View style={[styles.card, { backgroundColor: t.primarySoft, borderColor: t.primaryBorder }, wide && styles.wide]}>
      <View style={{ flex: 1, gap: 10 }}>
        <T variant="small" style={{ color: t.primary, letterSpacing: 1.5, fontWeight: '600' }}>DAILY PRACTICE</T>
        <T variant="heading" style={{ fontSize: wide ? 23 : 21, lineHeight: 29 }}>{due > 0 ? (wide ? 'Ready for a little progress?' : `${due} ${due === 1 ? 'card' : 'cards'} to review`) : 'All caught up'}</T>
        {wide && <T variant="muted">{due > 0 ? `${due} ${due === 1 ? 'card is' : 'cards are'} ready to review.` : 'Your reviews are done. Discover something new.'}</T>}
        <Button title={due > 0 ? 'Start review' : 'Learn new words'} icon="arrow-forward" onPress={() => router.navigate(due > 0 ? '/review' : '/learn')} style={{ alignSelf: wide ? 'flex-start' : 'stretch', marginTop: 4, minWidth: 190 }} />
      </View>
      <View style={[styles.progress, wide ? { width: 230, paddingLeft: 28, borderLeftWidth: 1, borderLeftColor: t.primaryBorder } : { paddingTop: 12, borderTopWidth: 1, borderTopColor: t.primaryBorder }]}>
        <Row style={{ flexWrap: 'nowrap' }}>
          <Ionicons name={streak > 0 ? 'flame-outline' : 'sunny-outline'} color={t.accent} size={25} accessible={false} aria-hidden />
          <View style={{ flex: 1 }}>
            <T style={{ fontWeight: '600', fontSize: 15 }}>{streak > 0 ? `${streak}-day streak` : 'A fresh start today'}</T>
            <T variant="small">{reviews} / {goal} reviews today</T>
          </View>
          {!wide && <Button compact variant="ghost" title="Progress" accessibilityLabel="View progress" onPress={() => router.push('/stats')} style={{ paddingHorizontal: 0 }} />}
        </Row>
        <View accessibilityRole="progressbar" accessibilityLabel="Daily review goal" accessibilityValue={{ min: 0, max: goal, now: Math.min(reviews, goal), text: `${reviews} of ${goal} reviews` }} style={[styles.track, { backgroundColor: t.primaryBorder }]}>
          <View style={{ height: '100%', width: `${progress * 100}%`, backgroundColor: reviews >= goal ? t.success : t.primary, borderRadius: 4 }} />
        </View>
        {wide && <Button compact variant="ghost" title="View progress" onPress={() => router.push('/stats')} style={{ alignSelf: 'flex-start', paddingHorizontal: 0 }} />}
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 20, padding: 20, gap: 16 },
  wide: { flexDirection: 'row', alignItems: 'center', padding: 28, gap: 32 },
  progress: { gap: 8 },
  track: { height: 7, borderRadius: 4, overflow: 'hidden', marginTop: 3 },
});
