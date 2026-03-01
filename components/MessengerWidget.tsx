'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { MessageCircle, X, Send, ChevronDown, Users, Smile, Image as ImageIcon, Volume2, VolumeX, Phone, Video } from 'lucide-react';
import Image from 'next/image';
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react';
import dynamic from 'next/dynamic';

const LiveKitCall = dynamic(() => import('./LiveKitCall'), { ssr: false });
const IncomingCall = dynamic(() => import('./IncomingCall'), { ssr: false });

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
}

interface User {
  user_id: string;
  name: string;
  email: string;
  picture?: string;
}

interface IncomingCallData {
  callerId: string;
  callerName: string;
  callerPicture?: string;
  callType: 'audio' | 'video';
}

// Notification sound (base64 encoded short beep)
const NOTIFICATION_SOUND = 'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA/+M4wAAAAAAAAAAAAEluZm8AAAAPAAAAAwAAAbAAqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV////////////////////////////////////////////AAAAAExhdmM1OC4xMwAAAAAAAAAAAAAAACQDgAAAAAAAAAGwsNIlHgAAAAAAAAAAAAAAAAD/4xjEAAKoGfJBQRgAMIAIRhSFIJB8H4fyhACAIB/y4Oefy4AQBAEAQBA/B+H/ygCAIBAEAQBD//5QCAIAgCAIH4P/+DkOQhCAAAAAADCMP/jGMQLA6wa9kZhGABsAGzBBEBsxgxYNKqIjMWYaGmZkCiYJmZmZmDMzMzM0AAAE//4xjEFAPAAsVvwAAAAAAD/+Mf/4xjEGAAAANIAAAAA/4xjEKAAAANIAAAAA';

// Ringtone sound for incoming calls
const RINGTONE_SOUND = 'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA/+M4wAAAAAAAAAAAAEluZm8AAAAPAAAAAwAAAbAAqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV////////////////////////////////////////////AAAAAExhdmM1OC4xMwAAAAAAAAAAAAAAACQDgAAAAAAAAAGwsNIlHgAAAAAAAAAAAAAAAAD/4xjEAAKoGfJBQRgAMIAIRhSFIJB8H4fyhACAIB/y4Oefy4AQBAEAQBA/B+H/ygCAIBAEAQBD//5QCAIAgCAIH4P/+DkOQhCAAAAAADCMP/jGMQLA6wa9kZhGABsAGzBBEBsxgxYNKqIjMWYaGmZkCiYJmZmZmDMzMzM0AAAE//4xjEFAPAAsVvwAAAAAAD/+Mf/4xjEGAAAANIAAAAA/4xjEKAAAANIAAAAA';

