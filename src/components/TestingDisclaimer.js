import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import Text from './ThemedText';
import { COLORS } from '../theme/colors';
import { FONT_DISPLAY, FONT_UI } from '../theme/typography';

const TestingDisclaimer = ({ onAcknowledge }) => (
  <Modal
    animationType="fade"
    onRequestClose={() => {}}
    statusBarTranslucent
    transparent
    visible
  >
    <View style={styles.backdrop}>
      <View style={styles.card} accessibilityViewIsModal>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.icon}>
            <Feather name="alert-triangle" size={27} color={COLORS.WARNING} />
          </View>
          <Text style={styles.eyebrow}>IMPORTANT NOTICE</Text>
          <Text style={styles.title}>Testing build — not ready for general use</Text>
          <Text style={styles.body}>
            IN4 is currently under testing. Features may fail, change, or lose
            data. Information and recommendations have not been validated; do
            not rely on them for health, legal, financial, or other important
            decisions.
          </Text>
          <Text style={styles.body}>
            Use only test accounts and non-sensitive sample data. Do not enter
            reused passwords, personal, health, identity, or financial
            information, or payment credentials. Payments, messages, and
            uploads may contact live services.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={onAcknowledge}
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          >
            <Text style={styles.buttonText}>I understand — continue to testing</Text>
          </Pressable>
          <Text style={styles.footer}>
            This notice will appear again the next time you open the app.
          </Text>
        </ScrollView>
      </View>
    </View>
  </Modal>
);

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: 'rgba(9, 30, 46, 0.82)',
  },
  card: {
    maxHeight: '90%',
    borderRadius: 22,
    backgroundColor: COLORS.SURFACE,
    overflow: 'hidden',
  },
  content: {
    alignItems: 'center',
    padding: 24,
  },
  icon: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 28,
    backgroundColor: COLORS.WARNING_LIGHT,
    marginBottom: 16,
  },
  eyebrow: {
    color: COLORS.WARNING,
    fontFamily: FONT_UI,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 8,
  },
  title: {
    color: COLORS.TEXT_PRIMARY,
    fontFamily: FONT_DISPLAY,
    fontSize: 23,
    fontWeight: '800',
    lineHeight: 29,
    textAlign: 'center',
    marginBottom: 16,
  },
  body: {
    color: COLORS.TEXT_SECONDARY,
    fontFamily: FONT_UI,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 14,
    textAlign: 'left',
    width: '100%',
  },
  button: {
    alignItems: 'center',
    alignSelf: 'stretch',
    justifyContent: 'center',
    minHeight: 52,
    borderRadius: 12,
    backgroundColor: COLORS.BRAND_BLUE,
    marginTop: 6,
    paddingHorizontal: 16,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonText: {
    color: COLORS.WHITE,
    fontFamily: FONT_UI,
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  footer: {
    color: COLORS.TEXT_TERTIARY,
    fontFamily: FONT_UI,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 12,
    textAlign: 'center',
  },
});

export default TestingDisclaimer;
