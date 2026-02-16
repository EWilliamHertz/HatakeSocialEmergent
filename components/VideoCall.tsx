'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff, Monitor, MonitorOff, X, Maximize2, Minimize2 } from 'lucide-react';

interface VideoCallProps {
  isOpen: boolean;
  onClose: () => void;
  callType: 'audio' | 'video';
  remoteUserId: string;
  remoteUserName: string;
  remoteUserPicture?: string;
  currentUserId: string;
  currentUserName: string;
}

export default function VideoCall({ 
  isOpen, 
  onClose, 
  callType, 
  remoteUserId,
  remoteUserName, 
  remoteUserPicture,
  currentUserId,
  currentUserName
}: VideoCallProps) {
  const [isConnecting, setIsConnecting] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(callType === 'audio');
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [callStatus, setCallStatus] = useState<'calling' | 'ringing' | 'connected' | 'ended'>('calling');

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const websocketRef = useRef<WebSocket | null>(null);
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // ICE servers for STUN/TURN
  const iceServers = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun4.l.google.com:19302' },
    ],
  };

  // Format call duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Get WebSocket URL
  const getWebSocketUrl = () => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    return `${protocol}//${host}/ws/signaling/${currentUserId}`;
  };

  // Initialize WebSocket connection
  const initWebSocket = useCallback(() => {
    const ws = new WebSocket(getWebSocketUrl());
    
    ws.onopen = () => {
      console.log('WebSocket connected');
      // Create room for the call (use sorted user IDs for consistent room ID)
      const roomId = [currentUserId, remoteUserId].sort().join('_');
      ws.send(JSON.stringify({
        type: 'join_room',
        room_id: roomId
      }));
      
      // Send call request to remote user
      ws.send(JSON.stringify({
        type: 'call_user',
        target: remoteUserId,
        call_type: callType,
        caller_name: currentUserName
      }));
    };
    
    ws.onmessage = async (event) => {
      const message = JSON.parse(event.data);
      console.log('WebSocket message:', message.type);
      
      switch (message.type) {
        case 'room_joined':
          console.log('Joined room:', message.room_id, 'Users:', message.users);
          if (message.users.length > 0) {
            // Other user is already in room, create offer
            await createOffer();
          }
          break;
        
        case 'user_joined':
          console.log('User joined room:', message.user_id);
          // New user joined, create offer
          await createOffer();
          break;
        
        case 'offer':
          console.log('Received offer from:', message.from);
          await handleOffer(message.offer, message.from);
          break;
        
        case 'answer':
          console.log('Received answer from:', message.from);
          await handleAnswer(message.answer);
          break;
        
        case 'ice_candidate':
          console.log('Received ICE candidate from:', message.from);
          await handleIceCandidate(message.candidate);
          break;
        
        case 'call_accepted':
          setCallStatus('connected');
          setIsConnecting(false);
          setIsConnected(true);
          break;
        
        case 'call_rejected':
          setError('Call was declined');
          setCallStatus('ended');
          break;
        
        case 'call_ended':
          handleEndCall();
          break;
        
        case 'user_left':
          console.log('User left:', message.user_id);
          handleEndCall();
          break;
      }
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setError('Connection error. Please try again.');
    };
    
    ws.onclose = () => {
      console.log('WebSocket closed');
    };
    
    websocketRef.current = ws;
  }, [currentUserId, remoteUserId, callType, currentUserName]);

  // Create peer connection
  const createPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection(iceServers);
    
    pc.onicecandidate = (event) => {
      if (event.candidate && websocketRef.current) {
        websocketRef.current.send(JSON.stringify({
          type: 'ice_candidate',
          target: remoteUserId,
          candidate: event.candidate
        }));
      }
    };
    
    pc.ontrack = (event) => {
      console.log('Received remote track');
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };
    
    pc.onconnectionstatechange = () => {
      console.log('Connection state:', pc.connectionState);
      if (pc.connectionState === 'connected') {
        setIsConnected(true);
        setIsConnecting(false);
        setCallStatus('connected');
        // Start call timer
        if (!callTimerRef.current) {
          callTimerRef.current = setInterval(() => {
            setCallDuration((prev) => prev + 1);
          }, 1000);
        }
      } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        handleEndCall();
      }
    };
    
    peerConnectionRef.current = pc;
    return pc;
  }, [remoteUserId]);

  // Initialize local media
  const initializeMedia = useCallback(async () => {
    try {
      const constraints = {
        audio: true,
        video: callType === 'video' ? { width: 1280, height: 720 } : false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Create peer connection and add tracks
      const pc = createPeerConnection();
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      return stream;
    } catch (err: any) {
      console.error('Media initialization error:', err);
      setError(err.message || 'Failed to access camera/microphone');
      setIsConnecting(false);
      return null;
    }
  }, [callType, createPeerConnection]);

  // Create and send offer
  const createOffer = async () => {
    if (!peerConnectionRef.current || !websocketRef.current) return;
    
    try {
      const offer = await peerConnectionRef.current.createOffer();
      await peerConnectionRef.current.setLocalDescription(offer);
      
      websocketRef.current.send(JSON.stringify({
        type: 'offer',
        target: remoteUserId,
        offer: offer
      }));
    } catch (err) {
      console.error('Create offer error:', err);
    }
  };

  // Handle incoming offer
  const handleOffer = async (offer: RTCSessionDescriptionInit, fromUserId: string) => {
    if (!peerConnectionRef.current || !websocketRef.current) return;
    
    try {
      await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await peerConnectionRef.current.createAnswer();
      await peerConnectionRef.current.setLocalDescription(answer);
      
      websocketRef.current.send(JSON.stringify({
        type: 'answer',
        target: fromUserId,
        answer: answer
      }));
    } catch (err) {
      console.error('Handle offer error:', err);
    }
  };

  // Handle incoming answer
  const handleAnswer = async (answer: RTCSessionDescriptionInit) => {
    if (!peerConnectionRef.current) return;
    
    try {
      await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer));
    } catch (err) {
      console.error('Handle answer error:', err);
    }
  };

  // Handle incoming ICE candidate
  const handleIceCandidate = async (candidate: RTCIceCandidateInit) => {
    if (!peerConnectionRef.current) return;
    
    try {
      await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (err) {
      console.error('Handle ICE candidate error:', err);
    }
  };

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsMuted((prev) => !prev);
    }
  }, []);

  // Toggle video
  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsVideoOff((prev) => !prev);
    }
  }, []);

  // Start screen sharing
  const startScreenShare = useCallback(async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always' } as MediaTrackConstraints,
        audio: true,
      });

      screenStreamRef.current = screenStream;

      // Replace video track in peer connection
      if (peerConnectionRef.current && localStreamRef.current) {
        const videoTrack = screenStream.getVideoTracks()[0];
        const sender = peerConnectionRef.current
          .getSenders()
          .find((s) => s.track?.kind === 'video');

        if (sender) {
          sender.replaceTrack(videoTrack);
        }

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }
      }

      screenStream.getVideoTracks()[0].onended = () => {
        stopScreenShare();
      };

      setIsScreenSharing(true);
    } catch (err) {
      console.error('Screen share error:', err);
    }
  }, []);

  // Stop screen sharing
  const stopScreenShare = useCallback(() => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = null;
    }

    if (localStreamRef.current && peerConnectionRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      const sender = peerConnectionRef.current
        .getSenders()
        .find((s) => s.track?.kind === 'video');

      if (sender && videoTrack) {
        sender.replaceTrack(videoTrack);
      }

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
      }
    }

    setIsScreenSharing(false);
  }, []);

  // Toggle screen share
  const toggleScreenShare = useCallback(() => {
    if (isScreenSharing) {
      stopScreenShare();
    } else {
      startScreenShare();
    }
  }, [isScreenSharing, startScreenShare, stopScreenShare]);

  // Toggle fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  // End call
  const handleEndCall = useCallback(() => {
    // Stop call timer
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }

    // Notify remote user
    if (websocketRef.current && websocketRef.current.readyState === WebSocket.OPEN) {
      websocketRef.current.send(JSON.stringify({
        type: 'call_ended',
        target: remoteUserId
      }));
      websocketRef.current.close();
    }

    // Stop all streams
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = null;
    }

    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    // Exit fullscreen if active
    if (document.fullscreenElement) {
      document.exitFullscreen();
    }

    setCallStatus('ended');
    onClose();
  }, [onClose, remoteUserId]);

  // Initialize on mount
  useEffect(() => {
    if (isOpen) {
      initializeMedia().then((stream) => {
        if (stream) {
          initWebSocket();
        }
      });
    }

    return () => {
      handleEndCall();
    };
  }, [isOpen]);

  // Handle fullscreen change
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  if (!isOpen) return null;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 bg-gray-900 z-50 flex flex-col"
      data-testid="video-call-container"
    >
      {/* Header */}
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
              {callStatus === 'calling' && 'Calling...'}
              {callStatus === 'ringing' && 'Ringing...'}
              {callStatus === 'connected' && formatDuration(callDuration)}
              {callStatus === 'ended' && 'Call ended'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleFullscreen}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? (
              <Minimize2 className="w-5 h-5 text-white" />
            ) : (
              <Maximize2 className="w-5 h-5 text-white" />
            )}
          </button>
          <button
            onClick={handleEndCall}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition"
            title="Close"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      {/* Video Container */}
      <div className="flex-1 relative">
        {/* Remote Video (Large) */}
        <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
          {callType === 'video' || isScreenSharing ? (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-contain"
              data-testid="remote-video"
            />
          ) : (
            <div className="text-center">
              {remoteUserPicture ? (
                <img
                  src={remoteUserPicture}
                  alt={remoteUserName}
                  className="w-32 h-32 rounded-full mx-auto mb-4"
                />
              ) : (
                <div className="w-32 h-32 bg-blue-600 rounded-full flex items-center justify-center text-white text-5xl font-semibold mx-auto mb-4">
                  {remoteUserName.charAt(0).toUpperCase()}
                </div>
              )}
              <p className="text-white text-xl">{remoteUserName}</p>
              <p className="text-white/60">
                {callStatus === 'calling' ? 'Calling...' : callStatus === 'connected' ? 'Voice Call' : ''}
              </p>
            </div>
          )}

          {/* Connecting overlay */}
          {isConnecting && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80">
              <div className="text-center">
                <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-white text-lg">
                  {callStatus === 'calling' ? `Calling ${remoteUserName}...` : 'Connecting...'}
                </p>
              </div>
            </div>
          )}

          {/* Error overlay */}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80">
              <div className="text-center max-w-md px-4">
                <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <X className="w-8 h-8 text-white" />
                </div>
                <p className="text-white text-lg mb-2">Connection Error</p>
                <p className="text-white/60 mb-4">{error}</p>
                <button
                  onClick={handleEndCall}
                  className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Local Video (Small) */}
        {(callType === 'video' || isScreenSharing) && (
          <div className="absolute bottom-24 right-4 w-48 h-36 bg-gray-700 rounded-xl overflow-hidden shadow-lg">
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className={`w-full h-full object-cover ${isVideoOff && !isScreenSharing ? 'hidden' : ''}`}
              data-testid="local-video"
            />
            {isVideoOff && !isScreenSharing && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                  You
                </div>
              </div>
            )}
            {isScreenSharing && (
              <div className="absolute top-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                Screen Sharing
              </div>
            )}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
        <div className="flex items-center justify-center gap-4">
          {/* Mute Button */}
          <button
            onClick={toggleMute}
            className={`p-4 rounded-full transition ${
              isMuted ? 'bg-red-500 hover:bg-red-600' : 'bg-white/10 hover:bg-white/20'
            }`}
            title={isMuted ? 'Unmute' : 'Mute'}
            data-testid="mute-button"
          >
            {isMuted ? (
              <MicOff className="w-6 h-6 text-white" />
            ) : (
              <Mic className="w-6 h-6 text-white" />
            )}
          </button>

          {/* Video Toggle */}
          {callType === 'video' && (
            <button
              onClick={toggleVideo}
              className={`p-4 rounded-full transition ${
                isVideoOff ? 'bg-red-500 hover:bg-red-600' : 'bg-white/10 hover:bg-white/20'
              }`}
              title={isVideoOff ? 'Turn on camera' : 'Turn off camera'}
              data-testid="video-toggle-button"
            >
              {isVideoOff ? (
                <VideoOff className="w-6 h-6 text-white" />
              ) : (
                <Video className="w-6 h-6 text-white" />
              )}
            </button>
          )}

          {/* Screen Share Button */}
          <button
            onClick={toggleScreenShare}
            className={`p-4 rounded-full transition ${
              isScreenSharing ? 'bg-green-500 hover:bg-green-600' : 'bg-white/10 hover:bg-white/20'
            }`}
            title={isScreenSharing ? 'Stop sharing' : 'Share screen'}
            data-testid="screen-share-button"
          >
            {isScreenSharing ? (
              <MonitorOff className="w-6 h-6 text-white" />
            ) : (
              <Monitor className="w-6 h-6 text-white" />
            )}
          </button>

          {/* End Call Button */}
          <button
            onClick={handleEndCall}
            className="p-4 bg-red-600 hover:bg-red-700 rounded-full transition"
            title="End call"
            data-testid="end-call-button"
          >
            <PhoneOff className="w-6 h-6 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}
