'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  MessageCircle,
  Plus,
  Send,
  Search,
  MoreVertical,
  Phone,
  Video as VideoIcon,
  Image as ImageIcon,
  Smile,
  X,
  Volume2,
  VolumeX,
  Users,
  UserPlus,
  ArrowLeft,
} from 'lucide-react';
import Image from 'next/image';
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react';
import dynamic from 'next/dynamic';
import Navbar from '@/components/Navbar';

// Dynamic imports to avoid SSR issues
const VideoCall = dynamic(() => import('@/components/VideoCall'), { ssr: false });

interface Conversation {
  conversation_id: string;
  user_id: string;
  name: string;
  picture?: string;
  last_message: string;
  last_message_at: string;
  unread_count: number;
  is_group?: boolean;
}

interface Message {
  message_id: string;
  sender_id: string;
  content: string;
  message_type?: string;
  media_url?: string;
  name: string;
  picture?: string;
  created_at: string;
  reply_content?: string;
  reply_sender_name?: string;
}

interface User {
  user_id: string;
  name: string;
  email: string;
  picture?: string;
}

// Notification sound (base64 encoded short beep)
const NOTIFICATION_SOUND = 'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA/+M4wAAAAAAAAAAAAEluZm8AAAAPAAAAAwAAAbAAqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV////////////////////////////////////////////AAAAAExhdmM1OC4xMwAAAAAAAAAAAAAAACQDgAAAAAAAAAGwsNIlHgAAAAAAAAAAAAAAAAD/4xjEAAKoGfJBQRgAMIAIRhSFIJB8H4fyhACAIB/y4Oefy4AQBAEAQBA/B+H/ygCAIBAEAQBD//5QCAIAgCAIH4P/+DkOQhCAAAAAADCMP/jGMQLA6wa9kZhGABsAGzBBEBsxgxYNKqIjMWYaGmZkCiYJmZmZmDMzMzM0AAAE//4xjEFAPAAsVvwAAAAAAD/+Mf/4xjEGAAAANIAAAAA/4xjEKAAAANIAAAAA';

