import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { communityAPI, resolveMediaUrl } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { FONT_DISPLAY } from '../theme/typography';
import { COLORS as THEME } from '../theme/colors';

const ConversationThreadScreen = ({ route, navigation }) => {
  const { conversationId, title, articleTitle, participantProfileImage, participantVerified } = route.params;
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const listRef = useRef(null);
  const loadingRef = useRef(false);

  const loadMessages = useCallback(async (showErrors = false) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    try {
      const response = await communityAPI.getMessages(conversationId);
      setMessages(response.messages || []);
    } catch (error) {
      if (showErrors) Alert.alert('Messages unavailable', error.response?.data?.message || 'Please try again.');
    } finally { loadingRef.current = false; setLoading(false); }
  }, [conversationId]);

  useEffect(() => {
    loadMessages(true);
    const interval = setInterval(() => loadMessages(false), 5000);
    return () => clearInterval(interval);
  }, [loadMessages]);

  const send = useCallback(async () => {
    const content = text.trim();
    if (!content) return;
    setSending(true);
    try {
      const message = await communityAPI.sendMessage(conversationId, content);
      setMessages((current) => current.some((item) => item.id === message.id) ? current : [...current, message]);
      setText('');
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
    } catch (error) { Alert.alert('Message not sent', error.response?.data?.message || 'Please try again.'); }
    finally { setSending(false); }
  }, [conversationId, text]);

  const renderMessage = ({ item }) => {
    const mine = item.sender_id === user?.id;
    return (
      <View style={[styles.messageRow, mine && styles.myMessageRow]}>
        <View style={[styles.bubble, mine ? styles.myBubble : styles.theirBubble]}>
          {!mine && <Text style={styles.sender}>{item.sender_name}</Text>}
          <Text style={[styles.messageText, mine && styles.myMessageText]}>{item.content}</Text>
          <Text style={[styles.time, mine && styles.myTime]}>{new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}><Feather name="arrow-left" size={18} color={THEME.WHITE} /></TouchableOpacity>
          <View style={styles.avatar}>
            {participantProfileImage
              ? <Image source={{ uri: resolveMediaUrl(participantProfileImage) }} style={styles.avatarImage} />
              : <Text style={styles.avatarInitial}>{title?.charAt(0)?.toUpperCase() || 'U'}</Text>}
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.headingRow}><Text style={styles.heading} numberOfLines={1}>{title}</Text>{participantVerified ? <Feather name="check-circle" size={13} color="#69C4FF" /> : null}</View>
            <Text style={styles.subheading} numberOfLines={1}>Re: {articleTitle}</Text>
          </View>
          <View style={styles.live}><View style={styles.liveDot} /><Text style={styles.liveText}>Chat</Text></View>
        </View>
        <View style={styles.notice}><Feather name="lock" size={13} color={THEME.BRAND_GREEN} /><Text style={styles.noticeText}>Private conversation between you and the article author.</Text></View>
        {loading ? <View style={styles.center}><ActivityIndicator size="large" color={THEME.BRAND_BLUE} /></View> : (
          <FlatList
            ref={listRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.messages}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
            ListEmptyComponent={<View style={styles.empty}><Feather name="message-circle" size={34} color={THEME.TEXT_TERTIARY} /><Text style={styles.emptyTitle}>Start the conversation</Text><Text style={styles.emptyText}>Ask a question about the article.</Text></View>}
          />
        )}
        <View style={styles.composer}>
          <TextInput style={styles.input} value={text} onChangeText={setText} placeholder="Write a message…" placeholderTextColor={THEME.TEXT_MUTED} multiline maxLength={4000} />
          <TouchableOpacity style={[styles.sendButton, (!text.trim() || sending) && styles.disabled]} onPress={send} disabled={!text.trim() || sending}>
            {sending ? <ActivityIndicator color="#fff" size="small" /> : <Feather name="send" size={17} color="#fff" />}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.BACKGROUND },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 15, paddingVertical: 14, backgroundColor: THEME.BRAND_DARK, borderBottomWidth: 1, borderColor: '#31536D' },
  back: { width: 36, height: 36, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 36, height: 36, borderRadius: 13, backgroundColor: THEME.PALE_GREEN, alignItems: 'center', justifyContent: 'center' },
  avatarImage: { width: '100%', height: '100%', borderRadius: 13 },
  avatarInitial: { color: THEME.BRAND_DARK, fontSize: 15, fontWeight: '800' },
  headingRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  heading: { color: THEME.WHITE, fontFamily: FONT_DISPLAY, fontSize: 16, fontWeight: '800' },
  subheading: { color: '#D2E1ED', fontSize: 10, marginTop: 2 },
  live: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: THEME.BRAND_GREEN },
  liveText: { fontSize: 10, color: '#D2E1ED', fontWeight: '700' },
  notice: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 16, paddingVertical: 9, backgroundColor: THEME.PALE_GREEN },
  noticeText: { color: THEME.BRAND_GREEN, fontSize: 11, fontWeight: '600' },
  messages: { paddingHorizontal: 14, paddingVertical: 16, flexGrow: 1, justifyContent: 'flex-end' },
  messageRow: { flexDirection: 'row', justifyContent: 'flex-start', marginBottom: 9 },
  myMessageRow: { justifyContent: 'flex-end' },
  bubble: { maxWidth: '84%', borderRadius: 16, paddingHorizontal: 13, paddingVertical: 9 },
  theirBubble: { backgroundColor: THEME.SURFACE, borderWidth: 1, borderColor: THEME.BORDER, borderBottomLeftRadius: 5 },
  myBubble: { backgroundColor: THEME.BRAND_BLUE, borderBottomRightRadius: 5 },
  sender: { color: THEME.BRAND_GREEN, fontSize: 10, fontWeight: '800', marginBottom: 4 },
  messageText: { color: THEME.TEXT_PRIMARY, fontSize: 14, lineHeight: 20 },
  myMessageText: { color: '#fff' },
  time: { color: THEME.TEXT_MUTED, fontSize: 9, textAlign: 'right', marginTop: 4 },
  myTime: { color: 'rgba(255,255,255,0.75)' },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 9, padding: 13, backgroundColor: THEME.SURFACE, borderTopWidth: 1, borderColor: THEME.BORDER },
  input: { flex: 1, minHeight: 46, maxHeight: 120, borderRadius: 15, backgroundColor: THEME.INPUT_BG, borderWidth: 1, borderColor: THEME.BORDER, paddingHorizontal: 14, paddingVertical: 11, color: THEME.TEXT_PRIMARY, textAlignVertical: 'top' },
  sendButton: { width: 46, height: 46, borderRadius: 15, backgroundColor: THEME.BRAND_BLUE, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.45 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 240 },
  emptyTitle: { fontFamily: FONT_DISPLAY, color: THEME.TEXT_PRIMARY, fontSize: 17, fontWeight: '800', marginTop: 12 },
  emptyText: { color: THEME.TEXT_SECONDARY, fontSize: 12, marginTop: 5 },
});

export default ConversationThreadScreen;
