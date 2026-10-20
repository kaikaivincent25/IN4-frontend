/**
 * ChangePasswordScreen - Secure Password Change
 * 
 * FEATURES:
 * 1. Current password verification (prevent unauthorized changes)
 * 2. New password with confirmation
 * 3. Password strength indicator
 * 4. Show/hide password toggles
 * 5. Loading state during submission
 * 6. Success confirmation
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { authAPI } from '../api/client';
import { FONT_DISPLAY } from '../theme/typography';
import { Feather } from '@expo/vector-icons';
import { COLORS as THEME } from '../theme/colors';

const COLORS = {
  BRAND_BLUE: THEME.BRAND_BLUE,
  BACKGROUND: THEME.BACKGROUND,
  SURFACE: THEME.SURFACE,
  TEXT_PRIMARY: THEME.TEXT_PRIMARY,
  TEXT_SECONDARY: THEME.TEXT_SECONDARY,
  TEXT_TERTIARY: THEME.TEXT_TERTIARY,
  BORDER: THEME.BORDER,
  INPUT_BG: THEME.INPUT_BG,
  ERROR_RED: THEME.ERROR_RED,
  SUCCESS_GREEN: THEME.SUCCESS_GREEN,
};

const ChangePasswordScreen = ({ navigation }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  /**
   * Password strength checker
   * 
   * REQUIREMENTS:
   * - At least 8 characters
   * - At least 1 uppercase letter
   * - At least 1 number
   * - At least 1 special character
   */
  const getPasswordStrength = (password) => {
    if (!password) return { score: 0, label: '', color: COLORS.TEXT_TERTIARY };

    let score = 0;
    const feedback = [];

    if (password.length >= 8) {
      score += 1;
    } else {
      feedback.push('At least 8 characters');
    }

    if (/[A-Z]/.test(password)) {
      score += 1;
    } else {
      feedback.push('1 uppercase letter');
    }

    if (/[0-9]/.test(password)) {
      score += 1;
    } else {
      feedback.push('1 number');
    }

    if (/[!@#$%^&*]/.test(password)) {
      score += 1;
    } else {
      feedback.push('1 special character (!@#$%^&*)');
    }

    const labels = ['Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];
    const colors = [COLORS.ERROR_RED, COLORS.WARNING, COLORS.WARNING, COLORS.SUCCESS_GREEN, COLORS.SUCCESS_GREEN];

    return {
      score,
      label: labels[score],
      color: colors[score],
      feedback: feedback.length > 0 ? feedback : ['Password meets all requirements'],
    };
  };

  /**
   * Validate form
   */
  const validateForm = useCallback(() => {
    const newErrors = {};

    if (!currentPassword.trim()) {
      newErrors.currentPassword = 'Current password is required';
    }

    if (!newPassword.trim()) {
      newErrors.newPassword = 'New password is required';
    } else if (newPassword.length < 8) {
      newErrors.newPassword = 'Password must be at least 8 characters';
    }

    if (!confirmPassword.trim()) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (currentPassword === newPassword) {
      newErrors.newPassword = 'New password must be different from current';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [currentPassword, newPassword, confirmPassword]);

  /**
   * Handle form submission
   */
  const handleChangePassword = useCallback(async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const result = await authAPI.changePassword(
        currentPassword,
        newPassword,
        confirmPassword
      );

      if (result.success) {
        Alert.alert(
          'Success',
          'Your password has been changed successfully.',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      }
    } catch (err) {
      const errorMsg =
        err.response?.data?.message ||
        err.response?.data?.old_password?.[0] ||
        'Failed to change password';

      Alert.alert('Error', errorMsg);
    } finally {
      setLoading(false);
    }
  }, [currentPassword, newPassword, confirmPassword, validateForm, navigation]);

  const passwordStrength = getPasswordStrength(newPassword);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.headerBack}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Change Password</Text>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="always"
        keyboardDismissMode="none"
      >
        {/* Intro */}
        <View style={styles.intro}>
          <Text style={styles.introTitle}>Update your password</Text>
          <Text style={styles.introText}>
            For your security, use a strong password you haven't used before.
          </Text>
        </View>

        {/* Current Password */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Current Password *</Text>
          {errors.currentPassword && (
            <Text style={styles.errorLabel}>{errors.currentPassword}</Text>
          )}
          <View style={[styles.inputWrapper, errors.currentPassword && styles.inputError]}>
            <TextInput
              style={styles.input}
              placeholder="Enter your current password"
              placeholderTextColor={COLORS.TEXT_TERTIARY}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry={!showCurrent}
              editable={!loading}
            />
            <TouchableOpacity
              onPress={() => setShowCurrent(!showCurrent)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Feather name={showCurrent ? 'eye-off' : 'eye'} size={18} color={COLORS.TEXT_SECONDARY} />
            </TouchableOpacity>
          </View>
        </View>

        {/* New Password */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>New Password *</Text>
          {errors.newPassword && (
            <Text style={styles.errorLabel}>{errors.newPassword}</Text>
          )}
          <View style={[styles.inputWrapper, errors.newPassword && styles.inputError]}>
            <TextInput
              style={styles.input}
              placeholder="Create a strong password"
              placeholderTextColor={COLORS.TEXT_TERTIARY}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry={!showNew}
              editable={!loading}
            />
            <TouchableOpacity
              onPress={() => setShowNew(!showNew)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Feather name={showNew ? 'eye-off' : 'eye'} size={18} color={COLORS.TEXT_SECONDARY} />
            </TouchableOpacity>
          </View>

          {/* Password Strength */}
          {newPassword && (
            <View style={styles.strengthContainer}>
              <View style={styles.strengthBars}>
                {[0, 1, 2, 3, 4].map((i) => (
                  <View
                    key={i}
                    style={[
                      styles.strengthBar,
                      i < passwordStrength.score && {
                        backgroundColor: passwordStrength.color,
                      },
                    ]}
                  />
                ))}
              </View>
              <Text style={[styles.strengthLabel, { color: passwordStrength.color }]}>
                {passwordStrength.label}
              </Text>
            </View>
          )}

          {/* Requirements */}
          {newPassword && (
            <View style={styles.requirementsBox}>
              {passwordStrength.feedback.map((item, idx) => (
                <View key={idx} style={styles.requirementItem}>
                  <Feather name={idx < passwordStrength.score ? 'check-circle' : 'circle'} size={15} color={idx < passwordStrength.score ? COLORS.SUCCESS_GREEN : COLORS.TEXT_TERTIARY} />
                  <Text style={styles.requirementText}>{item}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Confirm Password */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Confirm Password *</Text>
          {errors.confirmPassword && (
            <Text style={styles.errorLabel}>{errors.confirmPassword}</Text>
          )}
          <View style={[styles.inputWrapper, errors.confirmPassword && styles.inputError]}>
            <TextInput
              style={styles.input}
              placeholder="Re-enter your password"
              placeholderTextColor={COLORS.TEXT_TERTIARY}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirm}
              editable={!loading}
            />
            <TouchableOpacity
              onPress={() => setShowConfirm(!showConfirm)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Feather name={showConfirm ? 'eye-off' : 'eye'} size={18} color={COLORS.TEXT_SECONDARY} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Match Indicator */}
        {newPassword && confirmPassword && (
          <View
            style={[
              styles.matchBox,
              newPassword === confirmPassword
                ? styles.matchBoxSuccess
                : styles.matchBoxError,
            ]}
          >
            <Feather name={newPassword === confirmPassword ? 'check-circle' : 'x-circle'} size={17} color={newPassword === confirmPassword ? COLORS.SUCCESS_GREEN : COLORS.ERROR_RED} />
            <Text style={styles.matchText}>
              {newPassword === confirmPassword
                ? 'Passwords match'
                : 'Passwords do not match'}
            </Text>
          </View>
        )}

        {/* Change Button */}
        <TouchableOpacity
          style={[styles.changeButton, loading && styles.changeButtonDisabled]}
          onPress={handleChangePassword}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.changeButtonText}>Change Password</Text>
          )}
        </TouchableOpacity>

        {/* Security Note */}
        <View style={styles.securityNote}>
          <Feather name="lock" size={15} color={COLORS.BRAND_BLUE} />
          <Text style={styles.securityNoteText}>
            Choose a unique password and keep it private.
          </Text>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F7FC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#173B59',
    borderBottomWidth: 1,
    borderBottomColor: '#31536D',
  },
  headerBack: {
    color: '#D2E1ED',
    fontSize: 14,
    fontWeight: '700',
  },
  headerTitle: {
    fontFamily: FONT_DISPLAY,
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 24,
    paddingVertical: 28,
  },
  intro: {
    marginBottom: 32,
  },
  introTitle: {
    fontFamily: FONT_DISPLAY,
    fontSize: 22,
    fontWeight: '800',
    color: '#07152E',
    marginBottom: 10,
  },
  introText: {
    fontSize: 15,
    color: '#40536B',
    lineHeight: 23,
  },

  // ── FORM ──
  formGroup: {
    marginBottom: 26,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#07152E',
    marginBottom: 10,
  },
  errorLabel: {
    fontSize: 12,
    color: '#B42318',
    marginBottom: 10,
    fontWeight: '600',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderWidth: 0,
    borderBottomWidth: 1,
    borderColor: '#B8CAD8',
    borderRadius: 0,
    paddingHorizontal: 4,
    height: 54,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#07152E',
    padding: 0,
  },
  inputError: {
    borderColor: '#B42318',
    backgroundColor: '#FEF2F0',
  },
  showIcon: {
    fontSize: 16,
  },

  // ── PASSWORD STRENGTH ──
  strengthContainer: {
    marginTop: 14,
    gap: 8,
  },
  strengthBars: {
    flexDirection: 'row',
    gap: 4,
  },
  strengthBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D2DCE7',
  },
  strengthLabel: {
    fontSize: 12,
    fontWeight: '700',
  },

  // ── REQUIREMENTS ──
  requirementsBox: {
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: '#F3F6FA',
    borderRadius: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: '#D2DCE7',
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  requirementCheckbox: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.TEXT_TERTIARY,
    width: 16,
  },
  requirementText: {
    fontSize: 12,
    color: '#40536B',
  },

  // ── MATCH INDICATOR ──
  matchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 28,
  },
  matchBoxSuccess: {
    backgroundColor: '#EBF6F2',
  },
  matchBoxError: {
    backgroundColor: '#FEF2F0',
  },
  matchIcon: {
    fontSize: 14,
    fontWeight: '700',
  },
  matchText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#40536B',
  },

  // ── BUTTON ──
  changeButton: {
    backgroundColor: '#087B84',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 22,
  },
  changeButtonDisabled: {
    opacity: 0.65,
  },
  changeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },

  // ── SECURITY NOTE ──
  securityNote: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#F3F6FA',
    borderRadius: 14,
    marginBottom: 40,
    borderWidth: 1,
    borderColor: '#D2DCE7',
  },
  securityNoteIcon: {
    fontSize: 18,
  },
  securityNoteText: {
    flex: 1,
    fontSize: 13,
    color: '#40536B',
    lineHeight: 19,
  },
});

export default ChangePasswordScreen;
