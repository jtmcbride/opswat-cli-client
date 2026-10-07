import { Ionicons } from '@expo/vector-icons';
import { DarkTheme, DefaultTheme, Link, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useSyncExternalStore } from 'react';
import { ActivityIndicator, Pressable, useColorScheme, View } from 'react-native';

import { Brand } from '@/components/Brand';
import { useTheme } from '@/constants/theme';
import { startCloudSync } from '@/store/cloud';
import { startReminderSync } from '@/store/reminders';
import { useStore } from '@/store/useStore';

const subscribeHydration = (cb: () => void) => useStore.persist.onFinishHydration(cb);
const isHydrated = () => useStore.persist.hasHydrated();

function useHydrated() {
  return useSyncExternalStore(subscribeHydration, isHydrated, isHydrated);
}

/** Back button for screens opened directly (e.g. a deep link on web), where there is no history. */
function HomeButton() {
  const t = useTheme();
  return (
    <Link href="/" replace asChild>
      <Pressable accessibilityLabel="Back to home" hitSlop={8} style={{ paddingHorizontal: 8 }}>
        <Ionicons name="chevron-back" size={26} color={t.primary} />
      </Pressable>
    </Link>
  );
}

export default function RootLayout() {
  const scheme = useColorScheme();
  const t = useTheme();
  const hydrated = useHydrated();
  const navTheme = scheme === 'dark' ? DarkTheme : DefaultTheme;
  useEffect(() => {
    if (!hydrated) return;
    void startCloudSync();
    startReminderSync();
  }, [hydrated]);

  if (!hydrated) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 24, backgroundColor: t.bg }}>
        <Brand />
        <ActivityIndicator color={t.primary} accessibilityLabel="Loading Leximble" />
      </View>
    );
  }

  return (
    <ThemeProvider value={{ ...navTheme, colors: { ...navTheme.colors, background: t.bg, card: t.surface } }}>
      <StatusBar style="auto" />
      <Stack
        screenOptions={({ navigation }) => ({
          headerTintColor: t.primary,
          headerTitleStyle: { color: t.text },
          ...(navigation.canGoBack() ? null : { headerLeft: () => <HomeButton /> }),
        })}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="settings" options={{ title: 'Settings' }} />
        <Stack.Screen name="account" options={{ title: 'Account & sync' }} />
        <Stack.Screen name="placement" options={{ title: 'Placement test', presentation: 'modal' }} />
        <Stack.Screen name="stats" options={{ title: 'Progress' }} />
        <Stack.Screen name="dictionaries" options={{ title: 'Dictionaries' }} />
        <Stack.Screen name="read/new" options={{ title: 'New text', presentation: 'modal' }} />
        <Stack.Screen name="read/[id]" options={{ title: 'Read' }} />
        <Stack.Screen name="languages" options={{ title: 'Language', presentation: 'modal' }} />
        <Stack.Screen name="word/[id]" options={{ title: 'Word', presentation: 'modal' }} />
      </Stack>
    </ThemeProvider>
  );
}