export default function MessagesPage() {
  const searchParams = useSearchParams();
  const initialUserId = searchParams.get('user');

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [currentUserId, setCurrentUserId] = useState('');
  const [currentUserName, setCurrentUserName] = useState('');
  const [loading, setLoading] = useState(true);
  const [showNewConvModal, setShowNewConvModal] = useState(false);
  const [convModalType, setConvModalType] = useState<'dm' | 'group'>('dm');
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [searchUser, setSearchUser] = useState('');
  const [messageSearch, setMessageSearch] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showVideoCall, setShowVideoCall] = useState(false);
  const [showAudioCall, setShowAudioCall] = useState(false);
  const [mediaGallery, setMediaGallery] = useState<Message[]>([]);
  const [showMediaGallery, setShowMediaGallery] = useState(false);
  const [fullscreenMedia, setFullscreenMedia] = useState<Message | null>(null);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [uploading, setUploading] = useState(false);
  const [messageTab, setMessageTab] = useState<'direct' | 'groups'>('direct');
  const [groupChats, setGroupChats] = useState<{group_id: string; name: string; image?: string; member_count: number; last_message?: string; last_message_at?: string}[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [groupMessages, setGroupMessages] = useState<Message[]>([]);
  const [groupMembers, setGroupMembers] = useState<User[]>([]);
  const [selectedGroupMembers, setSelectedGroupMembers] = useState<User[]>([]);
  const [groupChatName, setGroupChatName] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastMessageCount = useRef(0);
  const isInitialLoad = useRef(true);

  // ─────────────────────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────────────────────
  const formatMessageTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24 && date.getDate() === now.getDate()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return date.toLocaleDateString([], { weekday: 'short' });
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const formatDateSeparator = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return date.toLocaleDateString([], { weekday: 'long' });
    return date.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' });
  };

  const needsDateSeparator = (current: Message, prev: Message | null) => {
    if (!prev) return true;
    return new Date(current.created_at).toDateString() !== new Date(prev.created_at).toDateString();
  };

  const scrollToBottom = (smooth = true) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
    }
  };

  const playNotificationSound = () => {
    if (soundEnabled && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
  };

  // ─────────────────────────────────────────────────────────────
  // EFFECTS
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    audioRef.current = new Audio(NOTIFICATION_SOUND);
    checkAuth();
  }, []);

  useEffect(() => {
    if (currentUserId) {
      loadConversations();
      loadGroupChats();
    }
  }, [currentUserId]);

  useEffect(() => {
    if (currentUserId) {
      const interval = setInterval(() => {
        loadConversations(true);
        loadGroupChats();
        if (selectedConv) loadMessages(selectedConv, true);
        if (selectedGroup) loadGroupMessages(selectedGroup, true);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [currentUserId, selectedConv, selectedGroup]);

  useEffect(() => {
    if (messages.length > lastMessageCount.current) {
      scrollToBottom(!isInitialLoad.current);
      isInitialLoad.current = false;
    }
    lastMessageCount.current = messages.length;
  }, [messages]);

  useEffect(() => {
    if (initialUserId && currentUserId && initialUserId !== currentUserId) {
      startDirectConversation(initialUserId);
    }
  }, [initialUserId, currentUserId]);

  // ─────────────────────────────────────────────────────────────
  // DATA FETCHING
  // ─────────────────────────────────────────────────────────────
  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          setCurrentUserId(data.user.user_id);
          setCurrentUserName(data.user.name || 'User');
        }
      }
    } catch {}
  };

  const loadConversations = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await fetch('/api/messages', { credentials: 'include' });
      const data = await res.json();
      if (data.success) setConversations(data.conversations || []);
    } catch (err) {
      console.error('Load conversations error:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadGroupChats = async () => {
    try {
      const res  = await fetch('/api/groups?my_groups=true', { credentials: 'include' });
      const data = await res.json();
      if (data.success) setGroupChats(data.groups || []);
    } catch {}
  };

  const loadMessages = async (convId: string, silent = false) => {
    if (!convId) return;
    try {
      const res  = await fetch(`/api/messages/${convId}`, { credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();
      if (data.success && Array.isArray(data.messages)) {
        const newMsgs = data.messages;
        if (!silent && newMsgs.length > messages.length) {
          const last = newMsgs[newMsgs.length - 1];
          if (last?.sender_id !== currentUserId) playNotificationSound();
        }
        setMessages(newMsgs);
      }
    } catch (err) {
      console.error('Load messages error:', err);
    }
  };

  const loadGroupMessages = async (groupId: string, silent = false) => {
    if (!groupId) return;
    try {
      const res  = await fetch(`/api/groups/${groupId}/messages`, { credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();
      if (data.success && Array.isArray(data.messages)) {
        const newMsgs = data.messages;
        // Normalize field names from group messages API
        const normalized = newMsgs.map((m: any) => ({
          ...m,
          name: m.sender_name || m.name || 'Unknown',
          picture: m.sender_picture || m.picture || null,
        }));
        if (!silent && normalized.length > groupMessages.length) {
          const last = normalized[normalized.length - 1];
          if (last?.sender_id !== currentUserId) playNotificationSound();
        }
        setGroupMessages(normalized);
      }
    } catch (err) {
      console.error('Load group messages error:', err);
    }
  };

  const loadMediaGallery = async (convId: string) => {
    try {
      const res  = await fetch(`/api/messages/${convId}?media_only=true`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setMediaGallery(data.messages?.filter((m: Message) => m.message_type === 'image' || m.message_type === 'video') || []);
        setShowMediaGallery(true);
      }
    } catch {}
  };

  const loadAllUsers = async () => {
    try {
      const res = await fetch('/api/users/search?q=', { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setAllUsers(data.users.filter((u: User) => u.user_id !== currentUserId));
      }
    } catch {}
  };

  const loadGroupMembers = async (groupId: string) => {
    try {
      const res = await fetch(`/api/groups/${groupId}/members`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) setGroupMembers(data.members || []);
    } catch {}
  };

  // ─────────────────────────────────────────────────────────────
  // ACTIONS
  // ─────────────────────────────────────────────────────────────
  const selectConversation = (convId: string) => {
    setSelectedConv(convId);
    setSelectedGroup(null);
    setMessages([]);
    lastMessageCount.current = 0;
    isInitialLoad.current = true;
    loadMessages(convId);
    fetch(`/api/messages/${convId}/read`, { method: 'POST', credentials: 'include' })
      .then(() => loadConversations(true));
  };

  const selectGroupChat = (groupId: string) => {
    setSelectedGroup(groupId);
    setSelectedConv(null);
    setGroupMessages([]);
    loadGroupMessages(groupId);
    loadGroupMembers(groupId);
  };

  const openNewConvModal = (type: 'dm' | 'group') => {
    setConvModalType(type);
    setShowNewConvModal(true);
    loadAllUsers();
  };

  const startDirectConversation = async (userId: string) => {
    try {
      const res = await fetch('/api/messages', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ recipientId: userId, content: 'Hey! 👋' }),
      });
      const data = await res.json();
      if (data.success) {
        setShowNewConvModal(false);
        await loadConversations();
        if (data.conversationId) selectConversation(data.conversationId);
      }
    } catch {}
  };

  // ── Create a multi-user group DM ─────────────────────────
  const createGroupDM = async () => {
    if (selectedGroupMembers.length < 2) return;
    try {
      const res = await fetch('/api/messages', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          recipientIds: selectedGroupMembers.map(u => u.user_id),
          groupName:    groupChatName.trim() || null,
          content:      'Hey everyone! 👋',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowNewConvModal(false);
        setSelectedGroupMembers([]);
        setGroupChatName('');
        await loadConversations();
        if (data.conversationId) selectConversation(data.conversationId);
      }
    } catch {}
  };

  const toggleGroupMember = (u: User) => {
    setSelectedGroupMembers(prev =>
      prev.find(m => m.user_id === u.user_id)
        ? prev.filter(m => m.user_id !== u.user_id)
        : [...prev, u]
    );
  };

  // ── Send message (DM) ─────────────────────────────────────
  const sendMessage = async (mediaUrl?: string, messageType?: string) => {
    const content = newMessage.trim();
    if (!content && !mediaUrl) return;
    if (!selectedConv) return;

    const conv = conversations.find(c => c.conversation_id === selectedConv);
    if (!conv) return;

    const replyToMsg = replyTo;
    setReplyTo(null);

    try {
      await fetch('/api/messages', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(
          conv.is_group
            ? {
                conversationId: conv.conversation_id,
                content:     content || (messageType === 'image' ? '📷 Image' : '🎥 Video'),
                messageType: messageType || 'text',
                mediaUrl,
                replyToId: replyToMsg?.message_id || null,
              }
            : {
                recipientId: conv.user_id,
                content:     content || (messageType === 'image' ? '📷 Image' : '🎥 Video'),
                messageType: messageType || 'text',
                mediaUrl,
                replyToId: replyToMsg?.message_id || null,
              }
        ),
      });
      setNewMessage('');
      setShowEmojiPicker(false);
      loadMessages(selectedConv);
    } catch {}
  };

  // ── Send group message ────────────────────────────────────
  const sendGroupMessage = async (content: string, messageType = 'text') => {
    if (!selectedGroup) return;
    const replyToMsg = replyTo;
    setReplyTo(null);
    try {
      await fetch(`/api/groups/${selectedGroup}/messages`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ content, message_type: messageType, replyToId: replyToMsg?.message_id || null }),
      });
      loadGroupMessages(selectedGroup);
      setNewMessage('');
    } catch {}
  };

  // ── Media ────────────────────────────────────────────────
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadMedia(file);
  };

  const uploadMedia = async (file: File) => {
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        const type = file.type.startsWith('video/') ? 'video' : 'image';
        if (selectedConv) sendMessage(data.url, type);
        else if (selectedGroup) sendGroupMessage(data.url, type);
      }
    } catch (err) {
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleScroll = () => {
    // Could implement pagination here
  };

  // ── UI Logic ─────────────────────────────────────────────
  const activeMessages = selectedConv ? messages : groupMessages;
  const filteredMessages = activeMessages.filter(m =>
    m.content.toLowerCase().includes(messageSearch.toLowerCase())
  );

  const renderMessageContent = (msg: Message) => {
    if (msg.message_type === 'image' && msg.media_url) {
      return (
        <div className="max-w-sm rounded-lg overflow-hidden cursor-pointer" onClick={() => setFullscreenMedia(msg)}>
          <img src={msg.media_url} alt="Shared" className="w-full h-auto" />
        </div>
      );
    }
    if (msg.message_type === 'video' && msg.media_url) {
      return (
        <div className="max-w-sm rounded-lg overflow-hidden">
          <video src={msg.media_url} controls className="w-full h-auto" />
        </div>
      );
    }
    return <p className="text-sm whitespace-pre-wrap">{msg.content}</p>;
  };

  // ── Filtered user list in modal ────────────────────────────
  const filteredUsers = allUsers.filter(u =>
    u.name.toLowerCase().includes(searchUser.toLowerCase()) ||
    u.email.toLowerCase().includes(searchUser.toLowerCase())
  );

  // ─────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────
  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gray-50 dark:bg-gray-900">
      <Navbar />

      <div className="flex-1 overflow-hidden min-h-0 container mx-auto px-4 py-3">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden h-full flex flex-col">
          <div className="flex h-full">

            {/* ── Conversations sidebar ─────────────────────── */}
            <div className="w-1/3 border-r border-gray-200 dark:border-gray-700 flex flex-col">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <h2 className="text-xl font-bold dark:text-white">Messages</h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSoundEnabled(!soundEnabled)}
                    className={`p-2 rounded-lg ${soundEnabled ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}
                    title={soundEnabled ? 'Sound On' : 'Sound Off'}
                  >
                    {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                  </button>
                  {/* DM button */}
                  <button
                    onClick={() => openNewConvModal('dm')}
                    className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    title="New Direct Message"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                  {/* Group DM button */}
                  <button
                    onClick={() => openNewConvModal('group')}
                    className="p-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                    title="New Group Chat"
                  >
                    <UserPlus className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-gray-200 dark:border-gray-700">
                {(['direct', 'groups'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setMessageTab(tab)}
                    className={`flex-1 py-3 px-4 text-sm font-semibold flex items-center justify-center gap-2 border-b-2 transition ${
                      messageTab === tab
                        ? 'text-blue-600 border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                        : 'text-gray-500 border-transparent hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    {tab === 'direct' ? <MessageCircle className="w-4 h-4" /> : <Users className="w-4 h-4" />}
                    {tab === 'direct' ? 'Direct' : `Groups (${groupChats.length})`}
                    {tab === 'direct' && conversations.reduce((s, c) => s + (c.unread_count || 0), 0) > 0 && (
                      <span className="bg-blue-600 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                        {conversations.reduce((s, c) => s + (c.unread_count || 0), 0)}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* List */}
              <div className="flex-1 overflow-y-auto">
                {loading ? (
                  <div className="p-8 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
                  </div>
                ) : messageTab === 'direct' ? (
                  conversations.length === 0 ? (
                    <div className="p-8 text-center">
                      <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                      <p className="text-gray-500 text-sm mb-4">No conversations yet</p>
                      <button onClick={() => openNewConvModal('dm')} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700">
                        Start a Conversation
                      </button>
                    </div>
                  ) : (
                    conversations.map(conv => (
                      <button
                        key={conv.conversation_id}
                        onClick={() => selectConversation(conv.conversation_id)}
                        className={`w-full p-4 flex items-start gap-3 hover:bg-gray-50 dark:hover:bg-gray-700 text-left ${
                          selectedConv === conv.conversation_id ? 'bg-blue-50 dark:bg-gray-700' : ''
                        }`}
                      >
                        {/* Avatar */}
                        {conv.is_group ? (
                          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">
                            <Users className="w-5 h-5" />
                          </div>
                        ) : conv.picture ? (
                          <Image src={conv.picture} alt={conv.name} width={40} height={40} className="rounded-full" unoptimized />
                        ) : (
                          <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">
                            {conv.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className="font-semibold truncate dark:text-white">{conv.name}</p>
                            <div className="flex items-center gap-2">
                              {conv.last_message_at && (
                                <span className="text-xs text-gray-400 whitespace-nowrap">
                                  {formatMessageTime(conv.last_message_at)}
                                </span>
                              )}
                              {conv.unread_count > 0 && (
                                <span className="bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                                  {conv.unread_count}
                                </span>
                              )}
                            </div>
                          </div>
                          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                            {conv.last_message || 'Start a conversation'}
                          </p>
                        </div>
                      </button>
                    ))
                  )
                ) : (
                  groupChats.length === 0 ? (
                    <div className="p-8 text-center">
                      <Users className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                      <p className="text-gray-500 text-sm mb-4">No group chats yet</p>
                      <button onClick={() => openNewConvModal('group')} className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-semibold hover:bg-purple-700">
                        Create Group
                      </button>
                    </div>
                  ) : (
                    groupChats.map(group => (
                      <button
                        key={group.group_id}
                        onClick={() => selectGroupChat(group.group_id)}
                        className={`w-full p-4 flex items-start gap-3 hover:bg-gray-50 dark:hover:bg-gray-700 text-left ${
                          selectedGroup === group.group_id ? 'bg-blue-50 dark:bg-gray-700' : ''
                        }`}
                      >
                        {group.image ? (
                          <Image src={group.image} alt={group.name} width={40} height={40} className="rounded-xl flex-shrink-0" unoptimized />
                        ) : (
                          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center text-white font-semibold flex-shrink-0">
                            <Users className="w-5 h-5" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className="font-semibold truncate dark:text-white">{group.name}</p>
                            {group.last_message_at && (
                              <span className="text-xs text-gray-400 whitespace-nowrap">
                                {formatMessageTime(group.last_message_at)}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                            {group.last_message || `${group.member_count} members`}
                          </p>
                        </div>
                      </button>
                    ))
                  )
                )}
              </div>
            </div>

            {/* ── Chat area ─────────────────────────────────── */}
            <div className="flex-1 flex flex-col bg-white dark:bg-gray-800 relative">
              {(selectedConv || selectedGroup) ? (
                <>
                  {/* Header */}
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {selectedConv ? (
                        (() => {
                          const conv = conversations.find(c => c.conversation_id === selectedConv);
                          return (
                            <>
                              {conv?.picture ? (
                                <Image src={conv.picture} alt={conv.name} width={40} height={40} className="rounded-full" unoptimized />
                              ) : (
                                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                                  {conv?.name.charAt(0).toUpperCase()}
                                </div>
                              )}
                              <div>
                                <h3 className="font-bold dark:text-white">{conv?.name}</h3>
                                <p className="text-xs text-green-500">Online</p>
                              </div>
                            </>
                          );
                        })()
                      ) : (
                        (() => {
                          const group = groupChats.find(g => g.group_id === selectedGroup);
                          return (
                            <>
                              {group?.image ? (
                                <Image src={group.image} alt={group.name} width={40} height={40} className="rounded-xl" unoptimized />
                              ) : (
                                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center text-white font-semibold">
                                  <Users className="w-5 h-5" />
                                </div>
                              )}
                              <div>
                                <h3 className="font-bold dark:text-white">{group?.name}</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  {groupMembers.length > 0
                                    ? groupMembers.slice(0, 4).map(m => m.name).join(', ') + (groupMembers.length > 4 ? ` +${groupMembers.length - 4} more` : '')
                                    : `${group?.member_count || 0} members`}
                                </p>
                              </div>
                            </>
                          );
                        })()
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          if (selectedConv) loadMediaGallery(selectedConv);
                        }}
                        className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                        title="Media Gallery"
                      >
                        <ImageIcon className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => setShowAudioCall(true)}
                        className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                        title="Audio Call"
                      >
                        <Phone className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => setShowVideoCall(true)}
                        className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                        title="Video Call"
                      >
                        <VideoIcon className="w-5 h-5" />
                      </button>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Search messages..."
                          value={messageSearch}
                          onChange={e => setMessageSearch(e.target.value)}
                          className="pl-8 pr-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                        <Search className="w-4 h-4 text-gray-400 absolute left-2.5 top-2" />
                      </div>
                    </div>
                  </div>

                  {/* Messages */}
                  <div
                    ref={messagesContainerRef}
                    onScroll={handleScroll}
                    className="flex-1 overflow-y-auto p-4 space-y-4"
                  >
                    {filteredMessages.map((msg, idx) => {
                      const prev = idx > 0 ? filteredMessages[idx - 1] : null;
                      const showSeparator = needsDateSeparator(msg, prev);
                      const isSender = msg.sender_id === currentUserId;

                      return (
                        <div key={msg.message_id}>
                          {showSeparator && (
                            <div className="flex items-center justify-center my-6">
                              <div className="h-px flex-1 bg-gray-100 dark:bg-gray-700" />
                              <span className="px-4 text-xs text-gray-400 font-medium">
                                {formatDateSeparator(msg.created_at)}
                              </span>
                              <div className="h-px flex-1 bg-gray-100 dark:bg-gray-700" />
                            </div>
                          )}

                          <div className={`flex items-end gap-2 ${isSender ? 'flex-row-reverse' : ''}`}>
                            {!isSender && (
                              <div className="flex-shrink-0 mb-1">
                                {msg.picture ? (
                                  <Image src={msg.picture} alt={msg.name} width={32} height={32} className="rounded-full" unoptimized />
                                ) : (
                                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                                    {msg.name.charAt(0).toUpperCase()}
                                  </div>
                                )}
                              </div>
                            )}

                            <div className={`flex flex-col max-w-[85%] sm:max-w-[70%] ${isSender ? 'items-end' : 'items-start'}`}>
                              {/* Reply context */}
                              {msg.reply_content && (
                                <div className={`mb-1 px-3 py-1.5 rounded-lg text-xs border-l-4 w-full ${
                                  isSender
                                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 text-blue-700 dark:text-blue-300'
                                    : 'bg-gray-100 dark:bg-gray-700 border-gray-400 text-gray-600 dark:text-gray-400'
                                }`}>
                                  <p className="font-semibold truncate">{msg.reply_sender_name}</p>
                                  <p className="line-clamp-1 overflow-hidden">{msg.reply_content}</p>
                                </div>
                              )}

                              <div className={`group relative px-4 py-2 rounded-2xl w-full break-words ${
                                isSender
                                  ? 'bg-blue-600 text-white rounded-br-none'
                                  : 'bg-gray-100 dark:bg-gray-700 dark:text-white rounded-bl-none'
                              }`}>
                                {!isSender && selectedGroup && (
                                  <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 mb-0.5">{msg.name}</p>
                                )}
                                <div className="overflow-hidden">
                                  {renderMessageContent(msg)}
                                </div>

                                {/* Hover actions */}
                                <button
                                  onClick={() => setReplyTo(msg)}
                                  className={`absolute top-0 p-1.5 bg-white dark:bg-gray-800 shadow-md rounded-full transition-opacity opacity-60 hover:opacity-100 active:opacity-100 ${
                                    isSender ? '-left-10' : '-right-10'
                                  }`}
                                  title="Reply"
                                >
                                  <ArrowLeft className="w-4 h-4 text-gray-500" />
                                </button>
                              </div>
                              <span className="text-[10px] text-gray-400 mt-1 px-1">
                                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Input */}
                  <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                    {replyTo && (
                      <div className="mb-2 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg flex items-center justify-between border-l-4 border-blue-500">
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-blue-600">Replying to {replyTo.name}</p>
                          <p className="text-xs text-gray-500 truncate">{replyTo.content}</p>
                        </div>
                        <button onClick={() => setReplyTo(null)} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                    <div className="flex items-end gap-2">
                      <div className="flex items-center gap-1 mb-1">
                        <button
                          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                          className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                        >
                          <Smile className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => document.getElementById('file-upload')?.click()}
                          className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                        >
                          <ImageIcon className="w-5 h-5" />
                        </button>
                        <input
                          id="file-upload"
                          type="file"
                          className="hidden"
                          accept="image/*,video/*"
                          onChange={handleFileSelect}
                        />
                      </div>
                      <div className="flex-1 relative">
                        <textarea
                          value={newMessage}
                          onChange={e => setNewMessage(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              if (selectedConv) sendMessage();
                              else if (selectedGroup) sendGroupMessage(newMessage);
                            }
                          }}
                          placeholder="Type a message..."
                          className="w-full pl-4 pr-12 py-3 bg-gray-100 dark:bg-gray-700 dark:text-white rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none max-h-32"
                          rows={1}
                        />
                        {showEmojiPicker && (
                          <div className="absolute bottom-full right-0 mb-2 z-50">
                            <EmojiPicker
                              onEmojiClick={(emojiData: EmojiClickData) => {
                                setNewMessage(prev => prev + emojiData.emoji);
                              }}
                              theme={Theme.AUTO}
                            />
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          if (selectedConv) sendMessage();
                          else if (selectedGroup) sendGroupMessage(newMessage);
                        }}
                        disabled={!newMessage.trim() && !uploading}
                        className="p-3 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed mb-1"
                      >
                        <Send className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-500 p-8">
                  <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center mb-4">
                    <MessageCircle className="w-10 h-10 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-bold dark:text-white mb-2">Your Messages</h3>
                  <p className="text-center max-w-xs">Select a conversation from the sidebar to start chatting or create a new one.</p>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* New Conversation Modal */}
      {showNewConvModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3 className="font-bold text-lg dark:text-white">
                {convModalType === 'dm' ? 'New Direct Message' : 'New Group Chat'}
              </h3>
              <button onClick={() => setShowNewConvModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4">
              {convModalType === 'group' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Group Name (Optional)</label>
                  <input
                    type="text"
                    value={groupChatName}
                    onChange={e => setGroupChatName(e.target.value)}
                    placeholder="E.g. Friday Night Magic"
                    className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 dark:bg-gray-700 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              <div className="relative mb-4">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={searchUser}
                  onChange={e => setSearchUser(e.target.value)}
                  placeholder="Search by name or email..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 dark:bg-gray-700 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {convModalType === 'group' && selectedGroupMembers.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {selectedGroupMembers.map(u => (
                    <div key={u.user_id} className="flex items-center gap-1 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-lg text-xs font-medium">
                      <span>{u.name}</span>
                      <button onClick={() => toggleGroupMember(u)}><X className="w-3 h-3" /></button>
                    </div>
                  ))}
                </div>
              )}

              <div className="max-h-60 overflow-y-auto space-y-2">
                {filteredUsers.map(user => (
                  <button
                    key={user.user_id}
                    onClick={() => {
                      if (convModalType === 'dm') startDirectConversation(user.user_id);
                      else toggleGroupMember(user);
                    }}
                    className={`w-full p-3 flex items-center gap-3 rounded-xl transition ${
                      selectedGroupMembers.find(m => m.user_id === user.user_id)
                        ? 'bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-500'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    {user.picture ? (
                      <Image src={user.picture} alt={user.name} width={36} height={36} className="rounded-full" unoptimized />
                    ) : (
                      <div className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="text-left">
                      <p className="font-semibold text-sm dark:text-white">{user.name}</p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {convModalType === 'group' && (
              <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={createGroupDM}
                  disabled={selectedGroupMembers.length < 2}
                  className="w-full py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 disabled:opacity-50 transition"
                >
                  Create Group Chat ({selectedGroupMembers.length})
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Media Gallery Sidebar */}
      {showMediaGallery && (
        <div className="fixed inset-y-0 right-0 w-80 bg-white dark:bg-gray-800 shadow-2xl z-[60] flex flex-col animate-in slide-in-from-right duration-300">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h3 className="font-bold">Media Gallery</h3>
            <button onClick={() => setShowMediaGallery(false)}><X className="w-8 h-8" /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {mediaGallery.map(m => (
                <div
                  key={m.message_id}
                  className="aspect-square rounded-xl overflow-hidden cursor-pointer hover:ring-2 hover:ring-blue-500 transition"
                  onClick={() => setFullscreenMedia(m)}
                >
                  {m.message_type === 'video' ? (
                    <div className="w-full h-full bg-gray-800 flex items-center justify-center relative">
                      <VideoIcon className="w-8 h-8 text-white/50" />
                      <video src={m.media_url} className="absolute inset-0 w-full h-full object-cover opacity-50" />
                    </div>
                  ) : (
                    <img src={m.media_url} alt="" className="w-full h-full object-cover" />
                  )}
                </div>
              ))}
            </div>
            {mediaGallery.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-white/50">
                <ImageIcon className="w-16 h-16 mb-4" />
                <p>No media shared in this chat yet</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Fullscreen Media */}
      {fullscreenMedia && (
        <div className="fixed inset-0 bg-black z-[90] flex items-center justify-center p-4">
          <button
            onClick={() => setFullscreenMedia(null)}
            className="absolute top-6 right-6 text-white hover:bg-white/10 p-2 rounded-full transition"
          >
            <X className="w-8 h-8" />
          </button>
          {fullscreenMedia.message_type === 'video' ? (
            <video src={fullscreenMedia.media_url} controls autoPlay className="max-w-full max-h-full" />
          ) : (
            <img src={fullscreenMedia.media_url} alt="" className="max-w-full max-h-full object-contain" />
          )}
          {fullscreenMedia.content && fullscreenMedia.content !== '📷 Image' && (
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-md px-6 py-3 rounded-2xl text-white max-w-lg text-center">
              {fullscreenMedia.content}
            </div>
          )}
        </div>
      )}

      {/* Video Call Component */}
      {(showVideoCall || showAudioCall) && (
        <VideoCall
          isOpen={showVideoCall || showAudioCall}
          onClose={() => { setShowVideoCall(false); setShowAudioCall(false); }}
          callType={showAudioCall ? 'audio' : 'video'}
          remoteUserId={selectedConv ? conversations.find(c => c.conversation_id === selectedConv)?.user_id || '' : ''}
          remoteUserName={selectedConv ? conversations.find(c => c.conversation_id === selectedConv)?.name || '' : ''}
          currentUserId={currentUserId}
          currentUserName={currentUserName}
        />
      )}
    </div>
  );
}
