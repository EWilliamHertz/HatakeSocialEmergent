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

// LiveKit imports - these will only work in a native build
let Room: any = null;
let RoomEvent: any = null;
let VideoTrack: any = null;
let useParticipant: any = null;
let useRoom: any = null;
let registerGlobals: any = null;

// Try to import LiveKit - will fail in Expo Go but work in native builds
try {
  const livekit = require('@livekit/react-native');
  const webrtc = require('@livekit/react-native-webrtc');
  Room = livekit.Room;
  RoomEvent = livekit.RoomEvent;
  VideoTrack = livekit.VideoTrack;
  useParticipant = livekit.useParticipant;
  useRoom = livekit.useRoom;
  registerGlobals = webrtc.registerGlobals;
  
  // Register WebRTC globals
  if (registerGlobals) {
    registerGlobals();
  }
} catch (e) {
  console.log('LiveKit not available - running in Expo Go mode');
}

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
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [livekitAvailable, setLivekitAvailable] = useState(false);
  const [room, setRoom] = useState<any>(null);
  const [livekitToken, setLivekitToken] = useState<string | null>(null);
  const [livekitUrl, setLivekitUrl] = useState<string | null>(null);
  
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const durationRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Check if LiveKit is available (native build)
    setLivekitAvailable(Room !== null);
    
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
      setCallState('ringing');
    } else {
      initiateCall();
    }

    startPolling();

    return () => {
      cleanup();
    };
  }, []);

  useEffect(() => {
    if (callState === 'connected') {
      durationRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
      
      // Connect to LiveKit room if available
      if (livekitAvailable && livekitToken && livekitUrl) {
        connectToRoom();
      }
    }

    return () => {
      if (durationRef.current) {
        clearInterval(durationRef.current);
      }
    };
  }, [callState, livekitToken]);

  const getAuthToken = () => {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem('auth_token') || token;
    }
    return token;
  };

  const getLivekitToken = async (roomName: string) => {
    try {
      const authToken = getAuthToken();
      const res = await fetch(`${API_URL}/api/livekit/token`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ roomName }),
      });
      const data = await res.json();
      
      if (data.success) {
        setLivekitToken(data.token);
        setLivekitUrl(data.wsUrl);
        return data;
      }
    } catch (err) {
      console.error('Failed to get LiveKit token:', err);
    }
    return null;
  };

  const connectToRoom = async () => {
    if (!livekitAvailable || !livekitToken || !livekitUrl) return;
    
    try {
      const newRoom = new Room();
      
      newRoom.on(RoomEvent.TrackSubscribed, (track: any) => {
        console.log('Track subscribed:', track.kind);
      });
      
      newRoom.on(RoomEvent.Disconnected, () => {
        console.log('Disconnected from room');
        endCall(true);
      });
      
      await newRoom.connect(livekitUrl, livekitToken);
      
      // Enable camera and microphone based on call type
      if (callType === 'video' && isVideoEnabled) {
        await newRoom.localParticipant.setCameraEnabled(true);
      }
      await newRoom.localParticipant.setMicrophoneEnabled(!isMuted);
      
      setRoom(newRoom);
    } catch (err) {
      console.error('Failed to connect to LiveKit room:', err);
    }
  };

  const initiateCall = async () => {
    try {
      const authToken = getAuthToken();
      
      // Create a unique room name for this call
      const roomName = `call_${user.user_id}_${recipient.user_id}_${Date.now()}`;
      
      // Get LiveKit token
      const tokenData = await getLivekitToken(roomName);
      
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
            room_name: roomName,
            livekit_url: tokenData?.wsUrl,
          },
        }),
      });

      setCallState('ringing');
      
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
              // Get LiveKit token for the room if we're the caller
              if (signal.data?.room_name) {
                await getLivekitToken(signal.data.room_name);
              }
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
    if (room) {
      room.disconnect();
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

  const toggleMute = async () => {
    setIsMuted(!isMuted);
    if (room) {
      await room.localParticipant.setMicrophoneEnabled(isMuted);
    }
  };

  const toggleVideo = async () => {
    setIsVideoEnabled(!isVideoEnabled);
    if (room) {
      await room.localParticipant.setCameraEnabled(!isVideoEnabled);
    }
  };

  const toggleSpeaker = () => {
    setIsSpeakerOn(!isSpeakerOn);
    // Audio routing would need native module
  };

  const toggleScreenShare = async () => {
    if (!room) return;
    
    try {
      if (isScreenSharing) {
        await room.localParticipant.setScreenShareEnabled(false);
      } else {
        await room.localParticipant.setScreenShareEnabled(true);
      }
      setIsScreenSharing(!isScreenSharing);
    } catch (err) {
      console.error('Screen share error:', err);
      showAlert('Screen Share', 'Screen sharing requires a native app build.');
    }
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
          {callType === 'video' && callState === 'connected' && livekitAvailable ? (
            <View style={styles.videoPlaceholder}>
              <Text style={styles.videoPlaceholderText}>
                Video connected via LiveKit
              </Text>
            </View>
          ) : callType === 'video' && callState === 'connected' && !livekitAvailable ? (
            <View style={styles.videoPlaceholder}>
              <Ionicons name="videocam-off" size={64} color="#6B7280" />
              <Text style={styles.videoPlaceholderText}>
                Video requires native build
              </Text>
              <Text style={styles.videoSubtext}>
                Run `eas build` to enable full video
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
            {livekitAvailable && ' • HD'}
          </Text>
        </View>

        {/* Local video preview (corner) */}
        {callType === 'video' && isVideoEnabled && callState === 'connected' && (
          <View style={styles.localVideoPreview}>
            <View style={styles.localVideoPlaceholder}>
              <Ionicons name="person" size={24} color="#9CA3AF" />
              <Text style={styles.localVideoText}>You</Text>
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
              <Text style={styles.controlLabel}>Decline</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.controlButton, styles.acceptButton]}
              onPress={acceptCall}
              data-testid="accept-call-btn"
            >
              <Ionicons name={callType === 'video' ? 'videocam' : 'call'} size={32} color="#FFFFFF" />
              <Text style={styles.controlLabel}>Accept</Text>
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
              <Text style={[styles.controlLabelSmall, isMuted && styles.controlLabelActive]}>
                {isMuted ? 'Unmute' : 'Mute'}
              </Text>
            </TouchableOpacity>

            {callType === 'video' && (
              <TouchableOpacity 
                style={[styles.controlButton, styles.smallControlButton, !isVideoEnabled && styles.controlButtonActive]}
                onPress={toggleVideo}
                data-testid="toggle-video-btn"
              >
                <Ionicons name={isVideoEnabled ? 'videocam' : 'videocam-off'} size={24} color={!isVideoEnabled ? '#FFFFFF' : '#1F2937'} />
                <Text style={[styles.controlLabelSmall, !isVideoEnabled && styles.controlLabelActive]}>
                  {isVideoEnabled ? 'Stop' : 'Start'}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity 
              style={[styles.controlButton, styles.endCallButton]}
              onPress={() => endCall()}
              data-testid="end-call-btn"
            >
              <Ionicons name="call" size={28} color="#FFFFFF" style={{ transform: [{ rotate: '135deg' }] }} />
            </TouchableOpacity>

            {/* Screen Share Button */}
            {callType === 'video' && callState === 'connected' && (
              <TouchableOpacity 
                style={[styles.controlButton, styles.smallControlButton, isScreenSharing && styles.controlButtonActive]}
                onPress={toggleScreenShare}
                data-testid="screen-share-btn"
              >
                <Ionicons name="share-outline" size={24} color={isScreenSharing ? '#FFFFFF' : '#1F2937'} />
                <Text style={[styles.controlLabelSmall, isScreenSharing && styles.controlLabelActive]}>
                  Share
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity 
              style={[styles.controlButton, styles.smallControlButton, isSpeakerOn && styles.controlButtonActive]}
              onPress={toggleSpeaker}
              data-testid="speaker-btn"
            >
              <Ionicons name={isSpeakerOn ? 'volume-high' : 'volume-low'} size={24} color={isSpeakerOn ? '#FFFFFF' : '#1F2937'} />
              <Text style={[styles.controlLabelSmall, isSpeakerOn && styles.controlLabelActive]}>
                Speaker
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Native build notice */}
      {!livekitAvailable && (
        <View style={styles.previewNote}>
          <Text style={styles.previewNoteText}>
            Full HD video/audio requires native build • Audio is simulated in preview
          </Text>
        </View>
      )}
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
    fontSize: 16,
  },
  videoSubtext: {
    color: '#6B7280',
    fontSize: 12,
    marginTop: 4,
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
  localVideoText: {
    color: '#9CA3AF',
    fontSize: 12,
    marginTop: 4,
  },
  controlsContainer: {
    paddingVertical: 24,
    paddingHorizontal: 24,
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
    flexWrap: 'wrap',
  },
  controlButton: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  smallControlButton: {
    width: 56,
    height: 70,
    borderRadius: 16,
    backgroundColor: '#374151',
  },
  controlButtonActive: {
    backgroundColor: '#3B82F6',
  },
  declineButton: {
    width: 72,
    height: 90,
    borderRadius: 20,
    backgroundColor: '#EF4444',
  },
  acceptButton: {
    width: 72,
    height: 90,
    borderRadius: 20,
    backgroundColor: '#10B981',
  },
  endCallButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EF4444',
  },
  controlLabel: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 6,
  },
  controlLabelSmall: {
    color: '#9CA3AF',
    fontSize: 10,
    marginTop: 4,
  },
  controlLabelActive: {
    color: '#FFFFFF',
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
