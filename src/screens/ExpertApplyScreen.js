import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TextInput, TouchableOpacity, Text, ActivityIndicator, Alert, Modal, KeyboardAvoidingView, Platform } from 'react-native';
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
  const [showProfessionPicker, setShowProfessionPicker] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [expertId, setExpertId] = useState(null);

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
      'Submit your expert application?',
      'Your professional details and licence information will be sent to IN4 staff for verification. An application can only be submitted once per account, so check these details carefully.',
      [
        { text: 'Review details', style: 'cancel' },
        { text: 'Submit application', onPress: async () => {
          setLoading(true);
          try {
            if (!documents.length) throw new Error('Add at least one supporting document before submitting.');
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
            }
            setSubmitted(true);
          } catch (err) {
            const errorMsg = err.response?.data?.errors?.[Object.keys(err.response?.data?.errors || {})[0]]?.[0] || err.response?.data?.message || err.message || 'Failed to submit application';
            Alert.alert('Application not submitted', errorMsg);
          } finally {
            setLoading(false);
          }
        } },
      ],
    );
  }, [documents, expertId, formData, validateForm]);

  const updateFormField = useCallback((field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: null }));
  }, [errors]);

  if (submitted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.successContainer}>
          <View style={styles.successIconWrapper}>
            <Ionicons name="checkmark-circle" size={80} color={COLORS.SUCCESS} />
          </View>
          <Text style={styles.successTitle}>Application Submitted</Text>
          <Text style={styles.successText}>Our team will review your credentials and contact you within 48 hours.</Text>
          <View style={styles.successCard}>
            <Text style={styles.successCardTitle}>What happens next?</Text>
            <View style={styles.successListRow}>
              <Ionicons name="checkmark-circle-outline" size={18} color={COLORS.SUCCESS} />
              <Text style={styles.successListItem}>Check your email for updates</Text>
            </View>
            <View style={styles.successListRow}>
              <Ionicons name="checkmark-circle-outline" size={18} color={COLORS.SUCCESS} />
              <Text style={styles.successListItem}>View your application status in your profile</Text>
            </View>
            <View style={styles.successListRow}>
              <Ionicons name="checkmark-circle-outline" size={18} color={COLORS.SUCCESS} />
              <Text style={[styles.successListItem, styles.successListItemLast]}>Publish once your application is approved</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.goBack()}>
            <Text style={styles.primaryButtonText}>Back to Profile</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} disabled={loading}>
          <Ionicons name="close" size={24} color="#FFFFFF" />
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
              {documents.map((doc) => <Text key={doc.uri} style={styles.documentName}>✓ {doc.name}</Text>)}
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
  container: { flex: 1, backgroundColor: '#F2F7FC' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 18, backgroundColor: '#173B59', borderBottomWidth: 1, borderBottomColor: '#31536D' },
  backButton: { padding: 8, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.12)' },
  headerTitle: { fontFamily: FONT_DISPLAY, fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
  content: { flex: 1 },
  intro: { paddingHorizontal: 24, paddingTop: 32, paddingBottom: 28 },
  introTitle: { fontFamily: FONT_DISPLAY, fontSize: 28, fontWeight: '800', color: '#07152E', marginBottom: 10, letterSpacing: -0.5 },
  introText: { fontSize: 15, color: '#40536B', lineHeight: 23 },

  form: { paddingHorizontal: 24 },
  inputGroup: { marginBottom: 22 },
  label: { fontSize: 13, fontWeight: '700', color: '#07152E', marginBottom: 10 },
  required: { color: '#B42318' },
  optional: { color: '#8899A8', fontWeight: '400', fontSize: 12 },
  input: { backgroundColor: 'transparent', borderWidth: 0, borderBottomWidth: 1, borderColor: '#B8CAD8', borderRadius: 0, paddingHorizontal: 4, paddingVertical: 16, color: '#173B59', fontSize: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 54 },
  inputError: { borderColor: '#B42318', backgroundColor: '#FEF2F0' },
  inputText: { color: '#07152E', fontSize: 16 },
  inputPlaceholder: { color: '#8899A8', fontSize: 16 },
  errorText: { color: '#B42318', fontSize: 12, marginTop: 8, fontWeight: '600' },

  primaryButton: { backgroundColor: '#286A9A', borderRadius: 4, paddingVertical: 17, alignItems: 'center', marginTop: 16 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  legalNotice: { fontSize: 12, color: '#8899A8', textAlign: 'center', marginTop: 28, lineHeight: 19 },
  documentHint: { color: '#61748A', fontSize: 12, lineHeight: 18, marginBottom: 10 },
  documentButton: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 0, borderBottomWidth: 1, borderColor: '#286A9A', borderRadius: 0, paddingVertical: 13, backgroundColor: 'transparent' },
  documentButtonText: { color: '#12396B', fontWeight: '800', fontSize: 14 },
  documentName: { color: '#40536B', fontSize: 12, marginTop: 8 },

  successContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 28 },
  successIconWrapper: { marginBottom: 28 },
  successTitle: { fontSize: 28, fontWeight: '900', color: '#07152E', marginBottom: 14, textAlign: 'center', letterSpacing: -0.5 },
  successText: { fontSize: 16, color: '#40536B', textAlign: 'center', lineHeight: 25, marginBottom: 36 },
  successCard: { backgroundColor: 'transparent', borderRadius: 0, paddingVertical: 22, paddingHorizontal: 0, width: '100%', marginBottom: 36, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#D4E2EF' },
  successCardTitle: { fontSize: 16, fontWeight: '800', color: '#07152E', marginBottom: 20 },
  successListRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 16 },
  successListItem: { flex: 1, fontSize: 15, color: '#40536B', lineHeight: 22 },
  successListItemLast: { marginBottom: 0 },

  modalOverlay: { flex: 1, backgroundColor: THEME.OVERLAY, justifyContent: 'flex-end' },
  pickerSheet: { backgroundColor: '#F3F6FA', borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '80%', padding: 24 },
  pickerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: '#D2DCE7' },
  pickerTitle: { fontSize: 19, fontWeight: '800', color: '#07152E' },
  pickerItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 17, borderBottomWidth: 1, borderBottomColor: '#EBF0F4' },
  pickerItemSelected: { },
  pickerItemText: { fontSize: 16, color: '#07152E', fontWeight: '500' },
  pickerItemTextSelected: { color: '#12396B', fontWeight: '800' },
});

export default ExpertApplyScreen;
