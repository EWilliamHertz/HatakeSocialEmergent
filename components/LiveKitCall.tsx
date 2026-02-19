'use client';

import { useEffect, useState, useCallback } from 'react';
import { 
  LiveKitRoom, 
  VideoConference,
  RoomAudioRenderer,
  ControlBar,
  useParticipants,
  useTracks,
  ParticipantTile,
  useLocalParticipant,
  GridLayout,
} from '@livekit/components-react';
import '@livekit/components-styles';
import { Track, Room, RoomEvent } from 'livekit-client';
import { Phone, PhoneOff, X, Loader2 } from 'lucide-react';

interface LiveKitCallProps {
  isOpen: boolean;
  onClose: () => void;
  callType: 'audio' | 'video';
  remoteUserId: string;
  remoteUserName: string;
  remoteUserPicture?: string;
  currentUserId: string;
  currentUserName: string;
  isReceiver?: boolean;
}

export default function LiveKitCall({ 
  isOpen, 
  onClose, 
  callType, 
  remoteUserId,
  remoteUserName, 
  remoteUserPicture,
  currentUserId,
  currentUserName,
  isReceiver = false
}: LiveKitCallProps) {
  const [token, setToken] = useState<string>('');
  const [serverUrl, setServerUrl] = useState<string>('');
  const [isConnecting, setIsConnecting] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [isConnected, setIsConnected] = useState(false);

  // Generate a unique room name for this call
  const roomName = [currentUserId, remoteUserId].sort().join('-');

  // Fetch LiveKit token
  const fetchToken = useCallback(async () => {
    try {
      setIsConnecting(true);
      setError(null);

      const response = await fetch('/api/livekit/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          roomName,
          participantName: currentUserName,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get LiveKit token');
      }

      const data = await response.json();
      setToken(data.token);
      setServerUrl(data.serverUrl);
      
      // Notify the other user about the call (for incoming call notification)
      if (!isReceiver) {
        await fetch('/api/calls', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            type: 'incoming_call',
            target: remoteUserId,
            data: {
              call_type: callType,
              caller_name: currentUserName,
              room_name: roomName,
            }
          })
        }).catch(console.error);
      }
    } catch (err: any) {
      console.error('Token fetch error:', err);
      setError(err.message || 'Failed to connect to call');
      setIsConnecting(false);
    }
  }, [roomName, currentUserName, isReceiver, remoteUserId, callType]);

  useEffect(() => {
    if (isOpen) {
      fetchToken();
    }
    return () => {
      setToken('');
      setServerUrl('');
      setIsConnecting(true);
    };
  }, [isOpen, fetchToken]);

  // Call duration timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isConnected) {
      interval = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isConnected]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleDisconnect = useCallback(() => {
    setIsConnected(false);
    onClose();
  }, [onClose]);

  const handleConnected = useCallback(() => {
    setIsConnecting(false);
    setIsConnected(true);
  }, []);

  if (!isOpen) return null;

  // Show loading state while fetching token
  if (!token || !serverUrl) {
    return (
      <div className="fixed inset-0 bg-gray-900 z-50 flex items-center justify-center" data-testid="video-call-loading">
        <div className="text-center">
          {error ? (
            <>
              <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <X className="w-8 h-8 text-white" />
              </div>
              <p className="text-white text-lg mb-2">Connection Error</p>
              <p className="text-white/60 mb-4">{error}</p>
              <button
                onClick={onClose}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Close
              </button>
            </>
          ) : (
            <>
              <Loader2 className="w-16 h-16 text-blue-500 animate-spin mx-auto mb-4" />
              <p className="text-white text-lg">Connecting to call...</p>
              <p className="text-white/60 text-sm mt-2">Setting up secure connection</p>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50" data-testid="video-call-container">
      <LiveKitRoom
        token={token}
        serverUrl={serverUrl}
        connect={true}
        video={callType === 'video'}
        audio={true}
        onConnected={handleConnected}
        onDisconnected={handleDisconnect}
        onError={(err) => {
          console.error('LiveKit error:', err);
          setError(err.message);
        }}
        data-lk-theme="default"
        style={{ height: '100vh' }}
      >
        {/* Custom header overlay */}
        <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between z-10 bg-gradient-to-b from-black/50 to-transparent">
          <div className="flex items-center gap-3">
            {remoteUserPicture ? (
              <img src={remoteUserPicture} alt={remoteUserName} className="w-10 h-10 rounded-full" />
            ) : (
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                {remoteUserName.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <p className="text-white font-semibold">{remoteUserName}</p>
              <p className="text-white/70 text-sm">
                {isConnecting ? 'Connecting...' : formatDuration(callDuration)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition"
            title="Close"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Main video conference UI */}
        <VideoConference />
        
        {/* Audio renderer for remote participants */}
        <RoomAudioRenderer />
      </LiveKitRoom>
    </div>
  );
}
