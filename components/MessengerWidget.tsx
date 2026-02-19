'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { MessageCircle, X, Send, ChevronDown, Users, Smile, Image as ImageIcon, Volume2, VolumeX, Phone, Video } from 'lucide-react';
import Image from 'next/image';
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react';
import dynamic from 'next/dynamic';

const VideoCall = dynamic(() => import('./VideoCall'), { ssr: false });
const IncomingCall = dynamic(() => import('./IncomingCall'), { ssr: false });

interface Conversation {
  conversation_id: string;
  user_id: string;
  name: string;
  picture?: string;
  last_message: string;
  last_message_at: string;
  unread_count: number;
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
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ringtoneRef = useRef<HTMLAudioElement | null>(null);
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
    
    const conv = conversations.find(c => c.conversation_id === selectedConv);
    if (!conv) return;
    
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
      
      // Send message with media
      await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          recipientId: conv.user_id,
          content: '',
          messageType: messageType,
          mediaUrl: mediaUrl
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

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    // Check auth status
    fetch('/api/auth/me', { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setIsAuthenticated(true);
          setCurrentUserId(data.user.user_id);
          setCurrentUserName(data.user.name || 'User');
          loadConversations();
        }
      })
      .catch(() => setIsAuthenticated(false));
  }, []);

  // Poll for new messages
  useEffect(() => {
    if (!isAuthenticated) return;
    
    const interval = setInterval(() => {
      loadConversations();
      if (selectedConv) {
        loadMessages(selectedConv);
      }
    }, 5000);
    
    return () => clearInterval(interval);
  }, [isAuthenticated, selectedConv]);

  // Poll for incoming calls
  useEffect(() => {
    if (!isAuthenticated || showVideoCall) return;
    
    const pollIncomingCalls = async () => {
      try {
        // Use preview mode - this won't mark 'offer' signals as processed
        const res = await fetch('/api/calls?mode=preview', { credentials: 'include' });
        
        // Check if response is OK and JSON
        if (!res.ok) return;
        
        const text = await res.text();
        if (!text) return;
        
        let data;
        try {
          data = JSON.parse(text);
        } catch {
          console.warn('Invalid JSON response from /api/calls');
          return;
        }
        
        if (data.success && data.signals) {
          for (const signal of data.signals) {
            if (signal.type === 'incoming_call' && !showVideoCall && !incomingCall) {
              // Play ringtone
              if (soundEnabled && ringtoneRef.current) {
                ringtoneRef.current.currentTime = 0;
                ringtoneRef.current.play().catch(() => {});
              }
              
              setIncomingCall({
                callerId: signal.from,
                callerName: signal.data?.caller_name || 'Unknown',
                callerPicture: signal.data?.caller_picture,
                callType: signal.data?.call_type || 'video'
              });
            }
          }
        }
      } catch (err) {
        // Silently ignore polling errors to avoid console spam
      }
    };
    
    // Poll every 2 seconds for incoming calls
    callPollingRef.current = setInterval(pollIncomingCalls, 2000);
    pollIncomingCalls(); // Initial poll
    
    return () => {
      if (callPollingRef.current) {
        clearInterval(callPollingRef.current);
      }
    };
  }, [isAuthenticated, showVideoCall, incomingCall, soundEnabled]);

  useEffect(() => {
    // Calculate unread total and play sound
    const total = conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0);
    if (total > unreadTotal && unreadTotal > 0) {
      playNotificationSound();
    }
    setUnreadTotal(total);
  }, [conversations, playNotificationSound]);

  const loadConversations = async () => {
    try {
      const res = await fetch('/api/messages', { credentials: 'include' });
      if (!res.ok) return;
      
      const text = await res.text();
      if (!text) return;
      
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        return;
      }
      
      if (data.success) {
        setConversations(data.conversations || []);
      }
    } catch (error) {
      // Silently ignore - will retry on next poll
    }
  };

  const loadMessages = async (convId: string) => {
    try {
      const res = await fetch(`/api/messages/${convId}`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setMessages(data.messages || []);
      }
    } catch (error) {
      console.error('Load messages error:', error);
    }
  };

  const loadAllUsers = async () => {
    try {
      const res = await fetch('/api/users/search?q=', { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setAllUsers((data.users || []).filter((u: User) => u.user_id !== currentUserId));
      }
    } catch (error) {
      console.error('Load users error:', error);
    }
  };

  const selectConversation = (convId: string) => {
    setSelectedConv(convId);
    loadMessages(convId);
    setShowNewConversation(false);
    setShowEmojiPicker(false);
  };

  const startNewConversation = async (userId: string) => {
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
        setShowNewConversation(false);
        loadConversations();
        if (data.conversationId) {
          selectConversation(data.conversationId);
        }
      }
    } catch (error) {
      console.error('Start conversation error:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConv) return;
    
    const conv = conversations.find(c => c.conversation_id === selectedConv);
    if (!conv) return;

    try {
      await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          recipientId: conv.user_id,
          content: newMessage
        })
      });
      setNewMessage('');
      setShowEmojiPicker(false);
      loadMessages(selectedConv);
    } catch (error) {
      console.error('Send message error:', error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleEmojiSelect = (emojiData: EmojiClickData) => {
    setNewMessage((prev) => prev + emojiData.emoji);
    textareaRef.current?.focus();
  };

  const handleOpenNewConversation = () => {
    setShowNewConversation(true);
    setSelectedConv(null);
    setShowEmojiPicker(false);
    loadAllUsers();
  };

  const filteredUsers = allUsers.filter(u =>
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const startCall = (type: 'audio' | 'video') => {
    setCallType(type);
    setIsReceivingCall(false);
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
              <a 
                href="/messages" 
                onClick={(e) => e.stopPropagation()} 
                className="hover:bg-blue-700 p-1 rounded flex items-center gap-1 text-xs"
                title="Open Full Messages (includes Groups)"
              >
                <Users className="w-4 h-4" />
              </a>
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
              {selectedConv ? (
                // Chat View
                <>
                  <div className="flex items-center justify-between p-2 border-b dark:border-gray-700">
                    <button
                      onClick={() => { setSelectedConv(null); setShowEmojiPicker(false); }}
                      className="text-sm text-blue-600 hover:bg-blue-50 dark:hover:bg-gray-700 px-2 py-1 rounded"
                    >
                      ← Back
                    </button>
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
                  <div className="flex-1 overflow-y-auto p-3 space-y-2">
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
                          
                          <div className={`flex gap-2 ${msg.sender_id === currentUserId ? 'flex-row-reverse' : ''}`}>
                            {msg.picture ? (
                              <Image src={msg.picture} alt={msg.name} width={28} height={28} className="rounded-full flex-shrink-0" />
                            ) : (
                              <div className="w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                                {msg.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <div className={`max-w-[200px] rounded-xl px-3 py-1.5 ${
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
                            <Image src={user.picture} alt={user.name} width={36} height={36} className="rounded-full" />
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
                  <button
                    onClick={handleOpenNewConversation}
                    className="m-3 p-2 bg-blue-600 text-white rounded-lg font-semibold text-sm hover:bg-blue-700 flex items-center justify-center gap-2"
                    data-testid="new-conversation-button"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Start New Conversation
                  </button>
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
                          data-testid={`widget-conversation-${conv.conversation_id}`}
                        >
                          {conv.picture ? (
                            <Image src={conv.picture} alt={conv.name} width={36} height={36} className="rounded-full" />
                          ) : (
                            <div className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                              {conv.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="font-medium text-sm truncate dark:text-white">{conv.name}</p>
                              {conv.unread_count > 0 && (
                                <span className="bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded-full">
                                  {conv.unread_count}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{conv.last_message || 'No messages'}</p>
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

      {/* Video Call Modal */}
      {showVideoCall && (selectedConv || activeCallData) && (
        <VideoCall
          isOpen={showVideoCall}
          onClose={() => {
            setShowVideoCall(false);
            setIsReceivingCall(false);
            setActiveCallData(null);
          }}
          callType={callType}
          remoteUserId={isReceivingCall && activeCallData ? activeCallData.callerId : (getSelectedConversation()?.user_id || '')}
          remoteUserName={isReceivingCall && activeCallData ? activeCallData.callerName : (getSelectedConversation()?.name || 'User')}
          remoteUserPicture={isReceivingCall && activeCallData ? activeCallData.callerPicture : getSelectedConversation()?.picture}
          currentUserId={currentUserId}
          currentUserName={currentUserName}
          isReceiver={isReceivingCall}
        />
      )}

      {/* Incoming Call Modal */}
      {incomingCall && !showVideoCall && (
        <IncomingCall
          callerName={incomingCall.callerName}
          callerPicture={incomingCall.callerPicture}
          callType={incomingCall.callType}
          onAccept={acceptIncomingCall}
          onReject={rejectIncomingCall}
        />
      )}

      {/* Fullscreen Image Modal */}
      {fullscreenImage && (
        <div 
          className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center"
          onClick={() => setFullscreenImage(null)}
        >
          <button 
            className="absolute top-4 right-4 p-2 text-white hover:bg-white/20 rounded-lg"
            onClick={() => setFullscreenImage(null)}
          >
            <X className="w-6 h-6" />
          </button>
          <img 
            src={fullscreenImage} 
            alt="Fullscreen" 
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
