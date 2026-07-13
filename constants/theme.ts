/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

const tintColorLight = '#0a7ea4';
const tintColorDark = '#fff';

export const Colors = {
  primary: '#466264',
  secondary: '#4648d4',
  tertiary: '#5a5d5f',
  error: '#ba1a1a',
  surface: '#f8f9ff',
  surfaceContainer: '#e6eeff',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow: '#eff4ff',
  surfaceContainerHigh: '#dde9ff',
  onSurface: '#0d1c2f',
  onSurfaceVariant: '#414848',
  outline: '#717879',
  outlineVariant: '#c1c8c8',
  primaryFixed: '#c9e8ea',
  primaryFixedDim: '#aeccce',
  secondaryFixed: '#e1e0ff',
  secondaryFixedDim: '#c0c1ff',
  onPrimary: '#ffffff',
  onSecondary: '#ffffff',
  onPrimaryFixed: '#012022',
  inverseSurface: '#233144',
  inverseOnSurface: '#ebf1ff',
  errorContainer: '#ffdad6',
  onErrorContainer: '#93000a',
  primaryContainer: '#5e7b7d',
  secondaryContainer: '#6063ee',
};

/** Serene Logic type ramp — Geist for headlines/labels, Inter for body */
export const Type = {
  geistMedium: 'Geist_500Medium',
  geistSemiBold: 'Geist_600SemiBold',
  geistBold: 'Geist_700Bold',
  inter: 'Inter_400Regular',
  interSemiBold: 'Inter_600SemiBold',
  interBold: 'Inter_700Bold',
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
