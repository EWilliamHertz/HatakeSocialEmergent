'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { MessageCircle, Send, Plus, Users, X, Search } from 'lucide-react';
import Image from 'next/image';

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

export default function MessagesPage() {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [currentUserId, setCurrentUserId] = useState('');
  const [loading, setLoading] = useState(true);
  const [showNewConversationModal, setShowNewConversationModal] = useState(false);
  const [friends, setFriends] = useState<User[]>([]);
  const [searchFriend, setSearchFriend] = useState('');

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
          loadConversations();
        }
      })
      .catch(() => router.push('/auth/login'));
  }, [router]);

  const loadConversations = async () => {
    try {
      const res = await fetch('/api/messages', { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setConversations(data.conversations || []);
      }
    } catch (error) {
      console.error('Load conversations error:', error);
    } finally {
      setLoading(false);
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

  const selectConversation = (convId: string) => {
    setSelectedConv(convId);
    loadMessages(convId);
  };

  const openNewConversationModal = () => {
    setShowNewConversationModal(true);
    loadFriends();
  };

  const startConversation = async (userId: string, userName: string) => {
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
        // Select the new conversation
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
      loadMessages(selectedConv);
    } catch (error) {
      console.error('Send message error:', error);
    }
  };

  const filteredFriends = friends.filter(f => 
    f.name.toLowerCase().includes(searchFriend.toLowerCase()) ||
    f.email.toLowerCase().includes(searchFriend.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-sm overflow-hidden" style={{ height: 'calc(100vh - 12rem)' }}>
          <div className="flex h-full">
            {/* Conversations List */}
            <div className="w-1/3 border-r border-gray-200 flex flex-col">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-xl font-bold">Messages</h2>
                <button 
                  onClick={openNewConversationModal}
                  className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                  data-testid="start-conversation-button"
                  title="Start New Conversation"
                >
                  <Plus className="w-5 h-5" />
                </button>
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
                      className={`w-full p-4 flex items-start gap-3 hover:bg-gray-50 transition text-left ${
                        selectedConv === conv.conversation_id ? 'bg-blue-50' : ''
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
                          <p className="font-semibold truncate">{conv.name}</p>
                          {conv.unread_count > 0 && (
                            <span className="bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                              {conv.unread_count}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 truncate">{conv.last_message || 'Start a conversation'}</p>
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
                  <div className="p-4 border-b border-gray-200">
                    {(() => {
                      const conv = conversations.find(c => c.conversation_id === selectedConv);
                      return conv ? (
                        <div className="flex items-center gap-3">
                          {conv.picture ? (
                            <Image src={conv.picture} alt={conv.name} width={40} height={40} className="rounded-full" />
                          ) : (
                            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                              {conv.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <p className="font-semibold">{conv.name}</p>
                            <p className="text-xs text-gray-500">Active now</p>
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
                        <p className="text-gray-500 text-sm">No messages yet. Say hi!</p>
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
                            msg.sender_id === currentUserId ? 'bg-blue-600 text-white' : 'bg-gray-100'
                          } rounded-2xl px-4 py-2`}>
                            <p className="text-sm">{msg.content}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Send Message */}
                  <div className="border-t border-gray-200 p-4">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                        placeholder="Type a message..."
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        data-testid="message-input"
                      />
                      <button
                        onClick={sendMessage}
                        disabled={!newMessage.trim()}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        data-testid="send-message-button"
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
                    <p className="text-gray-500 mb-4">Select a conversation to start messaging</p>
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

      {/* New Conversation Modal */}
      {showNewConversationModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" data-testid="new-conversation-modal">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="text-lg font-bold">Start New Conversation</h3>
              <button 
                onClick={() => setShowNewConversationModal(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  value={searchFriend}
                  onChange={(e) => setSearchFriend(e.target.value)}
                  placeholder="Search friends..."
                  className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  data-testid="search-friends-input"
                />
              </div>
            </div>
            
            <div className="max-h-80 overflow-y-auto">
              {filteredFriends.length === 0 ? (
                <div className="p-8 text-center">
                  <Users className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">
                    {friends.length === 0 
                      ? 'No friends yet. Add friends to start messaging!' 
                      : 'No friends found matching your search'}
                  </p>
                </div>
              ) : (
                filteredFriends.map((friend) => (
                  <button
                    key={friend.user_id}
                    onClick={() => startConversation(friend.user_id, friend.name)}
                    className="w-full p-4 flex items-center gap-3 hover:bg-gray-50 text-left border-b last:border-b-0"
                    data-testid={`select-friend-${friend.user_id}`}
                  >
                    {friend.picture ? (
                      <Image src={friend.picture} alt={friend.name} width={40} height={40} className="rounded-full" />
                    ) : (
                      <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                        {friend.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="font-semibold">{friend.name}</p>
                      <p className="text-sm text-gray-500">{friend.email}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