export default function MessengerWidget() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [currentUserId, setCurrentUserId] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showVideoCall, setShowVideoCall] = useState(false);
  const [callType, setCallType] = useState<'audio' | 'video'>('video');
  const [currentUserName, setCurrentUserName] = useState('');
  const [incomingCall, setIncomingCall] = useState<IncomingCallData | null>(null);
  const [isReceivingCall, setIsReceivingCall] = useState(false);
  const [activeCallData, setActiveCallData] = useState<IncomingCallData | null>(null);
  const [uploading, setUploading] = useState(false);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [selectedMedia, setSelectedMedia] = useState<File | null>(null);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [initialLoad, setInitialLoad] = useState(true);
  
  const [widgetTab, setWidgetTab] = useState<'dms' | 'groups'>('dms');
  const [groupChats, setGroupChats] = useState<{group_id: string; name: string; image?: string; member_count: number; last_message?: string}[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [groupMessages, setGroupMessages] = useState<Message[]>([]);
  const [newGroupMessage, setNewGroupMessage] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ringtoneRef = useRef<HTMLAudioElement | null>(null);
  const lastMessageCount = useRef(0);
  const userScrolledUp = useRef(false);

  // Format message timestamp
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

  // Check if we need a date separator between messages
  const needsDateSeparator = (currentMsg: Message, prevMsg: Message | null) => {
    if (!prevMsg) return true;
    const currentDate = new Date(currentMsg.created_at).toDateString();
    const prevDate = new Date(prevMsg.created_at).toDateString();
    return currentDate !== prevDate;
  };

  // Get date label for separator
  const getDateLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return date.toLocaleDateString([], { weekday: 'long' });
    return date.toLocaleDateString([], { month: 'long', day: 'numeric' });
  };

  // Handle media file selection
  const handleMediaSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setSelectedMedia(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      setMediaPreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Cancel media upload
  const cancelMedia = () => {
    setSelectedMedia(null);
    setMediaPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Upload media and send message
  const uploadAndSendMedia = async () => {
    if (!selectedMedia || !selectedConv) return;
    
    setUploading(true);
    try {
      // Upload media first
      const formData = new FormData();
      formData.append('file', selectedMedia);
      
      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData
      });
      
      if (!uploadRes.ok) throw new Error('Upload failed');
      
      const uploadData = await uploadRes.json();
      const mediaUrl = uploadData.url;
      
      // Determine message type
      const isVideo = selectedMedia.type.startsWith('video/');
      const messageType = isVideo ? 'video' : 'image';
      
      const replyToMsg = replyTo;
      setReplyTo(null);
      // Send message with media
      await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          conversationId: selectedConv,
          content: '',
          messageType,
          mediaUrl,
          replyToId: replyToMsg?.message_id || null,
        })
      });
      
      cancelMedia();
      loadMessages(selectedConv);
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload media');
    }
    setUploading(false);
  };
  const callPollingRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize audio
  useEffect(() => {
    audioRef.current = new Audio(NOTIFICATION_SOUND);
    ringtoneRef.current = new Audio(RINGTONE_SOUND);
    if (ringtoneRef.current) {
      ringtoneRef.current.loop = true;
    }
  }, []);

  // Play notification sound
  const playNotificationSound = useCallback(() => {
    if (soundEnabled && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
  }, [soundEnabled]);

  // Scroll to bottom only when new messages arrive or user sends a message
  // Scroll to bottom helper - uses scrollTop directly for reliability
  const scrollToBottom = (smooth = true) => {
    const container = messagesContainerRef.current;
    if (container) {
      if (smooth) {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: 'smooth'
        });
      } else {
        container.scrollTop = container.scrollHeight;
      }
    }
  };

