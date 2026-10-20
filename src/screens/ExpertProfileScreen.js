import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  StatusBar,
  RefreshControl,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { communityAPI, expertAPI, resolveMediaUrl } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { getVerificationBadge } from '../theme/verificationBadges';
import { FONT_DISPLAY } from '../theme/typography';
import { COLORS as THEME } from '../theme/colors';

const COLORS = {
  BACKGROUND: THEME.BACKGROUND,
  SURFACE: THEME.SURFACE,
  PRIMARY: THEME.BRAND_BLUE,
  PRIMARY_LIGHT: THEME.BRAND_GREEN,
  ACCENT: THEME.BRAND_GREEN,
  TEXT_MAIN: THEME.TEXT_PRIMARY,
  TEXT_MUTED: THEME.TEXT_SECONDARY,
  TEXT_SUBTLE: THEME.TEXT_TERTIARY,
  BORDER: THEME.BORDER,
  SUCCESS: THEME.SUCCESS_GREEN,
  DANGER: THEME.ERROR_RED,
};

const ExpertProfileScreen = ({ route, navigation }) => {
  const [expert, setExpert] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [vouching, setVouching] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentEligibility, setCommentEligibility] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [loadingComments, setLoadingComments] = useState(true);
  const [sendingComment, setSendingComment] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState(null);
  const slug = route.params?.slug;
  const badgeColors = getVerificationBadge(expert?.badge_tier);
  const { user } = useAuth();
  const scrollViewRef = useRef(null);

  const loadExpert = useCallback(async () => {
    if (!slug) {
      setError('Expert not found');
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      const response = await expertAPI.getExpertProfile(slug);
      setExpert(response);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load expert profile');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [slug]);

  const loadProfileComments = useCallback(async () => {
    if (!slug) return;
    setLoadingComments(true);
    const commentsRequest = communityAPI.listExpertComments(slug);
    const eligibilityRequest = user?.id
      ? communityAPI.getExpertCommentEligibility(slug)
      : Promise.resolve(null);
    const [commentsResult, eligibilityResult] = await Promise.allSettled([commentsRequest, eligibilityRequest]);
    if (commentsResult.status === 'fulfilled') {
      setComments(commentsResult.value.results || []);
    } else {
      setComments([]);
    }
    setCommentEligibility(eligibilityResult.status === 'fulfilled' ? eligibilityResult.value : null);
    setLoadingComments(false);
  }, [slug, user?.id]);

  useEffect(() => {
    setLoading(true);
    loadExpert();
  }, [loadExpert]);

  useEffect(() => {
    loadProfileComments();
  }, [loadProfileComments]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadExpert();
    loadProfileComments();
  }, [loadExpert, loadProfileComments]);

  const handleArticlePress = useCallback((article) => {
    navigation.navigate('ArticleDetail', { slug: article.slug, article });
  }, [navigation]);

  const submitVouch = useCallback(async (relationshipType) => {
    setVouching(true);
    try {
      await expertAPI.vouchForExpert(expert.id, relationshipType);
      Alert.alert('Vouch recorded', 'Your connection is now shown as a supporting credibility signal.');
      loadExpert();
    } catch (e) {
      Alert.alert('Could not record vouch', e.response?.data?.message || 'Sign in and try again.');
    } finally {
      setVouching(false);
    }
  }, [expert, loadExpert]);

  const chooseVouch = useCallback(() => Alert.alert(
    'How do you know this professional?',
    'A vouch supports their profile but does not replace IN4 credential verification.',
    [
      { text: 'Classmate', onPress: () => submitVouch('Classmate') },
      { text: 'Course mate', onPress: () => submitVouch('Course mate') },
      { text: 'Colleague', onPress: () => submitVouch('Colleague') },
      { text: 'Cancel', style: 'cancel' },
    ],
  ), [submitVouch]);

  const submitProfileComment = useCallback(async () => {
    const content = commentText.trim();
    if (!content || !commentEligibility?.can_comment) return;
    setSendingComment(true);
    try {
      const comment = await communityAPI.addExpertComment(slug, content);
      setComments((current) => [comment, ...current]);
      setCommentText('');
      setCommentEligibility((current) => current ? { ...current, can_comment: false, already_commented: true } : current);
    } catch (err) {
      Alert.alert('Comment not posted', err.response?.data?.message || 'Please try again.');
    } finally {
      setSendingComment(false);
    }
  }, [commentEligibility, commentText, slug]);

  const removeProfileComment = useCallback((comment) => Alert.alert(
    'Remove this comment?',
    'This comment will be removed from the expert profile.',
    [
      { text: 'Keep comment', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        setDeletingCommentId(comment.id);
        try {
          await communityAPI.deleteExpertComment(comment.id);
          setComments((current) => current.filter((item) => item.id !== comment.id));
          if (comment.user_id === user?.id) {
            setCommentEligibility((current) => current ? {
              ...current,
              can_comment: current.read_article_count > 0 && !current.is_profile_owner,
              already_commented: false,
            } : current);
          }
        } catch (err) {
          Alert.alert('Comment not removed', err.response?.data?.message || 'Please try again.');
        } finally {
          setDeletingCommentId(null);
        }
      } },
    ],
  ), [user?.id]);

  const renderProfileComment = ({ item }) => (
    <View style={styles.profileComment}>
      <View style={styles.profileCommentAvatar}><Text style={styles.profileCommentInitial}>{item.author_name?.charAt(0)?.toUpperCase() || 'R'}</Text></View>
      <View style={styles.profileCommentCopy}>
        <View style={styles.profileCommentHeading}>
          <View style={{ flex: 1 }}>
            <Text style={styles.profileCommentAuthor}>{item.author_name}</Text>
            <Text style={styles.profileCommentDate}>{new Date(item.created_at).toLocaleDateString()}</Text>
          </View>
          {(item.user_id === user?.id || user?.is_staff || commentEligibility?.is_profile_owner) && (
            <TouchableOpacity onPress={() => removeProfileComment(item)} disabled={deletingCommentId === item.id} hitSlop={8} accessibilityLabel="Remove comment">
              {deletingCommentId === item.id ? <ActivityIndicator size="small" color={COLORS.DANGER} /> : <Feather name="trash-2" size={15} color={COLORS.TEXT_SUBTLE} />}
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.profileCommentText}>{item.content}</Text>
      </View>
    </View>
  );

  const renderArticleCard = ({ item }) => (
    <TouchableOpacity style={styles.articleCard} onPress={() => handleArticlePress(item)} activeOpacity={0.8}>
      <View style={styles.articleContent}>
        <Text style={styles.articleTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.articleSummary} numberOfLines={2}>{item.summary}</Text>
        <View style={styles.articleFooter}>
          <View style={styles.footerItem}>
            <Feather name="clock" size={14} color={COLORS.TEXT_MUTED} />
            <Text style={styles.footerText}>{item.reading_time} min read</Text>
          </View>
          <View style={styles.footerItem}>
            <Feather name="eye" size={14} color={COLORS.TEXT_MUTED} />
            <Text style={styles.footerText}>{item.view_count}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.PRIMARY} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !expert) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={COLORS.TEXT_MUTED} style={{ marginBottom: 16 }} />
          <Text style={styles.errorTitle}>Expert Not Found</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.goBack()}>
            <Text style={styles.primaryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={COLORS.TEXT_MAIN} />
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.PRIMARY}
            colors={[COLORS.PRIMARY]}
          />
        }
      >
        <Animated.View entering={FadeInDown.duration(350)} style={styles.profileHeader}>
          <View style={styles.expertLabel}>
            <Ionicons name="ribbon-outline" size={15} color={THEME.ACCENT_TEAL} />
            <Text style={styles.expertLabelText}>IN4 EXPERT</Text>
          </View>
          <View style={styles.avatarContainer}>
            {expert.profile_image ? <Image source={{ uri: resolveMediaUrl(expert.profile_image) }} style={styles.expertAvatarImage} /> :
              <Text style={styles.avatarText}>{expert.name?.charAt(0).toUpperCase() || 'E'}</Text>}
            <View style={[styles.verifiedBadge, { backgroundColor: badgeColors.color }]}>
              <Ionicons name="checkmark" size={12} color="#FFF" />
            </View>
          </View>

          <Text style={styles.expertName}>{expert.name}</Text>
          <Text style={styles.profession}>{expert.profession_display}</Text>
          
          {expert.organization && (
            <View style={styles.organizationContainer}>
              <Ionicons name="business-outline" size={16} color={COLORS.TEXT_MUTED} />
              <Text style={styles.organization}>{expert.organization}</Text>
            </View>
          )}
          {expert.location ? <Text style={styles.profileMeta}><Feather name="map-pin" size={14} color={THEME.ACCENT_TEAL} /> {expert.location}</Text> : null}
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(65).duration(350)} style={[styles.verificationCard, { backgroundColor: badgeColors.background, borderColor: badgeColors.border }]}>
          <View style={styles.verificationIcon}><Ionicons name="shield-checkmark" size={22} color={badgeColors.color} /></View>
          <View style={styles.verificationCopy}>
            <Text style={[styles.verificationTitle, { color: badgeColors.color }]}>Credentials reviewed by IN4</Text>
            <Text style={styles.verificationDetail}>{expert.badge_display || 'Verified professional'}{expert.verified_at ? ` · Verified ${new Date(expert.verified_at).getFullYear()}` : ''}</Text>
          </View>
          <Feather name="check-circle" size={20} color={badgeColors.color} />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(110).duration(350)} style={styles.infoSection}>
          {(expert.languages || expert.consultation_methods) ? <View style={styles.infoBlock}>
            <Text style={styles.sectionTitle}>Consultation details</Text>
            {expert.languages ? <Text style={styles.bodyText}>Languages: {expert.languages}</Text> : null}
            {expert.consultation_methods ? <Text style={styles.bodyText}>Available by: {expert.consultation_methods}</Text> : null}
          </View> : null}
          {expert.bio && (
            <View style={styles.infoBlock}>
              <Text style={styles.sectionTitle}>About</Text>
              <Text style={styles.bodyText}>{expert.bio}</Text>
            </View>
          )}

          {expert.expertise_areas && (
            <View style={styles.infoBlock}>
              <Text style={styles.sectionTitle}>Expertise</Text>
              <View style={styles.tagsContainer}>
                {expert.expertise_areas.split(',').map((area, index) => (
                  <View key={index} style={styles.tag}>
                    <Text style={styles.tagText}>{area.trim()}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(155).duration(350)} style={styles.articlesSection}>
          <View style={styles.articlesSectionHeader}>
            <Text style={styles.sectionTitle}>Community vouches</Text>
            <View style={styles.countBadge}><Text style={styles.countText}>{expert.vouch_count || 0}</Text></View>
          </View>
          <Text style={styles.vouchIntro}>Member vouches add context about professional connections. IN4 verifies credentials separately.</Text>
          {expert.vouches?.map((vouch, index) => <View key={`${vouch.name}-${index}`} style={styles.vouchRow}>
            <Text style={styles.vouchName}>{vouch.name}</Text>
            <Text style={styles.vouchRelationship}>{vouch.relationship_type}</Text>
            {vouch.note ? <Text style={styles.vouchNote}>{vouch.note}</Text> : null}
          </View>)}
          <TouchableOpacity style={styles.vouchButton} onPress={chooseVouch} disabled={vouching}>
            <Text style={styles.vouchButtonText}>{vouching ? 'Recording…' : 'Vouch for this professional'}</Text>
          </TouchableOpacity>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).duration(350)} style={styles.articlesSection}>
          <View style={styles.articlesSectionHeader}>
            <Text style={styles.sectionTitle}>Published Articles</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{expert.article_count}</Text>
            </View>
          </View>

          {expert.article_count > 0 ? (
            <FlatList
              data={expert.articles || []}
              renderItem={renderArticleCard}
              keyExtractor={(item) => item.id.toString()}
              scrollEnabled={false}
              contentContainerStyle={styles.articlesList}
            />
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="document-text-outline" size={48} color={COLORS.BORDER} />
              <Text style={styles.emptyStateText}>No articles published yet</Text>
            </View>
          )}
        </Animated.View>

        <Animated.View
          onLayout={(event) => {
            if (route.params?.focusComments) {
              scrollViewRef.current?.scrollTo({ y: event.nativeEvent.layout.y, animated: true });
            }
          }}
          entering={FadeInDown.delay(185).duration(350)}
          style={styles.articlesSection}
        >
          <View style={styles.articlesSectionHeader}>
            <Text style={styles.sectionTitle}>Reader comments</Text>
            <View style={styles.countBadge}><Text style={styles.countText}>{comments.length}</Text></View>
          </View>
          <Text style={styles.vouchIntro}>Comments are open to readers who have read at least one of this expert’s published articles.</Text>

          {loadingComments ? <ActivityIndicator color={COLORS.PRIMARY} style={{ marginVertical: 16 }} /> : null}
          {!user ? <Text style={styles.commentGuidance}>Sign in to join the discussion.</Text> : null}
          {user && commentEligibility?.is_profile_owner ? <Text style={styles.commentGuidance}>You can review comments on your profile, but you can’t comment on your own profile.</Text> : null}
          {user && commentEligibility?.already_commented ? <Text style={styles.commentGuidance}>You’ve shared your comment. Each reader can leave one comment on this profile.</Text> : null}
          {user && commentEligibility && !commentEligibility.can_comment && !commentEligibility.is_profile_owner && !commentEligibility.already_commented && commentEligibility.read_article_count === 0 ? (
            <Text style={styles.commentGuidance}>Read an article by this expert to unlock profile comments.</Text>
          ) : null}
          {commentEligibility?.can_comment ? (
            <View style={styles.profileCommentComposer}>
              <TextInput
                style={styles.profileCommentInput}
                value={commentText}
                onChangeText={setCommentText}
                placeholder="Share your perspective based on what you’ve read…"
                placeholderTextColor={THEME.TEXT_MUTED}
                multiline
                maxLength={1500}
                editable={!sendingComment}
              />
              <TouchableOpacity style={[styles.profileCommentSend, (!commentText.trim() || sendingComment) && styles.disabledButton]} onPress={submitProfileComment} disabled={!commentText.trim() || sendingComment}>
                {sendingComment ? <ActivityIndicator color="#FFFFFF" size="small" /> : <><Feather name="send" size={15} color="#FFFFFF" /><Text style={styles.profileCommentSendText}>Comment</Text></>}
              </TouchableOpacity>
            </View>
          ) : null}
          {!loadingComments && comments.length === 0 ? <Text style={styles.commentGuidance}>No reader comments yet.</Text> : null}
          {comments.map((comment) => <View key={comment.id}>{renderProfileComment({ item: comment })}</View>)}
        </Animated.View>
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.BACKGROUND },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  header: { paddingHorizontal: 20, paddingVertical: 12, backgroundColor: THEME.BACKGROUND },
  backButton: { padding: 10, backgroundColor: THEME.SURFACE, borderRadius: 12, alignSelf: 'flex-start', borderWidth: 1, borderColor: THEME.BORDER },
  content: { flex: 1 },

  profileHeader: { alignItems: 'center', marginHorizontal: 0, marginTop: 0, marginBottom: 12, paddingHorizontal: 24, paddingTop: 28, paddingBottom: 28, borderRadius: 0, backgroundColor: THEME.BRAND_DARK, borderWidth: 0 },
  expertLabel: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 12, paddingVertical: 7, marginBottom: 18, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.10)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)' },
  expertLabelText: { color: '#D9E7E6', fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
  avatarContainer: { width: 88, height: 88, borderRadius: 44, backgroundColor: '#D9E7E6', justifyContent: 'center', alignItems: 'center', marginBottom: 17, borderWidth: 3, borderColor: '#FFFFFF' },
  expertAvatarImage: { width: '100%', height: '100%', borderRadius: 44 },
  avatarText: { fontFamily: FONT_DISPLAY, fontSize: 40, fontWeight: '700', color: '#102A43' },
  verifiedBadge: { position: 'absolute', bottom: 2, right: 2, backgroundColor: '#1A7A62', width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 2.5, borderColor: '#FFFFFF' },
  expertName: { fontFamily: FONT_DISPLAY, fontSize: 34, fontWeight: '700', color: '#FFFFFF', marginBottom: 7, textAlign: 'center' },
  profession: { fontSize: 15, color: '#D5E2E0', fontWeight: '600', marginBottom: 15, textAlign: 'center', letterSpacing: 0.2 },
  organizationContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  organization: { fontSize: 13, color: '#F0F2EF', fontWeight: '600' },
  profileMeta: { color: '#D5E2E0', fontSize: 13, marginTop: 12 },

  verificationCard: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 20, marginBottom: 12, paddingVertical: 14, paddingHorizontal: 0, borderRadius: 0, backgroundColor: 'transparent', borderWidth: 0, borderBottomWidth: 1, borderColor: THEME.SEPARATOR },
  verificationIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: THEME.SURFACE, alignItems: 'center', justifyContent: 'center' },
  verificationCopy: { flex: 1 },
  verificationTitle: { color: '#173C32', fontSize: 13, fontWeight: '800' },
  verificationDetail: { color: '#547064', fontSize: 11, marginTop: 4 },

  infoSection: { marginHorizontal: 20, marginBottom: 8, paddingHorizontal: 2, paddingVertical: 17, backgroundColor: 'transparent', borderBottomWidth: 1, borderBottomColor: 'rgba(40,75,104,0.12)' },
  infoBlock: { marginBottom: 20 },
  sectionTitle: { fontFamily: FONT_DISPLAY, fontSize: 21, fontWeight: '700', color: THEME.TEXT_PRIMARY, marginBottom: 13 },
  bodyText: { fontSize: 15, color: THEME.TEXT_SECONDARY, lineHeight: 25 },
  tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { backgroundColor: THEME.SURFACE, paddingHorizontal: 13, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: THEME.BORDER },
  tagText: { color: THEME.TEXT_SECONDARY, fontSize: 12, fontWeight: '700' },

  articlesSection: { marginHorizontal: 20, marginBottom: 4, paddingHorizontal: 2, paddingVertical: 17, backgroundColor: 'transparent', borderBottomWidth: 1, borderBottomColor: 'rgba(40,75,104,0.12)' },
  vouchIntro: { color: THEME.TEXT_SECONDARY, fontSize: 12, lineHeight: 18, marginBottom: 12 },
  vouchRow: { borderTopWidth: 1, borderTopColor: THEME.SEPARATOR, paddingVertical: 10 },
  vouchName: { color: THEME.TEXT_PRIMARY, fontWeight: '800', fontSize: 13 },
  vouchRelationship: { color: THEME.BRAND_GREEN, fontWeight: '700', fontSize: 12, marginTop: 3 },
  vouchNote: { color: THEME.TEXT_SECONDARY, fontSize: 12, marginTop: 5 },
  vouchButton: { backgroundColor: THEME.PALE_GREEN, borderRadius: 12, alignItems: 'center', padding: 13, marginTop: 8 },
  vouchButtonText: { color: THEME.BRAND_GREEN, fontSize: 13, fontWeight: '800' },
  commentGuidance: { color: THEME.TEXT_MUTED, fontSize: 12, lineHeight: 19, marginBottom: 12 },
  profileCommentComposer: { marginBottom: 16 },
  profileCommentInput: { minHeight: 90, maxHeight: 150, backgroundColor: 'transparent', borderWidth: 0, borderBottomWidth: 1, borderColor: THEME.BORDER, borderRadius: 0, padding: 8, color: THEME.TEXT_PRIMARY, textAlignVertical: 'top', fontSize: 13, lineHeight: 19 },
  profileCommentSend: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, alignSelf: 'flex-end', marginTop: 9, backgroundColor: THEME.BRAND_BLUE, borderRadius: 11, paddingHorizontal: 14, paddingVertical: 10 },
  profileCommentSendText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  disabledButton: { opacity: 0.45 },
  profileComment: { flexDirection: 'row', gap: 10, borderTopWidth: 1, borderTopColor: THEME.SEPARATOR, paddingVertical: 13 },
  profileCommentAvatar: { width: 34, height: 34, borderRadius: 12, backgroundColor: THEME.PALE_BLUE, alignItems: 'center', justifyContent: 'center' },
  profileCommentInitial: { color: THEME.BRAND_BLUE, fontSize: 13, fontWeight: '800' },
  profileCommentCopy: { flex: 1 },
  profileCommentHeading: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  profileCommentAuthor: { color: THEME.TEXT_PRIMARY, fontSize: 12, fontWeight: '800' },
  profileCommentDate: { color: THEME.TEXT_MUTED, fontSize: 10, marginTop: 2 },
  profileCommentText: { color: THEME.TEXT_SECONDARY, fontSize: 13, lineHeight: 19, marginTop: 8 },
  articlesSectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  countBadge: { backgroundColor: THEME.SURFACE, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 100, borderWidth: 1, borderColor: THEME.BORDER },
  countText: { color: THEME.TEXT_PRIMARY, fontSize: 13, fontWeight: '800' },
  articlesList: { gap: 16 },
  articleCard: { backgroundColor: 'transparent', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: THEME.SEPARATOR },
  articleContent: { gap: 0 },
  articleTitle: { fontFamily: FONT_DISPLAY, fontSize: 16, fontWeight: '800', color: THEME.TEXT_PRIMARY, marginBottom: 10, lineHeight: 23 },
  articleSummary: { fontSize: 14, color: THEME.TEXT_SECONDARY, lineHeight: 21, marginBottom: 16 },
  articleFooter: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  footerItem: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  footerText: { fontSize: 12, color: '#61748A', fontWeight: '600' },
  emptyState: { paddingVertical: 48, alignItems: 'center' },
  emptyStateText: { color: '#8899A8', fontSize: 15, marginTop: 14 },

  errorTitle: { fontSize: 22, fontWeight: '800', color: THEME.TEXT_PRIMARY, marginBottom: 10 },
  errorText: { fontSize: 15, color: THEME.TEXT_SECONDARY, textAlign: 'center', marginBottom: 28 },
  primaryButton: { backgroundColor: '#087B84', paddingHorizontal: 28, paddingVertical: 15, borderRadius: 14 },
  primaryButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
});

export default ExpertProfileScreen;
