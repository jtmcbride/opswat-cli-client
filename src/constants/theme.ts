import { useColorScheme, useWindowDimensions } from 'react-native';

const light = {
  bg: '#F7F7F2',
  surface: '#FFFFFF',
  surfaceAlt: '#F0F1ED',
  border: '#E0E4E6',
  text: '#202A36',
  textMuted: '#626B76',
  primary: '#245BD6',
  primaryText: '#FFFFFF',
  primarySoft: '#EBF1FE',
  primaryBorder: '#CCDAF8',
  accent: '#B76312',
  accentSoft: '#FFF3DF',
  success: '#237449',
  danger: '#B93838',
  unknown: '#A14A26',
  ramp: ['#86b6ef', '#3987e5', '#1c5cab', '#0d366b'] as string[],
};

const dark: typeof light = {
  bg: '#141A22',
  surface: '#1D2530',
  surfaceAlt: '#28323E',
  border: '#374353',
  text: '#F1F4F8',
  textMuted: '#ADB8C7',
  primary: '#A0BEFF',
  primaryText: '#14274D',
  primarySoft: '#202F49',
  primaryBorder: '#3C5279',
  accent: '#EDB56C',
  accentSoft: '#3A3023',
  success: '#7BDBA5',
  danger: '#FFABAB',
  unknown: '#ECA380',
  ramp: ['#184f95', '#2a78d6', '#6da7ec', '#b7d3f6'],
};

export type Theme = typeof light;
export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? dark : light;
}
export function useWideLayout() {
  return useWindowDimensions().width >= 1000;
}
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 8, md: 12, lg: 18, pill: 999 } as const;
export const MAX_WIDTH = 680;
export const WORKSPACE_WIDTH = 1080;
