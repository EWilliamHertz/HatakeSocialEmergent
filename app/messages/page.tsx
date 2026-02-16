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

// Notification sound (base64 encoded short beep)
const NOTIFICATION_SOUND = 'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA/+M4wAAAAAAAAAAAAEluZm8AAAAPAAAAAwAAAbAAqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV////////////////////////////////////////////AAAAAExhdmM1OC4xMwAAAAAAAAAAAAAAACQDgAAAAAAAAAGwsNIlHgAAAAAAAAAAAAAAAAD/4xjEAAKoGfJBQRgAMIAIRhSFIJB8H4fyhACAIB/y4Oefy4AQBAEAQBA/B+H/ygCAIBAEAQBD//5QCAIAgCAIH4P/+DkOQhCAAAAAADCMP/jGMQLA6wa9kZhGABsAGzBBEBsxgxYNKqIjMWYaGmZkCiYJmZmZmDMzMzM0AAAE//4xjEFAPAAsVvwAAAAAAD/+Mf/4xjEGAAAANIAAAAA/4xjEKAAAANIAAAAA';

export default function MessagesPage() {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<string | null>(null);
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
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastMessageCount = useRef(0);

  // Initialize audio
  useEffect(() => {
    audioRef.current = new Audio(NOTIFICATION_SOUND);
  }, []);

  // Play notification sound
  const playNotificationSound = useCallback(() => {
    if (soundEnabled && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
  }, [soundEnabled]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
        }
      })
      .catch(() => router.push('/auth/login'));
  }, [router]);

  // Poll for new messages when a conversation is selected
  useEffect(() => {
    if (!selectedConv) return;
    
    const interval = setInterval(() => {
      loadMessages(selectedConv, true);
    }, 3000);
    
    return () => clearInterval(interval);
  }, [selectedConv]);

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
    loadMessages(convId);
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

    try {
      await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          recipientId: conv.user_id,
          content: content || (messageType === 'image' ? '📷 Image' : '🎥 Video'),
          messageType: messageType || 'text',
          mediaUrl: mediaUrl
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
            onClick={() => window.open(msg.media_url, '_blank')}
          />
          {msg.content && msg.content !== '📷 Image' && (
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
          {msg.content && msg.content !== '🎥 Video' && (
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
              
              <div className="flex-1 overflow-y-auto">
                {loading ? (
                  <div className="p-8 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  </div>
                ) : conversations.length === 0 ? (
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
                        <Image src={conv.picture} alt={conv.name} width={40} height={40} className="rounded-full" />
                      ) : (
                        <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">
                          {conv.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-semibold truncate dark:text-white">{conv.name}</p>
                          {conv.unread_count > 0 && (
                            <span className="bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                              {conv.unread_count}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{conv.last_message || 'Start a conversation'}</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 flex flex-col">
              {selectedConv ? (
                <>
                  {/* Chat Header */}
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
                    {messages.length === 0 ? (
                      <div className="text-center py-8">
                        <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                        <p className="text-gray-500 dark:text-gray-400 text-sm">No messages yet. Say hi!</p>
                      </div>
                    ) : (
                      messages.map((msg) => (
                        <div
                          key={msg.message_id}
                          className={`flex gap-3 ${
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
                          <div className={`max-w-sm ${
                            msg.sender_id === currentUserId ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 dark:text-white'
                          } rounded-2xl px-4 py-2`}>
                            {renderMessageContent(msg)}
                          </div>
                        </div>
                      ))
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Send Message */}
                  <div className="border-t border-gray-200 dark:border-gray-700 p-4">
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
    </div>
  );
}
