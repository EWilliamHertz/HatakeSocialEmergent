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
      const res  = await fetch(`/api/groups/${groupId}/chat`, { credentials: 'include' });
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
      await fetch(`/api/groups/${selectedGroup}/chat`, {
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
                  /* Groups tab — unchanged */
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
                          <Image src={group.image} alt={group.name} width={40} height={40} className="rounded-xl" unoptimized />
                        ) : (
                          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center text-white flex-shrink-0">
                            <Users className="w-5 h-5" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className="font-semibold truncate dark:text-white">{group.name}</p>
                            <span className="text-xs text-gray-400">{group.member_count} members</span>
                          </div>
                          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                            {group.last_message || 'No messages yet'}
                          </p>
                        </div>
                      </button>
                    ))
                  )
                )}
              </div>
            </div>

            {/* ── Chat area ────────────────────────────────── */}
            <div className="flex-1 flex flex-col relative">

              {/* Scroll-to-bottom button — shown when user has scrolled up */}
              {isUserScrolledUp && (selectedConv || selectedGroup) && (
                <button
                  onClick={() => scrollToBottom(true)}
                  className="absolute bottom-24 right-6 z-20 bg-blue-600 text-white rounded-full px-3 py-1.5 text-xs font-semibold shadow-lg hover:bg-blue-700 flex items-center gap-1 transition"
                >
                  ↓ Latest
                </button>
              )}

              {selectedConv ? (
                <>
                  {/* Header */}
                  {(() => {
                    const conv = conversations.find(c => c.conversation_id === selectedConv);
                    if (!conv) return null;
                    return (
                      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {conv.is_group ? (
                            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center text-white">
                              <Users className="w-5 h-5" />
                            </div>
                          ) : conv.picture ? (
                            <Image src={conv.picture} alt={conv.name} width={40} height={40} className="rounded-full" />
                          ) : (
                            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                              {conv.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <p className="font-semibold dark:text-white">
                              {conv.user_id
                                ? <a href={`/profile/${conv.user_id}`} className="hover:text-blue-600">{conv.name}</a>
                                : conv.name
                              }
                            </p>
                            <p className="text-xs text-gray-500">{conv.is_group ? 'Group chat' : 'Active now'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="relative">
                            <input
                              type="text" placeholder="Search messages..."
                              value={messageSearch} onChange={e => setMessageSearch(e.target.value)}
                              className="pl-8 pr-3 py-1.5 text-sm border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-white w-40 focus:w-52 transition-all"
                            />
                            <Search className="w-4 h-4 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                          </div>
                          <button onClick={() => loadMediaGallery(selectedConv!)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg" title="Shared media">
                            <ImageIcon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                          </button>
                          {!conv.is_group && (
                            <>
                              <button onClick={() => setShowAudioCall(true)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg" title="Voice Call">
                                <Phone className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                              </button>
                              <button onClick={() => setShowVideoCall(true)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg" title="Video Call">
                                <VideoIcon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-1" onScroll={handleScroll} ref={messagesContainerRef}>
                    {filteredMessages.length === 0 ? (
                      <div className="text-center py-8">
                        <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                        <p className="text-gray-500 dark:text-gray-400 text-sm">
                          {messageSearch ? 'No messages match your search' : 'No messages yet. Say hi!'}
                        </p>
                      </div>
                    ) : (
                      filteredMessages.map((msg, index) => {
                        const prevMsg  = index > 0 ? filteredMessages[index - 1] : null;
                        const isOwn    = msg.sender_id === currentUserId;
                        const isLast   = index === filteredMessages.length - 1 ||
                                         filteredMessages[index + 1].sender_id !== msg.sender_id;

                        return (
                          <div key={msg.message_id}>
                            {needsDateSeparator(msg, prevMsg) && (
                              <div className="flex items-center justify-center my-6">
                                <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
                                <span className="px-4 text-xs text-gray-500 font-medium">
                                  {formatDateSeparator(msg.created_at)}
                                </span>
                                <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
                              </div>
                            )}

                            <div className={`flex gap-3 group ${isOwn ? 'flex-row-reverse' : ''}`}>
                              {/* Avatar */}
                              {msg.picture ? (
                                <a href={`/profile/${msg.sender_id}`} className="flex-shrink-0">
                                  <Image src={msg.picture} alt={msg.name} width={32} height={32} className="rounded-full" />
                                </a>
                              ) : (
                                <a href={`/profile/${msg.sender_id}`} className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                                  {msg.name.charAt(0).toUpperCase()}
                                </a>
                              )}

                              {/* Reply button */}
                              <button
                                onClick={() => setReplyTo(msg)}
                                className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full self-center"
                              >
                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                                </svg>
                              </button>

                              <div>
                                {/* Reply preview */}
                                {msg.reply_content && (
                                  <div className={`text-xs mb-1 px-3 py-1.5 rounded-lg border-l-2 ${
                                    isOwn
                                      ? 'bg-blue-500/20 border-blue-300 text-blue-100'
                                      : 'bg-gray-200 dark:bg-gray-600 border-gray-400 text-gray-600 dark:text-gray-300'
                                  }`}>
                                    <span className="font-medium">{msg.reply_sender_name}</span>
                                    <p className="truncate max-w-[200px]">{msg.reply_content}</p>
                                  </div>
                                )}

                                {/* Bubble */}
                                <div className={`max-w-sm rounded-2xl px-4 py-2 ${
                                  isOwn ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 dark:text-white'
                                }`}>
                                  {renderMessageContent(msg)}
                                </div>

                                {/* Timestamp + read receipt — only on last bubble in a group */}
                                {isLast && (
                                  <div className={`flex items-center gap-1 mt-1 ${isOwn ? 'justify-end' : ''}`}>
                                    <span className="text-xs text-gray-400">
                                      {formatMessageTime(msg.created_at)}
                                    </span>
                                    {/* ← Read receipt tick */}
                                    <ReadStatus readAt={msg.read_at} isSender={isOwn} />
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Input */}
                  <div className="border-t border-gray-200 dark:border-gray-700 p-4">
                    {replyTo && (
                      <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/30 px-4 py-2 mb-3 rounded-lg border-l-4 border-blue-500">
                        <div className="flex items-center gap-3">
                          <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                          </svg>
                          <div>
                            <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                              Replying to {replyTo.sender_id === currentUserId ? 'yourself' : replyTo.name}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400 truncate max-w-[300px]">
                              {replyTo.content || (replyTo.media_url ? '[Media]' : '')}
                            </p>
                          </div>
                        </div>
                        <button onClick={() => setReplyTo(null)} className="p-1 hover:bg-blue-100 rounded">
                          <X className="w-4 h-4 text-gray-500" />
                        </button>
                      </div>
                    )}
                    <div className="flex gap-2 items-end relative">
                      <div className="flex gap-1">
                        <button onClick={() => fileInputRef.current?.click()} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                          <ImageIcon className="w-5 h-5 text-gray-500" />
                        </button>
                        <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                          <Smile className="w-5 h-5 text-gray-500" />
                        </button>
                      </div>
                      <input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleFileSelect} />
                      {showEmojiPicker && (
                        <div className="absolute bottom-16 left-0 z-50">
                          <EmojiPicker onEmojiClick={handleEmojiSelect} theme={Theme.LIGHT} width={350} height={400} />
                        </div>
                      )}
                      <textarea
                        ref={textareaRef} value={newMessage}
                        onChange={handleTextareaChange} onKeyDown={handleKeyDown}
                        placeholder="Type a message… (Shift+Enter for new line)"
                        className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 resize-none min-h-[40px] max-h-[120px]"
                        rows={1}
                      />
                      <button
                        onClick={() => selectedGroup ? sendGroupMessage(newMessage) : sendMessage()}
                        disabled={!newMessage.trim()}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                      >
                        <Send className="w-4 h-4" /> Send
                      </button>
                    </div>
                    <p className="text-xs text-gray-400 mt-1 ml-2">Enter to send · Shift+Enter for new line</p>
                  </div>
                </>
              ) : selectedGroup ? (
                /* ── Group Chat View ─────────────────────────── */
                <>
                  {/* Group Header */}
                  {(() => {
                    const group = groupChats.find(g => g.group_id === selectedGroup);
                    if (!group) return null;
                    return (
                      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {group.image ? (
                            <Image src={group.image} alt={group.name} width={40} height={40} className="rounded-xl" unoptimized />
                          ) : (
                            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center text-white">
                              <Users className="w-5 h-5" />
                            </div>
                          )}
                          <div>
                            <p className="font-semibold dark:text-white">{group.name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{group.member_count} members</p>
                          </div>
                        </div>
                        <button
                          onClick={() => router.push(`/groups/${selectedGroup}`)}
                          className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                        >
                          View Group
                        </button>
                      </div>
                    );
                  })()}

                  {/* Group Messages */}
                  <div
                    className="flex-1 overflow-y-auto p-4 space-y-1"
                    onScroll={handleScroll}
                    ref={messagesContainerRef}
                  >
                    {messages.length === 0 ? (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                          <Users className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                          <p className="text-gray-500 dark:text-gray-400">No messages yet</p>
                          <p className="text-gray-400 text-sm">Be the first to say something!</p>
                        </div>
                      </div>
                    ) : (
                      <>
                        {filteredMessages.map((msg, idx) => {
                          const isOwn    = msg.sender_id === currentUserId;
                          const prevMsg  = idx > 0 ? filteredMessages[idx - 1] : null;
                          const isLast   = idx === filteredMessages.length - 1 ||
                                           filteredMessages[idx + 1].sender_id !== msg.sender_id;

                          return (
                            <div key={msg.message_id}>
                              {needsDateSeparator(msg, prevMsg) && (
                                <div className="flex items-center justify-center my-4">
                                  <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
                                  <span className="px-3 text-xs text-gray-500 dark:text-gray-400 font-medium">
                                    {formatDateSeparator(msg.created_at)}
                                  </span>
                                  <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
                                </div>
                              )}

                              <div className={`flex gap-2 items-end group/msg ${isOwn ? 'justify-end' : 'justify-start'}`}>
                                {/* Avatar (other users only) */}
                                {!isOwn && (
                                  <a href={`/profile/${msg.sender_id}`} className="flex-shrink-0">
                                    {msg.picture ? (
                                      <Image src={msg.picture} alt={msg.name} width={28} height={28} className="rounded-full hover:ring-2 hover:ring-blue-400 transition" unoptimized />
                                    ) : (
                                      <div className="w-7 h-7 bg-purple-600 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                                        {msg.name?.charAt(0).toUpperCase() || '?'}
                                      </div>
                                    )}
                                  </a>
                                )}

                                {/* Reply button (own messages) */}
                                {isOwn && (
                                  <button
                                    onClick={() => setReplyTo(msg)}
                                    className="opacity-0 group-hover/msg:opacity-100 p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition self-center"
                                    title="Reply"
                                  >
                                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                                    </svg>
                                  </button>
                                )}

                                <div className={`max-w-[70%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
                                  {/* Sender name (other users only) */}
                                  {!isOwn && (
                                    <a href={`/profile/${msg.sender_id}`} className="text-xs text-gray-500 mb-0.5 ml-1 hover:text-blue-600 transition">
                                      {msg.name}
                                    </a>
                                  )}

                                  {/* Reply preview */}
                                  {msg.reply_content && (
                                    <div className={`text-xs mb-1 px-3 py-1.5 rounded-lg border-l-2 ${
                                      isOwn
                                        ? 'bg-blue-500/20 border-blue-300 text-blue-100'
                                        : 'bg-gray-200 dark:bg-gray-600 border-gray-400 text-gray-600 dark:text-gray-300'
                                    }`}>
                                      <span className="font-medium">{msg.reply_sender_name}</span>
                                      <p className="truncate max-w-[200px]">{msg.reply_content}</p>
                                    </div>
                                  )}

                                  {/* Bubble */}
                                  <div className={`rounded-2xl px-4 py-2 ${
                                    isOwn
                                      ? 'bg-blue-600 text-white rounded-br-sm'
                                      : 'bg-gray-100 dark:bg-gray-700 dark:text-white rounded-bl-sm'
                                  }`}>
                                    {renderMessageContent(msg)}
                                  </div>

                                  {/* Timestamp — only on last bubble in group */}
                                  {isLast && (
                                    <p className={`text-xs text-gray-400 mt-0.5 ${isOwn ? 'text-right mr-1' : 'ml-1'}`}>
                                      {formatMessageTime(msg.created_at)}
                                    </p>
                                  )}
                                </div>

                                {/* Reply button (other messages) */}
                                {!isOwn && (
                                  <button
                                    onClick={() => setReplyTo(msg)}
                                    className="opacity-0 group-hover/msg:opacity-100 p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition self-center"
                                    title="Reply"
                                  >
                                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                                    </svg>
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                        <div ref={messagesEndRef} />
                      </>
                    )}
                  </div>

                  {/* Group Message Input */}
                  <div className="border-t border-gray-200 dark:border-gray-700 p-4">
                    {replyTo && (
                      <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/30 px-4 py-2 mb-3 rounded-lg border-l-4 border-blue-500">
                        <div className="flex items-center gap-3">
                          <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                          </svg>
                          <div>
                            <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                              Replying to {replyTo.sender_id === currentUserId ? 'yourself' : replyTo.name}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400 truncate max-w-[300px]">
                              {replyTo.content || (replyTo.media_url ? '[Media]' : '')}
                            </p>
                          </div>
                        </div>
                        <button onClick={() => setReplyTo(null)} className="p-1 hover:bg-blue-100 dark:hover:bg-blue-800 rounded">
                          <X className="w-4 h-4 text-gray-500" />
                        </button>
                      </div>
                    )}
                    <div className="flex gap-2 items-end relative">
                      <div className="flex gap-1">
                        <button onClick={() => fileInputRef.current?.click()} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                          <ImageIcon className="w-5 h-5 text-gray-500" />
                        </button>
                        <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                          <Smile className="w-5 h-5 text-gray-500" />
                        </button>
                      </div>
                      {showEmojiPicker && (
                        <div className="absolute bottom-16 left-0 z-50">
                          <EmojiPicker onEmojiClick={handleEmojiSelect} theme={Theme.LIGHT} width={350} height={400} />
                        </div>
                      )}
                      <textarea
                        ref={textareaRef}
                        value={newMessage}
                        onChange={handleTextareaChange}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendGroupMessage(newMessage); }
                        }}
                        placeholder="Type a message to the group…"
                        className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 resize-none min-h-[40px] max-h-[120px]"
                        rows={1}
                      />
                      <button
                        onClick={() => sendGroupMessage(newMessage)}
                        disabled={!newMessage.trim()}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                      >
                        <Send className="w-4 h-4" /> Send
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400 mb-2">Select a conversation to start messaging</p>
                    <div className="flex gap-2 justify-center">
                      <button onClick={() => openNewConvModal('dm')} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700">
                        New Message
                      </button>
                      <button onClick={() => openNewConvModal('group')} className="px-4 py-2 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700">
                        New Group Chat
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          NEW CONVERSATION MODAL
          Supports both DM mode and multi-user group DM mode
      ══════════════════════════════════════════════════════ */}
      {showNewConvModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md mx-4">
            {/* Modal header + mode tabs */}
            <div className="p-4 border-b dark:border-gray-700 flex items-center justify-between">
              <h3 className="text-lg font-bold dark:text-white">
                {newConvMode === 'group' ? 'New Group Chat' : 'New Conversation'}
              </h3>
              <button onClick={() => setShowNewConvModal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                <X className="w-5 h-5 dark:text-gray-300" />
              </button>
            </div>

            {/* Mode toggle */}
            <div className="flex border-b dark:border-gray-700">
              <button
                onClick={() => { setNewConvMode('dm'); setSelectedGroupMembers([]); }}
                className={`flex-1 py-2.5 text-sm font-semibold flex items-center justify-center gap-2 border-b-2 transition ${
                  newConvMode === 'dm'
                    ? 'text-blue-600 border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                    : 'text-gray-500 border-transparent hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <MessageCircle className="w-4 h-4" /> Direct Message
              </button>
              <button
                onClick={() => setNewConvMode('group')}
                className={`flex-1 py-2.5 text-sm font-semibold flex items-center justify-center gap-2 border-b-2 transition ${
                  newConvMode === 'group'
                    ? 'text-purple-600 border-purple-600 bg-purple-50 dark:bg-purple-900/20'
                    : 'text-gray-500 border-transparent hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <Users className="w-4 h-4" /> Group Chat
              </button>
            </div>

            {/* Group name input (group mode only) */}
            {newConvMode === 'group' && (
              <div className="px-4 pt-3">
                <input
                  type="text"
                  value={groupChatName}
                  onChange={e => setGroupChatName(e.target.value)}
                  placeholder="Group name (optional)"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                />
              </div>
            )}

            {/* Selected members chips (group mode) */}
            {newConvMode === 'group' && selectedGroupMembers.length > 0 && (
              <div className="px-4 pt-2 flex flex-wrap gap-1.5">
                {selectedGroupMembers.map(u => (
                  <span
                    key={u.user_id}
                    className="flex items-center gap-1 bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-xs font-medium px-2 py-1 rounded-full"
                  >
                    {u.name}
                    <button onClick={() => toggleGroupMember(u)}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Search */}
            <div className="p-4 border-b dark:border-gray-700">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text" value={searchUser}
                  onChange={e => setSearchUser(e.target.value)}
                  placeholder="Search users…"
                  className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
                {newConvMode === 'group'
                  ? `Select at least 2 people · ${selectedGroupMembers.length} selected`
                  : 'You can message anyone on the platform'}
              </p>
            </div>

            {/* User list */}
            <div className="max-h-72 overflow-y-auto">
              {filteredUsers.length === 0 ? (
                <div className="p-8 text-center">
                  <Users className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500 dark:text-gray-400 text-sm">
                    {allUsers.length === 0 ? 'Loading…' : 'No users found'}
                  </p>
                </div>
              ) : (
                filteredUsers.map(u => {
                  const isSelected = selectedGroupMembers.some(m => m.user_id === u.user_id);
                  return (
                    <button
                      key={u.user_id}
                      onClick={() => newConvMode === 'dm' ? startDirectConversation(u.user_id) : toggleGroupMember(u)}
                      className={`w-full p-4 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700 text-left border-b dark:border-gray-700 last:border-b-0 ${
                        isSelected ? 'bg-purple-50 dark:bg-purple-900/20' : ''
                      }`}
                    >
                      {u.picture ? (
                        <Image src={u.picture} alt={u.name} width={40} height={40} className="rounded-full" />
                      ) : (
                        <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="font-semibold dark:text-white">{u.name}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{u.email}</p>
                      </div>
                      {newConvMode === 'group' && (
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                          isSelected ? 'bg-purple-600 border-purple-600' : 'border-gray-300 dark:border-gray-600'
                        }`}>
                          {isSelected && <Check className="w-3 h-3 text-white" />}
                        </div>
                      )}
                    </button>
                  );
                })
              )}
            </div>

            {/* Create group button */}
            {newConvMode === 'group' && (
              <div className="p-4 border-t dark:border-gray-700">
                <button
                  onClick={createGroupDM}
                  disabled={selectedGroupMembers.length < 2}
                  className="w-full py-2.5 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Users className="w-4 h-4" />
                  Create Group Chat ({selectedGroupMembers.length} selected)
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Remaining modals (unchanged from your original) ─── */}

      {/* Media Preview Modal */}
      {showMediaModal && mediaPreview && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg mx-4">
            <div className="p-4 border-b dark:border-gray-700 flex items-center justify-between">
              <h3 className="text-lg font-bold dark:text-white">Send Media</h3>
              <button onClick={() => { setShowMediaModal(false); setSelectedMedia(null); setMediaPreview(null); }} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                <X className="w-5 h-5 dark:text-gray-300" />
              </button>
            </div>
            <div className="p-4">
              {selectedMedia?.type.startsWith('video/')
                ? <video src={mediaPreview} controls className="w-full rounded-lg max-h-80" />
                : <img src={mediaPreview} alt="Preview" className="w-full rounded-lg max-h-80 object-contain" />
              }
            </div>
            <div className="p-4 border-t dark:border-gray-700 flex justify-end gap-2">
              <button onClick={() => { setShowMediaModal(false); setSelectedMedia(null); setMediaPreview(null); }} className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                Cancel
              </button>
              <button onClick={sendMediaMessage} disabled={uploading} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
                {uploading ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Sending…</> : <><Send className="w-4 h-4" /> Send</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Video Call */}
      {showVideoCall && selectedConv && (
        <VideoCall
          isOpen={showVideoCall} onClose={() => setShowVideoCall(false)} callType="video"
          remoteUserId={conversations.find(c => c.conversation_id === selectedConv)?.user_id || ''}
          remoteUserName={conversations.find(c => c.conversation_id === selectedConv)?.name || 'User'}
          remoteUserPicture={conversations.find(c => c.conversation_id === selectedConv)?.picture}
          currentUserId={currentUserId} currentUserName={currentUserName}
        />
      )}

      {/* Audio Call */}
      {showAudioCall && selectedConv && (
        <VideoCall
          isOpen={showAudioCall} onClose={() => setShowAudioCall(false)} callType="audio"
          remoteUserId={conversations.find(c => c.conversation_id === selectedConv)?.user_id || ''}
          remoteUserName={conversations.find(c => c.conversation_id === selectedConv)?.name || 'User'}
          remoteUserPicture={conversations.find(c => c.conversation_id === selectedConv)?.picture}
          currentUserId={currentUserId} currentUserName={currentUserName}
        />
      )}

      {/* Media Gallery */}
      {showMediaGallery && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b dark:border-gray-700 flex items-center justify-between">
              <h3 className="text-lg font-bold dark:text-white">Shared Media</h3>
              <button onClick={() => setShowMediaGallery(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                <X className="w-5 h-5 dark:text-gray-300" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {mediaGallery.length === 0 ? (
                <div className="text-center py-12">
                  <ImageIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No shared media yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {mediaGallery.map(media => (
                    <div key={media.message_id} onClick={() => setFullscreenMedia(media)} className="aspect-square bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition">
                      {media.message_type === 'video'
                        ? <video src={media.media_url} className="w-full h-full object-cover" />
                        : <img src={media.media_url} alt="" className="w-full h-full object-cover" />
                      }
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Media */}
      {fullscreenMedia && (
        <div className="fixed inset-0 bg-black z-50 flex items-center justify-center" onClick={() => setFullscreenMedia(null)}>
          <button className="absolute top-4 right-4 p-2 text-white hover:bg-white/20 rounded-lg" onClick={() => setFullscreenMedia(null)}>
            <X className="w-6 h-6" />
          </button>
          {fullscreenMedia.message_type === 'video'
            ? <video src={fullscreenMedia.media_url} controls autoPlay className="max-w-full max-h-full" onClick={e => e.stopPropagation()} />
            : <img src={fullscreenMedia.media_url} alt="" className="max-w-full max-h-full object-contain" onClick={e => e.stopPropagation()} />
          }
        </div>
      )}
    </div>
  );
}