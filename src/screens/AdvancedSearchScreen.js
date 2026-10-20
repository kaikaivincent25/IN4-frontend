/**
 * AdvancedSearchScreen - Powerful Filtering
 * 
 * FEATURES:
 * 1. Search by keyword
 * 2. Filter by category
 * 3. Filter by profession
 * 4. Sort by (date, views, saves, reading time)
 * 5. Reading time range filter
 * 6. View results in real-time
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  FlatList,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { articleAPI, categoryAPI, resolveMediaUrl } from '../api/client';
import { Feather } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
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
};

const PROFESSIONS = [
  { label: 'Doctor', value: 'doctor' },
  { label: 'Nurse', value: 'nurse' },
  { label: 'Pharmacist', value: 'pharmacist' },
  { label: 'Psychologist', value: 'psychologist' },
  { label: 'Lawyer', value: 'lawyer' },
  { label: 'Accountant', value: 'accountant' },
  { label: 'Financial Advisor', value: 'financial_advisor' },
  { label: 'Cybersecurity Specialist', value: 'cybersecurity' },
  { label: 'Agricultural Specialist', value: 'agricultural' },
  { label: 'Nutritionist', value: 'nutritionist' },
  { label: 'Engineer', value: 'engineer' },
  { label: 'Other', value: 'other' },
];

const SORT_OPTIONS = [
  { label: 'Latest', value: '-published_at' },
  { label: 'Most Viewed', value: '-view_count' },
  { label: 'Most Saved', value: '-save_count' },
  { label: 'Shortest Read', value: 'reading_time' },
  { label: 'Longest Read', value: '-reading_time' },
];

const getCategoryIcon = (iconName) => ({
  heart: 'heart',
  'scale-outline': 'briefcase',
  'trending-up': 'trending-up',
  'shield-checkmark-outline': 'shield',
  'leaf-outline': 'feather',
  'sprout-outline': 'sun',
  'bulb-outline': 'zap',
}[iconName] || 'file-text');

const AdvancedSearchScreen = ({ navigation }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedProfession, setSelectedProfession] = useState(null);
  const [sortBy, setSortBy] = useState('-published_at');
  const [minReadTime, setMinReadTime] = useState('0');
  const [maxReadTime, setMaxReadTime] = useState('60');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

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

  /**
   * Perform advanced search
   */
  const handleSearch = useCallback(async () => {
    setLoading(true);
    setSearched(true);

    try {
      const response = await articleAPI.listArticles(
        selectedCategory,
        searchQuery,
        sortBy,
        1,
        selectedProfession
      );

      // Additional filtering on client side
      let filtered = response.results;

      // Filter by reading time
      const minRt = parseInt(minReadTime) || 0;
      const maxRt = parseInt(maxReadTime) || Infinity;
      filtered = filtered.filter(
        (a) => a.reading_time >= minRt && a.reading_time <= maxRt
      );

      setResults(filtered);
    } catch (err) {
      console.error('Search error', err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedCategory, selectedProfession, sortBy, minReadTime, maxReadTime]);

  /**
   * Clear all filters
   */
  const handleClearFilters = useCallback(() => {
    setSearchQuery('');
    setSelectedCategory(null);
    setSelectedProfession(null);
    setSortBy('-published_at');
    setMinReadTime('0');
    setMaxReadTime('60');
    setResults([]);
    setSearched(false);
  }, []);

  /**
   * Render search result card
   */
  const renderResultCard = ({ item, index }) => (
    <Animated.View entering={FadeInDown.delay(Math.min(index * 30, 180)).duration(280)}>
    <TouchableOpacity
      style={styles.resultCard}
      activeOpacity={0.65}
      onPress={() =>
        navigation.navigate('ArticleDetail', {
          slug: item.slug,
          article: item,
        })
      }
    >
      {item.featured_image ? <Image source={{ uri: resolveMediaUrl(item.featured_image) }} style={styles.resultImage} resizeMode="cover" /> : null}
      <View style={styles.resultCardBody}>
        <Text style={styles.resultCategory}>{item.category_name}</Text>
        <Text style={styles.resultTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.resultSummary} numberOfLines={2}>
          {item.summary}
        </Text>
        <View style={styles.resultMeta}>
          <Text style={styles.resultAuthor}>{item.author_name}</Text>
          {item.author_verified ? <Feather name="check-circle" size={13} color="#1D9BF0" /> : null}
          <View style={styles.metaDot} />
          <Text style={styles.resultTime}>
            {item.reading_time} min read
          </Text>
          <View style={styles.metaDot} />
          <Text style={styles.resultViews}>
            {item.view_count} views
          </Text>
        </View>
      </View>
    </TouchableOpacity>
    </Animated.View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}><Feather name="arrow-left" size={16} color="#D2E1ED" /><Text style={styles.headerBack}>Back</Text></View>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Advanced Search</Text>
      </View>

      <ScrollView
        style={styles.content}
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        {/* Search Input */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Keyword</Text>
          <View style={styles.searchBox}>
            <Feather name="search" size={17} color={COLORS.TEXT_TERTIARY} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search articles, topics, experts…"
              placeholderTextColor={COLORS.TEXT_TERTIARY}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>

        {/* Category Filter */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Category</Text>
          <View style={styles.filterGrid}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.filterChip,
                  selectedCategory === cat.slug && styles.filterChipActive,
                ]}
                onPress={() =>
                  setSelectedCategory(
                    selectedCategory === cat.slug ? null : cat.slug
                  )
                }
              >
                <Feather name={getCategoryIcon(cat.icon_name)} size={14} color={selectedCategory === cat.slug ? "#FFFFFF" : COLORS.BRAND_BLUE} />
                <Text
                  style={[
                    styles.filterChipText,
                    selectedCategory === cat.slug &&
                      styles.filterChipTextActive,
                  ]}
                >
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Profession Filter */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Expert Profession</Text>
          <View style={styles.filterGrid}>
            {PROFESSIONS.map((profession) => (
              <TouchableOpacity
                key={profession.value}
                style={[
                  styles.filterChip,
                  selectedProfession === profession.value && styles.filterChipActive,
                ]}
                onPress={() =>
                  setSelectedProfession(
                    selectedProfession === profession.value ? null : profession.value
                  )
                }
              >
                <Text
                  style={[
                    styles.filterChipText,
                    selectedProfession === profession.value && styles.filterChipTextActive,
                  ]}
                >
                  {profession.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Sort By */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sort By</Text>
          <View style={styles.sortGrid}>
            {SORT_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.sortChip,
                  sortBy === opt.value && styles.sortChipActive,
                ]}
                onPress={() => setSortBy(opt.value)}
              >
                <Text
                  style={[
                    styles.sortChipText,
                    sortBy === opt.value && styles.sortChipTextActive,
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Reading Time Range */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Reading Time (minutes)</Text>
          <View style={styles.rangeRow}>
            <View style={styles.rangeInput}>
              <Text style={styles.rangeLabel}>Min</Text>
              <TextInput
                style={styles.rangeField}
                placeholder="0"
                placeholderTextColor={COLORS.TEXT_TERTIARY}
                value={minReadTime}
                onChangeText={setMinReadTime}
                keyboardType="number-pad"
              />
            </View>
            <Text style={styles.rangeSeparator}>—</Text>
            <View style={styles.rangeInput}>
              <Text style={styles.rangeLabel}>Max</Text>
              <TextInput
                style={styles.rangeField}
                placeholder="60"
                placeholderTextColor={COLORS.TEXT_TERTIARY}
                value={maxReadTime}
                onChangeText={setMaxReadTime}
                keyboardType="number-pad"
              />
            </View>
          </View>
        </View>

        {/* Search/Clear Buttons */}
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.searchButton}
            onPress={handleSearch}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.searchButtonText}>Search</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.clearButton}
            onPress={handleClearFilters}
            disabled={loading}
          >
            <Text style={styles.clearButtonText}>Clear</Text>
          </TouchableOpacity>
        </View>

        {/* Results */}
        {searched && (
          <View style={styles.resultsSection}>
            <Text style={styles.resultsTitle}>
              {results.length} result{results.length !== 1 ? 's' : ''} found
            </Text>

            {results.length === 0 ? (
              <View style={styles.noResults}>
                <Feather name="search" size={42} color={COLORS.TEXT_TERTIARY} style={{ marginBottom: 12 }} />
                <Text style={styles.noResultsText}>
                  No articles match your filters
                </Text>
              </View>
            ) : (
              <FlatList
                data={results}
                renderItem={renderResultCard}
                keyExtractor={(item) => item.id.toString()}
                scrollEnabled={false}
                contentContainerStyle={styles.resultsList}
              />
            )}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
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
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#173B59',
    borderBottomWidth: 1,
    borderBottomColor: '#31536D',
  },
  headerBack: {
    color: '#D2E1ED',
    fontSize: 14,
    fontWeight: '700',
  },
  headerTitle: {
    fontFamily: FONT_DISPLAY,
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
  },

  // ── SECTIONS ──
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#40536B',
    marginBottom: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  // ── SEARCH ──
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F6FA',
    borderWidth: 1.5,
    borderColor: '#D2DCE7',
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 52,
    gap: 12,
  },
  searchIcon: {
    fontSize: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#07152E',
  },

  // ── CATEGORY GRID ──
  filterGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 100,
    borderWidth: 1.5,
    borderColor: '#D2DCE7',
    backgroundColor: '#F3F6FA',
  },
  filterChipActive: {
    backgroundColor: '#087B84',
    borderColor: '#12396B',
  },
  filterChipIcon: {
    fontSize: 14,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#07152E',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },

  // ── SORT GRID ──
  sortGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sortChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 100,
    borderWidth: 1.5,
    borderColor: '#D2DCE7',
    backgroundColor: '#F3F6FA',
  },
  sortChipActive: {
    backgroundColor: '#087B84',
    borderColor: '#12396B',
  },
  sortChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#07152E',
  },
  sortChipTextActive: {
    color: '#FFFFFF',
  },

  // ── RANGE ──
  rangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rangeInput: {
    flex: 1,
  },
  rangeLabel: {
    fontSize: 11,
    color: '#61748A',
    fontWeight: '700',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  rangeField: {
    backgroundColor: '#F3F6FA',
    borderWidth: 1.5,
    borderColor: '#D2DCE7',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#07152E',
  },
  rangeSeparator: {
    fontSize: 16,
    color: '#61748A',
    marginBottom: 12,
  },

  // ── BUTTONS ──
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  searchButton: {
    flex: 1,
    backgroundColor: '#087B84',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  searchButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  clearButton: {
    flex: 1,
    backgroundColor: '#F3F6FA',
    borderWidth: 1.5,
    borderColor: '#D2DCE7',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  clearButtonText: {
    color: '#07152E',
    fontSize: 16,
    fontWeight: '700',
  },

  // ── RESULTS ──
  resultsSection: {
    marginBottom: 24,
  },
  resultsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#40536B',
    marginBottom: 14,
  },
  resultsList: {
    gap: 12,
  },
  resultCard: {
    backgroundColor: 'transparent',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(18,57,107,0.12)',
    overflow: 'hidden',
  },
  resultCardBody: {
    paddingVertical: 16,
  },
  resultImage: { width: '100%', height: 175, borderRadius: 14, marginTop: 12, backgroundColor: THEME.SURFACE_ALT },
  resultCategory: {
    fontSize: 10,
    fontWeight: '800',
    color: '#12396B',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 5,
  },
  resultTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#07152E',
    marginBottom: 7,
    lineHeight: 21,
  },
  resultSummary: {
    fontSize: 12,
    color: '#40536B',
    lineHeight: 18,
    marginBottom: 10,
  },
  resultMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
  },
  resultAuthor: {
    fontSize: 11,
    color: '#61748A',
    fontWeight: '600',
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#D2DCE7',
    marginHorizontal: 5,
  },
  resultTime: {
    fontSize: 11,
    color: '#61748A',
    fontWeight: '600',
  },
  resultViews: {
    fontSize: 11,
    color: '#61748A',
    fontWeight: '600',
  },
  noResults: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noResultsIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  noResultsText: {
    fontSize: 14,
    color: COLORS.TEXT_SECONDARY,
  },
});

export default AdvancedSearchScreen;
