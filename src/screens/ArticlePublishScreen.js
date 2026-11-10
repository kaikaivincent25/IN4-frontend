import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
  
  Alert,
  Modal,
  Image,
} from 'react-native';
import Text from '../components/ThemedText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useAuth } from '../context/AuthContext';
import { isValidName, isValidEmail } from '../utils/validation';  

import { articleAPI, categoryAPI, resolveMediaUrl } from '../api/client';
import { FONT_DISPLAY } from '../theme/typography';
import { COLORS as THEME } from '../theme/colors';

const COLORS = {
  BRAND_BLUE: THEME.BRAND_BLUE,
  BRAND_GREEN: THEME.BRAND_GREEN,
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

const getCategoryIcon = (iconName) => ({
  heart: 'heart',
  'scale-outline': 'briefcase',
  'trending-up': 'trending-up',
  'shield-checkmark-outline': 'shield',
  'leaf-outline': 'feather',
  'sprout-outline': 'sun',
  'bulb-outline': 'zap',
}[iconName] || 'file-text');

const ArticlePublishScreen = ({ navigation, route }) => {
  // ===== STATE =====
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [body, setBody] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [draftId, setDraftId] = useState(null);
  const [editingArticleId, setEditingArticleId] = useState(null);
  const [changeNote, setChangeNote] = useState('');
  const [categories, setCategories] = useState([]);
  const [featuredImage, setFeaturedImage] = useState(null);
  const [uploadingFeaturedImage, setUploadingFeaturedImage] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [autosaving, setAutosaving] = useState(false);
  const [autoSaveMessage, setAutoSaveMessage] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [published, setPublished] = useState(false);
  const [loadingDraft, setLoadingDraft] = useState(Boolean(route.params?.draftId || route.params?.articleId));

  // Auto-save timer
  const autoSaveTimer = useRef(null);

  const chooseFeaturedImage = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: ['image/jpeg', 'image/png', 'image/webp'], multiple: false, copyToCacheDirectory: true });
      if (result.canceled || !result.assets?.[0]) return;
      setUploadingFeaturedImage(true);
      const response = await articleAPI.uploadImage(result.assets[0]);
      setFeaturedImage(response.image_url);
    } catch (error) {
      Alert.alert('Image upload failed', error.response?.data?.message || 'Choose a JPEG, PNG, or WebP image under 10 MB.');
    } finally {
      setUploadingFeaturedImage(false);
    }
  }, []);

  /**
   * Load categories on mount
   */
  useEffect(() => {
    let isMounted = true;
    const loadCategories = async () => {
      try {
        const response = await categoryAPI.listCategories();
        if (isMounted) setCategories(response);
      } catch (err) {
        console.error('Failed to load categories', err);
      }
    };
    loadCategories();
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    const draftIdToLoad = route.params?.draftId;
    const articleIdToEdit = route.params?.articleId;
    if (!draftIdToLoad && !articleIdToEdit) return undefined;
    let active = true;
    const draftPromise = articleIdToEdit
      ? articleAPI.createEditDraft(articleIdToEdit)
      : articleAPI.getDraft(draftIdToLoad);
    draftPromise.then((draft) => {
      if (!active) return;
      setDraftId(draft.id);
      setEditingArticleId(draft.article_id || articleIdToEdit || null);
      setTitle(draft.title || '');
      setSummary(draft.summary || '');
      setBody(draft.body || '');
      setFeaturedImage(draft.featured_image || null);
      setSelectedCategory(draft.category_id ? { id: draft.category_id } : null);
    }).catch((err) => {
      if (active) Alert.alert('Unable to open draft', err.response?.data?.detail || 'Please try again.');
    }).finally(() => { if (active) setLoadingDraft(false); });
    return () => { active = false; };
  }, [route.params?.draftId, route.params?.articleId]);

  useEffect(() => {
    if (!selectedCategory?.id || selectedCategory.name || categories.length === 0) return;
    const category = categories.find((item) => item.id === selectedCategory.id);
    if (category) setSelectedCategory(category);
  }, [categories, selectedCategory]);

  // Auto-save draft
  useEffect(() => {
    const saveAutoSave = async () => {
      const isDraftEmpty =
        !title.trim() &&
        !summary.trim() &&
        !body.trim() &&
        !featuredImage?.trim() &&
        !selectedCategory?.id;

      if (isDraftEmpty) {
        return; // Don't save empty drafts
      }

      setAutosaving(true);

      try {
        const result = await articleAPI.autoSaveDraft(
          draftId,
          title,
          summary,
          body,
          selectedCategory?.id,
          featuredImage
        );

        const draft = result.draft || result;
        if (draft?.id) {
          setDraftId(draft.id);
        }

        setAutoSaveMessage('✓ Autosaved');
        setTimeout(() => setAutoSaveMessage(''), 3000);
      } catch (err) {
        console.error('Autosave failed', err, err.response?.data);
        setAutoSaveMessage('✗ Autosave failed');
        setTimeout(() => setAutoSaveMessage(''), 3000);
      } finally {
        setAutosaving(false);
      }
    };

    // Clear previous timer
    if (autoSaveTimer.current) {
      clearTimeout(autoSaveTimer.current);
    }

    // Set new timer (autosave after 3 seconds of inactivity)
    autoSaveTimer.current = setTimeout(saveAutoSave, 3000);

    return () => {
      if (autoSaveTimer.current) {
        clearTimeout(autoSaveTimer.current);
      }
    };
  }, [title, summary, body, selectedCategory, featuredImage, draftId]);

  /**
   * Validate article
   */
  const validateArticle = useCallback(() => {
    const newErrors = {};

    if (!title.trim()) {
      newErrors.title = 'Title is required';
    } else if (title.trim().length < 10) {
      newErrors.title = 'Title must be at least 10 characters';
    }

    if (!summary.trim()) {
      newErrors.summary = 'Summary is required';
    } else if (summary.trim().length < 20) {
      newErrors.summary = 'Summary must be at least 20 characters';
    }

    if (!body.trim()) {
      newErrors.body = 'Article content is required';
    } else if (body.trim().length < 100) {
      newErrors.body = 'Article must be at least 100 characters';
    }

    if (!selectedCategory?.id) {
      newErrors.category = 'Please select a category';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [title, summary, body, selectedCategory]);

  /**
   * Publish article
   */
  const handlePublish = useCallback(async () => {
    if (!validateArticle()) {
      Alert.alert('Article needs more work', 'Complete the highlighted fields before submitting. Publishing or sending for review is only available when the title, summary, article, and category meet the requirements.');
      return;
    }

    if (editingArticleId && changeNote.trim().length < 10) {
      Alert.alert('Explain this update', 'Add at least 10 characters describing why this published article needs to change. This helps the reviewer assess the proposed correction.');
      return;
    }

    Alert.alert(
      editingArticleId ? 'Submit article changes for review?' : 'Publish this article now?',
      editingArticleId
        ? 'Your changes will not appear publicly until a staff reviewer approves them. Readers will continue seeing the current published article while it is reviewed.'
        : 'This article will become visible to all users immediately. Make sure the information is accurate and appropriate before publishing.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: editingArticleId ? 'Submit for review' : 'Publish now',
          style: 'default',
          onPress: async () => {
            setLoading(true);

            try {
              const payload = {
                title: title.trim(),
                summary: summary.trim(),
                body: body.trim(),
                category_id: selectedCategory?.id,
                featured_image: featuredImage,
              };

              if (editingArticleId) {
                await articleAPI.submitRevision(draftId, {
                  title: title.trim(),
                  summary: summary.trim(),
                  body: body.trim(),
                  categoryId: selectedCategory.id,
                  featuredImage,
                  changeNote: changeNote.trim(),
                });
                setPublished(true);
                return;
              }

              const savedDraft = draftId
                ? await articleAPI.autoSaveDraft(
                    draftId,
                    payload.title,
                    payload.summary,
                    payload.body,
                    payload.category_id,
                    payload.featured_image
                  )
                : await articleAPI.createDraft(
                    payload.title,
                    payload.summary,
                    payload.body,
                    payload.category_id,
                    payload.featured_image
                  );

              const draft = savedDraft.draft || savedDraft;
              if (!draft?.id) {
                throw new Error('Unable to save draft before publishing.');
              }

              if (draftId !== draft.id) {
                setDraftId(draft.id);
              }

              const publishResult = await articleAPI.publishDraft(draft.id);

              if (publishResult.status === 'success') {
                setPublished(true);
              } else {
                Alert.alert(
                  'Error',
                  publishResult.message || 'Failed to publish article.'
                );
              }
            } catch (err) {
              Alert.alert(
                'Error',
                err.response?.data?.message ||
                  err.message ||
                  'Failed to publish article'
              );
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  }, [title, summary, body, selectedCategory, featuredImage, validateArticle, draftId, editingArticleId, changeNote]);

  /**
   * Success screen
   */
  if (published) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.successContainer}>
          <Feather name="check-circle" size={48} color={COLORS.SUCCESS_GREEN} style={{ marginBottom: 20 }} />
          <Text style={styles.successTitle}>{editingArticleId ? 'Changes submitted' : 'Article Published!'}</Text>
          <Text style={styles.successText}>
            {editingArticleId
              ? 'Your proposed changes are in the staff review queue. The current published article remains live until a reviewer approves them.'
              : 'Your article is now live and visible to all users.'}
          </Text>

          <TouchableOpacity
            style={styles.successButton}
            onPress={() => navigation.navigate('MainTabs', { screen: 'HomeTab' })}
          >
            <Text style={styles.successButtonText}>Back to Home</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (loadingDraft) {
    return <SafeAreaView style={styles.container}><View style={styles.successContainer}><ActivityIndicator size="large" color={COLORS.BRAND_BLUE} /></View></SafeAreaView>;
  }

  /**
   * Calculate reading time estimate
   */
  const readingTimeEstimate = Math.max(
    1,
    Math.ceil(body.split(/\s+/).length / 200)
  );

  // ── MAIN RENDER ──
  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.headerBack}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{editingArticleId ? 'Edit Published Article' : 'Create Article'}</Text>
        {autoSaveMessage && (
          <Text style={styles.autoSaveMessage}>{autoSaveMessage}</Text>
        )}
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: 48 }}
        keyboardShouldPersistTaps="always"
        keyboardDismissMode="none"
        showsVerticalScrollIndicator={false}
      >
        {/* Title */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>
            Title *
            {title.length > 0 && (
              <Text style={styles.characterCount}>
                {' '}
                ({title.length}/150)
              </Text>
            )}
          </Text>
          {errors.title && (
            <Text style={styles.errorLabel}>{errors.title}</Text>
          )}
          <TextInput
            style={[styles.input, errors.title && styles.inputError]}
            placeholder="Write a compelling title…"
            placeholderTextColor={COLORS.TEXT_TERTIARY}
            value={title}
            onChangeText={setTitle}
            maxLength={150}
            editable={!loading}
          />
        </View>

        {/* Summary */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>
            Summary *
            {summary.length > 0 && (
              <Text style={styles.characterCount}>
                {' '}
                ({summary.length}/500)
              </Text>
            )}
          </Text>
          {errors.summary && (
            <Text style={styles.errorLabel}>{errors.summary}</Text>
          )}
          <TextInput
            style={[
              styles.textareaInput,
              errors.summary && styles.inputError,
            ]}
            placeholder="Brief summary of your article…"
            placeholderTextColor={COLORS.TEXT_TERTIARY}
            value={summary}
            onChangeText={setSummary}
            maxLength={500}
            editable={!loading}
            multiline
            numberOfLines={3}
          />
        </View>

        {editingArticleId && (
          <View style={styles.formGroup}>
            <Text style={styles.label}>Why are you changing this article? *</Text>
            <Text style={styles.revisionHelp}>Your note is shown to the reviewer. Readers will continue to see the current version while this edit is reviewed.</Text>
            <TextInput
              style={styles.textareaInput}
              placeholder="Describe the correction or reason for this update…"
              placeholderTextColor={COLORS.TEXT_TERTIARY}
              value={changeNote}
              onChangeText={setChangeNote}
              editable={!loading}
              maxLength={2000}
              multiline
              numberOfLines={3}
            />
          </View>
        )}

        {/* Body */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>
            Article Content *
            {body.length > 0 && (
              <Text style={styles.characterCount}>
                {' '}
                ({body.length})
              </Text>
            )}
          </Text>
          {errors.body && (
            <Text style={styles.errorLabel}>{errors.body}</Text>
          )}
          <TextInput
            style={[styles.bodyInput, errors.body && styles.inputError]}
            placeholder="Write your article here…"
            placeholderTextColor={COLORS.TEXT_TERTIARY}
            value={body}
            onChangeText={setBody}
            editable={!loading}
            multiline
            numberOfLines={12}
            textAlignVertical="top"
          />

          {/* Reading Time Estimate */}
          {body.length > 0 && (
            <View style={styles.readingTimeBox}>
              <Text style={styles.readingTimeLabel}>
                📖 Estimated reading time: {readingTimeEstimate} min
              </Text>
            </View>
          )}
        </View>

        {/* Category */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Category *</Text>
          {errors.category && (
            <Text style={styles.errorLabel}>{errors.category}</Text>
          )}
          <TouchableOpacity
            style={[
              styles.categoryButton,
              errors.category && styles.inputError,
            ]}
            onPress={() => setShowCategoryPicker(true)}
          >
            {/*
              FIX: previously this looked up the category by comparing
              `c.slug` (a string) against `selectedCategory` (the whole
              object set in the picker below), which could never match —
              so the button permanently showed "Select category" even
              after picking one. selectedCategory already IS the full
              category object, so just read its name directly.
            */}
            <Text
              style={[
                styles.categoryButtonText,
                !selectedCategory && styles.categoryButtonPlaceholder,
              ]}
            >
              {selectedCategory?.name || 'Select category'}
            </Text>
            <Feather name="chevron-down" size={16} color={COLORS.TEXT_TERTIARY} />
          </TouchableOpacity>
        </View>

        {/* Featured article image */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Article image <Text style={styles.optionalLabel}>OPTIONAL</Text></Text>
          <Text style={styles.imageHelp}>Upload a photo or paste an image URL.</Text>
          {featuredImage ? <Image source={{ uri: resolveMediaUrl(featuredImage) }} style={styles.featuredPreview} resizeMode="cover" /> : null}
          <TouchableOpacity style={styles.imagePickerButton} onPress={chooseFeaturedImage} disabled={loading || uploadingFeaturedImage}>
            {uploadingFeaturedImage ? <ActivityIndicator color={COLORS.BRAND_GREEN} size="small" /> : <Feather name="image" size={17} color={COLORS.BRAND_GREEN} />}
            <Text style={styles.imagePickerText}>{uploadingFeaturedImage ? 'Uploading image…' : featuredImage ? 'Replace uploaded image' : 'Choose from device'}</Text>
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            placeholder="Or paste https://…"
            placeholderTextColor={COLORS.TEXT_TERTIARY}
            value={featuredImage || ''}
            onChangeText={setFeaturedImage}
            editable={!loading}
          />
        </View>

        {/* Buttons */}
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.previewButton}
            onPress={() => setShowPreview(true)}
            disabled={!title.trim() || !summary.trim() || !body.trim()}
          >
            <View style={styles.buttonContent}><Feather name="eye" size={17} color={COLORS.BRAND_BLUE} /><Text style={styles.previewButtonText}>Preview</Text></View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.publishButton, loading && styles.publishButtonDisabled]}
            onPress={handlePublish}
            disabled={loading || autosaving}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <View style={styles.buttonContent}><Feather name="send" size={17} color="#FFFFFF" /><Text style={styles.publishButtonText}>{editingArticleId ? 'Submit for Review' : 'Publish'}</Text></View>
            )}
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
      </KeyboardAvoidingView>

      {/* ── CATEGORY PICKER MODAL ── */}
      <Modal
        visible={showCategoryPicker}
        animationType="slide"
        transparent={true}
      >
        <SafeAreaView style={styles.pickerModal}>
          <View style={styles.pickerHeader}>
            <TouchableOpacity
              onPress={() => setShowCategoryPicker(false)}
            >
              <Text style={styles.pickerClose}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.pickerTitle}>Select Category</Text>
            <View style={{ width: 50 }} />
          </View>

          <ScrollView style={styles.pickerContent}>
            {Array.isArray(categories) &&
              categories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.pickerOption,
                    selectedCategory?.id === cat.id && styles.pickerOptionActive,
                  ]}
                  onPress={() => {
                    setSelectedCategory(cat);
                    setShowCategoryPicker(false);
                  }}
                >
                  <Feather name={getCategoryIcon(cat.icon_name)} size={19} color={COLORS.BRAND_BLUE} />
                  <View style={styles.pickerOptionText}>
                    <Text style={styles.pickerOptionName}>{cat.name}</Text>
                    <Text style={styles.pickerOptionDesc}>{cat.description}</Text>
                  </View>
                </TouchableOpacity>
              ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ── PREVIEW MODAL ── */}
      <Modal
        visible={showPreview}
        animationType="slide"
        transparent={false}
      >
        <SafeAreaView style={styles.previewModal}>
          <View style={styles.previewHeader}>
            <TouchableOpacity
              onPress={() => setShowPreview(false)}
            >
              <Text style={styles.previewClose}>✕ Close</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.previewContent}>
            {selectedCategory?.name && (
              <View style={styles.previewCategory}>
                <Text style={styles.previewCategoryText}>
                  {selectedCategory.name}
                </Text>
              </View>
            )}

            <Text style={styles.previewTitle}>{title}</Text>

            {readingTimeEstimate && (
              <View style={styles.previewMeta}>
                <Text style={styles.previewMetaText}>
                  📖 {readingTimeEstimate} min read
                </Text>
              </View>
            )}

            <Text style={styles.previewSummary}>{summary}</Text>

            <Text style={styles.previewBody}>{body}</Text>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.BACKGROUND,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: THEME.PALE_BLUE,
    borderBottomWidth: 1,
    borderBottomColor: THEME.BORDER_LIGHT,
  },
  headerBack: {
    color: THEME.TEXT_PRIMARY,
    fontSize: 14,
    fontWeight: '700',
  },
  headerTitle: {
    fontFamily: FONT_DISPLAY,
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '800',
    color: THEME.TEXT_PRIMARY,
  },
  autoSaveMessage: {
    fontSize: 11,
    color: THEME.SUCCESS_GREEN,
    fontWeight: '700',
    position: 'absolute',
    right: 20,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 22,
  },

  // ── FORM ──
  formGroup: {
    marginBottom: 22,
  },
  label: {
    fontSize: 13,
    fontWeight: '800',
    color: THEME.TEXT_PRIMARY,
    marginBottom: 9,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  optionalLabel: { color: THEME.TEXT_MUTED, fontSize: 10, letterSpacing: 0.8 },
  imageHelp: { color: COLORS.TEXT_SECONDARY, fontSize: 13, marginTop: -3, marginBottom: 10 },
  featuredPreview: { width: '100%', height: 180, borderRadius: 14, marginBottom: 10, backgroundColor: COLORS.INPUT_BG },
  imagePickerButton: { minHeight: 46, borderRadius: 12, borderWidth: 1, borderColor: COLORS.BORDER, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, marginBottom: 10 },
  imagePickerText: { color: COLORS.BRAND_GREEN, fontSize: 14, fontWeight: '700' },
  characterCount: {
    fontSize: 11,
    color: THEME.TEXT_MUTED,
    fontWeight: '500',
    textTransform: 'none',
  },
  errorLabel: {
    fontSize: 12,
    color: THEME.ERROR_RED,
    marginBottom: 8,
    fontWeight: '600',
  },
  revisionHelp: { color: THEME.TEXT_SECONDARY, fontSize: 13, lineHeight: 19, marginTop: -2, marginBottom: 9 },
  input: {
    backgroundColor: THEME.INPUT_BG,
    borderWidth: 1,
    borderColor: THEME.BORDER,
    borderRadius: 8,
    paddingHorizontal: 13,
    paddingVertical: 12,
    fontSize: 15,
    color: THEME.TEXT_PRIMARY,
  },
  inputError: {
    borderColor: THEME.ERROR_RED,
    backgroundColor: THEME.ERROR_LIGHT,
  },
  textareaInput: {
    backgroundColor: THEME.INPUT_BG,
    borderWidth: 1,
    borderColor: THEME.BORDER,
    borderRadius: 8,
    paddingHorizontal: 13,
    paddingVertical: 12,
    fontSize: 15,
    color: THEME.TEXT_PRIMARY,
    textAlignVertical: 'top',
    minHeight: 110,
  },
  bodyInput: {
    backgroundColor: THEME.INPUT_BG,
    borderWidth: 1,
    borderColor: THEME.BORDER,
    borderRadius: 8,
    paddingHorizontal: 13,
    paddingVertical: 14,
    fontSize: 15,
    color: THEME.TEXT_PRIMARY,
    textAlignVertical: 'top',
    minHeight: 260,
    lineHeight: 24,
  },
  readingTimeBox: {
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: THEME.SURFACE_ALT,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME.BORDER,
  },
  readingTimeLabel: {
    fontSize: 12,
    color: THEME.TEXT_SECONDARY,
    fontWeight: '600',
  },

  // ── CATEGORY ──
  categoryButton: {
    backgroundColor: THEME.INPUT_BG,
    borderWidth: 1,
    borderColor: THEME.BORDER,
    borderRadius: 8,
    paddingHorizontal: 13,
    paddingVertical: 13,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 54,
  },
  categoryButtonText: {
    fontSize: 15,
    color: THEME.TEXT_PRIMARY,
    fontWeight: '600',
  },
  categoryButtonPlaceholder: {
    color: THEME.TEXT_MUTED,
    fontWeight: '400',
  },

  // ── BUTTONS ──
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
    marginTop: 8,
  },
  buttonContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  previewButton: {
    flex: 1,
    backgroundColor: THEME.SURFACE_ALT,
    borderWidth: 1.5,
    borderColor: THEME.BORDER,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  previewButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: THEME.TEXT_PRIMARY,
  },
  publishButton: {
    flex: 1,
    backgroundColor: THEME.BRAND_BLUE,
    borderRadius: 4,
    paddingVertical: 16,
    alignItems: 'center',
  },
  publishButtonDisabled: {
    opacity: 0.65,
  },
  publishButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // ── SUCCESS ──
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  successTitle: {
    fontFamily: FONT_DISPLAY,
    fontSize: 26,
    fontWeight: '900',
    color: THEME.TEXT_PRIMARY,
    marginBottom: 12,
    letterSpacing: 0,
  },
  successText: {
    fontSize: 15,
    color: THEME.TEXT_SECONDARY,
    textAlign: 'center',
    lineHeight: 23,
    marginBottom: 32,
  },
  successButton: {
    backgroundColor: THEME.BRAND_GREEN,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 14,
  },
  successButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 16,
  },

  // ── MODALS ──
  pickerModal: {
    flex: 1,
    backgroundColor: THEME.BACKGROUND,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: THEME.PALE_BLUE,
    borderBottomWidth: 1,
    borderBottomColor: THEME.BORDER_LIGHT,
  },
  pickerClose: {
    color: THEME.TEXT_PRIMARY,
    fontSize: 15,
    fontWeight: '700',
  },
  pickerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: THEME.TEXT_PRIMARY,
  },
  pickerContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: THEME.SURFACE_ALT,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: THEME.BORDER,
    gap: 14,
  },
  pickerOptionActive: {
    backgroundColor: THEME.PALE_GREEN,
    borderColor: THEME.BRAND_DARK,
    borderWidth: 1.5,
  },
  pickerOptionText: {
    flex: 1,
  },
  pickerOptionName: {
    fontSize: 15,
    fontWeight: '800',
    color: THEME.TEXT_PRIMARY,
    marginBottom: 3,
  },
  pickerOptionDesc: {
    fontSize: 12,
    color: THEME.TEXT_MUTED,
    lineHeight: 17,
  },

  previewModal: {
    flex: 1,
    backgroundColor: THEME.SURFACE_ALT,
  },
  previewHeader: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: THEME.BORDER,
  },
  previewClose: {
    color: THEME.BRAND_DARK,
    fontSize: 15,
    fontWeight: '700',
  },
  previewContent: {
    flex: 1,
    paddingHorizontal: 22,
    paddingVertical: 24,
  },
  previewCategory: {
    marginBottom: 12,
  },
  previewCategoryText: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.BRAND_DARK,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  previewTitle: {
    fontFamily: FONT_DISPLAY,
    fontSize: 26,
    fontWeight: '900',
    color: THEME.TEXT_PRIMARY,
    lineHeight: 34,
    marginBottom: 14,
    letterSpacing: 0,
  },
  previewMeta: {
    marginBottom: 16,
  },
  previewMetaText: {
    fontSize: 13,
    color: THEME.TEXT_TERTIARY,
    fontWeight: '600',
  },
  previewSummary: {
    fontSize: 16,
    fontWeight: '600',
    color: THEME.TEXT_SECONDARY,
    lineHeight: 25,
    marginBottom: 22,
  },
  previewBody: {
    fontSize: 16,
    lineHeight: 27,
    color: THEME.TEXT_SECONDARY,
  },
});

export default ArticlePublishScreen;
