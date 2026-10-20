import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { isValidEmail } from '../utils/validation';
import { FONT_DISPLAY, FONT_UI } from '../theme/typography';
import { COLORS as THEME } from '../theme/colors';

const C = {
  ink: THEME.TEXT_PRIMARY, muted: THEME.TEXT_SECONDARY, faint: THEME.TEXT_TERTIARY,
  brand: THEME.BRAND_BLUE, brandDark: THEME.BRAND_DARK,
  canvas: THEME.BACKGROUND, white: THEME.WHITE, line: THEME.BORDER,
  error: THEME.ERROR_RED, pale: THEME.PALE_GREEN,
};

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [activeField, setActiveField] = useState(null);
  const { login } = useAuth();

  const validateForm = useCallback(() => {
    const next = {};
    if (!email.trim()) next.email = 'Enter the email linked to your account.';
    else if (!isValidEmail(email)) next.email = 'Enter a valid email address.';
    if (!password) next.password = 'Enter your password.';
    else if (password.length < 8) next.password = 'Password must be at least 8 characters.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }, [email, password]);

  const handleLogin = useCallback(async () => {
    if (!validateForm()) return;
    setLoading(true);
    try {
      const result = await login(email.trim().toLowerCase(), password);
      if (!result.success) Alert.alert('Unable to sign in', result.error);
    } catch {
      Alert.alert('Something went wrong', 'Please try again in a moment.');
    } finally {
      setLoading(false);
    }
  }, [email, password, login, validateForm]);

  const updateEmail = (value) => {
    setEmail(value);
    if (errors.email) setErrors((previous) => ({ ...previous, email: null }));
  };
  const updatePassword = (value) => {
    setPassword(value);
    if (errors.password) setErrors((previous) => ({ ...previous, password: null }));
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="none"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.heroPanel}>
          <View style={styles.brandRow}>
            <View style={styles.brandMark}><Feather name="book-open" size={19} color={C.white} /></View>
            <Text style={styles.brandName}>IN4</Text>
            <View style={styles.trustPill}>
              <Feather name="check-circle" size={13} color={THEME.ACCENT_TEAL} />
              <Text style={styles.trustText}>Know more. Decide better.</Text>
            </View>
          </View>

          <View style={styles.intro}>
            <Text style={styles.eyebrow}>WELCOME BACK</Text>
            <Text style={styles.title}>Good to have you{ '\n' }back.</Text>
            <Text style={styles.subtitle}>Sign in to discover clear, practical insights from trusted professionals.</Text>
          </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Sign in to your account</Text>
            <Text style={styles.cardSubtitle}>Pick up where your curiosity left off.</Text>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Email address</Text>
              <View style={[styles.inputWrap, activeField === 'email' && styles.inputFocused, errors.email && styles.inputError]}>
                <Feather name="mail" size={17} color={activeField === 'email' ? C.brand : C.faint} />
                <TextInput
                  style={styles.input}
                  placeholder="name@gmail.com"
                  placeholderTextColor={C.faint}
                  value={email}
                  onChangeText={updateEmail}
                  onFocus={() => setActiveField('email')}
                  onBlur={() => setActiveField(null)}
                  editable={!loading}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  autoComplete="email"
                  textContentType="emailAddress"
                  returnKeyType="next"
                  selectionColor={C.brand}
                  accessibilityLabel="Email address"
                />
                {email.length > 0 && !errors.email ? <Feather name="check-circle" size={17} color={C.brand} /> : null}
              </View>
              {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={[styles.inputWrap, activeField === 'password' && styles.inputFocused, errors.password && styles.inputError]}>
                <Feather name="lock" size={17} color={activeField === 'password' ? C.brand : C.faint} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your password"
                  placeholderTextColor={C.faint}
                  value={password}
                  onChangeText={updatePassword}
                  onFocus={() => setActiveField('password')}
                  onBlur={() => setActiveField(null)}
                  editable={!loading}
                  secureTextEntry={!showPassword}
                  autoComplete="current-password"
                  textContentType="password"
                  returnKeyType="go"
                  onSubmitEditing={handleLogin}
                  selectionColor={C.brand}
                  accessibilityLabel="Password"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword((visible) => !visible)}
                  disabled={!password || loading}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                >
                  <Feather name={showPassword ? 'eye-off' : 'eye'} size={18} color={password ? C.muted : C.faint} />
                </TouchableOpacity>
              </View>
              {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
            </View>

            <TouchableOpacity
              style={[styles.submitButton, loading && styles.submitDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.84}
              accessibilityRole="button"
            >
              {loading ? <ActivityIndicator color={C.brandDark} /> : <>
                <Text style={styles.submitText}>Sign in</Text>
                <Feather name="arrow-right" size={18} color={C.brandDark} />
              </>}
            </TouchableOpacity>

          </View>

          <View style={styles.createRow}>
            <Text style={styles.createPrompt}>New to IN4?</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')} disabled={loading} hitSlop={8}>
              <Text style={styles.createLink}>Create a free account</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.footer}>Trusted knowledge for better everyday decisions.</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: THEME.BACKGROUND },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingTop: 14,
    paddingBottom: 32,
  },
  heroPanel: { marginHorizontal: -28, marginTop: -14, marginBottom: 30, paddingHorizontal: 28, paddingTop: 28, paddingBottom: 26, backgroundColor: THEME.BRAND_DARK },

  /* ── Brand row ── */
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 22,
  },
  brandMark: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: THEME.BRAND_BLUE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: {
    color: THEME.WHITE,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginLeft: 10,
    fontFamily: FONT_DISPLAY,
  },
  trustPill: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'transparent',
  },
  trustText: {
    color: '#D9EAF7',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.1,
  },

  /* ── Intro ── */
  intro: { marginBottom: 30 },
  eyebrow: {
    color: '#9ED8E8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  title: {
    color: THEME.WHITE,
    fontSize: 34,
    fontWeight: '800',
    fontFamily: FONT_DISPLAY,
    letterSpacing: -0.8,
    lineHeight: 42,
  },
  subtitle: {
    color: '#D2E1ED',
    fontSize: 15,
    lineHeight: 24,
    marginTop: 12,
    maxWidth: 340,
  },

  /* ── Card ── */
  card: {
    backgroundColor: 'transparent',
  },
  cardTitle: {
    color: '#07152E',
    fontSize: 18,
    fontWeight: '700',
  },
  cardSubtitle: {
    color: '#40536B',
    fontSize: 13,
    marginTop: 5,
    marginBottom: 24,
    lineHeight: 20,
  },

  /* ── Fields ── */
  fieldGroup: { marginBottom: 18 },
  label: {
    color: '#07152E',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  inputWrap: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    borderBottomWidth: 1,
    borderBottomColor: '#B9C6C9',
    backgroundColor: 'transparent',
    paddingHorizontal: 2,
  },
  inputFocused: {
    borderBottomColor: '#087B84',
  },
  inputError: {
    borderBottomColor: '#B42318',
  },
  input: {
    flex: 1,
    minWidth: 0,
    color: '#07152E',
    fontSize: 15,
    fontFamily: FONT_UI,
    paddingVertical: 0,
  },
  errorText: {
    color: '#B42318',
    fontSize: 12,
    marginTop: 6,
    fontWeight: '500',
  },

  /* ── Submit button ── */
  submitButton: {
    minHeight: 58,
    backgroundColor: '#C8E5F8',
    borderColor: '#A9D3F0',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 8,
    shadowColor: '#173B59',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  submitDisabled: { opacity: 0.65 },
  submitText: {
    color: '#173B59',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },

  /* ── Footer ── */
  createRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 5,
    marginTop: 26,
  },
  createPrompt: {
    color: '#40536B',
    fontSize: 14,
  },
  createLink: {
    color: '#12396B',
    fontSize: 14,
    fontWeight: '700',
  },
  footer: {
    color: '#8499A8',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 'auto',
    paddingTop: 28,
  },
});

export default LoginScreen;
