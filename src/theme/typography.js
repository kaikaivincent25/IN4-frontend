import { Platform } from 'react-native';

// Keep the editorial character of a refined serif on each platform,
// while leaving controls on the native sans-serif UI font for legibility.
export const FONT_DISPLAY = Platform.select({
  ios: 'Georgia',
  android: 'serif',
  default: 'Georgia, Times New Roman, serif',
});

export const FONT_UI = Platform.select({
  ios: 'Avenir Next',
  android: 'sans-serif',
  default: 'Avenir Next, Segoe UI, sans-serif',
});
