import { Platform } from 'react-native';

// Keep the editorial character of a Times-style serif on each platform,
// while leaving controls on the native sans-serif UI font for legibility.
export const FONT_DISPLAY = Platform.select({
  ios: 'Times New Roman',
  android: 'serif', // Android's built-in Noto Serif keeps the same editorial feel.
  default: 'Georgia, Times New Roman, serif',
});

export const FONT_UI = Platform.select({
  ios: 'Avenir Next',
  android: 'sans-serif',
  default: 'Arial, sans-serif',
});
