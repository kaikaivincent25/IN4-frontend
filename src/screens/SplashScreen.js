/**
 * SplashScreen - Shown while app restores session
 *
 * Displays a clean, authoritative splash while session credentials are checked.
 */

import React from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import { FONT_DISPLAY } from '../theme/typography';

const SplashScreen = () => {
  return (
    <View style={styles.container}>
      <View style={styles.brandMark}>
        <Feather name="shield" size={38} color="#FFFFFF" />
      </View>
      <Text style={styles.brandTitle}>IN4</Text>
      <Text style={styles.brandMessage}>Knowledge you can trust.</Text>

      <View style={styles.trustPill}>
        <Feather name="check-circle" size={13} color={COLORS.VERIFIED_TEAL} />
        <Text style={styles.trustText}>Verified Experts Only</Text>
      </View>

      <ActivityIndicator size="small" color={COLORS.BRAND_BLUE} style={styles.loader} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.BACKGROUND,
    paddingHorizontal: 24,
  },
  brandMark: {
    width: 76,
    height: 76,
    borderRadius: 22,
    backgroundColor: COLORS.BRAND_BLUE,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  brandTitle: {
    color: COLORS.TEXT_PRIMARY,
    fontSize: 42,
    fontWeight: '800',
    fontFamily: FONT_DISPLAY,
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  brandMessage: {
    color: COLORS.TEXT_SECONDARY,
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 18,
  },
  trustPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: COLORS.PALE_GREEN,
    borderRadius: 100,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  trustText: {
    color: COLORS.VERIFIED_TEAL,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  loader: {
    marginTop: 8,
  },
});

export default SplashScreen;
