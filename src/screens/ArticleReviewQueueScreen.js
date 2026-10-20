import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, RefreshControl, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { articleAPI } from '../api/client';
import { FONT_DISPLAY } from '../theme/typography';
import { COLORS as THEME } from '../theme/colors';

const ArticleReviewQueueScreen = ({ navigation }) => {
  const [revisions, setRevisions] = useState([]);
  const [notes, setNotes] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reviewingId, setReviewingId] = useState(null);

  const loadQueue = useCallback(async () => {
    try {
      const response = await articleAPI.getReviewQueue();
      setRevisions(response.results || []);
    } catch (error) {
      Alert.alert('Review queue unavailable', error.response?.data?.message || 'Only staff reviewers can access pending edits. Please try again later.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadQueue(); }, [loadQueue]);

  const review = (revision, status) => {
    const approved = status === 'approved';
    if (!approved && !(notes[revision.id] || '').trim()) {
      Alert.alert('Add a reviewer note', 'A short explanation is required when rejecting an edit so the expert knows what needs to change.');
      return;
    }
    Alert.alert(
      approved ? 'Approve and publish these changes?' : 'Reject these proposed changes?',
      approved
        ? 'This will immediately replace the live article with the proposed version. The previous version will be retained in the revision history for audit.'
        : 'The current published article will stay live. The expert will see your reviewer note, if provided.',
      [
        { text: 'Go back', style: 'cancel' },
        { text: approved ? 'Approve changes' : 'Reject changes', style: approved ? 'default' : 'destructive', onPress: async () => {
          setReviewingId(revision.id);
          try {
            await articleAPI.reviewRevision(revision.id, status, notes[revision.id] || '');
            setRevisions((current) => current.filter((item) => item.id !== revision.id));
          } catch (error) {
            Alert.alert('Review not saved', error.response?.data?.message || 'This edit may already have been reviewed. Refresh the queue and try again.');
          } finally { setReviewingId(null); }
        } },
      ],
    );
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeading}>
        <View style={styles.badge}><Feather name="shield" size={13} color={THEME.BRAND_GREEN} /><Text style={styles.badgeText}>Pending review</Text></View>
        <Text style={styles.date}>{new Date(item.created_at).toLocaleDateString()}</Text>
      </View>
      <Text style={styles.articleTitle}>{item.article_title}</Text>
      <Text style={styles.byline}>Proposed by {item.author_name}</Text>
      <View style={styles.changeNote}>
        <Text style={styles.label}>Expert's reason for the change</Text>
        <Text style={styles.note}>{item.change_note}</Text>
      </View>
      <View style={styles.version}>
        <Text style={styles.versionLabel}>CURRENT VERSION · LIVE</Text>
        <Text style={styles.versionTitle}>{item.current_title}</Text>
        <Text style={styles.summary}>{item.current_summary}</Text>
        <Text style={styles.versionBody} numberOfLines={5}>{item.current_body}</Text>
      </View>
      <View style={[styles.version, styles.proposedVersion]}>
        <Text style={styles.proposedLabel}>PROPOSED VERSION · NOT LIVE</Text>
        <Text style={styles.versionTitle}>{item.title}</Text>
        <Text style={styles.summary}>{item.summary}</Text>
        <Text style={styles.versionBody} numberOfLines={7}>{item.body}</Text>
      </View>
      <Text style={styles.label}>Reviewer note (required to reject)</Text>
      <TextInput
        style={styles.input}
        value={notes[item.id] || ''}
        onChangeText={(value) => setNotes((current) => ({ ...current, [item.id]: value }))}
        placeholder="Explain your decision or requested correction…"
        placeholderTextColor={THEME.TEXT_TERTIARY}
        multiline
        maxLength={2000}
      />
      <View style={styles.actions}>
        <TouchableOpacity style={styles.rejectButton} disabled={reviewingId === item.id} onPress={() => review(item, 'rejected')}>
          <Feather name="x" size={16} color={THEME.ERROR_RED} /><Text style={styles.rejectText}>{reviewingId === item.id ? 'Saving…' : 'Reject'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.approveButton} disabled={reviewingId === item.id} onPress={() => review(item, 'approved')}>
          {reviewingId === item.id ? <ActivityIndicator size="small" color="#fff" /> : <Feather name="check" size={16} color="#fff" />}
          <Text style={styles.approveText}>Approve & publish</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}><Feather name="arrow-left" size={19} color={THEME.WHITE} /></TouchableOpacity>
        <View style={{ flex: 1 }}><Text style={styles.heading}>Article Review</Text><Text style={styles.subheading}>Compare proposed edits with the live version</Text></View>
      </View>
      {loading ? <View style={styles.center}><ActivityIndicator size="large" color={THEME.BRAND_BLUE} /></View> : (
        <FlatList
          data={revisions}
          renderItem={renderItem}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadQueue(); }} tintColor={THEME.BRAND_BLUE} />}
          ListEmptyComponent={<View style={styles.empty}><Feather name="check-circle" size={40} color={THEME.BRAND_GREEN} /><Text style={styles.emptyTitle}>Queue is clear</Text><Text style={styles.emptyText}>New proposed article edits will appear here.</Text></View>}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.BACKGROUND },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 22, paddingVertical: 20, gap: 14, backgroundColor: THEME.BRAND_DARK },
  back: { width: 38, height: 38, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  heading: { fontFamily: FONT_DISPLAY, fontSize: 26, fontWeight: '800', color: THEME.WHITE },
  subheading: { fontSize: 12, color: '#D2E1ED', marginTop: 3 },
  list: { paddingHorizontal: 20, paddingBottom: 30, flexGrow: 1 },
  card: { backgroundColor: 'transparent', borderBottomWidth: 1, borderBottomColor: 'rgba(18,57,107,0.12)', paddingVertical: 18, marginBottom: 4 },
  cardHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: THEME.PALE_GREEN, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  badgeText: { color: THEME.BRAND_GREEN, fontSize: 11, fontWeight: '800' },
  date: { color: THEME.TEXT_MUTED, fontSize: 12 },
  articleTitle: { fontFamily: FONT_DISPLAY, color: THEME.TEXT_PRIMARY, fontSize: 19, fontWeight: '800', lineHeight: 25 },
  byline: { color: THEME.TEXT_SECONDARY, fontSize: 13, marginTop: 4, marginBottom: 13 },
  changeNote: { paddingVertical: 12, paddingHorizontal: 0, borderRadius: 0, borderTopWidth: 1, borderBottomWidth: 1, borderColor: THEME.SEPARATOR, backgroundColor: 'transparent', marginBottom: 13 },
  label: { color: THEME.TEXT_MUTED, fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 },
  note: { color: THEME.TEXT_PRIMARY, fontSize: 13, lineHeight: 19 },
  version: { paddingVertical: 12, paddingHorizontal: 0, borderRadius: 0, borderWidth: 0, borderTopWidth: 1, borderColor: THEME.SEPARATOR, marginBottom: 10 },
  proposedVersion: { backgroundColor: 'transparent', borderColor: THEME.BRAND_GREEN },
  versionLabel: { color: THEME.TEXT_MUTED, fontSize: 10, fontWeight: '900', marginBottom: 7 },
  proposedLabel: { color: THEME.BRAND_GREEN, fontSize: 10, fontWeight: '900', marginBottom: 7 },
  versionTitle: { fontFamily: FONT_DISPLAY, color: THEME.TEXT_PRIMARY, fontSize: 15, fontWeight: '800', marginBottom: 6 },
  summary: { color: THEME.TEXT_SECONDARY, fontSize: 13, fontWeight: '600', lineHeight: 19, marginBottom: 7 },
  versionBody: { color: THEME.TEXT_SECONDARY, fontSize: 12, lineHeight: 18 },
  input: { minHeight: 68, borderColor: THEME.BORDER, borderWidth: 0, borderBottomWidth: 1, borderRadius: 0, backgroundColor: 'transparent', padding: 8, color: THEME.TEXT_PRIMARY, textAlignVertical: 'top', marginBottom: 12 },
  actions: { flexDirection: 'row', gap: 9 },
  rejectButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 15, minHeight: 46, borderWidth: 1, borderColor: THEME.ERROR_RED, borderRadius: 13 },
  rejectText: { color: THEME.ERROR_RED, fontSize: 13, fontWeight: '800' },
  approveButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, minHeight: 46, backgroundColor: THEME.BRAND_GREEN, borderRadius: 13 },
  approveText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 300 },
  emptyTitle: { marginTop: 12, color: THEME.TEXT_PRIMARY, fontSize: 18, fontWeight: '800' },
  emptyText: { marginTop: 5, color: THEME.TEXT_SECONDARY, fontSize: 13 },
});

export default ArticleReviewQueueScreen;
