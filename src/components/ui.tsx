import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps, ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextProps,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MAX_WIDTH, radius, space, useTheme } from '@/constants/theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];

/** Page container: safe area, centered column capped at MAX_WIDTH for tablet/web. */
export function Screen({
  children,
  scroll = true,
  edges = [],
}: {
  children: ReactNode;
  scroll?: boolean;
  edges?: ('top' | 'bottom')[];
}) {
  const t = useTheme();
  const inner = <View style={styles.column}>{children}</View>;
  return (
    <SafeAreaView edges={edges} style={{ flex: 1, backgroundColor: t.bg }}>
      {scroll ? (
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {inner}
        </ScrollView>
      ) : (
        <View style={[styles.scroll, { flex: 1 }]}>{inner}</View>
      )}
    </SafeAreaView>
  );
}

type Variant = 'title' | 'heading' | 'body' | 'muted' | 'small' | 'big';

export function T({ variant = 'body', style, ...props }: TextProps & { variant?: Variant }) {
  const t = useTheme();
  const v = {
    title: { fontSize: 28, fontWeight: '700' as const, color: t.text },
    heading: { fontSize: 18, fontWeight: '600' as const, color: t.text },
    body: { fontSize: 16, color: t.text },
    muted: { fontSize: 15, color: t.textMuted },
    small: { fontSize: 13, color: t.textMuted },
    big: { fontSize: 32, fontWeight: '600' as const, color: t.text, textAlign: 'center' as const },
  }[variant];
  return <Text {...props} style={[v, style]} />;
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.border }, style]}>{children}</View>
  );
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  icon,
  disabled,
  loading,
  style,
  compact,
}: {
  title: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  icon?: IconName;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  compact?: boolean;
}) {
  const t = useTheme();
  const bg = { primary: t.primary, secondary: t.surfaceAlt, ghost: 'transparent', danger: t.danger }[variant];
  const fg = variant === 'primary' || variant === 'danger' ? t.primaryText : variant === 'ghost' ? t.primary : t.text;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        compact && styles.buttonCompact,
        { backgroundColor: bg, opacity: disabled ? 0.45 : pressed ? 0.8 : 1 },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon && <Ionicons name={icon} size={18} color={fg} />}
          <Text style={{ color: fg, fontSize: compact ? 14 : 16, fontWeight: '600', textAlign: 'center' }}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

export function Input(props: TextInputProps) {
  const t = useTheme();
  return (
    <TextInput
      placeholderTextColor={t.textMuted}
      autoCapitalize="none"
      autoCorrect={false}
      {...props}
      style={[
        styles.input,
        { backgroundColor: t.surface, borderColor: t.border, color: t.text },
        props.multiline && { minHeight: 120, textAlignVertical: 'top' },
        props.style,
      ]}
    />
  );
}

export function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
}) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        { backgroundColor: selected ? t.primary : t.surfaceAlt, borderColor: selected ? t.primary : t.border },
      ]}>
      <Text style={{ color: selected ? t.primaryText : t.text, fontWeight: '500' }}>{label}</Text>
    </Pressable>
  );
}

export function Row({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.row, style]}>{children}</View>;
}

export function Empty({ icon, title, body, children }: { icon: IconName; title: string; body?: string; children?: ReactNode }) {
  const t = useTheme();
  return (
    <View style={styles.empty}>
      <Ionicons name={icon} size={48} color={t.textMuted} />
      <T variant="heading" style={{ textAlign: 'center' }}>
        {title}
      </T>
      {body && (
        <T variant="muted" style={{ textAlign: 'center' }}>
          {body}
        </T>
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: space.lg, paddingBottom: space.xxl, alignItems: 'center' },
  column: { width: '100%', maxWidth: MAX_WIDTH, gap: space.lg, flex: 1 },
  card: { borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: space.lg, gap: space.md },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    minHeight: 48,
    paddingHorizontal: space.lg,
    borderRadius: radius.md,
  },
  buttonCompact: { minHeight: 36, paddingHorizontal: space.md },
  input: { borderWidth: 1, borderRadius: radius.md, paddingHorizontal: space.md, paddingVertical: 12, fontSize: 16 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill, borderWidth: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' },
  empty: { alignItems: 'center', gap: space.md, paddingVertical: space.xxl, paddingHorizontal: space.lg },
});
