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
import { isValidEmail, validatePassword, isValidName } from '../utils/validation';
import { FONT_DISPLAY, FONT_UI } from '../theme/typography';
import { COLORS as THEME } from '../theme/colors';

const C = {
  ink: THEME.TEXT_PRIMARY, muted: THEME.TEXT_SECONDARY, faint: THEME.TEXT_TERTIARY,
  brand: THEME.BRAND_BLUE, brandDark: THEME.BRAND_DARK,
  canvas: THEME.BACKGROUND, white: THEME.WHITE, line: THEME.BORDER,
  error: THEME.ERROR_RED, pale: THEME.PALE_GREEN,
};

const RegisterScreen = ({ navigation }) => {
  const [formData, setFormData] = useState({ firstName: '', lastName: '', email: '', password: '', passwordConfirm: '' });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [activeField, setActiveField] = useState(null);
  const { register } = useAuth();

  const validateForm = useCallback(() => {
    const next = {};
    if (!isValidName(formData.firstName)) next.firstName = 'Enter a first name of at least 2 characters.';
    if (!isValidName(formData.lastName)) next.lastName = 'Enter a last name of at least 2 characters.';
    if (!formData.email.trim()) next.email = 'Email is required.';
    else if (!isValidEmail(formData.email)) next.email = 'Enter a valid email address.';
    if (!formData.password) next.password = 'Password is required.';
    else {
      const result = validatePassword(formData.password);
      if (!result.isValid) next.password = result.errors[0];
    }
    if (!formData.passwordConfirm) next.passwordConfirm = 'Confirm your password.';
    else if (formData.password !== formData.passwordConfirm) next.passwordConfirm = 'Passwords do not match.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }, [formData]);

  const handleRegister = useCallback(async () => {
    if (!validateForm()) return;
    setLoading(true);
    try {
      const result = await register(
        formData.email.trim().toLowerCase(), formData.password, formData.passwordConfirm,
        formData.firstName.trim(), formData.lastName.trim()
      );
      if (!result.success) Alert.alert('Unable to create account', result.error);
    } catch {
      Alert.alert('Something went wrong', 'Please try again in a moment.');
    } finally {
      setLoading(false);
    }
  }, [formData, register, validateForm]);

  const updateField = useCallback((field, value) => {
    setFormData((previous) => ({ ...previous, [field]: value }));
    if (errors[field]) setErrors((previous) => ({ ...previous, [field]: null }));
  }, [errors]);

  const renderField = (field, label, placeholder, options = {}) => (
    <View key={field} style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputWrap, activeField === field && styles.inputFocused, errors[field] && styles.inputError]}>
        <Feather name={options.icon || 'user'} size={17} color={activeField === field ? C.brand : C.faint} />
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={C.faint}
          value={formData[field]}
          onChangeText={(value) => updateField(field, value)}
          onFocus={() => setActiveField(field)}
          onBlur={() => setActiveField(null)}
          editable={!loading}
          autoCapitalize={options.autoCapitalize || 'none'}
          autoCorrect={false}
          keyboardType={options.keyboardType || 'default'}
          secureTextEntry={options.secure ? (field === 'password' ? !showPassword : !showPasswordConfirm) : false}
          autoComplete={options.autoComplete}
          textContentType={options.textContentType}
          returnKeyType={options.returnKeyType || 'next'}
          selectionColor={C.brand}
          accessibilityLabel={label}
        />
        {options.secure ? (
          <TouchableOpacity
            onPress={() => field === 'password' ? setShowPassword((visible) => !visible) : setShowPasswordConfirm((visible) => !visible)}
            disabled={!formData[field] || loading}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={(field === 'password' ? showPassword : showPasswordConfirm) ? 'Hide password' : 'Show password'}
          >
            <Feather name={(field === 'password' ? showPassword : showPasswordConfirm) ? 'eye-off' : 'eye'} size={18} color={formData[field] ? C.muted : C.faint} />
          </TouchableOpacity>
        ) : null}
      </View>
      {errors[field] ? <Text style={styles.errorText}>{errors[field]}</Text> : null}
      {field === 'password' && !errors.password ? <Text style={styles.hint}>Use a strong password that you don't use elsewhere.</Text> : null}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="always" keyboardDismissMode="none" showsVerticalScrollIndicator={false}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.navigate('Login')} disabled={loading} hitSlop={8}>
            <Feather name="arrow-left" size={17} color={C.brandDark} />
            <Text style={styles.backText}>Back to sign in</Text>
          </TouchableOpacity>

          <View style={styles.heroPanel}>
          <View style={styles.brandRow}>
            <View style={styles.brandMark}><Feather name="book-open" size={19} color={C.white} /></View>
            <Text style={styles.brandName}>IN4</Text>
            <View style={styles.trustPill}><Feather name="check-circle" size={13} color={THEME.ACCENT_TEAL} /><Text style={styles.trustText}>Know more. Decide better.</Text></View>
          </View>

          <View style={styles.intro}>
            <Text style={styles.eyebrow}>GET STARTED</Text>
            <Text style={styles.title}>Make room for{ '\n' }better answers.</Text>
            <Text style={styles.subtitle}>Create your free account and learn from trusted professionals across the topics that matter to you.</Text>
          </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Create your account</Text>
            <Text style={styles.cardSubtitle}>A few details and you're ready to explore.</Text>
            {renderField('firstName', 'First name', 'e.g. Vincent', { icon: 'user', autoCapitalize: 'words', autoComplete: 'given-name', textContentType: 'givenName' })}
            {renderField('lastName', 'Last name', 'e.g. Kaikai', { icon: 'user', autoCapitalize: 'words', autoComplete: 'family-name', textContentType: 'familyName' })}
            {renderField('email', 'Email address', 'name@gmail.com', { icon: 'mail', keyboardType: 'email-address', autoComplete: 'email', textContentType: 'emailAddress' })}
            {renderField('password', 'Password', 'Create a strong password', { icon: 'lock', secure: true, autoComplete: 'new-password', textContentType: 'newPassword' })}
            {renderField('passwordConfirm', 'Confirm password', 'Enter your password again', { icon: 'shield', secure: true, autoComplete: 'new-password', textContentType: 'newPassword', returnKeyType: 'done' })}

            <TouchableOpacity style={[styles.submitButton, loading && styles.submitDisabled]} onPress={handleRegister} disabled={loading} activeOpacity={0.84} accessibilityRole="button">
              {loading ? <ActivityIndicator color={C.brandDark} /> : <><Text style={styles.submitText}>Create account</Text><Feather name="arrow-right" size={18} color={C.brandDark} /></>}
            </TouchableOpacity>
          </View>

          <View style={styles.createRow}>
            <Text style={styles.createPrompt}>Already have an account?</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')} disabled={loading} hitSlop={8}><Text style={styles.createLink}>Sign in</Text></TouchableOpacity>
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
    paddingTop: 10,
    paddingBottom: 32,
  },
  heroPanel: { marginHorizontal: -28, marginBottom: 28, paddingHorizontal: 28, paddingTop: 24, paddingBottom: 24, backgroundColor: THEME.BRAND_DARK },

  /* ── Back button ── */
  backButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 8,
    marginBottom: 16,
  },
  backText: {
    color: THEME.BRAND_DARK,
    fontSize: 13,
    fontWeight: '600',
  },

  /* ── Brand row ── */
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
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
  intro: { marginBottom: 28 },
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
    marginBottom: 22,
    lineHeight: 20,
  },

  /* ── Fields ── */
  fieldGroup: { marginBottom: 16 },
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
  hint: {
    color: '#8499A8',
    fontSize: 11,
    marginTop: 6,
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
    gap: 6,
    marginTop: 24,
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
    paddingTop: 26,
  },
});

export default RegisterScreen;
