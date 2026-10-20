import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Image,
  StyleSheet,
  ScrollView,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { articleAPI, communityAPI, engagementAPI, resolveMediaUrl } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { FONT_DISPLAY } from '../theme/typography';
import { COLORS as THEME } from '../theme/colors';

const COLORS = {
  PRIMARY_DARK: THEME.BACKGROUND,
  PRIMARY_LIGHT: THEME.SURFACE,
  ACCENT_BLUE: THEME.BRAND_BLUE,
  ACCENT_CYAN: THEME.BRAND_GREEN,
  TEXT_PRIMARY: THEME.TEXT_PRIMARY,
  TEXT_SECONDARY: THEME.TEXT_SECONDARY,
  TEXT_TERTIARY: THEME.TEXT_TERTIARY,
  ERROR_RED: THEME.ERROR_RED,
  SUCCESS_GREEN: THEME.SUCCESS_GREEN,
  BORDER: THEME.BORDER,
};

// FIX: fallback color used when article.category is missing or has no
// color_code, so styling never breaks even with incomplete data.
const DEFAULT_CATEGORY_COLOR = COLORS.ACCENT_BLUE;

const ArticleDetailScreen = ({ route, navigation }) => {
  // ===== STATE =====
  const [article, setArticle] = useState(route.params?.article || null);
  const [isSaved, setIsSaved] = useState(false);
  const [loading, setLoading] = useState(!article);
  const [error, setError] = useState(null);
  const [savingArticle, setSavingArticle] = useState(false);
  const [startingConversation, setStartingConversation] = useState(false);
  const { user } = useAuth();

  const slug = route.params?.slug;

  /**
   * Fetch full article on mount
   * 
   * WHY:
   * - List view shows preview data
   * - Detail view needs full content
   * - Route params include article (avoid refetch)
   * - But check if article is complete (has body)
   */
  useEffect(() => {
    let isMounted = true;

    const loadArticle = async () => {
      // If we already have article data from route params, use it
      if (article?.body) {
        setLoading(false);
        return;
      }

      // Otherwise fetch full article
      try {
        const response = await articleAPI.getArticle(slug);
        if (isMounted) {
          setArticle(response);
        }
      } catch (err) {
        if (isMounted) {
          setError(
            err.response?.data?.message ||
              'Failed to load article'
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadArticle();

    return () => {
      isMounted = false;
    };
  }, [slug, article?.body]);

  /**
   * Check if article is saved (for UI state)
   */
  useEffect(() => {
    let isMounted = true;

    const checkIfSaved = async () => {
      if (!article?.id) return;

      try {
        const response = await engagementAPI.isArticleSaved(
          article.id
        );
        if (isMounted) {
          setIsSaved(response.is_saved);
        }
      } catch (err) {
        console.error('Failed to check if saved', err);
      }
    };

    checkIfSaved();

    return () => {
      isMounted = false;
    };
  }, [article?.id]);

  /**
   * Toggle save/unsave
   */
  const handleToggleSave = useCallback(async () => {
    if (!article) return;

    setSavingArticle(true);

    try {
      if (isSaved) {
        // Unsave
        await engagementAPI.unsaveArticle(article.id);
        setIsSaved(false);
      } else {
        // Save
        await engagementAPI.saveArticle(article.id);
        setIsSaved(true);
      }
    } catch (err) {
      Alert.alert(
        'Error',
        err.response?.data?.message || 'Failed to save article'
      );
    } finally {
      setSavingArticle(false);
    }
  }, [article, isSaved]);

  const handleMessageAuthor = useCallback(async () => {
    if (!article || !user) {
      Alert.alert('Sign in to message', 'Create an account or sign in to start a private conversation with the article author.');
      return;
    }
    setStartingConversation(true);
    try {
      const conversation = await communityAPI.startConversation(article.id);
      navigation.navigate('ConversationThread', {
        conversationId: conversation.id,
        title: conversation.other_user_name,
        articleTitle: conversation.article_title,
      });
    } catch (err) {
      Alert.alert('Unable to start conversation', err.response?.data?.message || 'Please try again.');
    } finally { setStartingConversation(false); }
  }, [article, user, navigation]);

  /**
   * Record that user read this article
   */
  useEffect(() => {
    let isMounted = true;

    const recordRead = async () => {
      if (!article?.id) return;

      try {
        await engagementAPI.recordRead(article.id);
      } catch (err) {
        // Fail silently—reading history is optional
        console.error('Failed to record read', err);
      }
    };

    recordRead();

    return () => {
      isMounted = false;
    };
  }, [article?.id]);

  /**
   * Share article
   */
  const handleShare = useCallback(async () => {
    if (!article) return;

    try {
      await Share.share({
        message: `Check out this article: "${article.title}" on IN4 - Expert Knowledge Hub`,
        title: article.title,
        url: `in4://article/${article.slug}`, // Deep link (for future)
      });
    } catch (err) {
      console.error('Share error', err);
    }
  }, [article]);

  /**
   * Loading state
   */
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator
            size="large"
            color={COLORS.ACCENT_BLUE}
          />
        </View>
      </SafeAreaView>
    );
  }

  /**
   * Error state
   */
  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.retryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!article) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Article not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  // FIX: safe, optionally-chained reads for nested category/author data.
  // Previously `article.category.color_code` / `article.category.name` /
  // `article.author.first_name` etc. were accessed directly with no
  // guard — if either object was missing (e.g. a lighter list-preview
  // payload, or a deleted category), this threw and crashed the whole
  // screen. Now every nested read has a safe fallback.
  const categoryColor = article.category?.color_code || DEFAULT_CATEGORY_COLOR;
  const categoryName = article.category?.name || 'Uncategorized';
  const authorDisplayName =
    article.author?.first_name || article.author?.email || 'Unknown author';
  // FIX: pull the real profession from the expert profile instead of a
  // hardcoded "Medical Doctor" string that was wrong for every non-medical
  // author. Adjust the field path below if your serializer nests it
  // differently (e.g. article.author.expert_profile.profession_display).
  const authorTitle = article.author?.expert_profile?.profession
    ? `${article.author.expert_profile.profession} • Verified Expert`
    : 'Verified Expert';

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with back button */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <View style={styles.backButtonContent}><Feather name="arrow-left" size={16} color="#FFFFFF" /><Text style={styles.backButtonText}>Back</Text></View>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.shareButton}
          onPress={handleShare}
        >
          <Feather name="share-2" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {article.featured_image ? (
          <Image
            source={{ uri: resolveMediaUrl(article.featured_image) }}
            style={styles.heroImage}
            resizeMode="cover"
            accessibilityLabel={`${article.title} cover image`}
          />
        ) : null}
        {/* Category Badge */}
        <View
          style={[
            styles.categoryBadge,
            { backgroundColor: categoryColor + '20' },
          ]}
        >
          <Text
            style={[styles.categoryBadgeText, { color: categoryColor }]}
          >
            {categoryName}
          </Text>
        </View>

        {/* Title */}
        <Text style={styles.title}>{article.title}</Text>

        {/* Summary */}
        <Text style={styles.summary}>{article.summary}</Text>

        {/* Article Meta */}
        <View style={styles.metaContainer}>
          <View style={styles.metaItem}><Feather name="clock" size={14} color={COLORS.TEXT_TERTIARY} /><Text style={styles.metaText}>{article.reading_time} min read</Text></View>
          <View style={styles.metaItem}><Feather name="eye" size={14} color={COLORS.TEXT_TERTIARY} /><Text style={styles.metaText}>{article.view_count} views</Text></View>
          <View style={styles.metaItem}><Feather name="bookmark" size={14} color={COLORS.TEXT_TERTIARY} /><Text style={styles.metaText}>{article.save_count} saves</Text></View>
        </View>

        {/* Author Card */}
        <View style={styles.authorCard}>
          {/* Verified Expert badge pill */}
          <View style={styles.verifiedBadge}>
            <Feather name="shield" size={11} color="#2E7269" />
            <Text style={styles.verifiedBadgeText}>Verified Expert</Text>
          </View>
          <View style={styles.authorInfo}>
            <View style={styles.authorNameRow}>
              <Text style={styles.authorName}>{authorDisplayName}</Text>
              {article.author_verified ? <Feather name="check-circle" size={15} color="#1D9BF0" /> : null}
            </View>
            <Text style={styles.authorBio}>{authorTitle}</Text>
          </View>
        </View>

        {/* Article Body */}
        <View style={styles.bodyContainer}>
          <Text style={styles.body}>{article.body}</Text>
        </View>

        {/* Footer spacing */}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Save Button (Sticky at bottom) */}
      <View style={styles.footer}>
        <View style={styles.footerActions}>
          <TouchableOpacity style={styles.secondaryAction} onPress={() => navigation.navigate('ArticleComments', { article })}>
            <Feather name="message-circle" size={16} color={COLORS.ACCENT_BLUE} />
            <Text style={styles.secondaryActionText}>Comments</Text>
          </TouchableOpacity>
          {!article.is_author && <TouchableOpacity style={styles.secondaryAction} onPress={handleMessageAuthor} disabled={startingConversation}>
            {startingConversation ? <ActivityIndicator size="small" color={COLORS.ACCENT_BLUE} /> : <Feather name="send" size={15} color={COLORS.ACCENT_BLUE} />}
            <Text style={styles.secondaryActionText}>Message author</Text>
          </TouchableOpacity>}
        </View>
        {article.is_author && article.status === 'published' && (
          <TouchableOpacity
            style={styles.editArticleButton}
            onPress={() => navigation.navigate('ArticlePublish', { articleId: article.id })}
          >
            <Feather name="edit-3" size={16} color={COLORS.ACCENT_BLUE} />
            <Text style={styles.editArticleText}>Propose an edit</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[
            styles.saveButton,
            isSaved && styles.saveButtonActive,
          ]}
          onPress={handleToggleSave}
          disabled={savingArticle}
        >
          {savingArticle ? (
            <ActivityIndicator
              color="#FFFFFF"
              size="small"
            />
          ) : (
            <>
              <Feather name="bookmark" size={18} color="#FFFFFF" />
          <Text
                style={[
                  styles.saveButtonText,
                  isSaved && styles.saveButtonTextActive,
                ]}
              >
                {isSaved ? 'Article saved' : 'Save article'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#31536D',
    backgroundColor: '#173B59',
  },
  backButton: {
    padding: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  backButtonContent: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  backButtonText: {
    color: '#D2E1ED',
    fontSize: 14,
    fontWeight: '700',
  },
  shareButton: {
    padding: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  shareIcon: {
    fontSize: 18,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  heroImage: {
    width: '100%',
    height: 220,
    borderRadius: 0,
    marginBottom: 20,
    backgroundColor: '#E5F1FA',
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 100,
    marginBottom: 18,
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  title: {
    fontFamily: FONT_DISPLAY,
    fontSize: 28,
    fontWeight: '800',
    color: '#173B59',
    lineHeight: 36,
    marginBottom: 14,
    letterSpacing: -0.5,
  },
  summary: {
    fontSize: 16,
    color: '#526F86',
    lineHeight: 26,
    marginBottom: 20,
    fontWeight: '500',
  },
  metaContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#DFE8F0',
  },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: {
    fontSize: 13,
    color: '#71889B',
    fontWeight: '600',
  },
  authorCard: {
    backgroundColor: 'transparent',
    paddingVertical: 16,
    paddingHorizontal: 2,
    marginBottom: 24,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#DFE8F0',
  },
  verifiedBadge: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    backgroundColor: '#E5F1FA',
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  verifiedBadgeText: {
    color: '#287B93',
    fontSize: 11,
    fontWeight: '800',
  },
  authorInfo: {
    gap: 4,
  },
  authorName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#173B59',
    marginBottom: 4,
  },
  authorNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  authorBio: {
    fontSize: 13,
    color: '#71889B',
    fontWeight: '500',
  },
  bodyContainer: {
    marginBottom: 24,
  },
  body: {
    fontSize: 16,
    lineHeight: 28,
    color: '#526F86',
    fontWeight: '400',
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: '#DFE8F0',
    backgroundColor: '#FFFFFF',
  },
  footerActions: { flexDirection: 'row', gap: 9, marginBottom: 10 },
  secondaryAction: { flex: 1, minHeight: 44, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 7, backgroundColor: '#DDF1F0', borderRadius: 13 },
  secondaryActionText: { color: '#12396B', fontSize: 12, fontWeight: '800' },
  saveButton: {
    width: '100%',
    minHeight: 56,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#087B84',
  },
  editArticleButton: { height: 48, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, backgroundColor: '#DDF1F0', borderRadius: 13, marginBottom: 10 },
  editArticleText: { color: '#12396B', fontSize: 14, fontWeight: '800' },
  saveButtonActive: {
    backgroundColor: '#1A7A62',
  },
  saveButtonIcon: {
    fontSize: 18,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  saveButtonTextActive: {
    color: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorText: {
    color: COLORS.TEXT_PRIMARY,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#087B84',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

export default ArticleDetailScreen;
