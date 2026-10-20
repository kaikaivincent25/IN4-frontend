import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { articleAPI, engagementAPI, resolveMediaUrl } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { FONT_DISPLAY } from '../theme/typography';
import { COLORS as THEME } from '../theme/colors';

const LibraryScreen = ({ navigation, route }) => {
  const { user } = useAuth();
  const [section, setSection] = useState(route.params?.section || 'history');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const canManageDrafts = Boolean(user?.is_provider);

  useEffect(() => {
    if (route.params?.section) setSection(route.params.section);
  }, [route.params?.section]);

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const response = section === 'drafts'
        ? await articleAPI.listDrafts()
        : section === 'revisions'
          ? await articleAPI.getMyRevisions()
          : await engagementAPI.getReadHistory();
      setItems(response.results || []);
    } catch (error) {
      Alert.alert('Unable to load', error.response?.data?.detail || 'Please check your connection and try again.');
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [section]);

  useEffect(() => { loadItems(); }, [loadItems]);

  const confirmDelete = (draft) => Alert.alert(
    'Delete draft?',
    `“${draft.title || 'Untitled draft'}” will be permanently deleted.`,
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        setDeletingId(draft.id);
        try {
          await articleAPI.deleteDraft(draft.id);
          setItems((current) => current.filter((item) => item.id !== draft.id));
        } catch (error) {
          Alert.alert('Unable to delete draft', error.response?.data?.detail || 'Please try again.');
        } finally { setDeletingId(null); }
      } },
    ],
  );

  const renderItem = ({ item }) => {
    const draft = section === 'drafts';
    const revision = section === 'revisions';
    const article = draft ? null : item.article;
    if (revision) {
      const statusColor = item.status === 'approved' ? THEME.BRAND_GREEN : item.status === 'rejected' ? THEME.ERROR_RED : THEME.WARNING;
      return (
        <View style={styles.card}>
          <View style={styles.cardTop}>
            <View style={styles.icon}><Feather name="git-pull-request" size={17} color={statusColor} /></View>
            <Text style={[styles.cardMeta, { color: statusColor, fontWeight: '800', textTransform: 'capitalize' }]}>{item.status}</Text>
            <Text style={styles.cardMeta}>{new Date(item.created_at).toLocaleDateString()}</Text>
          </View>
          <Text style={styles.title} numberOfLines={2}>{item.article_title}</Text>
          <Text style={styles.subtitle}>Your proposed title: {item.title}</Text>
          <Text style={styles.subtitle}>Reason: {item.change_note}</Text>
          {item.reviewer_note ? <Text style={styles.reviewNote}>Reviewer: {item.reviewer_note}</Text> : null}
          {item.status === 'pending' ? <Text style={styles.pendingNote}>The published article remains unchanged while your edit is reviewed.</Text> : null}
        </View>
      );
    }
    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.82}
        onPress={() => draft
          ? navigation.navigate('ArticlePublish', { draftId: item.id })
          : navigation.navigate('ArticleDetail', { slug: article.slug, article })}
      >
        <View style={styles.cardTop}>
          <View style={styles.icon}><Feather name={draft ? 'edit-3' : 'clock'} size={17} color={THEME.BRAND_BLUE} /></View>
          <Text style={styles.cardMeta}>{draft ? `Draft · ${item.progress || 0}% complete` : new Date(item.read_at).toLocaleDateString()}</Text>
          {draft && <TouchableOpacity onPress={() => confirmDelete(item)} disabled={deletingId === item.id} hitSlop={10}>
            {deletingId === item.id ? <ActivityIndicator size="small" color={THEME.ERROR_RED} /> : <Feather name="trash-2" size={17} color={THEME.ERROR_RED} />}
          </TouchableOpacity>}
        </View>
        {!draft && article?.featured_image ? <Image source={{ uri: resolveMediaUrl(article.featured_image) }} style={styles.articleImage} resizeMode="cover" /> : null}
        <Text style={styles.title} numberOfLines={2}>{draft ? (item.title || 'Untitled draft') : article?.title}</Text>
        <Text style={styles.subtitle} numberOfLines={2}>{draft ? `Last edited ${new Date(item.updated_at).toLocaleString()}` : (article?.summary || '')}</Text>
        {!draft ? <View style={styles.authorRow}>
          <Text style={styles.authorName} numberOfLines={1}>{article?.author_name}</Text>
          {article?.author_verified ? <Feather name="check-circle" size={13} color="#1D9BF0" /> : null}
          <Text style={styles.articleStats}>{article?.reading_time} min read · {article?.view_count} views</Text>
        </View> : null}
        <View style={styles.openRow}><Text style={styles.openText}>{draft ? 'Continue editing' : 'Read again'}</Text><Feather name="arrow-up-right" size={15} color={THEME.BRAND_GREEN} /></View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}><Feather name="arrow-left" size={19} color={THEME.WHITE} /></TouchableOpacity>
        <Text style={styles.heading}>Your Library</Text>
      </View>
      <View style={styles.tabs}>
        {[{ key: 'history', label: 'Reading history', icon: 'clock' }, ...(canManageDrafts ? [{ key: 'drafts', label: 'My drafts', icon: 'edit-3' }, { key: 'revisions', label: 'My edits', icon: 'git-pull-request' }] : [])].map((tab) => (
          <TouchableOpacity key={tab.key} style={[styles.tab, section === tab.key && styles.activeTab]} onPress={() => setSection(tab.key)}>
            <Feather name={tab.icon} size={15} color={section === tab.key ? '#fff' : THEME.TEXT_SECONDARY} />
            <Text style={[styles.tabText, section === tab.key && styles.activeTabText]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {loading && !refreshing ? <View style={styles.center}><ActivityIndicator size="large" color={THEME.BRAND_BLUE} /></View> : (
        <FlatList
          data={items}
          renderItem={renderItem}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadItems(); }} tintColor={THEME.BRAND_BLUE} />}
          ListEmptyComponent={<View style={styles.empty}><Feather name={section === 'drafts' ? 'edit-3' : section === 'revisions' ? 'git-pull-request' : 'clock'} size={38} color={THEME.TEXT_TERTIARY} /><Text style={styles.emptyTitle}>{section === 'drafts' ? 'No drafts yet' : section === 'revisions' ? 'No proposed edits yet' : 'No reading history yet'}</Text><Text style={styles.emptyText}>{section === 'drafts' ? 'Your saved article drafts will appear here.' : section === 'revisions' ? 'The review status of your published article edits will appear here.' : 'Articles you open will be collected here for easy access.'}</Text></View>}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.BACKGROUND },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 22, paddingVertical: 20, gap: 14, backgroundColor: THEME.BRAND_DARK },
  back: { width: 38, height: 38, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  heading: { fontFamily: FONT_DISPLAY, fontSize: 27, fontWeight: '800', color: THEME.WHITE },
  tabs: { flexDirection: 'row', gap: 10, paddingHorizontal: 22, paddingBottom: 12 },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: THEME.SURFACE, borderWidth: 1, borderColor: THEME.BORDER },
  activeTab: { backgroundColor: THEME.BRAND_BLUE, borderColor: THEME.BRAND_BLUE },
  tabText: { fontSize: 13, fontWeight: '700', color: THEME.TEXT_SECONDARY },
  activeTabText: { color: '#fff' },
  list: { paddingHorizontal: 22, paddingTop: 8, paddingBottom: 32, flexGrow: 1 },
  card: { backgroundColor: 'transparent', borderBottomWidth: 1, borderBottomColor: THEME.SEPARATOR, paddingVertical: 17, marginBottom: 2 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 12 },
  icon: { width: 31, height: 31, borderRadius: 10, backgroundColor: THEME.PALE_GREEN, alignItems: 'center', justifyContent: 'center' },
  cardMeta: { flex: 1, color: THEME.TEXT_MUTED, fontSize: 12, fontWeight: '600' },
  title: { fontFamily: FONT_DISPLAY, color: THEME.TEXT_PRIMARY, fontSize: 17, lineHeight: 23, fontWeight: '800', marginBottom: 6 },
  articleImage: { width: '100%', height: 170, borderRadius: 0, marginBottom: 12, backgroundColor: THEME.SURFACE_ALT },
  subtitle: { color: THEME.TEXT_SECONDARY, fontSize: 13, lineHeight: 19 },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 11 },
  authorName: { color: THEME.TEXT_PRIMARY, fontSize: 12, fontWeight: '700', maxWidth: 135 },
  articleStats: { color: THEME.TEXT_MUTED, fontSize: 11, marginLeft: 'auto' },
  openRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 14 },
  openText: { color: THEME.BRAND_GREEN, fontSize: 13, fontWeight: '700' },
  reviewNote: { color: THEME.TEXT_PRIMARY, fontSize: 13, lineHeight: 19, backgroundColor: THEME.SURFACE_ALT, padding: 10, borderRadius: 10, marginTop: 9 },
  pendingNote: { color: THEME.TEXT_SECONDARY, fontSize: 12, lineHeight: 18, marginTop: 9 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, minHeight: 300 },
  emptyTitle: { fontFamily: FONT_DISPLAY, marginTop: 14, color: THEME.TEXT_PRIMARY, fontSize: 18, fontWeight: '800' },
  emptyText: { marginTop: 7, textAlign: 'center', color: THEME.TEXT_SECONDARY, fontSize: 14, lineHeight: 21 },
});

export default LibraryScreen;
