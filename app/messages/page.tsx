'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import VideoCall from '@/components/VideoCall';
import {
  MessageCircle, Send, Plus, Users, X, Search, Smile,
  Image as ImageIcon, Video, Volume2, VolumeX, Phone,
  Video as VideoIcon, Check, CheckCheck, UserPlus,
} from 'lucide-react';
import Image from 'next/image';
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react';

// ─── Types ────────────────────────────────────────────────────
interface Conversation {
  conversation_id: string;
  user_id:         string | null;  // null for group DMs
  name:            string;
  picture?:        string;
  last_message:    string;
  last_message_at: string;
  unread_count:    number;
  is_group?:       boolean;
}

interface GroupChat {
  group_id:      string;
  name:          string;
  image?:        string;
  member_count:  number;
  last_message?: string;
  last_message_at?: string;
  unread_count?: number;
}

interface Message {
  message_id:         string;
  sender_id:          string;
  content:            string;
  message_type?:      string;
  media_url?:         string;
  read_at?:           string | null;   // ← NEW
  name:               string;
  picture?:           string;
  created_at:         string;
  reply_to?:          string;
  reply_content?:     string;
  reply_sender_name?: string;
}

interface User {
  user_id: string;
  name:    string;
  email:   string;
  picture?: string;
}

// ─── Notification sound ───────────────────────────────────────
const playNotificationChime = () => {
  if (typeof window === 'undefined') return;
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    [[880, 0], [1046.5, 150]].forEach(([freq, delay]) => {
      setTimeout(() => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = freq;
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.3);
      }, delay);
    });
  } catch {}
};

