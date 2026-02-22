import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
  Platform,
  Alert,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '../config';

interface Participant {
  user_id: string;
  name: string;
  picture?: string;
}

interface CallState {
  recipient: Participant | null;
  callType: 'audio' | 'video';
  isIncoming: boolean;
}

interface VideoCallScreenProps {
  user: any;
  token: string;
  callState: CallState;
  onEndCall: () => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function VideoCallScreen({ user, token, callState, onEndCall }: VideoCallScreenProps) {
  const [callStatus, setCallStatus] = useState<'connecting' | 'ringing' | 'connected' | 'ended'>('connecting');
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(callState.callType === 'audio');
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [livekitToken, setLivekitToken] = useState<string | null>(null);
  const [livekitUrl, setLivekitUrl] = useState<string | null>(null);
  
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const durationTimer = useRef<NodeJS.Timeout | null>(null);

  const isWeb = Platform.OS === 'web';

  const getAuthToken = () => {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem('auth_token') || token;
    }
    return token;
  };

  useEffect(() => {
    startCall();
    return () => {
      if (durationTimer.current) {
        clearInterval(durationTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    if (callStatus === 'ringing') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.2, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [callStatus]);

  useEffect(() => {
    if (callStatus === 'connected') {
      durationTimer.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (durationTimer.current) {
        clearInterval(durationTimer.current);
      }
    };
  }, [callStatus]);

  const startCall = async () => {
    setCallStatus('ringing');
    
    try {
      const authToken = getAuthToken();
      const recipientId = callState.recipient?.user_id || '';
      const roomName = [user.user_id, recipientId].sort().join('-');
      
      // Get LiveKit token from our API
      const res = await fetch(`${API_URL}/api/livekit/token`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roomName,
          participantName: user.name || 'User',
        }),
      });
      
      const data = await res.json();
      
      if (data.token && data.url) {
        setLivekitToken(data.token);
        setLivekitUrl(data.url);
        
        // Send call signal to recipient
        if (!callState.isIncoming) {
          await fetch(`${API_URL}/api/calls`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${authToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              type: 'incoming_call',
              target: recipientId,
              data: {
                caller_name: user.name,
                caller_picture: user.picture,
                call_type: callState.callType,
                room_name: roomName,
              },
            }),
          });
        }
        
        setCallStatus('connected');
      } else {
        // Fallback: simulate connection for testing
        setTimeout(() => setCallStatus('connected'), 2000);
      }
    } catch (err) {
      console.error('Failed to start call:', err);
      // Fallback for testing
      setTimeout(() => setCallStatus('connected'), 2000);
    }
  };

  const endCall = async () => {
    setCallStatus('ended');
    // Notify the other participant
    try {
      const authToken = getAuthToken();
      const recipientId = callState.recipient?.user_id || '';
      await fetch(`${API_URL}/api/calls`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'call_ended',
          target: recipientId,
          data: {},
        }),
      });
    } catch (err) {
      console.error('Failed to send end call signal:', err);
    }
    onEndCall();
  };

  const toggleMute = () => setIsMuted(!isMuted);
  const toggleVideo = () => setIsVideoOff(!isVideoOff);
  const toggleSpeaker = () => setIsSpeakerOn(!isSpeakerOn);

  const toggleScreenShare = () => {
    setIsScreenSharing(!isScreenSharing);
  };

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      alert(`${title}: ${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Web-only message
  if (isWeb) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.webMessage}>
          <View style={styles.webIconContainer}>
            <Ionicons name="videocam-off-outline" size={64} color="#9CA3AF" />
          </View>
          <Text style={styles.webTitle}>Video Calls Not Available on Web</Text>
          <Text style={styles.webSubtitle}>
            Video and voice calls require the native mobile app.
          </Text>
          <Text style={styles.webHint}>
            Build and install the app using:{'\n'}
            <Text style={styles.webCode}>eas build --platform android</Text>
          </Text>
          
          <View style={styles.calleeInfo}>
            {callState.recipient?.picture ? (
              <Image source={{ uri: callState.recipient.picture }} style={styles.calleePicture} />
            ) : (
              <View style={styles.calleePlaceholder}>
                <Ionicons name="person" size={32} color="#9CA3AF" />
              </View>
            )}
            <Text style={styles.calleeName}>{callState.recipient?.name || 'Unknown'}</Text>
          </View>

          <TouchableOpacity style={styles.closeButton} onPress={onEndCall}>
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Native call UI (placeholder - would show actual video in native build)
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.callStatus}>
          {callStatus === 'connecting' && 'Connecting...'}
          {callStatus === 'ringing' && 'Ringing...'}
          {callStatus === 'connected' && formatDuration(callDuration)}
        </Text>
        <Text style={styles.callType}>
          {callState.callType === 'video' ? 'Video Call' : 'Voice Call'}
        </Text>
      </View>

      {/* Video area placeholder */}
      <View style={styles.videoArea}>
        {callState.callType === 'video' && !isVideoOff ? (
          <View style={styles.videoPlaceholder}>
            <Ionicons name="videocam" size={48} color="#3B82F6" />
            <Text style={styles.videoPlaceholderText}>Video will appear here in native build</Text>
          </View>
        ) : (
          <View style={styles.audioCallDisplay}>
            <Animated.View style={[styles.avatarRing, { transform: [{ scale: pulseAnim }] }]}>
              {callState.recipient?.picture ? (
                <Image source={{ uri: callState.recipient.picture }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Ionicons name="person" size={48} color="#9CA3AF" />
                </View>
              )}
            </Animated.View>
            <Text style={styles.recipientName}>{callState.recipient?.name || 'Unknown'}</Text>
          </View>
        )}
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity 
          style={[styles.controlButton, isMuted && styles.controlButtonActive]}
          onPress={toggleMute}
        >
          <Ionicons name={isMuted ? 'mic-off' : 'mic'} size={28} color="#FFFFFF" />
        </TouchableOpacity>

        {callState.callType === 'video' && (
          <TouchableOpacity 
            style={[styles.controlButton, isVideoOff && styles.controlButtonActive]}
            onPress={toggleVideo}
          >
            <Ionicons name={isVideoOff ? 'videocam-off' : 'videocam'} size={28} color="#FFFFFF" />
          </TouchableOpacity>
        )}

        <TouchableOpacity 
          style={[styles.controlButton, isSpeakerOn && styles.controlButtonActive]}
          onPress={toggleSpeaker}
        >
          <Ionicons name={isSpeakerOn ? 'volume-high' : 'volume-mute'} size={28} color="#FFFFFF" />
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.controlButton, isScreenSharing && styles.controlButtonActive]}
          onPress={toggleScreenShare}
        >
          <Ionicons name="share-outline" size={28} color="#FFFFFF" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.endCallButton} onPress={endCall}>
          <Ionicons name="call" size={32} color="#FFFFFF" style={{ transform: [{ rotate: '135deg' }] }} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  
  // Web message styles
  webMessage: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  webIconContainer: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#1F2937', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  webTitle: { fontSize: 22, fontWeight: '600', color: '#FFFFFF', textAlign: 'center', marginBottom: 12 },
  webSubtitle: { fontSize: 16, color: '#9CA3AF', textAlign: 'center', marginBottom: 24 },
  webHint: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 32 },
  webCode: { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', backgroundColor: '#1F2937', color: '#60A5FA', padding: 4 },
  calleeInfo: { alignItems: 'center', marginBottom: 32 },
  calleePicture: { width: 80, height: 80, borderRadius: 40, marginBottom: 12 },
  calleePlaceholder: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#374151', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  calleeName: { fontSize: 18, fontWeight: '600', color: '#FFFFFF' },
  closeButton: { backgroundColor: '#3B82F6', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12 },
  closeButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  
  // Native call styles
  header: { alignItems: 'center', paddingTop: 20, paddingBottom: 10 },
  callStatus: { fontSize: 28, fontWeight: '300', color: '#FFFFFF' },
  callType: { fontSize: 14, color: '#9CA3AF', marginTop: 4 },
  
  videoArea: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  videoPlaceholder: { alignItems: 'center', justifyContent: 'center', padding: 40, backgroundColor: '#1F2937', borderRadius: 16 },
  videoPlaceholderText: { color: '#6B7280', marginTop: 12, textAlign: 'center' },
  
  audioCallDisplay: { alignItems: 'center' },
  avatarRing: { width: 140, height: 140, borderRadius: 70, borderWidth: 3, borderColor: '#3B82F6', alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 120, height: 120, borderRadius: 60 },
  avatarPlaceholder: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#374151', alignItems: 'center', justifyContent: 'center' },
  recipientName: { fontSize: 24, fontWeight: '600', color: '#FFFFFF', marginTop: 20 },
  
  controls: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 30, paddingHorizontal: 20, gap: 16 },
  controlButton: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#374151', alignItems: 'center', justifyContent: 'center' },
  controlButtonActive: { backgroundColor: '#3B82F6' },
  endCallButton: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center' },
});
