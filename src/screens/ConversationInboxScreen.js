import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, RefreshControl, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { communityAPI, resolveMediaUrl } from '../api/client';
import { FONT_DISPLAY } from '../theme/typography';
import { COLORS as THEME } from '../theme/colors';

const formatConversationTime = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const today = new Date();
  if (date.toDateString() === today.toDateString()) {
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

const getInitials = (name) => name?.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'IN';

const ConversationInboxScreen = ({ navigation, route }) => {
  const isChatsTab = route.name === 'ChatsTab';
  const isFocused = useIsFocused();
  const [conversations, setConversations] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setConversations(await communityAPI.listConversations());
    } catch (error) {
      Alert.alert('Messages unavailable', error.response?.data?.message || 'Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { if (isFocused) load(); }, [isFocused, load]);

  const visibleConversations = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return conversations;
    return conversations.filter((item) => [item.other_user_name, item.article_title, item.article_category_name, item.last_message]
      .some((value) => value?.toLowerCase().includes(query)));
  }, [conversations, search]);

  const openConversation = (item) => navigation.navigate('ConversationThread', {
    conversationId: item.id,
    title: item.other_user_name,
    articleTitle: item.article_title,
    participantProfileImage: item.other_user_profile_image,
    participantIsExpert: item.other_user_is_expert,
    participantVerified: item.other_user_verified,
  });

  const renderItem = ({ item }) => {
    const timestamp = item.last_message_at || item.updated_at;
    return (
      <TouchableOpacity
        style={styles.conversationRow}
        activeOpacity={0.72}
        onPress={() => openConversation(item)}
        accessibilityRole="button"
        accessibilityLabel={`Conversation with ${item.other_user_name} about ${item.article_title}`}
      >
        <View style={styles.avatar}>
          {item.other_user_profile_image
            ? <Image source={{ uri: resolveMediaUrl(item.other_user_profile_image) }} style={styles.avatarImage} />
            : <Text style={styles.avatarText}>{getInitials(item.other_user_name)}</Text>}
          {item.other_user_is_expert ? <View style={styles.expertDot}><Feather name="shield" size={9} color={THEME.WHITE} /></View> : null}
        </View>

        <View style={styles.conversationContent}>
          <View style={styles.nameLine}>
            <Text style={styles.name} numberOfLines={1}>{item.other_user_name}</Text>
            {item.other_user_verified ? <Feather name="check-circle" size={14} color="#1D9BF0" /> : null}
            <Text style={styles.date}>{formatConversationTime(timestamp)}</Text>
          </View>
          <View style={styles.contextLine}>
            <Feather name="file-text" size={12} color={THEME.BRAND_BLUE} />
            {item.article_category_name ? <Text style={styles.category}>{item.article_category_name}</Text> : null}
            <Text style={styles.article} numberOfLines={1}>{item.article_title}</Text>
          </View>
          <Text style={styles.preview} numberOfLines={1}>
            {item.last_message || 'Ask a question about this article'}
          </Text>
        </View>
        <Feather name="chevron-right" size={18} color={THEME.TEXT_MUTED} />
      </TouchableOpacity>
    );
  };

  const listEmpty = () => {
    const hasSearch = Boolean(search.trim());
    return (
      <View style={styles.empty}>
        <View style={styles.emptyIcon}><Feather name={hasSearch ? 'search' : 'message-circle'} size={25} color={THEME.BRAND_BLUE} /></View>
        <Text style={styles.emptyTitle}>{hasSearch ? 'No matching conversations' : 'Your conversations will appear here'}</Text>
        <Text style={styles.emptyText}>{hasSearch
          ? 'Try searching by a person, article, or message.'
          : 'Start a conversation from an expert’s article to ask a question and keep the discussion in one place.'}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.hero}>
        {!isChatsTab ? <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}><Feather name="arrow-left" size={18} color={THEME.WHITE} /></TouchableOpacity> : null}
        <View style={styles.heroTopline}>
          <View style={styles.heroMark}><Feather name="message-circle" size={17} color={THEME.WHITE} /></View>
          <Text style={styles.eyebrow}>IN4 · PRIVATE DISCUSSIONS</Text>
        </View>
        <Text style={styles.heading}>Your conversations</Text>
        <Text style={styles.subheading}>Questions and follow-ups connected to expert articles.</Text>
        <View style={styles.countStrip}>
          <Text style={styles.count}>{conversations.length}</Text>
          <Text style={styles.countLabel}>{conversations.length === 1 ? 'conversation' : 'conversations'}</Text>
          <View style={styles.countRule} />
          <Text style={styles.countHint}>with article context</Text>
        </View>
      </View>

      <View style={styles.searchWrap}>
        <Feather name="search" size={17} color={THEME.TEXT_MUTED} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search people, articles, messages"
          placeholderTextColor={THEME.TEXT_MUTED}
          returnKeyType="search"
          accessibilityLabel="Search conversations"
        />
        {search ? <TouchableOpacity onPress={() => setSearch('')} hitSlop={8}><Feather name="x-circle" size={17} color={THEME.TEXT_MUTED} /></TouchableOpacity> : null}
      </View>

      <View style={styles.listHeading}>
        <Text style={styles.listTitle}>{search ? 'Search results' : 'Recent conversations'}</Text>
        {refreshing ? <ActivityIndicator size="small" color={THEME.BRAND_BLUE} /> : null}
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={THEME.BRAND_BLUE} /><Text style={styles.loadingText}>Loading conversations…</Text></View>
      ) : (
        <FlatList
          data={visibleConversations}
          renderItem={renderItem}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={[styles.list, !visibleConversations.length && styles.listEmptyContent]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={THEME.BRAND_BLUE} />}
          ListEmptyComponent={listEmpty}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.BACKGROUND },
  hero: { paddingHorizontal: 22, paddingTop: 20, paddingBottom: 22, backgroundColor: THEME.BRAND_DARK },
  back: { width: 36, height: 36, marginBottom: 12, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  heroTopline: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 14 },
  heroMark: { width: 34, height: 34, borderRadius: 4, backgroundColor: THEME.BRAND_BLUE, alignItems: 'center', justifyContent: 'center' },
  eyebrow: { color: '#AFC5D6', fontSize: 10, fontWeight: '800', letterSpacing: 1.1 },
  heading: { fontFamily: FONT_DISPLAY, fontSize: 28, fontWeight: '800', color: THEME.WHITE, letterSpacing: -0.4 },
  subheading: { color: '#D2E1ED', fontSize: 13, lineHeight: 19, marginTop: 5, maxWidth: 320 },
  countStrip: { flexDirection: 'row', alignItems: 'center', marginTop: 19, paddingTop: 13, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.16)' },
  count: { color: THEME.WHITE, fontFamily: FONT_DISPLAY, fontSize: 19, fontWeight: '800', marginRight: 7 },
  countLabel: { color: THEME.WHITE, fontSize: 12, fontWeight: '700' },
  countRule: { height: 16, width: 1, backgroundColor: 'rgba(255,255,255,0.25)', marginHorizontal: 11 },
  countHint: { color: '#AFC5D6', fontSize: 11 },
  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 20, marginTop: 18, marginBottom: 20, paddingHorizontal: 13, minHeight: 48, backgroundColor: THEME.WHITE, borderBottomWidth: 1, borderColor: THEME.BORDER },
  searchInput: { flex: 1, minWidth: 0, paddingVertical: 11, color: THEME.TEXT_PRIMARY, fontSize: 13 },
  listHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 22, paddingBottom: 8 },
  listTitle: { color: THEME.TEXT_PRIMARY, fontFamily: FONT_DISPLAY, fontSize: 17, fontWeight: '800' },
  list: { paddingHorizontal: 20, paddingBottom: 24, flexGrow: 1 },
  conversationRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: THEME.SEPARATOR },
  avatar: { width: 52, height: 52, borderRadius: 14, backgroundColor: THEME.PALE_BLUE, alignItems: 'center', justifyContent: 'center', overflow: 'visible' },
  avatarImage: { width: '100%', height: '100%', borderRadius: 14 },
  avatarText: { color: THEME.BRAND_DARK, fontFamily: FONT_DISPLAY, fontSize: 16, fontWeight: '800' },
  expertDot: { position: 'absolute', width: 19, height: 19, right: -4, bottom: -3, borderRadius: 10, backgroundColor: THEME.BRAND_BLUE, borderWidth: 2, borderColor: THEME.BACKGROUND, alignItems: 'center', justifyContent: 'center' },
  conversationContent: { flex: 1, minWidth: 0 },
  nameLine: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  name: { flexShrink: 1, color: THEME.TEXT_PRIMARY, fontSize: 14, fontWeight: '800' },
  date: { marginLeft: 'auto', color: THEME.TEXT_MUTED, fontSize: 10 },
  contextLine: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 5 },
  category: { color: THEME.BRAND_BLUE, fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  article: { flex: 1, color: THEME.TEXT_SECONDARY, fontSize: 11, fontWeight: '600' },
  preview: { color: THEME.TEXT_MUTED, fontSize: 12, marginTop: 5 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: THEME.TEXT_SECONDARY, fontSize: 12, marginTop: 10 },
  listEmptyContent: { flexGrow: 1 },
  empty: { flex: 1, minHeight: 260, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
  emptyIcon: { width: 54, height: 54, backgroundColor: THEME.PALE_BLUE, alignItems: 'center', justifyContent: 'center', marginBottom: 15 },
  emptyTitle: { fontFamily: FONT_DISPLAY, color: THEME.TEXT_PRIMARY, fontSize: 17, fontWeight: '800', textAlign: 'center' },
  emptyText: { color: THEME.TEXT_SECONDARY, fontSize: 13, lineHeight: 20, marginTop: 7, textAlign: 'center' },
});

export default ConversationInboxScreen;
