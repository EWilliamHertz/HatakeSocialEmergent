import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  TextInput,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '../config';

interface Conversation {
  user_id: string;
  name: string;
  picture?: string;
  last_message?: string;
  last_message_time?: string;
  unread_count?: number;
}

interface Message {
  message_id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

interface MessengerWidgetProps {
  user: any;
  token: string;
  visible: boolean;
}

export default function MessengerWidget({ user, token, visible }: MessengerWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedChat, setSelectedChat] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [unreadTotal, setUnreadTotal] = useState(0);
  
  const scaleAnim = useState(new Animated.Value(1))[0];

  useEffect(() => {
    if (visible) {
      fetchConversations();
      // Poll for new messages
      const interval = setInterval(fetchConversations, 10000);
      return () => clearInterval(interval);
    }
  }, [visible]);

  // Also fetch when widget is opened
  useEffect(() => {
    if (isOpen && visible) {
      fetchConversations();
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedChat) {
      fetchMessages(selectedChat.user_id);
      const interval = setInterval(() => fetchMessages(selectedChat.user_id), 3000);
      return () => clearInterval(interval);
    }
  }, [selectedChat]);

  const getAuthToken = () => {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem('auth_token') || token;
    }
    return token;
  };

  const fetchConversations = async () => {
    try {
      const authToken = getAuthToken();
      // Conversations are returned from the main messages endpoint
      const res = await fetch(`${API_URL}/api/messages`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (data.success) {
        setConversations(data.conversations || []);
        const total = (data.conversations || []).reduce((sum: number, c: Conversation) => sum + (c.unread_count || 0), 0);
        setUnreadTotal(total);
      }
    } catch (err) {
      console.log('Failed to fetch conversations:', err);
    }
  };

  const fetchMessages = async (userId: string) => {
    try {
      const authToken = getAuthToken();
      const res = await fetch(`${API_URL}/api/messages?userId=${userId}`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (data.success) {
        setMessages(data.messages || []);
      }
    } catch (err) {
      console.log('Failed to fetch messages:', err);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedChat || sending) return;
    
    setSending(true);
    const content = newMessage.trim();
    setNewMessage('');

    try {
      const authToken = getAuthToken();
      await fetch(`${API_URL}/api/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipientId: selectedChat.user_id,
          content,
        }),
      });
      
      // Add message optimistically
      setMessages(prev => [...prev, {
        message_id: `temp-${Date.now()}`,
        sender_id: user.user_id,
        content,
        created_at: new Date().toISOString(),
      }]);
    } catch (err) {
      console.log('Failed to send message:', err);
      setNewMessage(content);
    } finally {
      setSending(false);
    }
  };

  const toggleWidget = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.9, duration: 100, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
    setIsOpen(!isOpen);
    if (!isOpen) {
      setSelectedChat(null);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!visible) return null;

  return (
    <View style={styles.container}>
      {/* Chat Window */}
      {isOpen && (
        <View style={styles.chatWindow}>
          {!selectedChat ? (
            // Conversations List
            <>
              <View style={styles.windowHeader}>
                <Text style={styles.windowTitle}>Messages</Text>
                <TouchableOpacity onPress={toggleWidget}>
                  <Ionicons name="close" size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>
              
              {conversations.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="chatbubbles-outline" size={40} color="#D1D5DB" />
                  <Text style={styles.emptyText}>No conversations yet</Text>
                </View>
              ) : (
                <FlatList
                  data={conversations}
                  keyExtractor={(item) => item.user_id}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.conversationItem}
                      onPress={() => { setSelectedChat(item); setLoading(true); }}
                    >
                      {item.picture ? (
                        <Image source={{ uri: item.picture }} style={styles.avatar} />
                      ) : (
                        <View style={styles.avatarPlaceholder}>
                          <Ionicons name="person" size={20} color="#9CA3AF" />
                        </View>
                      )}
                      <View style={styles.conversationInfo}>
                        <Text style={styles.conversationName}>{item.name}</Text>
                        {item.last_message && (
                          <Text style={styles.lastMessage} numberOfLines={1}>
                            {item.last_message}
                          </Text>
                        )}
                      </View>
                      {item.unread_count ? (
                        <View style={styles.unreadBadge}>
                          <Text style={styles.unreadText}>{item.unread_count}</Text>
                        </View>
                      ) : null}
                    </TouchableOpacity>
                  )}
                />
              )}
            </>
          ) : (
            // Chat View
            <>
              <View style={styles.windowHeader}>
                <TouchableOpacity onPress={() => setSelectedChat(null)}>
                  <Ionicons name="arrow-back" size={24} color="#6B7280" />
                </TouchableOpacity>
                <Text style={styles.chatTitle}>{selectedChat.name}</Text>
                <TouchableOpacity onPress={toggleWidget}>
                  <Ionicons name="close" size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>
              
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator color="#3B82F6" />
                </View>
              ) : (
                <FlatList
                  data={messages}
                  keyExtractor={(item) => item.message_id}
                  inverted={false}
                  contentContainerStyle={styles.messagesContainer}
                  renderItem={({ item }) => {
                    const isOwn = item.sender_id === user.user_id;
                    return (
                      <View style={[styles.messageBubble, isOwn ? styles.ownBubble : styles.otherBubble]}>
                        <Text style={[styles.messageText, isOwn && styles.ownMessageText]}>
                          {item.content}
                        </Text>
                        <Text style={[styles.messageTime, isOwn && styles.ownMessageTime]}>
                          {formatTime(item.created_at)}
                        </Text>
                      </View>
                    );
                  }}
                />
              )}
              
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.messageInput}
                  value={newMessage}
                  onChangeText={setNewMessage}
                  placeholder="Type a message..."
                  multiline
                />
                <TouchableOpacity
                  style={[styles.sendButton, (!newMessage.trim() || sending) && styles.sendButtonDisabled]}
                  onPress={sendMessage}
                  disabled={!newMessage.trim() || sending}
                >
                  <Ionicons name="send" size={18} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      )}

      {/* Floating Button */}
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <TouchableOpacity style={styles.floatingButton} onPress={toggleWidget}>
          <Ionicons name={isOpen ? 'close' : 'chatbubble-ellipses'} size={26} color="#FFFFFF" />
          {!isOpen && unreadTotal > 0 && (
            <View style={styles.floatingBadge}>
              <Text style={styles.floatingBadgeText}>{unreadTotal > 9 ? '9+' : unreadTotal}</Text>
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    zIndex: 1000,
  },
  floatingButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  floatingBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  floatingBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  chatWindow: {
    position: 'absolute',
    bottom: 70,
    right: 0,
    width: 320,
    height: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
    overflow: 'hidden',
  },
  windowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  windowTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1F2937',
  },
  chatTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'center',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
    color: '#9CA3AF',
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  conversationInfo: {
    flex: 1,
    marginLeft: 12,
  },
  conversationName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  lastMessage: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  unreadBadge: {
    backgroundColor: '#3B82F6',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  unreadText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messagesContainer: {
    padding: 12,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 10,
    borderRadius: 14,
    marginBottom: 8,
  },
  ownBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#3B82F6',
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#F3F4F6',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 14,
    color: '#1F2937',
    lineHeight: 20,
  },
  ownMessageText: {
    color: '#FFFFFF',
  },
  messageTime: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  ownMessageTime: {
    color: 'rgba(255,255,255,0.7)',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 8,
  },
  messageInput: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 14,
    maxHeight: 80,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#93C5FD',
  },
});
