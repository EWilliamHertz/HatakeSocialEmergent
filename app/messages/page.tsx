'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import VideoCall from '@/components/VideoCall';
import { MessageCircle, Send, Plus, Users, X, Search, Smile, Image as ImageIcon, Video, Volume2, VolumeX, Phone, Video as VideoIcon, Upload, Camera } from 'lucide-react';
import Image from 'next/image';
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react';

interface Conversation {
  conversation_id: string;
  user_id: string;
  name: string;
  picture?: string;
  last_message: string;
  last_message_at: string;
  unread_count: number;
  is_group?: boolean;
  group_id?: string;
}

interface GroupChat {
  group_id: string;
  name: string;
  image?: string;
  member_count: number;
  last_message?: string;
  last_message_at?: string;
  unread_count?: number;
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
  reply_to?: string;
  reply_content?: string;
  reply_sender_name?: string;
}

interface User {
  user_id: string;
  name: string;
  email: string;
  picture?: string;
}

// Notification sound - play a pleasant chime
const playNotificationChime = () => {
  if (typeof window === 'undefined') return;
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // First note
    const osc1 = audioContext.createOscillator();
    const gain1 = audioContext.createGain();
    osc1.connect(gain1);
    gain1.connect(audioContext.destination);
    osc1.frequency.value = 880; // A5
    osc1.type = 'sine';
    gain1.gain.setValueAtTime(0.3, audioContext.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    osc1.start(audioContext.currentTime);
    osc1.stop(audioContext.currentTime + 0.3);
    
    // Second note (higher, after delay)
    setTimeout(() => {
      const osc2 = audioContext.createOscillator();
      const gain2 = audioContext.createGain();
      osc2.connect(gain2);
      gain2.connect(audioContext.destination);
      osc2.frequency.value = 1046.5; // C6
      osc2.type = 'sine';
      gain2.gain.setValueAtTime(0.3, audioContext.currentTime);
      gain2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      osc2.start(audioContext.currentTime);
      osc2.stop(audioContext.currentTime + 0.3);
    }, 150);
  } catch (e) {
    console.log('Error playing notification:', e);
  }
};

