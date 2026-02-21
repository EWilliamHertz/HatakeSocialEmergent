import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
  Modal,
  Dimensions,
  Vibration,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '../config';

interface IncomingCall {
  caller_id: string;
  caller_name: string;
  caller_picture?: string;
  call_type: 'audio' | 'video';
}

interface IncomingCallNotificationProps {
  user: any;
  token: string;
  onAcceptCall: (caller: IncomingCall) => void;
}

export default function IncomingCallNotification({ 
  user, 
  token,
  onAcceptCall 
}: IncomingCallNotificationProps) {
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [visible, setVisible] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(-200)).current;
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Start polling for incoming calls
    startPolling();

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (visible) {
      // Slide in animation
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }).start();

      // Pulse animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Vibration pattern
      if (Platform.OS !== 'web') {
        Vibration.vibrate([0, 500, 200, 500], true);
      }
    } else {
      slideAnim.setValue(-200);
      if (Platform.OS !== 'web') {
        Vibration.cancel();
      }
    }

    return () => {
      if (Platform.OS !== 'web') {
        Vibration.cancel();
      }
    };
  }, [visible]);

  const getAuthToken = () => {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem('auth_token') || token;
    }
    return token;
  };

  const startPolling = () => {
    pollingRef.current = setInterval(async () => {
      try {
        const authToken = getAuthToken();
        const res = await fetch(`${API_URL}/api/calls?mode=preview`, {
          headers: { 'Authorization': `Bearer ${authToken}` },
        });
        const data = await res.json();
        
        if (data.success && data.signals?.length > 0) {
          for (const signal of data.signals) {
            if (signal.type === 'incoming_call' && signal.data) {
              // Show incoming call notification
              setIncomingCall({
                caller_id: signal.from,
                caller_name: signal.data.caller_name || 'Unknown',
                caller_picture: signal.data.caller_picture,
                call_type: signal.data.call_type || 'audio',
              });
              setVisible(true);
            }
          }
        }
      } catch (err) {
        // Silently fail polling
      }
    }, 3000);
  };

  const handleAccept = async () => {
    if (!incomingCall) return;
    
    setVisible(false);
    
    // Send acceptance signal
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
          target: incomingCall.caller_id,
          data: {},
        }),
      });
    } catch (err) {
      console.error('Failed to send accept signal:', err);
    }
    
    onAcceptCall(incomingCall);
    setIncomingCall(null);
  };

  const handleDecline = async () => {
    if (!incomingCall) return;
    
    setVisible(false);
    
    // Send decline signal
    try {
      const authToken = getAuthToken();
      await fetch(`${API_URL}/api/calls?target=${incomingCall.caller_id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
    } catch (err) {
      console.error('Failed to send decline signal:', err);
    }
    
    setIncomingCall(null);
  };

  if (!visible || !incomingCall) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleDecline}
    >
      <View style={styles.overlay}>
        <Animated.View 
          style={[
            styles.container,
            { transform: [{ translateY: slideAnim }] }
          ]}
        >
          {/* Caller Info */}
          <View style={styles.callerSection}>
            <Animated.View style={[styles.avatarContainer, { transform: [{ scale: pulseAnim }] }]}>
              {incomingCall.caller_picture ? (
                <Image source={{ uri: incomingCall.caller_picture }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Ionicons name="person" size={40} color="#9CA3AF" />
                </View>
              )}
            </Animated.View>
            
            <Text style={styles.callerName}>{incomingCall.caller_name}</Text>
            <Text style={styles.callType}>
              Incoming {incomingCall.call_type === 'video' ? 'Video' : 'Voice'} Call
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity 
              style={[styles.button, styles.declineButton]}
              onPress={handleDecline}
              data-testid="decline-incoming-call"
            >
              <Ionicons name="close" size={28} color="#FFFFFF" />
              <Text style={styles.buttonText}>Decline</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.button, styles.acceptButton]}
              onPress={handleAccept}
              data-testid="accept-incoming-call"
            >
              <Ionicons 
                name={incomingCall.call_type === 'video' ? 'videocam' : 'call'} 
                size={28} 
                color="#FFFFFF" 
              />
              <Text style={styles.buttonText}>Accept</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-start',
    paddingTop: 60,
  },
  container: {
    marginHorizontal: 16,
    backgroundColor: '#1F2937',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 20,
  },
  callerSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#3B82F6',
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#374151',
    borderWidth: 3,
    borderColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  callerName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  callType: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  button: {
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    minWidth: 100,
  },
  declineButton: {
    backgroundColor: '#EF4444',
  },
  acceptButton: {
    backgroundColor: '#10B981',
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    marginTop: 4,
    fontSize: 14,
  },
});
