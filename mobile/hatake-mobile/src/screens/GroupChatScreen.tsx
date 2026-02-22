import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '../config';
import { useTheme } from '../context/ThemeContext';

// Use regular View on web to avoid SafeAreaView issues
const Container = Platform.OS === 'web' ? View : SafeAreaView;

interface Message {
  message_id: string;
  sender_id: string;
  sender_name: string;
  sender_picture?: string;
  content: string;
  created_at: string;
}

interface GroupChatScreenProps {
  user: any;
  token: string;
  group: {
    group_id: string;
    name: string;
    image?: string;
    member_count: number | string;
  };
  onClose: () => void;
}

export default function GroupChatScreen({ user, token, group, onClose }: GroupChatScreenProps) {
  const { colors } = useTheme();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchMessages();
    // Poll for new messages every 3 seconds
    pollIntervalRef.current = setInterval(fetchMessages, 3000);
    
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  const getAuthToken = () => {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem('auth_token') || token;
    }
    return token;
  };

  const fetchMessages = async () => {
    try {
      const authToken = getAuthToken();
      const res = await fetch(`${API_URL}/api/groups/${group.group_id}/messages`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (data.success) {
        setMessages(data.messages || []);
      }
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || sending) return;
    
    setSending(true);
    const messageContent = newMessage.trim();
    setNewMessage('');
    
    try {
      const authToken = getAuthToken();
      const res = await fetch(`${API_URL}/api/groups/${group.group_id}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: messageContent }),
      });
      
      const data = await res.json();
      
      if (data.success) {
        // Add message optimistically
        const newMsg: Message = {
          message_id: data.messageId || `temp-${Date.now()}`,
          sender_id: user.user_id,
          sender_name: user.name || 'You',
          sender_picture: user.picture,
          content: messageContent,
          created_at: new Date().toISOString(),
        };
        setMessages(prev => [...prev, newMsg]);
        
        // Scroll to bottom
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    } catch (err) {
      console.error('Send message error:', err);
      setNewMessage(messageContent); // Restore message if failed
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return `Yesterday ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isOwnMessage = item.sender_id === user.user_id;
    const showAvatar = index === 0 || messages[index - 1]?.sender_id !== item.sender_id;
    
    return (
      <View style={[styles.messageRow, isOwnMessage && styles.ownMessageRow]}>
        {!isOwnMessage && (
          <View style={styles.avatarContainer}>
            {showAvatar ? (
              item.sender_picture ? (
                <Image source={{ uri: item.sender_picture }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary }]}>
                  <Text style={styles.avatarText}>
                    {item.sender_name?.charAt(0)?.toUpperCase() || '?'}
                  </Text>
                </View>
              )
            ) : (
              <View style={styles.avatarSpacer} />
            )}
          </View>
        )}
        
        <View style={[styles.messageBubble, isOwnMessage ? [styles.ownBubble, { backgroundColor: colors.primary }] : [styles.otherBubble, { backgroundColor: colors.surface, borderColor: colors.border }]]}>
          {!isOwnMessage && showAvatar && (
            <Text style={[styles.senderName, { color: colors.primary }]}>{item.sender_name}</Text>
          )}
          <Text style={[styles.messageText, isOwnMessage ? styles.ownMessageText : { color: colors.text }]}>
            {item.content}
          </Text>
          <Text style={[styles.messageTime, isOwnMessage ? styles.ownMessageTime : { color: colors.textTertiary }]}>
            {formatTime(item.created_at)}
          </Text>
        </View>
        
        {isOwnMessage && <View style={styles.avatarSpacer} />}
      </View>
    );
  };

  if (loading) {
    return (
      <Container style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>{group.name}</Text>
            <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>{group.member_count} members</Text>
          </View>
          <View style={styles.backButton} />
        </View>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </Container>
    );
  }

  return (
    <Container style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={onClose} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{group.name}</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>{group.member_count} members</Text>
        </View>
        <View style={styles.backButton} />
      </View>

      <KeyboardAvoidingView
        style={styles.chatContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.message_id}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <View style={styles.emptyChat}>
              <Ionicons name="chatbubbles-outline" size={48} color={colors.textTertiary} />
              <Text style={[styles.emptyChatTitle, { color: colors.textSecondary }]}>No messages yet</Text>
              <Text style={[styles.emptyChatSubtitle, { color: colors.textTertiary }]}>Be the first to say hello!</Text>
            </View>
          }
        />

        <View style={[styles.inputContainer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surfaceSecondary, color: colors.text }]}
            placeholder="Type a message..."
            placeholderTextColor={colors.textTertiary}
            value={newMessage}
            onChangeText={setNewMessage}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            style={[styles.sendButton, { backgroundColor: colors.primary }, (!newMessage.trim() || sending) && styles.sendButtonDisabled]}
            onPress={sendMessage}
            disabled={!newMessage.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="send" size={20} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Container>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerInfo: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '600', color: '#1F2937' },
  headerSubtitle: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  
  chatContainer: { flex: 1 },
  messagesList: { padding: 16, flexGrow: 1 },
  
  messageRow: { flexDirection: 'row', marginBottom: 8, alignItems: 'flex-end' },
  ownMessageRow: { flexDirection: 'row-reverse' },
  
  avatarContainer: { width: 32, marginRight: 8 },
  avatar: { width: 28, height: 28, borderRadius: 14 },
  avatarPlaceholder: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#3B82F6', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
  avatarSpacer: { width: 32 },
  
  messageBubble: { maxWidth: '75%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
  otherBubble: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', borderBottomLeftRadius: 4 },
  ownBubble: { backgroundColor: '#3B82F6', borderBottomRightRadius: 4 },
  
  senderName: { fontSize: 12, fontWeight: '600', color: '#3B82F6', marginBottom: 4 },
  messageText: { fontSize: 15, color: '#1F2937', lineHeight: 20 },
  ownMessageText: { color: '#FFFFFF' },
  messageTime: { fontSize: 11, color: '#9CA3AF', marginTop: 4, alignSelf: 'flex-end' },
  ownMessageTime: { color: 'rgba(255,255,255,0.7)' },
  
  emptyChat: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyChatTitle: { fontSize: 18, fontWeight: '600', color: '#6B7280', marginTop: 16 },
  emptyChatSubtitle: { fontSize: 14, color: '#9CA3AF', marginTop: 4 },
  
  inputContainer: { flexDirection: 'row', alignItems: 'flex-end', padding: 12, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  input: { flex: 1, backgroundColor: '#F3F4F6', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, paddingRight: 44, fontSize: 15, maxHeight: 100, color: '#1F2937' },
  sendButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#3B82F6', alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  sendButtonDisabled: { backgroundColor: '#93C5FD' },
});
