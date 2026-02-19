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
  isReceiver?: boolean;
}

export default function VideoCall({ 
  isOpen, 
  onClose, 
  callType, 
  remoteUserId,
  remoteUserName, 
  remoteUserPicture,
  currentUserId,
  currentUserName,
  isReceiver = false
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
  const [debugInfo, setDebugInfo] = useState<string>('Initializing...');
  const [wsConnected, setWsConnected] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasCreatedOffer = useRef(false);
  const pendingCandidates = useRef<RTCIceCandidateInit[]>([]);
  const hasReceivedOffer = useRef(false);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ICE servers with STUN and free TURN for better NAT traversal
  const iceServers: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun4.l.google.com:19302' },
      {
        urls: 'turn:a.relay.metered.ca:80',
        username: 'e8f8ca00c84f5e6bc43e5c07',
        credential: 'MwJfqJMqZZzMRlbX',
      },
      {
        urls: 'turn:a.relay.metered.ca:443',
        username: 'e8f8ca00c84f5e6bc43e5c07',
        credential: 'MwJfqJMqZZzMRlbX',
      },
      {
        urls: 'turn:a.relay.metered.ca:443?transport=tcp',
        username: 'e8f8ca00c84f5e6bc43e5c07',
        credential: 'MwJfqJMqZZzMRlbX',
      },
    ],
    iceCandidatePoolSize: 10,
    iceTransportPolicy: 'all',
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Send message via WebSocket
  const sendWsMessage = useCallback((message: object) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      console.log('WS Send:', message);
      wsRef.current.send(JSON.stringify(message));
      return true;
    } else {
      console.warn('WebSocket not connected, cannot send:', message);
      return false;
    }
  }, []);

  // Handle incoming offer
  const handleOffer = useCallback(async (offer: RTCSessionDescriptionInit, fromUserId: string) => {
    console.log('Handling offer from:', fromUserId);
    setDebugInfo('Received offer, creating answer...');
    hasReceivedOffer.current = true;
    
    try {
      const pc = peerConnectionRef.current;
      if (!pc) {
        console.error('No peer connection');
        return;
      }

      // Only set remote description if we're in a valid state
      if (pc.signalingState !== 'stable' && pc.signalingState !== 'have-remote-offer') {
        console.log('Skipping offer, signaling state:', pc.signalingState);
        return;
      }

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      
      // Add any pending ICE candidates
      for (const candidate of pendingCandidates.current) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.warn('Failed to add ICE candidate:', e);
        }
      }
      pendingCandidates.current = [];
      
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      // Send answer via WebSocket
      sendWsMessage({
        type: 'answer',
        target: fromUserId,
        answer: answer
      });
      setDebugInfo('Answer sent, waiting for connection...');
    } catch (err: any) {
      console.error('Handle offer error:', err);
      setError(`Failed to handle offer: ${err.message}`);
    }
  }, [sendWsMessage]);

  // Handle incoming answer
  const handleAnswer = useCallback(async (answer: RTCSessionDescriptionInit) => {
    console.log('Handling answer');
    setDebugInfo('Received answer, establishing connection...');
    
    try {
      const pc = peerConnectionRef.current;
      if (!pc) {
        console.error('No peer connection');
        return;
      }

      if (pc.signalingState === 'have-local-offer') {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
        
        // Add any pending ICE candidates
        for (const candidate of pendingCandidates.current) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        }
        pendingCandidates.current = [];
      } else {
        console.warn('Unexpected signaling state for answer:', pc.signalingState);
      }
    } catch (err: any) {
      console.error('Handle answer error:', err);
      setError('Failed to handle answer: ' + err.message);
    }
  }, []);

  // Handle incoming ICE candidate
  const handleIceCandidate = useCallback(async (candidate: RTCIceCandidateInit) => {
    try {
      const pc = peerConnectionRef.current;
      if (!pc) {
        console.log('Queuing ICE candidate (no peer connection yet)');
        pendingCandidates.current.push(candidate);
        return;
      }

      if (pc.remoteDescription) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.warn('Failed to add ICE candidate:', e);
        }
      } else {
        console.log('Queuing ICE candidate (no remote description)');
        pendingCandidates.current.push(candidate);
      }
    } catch (err) {
      console.error('Handle ICE candidate error:', err);
    }
  }, []);

  // Create peer connection
  const createPeerConnection = useCallback(() => {
    if (peerConnectionRef.current) {
      return peerConnectionRef.current;
    }
    
    console.log('Creating peer connection');
    setDebugInfo('Creating peer connection...');
    
    const pc = new RTCPeerConnection(iceServers);
    peerConnectionRef.current = pc;
    
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('ICE candidate generated');
        sendWsMessage({
          type: 'ice_candidate',
          target: remoteUserId,
          candidate: event.candidate.toJSON()
        });
      }
    };
    
    pc.ontrack = (event) => {
      console.log('Received remote track:', event.track.kind);
      setDebugInfo(`Received ${event.track.kind} track`);
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };
    
    pc.onconnectionstatechange = () => {
      console.log('Connection state:', pc.connectionState);
      setDebugInfo(`Connection: ${pc.connectionState}`);
      
      if (pc.connectionState === 'connected') {
        setIsConnected(true);
        setIsConnecting(false);
        setCallStatus('connected');
        setDebugInfo('Connected!');
        if (!callTimerRef.current) {
          callTimerRef.current = setInterval(() => {
            setCallDuration((prev) => prev + 1);
          }, 1000);
        }
      } else if (pc.connectionState === 'failed') {
        setDebugInfo('Call failed - connection error');
        cleanup(false);
      } else if (pc.connectionState === 'disconnected') {
        setDebugInfo('Connection interrupted, attempting to reconnect...');
      }
    };
    
    pc.oniceconnectionstatechange = () => {
      console.log('ICE connection state:', pc.iceConnectionState);
      setDebugInfo(`ICE: ${pc.iceConnectionState}`);
      
      if (pc.iceConnectionState === 'failed') {
        console.log('Attempting ICE restart...');
        pc.restartIce();
      }
    };
    
    return pc;
  }, [remoteUserId, sendWsMessage]);

  // Connect to WebSocket signaling server
  const connectWebSocket = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      return;
    }

    // Use the backend WebSocket endpoint
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = window.location.host;
    const wsUrl = `${wsProtocol}//${wsHost}/ws/signaling/${currentUserId}`;
    
    console.log('Connecting to WebSocket:', wsUrl);
    setDebugInfo('Connecting to signaling server...');
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;
    
    ws.onopen = () => {
      console.log('WebSocket connected');
      setWsConnected(true);
      setDebugInfo('Signaling connected');
      
      // Join a room for this call
      const roomId = [currentUserId, remoteUserId].sort().join('-');
      sendWsMessage({ type: 'join_room', room_id: roomId });
    };
    
    ws.onmessage = async (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log('WS Received:', message.type, message);
        
        switch (message.type) {
          case 'room_joined':
            console.log('Joined room:', message.room_id, 'Users:', message.users);
            setDebugInfo(`In room with ${message.users?.length || 0} users`);
            // If there are other users and we're the caller, create offer
            if (!isReceiver && message.users && message.users.length > 0 && !hasCreatedOffer.current) {
              await createAndSendOffer();
            }
            break;
            
          case 'user_joined':
            console.log('User joined:', message.user_id);
            // If someone joins and we're the caller, send offer
            if (!isReceiver && !hasCreatedOffer.current) {
              await createAndSendOffer();
            }
            break;
            
          case 'offer':
            await handleOffer(message.offer, message.from);
            break;
            
          case 'answer':
            await handleAnswer(message.answer);
            break;
            
          case 'ice_candidate':
            await handleIceCandidate(message.candidate);
            break;
            
          case 'incoming_call':
            // This is handled by the parent component (MessengerWidget)
            console.log('Incoming call from:', message.from);
            break;
            
          case 'call_accepted':
            setCallStatus('connected');
            setDebugInfo('Call accepted, sending offer...');
            if (!isReceiver && peerConnectionRef.current?.localDescription) {
              sendWsMessage({
                type: 'offer',
                target: remoteUserId,
                offer: peerConnectionRef.current.localDescription
              });
            }
            break;
            
          case 'call_rejected':
            setError('Call was declined');
            setCallStatus('ended');
            break;
            
          case 'call_ended':
            cleanup(false);
            break;
            
          case 'user_left':
            console.log('User left:', message.user_id);
            if (message.user_id === remoteUserId) {
              cleanup(false);
            }
            break;
            
          case 'pong':
            // Heartbeat response
            break;
        }
      } catch (err) {
        console.error('WS message parse error:', err);
      }
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setWsConnected(false);
      setDebugInfo('Signaling connection error');
    };
    
    ws.onclose = (event) => {
      console.log('WebSocket closed:', event.code, event.reason);
      setWsConnected(false);
      
      // Attempt to reconnect if call is still active
      if (isOpen && !error) {
        setDebugInfo('Reconnecting to signaling...');
        reconnectTimeoutRef.current = setTimeout(() => {
          connectWebSocket();
        }, 2000);
      }
    };
  }, [currentUserId, remoteUserId, isReceiver, isOpen, error, handleOffer, handleAnswer, handleIceCandidate, sendWsMessage]);

  // Create and send WebRTC offer
  const createAndSendOffer = async () => {
    if (hasCreatedOffer.current) return;
    
    const pc = peerConnectionRef.current;
    if (!pc) {
      console.error('No peer connection for offer');
      return;
    }
    
    try {
      hasCreatedOffer.current = true;
      setDebugInfo('Creating offer...');
      
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: callType === 'video',
      });
      await pc.setLocalDescription(offer);
      
      sendWsMessage({
        type: 'offer',
        target: remoteUserId,
        offer: offer
      });
      setDebugInfo('Offer sent, waiting for answer...');
    } catch (err: any) {
      console.error('Create offer error:', err);
      hasCreatedOffer.current = false;
      setError('Failed to create offer: ' + err.message);
    }
  };

  // Initialize local media
  const initializeMedia = async () => {
    try {
      setDebugInfo('Requesting media access...');
      
      let stream: MediaStream | null = null;
      
      try {
        if (callType === 'video') {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: { width: 1280, height: 720 }
          });
        } else {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: false
          });
        }
      } catch (mediaErr: any) {
        console.warn('Full media failed, trying audio only:', mediaErr.message);
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: false
          });
          setDebugInfo('Camera unavailable, using audio only');
        } catch (audioErr: any) {
          console.error('Audio also failed:', audioErr.message);
          throw new Error('Cannot access microphone. Please check permissions.');
        }
      }
      
      if (stream) {
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        
        // Create peer connection and add tracks
        const pc = createPeerConnection();
        stream.getTracks().forEach((track) => {
          console.log('Adding track:', track.kind);
          pc.addTrack(track, stream!);
        });
      }
      
      setDebugInfo('Media acquired');
      return stream;
    } catch (err: any) {
      console.error('Initialize media error:', err);
      setError(err.message || 'Failed to access camera/microphone');
      setIsConnecting(false);
      setDebugInfo(`Error: ${err.message}`);
      return null;
    }
  };

  // Initialize call
  const initializeCall = async () => {
    try {
      // First, get media and create peer connection
      const stream = await initializeMedia();
      if (!stream) return;
      
      // Then connect to WebSocket signaling server
      connectWebSocket();
      
      // If caller, notify remote user via database (for the IncomingCall notification)
      if (!isReceiver) {
        setCallStatus('calling');
        
        // Send incoming_call signal via database so MessengerWidget can show IncomingCall modal
        try {
          await fetch('/api/calls', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              type: 'incoming_call',
              target: remoteUserId,
              data: {
                call_type: callType,
                caller_name: currentUserName
              }
            })
          });
          console.log('Sent incoming_call notification to database');
        } catch (err) {
          console.error('Failed to send incoming_call notification:', err);
        }
        
        // The WebRTC offer will be sent when WebSocket connects and joins room
      } else {
        setCallStatus('ringing');
        // Send call_accepted when receiver joins
        setTimeout(() => {
          sendWsMessage({
            type: 'call_accepted',
            target: remoteUserId
          });
        }, 500);
      }
    } catch (err: any) {
      console.error('Initialize call error:', err);
      setError(err.message);
    }
  };

  // Toggle mute
  const toggleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsMuted((prev) => !prev);
    }
  };

  // Toggle video
  const toggleVideo = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsVideoOff((prev) => !prev);
    }
  };

  // Screen sharing
  const toggleScreenShare = async () => {
    if (isScreenSharing) {
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
    } else {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: { cursor: 'always' } as MediaTrackConstraints,
          audio: true,
        });

        screenStreamRef.current = screenStream;

        if (peerConnectionRef.current) {
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
          toggleScreenShare();
        };

        setIsScreenSharing(true);
      } catch (err) {
        console.error('Screen share error:', err);
      }
    }
  };

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Cleanup function
  const cleanup = (notifyRemote: boolean = true) => {
    console.log('Cleaning up call');
    
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Notify via WebSocket before closing
    if (notifyRemote && wsRef.current?.readyState === WebSocket.OPEN) {
      sendWsMessage({
        type: 'call_ended',
        target: remoteUserId
      });
      sendWsMessage({ type: 'leave_room' });
    }

    // Close WebSocket
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = null;
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    if (document.fullscreenElement) {
      document.exitFullscreen();
    }

    setCallStatus('ended');
    setWsConnected(false);
    hasCreatedOffer.current = false;
    hasReceivedOffer.current = false;
    pendingCandidates.current = [];
    onClose();
  };

  // Initialize on mount
  useEffect(() => {
    if (isOpen) {
      initializeCall();
    }

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
      }
    };
  }, [isOpen]);

  // Heartbeat to keep WebSocket alive
  useEffect(() => {
    if (!wsConnected) return;
    
    const heartbeat = setInterval(() => {
      sendWsMessage({ type: 'ping' });
    }, 30000);
    
    return () => clearInterval(heartbeat);
  }, [wsConnected, sendWsMessage]);

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
          {/* Connection status */}
          <span className={`w-2 h-2 rounded-full mr-2 ${wsConnected ? 'bg-green-500' : 'bg-red-500'}`}></span>
          <span className="text-white/50 text-xs mr-2">{debugInfo}</span>
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
            onClick={() => cleanup(true)}
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
                <p className="text-white/60 text-sm mt-2">{debugInfo}</p>
                <p className="text-white/40 text-xs mt-4">
                  Both users must be in a call for connection to establish
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
                  onClick={() => cleanup(true)}
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

          <button
            onClick={() => cleanup(true)}
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
