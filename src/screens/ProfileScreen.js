/**
 * ProfileScreen — "Account"
 * Redesign notes:
 *  - Same design system as SavedArticlesScreen (deep ink + credential gold)
 *    so the two screens read as one cohesive app rather than two different
 *    products stitched together.
 *  - The user card is redesigned as a "credential card": a subtle gold
 *    ring around the avatar for verified experts, and a real status
 *    strip (verified / pending / not applied) instead of a bare badge —
 *    this is the signature element for this screen, since the whole
 *    premise of IN4 is verified expertise, so the profile should look
 *    and feel like an ID card, not a generic settings avatar block.
 *  - Reading-list count surfaced directly on the profile (pulled from
 *    the same `getSavedCount` endpoint used on the Reading List screen)
 *    so the account screen feels like a personal dashboard, not just a
 *    settings menu — gives people a reason to open it besides logging out.
 *  - Expert stats (profession, badge tier, expertise areas) shown for
 *    verified experts, pulled from data already returned by
 *    `expertAPI.getMyProfile()` but previously unused beyond the
 *    verified-badge check.
 *
 * Bug fix:
 *  - Edit Profile fields (`editFirstName`/`editLastName`) were initialized
 *    from `user` only once, at the component's first render
 *    (`useState(user?.first_name || '')`). If `user` loads or changes
 *    asynchronously after mount (e.g. AuthContext resolves the profile
 *    fetch after this screen is already showing), the edit modal would
 *    open with stale or blank fields. Added a useEffect that re-syncs
 *    the edit fields whenever the modal opens or `user` changes.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Text, TouchableOpacity, Alert, Modal, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, Image } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { RefreshControl } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { authAPI, expertAPI, engagementAPI, resolveMediaUrl } from '../api/client';
import { FONT_DISPLAY } from '../theme/typography';
import { COLORS as THEME } from '../theme/colors';

// ── DESIGN TOKENS (shared with SavedArticlesScreen) ──
const COLORS = {
  INK: '#F2F7FC',
  SURFACE: '#FFFFFF',
  SURFACE_RAISED: '#E9F2FA',
  BORDER: '#D4E2EF',
  GOLD: '#286A9A',
  GOLD_DIM: '#E5F1FA',
  TEAL: '#287B93',
  TEAL_DIM: '#E5F3F7',
  CORAL: THEME.ERROR_RED,
  AMBER: THEME.WARNING,
  TEXT_PRIMARY: '#173B59',
  TEXT_SECONDARY: '#526F86',
  TEXT_MUTED: '#71889B',
};

const ProfileScreen = ({ navigation }) => {
  const { user, logout, updateUser } = useAuth();
  const [expert, setExpert] = useState(null);
  const [savedCount, setSavedCount] = useState(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [editingExpertProfile, setEditingExpertProfile] = useState(false);
  const [editFirstName, setEditFirstName] = useState(user?.first_name || '');
  const [editLastName, setEditLastName] = useState(user?.last_name || '');
  const [expertForm, setExpertForm] = useState({
    bio: '', expertise_areas: '', organization: '', location: '', languages: '', consultation_methods: '',
  });
  const [profileImagePreview, setProfileImagePreview] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [loadingExpert, setLoadingExpert] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [updatingExpertProfile, setUpdatingExpertProfile] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const loadExpertProfile = useCallback(async () => {
    try {
      const response = await expertAPI.getMyProfile();
      setExpert(response.expert);
    } catch (err) {
      if (err.response?.status === 404) setExpert(null);
      else console.error('Failed to load expert profile', err);
    } finally {
      setLoadingExpert(false);
      setRefreshing(false);
    }
  }, []);

  const loadSavedCount = useCallback(async () => {
    try {
      const response = await engagementAPI.getSavedCount();
      setSavedCount(response.saved_count);
    } catch (err) {
      console.error('Failed to load saved count', err);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    setLoadingExpert(true);
    loadExpertProfile();
    loadSavedCount();
  }, [loadExpertProfile, loadSavedCount]));

  // FIX: keep the edit form in sync with `user` — previously the fields
  // were only seeded once at mount, so if `user` arrived or changed after
  // that, opening "Edit Profile" could show stale/blank values.
  useEffect(() => {
    if (editingProfile) {
      setEditFirstName(user?.first_name || '');
      setEditLastName(user?.last_name || '');
      setProfileImagePreview(user?.profile_image || null);
    }
  }, [editingProfile, user?.first_name, user?.last_name]);

  useEffect(() => {
    if (editingExpertProfile && expert) {
      setExpertForm({
        bio: expert.bio || '',
        expertise_areas: expert.expertise_areas || '',
        organization: expert.organization || '',
        location: expert.location || '',
        languages: expert.languages || '',
        consultation_methods: expert.consultation_methods || '',
      });
    }
  }, [editingExpertProfile, expert]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadExpertProfile();
    loadSavedCount();
  }, [loadExpertProfile, loadSavedCount]);

  const handleUpdateProfile = useCallback(async () => {
    if (!editFirstName.trim() || !editLastName.trim()) { Alert.alert('Error', 'Name fields cannot be empty'); return; }
    setUpdatingProfile(true);
    try {
      const response = await authAPI.updateProfile(editFirstName.trim(), editLastName.trim());
      updateUser(response.user);
      setEditingProfile(false);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to update profile');
    } finally {
      setUpdatingProfile(false);
    }
  }, [editFirstName, editLastName, updateUser]);

  const handleUpdateExpertProfile = useCallback(async () => {
    setUpdatingExpertProfile(true);
    try {
      const profile = Object.fromEntries(
        Object.entries(expertForm).map(([key, value]) => [key, value.trim() || null])
      );
      const response = await expertAPI.updateMyProfile(profile);
      setExpert(response.expert);
      setEditingExpertProfile(false);
      Alert.alert('Profile updated', 'Your expert profile details have been saved.');
    } catch (err) {
      Alert.alert('Could not update expert profile', err.response?.data?.detail || err.response?.data?.message || 'Please try again.');
    } finally {
      setUpdatingExpertProfile(false);
    }
  }, [expertForm]);

  const handleChooseProfileImage = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/jpeg', 'image/png', 'image/webp'],
        multiple: false,
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) return;
      setUploadingPhoto(true);
      const response = await authAPI.uploadProfileImage(result.assets[0]);
      setProfileImagePreview(response.profile_image);
      updateUser({ profile_image: response.profile_image });
    } catch (err) {
      Alert.alert('Photo upload failed', err.response?.data?.message || 'Choose a JPEG, PNG, or WebP image under 10 MB.');
    } finally {
      setUploadingPhoto(false);
    }
  }, [updateUser]);

  const handleRemoveProfileImage = useCallback(async () => {
    try {
      setUploadingPhoto(true);
      await authAPI.removeProfileImage();
      setProfileImagePreview(null);
      updateUser({ profile_image: null });
    } catch (err) {
      Alert.alert('Could not remove photo', err.response?.data?.message || 'Please try again.');
    } finally {
      setUploadingPhoto(false);
    }
  }, [updateUser]);

  const handleLogout = useCallback(async () => {
    Alert.alert('Sign out of IN4?', 'Your session will end on this device and you will need to sign in again. Your saved articles and drafts remain in your account.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: async () => {
          setLoggingOut(true);
          try {
            const result = await logout();
            if (!result.success) Alert.alert('Error', 'Failed to logout');
          } catch (err) {
            Alert.alert('Error', 'An unexpected error occurred');
          } finally {
            setLoggingOut(false);
          }
        }
      }
    ]);
  }, [logout]);

  const MenuItem = ({ icon, label, onPress, showArrow = true, color = COLORS.TEXT_PRIMARY }) => (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <View style={styles.menuItemLeft}>
        <View style={styles.menuIconContainer}>
          <Ionicons name={icon} size={20} color={color} />
        </View>
        <Text style={[styles.menuItemText, { color }]}>{label}</Text>
      </View>
      {showArrow && <Ionicons name="chevron-forward" size={20} color={COLORS.TEXT_MUTED} />}
    </TouchableOpacity>
  );

  const isVerified = Boolean(expert && (
    user?.is_provider || expert.is_verified || expert.status === 'verified'
  ));
  const isPending = !isVerified && expert?.status === 'pending';
  const isRejected = !isVerified && expert?.status === 'rejected';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerEyebrow}>YOUR SPACE</Text>
        <Text style={styles.headerTitle}>Account</Text>
        <Text style={styles.headerSubtitle}>Your reading, expertise, and settings in one place.</Text>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.GOLD}
            colors={[COLORS.GOLD]}
          />
        }
      >
        {/* ── CREDENTIAL CARD ── */}
        <View style={styles.credentialCard}>
          <View style={styles.credentialTopRow}>
            <View style={[styles.avatar, isVerified && styles.avatarVerifiedRing]}>
              {user?.profile_image ? <Image source={{ uri: resolveMediaUrl(user.profile_image) }} style={styles.avatarImage} /> :
                <Text style={styles.avatarText}>{user?.first_name?.charAt(0).toUpperCase() || 'U'}</Text>}
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{user?.first_name} {user?.last_name}</Text>
              <Text style={styles.userEmail}>{user?.email}</Text>
            </View>
          </View>

          {/* Status strip — the one thing every visitor should read first */}
          {isVerified && (
            <View style={[styles.statusStrip, { backgroundColor: COLORS.TEAL_DIM }]}>
              <Ionicons name="shield-checkmark" size={16} color={COLORS.TEAL} />
              <Text style={[styles.statusStripText, { color: COLORS.TEAL }]}>
                Verified {expert?.profession ? `· ${expert.profession}` : 'Expert'}
              </Text>
            </View>
          )}
          {isPending && (
            <View style={[styles.statusStrip, { backgroundColor: COLORS.GOLD_DIM }]}>
              <Ionicons name="time" size={16} color={COLORS.AMBER} />
              <Text style={[styles.statusStripText, { color: COLORS.AMBER }]}>Application under review</Text>
            </View>
          )}
          {isRejected && (
            <View style={[styles.statusStrip, { backgroundColor: '#FDECEA' }]}>
              <Ionicons name="alert-circle" size={16} color={COLORS.CORAL} />
              <Text style={[styles.statusStripText, { color: COLORS.CORAL }]}>Application requires follow-up</Text>
            </View>
          )}
          {!expert && (
            <View style={[styles.statusStrip, { backgroundColor: COLORS.SURFACE_RAISED }]}>
              <Ionicons name="person-outline" size={16} color={COLORS.TEXT_SECONDARY} />
              <Text style={[styles.statusStripText, { color: COLORS.TEXT_SECONDARY }]}>Reader account</Text>
            </View>
          )}

          <TouchableOpacity style={styles.editProfileAction} onPress={() => setEditingProfile(true)} activeOpacity={0.8}>
            <Ionicons name="create-outline" size={16} color="#FFFFFF" />
            <Text style={styles.editProfileActionText}>Edit profile</Text>
            <Ionicons name="arrow-forward" size={15} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Quick stats — turns the account screen into a mini dashboard */}
          <View style={styles.statsRow}>
            <TouchableOpacity
              style={styles.statTile}
              onPress={() => navigation.navigate('SavedArticles')}
              activeOpacity={0.75}
            >
              <Text style={styles.statTileValue}>{savedCount ?? '—'}</Text>
              <Text style={styles.statTileLabel}>Saved</Text>
            </TouchableOpacity>
            {isVerified && expert?.expertise_areas ? (
              <View style={styles.statTile}>
                <Text style={styles.statTileValue} numberOfLines={1}>{expert.badge_tier || '—'}</Text>
                <Text style={styles.statTileLabel}>Badge tier</Text>
              </View>
            ) : (
              <View style={styles.statTile}>
              <Text style={styles.statTileValue}>{expert ? '1' : '0'}</Text>
                <Text style={styles.statTileLabel}>Applications</Text>
              </View>
            )}
          </View>
        </View>

        {/* Menu Sections */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>EXPERT HUB</Text>
          <View style={styles.cardGroup}>
            {isVerified ? (
              <>
                <MenuItem icon="person-outline" label="Edit expert profile" onPress={() => setEditingExpertProfile(true)} color={COLORS.GOLD} />
                <View style={styles.divider} />
                <MenuItem icon="create-outline" label="Create New Article" onPress={() => navigation.navigate('ArticlePublish')} color={COLORS.GOLD} />
                <View style={styles.divider} />
                <MenuItem icon="documents-outline" label="My Drafts" onPress={() => navigation.navigate('ArticleLibrary', { section: 'drafts' })} />
                <View style={styles.divider} />
                <MenuItem icon="git-branch-outline" label="My Article Edits" onPress={() => navigation.navigate('ArticleLibrary', { section: 'revisions' })} />
                <View style={styles.divider} />
                <MenuItem icon="person-circle-outline" label="View Public Profile" onPress={() => navigation.navigate('ExpertProfile', { slug: expert.slug })} />
              </>
            ) : !expert ? (
              <MenuItem icon="star-outline" label="Apply as Verified Expert" onPress={() => navigation.navigate('ExpertApply')} color={COLORS.GOLD} />
            ) : isRejected ? (
              <View style={styles.pendingBox}>
                <Ionicons name="alert-circle-outline" size={24} color={COLORS.CORAL} />
                <Text style={styles.pendingText}>Your application needs an update. Contact IN4 support for next steps.</Text>
              </View>
            ) : (
              <View style={styles.pendingBox}>
                <Ionicons name="time-outline" size={24} color={COLORS.AMBER} />
                <Text style={styles.pendingText}>Your expert application is under review. We'll notify you within 48 hours.</Text>
              </View>
            )}
          </View>
        </View>

        {user?.is_staff && <View style={styles.section}>
          <Text style={styles.sectionLabel}>REVIEW WORK</Text>
          <View style={styles.cardGroup}>
            <MenuItem icon="checkmark-done-outline" label="Article Edit Review Queue" onPress={() => navigation.navigate('ArticleReviewQueue')} color={COLORS.GOLD} />
          </View>
        </View>}

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>READING</Text>
          <View style={styles.cardGroup}>
            <MenuItem icon="bookmark-outline" label={`Saved articles${savedCount !== null ? ` (${savedCount})` : ''}`} onPress={() => navigation.navigate('SavedArticles')} color={COLORS.GOLD} />
            <View style={styles.divider} />
            <MenuItem icon="time-outline" label="Reading History" onPress={() => navigation.navigate('ArticleLibrary', { section: 'history' })} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>COMMUNITY</Text>
          <View style={styles.cardGroup}>
            <MenuItem icon="chatbubbles-outline" label="Messages" onPress={() => navigation.navigate('ConversationInbox')} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>SETTINGS</Text>
          <View style={styles.cardGroup}>
            <MenuItem icon="lock-closed-outline" label="Change Password" onPress={() => navigation.navigate('ChangePassword')} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>SYSTEM</Text>
          <View style={styles.cardGroup}>
            <View style={[styles.menuItem, { paddingVertical: 16 }]}>
              <View style={styles.menuItemLeft}>
                <View style={styles.menuIconContainer}><Ionicons name="information-circle-outline" size={20} color={COLORS.TEXT_PRIMARY} /></View>
                <Text style={styles.menuItemText}>App Version</Text>
              </View>
              <Text style={styles.versionText}>1.0.0</Text>
            </View>
            <View style={styles.divider} />
            <TouchableOpacity style={styles.menuItem} onPress={handleLogout} disabled={loggingOut}>
              <View style={styles.menuItemLeft}>
                <View style={styles.menuIconContainer}><Ionicons name="log-out-outline" size={20} color={COLORS.CORAL} /></View>
                <Text style={[styles.menuItemText, { color: COLORS.CORAL }]}>Sign Out</Text>
              </View>
              {loggingOut && <ActivityIndicator color={COLORS.CORAL} size="small" />}
            </TouchableOpacity>
          </View>
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal visible={editingProfile} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView style={{ flex: 1, justifyContent: 'flex-end' }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setEditingProfile(false)} disabled={updatingProfile}>
                <Ionicons name="close-circle" size={28} color={COLORS.TEXT_MUTED} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ paddingBottom: 24 }} keyboardShouldPersistTaps="always" keyboardDismissMode="none">
              <View style={styles.photoEditor}>
                <View style={[styles.editAvatar, isVerified && styles.avatarVerifiedRing]}>
                  {profileImagePreview ? <Image source={{ uri: resolveMediaUrl(profileImagePreview) }} style={styles.editAvatarImage} /> :
                    <Text style={styles.avatarText}>{editFirstName?.charAt(0).toUpperCase() || 'U'}</Text>}
                  {uploadingPhoto && <View style={styles.photoBusy}><ActivityIndicator color="#FFFFFF" /></View>}
                </View>
                <View style={styles.photoActions}>
                  <Text style={styles.photoTitle}>Profile photo</Text>
                  <Text style={styles.photoHint}>Use a clear, professional image.</Text>
                  <View style={styles.photoActionRow}>
                    <TouchableOpacity onPress={handleChooseProfileImage} disabled={uploadingPhoto} style={styles.photoButton}>
                      <Ionicons name="camera-outline" size={16} color={COLORS.TEAL} />
                      <Text style={styles.photoButtonText}>{profileImagePreview ? 'Change photo' : 'Add photo'}</Text>
                    </TouchableOpacity>
                    {profileImagePreview && <TouchableOpacity onPress={handleRemoveProfileImage} disabled={uploadingPhoto} style={styles.removePhotoButton}>
                      <Text style={styles.removePhotoText}>Remove</Text>
                    </TouchableOpacity>}
                  </View>
                </View>
              </View>
              <Text style={styles.inputLabel}>First Name</Text>
              <TextInput style={styles.input} value={editFirstName} onChangeText={setEditFirstName} placeholderTextColor={COLORS.TEXT_MUTED} editable={!updatingProfile} />
              <Text style={[styles.inputLabel, { marginTop: 16 }]}>Last Name</Text>
              <TextInput style={styles.input} value={editLastName} onChangeText={setEditLastName} placeholderTextColor={COLORS.TEXT_MUTED} editable={!updatingProfile} />
              <TouchableOpacity style={styles.primaryButton} onPress={handleUpdateProfile} disabled={updatingProfile}>
                {updatingProfile ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>Save Changes</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <Modal visible={editingExpertProfile} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView style={{ flex: 1, justifyContent: 'flex-end' }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <View style={styles.modalSheet}>
              <View style={styles.modalHeader}>
                <View style={styles.expertModalHeading}>
                  <Text style={styles.modalTitle}>Edit expert profile</Text>
                  <Text style={styles.expertModalSubtitle}>Update the details readers see on your public profile.</Text>
                </View>
                <TouchableOpacity onPress={() => setEditingExpertProfile(false)} disabled={updatingExpertProfile}>
                  <Ionicons name="close-circle" size={28} color={COLORS.TEXT_MUTED} />
                </TouchableOpacity>
              </View>
              <ScrollView contentContainerStyle={{ paddingBottom: 24 }} keyboardShouldPersistTaps="always" showsVerticalScrollIndicator={false}>
                <Text style={styles.readOnlyCredential}>{expert?.profession} · Verified profession</Text>
                {[
                  ['bio', 'Professional bio', 'Introduce your background and approach.', 1000],
                  ['expertise_areas', 'Areas of expertise', 'List your specialist areas.', 1000],
                  ['organization', 'Organization', 'Clinic, company, institution, or practice.', 200],
                  ['location', 'Location', 'City or region.', 160],
                  ['languages', 'Languages', 'Languages you can work in.', 255],
                  ['consultation_methods', 'Consultation methods', 'For example: in person, phone, or online.', 255],
                ].map(([field, label, placeholder, maxLength]) => (
                  <View key={field} style={styles.expertFieldGroup}>
                    <Text style={styles.inputLabel}>{label}</Text>
                    <TextInput
                      style={[styles.input, (field === 'bio' || field === 'expertise_areas') && styles.multilineInput]}
                      value={expertForm[field]}
                      onChangeText={(value) => setExpertForm((current) => ({ ...current, [field]: value }))}
                      placeholder={placeholder}
                      placeholderTextColor={COLORS.TEXT_MUTED}
                      maxLength={maxLength}
                      multiline={field === 'bio' || field === 'expertise_areas'}
                      textAlignVertical={field === 'bio' || field === 'expertise_areas' ? 'top' : 'center'}
                      editable={!updatingExpertProfile}
                    />
                  </View>
                ))}
                <TouchableOpacity style={styles.primaryButton} onPress={handleUpdateExpertProfile} disabled={updatingExpertProfile}>
                  {updatingExpertProfile ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>Save expert profile</Text>}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.INK },
  header: { paddingHorizontal: 24, paddingTop: 22, paddingBottom: 22, backgroundColor: '#173B59' },
  headerEyebrow: { color: '#9ED8E8', fontSize: 10, fontWeight: '900', letterSpacing: 1.5, marginBottom: 3 },
  headerTitle: { fontFamily: FONT_DISPLAY, fontSize: 32, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5 },
  headerSubtitle: { color: '#D2E1ED', fontSize: 13, marginTop: 4, lineHeight: 19 },
  content: { flex: 1 },

  // ── CREDENTIAL CARD ──
  credentialCard: {
    backgroundColor: 'transparent',
    marginHorizontal: 24,
    marginTop: 18,
    marginBottom: 26,
    paddingVertical: 20,
    paddingHorizontal: 0,
    borderRadius: 0,
    borderBottomWidth: 1,
    borderColor: COLORS.BORDER,
  },
  credentialTopRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: COLORS.SURFACE_RAISED,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 18,
    borderWidth: 2,
    borderColor: COLORS.BORDER,
  },
  avatarVerifiedRing: { borderColor: COLORS.TEAL, borderWidth: 2.5 },
  avatarImage: { width: '100%', height: '100%', borderRadius: 34 },
  editAvatar: { width: 88, height: 88, borderRadius: 44, backgroundColor: COLORS.SURFACE_RAISED, justifyContent: 'center', alignItems: 'center', overflow: 'hidden', borderWidth: 2, borderColor: COLORS.BORDER },
  editAvatarImage: { width: '100%', height: '100%', borderRadius: 44 },
  photoEditor: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 24 },
  photoActions: { flex: 1 },
  photoTitle: { color: COLORS.TEXT_PRIMARY, fontSize: 15, fontWeight: '800' },
  photoHint: { color: COLORS.TEXT_SECONDARY, fontSize: 12, marginTop: 4 },
  photoActionRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 10 },
  photoButton: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  photoButtonText: { color: COLORS.TEAL, fontWeight: '800', fontSize: 13 },
  removePhotoButton: { paddingVertical: 4 },
  removePhotoText: { color: COLORS.CORAL, fontWeight: '700', fontSize: 13 },
  photoBusy: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 26, fontWeight: '900', color: '#FFFFFF' },
  userInfo: { flex: 1 },
  userName: { fontFamily: FONT_DISPLAY, fontSize: 21, fontWeight: '700', color: COLORS.TEXT_PRIMARY, marginBottom: 4 },
  userEmail: { fontSize: 13, color: COLORS.TEXT_SECONDARY },

  statusStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 16,
  },
  statusStripText: { fontSize: 13, fontWeight: '700' },
  editProfileAction: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 13, paddingVertical: 9, marginBottom: 16, borderRadius: 12, backgroundColor: COLORS.GOLD },
  editProfileActionText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },

  statsRow: { flexDirection: 'row', gap: 12 },
  statTile: {
    flex: 1,
    backgroundColor: 'transparent',
    borderRadius: 0,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: COLORS.BORDER,
  },
  statTileValue: { fontSize: 19, fontWeight: '900', color: COLORS.TEXT_PRIMARY, marginBottom: 3, textTransform: 'capitalize' },
  statTileLabel: { fontSize: 11, fontWeight: '700', color: COLORS.TEXT_SECONDARY, textTransform: 'uppercase', letterSpacing: 0.7 },

  section: { marginBottom: 26, paddingHorizontal: 24 },
  sectionLabel: { fontSize: 11, fontWeight: '800', color: COLORS.TEXT_MUTED, marginBottom: 10, marginLeft: 4, letterSpacing: 1.2, textTransform: 'uppercase' },
  cardGroup: {
    backgroundColor: 'transparent',
    overflow: 'hidden',
    borderRadius: 0,
    borderWidth: 0,
  },
  menuItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 16 },
  menuItemLeft: { flexDirection: 'row', alignItems: 'center' },
  menuIconContainer: { width: 36, height: 36, borderRadius: 10, backgroundColor: COLORS.SURFACE_RAISED, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  menuItemText: { fontSize: 15, fontWeight: '600', color: COLORS.TEXT_PRIMARY },
  divider: { height: 1, backgroundColor: COLORS.BORDER, marginLeft: 68 },
  versionText: { fontSize: 14, color: COLORS.TEXT_MUTED, fontWeight: '600' },

  pendingBox: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18 },
  pendingText: { flex: 1, fontSize: 14, color: COLORS.TEXT_PRIMARY, lineHeight: 21 },

  modalOverlay: { flex: 1, backgroundColor: THEME.OVERLAY, justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: COLORS.SURFACE,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 26,
    borderTopWidth: 1,
    borderColor: COLORS.BORDER,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 21, fontWeight: '800', color: COLORS.TEXT_PRIMARY },
  expertModalHeading: { flex: 1, paddingRight: 12 },
  expertModalSubtitle: { color: COLORS.TEXT_SECONDARY, fontSize: 13, lineHeight: 19, marginTop: 5 },
  readOnlyCredential: { color: COLORS.TEXT_SECONDARY, fontSize: 13, backgroundColor: COLORS.SURFACE_RAISED, padding: 12, borderRadius: 10, marginBottom: 18 },
  expertFieldGroup: { marginBottom: 16 },
  inputLabel: { fontSize: 14, fontWeight: '700', color: COLORS.TEXT_PRIMARY, marginBottom: 8 },
  input: {
    backgroundColor: COLORS.SURFACE_RAISED,
    borderWidth: 1.5,
    borderColor: COLORS.BORDER,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: COLORS.TEXT_PRIMARY,
    fontSize: 16,
  },
  multilineInput: { minHeight: 100, paddingTop: 12 },
  primaryButton: { backgroundColor: COLORS.GOLD, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 32, marginBottom: 20 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
});

export default ProfileScreen;
