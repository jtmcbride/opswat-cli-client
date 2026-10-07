import { Ionicons } from '@expo/vector-icons';
import { Link, type Href } from 'expo-router';
import { Tabs, type BottomTabBarProps } from 'expo-router/js-tabs';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Brand } from '@/components/Brand';
import type { IconName } from '@/components/ui';
import { useTheme, useWideLayout } from '@/constants/theme';
import { useNow } from '@/hooks/useNow';
import { buildQueue, directions } from '@/lib/queue';
import { languageName, useStore } from '@/store/useStore';

const destinations: Record<string, { title: string; icon: IconName; href: Href }> = {
  index: { title: 'Words', icon: 'list-outline', href: '/' },
  review: { title: 'Review', icon: 'albums-outline', href: '/review' },
  learn: { title: 'Learn', icon: 'bulb-outline', href: '/learn' },
  read: { title: 'Read', icon: 'book-outline', href: '/read' },
  chat: { title: 'Chat', icon: 'chatbubbles-outline', href: '/chat' },
};

function SecondaryLink({ href, icon, title }: { href: Href; icon: IconName; title: string }) {
  const t = useTheme();
  return (
    <Link href={href} asChild>
      <Pressable accessibilityLabel={title} style={styles.secondary}>
        <Ionicons name={icon} size={21} color={t.textMuted} accessible={false} aria-hidden />
        <Text style={{ color: t.textMuted, fontSize: 15 }}>{title}</Text>
      </Pressable>
    </Link>
  );
}

