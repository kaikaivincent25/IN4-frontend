import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Platform, RefreshControl, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { communityAPI } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { FONT_DISPLAY } from '../theme/typography';
import { COLORS as THEME } from '../theme/colors';

const ArticleCommentsScreen = ({ route, navigation }) => {
  const { article } = route.params;
  const { user } = useAuth();
  const [comments, setComments] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const loadComments = useCallback(async () => {
    try {
      const response = await communityAPI.listComments(article.id);
      setComments(response.results || []);
    } catch (error) {
      Alert.alert('Comments unavailable', error.response?.data?.message || 'Please try again later.');
    } finally { setLoading(false); setRefreshing(false); }
  }, [article.id]);

  useEffect(() => { loadComments(); }, [loadComments]);

  const sendComment = useCallback(async () => {
    const content = text.trim();
    if (!content) return;
    setSending(true);
    try {
      const comment = await communityAPI.addComment(article.id, content);
      setComments((current) => [comment, ...current]);
      setText('');
    } catch (error) {
      Alert.alert('Comment not posted', error.response?.data?.message || 'Please try again.');
    } finally { setSending(false); }
  }, [article.id, text]);

  const removeComment = (comment) => Alert.alert(
    'Remove this comment?',
    'This comment will be permanently removed from the article discussion.',
    [
      { text: 'Keep comment', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        setDeletingId(comment.id);
        try {
          await communityAPI.deleteComment(comment.id);
          setComments((current) => current.filter((item) => item.id !== comment.id));
        } catch (error) { Alert.alert('Comment not removed', error.response?.data?.message || 'Please try again.'); }
        finally { setDeletingId(null); }
      } },
    ],
  );

  const renderComment = ({ item }) => (
    <View style={styles.comment}>
      <View style={styles.commentHeading}>
        <View style={styles.avatar}><Text style={styles.avatarText}>{item.author_name?.charAt(0)?.toUpperCase() || 'R'}</Text></View>
        <View style={{ flex: 1 }}><Text style={styles.author}>{item.author_name}</Text><Text style={styles.date}>{new Date(item.created_at).toLocaleString()}</Text></View>
        {(item.user_id === user?.id || article.is_author || user?.is_staff) && (
          <TouchableOpacity onPress={() => removeComment(item)} disabled={deletingId === item.id} hitSlop={10}>
            {deletingId === item.id ? <ActivityIndicator size="small" color={THEME.ERROR_RED} /> : <Feather name="trash-2" size={16} color={THEME.TEXT_MUTED} />}
          </TouchableOpacity>
        )}
      </View>
      <Text style={styles.commentText}>{item.content}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}><Feather name="arrow-left" size={18} color={THEME.WHITE} /></TouchableOpacity>
          <View style={{ flex: 1 }}><Text style={styles.heading}>Discussion</Text><Text style={styles.articleTitle} numberOfLines={1}>{article.title}</Text></View>
        </View>
        <View style={styles.composer}>
          <TextInput style={styles.input} value={text} onChangeText={setText} placeholder="Share a thoughtful comment…" placeholderTextColor={THEME.TEXT_MUTED} multiline maxLength={4000} />
          <TouchableOpacity style={[styles.sendButton, (!text.trim() || sending) && styles.disabled]} onPress={sendComment} disabled={!text.trim() || sending}>
            {sending ? <ActivityIndicator color="#fff" size="small" /> : <Feather name="send" size={17} color="#fff" />}
          </TouchableOpacity>
        </View>
        <Text style={styles.guidance}>Keep the discussion respectful and focused on the article.</Text>
        {loading ? <View style={styles.center}><ActivityIndicator size="large" color={THEME.BRAND_BLUE} /></View> : (
          <FlatList
            data={comments}
            renderItem={renderComment}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.list}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadComments(); }} tintColor={THEME.BRAND_BLUE} />}
            ListEmptyComponent={<View style={styles.empty}><Feather name="message-circle" size={36} color={THEME.TEXT_TERTIARY} /><Text style={styles.emptyTitle}>Start the conversation</Text><Text style={styles.emptyText}>Be the first to comment on this article.</Text></View>}
          />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.BACKGROUND },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 18, borderBottomWidth: 1, borderColor: THEME.BORDER, backgroundColor: THEME.BRAND_DARK },
  back: { width: 38, height: 38, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  heading: { color: THEME.WHITE, fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: '800' },
  articleTitle: { color: '#D2E1ED', fontSize: 12, marginTop: 3 },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 9, paddingHorizontal: 18, paddingTop: 16 },
  input: { flex: 1, minHeight: 48, maxHeight: 120, borderRadius: 3, backgroundColor: THEME.WHITE, borderWidth: 0, borderBottomWidth: 1, borderColor: THEME.BORDER, paddingHorizontal: 4, paddingVertical: 12, color: THEME.TEXT_PRIMARY, textAlignVertical: 'top' },
  sendButton: { width: 47, height: 47, borderRadius: 4, backgroundColor: THEME.BRAND_BLUE, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.45 },
  guidance: { color: THEME.TEXT_MUTED, fontSize: 11, paddingHorizontal: 20, paddingTop: 7, paddingBottom: 8 },
  list: { paddingHorizontal: 18, paddingBottom: 24, flexGrow: 1 },
  comment: { backgroundColor: 'transparent', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: THEME.SEPARATOR },
  commentHeading: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  avatar: { width: 35, height: 35, borderRadius: 12, backgroundColor: THEME.PALE_GREEN, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: THEME.BRAND_GREEN, fontWeight: '900' },
  author: { color: THEME.TEXT_PRIMARY, fontSize: 13, fontWeight: '800' },
  date: { color: THEME.TEXT_MUTED, fontSize: 10, marginTop: 2 },
  commentText: { color: THEME.TEXT_SECONDARY, fontSize: 14, lineHeight: 21 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { flex: 1, minHeight: 250, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontFamily: FONT_DISPLAY, color: THEME.TEXT_PRIMARY, fontSize: 17, fontWeight: '800', marginTop: 12 },
  emptyText: { color: THEME.TEXT_SECONDARY, fontSize: 13, marginTop: 5 },
});

export default ArticleCommentsScreen;
