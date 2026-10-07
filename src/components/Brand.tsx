import { Image, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/constants/theme';

/** A shared wordmark keeps the navigation and loading screen consistent. */
export function Brand({ compact = false }: { compact?: boolean }) {
  const t = useTheme();
  return (
    <View accessible accessibilityLabel="Leximble" style={styles.brand}>
      <Image
        source={require('../../assets/images/leximble-mark.png')}
        accessible={false}
        style={{ width: compact ? 30 : 36, height: compact ? 30 : 36, borderRadius: compact ? 8 : 10 }}
      />
      <Text style={{ color: t.text, fontSize: compact ? 21 : 25, fontWeight: '700', letterSpacing: -0.8 }}>leximble</Text>
    </View>
  );
}
const styles = StyleSheet.create({ brand: { flexDirection: 'row', alignItems: 'center', gap: 9 } });
