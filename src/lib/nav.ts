import { router } from 'expo-router';

/** Go back, or to the home screen when there is no history (screen opened directly on web). */
export function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}
