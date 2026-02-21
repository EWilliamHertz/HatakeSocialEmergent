import React, { useState, useEffect, useRef } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '../config';

interface Participant {
  user_id: string;
  name: string;
  picture?: string;
}

interface VideoCallScreenProps {
  user: any;
  token: string;
  recipient: Participant;
  callType: 'audio' | 'video';
  isIncoming?: boolean;
  onClose: () => void;
}

export default function VideoCallScreen({ 
  user, 
  token, 
  recipient, 
  callType,
  isIncoming = false,
  onClose 
}: VideoCallScreenProps) {
  const [callState, setCallState] = useState<'connecting' | 'ringing' | 'connected' | 'ended'>('connecting');
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(callType === 'video');
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const durationRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Start pulse animation for ringing state
    if (callState === 'ringing' || callState === 'connecting') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [callState]);

  useEffect(() => {
    if (isIncoming) {
      // Already ringing
      setCallState('ringing');
    } else {
      // Initiate outgoing call
      initiateCall();
    }

    // Start polling for call signals
    startPolling();

    return () => {
      cleanup();
    };
  }, []);

  useEffect(() => {
    // Start duration timer when connected
    if (callState === 'connected') {
      durationRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }

    return () => {
      if (durationRef.current) {
        clearInterval(durationRef.current);
      }
    };
  }, [callState]);

  const getAuthToken = () => {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem('auth_token') || token;
    }
    return token;
  };

  const initiateCall = async () => {
    try {
      const authToken = getAuthToken();
      
      // Send incoming_call signal to recipient
      await fetch(`${API_URL}/api/calls`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'incoming_call',
          target: recipient.user_id,
          data: {
            call_type: callType,
            caller_id: user.user_id,
            caller_name: user.name,
            caller_picture: user.picture,
          },
        }),
      });

      setCallState('ringing');
      
      // Simulate connection after 3 seconds for demo
      // In production, this would wait for recipient to accept
      setTimeout(() => {
        if (callState !== 'ended') {
          setCallState('connected');
        }
      }, 3000);
      
    } catch (err) {
      console.error('Failed to initiate call:', err);
      showAlert('Call Failed', 'Could not connect the call. Please try again.');
      onClose();
    }
  };

  const startPolling = () => {
    pollingRef.current = setInterval(async () => {
      try {
        const authToken = getAuthToken();
        const res = await fetch(`${API_URL}/api/calls?mode=active`, {
          headers: { 'Authorization': `Bearer ${authToken}` },
        });
        const data = await res.json();
        
        if (data.success && data.signals?.length > 0) {
          for (const signal of data.signals) {
            if (signal.type === 'call_accepted' && signal.from === recipient.user_id) {
              setCallState('connected');
            } else if (signal.type === 'call_ended' && signal.from === recipient.user_id) {
              endCall(true);
            }
          }
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 2000);
  };

  const cleanup = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }
    if (durationRef.current) {
      clearInterval(durationRef.current);
    }
  };

  const acceptCall = async () => {
    try {
      const authToken = getAuthToken();
      
      await fetch(`${API_URL}/api/calls`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'call_accepted',
          target: recipient.user_id,
          data: {},
        }),
      });
      
      setCallState('connected');
    } catch (err) {
      console.error('Failed to accept call:', err);
    }
  };

  const endCall = async (wasRemoteEnd = false) => {
    setCallState('ended');
    cleanup();

    if (!wasRemoteEnd) {
      try {
        const authToken = getAuthToken();
        await fetch(`${API_URL}/api/calls?target=${recipient.user_id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${authToken}` },
        });
      } catch (err) {
        console.error('Failed to end call:', err);
      }
    }

    setTimeout(() => {
      onClose();
    }, 500);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const toggleVideo = () => {
    setIsVideoEnabled(!isVideoEnabled);
  };

  const toggleSpeaker = () => {
    setIsSpeakerOn(!isSpeakerOn);
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

  const getStatusText = () => {
    switch (callState) {
      case 'connecting':
        return 'Connecting...';
      case 'ringing':
        return isIncoming ? 'Incoming call...' : 'Ringing...';
      case 'connected':
        return formatDuration(callDuration);
      case 'ended':
        return 'Call ended';
      default:
        return '';
    }
  };

  const screenHeight = Dimensions.get('window').height;

  return (
    <SafeAreaView style={styles.container}>
      {/* Video/Call Display Area */}
      <View style={[styles.videoArea, { height: screenHeight * 0.65 }]}>
        {/* Remote participant display */}
        <View style={styles.remoteParticipant}>
          {callType === 'video' && callState === 'connected' ? (
            <View style={styles.videoPlaceholder}>
              <Ionicons name="videocam-off" size={64} color="#6B7280" />
              <Text style={styles.videoPlaceholderText}>
                Video unavailable in preview
              </Text>
            </View>
          ) : (
            <View style={styles.avatarContainer}>
              <Animated.View style={[styles.pulseRing, { transform: [{ scale: pulseAnim }] }]} />
              {recipient.picture ? (
                <Image source={{ uri: recipient.picture }} style={styles.largeAvatar} />
              ) : (
                <View style={styles.largeAvatarPlaceholder}>
                  <Ionicons name="person" size={64} color="#9CA3AF" />
                </View>
              )}
            </View>
          )}
        </View>

        {/* Participant name and status */}
        <View style={styles.callInfo}>
          <Text style={styles.participantName}>{recipient.name}</Text>
          <Text style={styles.callStatus}>{getStatusText()}</Text>
          <Text style={styles.callType}>
            {callType === 'video' ? 'Video Call' : 'Voice Call'}
          </Text>
        </View>

        {/* Local video preview (corner) */}
        {callType === 'video' && isVideoEnabled && callState === 'connected' && (
          <View style={styles.localVideoPreview}>
            <View style={styles.localVideoPlaceholder}>
              <Ionicons name="person" size={24} color="#9CA3AF" />
            </View>
          </View>
        )}
      </View>

      {/* Call Controls */}
      <View style={styles.controlsContainer}>
        {/* Incoming call controls */}
        {isIncoming && callState === 'ringing' && (
          <View style={styles.incomingControls}>
            <TouchableOpacity 
              style={[styles.controlButton, styles.declineButton]}
              onPress={() => endCall()}
              data-testid="decline-call-btn"
            >
              <Ionicons name="close" size={32} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.controlButton, styles.acceptButton]}
              onPress={acceptCall}
              data-testid="accept-call-btn"
            >
              <Ionicons name={callType === 'video' ? 'videocam' : 'call'} size={32} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        )}

        {/* Active call controls */}
        {(callState === 'connected' || (!isIncoming && callState !== 'ended')) && (
          <View style={styles.activeControls}>
            <TouchableOpacity 
              style={[styles.controlButton, styles.smallControlButton, isMuted && styles.controlButtonActive]}
              onPress={toggleMute}
              data-testid="mute-btn"
            >
              <Ionicons name={isMuted ? 'mic-off' : 'mic'} size={24} color={isMuted ? '#FFFFFF' : '#1F2937'} />
            </TouchableOpacity>

            {callType === 'video' && (
              <TouchableOpacity 
                style={[styles.controlButton, styles.smallControlButton, !isVideoEnabled && styles.controlButtonActive]}
                onPress={toggleVideo}
                data-testid="toggle-video-btn"
              >
                <Ionicons name={isVideoEnabled ? 'videocam' : 'videocam-off'} size={24} color={!isVideoEnabled ? '#FFFFFF' : '#1F2937'} />
              </TouchableOpacity>
            )}

            <TouchableOpacity 
              style={[styles.controlButton, styles.endCallButton]}
              onPress={() => endCall()}
              data-testid="end-call-btn"
            >
              <Ionicons name="call" size={28} color="#FFFFFF" style={{ transform: [{ rotate: '135deg' }] }} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.controlButton, styles.smallControlButton, isSpeakerOn && styles.controlButtonActive]}
              onPress={toggleSpeaker}
              data-testid="speaker-btn"
            >
              <Ionicons name={isSpeakerOn ? 'volume-high' : 'volume-low'} size={24} color={isSpeakerOn ? '#FFFFFF' : '#1F2937'} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.controlButton, styles.smallControlButton]}
              data-testid="flip-camera-btn"
            >
              <Ionicons name="camera-reverse" size={24} color="#1F2937" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Note about preview limitations */}
      <View style={styles.previewNote}>
        <Text style={styles.previewNoteText}>
          Full video/audio streaming requires a native app build
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  videoArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  remoteParticipant: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    width: '100%',
    height: '100%',
  },
  videoPlaceholderText: {
    color: '#9CA3AF',
    marginTop: 12,
    fontSize: 14,
  },
  avatarContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 3,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  largeAvatar: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 4,
    borderColor: '#3B82F6',
  },
  largeAvatarPlaceholder: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#374151',
    borderWidth: 4,
    borderColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  callInfo: {
    position: 'absolute',
    bottom: 24,
    alignItems: 'center',
  },
  participantName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  callStatus: {
    fontSize: 16,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  callType: {
    fontSize: 14,
    color: '#6B7280',
  },
  localVideoPreview: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 100,
    height: 140,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#374151',
    borderWidth: 2,
    borderColor: '#4B5563',
  },
  localVideoPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlsContainer: {
    paddingVertical: 24,
    paddingHorizontal: 32,
    backgroundColor: '#1F2937',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  incomingControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  activeControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  controlButton: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  smallControlButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#374151',
  },
  controlButtonActive: {
    backgroundColor: '#3B82F6',
  },
  declineButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EF4444',
  },
  acceptButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#10B981',
  },
  endCallButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EF4444',
  },
  previewNote: {
    backgroundColor: '#1F2937',
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  previewNoteText: {
    color: '#6B7280',
    fontSize: 12,
    textAlign: 'center',
  },
});
