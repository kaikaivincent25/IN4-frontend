import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, RefreshControl, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { FONT_DISPLAY } from '../theme/typography';
import { useAuth } from '../context/AuthContext';
import { COLORS as THEME } from '../theme/colors';
import { expertAPI, resolveMediaUrl } from '../api/client';
import { getVerificationBadge } from '../theme/verificationBadges';

const PRACTICE_FILTERS = [
  { label: 'All professionals', value: '' },
  { label: 'Legal', value: 'lawyer' },
  { label: 'Healthcare', value: 'doctor' },
  { label: 'Finance', value: 'financial_advisor' },
];

export default function ExpertDirectoryScreen({ navigation }) {
  const { user } = useAuth();
  const [experts, setExperts] = useState([]);
  const [search, setSearch] = useState('');
  const [profession, setProfession] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadExperts = useCallback(async () => {
    try {
      const result = await expertAPI.listExperts(profession || null, search.trim() || null);
      setExperts(result.results || result);
      setError('');
    } catch (e) {
      setError(e.response?.data?.message || 'We could not load professionals. Check your connection and try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [profession, search]);

  useEffect(() => {
    const timer = setTimeout(loadExperts, search ? 250 : 0);
    return () => clearTimeout(timer);
  }, [loadExperts]);

  const renderExpert = ({ item, index }) => {
    const badgeColors = getVerificationBadge(item.badge_tier);
    const initials = item.name?.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase();

    return (
      <Animated.View entering={FadeInDown.delay(Math.min(index * 35, 210)).duration(300)}>
        <View style={styles.card}>
          <TouchableOpacity
            onPress={() => navigation.navigate('ExpertProfile', { slug: item.slug })}
            activeOpacity={0.76}
            accessibilityRole="button"
            accessibilityLabel={`${item.name}, ${item.profession_display}, ${item.badge_display || 'verified professional'}`}
          >
          <View style={styles.cardTop}>
            <View style={styles.avatar}>
              {item.profile_image
                ? <Image source={{ uri: resolveMediaUrl(item.profile_image) }} style={styles.avatarImage} />
                : <Text style={styles.avatarText}>{initials || 'IN'}</Text>}
            </View>
            <View style={styles.cardMain}>
              <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.profession} numberOfLines={1}>{item.profession_display}</Text>
              {item.location ? <View style={styles.locationRow}><Feather name="map-pin" size={12} color="#71869A" /><Text style={styles.location} numberOfLines={1}>{item.location}</Text></View> : null}
            </View>
            <Feather name="chevron-right" size={20} color="#71869A" />
          </View>
          {item.bio ? <Text style={styles.bio} numberOfLines={2}>{item.bio}</Text> : null}
          </TouchableOpacity>
          <View style={styles.cardFooter}>
            <View style={[styles.verifiedBadge, { backgroundColor: badgeColors.background, borderColor: badgeColors.border }]}>
              <Feather name={badgeColors.icon} size={14} color={badgeColors.color} />
              <Text style={[styles.verifiedText, { color: badgeColors.color }]}>{item.badge_display || 'Verified professional'}</Text>
            </View>
            {typeof item.article_count === 'number' ? (
              <View style={styles.articleCount}>
                <Feather name="file-text" size={12} color="#71869A" />
                <Text style={styles.articleCountText}>{item.article_count} {item.article_count === 1 ? 'article' : 'articles'}</Text>
              </View>
            ) : null}
            <TouchableOpacity
              style={styles.discussButton}
              onPress={() => navigation.navigate('ExpertProfile', { slug: item.slug, focusComments: true })}
              accessibilityRole="button"
              accessibilityLabel={`Open comments for ${item.name}`}
              hitSlop={8}
            >
              <Feather name="message-circle" size={14} color={THEME.BRAND_BLUE} />
              <Text style={styles.discussText}>Discuss</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={styles.screen}>
      <FlatList
        data={experts}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderExpert}
        contentContainerStyle={styles.content}
        ListHeaderComponent={<>
          <View style={styles.heroPanel}>
            <View style={styles.heroTopRow}>
              <View style={styles.heroMark}><Feather name="compass" size={19} color="#FFFFFF" /></View>
              <Text style={styles.heroEyebrow}>IN4 PROFESSIONAL DIRECTORY</Text>
              <View style={styles.heroSeal}><Feather name="shield" size={16} color="#BBD9F2" /></View>
            </View>
            <Text style={styles.heroGreeting}>{getGreeting()}, {user?.first_name || 'there'}</Text>
            <Text style={styles.title}>Find the right expert.</Text>
            <Text style={styles.subtitle}>Explore professionals whose credentials have been reviewed by IN4.</Text>
            <View style={styles.heroDivider} />
            <View style={styles.heroFootnote}><Feather name="check-circle" size={14} color="#BBD9F2" /><Text style={styles.heroFootnoteText}>Trusted profiles. Clear credentials.</Text></View>
          </View>
          <View style={styles.searchBox}><Feather name="search" size={18} color="#61748A" /><TextInput value={search} onChangeText={setSearch} placeholder="Name, profession, or organization" placeholderTextColor="#8899A8" style={styles.searchInput} returnKeyType="search" /></View>
          <FlatList horizontal data={PRACTICE_FILTERS} keyExtractor={(item) => item.value || 'all'} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters} renderItem={({ item }) => <TouchableOpacity onPress={() => setProfession(item.value)} style={[styles.filter, profession === item.value && styles.filterActive]}><Text style={[styles.filterText, profession === item.value && styles.filterTextActive]}>{item.label}</Text></TouchableOpacity>} />
          <Text style={styles.sectionTitle}>Verified professionals</Text>
        </>}
        ListEmptyComponent={loading ? <ActivityIndicator style={styles.empty} size="large" color="#087B84" /> : <View style={styles.empty}><Text style={styles.emptyTitle}>{error ? 'Directory unavailable' : 'No professionals found yet'}</Text><Text style={styles.emptyText}>{error || 'Try a different search, or check back as more professionals complete verification.'}</Text><TouchableOpacity onPress={() => { setRefreshing(true); loadExperts(); }}><Text style={styles.retry}>Try again</Text></TouchableOpacity></View>}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadExperts(); }} tintColor="#087B84" />}
        />
    </SafeAreaView>
  );
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: THEME.BACKGROUND }, content: { paddingHorizontal: 20, paddingTop: 0, paddingBottom: 28, flexGrow: 1 },
  heroPanel: { marginHorizontal: -20, paddingHorizontal: 24, paddingTop: 18, paddingBottom: 24, marginBottom: 20, backgroundColor: '#173B59', borderBottomLeftRadius: 26, borderBottomRightRadius: 26 },
  heroTopRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 22 },
  heroMark: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#286A9A' },
  heroEyebrow: { marginLeft: 11, flex: 1, color: '#C6D9E9', fontSize: 10, fontWeight: '800', letterSpacing: 1.3 },
  heroSeal: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: 'rgba(198,217,233,0.3)', alignItems: 'center', justifyContent: 'center' },
  heroGreeting: { color: '#BBD0E1', fontSize: 13, fontWeight: '600', marginBottom: 5 },
  title: { fontFamily: FONT_DISPLAY, color: '#FFFFFF', fontSize: 31, lineHeight: 38, fontWeight: '700' },
  subtitle: { color: '#D3E0EA', fontSize: 14, lineHeight: 21, marginTop: 7 },
  heroDivider: { height: 1, backgroundColor: 'rgba(211,224,234,0.2)', marginTop: 18, marginBottom: 12 },
  heroFootnote: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  heroFootnoteText: { color: '#C6D9E9', fontSize: 11, fontWeight: '600' },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, borderWidth: 1, borderColor: THEME.BORDER, paddingHorizontal: 14, height: 50, backgroundColor: THEME.SURFACE }, searchInput: { flex: 1, color: THEME.TEXT_PRIMARY, fontSize: 14 },
  filters: { gap: 8, paddingVertical: 16 }, filter: { backgroundColor: THEME.SURFACE, borderColor: THEME.BORDER, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 24 }, filterActive: { backgroundColor: THEME.BRAND_BLUE, borderColor: THEME.BRAND_BLUE }, filterText: { color: THEME.TEXT_SECONDARY, fontSize: 12, fontWeight: '700' }, filterTextActive: { color: '#F6F7F3' }, sectionTitle: { color: THEME.TEXT_PRIMARY, fontFamily: FONT_DISPLAY, fontSize: 21, fontWeight: '700', marginBottom: 12 },
  card: { backgroundColor: 'transparent', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: THEME.BORDER },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 13 },
  avatar: { width: 64, height: 64, borderRadius: 16, backgroundColor: THEME.PALE_BLUE, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 1, borderColor: THEME.BORDER },
  avatarImage: { width: '100%', height: '100%' },
  avatarText: { color: THEME.BRAND_BLUE, fontWeight: '800', fontSize: 17 },
  cardMain: { flex: 1, minWidth: 0 },
  name: { color: THEME.TEXT_PRIMARY, fontSize: 16, fontWeight: '800' },
  profession: { color: THEME.BRAND_BLUE, fontSize: 12, fontWeight: '700', marginTop: 4 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 5 },
  location: { color: THEME.TEXT_TERTIARY, fontSize: 11, flexShrink: 1 },
  bio: { color: THEME.TEXT_SECONDARY, fontSize: 12, lineHeight: 18, marginTop: 12 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 13 },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: '75%', paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10, borderWidth: 1 },
  verifiedText: { fontSize: 11, fontWeight: '800', flexShrink: 1 },
  articleCount: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  articleCountText: { color: '#71869A', fontSize: 11, fontWeight: '600' },
  discussButton: { flexDirection: 'row', alignItems: 'center', gap: 5, marginLeft: 'auto', paddingVertical: 4 },
  discussText: { color: THEME.BRAND_BLUE, fontSize: 11, fontWeight: '800' },
  empty: { flex: 1, minHeight: 190, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 22 }, emptyTitle: { color: THEME.TEXT_PRIMARY, fontSize: 17, fontWeight: '800', textAlign: 'center' }, emptyText: { color: THEME.TEXT_SECONDARY, textAlign: 'center', fontSize: 13, lineHeight: 20, marginTop: 8 }, retry: { color: THEME.BRAND_GREEN, fontWeight: '800', marginTop: 14 },
});
