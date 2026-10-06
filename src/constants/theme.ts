import { useColorScheme } from 'react-native';

const light = {
  bg: '#F7F7F5',
  surface: '#FFFFFF',
  surfaceAlt: '#EFEFEC',
  border: '#E2E2DE',
  text: '#1B1B1A',
  textMuted: '#6B6B66',
  primary: '#2F6FEB',
  primaryText: '#FFFFFF',
  accent: '#F2B705',
  accentSoft: '#FFF4CC',
  success: '#1E9E5A',
  danger: '#D64545',
  unknown: '#B4552D',
};

const dark: typeof light = {
  bg: '#121212',
  surface: '#1C1C1E',
  surfaceAlt: '#2A2A2D',
  border: '#333336',
  text: '#F2F2F0',
  textMuted: '#A0A09B',
  primary: '#5B8FF9',
  primaryText: '#FFFFFF',
  accent: '#F2C744',
  accentSoft: '#3D3416',
  success: '#3CC27A',
  danger: '#F06767',
  unknown: '#E08A5F',
};

export type Theme = typeof light;

export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? dark : light;
}

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 8, md: 12, lg: 16, pill: 999 } as const;
export const MAX_WIDTH = 640;