// Scroll to bottom when messages change
  useEffect(() => {
    if (initialLoad || !userScrolledUp.current) {
      // Use setTimeout to ensure DOM has updated
      setTimeout(() => {
        scrollToBottom(!initialLoad);
      }, 50);
      
      if (initialLoad && (messages.length > 0 || groupMessages.length > 0)) {
        setInitialLoad(false);
      }
    }
    lastMessageCount.current = messages.length + groupMessages.length;
  }, [messages, groupMessages, initialLoad]);

  // Reset scroll state when conversation or widget visibility changes
  useEffect(() => {
    setInitialLoad(true);
    userScrolledUp.current = false;
    lastMessageCount.current = 0;
    
    // Force an instant scroll down when opening the widget or changing the active chat
    if (isOpen && !isMinimized && (selectedConv || selectedGroup)) {
      setTimeout(() => scrollToBottom(false), 100);
    }
  }, [selectedConv, selectedGroup, isOpen, isMinimized]);

  // Handle scroll event to detect if user scrolled up
  const handleMessagesScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const element = e.currentTarget;
    const isAtBottom = element.scrollHeight - element.scrollTop - element.clientHeight < 50;
    userScrolledUp.current = !isAtBottom;
  };

  // Auth check
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            setIsAuthenticated(true);
            setCurrentUserId(data.user.user_id);
            setCurrentUserName(data.user.name || 'User');
            loadConversations();
            loadGroupChats();
          }
        }
      } catch (err) {
        console.error('Auth check error:', err);
      }
    };
    checkAuth();
  }, []);

  // Polling for new messages and calls
  useEffect(() => {
    if (!isAuthenticated) return;

    const loadGroupChats = async () => {
      try {
        const res = await fetch('/api/groups?my_groups=true', { credentials: 'include' });
        const data = await res.json();
        if (data.success) setGroupChats(data.groups || []);
      } catch {}
    };

    const interval = setInterval(() => {
      loadConversations();
      loadGroupChats();
      if (selectedConv) loadMessages(selectedConv);
      if (selectedGroup) loadGroupMessages(selectedGroup);
      
      // Poll for calls
      checkIncomingCalls();
    }, 5000);

    return () => clearInterval(interval);
  }, [isAuthenticated, selectedConv, selectedGroup]);

  const checkIncomingCalls = async () => {
    try {
      const res = await fetch('/api/calls?type=incoming', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.call && !incomingCall && !showVideoCall) {
          setIncomingCall({
            callerId: data.call.caller_id,
            callerName: data.call.caller_name,
            callerPicture: data.call.caller_picture,
            callType: data.call.call_type
          });
          
          // Play ringtone
          if (soundEnabled && ringtoneRef.current) {
            ringtoneRef.current.play().catch(() => {});
          }
        }
      }
    } catch (err) {
      console.error('Check calls error:', err);
    }
  };

  const loadConversations = async () => {
    try {
      const res = await fetch('/api/messages', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setConversations(data.conversations || []);
          
          // Update total unread count
          const total = (data.conversations || []).reduce((sum: number, conv: Conversation) => sum + (conv.unread_count || 0), 0);
          
          // Play sound if new message arrived
          if (total > unreadTotal && total > 0) {
            playNotificationSound();
          }
          
          setUnreadTotal(total);
        }
      }
    } catch (err) {
      console.error('Load conversations error:', err);
    }
  };

  const loadGroupChats = async () => {
    try {
      const res = await fetch('/api/groups?my_groups=true', { credentials: 'include' });
      const data = await res.json();
      if (data.success) setGroupChats(data.groups || []);
    } catch {}
  };

  const loadMessages = async (convId: string) => {
    if (!convId) return;
    try {
      const res = await fetch(`/api/messages/${convId}`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.messages)) {
          setMessages(data.messages);
        }
      }
    } catch (err) {
      console.error('Load messages error:', err);
    }
  };

  const loadGroupMessages = async (groupId: string) => {
    if (!groupId) return;
    try {
      const res = await fetch(`/api/groups/${groupId}/messages`, { credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();
      if (data.success && Array.isArray(data.messages)) {
        setGroupMessages(data.messages.map((m: any) => ({
          ...m,
          name: m.sender_name || m.name || 'Unknown',
          picture: m.sender_picture || m.picture || null,
        })));
      }
    } catch (err) {
      console.error('Load group messages error:', err);
    }
  };

  const loadAllUsers = async () => {
    try {
      const res = await fetch('/api/users/search?q=', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setAllUsers((data.users || []).filter((u: User) => u.user_id !== currentUserId));
        }
      }
    } catch (err) {
      console.error('Load users error:', err);
    }
  };

  const selectConversation = (convId: string) => {
    setSelectedConv(convId);
    setSelectedGroup(null);
    setMessages([]);
    setInitialLoad(true);
    loadMessages(convId);
    
    // Mark as read
    fetch(`/api/messages/${convId}/read`, { method: 'POST', credentials: 'include' })
      .then(() => loadConversations());
  };

  const selectGroupChat = (groupId: string) => {
    setSelectedGroup(groupId);
    setSelectedConv(null);
    setGroupMessages([]);
    setInitialLoad(true);
    loadGroupMessages(groupId);
  };

  const handleOpenNewConversation = () => {
    setShowNewConversation(true);
    loadAllUsers();
  };

  const startNewConversation = async (userId: string) => {
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ recipientId: userId, content: 'Hey! 👋' })
      });
      
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setShowNewConversation(false);
          setSearchQuery('');
          loadConversations();
          if (data.conversationId) {
            selectConversation(data.conversationId);
          }
        }
      }
    } catch (err) {
      console.error('Start conversation error:', err);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConv) return;

    const content = newMessage.trim();
    const replyToMsg = replyTo;
    
    setNewMessage('');
    setReplyTo(null);
    setShowEmojiPicker(false);
    
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          conversationId: selectedConv,
          content,
          replyToId: replyToMsg?.message_id || null,
        })
      });
      
      if (res.ok) {
        loadMessages(selectedConv);
        loadConversations();
      }
    } catch (err) {
      console.error('Send message error:', err);
    }
  };

  const sendGroupMessage = async () => {
    if (!newGroupMessage.trim() || !selectedGroup) return;
    try {
      await fetch(`/api/groups/${selectedGroup}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ content: newGroupMessage }),
      });
      setNewGroupMessage('');
      loadGroupMessages(selectedGroup);
    } catch {}
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (selectedConv) sendMessage();
      else if (selectedGroup) sendGroupMessage();
    }
  };

  const handleEmojiSelect = (data: EmojiClickData) => {
    if (selectedConv) setNewMessage(prev => prev + data.emoji);
    else if (selectedGroup) setNewGroupMessage(prev => prev + data.emoji);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const filteredUsers = allUsers.filter(u => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const startCall = (type: 'audio' | 'video') => {
    const conv = getSelectedConversation();
    if (!conv) return;
    
    setCallType(type);
    setIsReceivingCall(false);
    setActiveCallData({
      callerId: conv.user_id,
      callerName: conv.name,
      callerPicture: conv.picture,
      callType: type
    });
    setShowVideoCall(true);
  };

  const acceptIncomingCall = () => {
    if (!incomingCall) return;
    
    // Stop ringtone
    if (ringtoneRef.current) {
      ringtoneRef.current.pause();
      ringtoneRef.current.currentTime = 0;
    }
    
    // Store call data before clearing incoming call
    setActiveCallData(incomingCall);
    setCallType(incomingCall.callType);
    setIsReceivingCall(true);
    setShowVideoCall(true);
    setIncomingCall(null);
  };

  const rejectIncomingCall = async () => {
    if (!incomingCall) return;
    
    // Stop ringtone
    if (ringtoneRef.current) {
      ringtoneRef.current.pause();
      ringtoneRef.current.currentTime = 0;
    }
    
    // Send rejection signal
    try {
      await fetch('/api/calls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          type: 'call_rejected',
          target: incomingCall.callerId,
          data: {}
        })
      });
    } catch (err) {
      console.error('Reject call error:', err);
    }
    
    setIncomingCall(null);
  };

  const getSelectedConversation = () => {
    return conversations.find(c => c.conversation_id === selectedConv);
  };

  const renderMessageContent = (msg: Message) => {
    if (msg.message_type === 'image' && msg.media_url) {
      return (
        <div className="max-w-[180px]">
          <img 
            src={msg.media_url} 
            alt="Shared image" 
            className="rounded-lg max-w-full h-auto cursor-pointer hover:opacity-90"
            onClick={() => setFullscreenImage(msg.media_url || null)}
          />
        </div>
      );
    }
    if (msg.message_type === 'video' && msg.media_url) {
      return (
        <div className="max-w-[180px]">
          <video 
            src={msg.media_url} 
            controls 
            className="rounded-lg max-w-full h-auto"
          />
        </div>
      );
    }
    return <p className="text-sm whitespace-pre-wrap">{msg.content}</p>;
  };

  if (!isAuthenticated) return null;
  
  // Hide messenger widget on the full messages page to avoid redundancy
  if (pathname === '/messages') return null;

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition flex items-center justify-center z-50"
          data-testid="messenger-widget-button"
        >
          <MessageCircle className="w-6 h-6" />
          {unreadTotal > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
              {unreadTotal > 9 ? '9+' : unreadTotal}
            </span>
          )}
        </button>
      )}

      {/* Widget */}
      {isOpen && (
        <div className={`fixed bottom-6 right-6 bg-white dark:bg-gray-800 rounded-xl shadow-2xl z-50 overflow-hidden transition-all ${isMinimized ? 'w-72 h-14' : 'w-96 h-[500px]'}`} data-testid="messenger-widget">
          {/* Header */}
          <div className="bg-blue-600 text-white p-3 flex items-center justify-between cursor-pointer" onClick={() => isMinimized && setIsMinimized(false)}>
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              <span className="font-semibold">Messages</span>
              {unreadTotal > 0 && (
                <span className="bg-white text-blue-600 text-xs font-bold px-2 py-0.5 rounded-full">
                  {unreadTotal}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={(e) => { e.stopPropagation(); setWidgetTab('groups'); setSelectedConv(null); setSelectedGroup(null); }} 
                className="hover:bg-blue-700 p-1 rounded flex items-center gap-1 text-xs"
                title="Groups"
              >
                <Users className="w-4 h-4" />
              </button>
              <button onClick={(e) => { e.stopPropagation(); setSoundEnabled(!soundEnabled); }} className="hover:bg-blue-700 p-1 rounded" title={soundEnabled ? 'Sound On' : 'Sound Off'}>
                {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>
              <button onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }} className="hover:bg-blue-700 p-1 rounded">
                <ChevronDown className={`w-4 h-4 transition ${isMinimized ? 'rotate-180' : ''}`} />
              </button>
              <button onClick={(e) => { e.stopPropagation(); setIsOpen(false); }} className="hover:bg-blue-700 p-1 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Content */}
          {!isMinimized && (
            <div className="flex flex-col h-[calc(100%-56px)]">
              {widgetTab === 'dms' ? (
                selectedConv ? (
                  // Chat View
                  <>
                    <div className="flex items-center justify-between p-2 border-b dark:border-gray-700">
                      <button
                        onClick={() => { setSelectedConv(null); setShowEmojiPicker(false); }}
                        className="text-sm text-blue-600 hover:bg-blue-50 dark:hover:bg-gray-700 px-2 py-1 rounded"
                      >
                        ← Back
                      </button>
                      <a
                        href={`/profile/${getSelectedConversation()?.user_id}`}
                        className="text-sm font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition truncate max-w-[140px]"
                        data-testid="widget-chat-profile-link"
                      >
                        {getSelectedConversation()?.name || 'Chat'}
                      </a>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => startCall('audio')}
                          className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition"
                          title="Voice Call"
                          data-testid="widget-voice-call-btn"
                        >
                          <Phone className="w-4 h-4 text-green-600" />
                        </button>
                        <button
                          onClick={() => startCall('video')}
                          className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition"
                          title="Video Call"
                          data-testid="widget-video-call-btn"
                        >
                          <Video className="w-4 h-4 text-blue-600" />
                        </button>
                      </div>
                    </div>
                    <div 
                      ref={messagesContainerRef}
                      className="flex-1 overflow-y-auto p-3 space-y-2"
                      onScroll={handleMessagesScroll}
                    >
                      {messages.map((msg, index) => {
                        const prevMsg = index > 0 ? messages[index - 1] : null;
                        const showDateSeparator = needsDateSeparator(msg, prevMsg);
                        
                        return (
                          <div key={msg.message_id}>
                            {/* Date Separator */}
                            {showDateSeparator && (
                              <div className="flex items-center justify-center my-3">
                                <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700"></div>
                                <span className="px-2 text-[10px] text-gray-400 font-medium">
                                  {getDateLabel(msg.created_at)}
                                </span>
                                <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700"></div>
                              </div>
                            )}
                            
                            <div className={`flex gap-2 group/msg ${msg.sender_id === currentUserId ? 'flex-row-reverse' : ''}`}>
                              {msg.picture ? (
                                <Image src={msg.picture} alt={msg.name} width={28} height={28} className="rounded-full flex-shrink-0" unoptimized />
                              ) : (
                                <div className="w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                                  {(msg.name || '?').charAt(0).toUpperCase()}
                                </div>
                              )}
                              
                              {msg.sender_id === currentUserId && (
                                <button 
                                  onClick={() => setReplyTo(msg)}
                                  className="opacity-0 group-hover/msg:opacity-100 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition self-center"
                                  title="Reply"
                                >
                                  <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                                  </svg>
                                </button>
                              )}

                              <div>
                                {/* Reply Preview */}
                                {(msg as any).reply_content && (
                                  <div className={`text-[10px] mb-1 px-2 py-1 rounded-md border-l-2 ${
                                    msg.sender_id === currentUserId 
                                      ? 'bg-blue-500/20 border-blue-300 text-blue-100' 
                                      : 'bg-gray-200 dark:bg-gray-600 border-gray-400 text-gray-600 dark:text-gray-300'
                                  }`}>
                                    <span className="font-semibold">{(msg as any).reply_sender_name}</span>
                                    <p className="truncate max-w-[150px]">{(msg as any).reply_content}</p>
                                  </div>
                                )}
                                
                                <div className={`max-w-[220px] rounded-xl px-3 py-1.5 break-words overflow-hidden ${
                                  msg.sender_id === currentUserId 
                                    ? 'bg-blue-600 text-white' 
                                    : 'bg-gray-100 dark:bg-gray-700 dark:text-white'
                                }`}>
                                  {renderMessageContent(msg)}
                                </div>
                                {/* Timestamp */}
                                <p className={`text-[10px] text-gray-400 mt-0.5 ${msg.sender_id === currentUserId ? 'text-right' : ''}`}>
                                  {formatMessageTime(msg.created_at)}
                                </p>
                              </div>

                              {msg.sender_id !== currentUserId && (
                                <button 
                                  onClick={() => setReplyTo(msg)}
                                  className="opacity-0 group-hover/msg:opacity-100 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition self-center"
                                  title="Reply"
                                >
                                  <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                    
                    {/* Emoji Picker */}
                    {showEmojiPicker && (
                      <div className="absolute bottom-16 left-2 z-50" data-testid="widget-emoji-picker">
                        <EmojiPicker 
                          onEmojiClick={handleEmojiSelect}
                          theme={Theme.LIGHT}
                          width={300}
                          height={350}
                        />
                      </div>
                    )}
                    
                    {/* Media Preview */}
                    {mediaPreview && (
                      <div className="border-t dark:border-gray-700 p-2 bg-gray-50 dark:bg-gray-700">
                        <div className="relative inline-block">
                          {selectedMedia?.type.startsWith('video/') ? (
                            <video src={mediaPreview} className="w-20 h-20 object-cover rounded-lg" />
                          ) : (
                            <img src={mediaPreview} alt="Preview" className="w-20 h-20 object-cover rounded-lg" />
                          )}
                          <button
                            onClick={cancelMedia}
                            className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs"
                          >
                            ×
                          </button>
                        </div>
                        <button
                          onClick={uploadAndSendMedia}
                          disabled={uploading}
                          className="ml-2 px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
                        >
                          {uploading ? 'Sending...' : 'Send'}
                        </button>
                      </div>
                    )}
                    
                    <div className="border-t dark:border-gray-700 p-2">
                      {/* Reply Banner */}
                      {replyTo && (
                        <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/30 px-3 py-1.5 mb-2 rounded-lg border-l-4 border-blue-500 text-xs">
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                            </svg>
                            <div className="truncate max-w-[150px]">
                              <span className="font-semibold text-blue-600 dark:text-blue-400 block">
                                Replying to {replyTo.sender_id === currentUserId ? 'yourself' : replyTo.name}
                              </span>
                              <span className="text-gray-600 dark:text-gray-400 truncate block">
                                {replyTo.content || (replyTo.media_url ? '[Media]' : '')}
                              </span>
                            </div>
                          </div>
                          <button 
                            onClick={() => setReplyTo(null)} 
                            className="p-1 hover:bg-blue-100 dark:hover:bg-blue-800 rounded"
                          >
                            <X className="w-3 h-3 text-gray-500" />
                          </button>
                        </div>
                      )}
                      <div className="flex gap-1 mb-2">
                        <button
                          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                          className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition"
                          title="Add Emoji"
                        >
                          <Smile className="w-4 h-4 text-gray-500" />
                        </button>
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition"
                          title="Send Image/Video"
                        >
                          <ImageIcon className="w-4 h-4 text-gray-500" />
                        </button>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*,video/*"
                          onChange={handleMediaSelect}
                          className="hidden"
                        />
                      </div>
                      <div className="flex gap-2">
                        <textarea
                          ref={textareaRef}
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          onKeyDown={handleKeyDown}
                          placeholder="Type... (Shift+Enter for new line)"
                          className="flex-1 px-3 py-2 text-sm border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
                          rows={1}
                          data-testid="widget-message-input"
                        />
                        <button
                          onClick={sendMessage}
                          disabled={!newMessage.trim()}
                          className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                          data-testid="widget-send-button"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </>
                ) : showNewConversation ? (
                  // New Conversation View
                  <>
                    <button
                      onClick={() => setShowNewConversation(false)}
                      className="p-2 text-sm text-blue-600 hover:bg-blue-50 dark:hover:bg-gray-700 text-left border-b dark:border-gray-700"
                    >
                      ← Back to conversations
                    </button>
                    <div className="p-3 border-b dark:border-gray-700">
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search users..."
                        className="w-full px-3 py-2 text-sm border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Message anyone on the platform</p>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                      {filteredUsers.length === 0 ? (
                        <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
                          <Users className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                          {allUsers.length === 0 ? 'Loading users...' : 'No users found'}
                        </div>
                      ) : (
                        filteredUsers.map((user) => (
                          <button
                            key={user.user_id}
                            onClick={() => startNewConversation(user.user_id)}
                            className="w-full p-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700 text-left"
                            data-testid={`widget-user-${user.user_id}`}
                          >
                            {user.picture ? (
                              <Image src={user.picture} alt={user.name} width={36} height={36} className="rounded-full" unoptimized />
                            ) : (
                              <div className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                                {user.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <p className="font-medium text-sm dark:text-white">{user.name}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </>
                ) : (
                  // Conversations List
                  <>
                    <div className="flex gap-2 m-3">
                      <button
                        onClick={handleOpenNewConversation}
                        className="flex-1 p-2 bg-blue-600 text-white rounded-lg font-semibold text-sm hover:bg-blue-700 flex items-center justify-center gap-2"
                        data-testid="new-conversation-button"
                      >
                        <MessageCircle className="w-4 h-4" />
                        New Chat
                      </button>
                      <button
                        onClick={() => { setWidgetTab('groups'); setSelectedConv(null); setSelectedGroup(null); }}
                        className="p-2 bg-purple-600 text-white rounded-lg font-semibold text-sm hover:bg-purple-700 flex items-center justify-center gap-2"
                      >
                        <Users className="w-4 h-4" />
                        Groups
                      </button>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                      {conversations.length === 0 ? (
                        <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
                          <MessageCircle className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                          No conversations yet
                        </div>
                      ) : (
                        conversations.map((conv) => (
                          <button
                            key={conv.conversation_id}
                            onClick={() => selectConversation(conv.conversation_id)}
                            className="w-full p-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700 text-left border-b dark:border-gray-700"
                            data-testid={`widget-conv-${conv.conversation_id}`}
                          >
                            {conv.is_group ? (
                              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center text-white font-semibold">
                                <Users className="w-5 h-5" />
                              </div>
                            ) : conv.picture ? (
                              <Image src={conv.picture} alt={conv.name} width={40} height={40} className="rounded-full" unoptimized />
                            ) : (
                              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                                {(conv.name || '?').charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <p className="font-medium text-sm dark:text-white truncate">{conv.name}</p>
                                <span className="text-[10px] text-gray-400">{formatMessageTime(conv.last_message_at)}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{conv.last_message}</p>
                                {conv.unread_count > 0 && (
                                  <span className="bg-blue-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                                    {conv.unread_count}
                                  </span>
                                )}
                              </div>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </>
                )
              ) : selectedGroup ? (
                // Group Chat View
                <>
                  <div className="flex items-center justify-between p-2 border-b dark:border-gray-700">
                    <button
                      onClick={() => { setSelectedGroup(null); setGroupMessages([]); }}
                      className="text-sm text-purple-600 hover:bg-purple-50 dark:hover:bg-gray-700 px-2 py-1 rounded"
                    >
                      ← Back
                    </button>
                    <span className="text-sm font-semibold dark:text-white truncate max-w-[160px]">
                      {groupChats.find(g => g.group_id === selectedGroup)?.name || 'Group'}
                    </span>
                    <div className="w-16" />
                  </div>
                  <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-3 space-y-2" onScroll={handleMessagesScroll}>
                    {groupMessages.map((msg) => (
                      <div key={msg.message_id} className={`flex gap-2 ${msg.sender_id === currentUserId ? 'flex-row-reverse' : ''}`}>
                        {msg.picture
                          ? <Image src={msg.picture} alt={msg.name} width={24} height={24} className="rounded-full flex-shrink-0" unoptimized />
                          : <div className="w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">{(msg.name || '?').charAt(0).toUpperCase()}</div>
                        }
                        <div>
                          {msg.sender_id !== currentUserId && (
                            <p className="text-[10px] text-gray-500 mb-0.5 ml-1">{msg.name}</p>
                          )}
                          <div className={`max-w-[200px] rounded-xl px-3 py-1.5 break-words overflow-hidden ${msg.sender_id === currentUserId ? 'bg-purple-600 text-white' : 'bg-gray-100 dark:bg-gray-700 dark:text-white'}`}>
                            <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                          </div>
                          <p className={`text-[10px] text-gray-400 mt-0.5 ${msg.sender_id === currentUserId ? 'text-right' : ''}`}>
                            {formatMessageTime(msg.created_at)}
                          </p>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                  <div className="border-t dark:border-gray-700 p-2 flex gap-2">
                    <textarea
                      ref={textareaRef}
                      value={newGroupMessage}
                      onChange={e => setNewGroupMessage(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Message group..."
                      className="flex-1 px-3 py-2 text-sm border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-purple-500 resize-none"
                      rows={1}
                    />
                    <button onClick={sendGroupMessage} disabled={!newGroupMessage.trim()} className="p-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50">
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </>
              ) : (
                // Group List View
                <>
                  <div className="flex items-center justify-between p-3 border-b dark:border-gray-700">
                    <button onClick={() => setWidgetTab('dms')} className="text-sm text-blue-600 hover:bg-blue-50 dark:hover:bg-gray-700 px-2 py-1 rounded">
                      ← Back
                    </button>
                    <span className="font-semibold text-sm dark:text-white">Groups</span>
                    <div className="w-16" />
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    {groupChats.length === 0 ? (
                      <div className="p-4 text-center text-gray-500 text-sm">
                        <Users className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                        No groups yet
                      </div>
                    ) : (
                      groupChats.map(group => (
                        <button
                          key={group.group_id}
                          onClick={() => selectGroupChat(group.group_id)}
                          className="w-full p-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700 text-left border-b dark:border-gray-700"
                        >
                          {group.image
                            ? <Image src={group.image} alt={group.name} width={36} height={36} className="rounded-xl" unoptimized />
                            : <div className="w-9 h-9 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center text-white"><Users className="w-4 h-4" /></div>
                          }
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm dark:text-white truncate">{group.name}</p>
                            <p className="text-xs text-gray-500 truncate">{group.last_message || `${group.member_count} members`}</p>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Fullscreen Image Preview */}
      {fullscreenImage && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[100] p-4" onClick={() => setFullscreenImage(null)}>
          <button className="absolute top-4 right-4 text-white hover:bg-white/10 p-2 rounded-full transition">
            <X className="w-8 h-8" />
          </button>
          <img src={fullscreenImage} alt="Fullscreen" className="max-w-full max-h-full object-contain" />
        </div>
      )}

      {/* Video/Audio Call Modal */}
      {showVideoCall && activeCallData && (
        <div className="fixed inset-0 z-[110] bg-black">
          <LiveKitCall
            isOpen={showVideoCall}
            onClose={() => {
              setShowVideoCall(false);
              setActiveCallData(null);
              setIsReceivingCall(false);
            }}
            callType={callType}
            remoteUserId={activeCallData.callerId}
            remoteUserName={activeCallData.callerName}
            remoteUserPicture={activeCallData.callerPicture}
            currentUserId={currentUserId}
            currentUserName={currentUserName}
            isReceiver={isReceivingCall}
          />
        </div>
      )}

      {/* Incoming Call Notification */}
      {incomingCall && (
        <IncomingCall
          callerName={incomingCall.callerName}
          callerPicture={incomingCall.callerPicture}
          callType={incomingCall.callType}
          onAccept={acceptIncomingCall}
          onReject={rejectIncomingCall}
        />
      )}
    </>
  );
}