export default function MessagesPage() {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [groupChats, setGroupChats] = useState<GroupChat[]>([]);
  const [messageTab, setMessageTab] = useState<'direct' | 'groups'>('direct');
  const [selectedConv, setSelectedConv] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [currentUserId, setCurrentUserId] = useState('');
  const [currentUserName, setCurrentUserName] = useState('');
  const [loading, setLoading] = useState(true);
  const [showNewConversationModal, setShowNewConversationModal] = useState(false);
  const [friends, setFriends] = useState<User[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [searchUser, setSearchUser] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [showVideoCall, setShowVideoCall] = useState(false);
  const [showAudioCall, setShowAudioCall] = useState(false);
  const [messageSearch, setMessageSearch] = useState('');
  const [showMediaGallery, setShowMediaGallery] = useState(false);
  const [mediaGallery, setMediaGallery] = useState<Message[]>([]);
  const [fullscreenMedia, setFullscreenMedia] = useState<Message | null>(null);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [isUserScrolledUp, setIsUserScrolledUp] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastMessageCount = useRef(0);

  // Format message timestamp
  const formatMessageTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24 && date.getDate() === now.getDate()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    if (diffDays === 1) return 'Yesterday ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (diffDays < 7) return date.toLocaleDateString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' });
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  // Format date separator
  const formatDateSeparator = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return date.toLocaleDateString([], { weekday: 'long' });
    return date.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' });
  };

  // Check if we need a date separator between messages
  const needsDateSeparator = (currentMsg: Message, prevMsg: Message | null) => {
    if (!prevMsg) return true;
    const currentDate = new Date(currentMsg.created_at).toDateString();
    const prevDate = new Date(prevMsg.created_at).toDateString();
    return currentDate !== prevDate;
  };

  // Filter messages by search
  const filteredMessages = messageSearch.trim()
    ? messages.filter(m => m.content.toLowerCase().includes(messageSearch.toLowerCase()))
    : messages;

  // Load media gallery for conversation
  const loadMediaGallery = async (convId: string) => {
    try {
      const res = await fetch(`/api/messages/${convId}?media_only=true`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setMediaGallery(data.messages?.filter((m: Message) => m.message_type === 'image' || m.message_type === 'video') || []);
        setShowMediaGallery(true);
      }
    } catch (e) {
      console.error('Load media gallery error:', e);
    }
  };

  // Initialize audio - no longer needed with Web Audio API
  useEffect(() => {
    // Web Audio API is used directly in playNotificationChime
  }, []);

  // Play notification sound
  const playNotificationSound = useCallback(() => {
    if (soundEnabled) {
      playNotificationChime();
    }
  }, [soundEnabled]);

  // Handle scroll to detect if user is scrolled up
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
    setIsUserScrolledUp(!isAtBottom);
  };

  // Scroll to bottom when messages change (only if not scrolled up)
  useEffect(() => {
    if (initialLoad || !isUserScrolledUp) {
      messagesEndRef.current?.scrollIntoView({ behavior: initialLoad ? 'auto' : 'smooth' });
      if (initialLoad && messages.length > 0) {
        setInitialLoad(false);
      }
    }
  }, [messages, initialLoad, isUserScrolledUp]);

  // Reset initial load when conversation changes
  useEffect(() => {
    setInitialLoad(true);
    setIsUserScrolledUp(false);
  }, [selectedConv, selectedGroup]);

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then((res) => {
        if (!res.ok) {
          router.push('/auth/login');
          return;
        }
        return res.json();
      })
      .then((data) => {
        if (data?.user) {
          setCurrentUserId(data.user.user_id);
          setCurrentUserName(data.user.name || 'User');
          loadConversations();
          loadGroupChats();
        }
      })
      .catch(() => router.push('/auth/login'));
  }, [router]);

  // Poll for new messages when a conversation is selected
  useEffect(() => {
    if (!selectedConv && !selectedGroup) return;
    
    const interval = setInterval(() => {
      if (selectedConv) {
        loadMessages(selectedConv, true);
      } else if (selectedGroup) {
        loadGroupMessages(selectedGroup, true);
      }
    }, 3000);
    
    return () => clearInterval(interval);
  }, [selectedConv, selectedGroup]);

  const loadGroupChats = async () => {
    try {
      const res = await fetch('/api/groups?my_groups=true', { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setGroupChats(data.groups || []);
      }
    } catch (error) {
      console.error('Load group chats error:', error);
    }
  };

  const loadGroupMessages = async (groupId: string, silent = false) => {
    try {
      const res = await fetch(`/api/groups/${groupId}/chat`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        const newMessages = data.messages || [];
        
        // Check if there are new messages from other users
        if (!silent && newMessages.length > messages.length) {
          const latestMessage = newMessages[newMessages.length - 1];
          if (latestMessage && latestMessage.sender_id !== currentUserId) {
            playNotificationSound();
          }
        }
        
        setMessages(newMessages);
      }
    } catch (error) {
      console.error('Load group messages error:', error);
    }
  };

  const sendGroupMessage = async (content: string, messageType = 'text') => {
    if (!selectedGroup) return;
    
    try {
      const res = await fetch(`/api/groups/${selectedGroup}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          content,
          message_type: messageType
        })
      });
      
      const data = await res.json();
      if (data.success) {
        loadGroupMessages(selectedGroup);
        setNewMessage('');
      }
    } catch (error) {
      console.error('Send group message error:', error);
    }
  };

  const selectGroupChat = (groupId: string) => {
    setSelectedGroup(groupId);
    setSelectedConv(null);
    loadGroupMessages(groupId);
    // Reset text area
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const loadConversations = async () => {
    try {
      const res = await fetch('/api/messages', { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        const newConversations = data.conversations || [];
        setConversations(newConversations);
        
        // Check for new messages and play sound
        const totalUnread = newConversations.reduce((sum: number, c: Conversation) => sum + (c.unread_count || 0), 0);
        if (totalUnread > lastMessageCount.current && lastMessageCount.current > 0) {
          playNotificationSound();
        }
        lastMessageCount.current = totalUnread;
      }
    } catch (error) {
      console.error('Load conversations error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (convId: string, silent = false) => {
    try {
      const res = await fetch(`/api/messages/${convId}`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        const newMessages = data.messages || [];
        
        // Check if there are new messages from other users
        if (!silent && newMessages.length > messages.length) {
          const latestMessage = newMessages[newMessages.length - 1];
          if (latestMessage && latestMessage.sender_id !== currentUserId) {
            playNotificationSound();
          }
        }
        
        setMessages(newMessages);
      }
    } catch (error) {
      console.error('Load messages error:', error);
    }
  };

  const loadFriends = async () => {
    try {
      const res = await fetch('/api/friends', { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setFriends(data.friends || []);
      }
    } catch (error) {
      console.error('Load friends error:', error);
    }
  };

  const loadAllUsers = async () => {
    try {
      const res = await fetch('/api/users/search?q=', { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        // Filter out current user
        setAllUsers((data.users || []).filter((u: User) => u.user_id !== currentUserId));
      }
    } catch (error) {
      console.error('Load all users error:', error);
    }
  };

  const selectConversation = (convId: string) => {
    setSelectedConv(convId);
    setSelectedGroup(null);
    loadMessages(convId);
    // Reset text area
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const openNewConversationModal = () => {
    setShowNewConversationModal(true);
    loadFriends();
    loadAllUsers();
  };

  const startConversation = async (userId: string) => {
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          recipientId: userId,
          content: 'Hey! 👋'
        })
      });
      const data = await res.json();
      if (data.success) {
        setShowNewConversationModal(false);
        await loadConversations();
        if (data.conversationId) {
          selectConversation(data.conversationId);
        }
      }
    } catch (error) {
      console.error('Start conversation error:', error);
    }
  };

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
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          recipientId: conv.user_id,
          content: content || (messageType === 'image' ? '📷 Image' : '🎥 Video'),
          messageType: messageType || 'text',
          mediaUrl: mediaUrl,
          replyToId: replyToMsg?.message_id || null
        })
      });
      setNewMessage('');
      setShowEmojiPicker(false);
      loadMessages(selectedConv);
    } catch (error) {
      console.error('Send message error:', error);
    }
  };

  // Handle shift+enter for new line, enter to send
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
    // Shift+Enter will naturally add a new line
  };

  // Handle emoji selection
  const handleEmojiSelect = (emojiData: EmojiClickData) => {
    setNewMessage((prev) => prev + emojiData.emoji);
    textareaRef.current?.focus();
  };

  // Handle file selection for media
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    
    if (!isImage && !isVideo) {
      alert('Please select an image or video file');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB');
      return;
    }

    setSelectedMedia(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setMediaPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
    
    setShowMediaModal(true);
  };

  // Upload and send media
  const sendMediaMessage = async () => {
    if (!selectedMedia) return;
    
    setUploading(true);
    
    try {
      // Create form data
      const formData = new FormData();
      formData.append('file', selectedMedia);
      
      // Upload file
      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData
      });
      
      const uploadData = await uploadRes.json();
      
      if (uploadData.success && uploadData.url) {
        const isVideo = selectedMedia.type.startsWith('video/');
        await sendMessage(uploadData.url, isVideo ? 'video' : 'image');
      } else {
        // Fallback: use data URL as the media (for demo purposes)
        const isVideo = selectedMedia.type.startsWith('video/');
        await sendMessage(mediaPreview || '', isVideo ? 'video' : 'image');
      }
    } catch (error) {
      console.error('Upload error:', error);
      // Still try to send with data URL
      if (mediaPreview) {
        const isVideo = selectedMedia.type.startsWith('video/');
        await sendMessage(mediaPreview, isVideo ? 'video' : 'image');
      }
    } finally {
      setUploading(false);
      setShowMediaModal(false);
      setSelectedMedia(null);
      setMediaPreview(null);
    }
  };

  // Auto-resize textarea
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewMessage(e.target.value);
    
    // Auto-resize
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
  };

  // Filter users for search
  const filteredUsers = allUsers.filter(u => 
    u.name.toLowerCase().includes(searchUser.toLowerCase()) ||
    u.email.toLowerCase().includes(searchUser.toLowerCase())
  );

  // Render message content (text, image, or video)
  const renderMessageContent = (msg: Message) => {
    if (msg.message_type === 'image' && msg.media_url) {
      return (
        <div className="max-w-xs">
          <img 
            src={msg.media_url} 
            alt="Shared image" 
            className="rounded-lg max-w-full h-auto cursor-pointer hover:opacity-90"
            onClick={() => setFullscreenMedia(msg)}
          />
          {msg.content && msg.content !== '📷 Image' && msg.content !== msg.media_url && (
            <p className="text-sm mt-1">{msg.content}</p>
          )}
        </div>
      );
    }
    
    if (msg.message_type === 'video' && msg.media_url) {
      return (
        <div className="max-w-xs">
          <video 
            src={msg.media_url} 
            controls 
            className="rounded-lg max-w-full h-auto"
          />
          {msg.content && msg.content !== '🎥 Video' && msg.content !== msg.media_url && (
            <p className="text-sm mt-1">{msg.content}</p>
          )}
        </div>
      );
    }
    
    return <p className="text-sm whitespace-pre-wrap">{msg.content}</p>;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden" style={{ height: 'calc(100vh - 12rem)' }}>
          <div className="flex h-full">
            {/* Conversations List */}
            <div className="w-1/3 border-r border-gray-200 dark:border-gray-700 flex flex-col">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <h2 className="text-xl font-bold dark:text-white">Messages</h2>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setSoundEnabled(!soundEnabled)}
                    className={`p-2 rounded-lg transition ${soundEnabled ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}
                    title={soundEnabled ? 'Sound On' : 'Sound Off'}
                    data-testid="toggle-sound-button"
                  >
                    {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                  </button>
                  <button 
                    onClick={openNewConversationModal}
                    className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                    data-testid="start-conversation-button"
                    title="Start New Conversation"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </div>
              
              {/* Tabs for Direct Messages vs Groups */}
              <div className="flex border-b border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setMessageTab('direct')}
                  className={`flex-1 py-3 px-4 text-sm font-semibold flex items-center justify-center gap-2 transition border-b-2 ${
                    messageTab === 'direct'
                      ? 'text-blue-600 border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                      : 'text-gray-500 border-transparent hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                  data-testid="direct-messages-tab"
                >
                  <MessageCircle className="w-4 h-4" />
                  Direct
                  {conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0) > 0 && (
                    <span className="bg-blue-600 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                      {conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0)}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setMessageTab('groups')}
                  className={`flex-1 py-3 px-4 text-sm font-semibold flex items-center justify-center gap-2 transition border-b-2 ${
                    messageTab === 'groups'
                      ? 'text-blue-600 border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                      : 'text-gray-500 border-transparent hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                  data-testid="group-chats-tab"
                >
                  <Users className="w-4 h-4" />
                  Groups ({groupChats.length})
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto">
                {loading ? (
                  <div className="p-8 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  </div>
                ) : messageTab === 'direct' ? (
                  /* Direct Messages List */
                  conversations.length === 0 ? (
                    <div className="p-8 text-center">
                      <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                      <p className="text-gray-500 text-sm mb-4">No conversations yet</p>
                      <button
                        onClick={openNewConversationModal}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700"
                        data-testid="start-first-conversation"
                      >
                        Start a Conversation
                      </button>
                    </div>
                  ) : (
                    conversations.map((conv) => (
                      <button
                        key={conv.conversation_id}
                        onClick={() => selectConversation(conv.conversation_id)}
                        className={`w-full p-4 flex items-start gap-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition text-left ${
                          selectedConv === conv.conversation_id ? 'bg-blue-50 dark:bg-gray-700' : ''
                        }`}
                        data-testid={`conversation-${conv.conversation_id}`}
                      >
                        {conv.picture ? (
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
                          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{conv.last_message || 'Start a conversation'}</p>
                        </div>
                      </button>
                    ))
                  )
                ) : (
                  /* Group Chats List */
                  groupChats.length === 0 ? (
                    <div className="p-8 text-center">
                      <Users className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                      <p className="text-gray-500 text-sm mb-4">No groups joined</p>
                      <button
                        onClick={() => router.push('/groups')}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700"
                        data-testid="join-group-button"
                      >
                        Find Groups
                      </button>
                    </div>
                  ) : (
                    groupChats.map((group) => (
                      <button
                        key={group.group_id}
                        onClick={() => selectGroupChat(group.group_id)}
                        className={`w-full p-4 flex items-start gap-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition text-left ${
                          selectedGroup === group.group_id ? 'bg-blue-50 dark:bg-gray-700' : ''
                        }`}
                        data-testid={`group-chat-${group.group_id}`}
                      >
                        {group.image ? (
                          <Image src={group.image} alt={group.name} width={40} height={40} className="rounded-xl" unoptimized />
                        ) : (
                          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center text-white font-semibold flex-shrink-0">
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

            {/* Messages Area */}
            <div className="flex-1 flex flex-col">
              {selectedConv ? (
                <>
                  {/* Direct Chat Header */}
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    {(() => {
                      const conv = conversations.find(c => c.conversation_id === selectedConv);
                      return conv ? (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {conv.picture ? (
                              <Image src={conv.picture} alt={conv.name} width={40} height={40} className="rounded-full" />
                            ) : (
                              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                                {conv.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <p className="font-semibold dark:text-white">{conv.name}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">Active now</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {/* Message Search */}
                            <div className="relative">
                              <input
                                type="text"
                                placeholder="Search messages..."
                                value={messageSearch}
                                onChange={(e) => setMessageSearch(e.target.value)}
                                className="pl-8 pr-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-white w-40 focus:w-52 transition-all"
                                data-testid="message-search-input"
                              />
                              <Search className="w-4 h-4 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                            </div>
                            {/* Media Gallery */}
                            <button
                              onClick={() => loadMediaGallery(selectedConv!)}
                              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
                              title="View shared media"
                              data-testid="media-gallery-btn"
                            >
                              <ImageIcon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                            </button>
                            <button
                              onClick={() => setShowAudioCall(true)}
                              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
                              title="Voice Call"
                              data-testid="voice-call-button"
                            >
                              <Phone className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                            </button>
                            <button
                              onClick={() => setShowVideoCall(true)}
                              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
                              title="Video Call"
                              data-testid="video-call-button"
                            >
                              <VideoIcon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                            </button>
                          </div>
                        </div>
                      ) : null;
                    })()}
                  </div>
                  
                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {filteredMessages.length === 0 ? (
                      <div className="text-center py-8">
                        <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                        <p className="text-gray-500 dark:text-gray-400 text-sm">
                          {messageSearch ? 'No messages match your search' : 'No messages yet. Say hi!'}
                        </p>
                      </div>
                    ) : (
                      filteredMessages.map((msg, index) => {
                        const prevMsg = index > 0 ? filteredMessages[index - 1] : null;
                        const showDateSeparator = needsDateSeparator(msg, prevMsg);
                        
                        return (
                          <div key={msg.message_id}>
                            {/* Date Separator */}
                            {showDateSeparator && (
                              <div className="flex items-center justify-center my-6">
                                <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700"></div>
                                <span className="px-4 text-xs text-gray-500 dark:text-gray-400 font-medium">
                                  {formatDateSeparator(msg.created_at)}
                                </span>
                                <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700"></div>
                              </div>
                            )}
                            
                            <div
                              className={`flex gap-3 group ${
                                msg.sender_id === currentUserId ? 'flex-row-reverse' : ''
                              }`}
                            >
                              {msg.picture ? (
                                <Image src={msg.picture} alt={msg.name} width={32} height={32} className="rounded-full" />
                              ) : (
                                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                              {msg.name.charAt(0).toUpperCase()}
                                </div>
                              )}
                              <div className="flex items-end gap-2">
                                {/* Reply button - only show on other's messages */}
                                {msg.sender_id !== currentUserId && (
                                  <button 
                                    onClick={() => setReplyTo(msg)}
                                    className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition"
                                    title="Reply"
                                  >
                                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                                    </svg>
                                  </button>
                                )}
                                <div>
                                  {/* Reply Preview */}
                                  {msg.reply_content && (
                                    <div className={`text-xs mb-1 px-3 py-1.5 rounded-lg border-l-2 ${
                                      msg.sender_id === currentUserId 
                                        ? 'bg-blue-500/20 border-blue-300 text-blue-100' 
                                        : 'bg-gray-200 dark:bg-gray-600 border-gray-400 text-gray-600 dark:text-gray-300'
                                    }`}>
                                      <span className="font-medium">{msg.reply_sender_name}</span>
                                      <p className="truncate max-w-[200px]">{msg.reply_content}</p>
                                    </div>
                                  )}
                                  <div className={`max-w-sm ${
                                    msg.sender_id === currentUserId ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 dark:text-white'
                                  } rounded-2xl px-4 py-2`}>
                                    {renderMessageContent(msg)}
                                  </div>
                                  {/* Timestamp */}
                                  <p className={`text-xs text-gray-400 mt-1 ${msg.sender_id === currentUserId ? 'text-right' : ''}`}>
                                    {formatMessageTime(msg.created_at)}
                                  </p>
                                </div>
                                {/* Reply button - for own messages */}
                                {msg.sender_id === currentUserId && (
                                  <button 
                                    onClick={() => setReplyTo(msg)}
                                    className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition"
                                    title="Reply"
                                  >
                                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                                    </svg>
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Send Message */}
                  <div className="border-t border-gray-200 dark:border-gray-700 p-4">
                    {/* Reply Banner */}
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
                        <button 
                          onClick={() => setReplyTo(null)} 
                          className="p-1 hover:bg-blue-100 dark:hover:bg-blue-800 rounded"
                        >
                          <X className="w-4 h-4 text-gray-500" />
                        </button>
                      </div>
                    )}
                    <div className="flex gap-2 items-end relative">
                      {/* Media buttons */}
                      <div className="flex gap-1">
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
                          title="Send Image or Video"
                          data-testid="attach-media-button"
                        >
                          <ImageIcon className="w-5 h-5 text-gray-500" />
                        </button>
                        <button
                          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
                          title="Add Emoji"
                          data-testid="emoji-button"
                        >
                          <Smile className="w-5 h-5 text-gray-500" />
                        </button>
                      </div>
                      
                      {/* Hidden file input */}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*,video/*"
                        className="hidden"
                        onChange={handleFileSelect}
                        data-testid="file-input"
                      />
                      
                      {/* Emoji Picker */}
                      {showEmojiPicker && (
                        <div className="absolute bottom-16 left-0 z-50" data-testid="emoji-picker">
                          <EmojiPicker 
                            onEmojiClick={handleEmojiSelect}
                            theme={Theme.LIGHT}
                            width={350}
                            height={400}
                          />
                        </div>
                      )}
                      
                      {/* Text input - Now a textarea for multi-line support */}
                      <textarea
                        ref={textareaRef}
                        value={newMessage}
                        onChange={handleTextareaChange}
                        onKeyDown={handleKeyDown}
                        placeholder="Type a message... (Shift+Enter for new line)"
                        className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none min-h-[40px] max-h-[120px]"
                        rows={1}
                        data-testid="message-input"
                      />
                      
                      <button
                        onClick={() => sendMessage()}
                        disabled={!newMessage.trim()}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        data-testid="send-message-button"
                      >
                        <Send className="w-4 h-4" />
                        Send
                      </button>
                    </div>
                    <p className="text-xs text-gray-400 mt-1 ml-2">Press Enter to send, Shift+Enter for new line</p>
                  </div>
                </>
              ) : selectedGroup ? (
                /* Group Chat View */
                <>
                  {/* Group Chat Header */}
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    {(() => {
                      const group = groupChats.find(g => g.group_id === selectedGroup);
                      if (!group) return null;
                      return (
                        <div className="flex items-center justify-between">
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
                              <p className="text-xs text-gray-500">{group.member_count} members</p>
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
                  </div>

                  {/* Group Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.length === 0 ? (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                          <Users className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                          <p className="text-gray-500">No messages in this group yet</p>
                          <p className="text-gray-400 text-sm">Be the first to say something!</p>
                        </div>
                      </div>
                    ) : (
                      <>
                        {filteredMessages.map((msg, idx) => {
                          const isOwn = msg.sender_id === currentUserId;
                          const showDateSep = needsDateSeparator(msg, filteredMessages[idx - 1]);
                          
                          return (
                            <div key={msg.message_id}>
                              {showDateSep && (
                                <div className="flex items-center justify-center my-4">
                                  <div className="bg-gray-200 dark:bg-gray-700 px-3 py-1 rounded-full text-xs text-gray-500 dark:text-gray-400">
                                    {formatDateSeparator(msg.created_at)}
                                  </div>
                                </div>
                              )}
                              <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} gap-2 items-end`}>
                                {!isOwn && (
                                  <div className="flex flex-col items-center">
                                    {msg.picture ? (
                                      <Image src={msg.picture} alt={msg.name} width={28} height={28} className="rounded-full" unoptimized />
                                    ) : (
                                      <div className="w-7 h-7 bg-purple-600 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                                        {msg.name?.charAt(0).toUpperCase() || '?'}
                                      </div>
                                    )}
                                  </div>
                                )}
                                <div className={`max-w-[70%] ${isOwn ? 'order-first' : ''}`}>
                                  {!isOwn && (
                                    <p className="text-xs text-gray-500 mb-0.5 ml-1">{msg.name}</p>
                                  )}
                                  <div className={`rounded-2xl px-4 py-2 ${
                                    isOwn 
                                      ? 'bg-blue-600 text-white rounded-br-sm' 
                                      : 'bg-gray-100 dark:bg-gray-700 dark:text-white rounded-bl-sm'
                                  }`}>
                                    {renderMessageContent(msg)}
                                  </div>
                                  <p className={`text-xs text-gray-400 mt-0.5 ${isOwn ? 'text-right mr-1' : 'ml-1'}`}>
                                    {formatMessageTime(msg.created_at)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        <div ref={messagesEndRef} />
                      </>
                    )}
                  </div>

                  {/* Send Group Message */}
                  <div className="border-t border-gray-200 dark:border-gray-700 p-4">
                    <div className="flex gap-2 items-end relative">
                      <div className="flex gap-1">
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
                          title="Send Image or Video"
                        >
                          <ImageIcon className="w-5 h-5 text-gray-500" />
                        </button>
                        <button
                          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
                          title="Add Emoji"
                        >
                          <Smile className="w-5 h-5 text-gray-500" />
                        </button>
                      </div>
                      
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*,video/*"
                        className="hidden"
                        onChange={handleFileSelect}
                      />
                      
                      {showEmojiPicker && (
                        <div className="absolute bottom-16 left-0 z-50">
                          <EmojiPicker 
                            onEmojiClick={handleEmojiSelect}
                            theme={Theme.LIGHT}
                            width={350}
                            height={400}
                          />
                        </div>
                      )}
                      
                      <textarea
                        ref={textareaRef}
                        value={newMessage}
                        onChange={handleTextareaChange}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            sendGroupMessage(newMessage);
                          }
                        }}
                        placeholder="Type a message to the group..."
                        className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none min-h-[40px] max-h-[120px]"
                        rows={1}
                      />
                      
                      <button
                        onClick={() => sendGroupMessage(newMessage)}
                        disabled={!newMessage.trim()}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        <Send className="w-4 h-4" />
                        Send
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400 mb-4">Select a conversation to start messaging</p>
                    <button
                      onClick={openNewConversationModal}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
                      data-testid="start-new-conversation"
                    >
                      Start New Conversation
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* New Conversation Modal - Now allows messaging anyone */}
      {showNewConversationModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" data-testid="new-conversation-modal">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="p-4 border-b dark:border-gray-700 flex items-center justify-between">
              <h3 className="text-lg font-bold dark:text-white">Start New Conversation</h3>
              <button 
                onClick={() => setShowNewConversationModal(false)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                <X className="w-5 h-5 dark:text-gray-300" />
              </button>
            </div>
            
            <div className="p-4 border-b dark:border-gray-700">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  value={searchUser}
                  onChange={(e) => setSearchUser(e.target.value)}
                  placeholder="Search users..."
                  className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                  data-testid="search-users-input"
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">You can message anyone on the platform</p>
            </div>
            
            <div className="max-h-80 overflow-y-auto">
              {filteredUsers.length === 0 ? (
                <div className="p-8 text-center">
                  <Users className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500 dark:text-gray-400 text-sm">
                    {allUsers.length === 0 
                      ? 'Loading users...' 
                      : 'No users found matching your search'}
                  </p>
                </div>
              ) : (
                filteredUsers.map((user) => (
                  <button
                    key={user.user_id}
                    onClick={() => startConversation(user.user_id)}
                    className="w-full p-4 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700 text-left border-b dark:border-gray-700 last:border-b-0"
                    data-testid={`select-user-${user.user_id}`}
                  >
                    {user.picture ? (
                      <Image src={user.picture} alt={user.name} width={40} height={40} className="rounded-full" />
                    ) : (
                      <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="font-semibold dark:text-white">{user.name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Media Preview Modal */}
      {showMediaModal && mediaPreview && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" data-testid="media-preview-modal">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg mx-4">
            <div className="p-4 border-b dark:border-gray-700 flex items-center justify-between">
              <h3 className="text-lg font-bold dark:text-white">Send Media</h3>
              <button 
                onClick={() => {
                  setShowMediaModal(false);
                  setSelectedMedia(null);
                  setMediaPreview(null);
                }}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                <X className="w-5 h-5 dark:text-gray-300" />
              </button>
            </div>
            
            <div className="p-4">
              {selectedMedia?.type.startsWith('video/') ? (
                <video src={mediaPreview} controls className="w-full rounded-lg max-h-80" />
              ) : (
                <img src={mediaPreview} alt="Preview" className="w-full rounded-lg max-h-80 object-contain" />
              )}
            </div>
            
            <div className="p-4 border-t dark:border-gray-700 flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowMediaModal(false);
                  setSelectedMedia(null);
                  setMediaPreview(null);
                }}
                className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={sendMediaMessage}
                disabled={uploading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                data-testid="send-media-button"
              >
                {uploading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Send
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Video Call */}
      {showVideoCall && selectedConv && (
        <VideoCall
          isOpen={showVideoCall}
          onClose={() => setShowVideoCall(false)}
          callType="video"
          remoteUserId={conversations.find(c => c.conversation_id === selectedConv)?.user_id || ''}
          remoteUserName={conversations.find(c => c.conversation_id === selectedConv)?.name || 'User'}
          remoteUserPicture={conversations.find(c => c.conversation_id === selectedConv)?.picture}
          currentUserId={currentUserId}
          currentUserName={currentUserName}
        />
      )}

      {/* Audio Call */}
      {showAudioCall && selectedConv && (
        <VideoCall
          isOpen={showAudioCall}
          onClose={() => setShowAudioCall(false)}
          callType="audio"
          remoteUserId={conversations.find(c => c.conversation_id === selectedConv)?.user_id || ''}
          remoteUserName={conversations.find(c => c.conversation_id === selectedConv)?.name || 'User'}
          remoteUserPicture={conversations.find(c => c.conversation_id === selectedConv)?.picture}
          currentUserId={currentUserId}
          currentUserName={currentUserName}
        />
      )}

      {/* Media Gallery Modal */}
      {showMediaGallery && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" data-testid="media-gallery-modal">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b dark:border-gray-700 flex items-center justify-between">
              <h3 className="text-lg font-bold dark:text-white">Shared Media</h3>
              <button 
                onClick={() => setShowMediaGallery(false)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                <X className="w-5 h-5 dark:text-gray-300" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4">
              {mediaGallery.length === 0 ? (
                <div className="text-center py-12">
                  <ImageIcon className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">No shared media yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {mediaGallery.map((media) => (
                    <div 
                      key={media.message_id}
                      onClick={() => setFullscreenMedia(media)}
                      className="aspect-square bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition relative group"
                    >
                      {media.message_type === 'video' ? (
                        <>
                          <video src={media.content} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                            <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center">
                              <VideoIcon className="w-6 h-6 text-gray-800" />
                            </div>
                          </div>
                        </>
                      ) : (
                        <img src={media.content} alt="" className="w-full h-full object-cover" />
                      )}
                      <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition">
                        <p className="text-white text-xs">{formatMessageTime(media.created_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Media Viewer */}
      {fullscreenMedia && (
        <div 
          className="fixed inset-0 bg-black z-50 flex items-center justify-center"
          onClick={() => setFullscreenMedia(null)}
          data-testid="fullscreen-media"
        >
          <button 
            className="absolute top-4 right-4 p-2 text-white hover:bg-white/20 rounded-lg"
            onClick={() => setFullscreenMedia(null)}
          >
            <X className="w-6 h-6" />
          </button>
          {fullscreenMedia.message_type === 'video' ? (
            <video 
              src={fullscreenMedia.media_url || fullscreenMedia.content} 
              controls 
              autoPlay 
              className="max-w-full max-h-full"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <img 
              src={fullscreenMedia.media_url || fullscreenMedia.content} 
              alt="" 
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          )}
          <div className="absolute bottom-4 left-0 right-0 text-center">
            <p className="text-white/80 text-sm">{formatMessageTime(fullscreenMedia.created_at)}</p>
          </div>
        </div>
      )}
    </div>
  );
}