function Navigation({ state, navigation, descriptors, insets }: BottomTabBarProps) {
  const t = useTheme();
  const wide = useWideLayout();
  const links = state.routes.map((route, i) => {
    const item = destinations[route.name];
    if (!item) return null;
    const selected = state.index === i;
    const badge = descriptors[route.key].options.tabBarBadge;
    const color = selected ? t.primary : t.textMuted;
    // Link uses a Slot: flatten child styles so they survive prop merging.
    return (
      <Link key={route.key} href={item.href} role="tab" asChild>
        <Pressable
          accessibilityRole="tab"
          accessibilityLabel={badge ? `${item.title}, ${badge} cards to study` : item.title}
          accessibilityState={{ selected }}
          onPress={(event) => {
            const emitted = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (emitted.defaultPrevented) event.preventDefault();
          }}
          onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
          style={StyleSheet.flatten([
            styles.tab,
            wide ? styles.sideTab : styles.bottomTab,
            { backgroundColor: selected && wide ? t.primarySoft : 'transparent' },
          ])}>
          <View>
            <Ionicons name={item.icon} size={wide ? 22 : 23} color={color} accessible={false} aria-hidden />
            {!wide && badge !== undefined && (
              <View style={[styles.mobileBadge, { backgroundColor: t.primary, borderColor: t.surface }]}>
                <Text style={{ fontSize: 9, fontWeight: '700', color: t.primaryText }}>{Number(badge) > 99 ? '99+' : badge}</Text>
              </View>
            )}
          </View>
          <Text style={{ color, fontSize: wide ? 15 : 11, fontWeight: selected ? '600' : '400', flex: wide ? 1 : undefined }}>{item.title}</Text>
          {wide && badge !== undefined && (
            <View style={[styles.badge, { backgroundColor: t.primarySoft }]}>
              <Text style={{ color: t.primary, fontSize: 12, fontWeight: '600' }}>{badge}</Text>
            </View>
          )}
        </Pressable>
      </Link>
    );
  });

  if (!wide) {
    return <View accessibilityRole="tablist" accessibilityLabel="Main navigation" style={[styles.bottom, { paddingBottom: Math.max(insets.bottom, 8), backgroundColor: t.surface, borderTopColor: t.border }]}>{links}</View>;
  }
  return (
    <SafeAreaView edges={['top', 'bottom', 'left']} style={[styles.sidebar, { backgroundColor: t.surface, borderRightColor: t.border }]}>
      <ScrollView contentContainerStyle={styles.sidebarContent}>
        <View style={styles.brand}><Brand /></View>
        <View accessibilityRole="tablist" accessibilityLabel="Main navigation" style={{ gap: 8 }}>{links}</View>
        <View style={[styles.sidebarFooter, { borderTopColor: t.border }]}>
          <SecondaryLink href="/stats" title="Progress" icon="stats-chart-outline" />
          <SecondaryLink href="/settings" title="Settings" icon="settings-outline" />
          <Text style={{ fontSize: 12, lineHeight: 18, color: t.textMuted, padding: 14 }}>Words that stay with you.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Header({ title }: { title: string }) {
  const t = useTheme();
  const wide = useWideLayout();
  const lang = useStore((s) => s.settings.activeLang);
  const custom = useStore((s) => s.customLanguages);
  const name = languageName(lang, custom);
  return (
    <SafeAreaView edges={['top']} style={{ backgroundColor: wide ? t.bg : t.surface }}>
      <View style={[styles.header, { paddingHorizontal: wide ? 36 : 16, borderBottomColor: wide ? 'transparent' : t.border }]}>
        {wide ? <Text style={{ color: t.textMuted, fontSize: 14 }}>{title}</Text> : <Brand compact />}
        <View style={{ flex: 1 }} />
        <Link href="/languages" asChild>
          <Pressable accessibilityLabel={`Change language, currently ${name}`} style={StyleSheet.flatten([styles.language, { maxWidth: wide ? 260 : 135 }])}>
            <Ionicons name="globe-outline" size={18} color={t.primary} accessible={false} aria-hidden />
            <Text numberOfLines={1} style={{ color: t.primary, fontSize: 13, fontWeight: '600', flexShrink: 1 }}>{name}</Text>
            <Ionicons name="chevron-down" size={12} color={t.textMuted} accessible={false} aria-hidden />
          </Pressable>
        </Link>
        {!wide && (
          <Link href="/settings" asChild>
            <Pressable accessibilityLabel="Settings" style={styles.settings}>
              <Ionicons name="settings-outline" size={20} color={t.textMuted} accessible={false} aria-hidden />
            </Pressable>
          </Link>
        )}
      </View>
    </SafeAreaView>
  );
}

export default function TabLayout() {
  const t = useTheme();
  const wide = useWideLayout();
  const lang = useStore((s) => s.settings.activeLang);
  const dailyNewLimit = useStore((s) => s.settings.dailyNewLimit);
  const dirs = directions(useStore((s) => s.settings.reviewDirection));
  const words = useStore((s) => s.words);
  const now = useNow();
  const due = useMemo(() => buildQueue(words.filter((w) => w.lang === lang), now, dailyNewLimit, dirs).cards.length, [words, lang, now, dailyNewLimit, dirs]);
  return (
    <Tabs tabBar={(props) => <Navigation {...props} />} screenOptions={{
      tabBarPosition: wide ? 'left' : 'bottom',
      sceneStyle: { backgroundColor: t.bg },
      header: ({ options }) => <Header title={options.title ?? ''} />,
    }}>
      {Object.entries(destinations).map(([name, item]) => (
        <Tabs.Screen key={name} name={name} options={{ title: item.title, tabBarBadge: name === 'review' && due > 0 ? due : undefined }} />
      ))}
    </Tabs>
  );
}

const styles = StyleSheet.create({
  sidebar: { width: 224, borderRightWidth: 1 },
  sidebarContent: { flexGrow: 1, padding: 18 },
  brand: { paddingHorizontal: 8, paddingTop: 14, paddingBottom: 42 },
  sidebarFooter: { marginTop: 'auto', paddingTop: 16, borderTopWidth: 1 },
  tab: { alignItems: 'center', justifyContent: 'center' },
  sideTab: { flexDirection: 'row', gap: 14, paddingHorizontal: 14, paddingVertical: 15, borderRadius: 12, minHeight: 50 },
  bottomTab: { flex: 1, minHeight: 52, gap: 5, paddingTop: 7 },
  bottom: { flexDirection: 'row', borderTopWidth: 1, paddingHorizontal: 8, paddingTop: 3 },
  badge: { minWidth: 25, borderRadius: 8, paddingVertical: 3, paddingHorizontal: 6, alignItems: 'center' },
  mobileBadge: { position: 'absolute', right: -15, top: -5, borderWidth: 2, borderRadius: 10, minWidth: 19, paddingHorizontal: 3, alignItems: 'center' },
  secondary: { flexDirection: 'row', gap: 14, alignItems: 'center', minHeight: 48, paddingHorizontal: 14, borderRadius: 12 },
  header: { flexDirection: 'row', alignItems: 'center', minHeight: 72, gap: 4, borderBottomWidth: 1 },
  language: { flexShrink: 1, flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, paddingHorizontal: 6, borderRadius: 10 },
  settings: { width: 36, minHeight: 44, justifyContent: 'center', alignItems: 'center' },
});
