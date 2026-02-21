import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '../config';

interface Comment {
  comment_id: string;
  post_id: string;
  user_id: string;
  name: string;
  picture?: string;
  content: string;
  parent_comment_id?: string;
  created_at: string;
  reactions?: { emoji: string; count: number; userReacted: boolean }[];
}

interface CommentsModalProps {
  visible: boolean;
  onClose: () => void;
  postId: string;
  token: string;
  onCommentAdded?: () => void;
}

export default function CommentsModal({ 
  visible, 
  onClose, 
  postId, 
  token,
  onCommentAdded 
}: CommentsModalProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible && postId) {
      fetchComments();
    }
  }, [visible, postId]);

  const fetchComments = async () => {
    try {
      setLoading(true);
      const authToken = typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : token;
      
      const response = await fetch(`${API_URL}/api/feed/${postId}/comments`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      
      const data = await response.json();
      if (data.success && Array.isArray(data.comments)) {
        setComments(data.comments);
      }
    } catch (err) {
      console.error('Failed to fetch comments:', err);
    } finally {
      setLoading(false);
    }
  };

  const submitComment = async () => {
    if (!newComment.trim() || submitting) return;
    
    setSubmitting(true);
    try {
      const authToken = typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : token;
      
      const response = await fetch(`${API_URL}/api/feed/${postId}/comments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: newComment.trim(),
          parentCommentId: replyingTo?.comment_id || null,
        }),
      });
      
      const data = await response.json();
      if (data.success) {
        setNewComment('');
        setReplyingTo(null);
        // Add the new comment to the list
        if (data.comment) {
          setComments(prev => [...prev, data.comment]);
        } else {
          fetchComments();
        }
        onCommentAdded?.();
      }
    } catch (err) {
      console.error('Failed to submit comment:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString();
  };

  const handleReply = (comment: Comment) => {
    setReplyingTo(comment);
    inputRef.current?.focus();
  };

  // Organize comments into threads
  const organizeComments = () => {
    const topLevel = comments.filter(c => !c.parent_comment_id);
    const replies = comments.filter(c => c.parent_comment_id);
    
    return topLevel.map(comment => ({
      ...comment,
      replies: replies.filter(r => r.parent_comment_id === comment.comment_id),
    }));
  };

  const renderComment = ({ item, isReply = false }: { item: Comment & { replies?: Comment[] }; isReply?: boolean }) => (
    <View style={[styles.commentContainer, isReply && styles.replyContainer]}>
      <View style={styles.commentHeader}>
        {item.picture ? (
          <Image source={{ uri: item.picture }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Ionicons name="person" size={isReply ? 14 : 16} color="#9CA3AF" />
          </View>
        )}
        <View style={styles.commentContent}>
          <View style={styles.commentBubble}>
            <Text style={styles.commentAuthor}>{item.name}</Text>
            <Text style={styles.commentText}>{item.content}</Text>
          </View>
          <View style={styles.commentActions}>
            <Text style={styles.commentTime}>{formatTime(item.created_at)}</Text>
            {!isReply && (
              <TouchableOpacity onPress={() => handleReply(item)}>
                <Text style={styles.replyButton}>Reply</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
      
      {/* Render replies */}
      {item.replies && item.replies.length > 0 && (
        <View style={styles.repliesContainer}>
          {item.replies.map(reply => (
            <View key={reply.comment_id}>
              {renderComment({ item: reply, isReply: true })}
            </View>
          ))}
        </View>
      )}
    </View>
  );

  const threadedComments = organizeComments();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Comments</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#1F2937" />
          </TouchableOpacity>
        </View>

        {/* Comments List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3B82F6" />
          </View>
        ) : comments.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubble-outline" size={48} color="#D1D5DB" />
            <Text style={styles.emptyText}>No comments yet</Text>
            <Text style={styles.emptySubtext}>Be the first to comment!</Text>
          </View>
        ) : (
          <FlatList
            data={threadedComments}
            keyExtractor={(item) => item.comment_id}
            renderItem={({ item }) => renderComment({ item })}
            contentContainerStyle={styles.commentsList}
          />
        )}

        {/* Reply indicator */}
        {replyingTo && (
          <View style={styles.replyIndicator}>
            <Text style={styles.replyIndicatorText}>
              Replying to <Text style={styles.replyIndicatorName}>{replyingTo.name}</Text>
            </Text>
            <TouchableOpacity onPress={() => setReplyingTo(null)}>
              <Ionicons name="close-circle" size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>
        )}

        {/* Input */}
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          <View style={styles.inputContainer}>
            <TextInput
              ref={inputRef}
              style={styles.input}
              placeholder={replyingTo ? `Reply to ${replyingTo.name}...` : "Write a comment..."}
              placeholderTextColor="#9CA3AF"
              value={newComment}
              onChangeText={setNewComment}
              multiline
              maxLength={500}
            />
            <TouchableOpacity 
              style={[styles.sendButton, (!newComment.trim() || submitting) && styles.sendButtonDisabled]}
              onPress={submitComment}
              disabled={!newComment.trim() || submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="send" size={20} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  closeButton: {
    position: 'absolute',
    right: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
  },
  commentsList: {
    padding: 16,
  },
  commentContainer: {
    marginBottom: 16,
  },
  replyContainer: {
    marginLeft: 0,
    marginBottom: 8,
  },
  repliesContainer: {
    marginLeft: 40,
    marginTop: 8,
  },
  commentHeader: {
    flexDirection: 'row',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  avatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentContent: {
    flex: 1,
    marginLeft: 10,
  },
  commentBubble: {
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  commentAuthor: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  commentText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginLeft: 8,
    gap: 16,
  },
  commentTime: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  replyButton: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  replyIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F3F4F6',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  replyIndicatorText: {
    fontSize: 13,
    color: '#6B7280',
  },
  replyIndicatorName: {
    fontWeight: '600',
    color: '#3B82F6',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  input: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    paddingRight: 16,
    fontSize: 15,
    maxHeight: 100,
    color: '#1F2937',
  },
  sendButton: {
    backgroundColor: '#3B82F6',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: {
    backgroundColor: '#93C5FD',
  },
});
