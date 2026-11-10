import React from 'react';
import { Text as NativeText, StyleSheet } from 'react-native';
import { FONT_UI } from '../theme/typography';

const ThemedText = React.forwardRef(({ style, ...props }, ref) => (
  <NativeText ref={ref} {...props} style={[styles.text, style]} />
));

ThemedText.displayName = 'ThemedText';

const styles = StyleSheet.create({
  text: {
    fontFamily: FONT_UI,
  },
});

export default ThemedText;