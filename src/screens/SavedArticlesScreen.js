import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Text, ActivityIndicator, RefreshControl, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { engagementAPI, resolveMediaUrl } from '../api/client';
import { FONT_DISPLAY } from '../theme/typography';
import { COLORS as THEME } from '../theme/colors';

// ── DESIGN TOKENS ──
const COLORS = {
  INK: THEME.BACKGROUND,
  SURFACE: THEME.SURFACE,
  SURFACE_RAISED: THEME.SURFACE_ALT,
  BORDER: THEME.BORDER,
  GOLD: THEME.GOLD,
  GOLD_DIM: THEME.PALE_GOLD,
  TEAL: THEME.BRAND_GREEN,
  CORAL: THEME.ERROR_RED,
  TEXT_PRIMARY: THEME.TEXT_PRIMARY,
  TEXT_SECONDARY: THEME.TEXT_SECONDARY,
  TEXT_MUTED: THEME.TEXT_MUTED,
};

const DEFAULT_CATEGORY_COLOR = COLORS.GOLD;

const isWithinLastWeek = (dateString) => {
  const then = new Date(dateString).getTime();
  const now = Date.now();
  return now - then <= 7 * 24 * 60 * 60 * 1000;
};

const SavedArticlesScreen = ({ navigation }) => {
  const [savedArticles, setSavedArticles] = useState([]);
  const [totalSavedCount, setTotalSavedCount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [unsavingId, setUnsavingId] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let isMounted = true;
    const loadSavedArticles = async () => {
      setError(null);
      try {
        const response = await engagementAPI.getSavedArticles(page);
        if (isMounted) {
          if (page === 1) setSavedArticles(response.results);
          else setSavedArticles((prev) => [...prev, ...response.results]);
          setHasMore(response.next !== null);
        }
      } catch (err) {
        if (isMounted) setError(err.response?.data?.message || 'Failed to load saved articles');
      } finally {
        if (isMounted) { setLoading(false); setRefreshing(false); }
      }
    };
    if (!refreshing) loadSavedArticles();
    return () => { isMounted = false; };
  }, [page, refreshing, refreshKey]);

  useEffect(() => {
    let isMounted = true;
    const loadCount = async () => {
      try {
        const response = await engagementAPI.getSavedCount();
        if (isMounted) setTotalSavedCount(response.saved_count);
      } catch (err) {
        console.error('Failed to load saved count', err);
      }
    };
    loadCount();
    return () => { isMounted = false; };
  }, [refreshKey, savedArticles.length]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setPage(1);
    setRefreshKey((prev) => prev + 1);
  }, []);

  const handleRetry = useCallback(() => {
    setLoading(true);
    setError(null);
    setPage(1);
    setRefreshKey((prev) => prev + 1);
  }, []);

  const handleLoadMore = useCallback(() => {
    if (hasMore && !loading) setPage((prev) => prev + 1);
  }, [hasMore, loading]);

  const handleUnsave = useCallback(async (articleId) => {
    const originalArticles = savedArticles;
    setSavedArticles((prev) => prev.filter((article) => article.article.id !== articleId));
    setUnsavingId(articleId);
    try {
      await engagementAPI.unsaveArticle(articleId);
      setUnsavingId(null);
      setTotalSavedCount((prev) => (typeof prev === 'number' ? Math.max(0, prev - 1) : prev));
    } catch (err) {
      setSavedArticles(originalArticles);
      setUnsavingId(null);
      Alert.alert("Couldn't remove article", 'Please try again.');
    }
  }, [savedArticles]);

  const sections = useMemo(() => {
    const thisWeek = savedArticles.filter((item) => isWithinLastWeek(item.saved_at));
    const earlier = savedArticles.filter((item) => !isWithinLastWeek(item.saved_at));
    const rows = [];
    if (thisWeek.length > 0) {
      rows.push({ type: 'header', key: 'header-this-week', label: 'This week' });
      thisWeek.forEach((item) => rows.push({ type: 'item', key: `item-${item.id}`, item }));
    }
    if (earlier.length > 0) {
      rows.push({ type: 'header', key: 'header-earlier', label: 'Earlier' });
      earlier.forEach((item) => rows.push({ type: 'item', key: `item-${item.id}`, item }));
    }
    return rows;
  }, [savedArticles]);

  const totalMinutesLoaded = useMemo(
    () => savedArticles.reduce((sum, item) => sum + (item.article?.reading_time || 0), 0),
    [savedArticles]
  );

  const renderRow = ({ item: row, index }) => {
    if (row.type === 'header') {
      return (
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeaderText}>{row.label}</Text>
        </View>
      );
    }

    const item = row.item;
    const categoryColor = item.article?.category_color || DEFAULT_CATEGORY_COLOR;

    return (
      <Animated.View entering={FadeInDown.delay(Math.min(index * 35, 210)).duration(300)}>
      <TouchableOpacity
        style={styles.articleCard}
        onPress={() => navigation.navigate('ArticleDetail', { slug: item.article.slug, article: item.article })}
        activeOpacity={0.65}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.categoryBadge, { backgroundColor: categoryColor + '18' }]}>
            <Text style={[styles.categoryBadgeText, { color: categoryColor }]}>{item.article.category_name}</Text>
          </View>
          <TouchableOpacity
            style={styles.unsaveButton}
            onPress={() => handleUnsave(item.article.id)}
            disabled={unsavingId === item.article.id}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            {unsavingId === item.article.id
              ? <ActivityIndicator color={COLORS.CORAL} size="small" />
              : <Feather name="bookmark" size={17} color={COLORS.GOLD} />}
          </TouchableOpacity>
        </View>
        {item.article.featured_image ? <Image source={{ uri: resolveMediaUrl(item.article.featured_image) }} style={styles.articleImage} resizeMode="cover" /> : null}
        <Text style={styles.articleTitle} numberOfLines={2}>{item.article.title}</Text>
        <Text style={styles.articleSummary} numberOfLines={2}>{item.article.summary}</Text>
        <View style={styles.cardFooter}>
          <View style={styles.authorSection}>
            <View style={styles.authorNameRow}>
              <Text style={styles.authorName} numberOfLines={1}>{item.article.author_name}</Text>
              {item.article.author_verified ? <Feather name="check-circle" size={14} color="#1D9BF0" /> : null}
            </View>
            <View style={styles.authorStats}>
              <Text style={styles.metaText}>{item.article.reading_time} min read</Text>
              <Text style={styles.metaText}>·</Text>
              <Feather name="eye" size={12} color={COLORS.TEXT_MUTED} />
              <Text style={styles.metaText}>{item.article.view_count}</Text>
            </View>
          </View>
          <Text style={styles.metaText}>Saved {new Date(item.saved_at).toLocaleDateString()}</Text>
        </View>
      </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderEmptyState = () => {
    if (loading) return null;
    return (
      <View style={styles.emptyState}>
        <View style={styles.emptyIconCircle}>
          <Feather name="bookmark" size={36} color={COLORS.GOLD} />
        </View>
        <Text style={styles.emptyStateTitle}>Start building your list</Text>
        <Text style={styles.emptyStateText}>
          Tap the bookmark icon on any article to save it here for later — your own
          shelf of expert-verified reading.
        </Text>
        <TouchableOpacity style={styles.emptyStateButton} onPress={() => navigation.navigate('MainTabs', { screen: 'ArticlesTab' })}>
          <Text style={styles.emptyStateButtonText}>Browse articles</Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (loading && savedArticles.length === 0) {
    return <SafeAreaView style={styles.container}><View style={styles.headerRow}><TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}><Feather name="arrow-left" size={20} color={COLORS.TEXT_PRIMARY} /></TouchableOpacity><Text style={styles.headerTitle}>Reading List</Text></View><View style={styles.centerContainer}><ActivityIndicator size="large" color={COLORS.GOLD} /></View></SafeAreaView>;
  }

  if (error && savedArticles.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.headerRow}><TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}><Feather name="arrow-left" size={20} color={COLORS.TEXT_PRIMARY} /></TouchableOpacity><Text style={styles.headerTitle}>Reading List</Text></View>
        <View style={styles.centerContainer}>
          <Feather name="alert-circle" size={56} color={COLORS.TEXT_MUTED} style={{ marginBottom: 16 }} />
          <Text style={styles.errorTitle}>Couldn't load your list</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
            <Text style={styles.retryButtonText}>Try again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Back to profile">
            <Feather name="arrow-left" size={20} color={COLORS.TEXT_PRIMARY} />
          </TouchableOpacity>
          <View><Text style={styles.headerEyebrow}>YOUR LIBRARY</Text><Text style={styles.headerTitle}>Saved articles</Text></View>
        </View>

        {savedArticles.length > 0 && (
          <View style={styles.statsRow}>
            <View style={styles.statPill}>
              <Feather name="bookmark" size={13} color={COLORS.GOLD} />
              <Text style={styles.statPillText}>
                {totalSavedCount ?? savedArticles.length} saved
              </Text>
            </View>
            <View style={styles.statPill}>
              <Feather name="clock" size={13} color={COLORS.TEAL} />
              <Text style={styles.statPillText}>~{totalMinutesLoaded} min to read</Text>
            </View>
          </View>
        )}
      </View>

      <FlatList
        data={sections}
        renderItem={renderRow}
        keyExtractor={(row) => row.key}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.GOLD} />}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.1}
        ListEmptyComponent={renderEmptyState}
        ListFooterComponent={hasMore && !refreshing && loading ? <View style={styles.loadMore}><ActivityIndicator color={COLORS.GOLD} size="small" /></View> : null}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.INK },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },

  header: { paddingHorizontal: 24, paddingTop: 22, paddingBottom: 20, backgroundColor: '#173B59' },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  backButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: COLORS.SURFACE, borderWidth: 1, borderColor: COLORS.BORDER },
  headerEyebrow: { color: '#9ED8E8', fontSize: 10, fontWeight: '800', letterSpacing: 1.3, marginBottom: 2 },
  headerTitle: { fontFamily: FONT_DISPLAY, fontSize: 30, fontWeight: '700', color: '#FFFFFF' },

  statsRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1.5,
    borderColor: COLORS.BORDER,
    borderRadius: 100,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  statPillText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },

  listContent: { paddingHorizontal: 24, paddingTop: 4, paddingBottom: 110 },

  sectionHeaderRow: { paddingTop: 22, paddingBottom: 10 },
  sectionHeaderText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.TEXT_MUTED,
    textTransform: 'uppercase',
    letterSpacing: 1.4,
  },

  articleCard: {
    backgroundColor: 'transparent',
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: THEME.SEPARATOR,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  categoryBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 100 },
  categoryBadgeText: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  unsaveButton: {
    padding: 8,
    borderRadius: 100,
    backgroundColor: THEME.ERROR_LIGHT || '#FEF2F0',
  },
  articleTitle: { fontFamily: FONT_DISPLAY, fontSize: 18, fontWeight: '800', color: COLORS.TEXT_PRIMARY, marginBottom: 8, lineHeight: 25 },
  articleImage: { width: '100%', height: 190, borderRadius: 0, marginBottom: 14, backgroundColor: COLORS.SURFACE_RAISED },
  articleSummary: { fontSize: 14, color: COLORS.TEXT_SECONDARY, lineHeight: 21, marginBottom: 16 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', borderTopWidth: 1, borderTopColor: THEME.SEPARATOR, paddingTop: 14 },
  authorSection: { flex: 1, paddingRight: 16 },
  authorName: { fontSize: 13, fontWeight: '700', color: COLORS.TEXT_PRIMARY },
  authorNameRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 3 },
  authorStats: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { fontSize: 12, color: COLORS.TEXT_MUTED, fontWeight: '500' },

  emptyState: { alignItems: 'center', paddingVertical: 72, paddingHorizontal: 16 },
  emptyIconCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: COLORS.GOLD_DIM,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1.5,
    borderColor: COLORS.BORDER,
  },
  emptyStateTitle: { fontSize: 22, fontWeight: '800', color: COLORS.TEXT_PRIMARY, marginBottom: 10 },
  emptyStateText: { fontSize: 15, color: COLORS.TEXT_SECONDARY, textAlign: 'center', lineHeight: 23, marginBottom: 28, maxWidth: 300 },
  emptyStateButton: { backgroundColor: COLORS.TEAL, paddingHorizontal: 28, paddingVertical: 15, borderRadius: 14 },
  emptyStateButtonText: { color: '#FFFFFF', fontWeight: '800', fontSize: 15 },

  errorTitle: { fontSize: 22, fontWeight: '800', color: COLORS.TEXT_PRIMARY, marginBottom: 8 },
  errorText: { fontSize: 15, color: COLORS.TEXT_SECONDARY, textAlign: 'center', marginBottom: 24 },
  retryButton: { backgroundColor: COLORS.TEAL, paddingHorizontal: 28, paddingVertical: 15, borderRadius: 14 },
  retryButtonText: { color: '#FFFFFF', fontWeight: '800', fontSize: 16 },
  loadMore: { paddingVertical: 20, alignItems: 'center' },
});

export default SavedArticlesScreen;
