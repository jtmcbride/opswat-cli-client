import { View } from 'react-native';

import { T } from '@/components/ui';
import { useTheme } from '@/constants/theme';

/** Share of running words known. Around 95%+ is comfortable reading; below ~85% is a struggle. */
export function CoverageBar({ ratio, label = true, neutral }: { ratio: number; label?: boolean; neutral?: boolean }) {
  const t = useTheme();
  // Reading a text: color says how comfortable it will be. Otherwise just progress.
  const color = neutral ? t.primary : ratio >= 0.95 ? t.success : ratio >= 0.85 ? t.accent : t.danger;
  return (
    <View style={{ gap: 4 }}>
      <View style={{ height: 6, borderRadius: 3, backgroundColor: t.surfaceAlt, overflow: 'hidden' }}>
        <View style={{ width: `${Math.round(ratio * 100)}%`, height: '100%', backgroundColor: color }} />
      </View>
      {label && <T variant="small">{Math.round(ratio * 100)}% of words known</T>}
    </View>
  );
}
