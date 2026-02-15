'use client';

import { useEffect, useState } from 'react';
import { MessageCircle, X, Send, ChevronDown, Users } from 'lucide-react';
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
  const [friends, setFriends] = useState<User[]>([]);
  const [unreadTotal, setUnreadTotal] = useState(0);

  useEffect(() => {
    // Check auth status
    fetch('/api/auth/me', { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setIsAuthenticated(true);
          setCurrentUserId(data.user.user_id);
          loadConversations();
        }
      })
      .catch(() => setIsAuthenticated(false));
  }, []);

  useEffect(() => {
    // Calculate unread total
    const total = conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0);
    setUnreadTotal(total);
  }, [conversations]);

  const loadConversations = async () => {
    try {
      const res = await fetch('/api/messages', { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setConversations(data.conversations || []);
      }
    } catch (error) {
      console.error('Load conversations error:', error);
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
    setShowNewConversation(false);
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
      loadMessages(selectedConv);
    } catch (error) {
      console.error('Send message error:', error);
    }
  };

  const handleOpenNewConversation = () => {
    setShowNewConversation(true);
    setSelectedConv(null);
    loadFriends();
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
        <div className={`fixed bottom-6 right-6 bg-white rounded-xl shadow-2xl z-50 overflow-hidden transition-all ${isMinimized ? 'w-72 h-14' : 'w-96 h-[500px]'}`} data-testid="messenger-widget">
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
                  <button
                    onClick={() => setSelectedConv(null)}
                    className="p-2 text-sm text-blue-600 hover:bg-blue-50 text-left border-b"
                  >
                    ← Back to conversations
                  </button>
                  <div className="flex-1 overflow-y-auto p-3 space-y-3">
                    {messages.map((msg) => (
                      <div
                        key={msg.message_id}
                        className={`flex gap-2 ${msg.sender_id === currentUserId ? 'flex-row-reverse' : ''}`}
                      >
                        {msg.picture ? (
                          <Image src={msg.picture} alt={msg.name} width={28} height={28} className="rounded-full flex-shrink-0" />
                        ) : (
                          <div className="w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                            {msg.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className={`max-w-[200px] ${msg.sender_id === currentUserId ? 'bg-blue-600 text-white' : 'bg-gray-100'} rounded-xl px-3 py-2`}>
                          <p className="text-sm">{msg.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="border-t p-2 flex gap-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                      placeholder="Type a message..."
                      className="flex-1 px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500"
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
                </>
              ) : showNewConversation ? (
                // New Conversation View
                <>
                  <button
                    onClick={() => setShowNewConversation(false)}
                    className="p-2 text-sm text-blue-600 hover:bg-blue-50 text-left border-b"
                  >
                    ← Back to conversations
                  </button>
                  <div className="p-3 border-b">
                    <h3 className="font-semibold text-sm">Start a conversation</h3>
                    <p className="text-xs text-gray-500">Select a friend to message</p>
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    {friends.length === 0 ? (
                      <div className="p-4 text-center text-gray-500 text-sm">
                        <Users className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                        No friends yet. Add friends to start messaging!
                      </div>
                    ) : (
                      friends.map((friend) => (
                        <button
                          key={friend.user_id}
                          onClick={() => startNewConversation(friend.user_id)}
                          className="w-full p-3 flex items-center gap-3 hover:bg-gray-50 text-left"
                          data-testid={`friend-${friend.user_id}`}
                        >
                          {friend.picture ? (
                            <Image src={friend.picture} alt={friend.name} width={36} height={36} className="rounded-full" />
                          ) : (
                            <div className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                              {friend.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-sm">{friend.name}</p>
                            <p className="text-xs text-gray-500">{friend.email}</p>
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
                      <div className="p-4 text-center text-gray-500 text-sm">
                        <MessageCircle className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                        No conversations yet
                      </div>
                    ) : (
                      conversations.map((conv) => (
                        <button
                          key={conv.conversation_id}
                          onClick={() => selectConversation(conv.conversation_id)}
                          className="w-full p-3 flex items-center gap-3 hover:bg-gray-50 text-left border-b"
                          data-testid={`conversation-${conv.conversation_id}`}
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
                              <p className="font-medium text-sm truncate">{conv.name}</p>
                              {conv.unread_count > 0 && (
                                <span className="bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded-full">
                                  {conv.unread_count}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 truncate">{conv.last_message || 'No messages'}</p>
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
    </>
  );
}