// ─── Read-receipt tick icon ───────────────────────────────────
function ReadStatus({ readAt, isSender }: { readAt?: string | null; isSender: boolean }) {
  if (!isSender) return null;
  return readAt ? (
    // Double blue tick = read
    <span title={`Read ${new Date(readAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}>
      <CheckCheck className="w-3.5 h-3.5 text-blue-400 inline-block ml-1" />
    </span>
  ) : (
    // Single grey tick = delivered/sent
    <span title="Sent">
      <Check className="w-3.5 h-3.5 text-gray-400 inline-block ml-1" />
    </span>
  );
}

// ─── Component ───────────────────────────────────────────────
export default function MessagesPage() {
  const router = useRouter();

  // conversations & messages
  const [conversations,  setConversations]  = useState<Conversation[]>([]);
  const [groupChats,     setGroupChats]     = useState<GroupChat[]>([]);
  const [messageTab,     setMessageTab]     = useState<'direct' | 'groups'>('direct');
  const [selectedConv,   setSelectedConv]   = useState<string | null>(null);
  const [selectedGroup,  setSelectedGroup]  = useState<string | null>(null);
  const [messages,       setMessages]       = useState<Message[]>([]);
  const [newMessage,     setNewMessage]     = useState('');
  const [currentUserId,  setCurrentUserId]  = useState('');
  const [currentUserName, setCurrentUserName] = useState('');
  const [loading,        setLoading]        = useState(true);
  const [groupMembers, setGroupMembers] = useState<{user_id: string; name: string; picture?: string}[]>([]);

  // new conversation modal
  const [showNewConvModal,     setShowNewConvModal]     = useState(false);
  const [newConvMode,          setNewConvMode]          = useState<'dm' | 'group'>('dm');
  const [allUsers,             setAllUsers]             = useState<User[]>([]);
  const [searchUser,           setSearchUser]           = useState('');
  const [selectedGroupMembers, setSelectedGroupMembers] = useState<User[]>([]);
  const [groupChatName,        setGroupChatName]        = useState('');

  // UI state
  const [showEmojiPicker,  setShowEmojiPicker]  = useState(false);
  const [soundEnabled,     setSoundEnabled]     = useState(true);
  const [showMediaModal,   setShowMediaModal]   = useState(false);
  const [uploading,        setUploading]        = useState(false);
  const [selectedMedia,    setSelectedMedia]    = useState<File | null>(null);
  const [mediaPreview,     setMediaPreview]     = useState<string | null>(null);
  const [showVideoCall,    setShowVideoCall]    = useState(false);
  const [showAudioCall,    setShowAudioCall]    = useState(false);
  const [messageSearch,    setMessageSearch]    = useState('');
  const [showMediaGallery, setShowMediaGallery] = useState(false);
  const [mediaGallery,     setMediaGallery]     = useState<Message[]>([]);
  const [fullscreenMedia,  setFullscreenMedia]  = useState<Message | null>(null);
  const [replyTo,          setReplyTo]          = useState<Message | null>(null);

  // scroll
  const messagesEndRef       = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [isUserScrolledUp,   setIsUserScrolledUp]   = useState(false);
  const [initialLoad,        setInitialLoad]        = useState(true);
  const textareaRef  = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastMessageCount = useRef(0);

  // ── Helpers ────────────────────────────────────────────────
  const formatMessageTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now  = new Date();
    const diffMs   = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHrs  = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHrs < 24 && date.getDate() === now.getDate())
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (diffDays === 1) return 'Yesterday ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (diffDays < 7)  return date.toLocaleDateString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' });
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const formatDateSeparator = (dateStr: string) => {
    const date = new Date(dateStr);
    const now  = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7)   return date.toLocaleDateString([], { weekday: 'long' });
    return date.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' });
  };

  const needsDateSeparator = (cur: Message, prev: Message | null) => {
    if (!prev) return true;
    return new Date(cur.created_at).toDateString() !== new Date(prev.created_at).toDateString();
  };

  const filteredMessages = messageSearch.trim()
    ? messages.filter(m => m.content.toLowerCase().includes(messageSearch.toLowerCase()))
    : messages;

  const playNotificationSound = useCallback(() => {
    if (soundEnabled) playNotificationChime();
  }, [soundEnabled]);

  // ── Scroll ────────────────────────────────────────────────
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    setIsUserScrolledUp(el.scrollHeight - el.scrollTop - el.clientHeight > 100);
  };

  const scrollToBottom = (smooth = true) => {
    const el = messagesContainerRef.current;
    if (!el) return;
    smooth ? el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' }) : (el.scrollTop = el.scrollHeight);
  };

  useEffect(() => {
    if (initialLoad || !isUserScrolledUp) {
      setTimeout(() => scrollToBottom(!initialLoad), 50);
      if (initialLoad && messages.length > 0) setInitialLoad(false);
    }
  }, [messages, initialLoad, isUserScrolledUp]);

  useEffect(() => {
    setInitialLoad(true);
    setIsUserScrolledUp(false);
    setTimeout(() => scrollToBottom(false), 100);
  }, [selectedConv, selectedGroup]);

  // ── Auth ──────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then(r => { if (!r.ok) { router.push('/auth/login'); return; } return r.json(); })
      .then(data => {
        if (data?.user) {
          setCurrentUserId(data.user.user_id);
          setCurrentUserName(data.user.name || 'User');
          loadConversations();
          loadGroupChats();
        }
      })
      .catch(() => router.push('/auth/login'));
  }, [router]);

  // ── Polling ───────────────────────────────────────────────
  useEffect(() => {
    if (!selectedConv && !selectedGroup) return;
    const interval = setInterval(() => {
      if (selectedConv)      loadMessages(selectedConv, true);
      else if (selectedGroup) loadGroupMessages(selectedGroup, true);
    }, 3000);
    return () => clearInterval(interval);
  }, [selectedConv, selectedGroup]);

  // ── Data loaders ──────────────────────────────────────────
  const loadConversations = async () => {
    try {
      const res  = await fetch('/api/messages', { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        const newConvs = data.conversations || [];
        setConversations(newConvs);
        const total = newConvs.reduce((s: number, c: Conversation) => s + (c.unread_count || 0), 0);
        if (total > lastMessageCount.current && lastMessageCount.current > 0) playNotificationSound();
        lastMessageCount.current = total;
      }
    } catch {}
    finally { setLoading(false); }
  };

  const loadGroupChats = async () => {
    try {
      const res  = await fetch('/api/groups?my_groups=true', { credentials: 'include' });
      const data = await res.json();
      if (data.success) setGroupChats(data.groups || []);
    } catch {}
  };

  const loadMessages = async (convId: string, silent = false) => {
    try {
      const res  = await fetch(`/api/messages/${convId}`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        const newMsgs = data.messages || [];
        if (!silent && newMsgs.length > messages.length) {
          const last = newMsgs[newMsgs.length - 1];
          if (last?.sender_id !== currentUserId) playNotificationSound();
        }
        setMessages(newMsgs);
      }
    } catch {}
  };

  const loadGroupMessages = async (groupId: string, silent = false) => {
    try {
      const res  = await fetch(`/api/groups/${groupId}/messages`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        const newMsgs = data.messages || [];
        // Normalize field names from group messages API
        const normalized = newMsgs.map((m: any) => ({
          ...m,
          name: m.sender_name || m.name || 'Unknown',
          picture: m.sender_picture || m.picture || null,
        }));
        if (!silent && normalized.length > messages.length) {
          const last = normalized[normalized.length - 1];
          if (last?.sender_id !== currentUserId) playNotificationSound();
        }
        setMessages(normalized);
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

  const loadAllUsers = async () => {
    try {
      const res  = await fetch('/api/users/search?q=', { credentials: 'include' });
      const data = await res.json();
      if (data.success)
        setAllUsers((data.users || []).filter((u: User) => u.user_id !== currentUserId));
    } catch {}
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

  // ── Conversation selection ────────────────────────────────
  const selectConversation = (convId: string) => {
    setSelectedConv(convId);
    setSelectedGroup(null);
    loadMessages(convId);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const selectGroupChat = (groupId: string) => {
    setSelectedGroup(groupId);
    setSelectedConv(null);
    loadGroupMessages(groupId);
    loadGroupMembers(groupId);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  // ── Open new-conversation modal ───────────────────────────
  const openNewConvModal = (mode: 'dm' | 'group' = 'dm') => {
    setNewConvMode(mode);
    setShowNewConvModal(true);
    setSelectedGroupMembers([]);
    setGroupChatName('');
    setSearchUser('');
    loadAllUsers();
  };

  // ── Start a DM ────────────────────────────────────────────
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
        body: JSON.stringify({
          recipientId: conv.user_id,
          content:     content || (messageType === 'image' ? '📷 Image' : '🎥 Video'),
          messageType: messageType || 'text',
          mediaUrl,
          replyToId: replyToMsg?.message_id || null,
        }),
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
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      alert('Please select an image or video'); return;
    }
    if (file.size > 10 * 1024 * 1024) { alert('Max 10 MB'); return; }
    setSelectedMedia(file);
    const reader = new FileReader();
    reader.onload = e => setMediaPreview(e.target?.result as string);
    reader.readAsDataURL(file);
    setShowMediaModal(true);
  };

  const sendMediaMessage = async () => {
    if (!selectedMedia) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedMedia);
      const uploadRes  = await fetch('/api/upload', { method: 'POST', credentials: 'include', body: formData });
      const uploadData = await uploadRes.json();
      const isVideo    = selectedMedia.type.startsWith('video/');
      await sendMessage(uploadData.success ? uploadData.url : (mediaPreview || ''), isVideo ? 'video' : 'image');
    } catch {}
    finally {
      setUploading(false);
      setShowMediaModal(false);
      setSelectedMedia(null);
      setMediaPreview(null);
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewMessage(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const handleEmojiSelect = (data: EmojiClickData) => {
    setNewMessage(p => p + data.emoji);
    textareaRef.current?.focus();
  };

  // ── Render message content ─────────────────────────────────
  const renderMessageContent = (msg: Message) => {
    if (msg.message_type === 'image' && msg.media_url) {
      return (
        <div className="max-w-xs">
          <img
            src={msg.media_url} alt="Shared image"
            className="rounded-lg max-w-full h-auto cursor-pointer hover:opacity-90"
            onClick={() => setFullscreenMedia(msg)}
          />
          {msg.content && msg.content !== '📷 Image' && <p className="text-sm mt-1">{msg.content}</p>}
        </div>
      );
    }
    if (msg.message_type === 'video' && msg.media_url) {
      return (
        <div className="max-w-xs">
          <video src={msg.media_url} controls className="rounded-lg max-w-full" />
          {msg.content && msg.content !== '🎥 Video' && <p className="text-sm mt-1">{msg.content}</p>}
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />

      <div className="container mx-auto px-4 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden" style={{ height: 'calc(100vh - 12rem)' }}>
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
                  /* Groups tab */
                  groupChats.length === 0 ? (
                    <div className="p-8 text-center">
                      <Users className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                      <p className="text-gray-500 text-sm mb-4">No groups joined</p>
                      <button onClick={() => router.push('/groups')} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700">
                        Find Groups
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

                            <div className={`flex flex-col max-w-[70%] ${isSender ? 'items-end' : 'items-start'}`}>
                              {/* Reply context */}
                              {msg.reply_content && (
                                <div className={`mb-1 px-3 py-1.5 rounded-lg text-xs border-l-4 ${
                                  isSender
                                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 text-blue-700 dark:text-blue-300'
                                    : 'bg-gray-100 dark:bg-gray-700 border-gray-400 text-gray-600 dark:text-gray-400'
                                }`}>
                                  <p className="font-semibold">{msg.reply_sender_name}</p>
                                  <p className="truncate">{msg.reply_content}</p>
                                </div>
                              )}

                              <div className={`group relative px-4 py-2 rounded-2xl ${
                                isSender
                                  ? 'bg-blue-600 text-white rounded-br-none'
                                  : 'bg-gray-100 dark:bg-gray-700 dark:text-white rounded-bl-none'
                              }`}>
                                {!isSender && selectedGroup && (
                                  <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 mb-0.5">{msg.name}</p>
                                )}
                                {renderMessageContent(msg)}

                                {/* Hover actions */}
                                <button
                                  onClick={() => setReplyTo(msg)}
                                  className={`absolute top-0 opacity-0 group-hover:opacity-100 p-1.5 bg-white dark:bg-gray-800 shadow-md rounded-full transition-opacity ${
                                    isSender ? '-left-10' : '-right-10'
                                  }`}
                                  title="Reply"
                                >
                                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                                  </svg>
                                </button>
                              </div>

                              <div className="flex items-center gap-1.5 mt-1 px-1">
                                <span className="text-[10px] text-gray-400">
                                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                <ReadStatus readAt={msg.read_at} isSender={isSender} />
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Input area */}
                  <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                    {replyTo && (
                      <div className="mb-3 flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 px-4 py-2 rounded-lg border-l-4 border-blue-600">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-blue-600 dark:text-blue-400">Replying to {replyTo.name}</p>
                          <p className="text-xs text-gray-600 dark:text-gray-400 truncate">{replyTo.content}</p>
                        </div>
                        <button onClick={() => setReplyTo(null)} className="p-1 hover:bg-blue-100 dark:hover:bg-blue-800 rounded">
                          <X className="w-4 h-4 text-gray-500" />
                        </button>
                      </div>
                    )}

                    <div className="flex items-end gap-3">
                      <div className="flex items-center gap-1 pb-1">
                        <div className="relative">
                          <button
                            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                            className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition"
                          >
                            <Smile className="w-6 h-6" />
                          </button>
                          {showEmojiPicker && (
                            <div className="absolute bottom-12 left-0 z-50 shadow-2xl">
                              <EmojiPicker
                                onEmojiClick={handleEmojiSelect}
                                theme={Theme.AUTO}
                                width={320}
                                height={400}
                              />
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition"
                        >
                          <Plus className="w-6 h-6" />
                        </button>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*,video/*"
                          onChange={handleFileSelect}
                          className="hidden"
                        />
                      </div>

                      <div className="flex-1 relative">
                        <textarea
                          ref={textareaRef}
                          value={newMessage}
                          onChange={handleTextareaChange}
                          onKeyDown={handleKeyDown}
                          placeholder="Type a message..."
                          className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 dark:text-white rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none max-h-32"
                          rows={1}
                        />
                      </div>

                      <button
                        onClick={() => {
                          if (selectedConv) sendMessage();
                          else if (selectedGroup) sendGroupMessage(newMessage);
                        }}
                        disabled={!newMessage.trim()}
                        className="p-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform active:scale-95 shadow-md"
                      >
                        <Send className="w-6 h-6" />
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                  <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center mb-4">
                    <MessageCircle className="w-10 h-10 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-bold dark:text-white mb-2">Your Messages</h3>
                  <p className="text-gray-500 dark:text-gray-400 max-w-xs mb-6">
                    Select a conversation or group from the sidebar to start chatting.
                  </p>
                  <button
                    onClick={() => openNewConvModal('dm')}
                    className="px-6 py-2.5 bg-blue-600 text-white rounded-full font-semibold hover:bg-blue-700 transition shadow-md"
                  >
                    Start a New Chat
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* ── Modals ─────────────────────────────────────────── */}
      {showNewConvModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3 className="text-lg font-bold dark:text-white">
                {newConvMode === 'dm' ? 'New Message' : 'Create Group Chat'}
              </h3>
              <button onClick={() => setShowNewConvModal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
                <X className="w-5 h-5 dark:text-gray-400" />
              </button>
            </div>

            {newConvMode === 'group' && (
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <input
                  type="text"
                  placeholder="Group Name (optional)"
                  value={groupChatName}
                  onChange={e => setGroupChatName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 dark:bg-gray-700 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            <div className="p-4">
              <div className="relative mb-4">
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchUser}
                  onChange={e => setSearchUser(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 dark:bg-gray-700 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500"
                />
                <Search className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
              </div>

              <div className="max-h-60 overflow-y-auto space-y-2">
                {filteredUsers.map(user => (
                  <button
                    key={user.user_id}
                    onClick={() => {
                      if (newConvMode === 'dm') startDirectConversation(user.user_id);
                      else toggleGroupMember(user);
                    }}
                    className={`w-full p-3 flex items-center gap-3 rounded-xl transition ${
                      selectedGroupMembers.find(m => m.user_id === user.user_id)
                        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 border'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700 border border-transparent'
                    }`}
                  >
                    {user.picture ? (
                      <Image src={user.picture} alt={user.name} width={40} height={40} className="rounded-full" unoptimized />
                    ) : (
                      <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="text-left">
                      <p className="font-semibold dark:text-white">{user.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
                    </div>
                    {newConvMode === 'group' && (
                      <div className={`ml-auto w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        selectedGroupMembers.find(m => m.user_id === user.user_id)
                          ? 'bg-blue-600 border-blue-600'
                          : 'border-gray-300'
                      }`}>
                        {selectedGroupMembers.find(m => m.user_id === user.user_id) && <Check className="w-3 h-3 text-white" />}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {newConvMode === 'group' && (
              <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  disabled={selectedGroupMembers.length < 2}
                  onClick={createGroupDM}
                  className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 transition shadow-lg"
                >
                  Create Group ({selectedGroupMembers.length} members)
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Media Upload Modal */}
      {showMediaModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[70] p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden max-w-lg w-full">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h3 className="font-bold dark:text-white">Preview Media</h3>
              <button onClick={() => setShowMediaModal(false)}><X className="w-6 h-6 dark:text-gray-400" /></button>
            </div>
            <div className="p-4 flex flex-col items-center">
              {selectedMedia?.type.startsWith('video/') ? (
                <video src={mediaPreview || ''} controls className="max-h-[60vh] rounded-lg" />
              ) : (
                <img src={mediaPreview || ''} alt="Preview" className="max-h-[60vh] rounded-lg" />
              )}
              <div className="w-full mt-4 flex gap-3">
                <input
                  type="text"
                  placeholder="Add a caption..."
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-700 dark:bg-gray-700 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={sendMediaMessage}
                  disabled={uploading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50"
                >
                  {uploading ? 'Sending...' : 'Send'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Media Gallery Modal */}
      {showMediaGallery && (
        <div className="fixed inset-0 bg-black/90 flex flex-col z-[80]">
          <div className="p-4 flex items-center justify-between text-white">
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
