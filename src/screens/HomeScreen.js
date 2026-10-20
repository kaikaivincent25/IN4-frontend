/**
 * HomeScreen - Professional Redesign
 * UI only — all logic preserved from original
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  RefreshControl,
  Image,
  Dimensions,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { articleAPI, categoryAPI, resolveMediaUrl } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { FONT_DISPLAY } from '../theme/typography';
import { COLORS as THEME } from '../theme/colors';

const SCREEN_WIDTH = Dimensions.get('window').width;

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
};

const PAGE_SIZE = 20;

const HomeScreen = ({ navigation }) => {
  const [articles, setArticles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(null);

  const { user } = useAuth();

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
    let isMounted = true;
    const loadArticles = async () => {
      setError(null);
      try {
        const response = await articleAPI.listArticles(
          selectedCategory,
          searchQuery,
          '-published_at',
          page
        );
        if (isMounted) {
          if (page === 1) {
            setArticles(response.results);
          } else {
            setArticles((prev) => [...prev, ...response.results]);
          }
          setHasMore(response.next !== null);
        }
      } catch (err) {
        console.error('Failed to load articles', err);
        if (isMounted) {
          setError(err.response?.data?.message || 'Failed to load articles. Please try again.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    };
    if (!refreshing) loadArticles();
    return () => { isMounted = false; };
  }, [page, selectedCategory, searchQuery, refreshing]);

  const handleCategoryPress = useCallback((categorySlug) => {
    setSelectedCategory((prev) => prev === categorySlug ? null : categorySlug);
    setPage(1);
  }, []);

  const handleSearchChange = useCallback((text) => {
    setSearchQuery(text);
    setPage(1);
  }, []);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setPage(1);
  }, []);

  const handleLoadMore = useCallback(() => {
    if (hasMore && !loading) setPage((prev) => prev + 1);
  }, [hasMore, loading]);

  const handleArticlePress = useCallback((article) => {
    navigation.navigate('ArticleDetail', { slug: article.slug, article });
  }, [navigation]);

  const handleRetry = useCallback(() => {
    setLoading(true);
    setError(null);
    setPage(1);
  }, []);

  const filteredArticles = useMemo(() => {
    if (!selectedCategory) return articles;
    return articles.filter((a) => a.category_slug === selectedCategory);
  }, [articles, selectedCategory]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  // ── CATEGORY ICON MAP ──
  const getCategoryIcon = (iconName) => {
    const map = {
      heart: 'heart',
      'scale-outline': 'briefcase',
      'trending-up': 'trending-up',
      'shield-checkmark-outline': 'shield',
      'leaf-outline': 'feather',
      'sprout-outline': 'sun',
      'bulb-outline': 'zap',
    };
    return map[iconName] ?? 'file-text';
  };

  // ── AUTHOR INITIALS ──
  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.split(' ');
    return parts.length >= 2
      ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
      : name.slice(0, 2).toUpperCase();
  };

  // ── FEATURED CARD (first article) ──
  const renderFeaturedCard = (item) => (
    <Animated.View entering={FadeInDown.duration(360)}>
    <TouchableOpacity style={styles.featuredCard} onPress={() => handleArticlePress(item)} activeOpacity={0.72}>
      {item.featured_image ? (
        <Image source={{ uri: resolveMediaUrl(item.featured_image) }} style={styles.featuredImage} />
      ) : (
        <View style={styles.featuredImagePlaceholder}>
          <View style={styles.featuredBadgeWrap}>
            <View style={styles.featuredBadge}>
              <Text style={styles.featuredBadgeText}>Editor's pick</Text>
            </View>
          </View>
        </View>
      )}
      <View style={styles.featuredBody}>
        <Text style={styles.featuredCat}>{item.category_name}</Text>
        <Text style={styles.featuredTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.featuredSummary} numberOfLines={2}>{item.summary}</Text>
        <View style={styles.featuredFooter}>
          <View style={styles.authorRow}>
            <View style={styles.authorAvatar}>
              <Text style={styles.authorAvatarText}>{getInitials(item.author_name)}</Text>
            </View>
            <View>
              <View style={styles.authorNameRow}>
                <Text style={styles.authorName} numberOfLines={1}>{item.author_name}</Text>
                {item.author_verified ? <Feather name="check-circle" size={13} color="#1D9BF0" /> : null}
              </View>
              <Text style={styles.readTime}>{item.reading_time} min read</Text>
            </View>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Feather name="eye" size={12} color={COLORS.TEXT_TERTIARY} />
              <Text style={styles.statText}>{item.view_count}</Text>
            </View>
            <View style={styles.statItem}>
              <Feather name="bookmark" size={12} color={COLORS.TEXT_TERTIARY} />
              <Text style={styles.statText}>{item.save_count}</Text>
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
    </Animated.View>
  );

  // ── COMPACT LIST CARD ──
  const renderArticleCard = ({ item, index }) => {
    if (index === 0) return null; // first item is rendered as featured
    return (
      <Animated.View entering={FadeInDown.delay(Math.min(index * 35, 210)).duration(300)}>
      <TouchableOpacity
        style={styles.listCard}
        onPress={() => handleArticlePress(item)}
        activeOpacity={0.66}
      >
        {item.featured_image ? (
          <Image source={{ uri: resolveMediaUrl(item.featured_image) }} style={styles.listCardImage} />
        ) : (
          <View style={styles.listCardImagePlaceholder} />
        )}
        <View style={styles.listCardBody}>
          <Text style={styles.listCardCat}>{item.category_name}</Text>
          <Text style={styles.listCardTitle} numberOfLines={2}>{item.title}</Text>
          <Text style={styles.listCardSummary} numberOfLines={2}>{item.summary}</Text>
          <View style={styles.listCardMeta}>
            <View style={styles.listCardAuthorRow}>
              <Text style={styles.listCardAuthor} numberOfLines={1}>{item.author_name}</Text>
              {item.author_verified ? <Feather name="check-circle" size={12} color="#1D9BF0" /> : null}
            </View>
            <View style={styles.listCardStats}>
              <Feather name="clock" size={11} color={THEME.TEXT_MUTED} />
              <Text style={styles.listCardTime}>{item.reading_time} min</Text>
              <Feather name="eye" size={11} color={THEME.TEXT_MUTED} />
              <Text style={styles.listCardTime}>{item.view_count}</Text>
              <Feather name="bookmark" size={11} color={THEME.TEXT_MUTED} />
              <Text style={styles.listCardTime}>{item.save_count}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderEmptyState = () => {
    if (loading) return null;
    return (
      <View style={styles.emptyState}>
        <Feather name="inbox" size={52} color={COLORS.TEXT_TERTIARY} />
        <Text style={styles.emptyStateTitle}>No articles found</Text>
        <Text style={styles.emptyStateText}>
          {searchQuery
            ? `No results for "${searchQuery}"`
            : selectedCategory
              ? 'No articles in this category'
              : 'No articles available'}
        </Text>
      </View>
    );
  };

  if (loading && articles.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#12396B" />
          <Text style={styles.loadingText}>Loading articles…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error && articles.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Feather name="alert-circle" size={52} color={COLORS.ERROR_RED} />
          <Text style={styles.errorTitle}>Couldn't load articles</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
            <Text style={styles.retryButtonText}>Try again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── HEADER: rendered as FlatList ListHeaderComponent ──
  const ListHeader = () => (
    <>
      {/* ── TOP BAR ── */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.greetingSub}>{getGreeting()}</Text>
          <Text style={styles.greetingName}>
            {user?.first_name || 'Explorer'}
          </Text>
          <Text style={styles.heroCaption}>Trusted knowledge for everyday decisions.</Text>
        </View>
        <Image
          source={require('../../assets/logo.png')}
          style={styles.logoMini}
          resizeMode="contain"
        />
      </View>

      {/* ── SEARCH ── */}
      <View style={styles.searchRow}>
        <View style={styles.searchContainer}>
          <Feather name="search" size={17} color={COLORS.TEXT_TERTIARY} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search articles, experts, topics…"
            placeholderTextColor={COLORS.TEXT_TERTIARY}
            value={searchQuery}
            onChangeText={handleSearchChange}
            returnKeyType="search"
            accessibilityLabel="Search articles, experts, and topics"
          />
          {searchQuery ? (
            <TouchableOpacity
              onPress={() => handleSearchChange('')}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel="Clear search"
            >
              <Feather name="x" size={17} color={COLORS.TEXT_TERTIARY} />
            </TouchableOpacity>
          ) : null}
        </View>
        <TouchableOpacity
          style={styles.advancedSearchButton}
          onPress={() => navigation.navigate('AdvancedSearch')}
          accessibilityRole="button"
          accessibilityLabel="Open advanced search filters"
          hitSlop={6}
        >
          <Feather name="sliders" size={18} color="#12396B" />
        </TouchableOpacity>
      </View>

      {/* ── CATEGORY CHIPS ── */}
      {categories.length > 0 && (
        <FlatList
          data={categories}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.categoryChip,
                selectedCategory === item.slug && styles.categoryChipActive,
              ]}
              onPress={() => handleCategoryPress(item.slug)}
            >
              <Feather name={getCategoryIcon(item.icon_name)} size={14} color={selectedCategory === item.slug ? '#F6F7F3' : THEME.BRAND_BLUE} />
              <Text
                style={[
                  styles.categoryChipText,
                  selectedCategory === item.slug && styles.categoryChipTextActive,
                ]}
              >
                {item.name}
              </Text>
            </TouchableOpacity>
          )}
          keyExtractor={(item) => item.id.toString()}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScrollContent}
        />
      )}

      {/* ── FEATURED ── */}
      {filteredArticles.length > 0 && (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Featured</Text>
          </View>
          {renderFeaturedCard(filteredArticles[0])}
        </>
      )}

      {filteredArticles.length > 1 && (
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Latest</Text>
        </View>
      )}
    </>
  );

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={filteredArticles}
        renderItem={renderArticleCard}
        keyExtractor={(item) => item.id.toString()}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={styles.listContent}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#12396B"
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.1}
        ListEmptyComponent={renderEmptyState}
        ListFooterComponent={
          hasMore && !refreshing && loading ? (
            <View style={styles.loadMoreContainer}>
              <ActivityIndicator color="#12396B" size="small" />
            </View>
          ) : null
        }
      />

      {error && articles.length > 0 && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{error}</Text>
          <TouchableOpacity onPress={handleRetry}>
            <Text style={styles.errorBannerAction}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.BACKGROUND },
  listContent: { paddingBottom: 110, paddingTop: 8 },

  // ── TOP BAR ──
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 24,
    minHeight: 136,
    marginBottom: 16,
    backgroundColor: THEME.BRAND_DARK,
  },
  heroCaption: { color: '#D2E1ED', fontSize: 13, fontWeight: '500', marginTop: 7 },
  greetingSub: {
    fontSize: 12,
    color: '#9FB7C9',
    fontWeight: '700',
    marginBottom: 2,
    letterSpacing: 0.3,
  },
  greetingName: {
    fontFamily: FONT_DISPLAY,
    fontSize: 29,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.6,
  },
  logoMini: { width: 44, height: 44 },

  // ── SEARCH ──
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.WHITE,
    borderWidth: 1,
    borderColor: THEME.BORDER,
    borderRadius: 4,
    paddingHorizontal: 16,
    height: 48,
    gap: 10,
  },
  advancedSearchButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
    backgroundColor: THEME.WHITE,
    borderWidth: 1,
    borderColor: THEME.BORDER,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: THEME.TEXT_PRIMARY,
    padding: 0,
  },

  // ── CATEGORIES ──
  categoryScrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 16,
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 100,
    borderWidth: 1.5,
    borderColor: THEME.BORDER,
    backgroundColor: THEME.SURFACE,
    marginRight: 8,
  },
  categoryChipActive: {
    backgroundColor: THEME.BRAND_GREEN,
    borderColor: THEME.BRAND_GREEN,
  },
  categoryChipIcon: { fontSize: 14 },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.TEXT_PRIMARY,
  },
  categoryChipTextActive: { color: '#F6F7F3' },

  // ── SECTION HEADER ──
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 14,
    paddingTop: 4,
  },
  sectionTitle: {
    fontFamily: FONT_DISPLAY,
    fontSize: 18,
    fontWeight: '800',
    color: THEME.TEXT_PRIMARY,
    letterSpacing: -0.3,
  },
  sectionLink: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.BRAND_BLUE,
  },

  // ── FEATURED CARD ──
  featuredCard: {
    marginHorizontal: 24,
    marginBottom: 24,
    overflow: 'hidden',
  },
  featuredImage: {
    width: '100%',
    height: 190,
  },
  featuredImagePlaceholder: {
    width: '100%',
    height: 190,
    backgroundColor: '#DDF1F0',
    justifyContent: 'flex-end',
    padding: 12,
  },
  featuredBadgeWrap: { alignSelf: 'flex-start' },
  featuredBadge: {
    backgroundColor: '#087B84',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  featuredBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  featuredBody: { paddingHorizontal: 2, paddingTop: 17, paddingBottom: 19, borderBottomWidth: 1, borderBottomColor: 'rgba(18,57,107,0.12)' },
  featuredCat: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.BRAND_BLUE,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  featuredTitle: {
    fontFamily: FONT_DISPLAY,
    fontSize: 18,
    fontWeight: '800',
    color: THEME.TEXT_PRIMARY,
    lineHeight: 25,
    marginBottom: 10,
  },
  featuredSummary: {
    fontSize: 13,
    color: THEME.TEXT_SECONDARY,
    lineHeight: 20,
    marginBottom: 16,
  },
  featuredFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  authorAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: THEME.BRAND_DARK,
    alignItems: 'center',
    justifyContent: 'center',
  },
  authorAvatarText: { fontSize: 12, fontWeight: '800', color: '#FFFFFF' },
  authorName: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.TEXT_PRIMARY,
    maxWidth: 120,
  },
  authorNameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  readTime: { fontSize: 11, color: '#61748A', marginTop: 1 },
  statsRow: { flexDirection: 'row', gap: 12 },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statText: { fontSize: 11, color: '#61748A', fontWeight: '500' },

  // ── LIST CARD ──
  listCard: {
    flexDirection: 'row',
    overflow: 'hidden',
    marginHorizontal: 24,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(18,57,107,0.10)',
  },
  listCardImage: {
    width: 92,
    height: 112,
    backgroundColor: 'rgba(8,123,132,0.10)',
    borderRadius: 0,
  },
  listCardImagePlaceholder: {
    width: 92,
    height: 112,
    backgroundColor: 'rgba(8,123,132,0.08)',
    borderRadius: 0,
  },
  listCardBody: {
    flex: 1,
    paddingLeft: 12,
    paddingVertical: 2,
    justifyContent: 'space-between',
  },
  listCardCat: {
    fontSize: 10,
    fontWeight: '800',
    color: '#12396B',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  listCardTitle: {
    fontFamily: FONT_DISPLAY,
    fontSize: 14,
    fontWeight: '800',
    color: THEME.TEXT_PRIMARY,
    lineHeight: 20,
  },
  listCardSummary: { color: THEME.TEXT_SECONDARY, fontSize: 11, lineHeight: 15, marginTop: 4 },
  listCardMeta: {
    marginTop: 7,
    gap: 5,
  },
  listCardAuthorRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  listCardStats: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  listCardAuthor: {
    fontSize: 11,
    color: THEME.TEXT_SECONDARY,
    fontWeight: '600',
    maxWidth: 170,
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#D2DCE7',
    marginHorizontal: 6,
  },
  listCardTime: {
    fontSize: 11,
    color: '#61748A',
  },

  // ── STATES ──
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: THEME.TEXT_SECONDARY, fontSize: 14, marginTop: 12, fontWeight: '500' },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, paddingHorizontal: 20 },
  emptyStateTitle: { fontSize: 17, fontWeight: '700', color: THEME.TEXT_PRIMARY, marginTop: 16, marginBottom: 8 },
  emptyStateText: { fontSize: 14, color: THEME.TEXT_SECONDARY, textAlign: 'center' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  errorTitle: { fontSize: 17, fontWeight: '700', color: THEME.TEXT_PRIMARY, marginTop: 16, marginBottom: 8 },
  errorText: { fontSize: 14, color: THEME.TEXT_SECONDARY, textAlign: 'center', marginBottom: 24 },
  retryButton: { backgroundColor: '#087B84', paddingHorizontal: 24, paddingVertical: 13, borderRadius: 14 },
  retryButtonText: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },
  loadMoreContainer: { paddingVertical: 20, alignItems: 'center' },
  errorBanner: {
    backgroundColor: COLORS.ERROR_RED + '15',
    borderTopWidth: 1,
    borderTopColor: COLORS.ERROR_RED,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  errorBannerText: { color: THEME.TEXT_PRIMARY, fontSize: 12, flex: 1, fontWeight: '500' },
  errorBannerAction: { color: '#12396B', fontWeight: '600', fontSize: 12, marginLeft: 12 },
});

export default HomeScreen;
