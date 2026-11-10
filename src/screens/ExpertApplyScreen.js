import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import Text from '../components/ThemedText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { expertAPI } from '../api/client';
import * as DocumentPicker from 'expo-document-picker';
import { FONT_DISPLAY } from '../theme/typography';
import { COLORS as THEME } from '../theme/colors';

const COLORS = {
  BACKGROUND: THEME.BACKGROUND,
  SURFACE: THEME.SURFACE,
  PRIMARY: THEME.BRAND_BLUE,
  TEXT_MAIN: THEME.TEXT_PRIMARY,
  TEXT_MUTED: THEME.TEXT_SECONDARY,
  BORDER: THEME.BORDER,
  ERROR: THEME.ERROR_RED,
  SUCCESS: THEME.SUCCESS_GREEN,
};

// Profession options (match backend)
const PROFESSIONS = [
  { label: 'Select a profession...', value: '' },
  { label: 'Medical Doctor (MD/DO)', value: 'doctor' },
  { label: 'Registered Nurse (RN)', value: 'nurse' },
  { label: 'Pharmacist', value: 'pharmacist' },
  { label: 'Psychologist', value: 'psychologist' },
  { label: 'Licensed Attorney', value: 'lawyer' },
  { label: 'Certified Accountant', value: 'accountant' },
  { label: 'Financial Advisor', value: 'financial_advisor' },
  { label: 'Cybersecurity Specialist', value: 'cybersecurity' },
  { label: 'Agricultural Specialist', value: 'agricultural' },
  { label: 'Registered Dietitian', value: 'nutritionist' },
  { label: 'Licensed Engineer', value: 'engineer' },
  { label: 'Other Licensed Professional', value: 'other' },
];

