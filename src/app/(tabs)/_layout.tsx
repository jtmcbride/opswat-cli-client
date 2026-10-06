import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { useMemo } from 'react';
import { Pressable, Text, type ColorValue } from 'react-native';

import type { IconName } from '@/components/ui';
import { useTheme } from '@/constants/theme';
import { useNow } from '@/hooks/useNow';
import { isDue } from '@/lib/srs';
import { languageName, useStore } from '@/store/useStore';

function LanguageButton() {
  const t = useTheme();
  const lang = useStore((s) => s.settings.activeLang);
  const custom = useStore((s) => s.customLanguages);
  return (
    <Link href="/languages" asChild>
      <Pressable style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 16 }}>
        <Ionicons name="globe-outline" size={18} color={t.primary} />
        <Text style={{ color: t.primary, fontWeight: '600' }}>{languageName(lang, custom)}</Text>
      </Pressable>
    </Link>
  );
}

function SettingsButton() {
  const t = useTheme();
  return (
    <Link href="/settings" asChild>
      <Pressable accessibilityLabel="Settings" style={{ paddingHorizontal: 16 }}>
        <Ionicons name="settings-outline" size={22} color={t.primary} />
      </Pressable>
    </Link>
  );
}

const icon = (name: IconName) =>
  function TabIcon({ color, size }: { color: ColorValue; size: number }) {
    return <Ionicons name={name} color={color as string} size={size} />;
  };

export default function TabLayout() {
  const t = useTheme();
  const lang = useStore((s) => s.settings.activeLang);
  const words = useStore((s) => s.words);
  const now = useNow();
  const due = useMemo(() => words.filter((w) => w.lang === lang && isDue(w.srs, now)).length, [words, lang, now]);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: t.primary,
        tabBarInactiveTintColor: t.textMuted,
        tabBarStyle: { backgroundColor: t.surface, borderTopColor: t.border },
        headerStyle: { backgroundColor: t.surface },
        headerTitleStyle: { color: t.text },
        headerRight: () => <LanguageButton />,
        headerLeft: () => <SettingsButton />,
      }}>
      <Tabs.Screen name="index" options={{ title: 'Words', tabBarIcon: icon('list') }} />
      <Tabs.Screen
        name="review"
        options={{ title: 'Review', tabBarIcon: icon('albums'), tabBarBadge: due > 0 ? due : undefined }}
      />
      <Tabs.Screen name="learn" options={{ title: 'Learn', tabBarIcon: icon('bulb') }} />
      <Tabs.Screen name="read" options={{ title: 'Read', tabBarIcon: icon('book') }} />
      <Tabs.Screen name="chat" options={{ title: 'Chat', tabBarIcon: icon('chatbubbles') }} />
    </Tabs>
  );
}