const ExpertApplyScreen = ({ navigation }) => {
  const [formData, setFormData] = useState({ profession: '', licenseNumber: '', licenseIssuer: '', bio: '', expertiseAreas: '', organization: '', location: '', languages: '', consultationMethods: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [paymentStep, setPaymentStep] = useState(false);
  const [paymentConfig, setPaymentConfig] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState('idle');
  const [paymentMessage, setPaymentMessage] = useState('');
  const [paymentPhone, setPaymentPhone] = useState('');
  const [documentsUploaded, setDocumentsUploaded] = useState(0);
  const [showProfessionPicker, setShowProfessionPicker] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [expertId, setExpertId] = useState(null);

  useEffect(() => {
    let active = true;
    expertAPI.getVerificationPaymentConfig()
      .then((config) => { if (active) setPaymentConfig(config); })
      .catch(() => { if (active) setPaymentConfig({ available: false, amount: 0, currency: 'KES' }); });
    expertAPI.getMyVerificationPayment()
      .then((application) => {
        if (!active) return;
        setExpertId(application.expert_id);
        setDocumentsUploaded(application.documents_uploaded || 0);
        setPaymentStatus(application.payment_status || 'idle');
        setPaymentMessage(application.customer_message || '');
        if (application.expert_status === 'awaiting_payment') setPaymentStep(true);
        else if (['pending', 'verified'].includes(application.expert_status)) setSubmitted(true);
      })
      .catch((error) => {
        if (active && error.response?.status !== 404) console.warn('Could not restore expert application', error);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!paymentStep || !expertId || !['initiating', 'pending'].includes(paymentStatus)) return undefined;
    let active = true;
    const checkPayment = async () => {
      try {
        const result = await expertAPI.getMyVerificationPayment();
        if (!active) return;
        setPaymentStatus(result.payment_status || 'idle');
        setPaymentMessage(result.customer_message || '');
        if (result.payment_status === 'paid') setSubmitted(true);
      } catch (error) {
        if (active) console.warn('Could not refresh M-Pesa payment status', error);
      }
    };
    const timer = setInterval(checkPayment, 5000);
    return () => { active = false; clearInterval(timer); };
  }, [expertId, paymentStep, paymentStatus]);

  const pickDocuments = useCallback(async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/jpeg', 'image/png'], multiple: true, copyToCacheDirectory: true });
    if (!result.canceled) setDocuments((current) => [...current, ...result.assets].filter((file, index, all) => all.findIndex((entry) => entry.uri === file.uri) === index));
  }, []);

  const validateForm = useCallback(() => {
    const newErrors = {};
    if (!formData.profession) newErrors.profession = 'Please select a profession';
    if (!formData.licenseNumber.trim()) newErrors.licenseNumber = 'License number is required';
    else if (formData.licenseNumber.trim().length < 3) newErrors.licenseNumber = 'License number must be at least 3 characters';
    if (!formData.licenseIssuer.trim()) newErrors.licenseIssuer = 'License issuer/country is required';
    if (formData.bio && formData.bio.length > 1000) newErrors.bio = 'Bio must be 1000 characters or less';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleSubmit = useCallback(() => {
    if (!validateForm()) return;
    Alert.alert(
      'Save your expert application?',
      'Your details and documents will be saved first. The application enters staff review only after the M-Pesa payment is confirmed.',
      [
        { text: 'Review details', style: 'cancel' },
        { text: 'Continue', onPress: async () => {
          setLoading(true);
          try {
            if (!documents.length && (!expertId || documentsUploaded === 0)) {
              throw new Error('Add at least one supporting document before continuing.');
            }
            let applicationId = expertId;
            if (!applicationId) {
              const result = await expertAPI.applyAsExpert(
                formData.profession, formData.licenseNumber.trim().toUpperCase(), formData.licenseIssuer.trim(), formData.bio, formData.expertiseAreas, formData.organization, formData.location, formData.languages, formData.consultationMethods
              );
              if (result.status !== 'success') throw new Error(result.message || 'Failed to submit application.');
              applicationId = result.expert_id;
              setExpertId(applicationId);
            }
            for (const document of documents) {
              await expertAPI.uploadVerificationDocument(applicationId, document);
              setDocuments((current) => current.filter((item) => item.uri !== document.uri));
              setDocumentsUploaded((count) => count + 1);
            }
            setPaymentStatus('idle');
            setPaymentStep(true);
          } catch (err) {
            const errorMsg = err.response?.data?.errors?.[Object.keys(err.response?.data?.errors || {})[0]]?.[0] || err.response?.data?.message || err.message || 'Failed to submit application';
            Alert.alert('Application not submitted', errorMsg);
          } finally {
            setLoading(false);
          }
        } },
      ],
    );
  }, [documents, documentsUploaded, expertId, formData, validateForm]);

  const updateFormField = useCallback((field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: null }));
  }, [errors]);

  const uploadPendingDocuments = useCallback(async () => {
    if (!expertId || !documents.length) return;
    setLoading(true);
    try {
      for (const document of documents) {
        await expertAPI.uploadVerificationDocument(expertId, document);
        setDocuments((current) => current.filter((item) => item.uri !== document.uri));
        setDocumentsUploaded((count) => count + 1);
      }
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Could not upload the selected document.';
      Alert.alert('Document upload failed', message);
    } finally {
      setLoading(false);
    }
  }, [documents, expertId]);

  const startPayment = useCallback(async () => {
    if (!expertId || !paymentPhone.trim()) {
      setPaymentStatus('failed');
      setPaymentMessage('Enter the M-Pesa number that should receive the payment prompt.');
      return;
    }
    if (!paymentConfig?.available) {
      setPaymentMessage('M-Pesa payments are not configured yet. Your saved application will remain here until payment is available.');
      return;
    }
    setLoading(true);
    setPaymentStatus('initiating');
    try {
      const result = await expertAPI.startVerificationPayment(expertId, paymentPhone.trim());
      setPaymentStatus(result.payment_status);
      setPaymentMessage(result.customer_message || 'Approve the request on your phone.');
      if (result.payment_status === 'paid') setSubmitted(true);
    } catch (error) {
      setPaymentStatus('failed');
      setPaymentMessage(error.response?.data?.message || 'Could not start M-Pesa. Check the number and try again.');
    } finally {
      setLoading(false);
    }
  }, [expertId, paymentConfig, paymentPhone]);

  const checkPaymentStatus = useCallback(async () => {
    setLoading(true);
    try {
      const result = await expertAPI.getMyVerificationPayment();
      setPaymentStatus(result.payment_status || 'idle');
      setPaymentMessage(result.customer_message || '');
      if (result.payment_status === 'paid') setSubmitted(true);
    } catch (error) {
      setPaymentMessage(error.response?.data?.message || 'Could not refresh the payment status.');
    } finally {
      setLoading(false);
    }
  }, []);

  if (paymentStep && !submitted) {
    const waitingForPayment = ['initiating', 'pending'].includes(paymentStatus);
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} accessibilityRole="button" accessibilityLabel="Back to profile">
            <Ionicons name="arrow-back" size={21} color={THEME.TEXT_PRIMARY} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Verification payment</Text>
          <View style={{ width: 40 }} />
        </View>
        <ScrollView contentContainerStyle={styles.paymentContent} keyboardShouldPersistTaps="always" showsVerticalScrollIndicator={false}>
          <View style={styles.paymentIntro}>
            <View style={styles.paymentMark}><Ionicons name="shield-checkmark" size={21} color={THEME.BRAND_BLUE} /></View>
            <Text style={styles.paymentTitle}>One last step</Text>
            <Text style={styles.paymentSubtitle}>Your documents are saved. Confirm the verification fee to send your application into review.</Text>
          </View>

          <View style={styles.paymentCard}>
            <Text style={styles.paymentLabel}>EXPERT VERIFICATION FEE</Text>
            <View style={styles.feeRow}>
              <Text style={styles.feeAmount}>{paymentConfig?.available ? `KES ${paymentConfig.amount.toLocaleString()}` : 'Not configured'}</Text>
              <View style={styles.mpesaMark}><Text style={styles.mpesaText}>M-PESA</Text></View>
            </View>
            <Text style={styles.paymentFinePrint}>
              {paymentConfig?.available
                ? 'A secure payment prompt will be sent to your phone. Your application enters review only after confirmation.'
                : 'Payment setup is not available yet. Your saved application will remain here; no charge will be made.'}
            </Text>
          </View>

          <View style={styles.paymentForm}>
            <Text style={styles.paymentFieldLabel}>M-Pesa number</Text>
            <TextInput
              style={styles.input}
              value={paymentPhone}
              onChangeText={setPaymentPhone}
              placeholder="0712 345 678"
              placeholderTextColor={THEME.TEXT_MUTED}
              keyboardType="phone-pad"
              editable={!waitingForPayment && !loading}
              accessibilityLabel="M-Pesa phone number"
            />
            <Text style={styles.paymentHint}>Use the Kenyan number that should receive the STK prompt.</Text>
          </View>

          {documentsUploaded === 0 || documents.length > 0 ? (
            <View style={styles.paymentForm}>
              <Text style={styles.paymentFieldLabel}>Supporting documents</Text>
              <Text style={styles.paymentHint}>At least one document must be uploaded before payment.</Text>
              <TouchableOpacity style={styles.documentButton} onPress={documents.length ? uploadPendingDocuments : pickDocuments} disabled={loading}>
                <Ionicons name={documents.length ? 'cloud-upload-outline' : 'attach'} size={18} color={THEME.BRAND_BLUE} />
                <Text style={styles.documentButtonText}>{documents.length ? `Upload ${documents.length} selected` : 'Choose documents'}</Text>
              </TouchableOpacity>
              {documents.map((document) => <Text key={document.uri} style={styles.documentName} numberOfLines={1}>{document.name}</Text>)}
            </View>
          ) : (
            <View style={styles.documentCount}><Ionicons name="checkmark-circle" size={17} color={THEME.SUCCESS_GREEN} /><Text style={styles.documentCountText}>{documentsUploaded} supporting {documentsUploaded === 1 ? 'document' : 'documents'} uploaded</Text></View>
          )}

          {paymentStatus === 'failed' && paymentMessage ? (
            <View style={[styles.paymentStatus, styles.paymentStatusFailed]}><Ionicons name="alert-circle-outline" size={18} color={THEME.ERROR_RED} /><Text style={styles.paymentStatusText}>{paymentMessage}</Text></View>
          ) : null}
          {waitingForPayment ? (
            <View style={styles.paymentStatus}><ActivityIndicator size="small" color={THEME.BRAND_BLUE} /><Text style={styles.paymentStatusText}>{paymentMessage || 'Approve the M-Pesa prompt on your phone.'}</Text></View>
          ) : null}

          {waitingForPayment ? (
            <TouchableOpacity style={styles.secondaryButton} onPress={checkPaymentStatus} disabled={loading}>
              <Text style={styles.secondaryButtonText}>{loading ? 'Checking…' : 'Check payment status'}</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.primaryButton, (!paymentConfig?.available || documentsUploaded === 0 || loading) && styles.buttonDisabled]}
              onPress={startPayment}
              disabled={!paymentConfig?.available || documentsUploaded === 0 || loading}
            >
              {loading ? <ActivityIndicator color={THEME.WHITE} /> : <><Text style={styles.primaryButtonText}>Send M-Pesa prompt</Text><Ionicons name="arrow-forward" size={18} color={THEME.WHITE} /></>}
            </TouchableOpacity>
          )}
          <Text style={styles.legalNotice}>You’ll review and approve the amount on your phone before M-Pesa completes any charge.</Text>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (submitted) {
    return (
      <SafeAreaView style={styles.successPage}>
        <View style={styles.successTopBar}>
          <View style={styles.successBrandMark}><Ionicons name="shield-checkmark" size={17} color={THEME.BRAND_BLUE} /></View>
          <Text style={styles.successEyebrow}>EXPERT VERIFICATION</Text>
          <View style={styles.receivedBadge}><View style={styles.receivedDot} /><Text style={styles.receivedText}>Received</Text></View>
        </View>
        <ScrollView contentContainerStyle={styles.successScroll} showsVerticalScrollIndicator={false}>
          <View style={styles.successHero}>
            <View style={styles.successIconWrapper}><Ionicons name="checkmark" size={34} color={THEME.BRAND_BLUE} /></View>
            <Text style={styles.successTitle}>Application received</Text>
            <Text style={styles.successText}>Your credentials are in review. We’ll contact you within 48 hours with an update.</Text>
          </View>
          <View style={styles.successCard}>
            <View style={styles.reviewWindow}>
              <View style={styles.reviewIcon}><Ionicons name="time-outline" size={19} color={THEME.BRAND_BLUE} /></View>
              <View style={styles.reviewWindowCopy}>
                <Text style={styles.reviewWindowLabel}>EXPECTED REVIEW</Text>
                <Text style={styles.reviewWindowValue}>Within 48 hours</Text>
              </View>
              <Ionicons name="checkmark-circle" size={21} color={THEME.SUCCESS_GREEN} />
            </View>
            <View style={styles.successDivider} />
            <Text style={styles.successCardTitle}>What happens next</Text>
            <View style={styles.successListRow}>
              <View style={styles.stepIcon}><Ionicons name="mail-outline" size={17} color={THEME.BRAND_BLUE} /></View>
              <View style={styles.successStepCopy}><Text style={styles.successStepTitle}>Watch your inbox</Text><Text style={styles.successListItem}>We’ll email you when there’s an update.</Text></View>
            </View>
            <View style={styles.successListRow}>
              <View style={styles.stepIcon}><Ionicons name="person-outline" size={17} color={THEME.BRAND_BLUE} /></View>
              <View style={styles.successStepCopy}><Text style={styles.successStepTitle}>Track your status</Text><Text style={styles.successListItem}>Your profile will show the application status.</Text></View>
            </View>
            <View style={[styles.successListRow, styles.successListRowLast]}>
              <View style={styles.stepIcon}><Ionicons name="document-text-outline" size={17} color={THEME.BRAND_BLUE} /></View>
              <View style={styles.successStepCopy}><Text style={styles.successStepTitle}>Publish after approval</Text><Text style={styles.successListItem}>Your expert tools unlock once verification is complete.</Text></View>
            </View>
          </View>
          <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.goBack()} activeOpacity={0.85}>
            <Text style={styles.primaryButtonText}>Return to profile</Text>
            <Ionicons name="arrow-forward" size={18} color={THEME.WHITE} />
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} disabled={loading}>
          <Ionicons name="close" size={24} color={THEME.TEXT_PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Expert Application</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 36 }} keyboardShouldPersistTaps="always" keyboardDismissMode="none" showsVerticalScrollIndicator={false}>
          <View style={styles.intro}>
            <Text style={styles.introTitle}>Share Your Expertise</Text>
            <Text style={styles.introText}>Help the community make informed decisions with your verified professional knowledge.</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Profession <Text style={styles.required}>*</Text></Text>
              <TouchableOpacity style={[styles.input, errors.profession && styles.inputError]} onPress={() => setShowProfessionPicker(true)}>
                <Text style={formData.profession ? styles.inputText : styles.inputPlaceholder}>
                  {formData.profession ? PROFESSIONS.find((p) => p.value === formData.profession)?.label : 'Select your profession'}
                </Text>
                <Ionicons name="chevron-down" size={20} color={COLORS.TEXT_MUTED} />
              </TouchableOpacity>
              {errors.profession && <Text style={styles.errorText}>{errors.profession}</Text>}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>License Number <Text style={styles.required}>*</Text></Text>
              <TextInput style={[styles.input, errors.licenseNumber && styles.inputError]} placeholder="e.g., KE-MD-12345" placeholderTextColor={COLORS.TEXT_MUTED} value={formData.licenseNumber} onChangeText={(text) => updateFormField('licenseNumber', text)} editable={!loading} />
              {errors.licenseNumber && <Text style={styles.errorText}>{errors.licenseNumber}</Text>}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>License Issuer / Country <Text style={styles.required}>*</Text></Text>
              <TextInput style={[styles.input, errors.licenseIssuer && styles.inputError]} placeholder="e.g., Kenya Medical Board" placeholderTextColor={COLORS.TEXT_MUTED} value={formData.licenseIssuer} onChangeText={(text) => updateFormField('licenseIssuer', text)} editable={!loading} />
              {errors.licenseIssuer && <Text style={styles.errorText}>{errors.licenseIssuer}</Text>}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Supporting documents <Text style={styles.required}>*</Text></Text>
              <Text style={styles.documentHint}>Add licence, qualification, or professional status evidence. PDF, JPEG, or PNG, up to 10 MB each.</Text>
              <TouchableOpacity style={styles.documentButton} onPress={pickDocuments} disabled={loading}>
                <Ionicons name="attach" size={20} color={COLORS.PRIMARY} />
                <Text style={styles.documentButtonText}>Choose documents</Text>
              </TouchableOpacity>
              {documents.map((doc) => <View key={doc.uri} style={styles.documentRow}><Ionicons name="document-text-outline" size={17} color={THEME.BRAND_BLUE} /><Text style={styles.documentName} numberOfLines={1}>{doc.name}</Text><Ionicons name="checkmark-circle" size={16} color={THEME.SUCCESS_GREEN} /></View>)}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Organization <Text style={styles.optional}>(Optional)</Text></Text>
              <TextInput style={styles.input} placeholder="e.g., Kenya Heart Hospital" placeholderTextColor={COLORS.TEXT_MUTED} value={formData.organization} onChangeText={(text) => updateFormField('organization', text)} editable={!loading} />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Office location or service area <Text style={styles.optional}>(Optional)</Text></Text>
              <TextInput style={styles.input} placeholder="e.g., Nairobi, Kenya" placeholderTextColor={COLORS.TEXT_MUTED} value={formData.location} onChangeText={(text) => updateFormField('location', text)} editable={!loading} />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Languages <Text style={styles.optional}>(Optional)</Text></Text>
              <TextInput style={styles.input} placeholder="e.g., English, Kiswahili" placeholderTextColor={COLORS.TEXT_MUTED} value={formData.languages} onChangeText={(text) => updateFormField('languages', text)} editable={!loading} />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Consultation methods <Text style={styles.optional}>(Optional)</Text></Text>
              <TextInput style={styles.input} placeholder="e.g., In-person, phone, online" placeholderTextColor={COLORS.TEXT_MUTED} value={formData.consultationMethods} onChangeText={(text) => updateFormField('consultationMethods', text)} editable={!loading} />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Expertise Areas <Text style={styles.optional}>(Optional)</Text></Text>
              <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top' }]} placeholder="Comma-separated (e.g., Cardiology, Surgery)" placeholderTextColor={COLORS.TEXT_MUTED} value={formData.expertiseAreas} onChangeText={(text) => updateFormField('expertiseAreas', text)} editable={!loading} multiline />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Professional Bio <Text style={styles.optional}>({formData.bio?.length || 0}/1000)</Text></Text>
              <TextInput style={[styles.input, { height: 120, textAlignVertical: 'top' }, errors.bio && styles.inputError]} placeholder="Tell readers about your background..." placeholderTextColor={COLORS.TEXT_MUTED} value={formData.bio} onChangeText={(text) => updateFormField('bio', text)} editable={!loading} multiline />
              {errors.bio && <Text style={styles.errorText}>{errors.bio}</Text>}
            </View>

            <TouchableOpacity style={[styles.primaryButton, loading && { opacity: 0.7 }]} onPress={handleSubmit} disabled={loading}>
              {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryButtonText}>{expertId ? 'Upload Documents' : 'Submit Application'}</Text>}
            </TouchableOpacity>
            
            <Text style={styles.legalNotice}>By submitting, you confirm all provided information is accurate and you hold valid professional licenses.</Text>
          </View>
          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Modern Bottom-Sheet Style Picker */}
      <Modal visible={showProfessionPicker} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.pickerSheet}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Select Profession</Text>
              <TouchableOpacity onPress={() => setShowProfessionPicker(false)}>
                <Ionicons name="close-circle" size={28} color={COLORS.TEXT_MUTED} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {PROFESSIONS.map((prof, index) => {
                if(!prof.value) return null;
                const isSelected = formData.profession === prof.value;
                return (
                  <TouchableOpacity key={index} style={[styles.pickerItem, isSelected && styles.pickerItemSelected]} onPress={() => { updateFormField('profession', prof.value); setShowProfessionPicker(false); }}>
                    <Text style={[styles.pickerItemText, isSelected && styles.pickerItemTextSelected]}>{prof.label}</Text>
                    {isSelected && <Ionicons name="checkmark" size={20} color={COLORS.PRIMARY} />}
                  </TouchableOpacity>
                );
              })}
              <View style={{ height: 40 }}/>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.BACKGROUND },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 18, backgroundColor: THEME.PALE_BLUE, borderBottomWidth: 1, borderBottomColor: THEME.BORDER_LIGHT },
  backButton: { padding: 8, borderRadius: 8, backgroundColor: THEME.SURFACE, borderWidth: 1, borderColor: THEME.BORDER },
  headerTitle: { fontFamily: FONT_DISPLAY, fontSize: 18, fontWeight: '800', color: THEME.TEXT_PRIMARY },
  content: { flex: 1 },
  intro: { paddingHorizontal: 24, paddingTop: 32, paddingBottom: 28 },
  introTitle: { fontFamily: FONT_DISPLAY, fontSize: 28, fontWeight: '800', color: THEME.TEXT_PRIMARY, marginBottom: 10, letterSpacing: 0 },
  introText: { fontSize: 15, color: THEME.TEXT_SECONDARY, lineHeight: 23 },

  form: { paddingHorizontal: 24 },
  inputGroup: { marginBottom: 22 },
  label: { fontSize: 13, fontWeight: '700', color: THEME.TEXT_PRIMARY, marginBottom: 10 },
  required: { color: THEME.ERROR_RED },
  optional: { color: THEME.TEXT_MUTED, fontWeight: '400', fontSize: 12 },
  input: { backgroundColor: THEME.INPUT_BG, borderWidth: 1, borderColor: THEME.BORDER, borderRadius: 8, paddingHorizontal: 13, paddingVertical: 13, color: THEME.TEXT_PRIMARY, fontSize: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 52 },
  inputError: { borderColor: THEME.ERROR_RED, backgroundColor: THEME.ERROR_LIGHT },
  inputText: { color: THEME.TEXT_PRIMARY, fontSize: 16 },
  inputPlaceholder: { color: THEME.TEXT_MUTED, fontSize: 16 },
  errorText: { color: THEME.ERROR_RED, fontSize: 12, marginTop: 8, fontWeight: '600' },

  primaryButton: { minHeight: 52, backgroundColor: THEME.BRAND_BLUE, borderRadius: 8, paddingHorizontal: 18, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  legalNotice: { fontSize: 12, color: THEME.TEXT_MUTED, textAlign: 'center', marginTop: 28, lineHeight: 19 },
  documentHint: { color: THEME.TEXT_TERTIARY, fontSize: 12, lineHeight: 18, marginBottom: 10 },
  documentButton: { minHeight: 48, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: THEME.BORDER, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: THEME.SURFACE },
  documentButtonText: { color: THEME.BRAND_DARK, fontWeight: '800', fontSize: 14 },
  documentRow: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 12, paddingVertical: 10, marginTop: 8, borderRadius: 8, backgroundColor: THEME.PALE_BLUE },
  documentName: { flex: 1, minWidth: 0, color: THEME.TEXT_SECONDARY, fontSize: 12, fontWeight: '600' },

  paymentContent: { flexGrow: 1, paddingHorizontal: 22, paddingTop: 28, paddingBottom: 30 },
  paymentIntro: { marginBottom: 21 },
  paymentMark: { width: 42, height: 42, borderRadius: 13, backgroundColor: THEME.PALE_BLUE, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  paymentTitle: { fontFamily: FONT_DISPLAY, color: THEME.TEXT_PRIMARY, fontSize: 27, fontWeight: '800', marginBottom: 7 },
  paymentSubtitle: { color: THEME.TEXT_SECONDARY, fontSize: 14, lineHeight: 21 },
  paymentCard: { backgroundColor: THEME.SURFACE, borderWidth: 1, borderColor: THEME.BORDER_LIGHT, borderRadius: 8, padding: 17, marginBottom: 22 },
  paymentLabel: { color: THEME.TEXT_MUTED, fontSize: 10, fontWeight: '800', letterSpacing: 0.6, marginBottom: 8 },
  feeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  feeAmount: { fontFamily: FONT_DISPLAY, flexShrink: 1, color: THEME.TEXT_PRIMARY, fontSize: 22, fontWeight: '800' },
  mpesaMark: { backgroundColor: THEME.BRAND_GREEN, borderRadius: 5, paddingHorizontal: 8, paddingVertical: 5 },
  mpesaText: { color: THEME.WHITE, fontSize: 10, fontWeight: '900' },
  paymentFinePrint: { color: THEME.TEXT_SECONDARY, fontSize: 12, lineHeight: 18, marginTop: 10 },
  paymentForm: { marginBottom: 18 },
  paymentFieldLabel: { color: THEME.TEXT_PRIMARY, fontSize: 13, fontWeight: '700', marginBottom: 8 },
  paymentHint: { color: THEME.TEXT_TERTIARY, fontSize: 12, lineHeight: 18, marginTop: 7 },
  documentCount: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, marginBottom: 13 },
  documentCountText: { color: THEME.TEXT_SECONDARY, fontSize: 12, fontWeight: '700' },
  paymentStatus: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 13, marginTop: 2, marginBottom: 14, borderRadius: 8, backgroundColor: THEME.PALE_BLUE },
  paymentStatusFailed: { backgroundColor: THEME.ERROR_LIGHT },
  paymentStatusText: { flex: 1, color: THEME.TEXT_SECONDARY, fontSize: 12, lineHeight: 18 },
  secondaryButton: { minHeight: 48, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: THEME.BORDER, borderRadius: 8, backgroundColor: THEME.SURFACE, paddingHorizontal: 16, paddingVertical: 12 },
  secondaryButtonText: { color: THEME.BRAND_BLUE, fontSize: 13, fontWeight: '800' },
  buttonDisabled: { opacity: 0.5 },
  successPage: { flex: 1, backgroundColor: THEME.BACKGROUND },
  successTopBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 22, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: THEME.BORDER_LIGHT, backgroundColor: THEME.SURFACE },
  successBrandMark: { width: 34, height: 34, borderRadius: 11, backgroundColor: THEME.PALE_BLUE, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  successEyebrow: { flex: 1, color: THEME.TEXT_SECONDARY, fontSize: 10, fontWeight: '800', letterSpacing: 0.6 },
  receivedBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, backgroundColor: THEME.SUCCESS_LIGHT },
  receivedDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: THEME.SUCCESS_GREEN },
  receivedText: { color: THEME.SUCCESS_GREEN, fontSize: 11, fontWeight: '700' },
  successScroll: { flexGrow: 1, paddingHorizontal: 22, paddingTop: 32, paddingBottom: 28 },
  successHero: { alignItems: 'center', marginBottom: 27 },
  successIconWrapper: { width: 70, height: 70, borderRadius: 24, backgroundColor: THEME.PALE_BLUE, borderWidth: 1, borderColor: THEME.BORDER, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  successTitle: { fontFamily: FONT_DISPLAY, fontSize: 27, fontWeight: '800', color: THEME.TEXT_PRIMARY, marginBottom: 9, textAlign: 'center' },
  successText: { maxWidth: 340, fontSize: 14, color: THEME.TEXT_SECONDARY, textAlign: 'center', lineHeight: 22 },
  successCard: { backgroundColor: THEME.SURFACE, borderRadius: 8, padding: 18, width: '100%', marginBottom: 18, borderWidth: 1, borderColor: THEME.BORDER_LIGHT },
  reviewWindow: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  reviewIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: THEME.PALE_BLUE, alignItems: 'center', justifyContent: 'center' },
  reviewWindowCopy: { flex: 1 },
  reviewWindowLabel: { color: THEME.TEXT_MUTED, fontSize: 9, fontWeight: '800', letterSpacing: 0.7, marginBottom: 3 },
  reviewWindowValue: { color: THEME.TEXT_PRIMARY, fontSize: 14, fontWeight: '800' },
  successDivider: { height: 1, backgroundColor: THEME.BORDER_LIGHT, marginVertical: 17 },
  successCardTitle: { fontSize: 15, fontWeight: '800', color: THEME.TEXT_PRIMARY, marginBottom: 15 },
  successListRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 11, marginBottom: 15 },
  successListRowLast: { marginBottom: 0 },
  stepIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: THEME.PALE_BLUE, alignItems: 'center', justifyContent: 'center' },
  successStepCopy: { flex: 1, paddingTop: 1 },
  successStepTitle: { color: THEME.TEXT_PRIMARY, fontSize: 13, fontWeight: '700', marginBottom: 2 },
  successListItem: { fontSize: 12, color: THEME.TEXT_SECONDARY, lineHeight: 18 },

  modalOverlay: { flex: 1, backgroundColor: THEME.OVERLAY, justifyContent: 'flex-end' },
  pickerSheet: { backgroundColor: THEME.SURFACE_ALT, borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '80%', padding: 24 },
  pickerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: THEME.BORDER },
  pickerTitle: { fontSize: 19, fontWeight: '800', color: THEME.TEXT_PRIMARY },
  pickerItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 17, borderBottomWidth: 1, borderBottomColor: THEME.BORDER_LIGHT },
  pickerItemSelected: { },
  pickerItemText: { fontSize: 16, color: THEME.TEXT_PRIMARY, fontWeight: '500' },
  pickerItemTextSelected: { color: THEME.BRAND_DARK, fontWeight: '800' },
});

export default ExpertApplyScreen;
