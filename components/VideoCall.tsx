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

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasCreatedOffer = useRef(false);
  const pendingCandidates = useRef<RTCIceCandidateInit[]>([]);

  // ICE servers for STUN - using multiple reliable servers
  const iceServers: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun4.l.google.com:19302' },
    ],
    iceCandidatePoolSize: 10,
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Send signal via REST API
  const sendSignal = async (type: string, data?: any) => {
    try {
      console.log('Sending signal:', type, 'to:', remoteUserId);
      setDebugInfo(`Sending ${type}...`);
      const res = await fetch('/api/calls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          type,
          target: remoteUserId,
          data
        })
      });
      const result = await res.json();
      console.log('Signal sent:', type, result);
      return result.success;
    } catch (err) {
      console.error('Send signal error:', err);
      return false;
    }
  };

  // Handle incoming offer
  const handleOffer = async (offer: RTCSessionDescriptionInit, fromUserId: string) => {
    console.log('Handling offer from:', fromUserId);
    setDebugInfo('Received offer, creating answer...');
    
    try {
      const pc = peerConnectionRef.current;
      if (!pc) {
        console.error('No peer connection');
        return;
      }

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      
      // Add any pending ICE candidates
      for (const candidate of pendingCandidates.current) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
      pendingCandidates.current = [];
      
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      await sendSignal('answer', answer);
      setDebugInfo('Answer sent, waiting for connection...');
    } catch (err) {
      console.error('Handle offer error:', err);
      setError('Failed to handle offer');
    }
  };

  // Handle incoming answer
  const handleAnswer = async (answer: RTCSessionDescriptionInit) => {
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
      }
    } catch (err) {
      console.error('Handle answer error:', err);
      setError('Failed to handle answer');
    }
  };

  // Handle incoming ICE candidate
  const handleIceCandidate = async (candidate: RTCIceCandidateInit) => {
    console.log('Handling ICE candidate');
    
    try {
      const pc = peerConnectionRef.current;
      if (!pc) {
        console.error('No peer connection');
        return;
      }

      if (pc.remoteDescription) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } else {
        // Queue the candidate if we don't have remote description yet
        pendingCandidates.current.push(candidate);
      }
    } catch (err) {
      console.error('Handle ICE candidate error:', err);
    }
  };

  // Create peer connection
  const createPeerConnection = () => {
    if (peerConnectionRef.current) {
      return peerConnectionRef.current;
    }
    
    console.log('Creating peer connection');
    setDebugInfo('Creating peer connection...');
    
    const pc = new RTCPeerConnection(iceServers);
    
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('ICE candidate generated');
        sendSignal('ice_candidate', event.candidate.toJSON());
      }
    };
    
    pc.oniceconnectionstatechange = () => {
      console.log('ICE connection state:', pc.iceConnectionState);
      setDebugInfo(`ICE: ${pc.iceConnectionState}`);
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
      } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        setDebugInfo(`Call ${pc.connectionState}`);
        cleanup(false);
      }
    };
    
    peerConnectionRef.current = pc;
    return pc;
  };

  // Initialize local media and create offer (for caller) or wait for offer (for receiver)
  const initializeCall = async () => {
    try {
      setDebugInfo('Requesting media access...');
      
      const constraints = {
        audio: true,
        video: callType === 'video' ? { width: 1280, height: 720 } : false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      setDebugInfo('Media acquired, setting up connection...');

      // Create peer connection and add tracks
      const pc = createPeerConnection();
      stream.getTracks().forEach((track) => {
        console.log('Adding track:', track.kind);
        pc.addTrack(track, stream);
      });

      // If caller, create and send offer
      if (!isReceiver && !hasCreatedOffer.current) {
        hasCreatedOffer.current = true;
        setDebugInfo('Creating offer...');
        setCallStatus('calling');
        
        // Send call notification to the other user
        await sendSignal('incoming_call', {
          call_type: callType,
          caller_name: currentUserName
        });
        
        // Small delay to ensure incoming_call is processed first
        await new Promise(resolve => setTimeout(resolve, 200));
        
        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: callType === 'video',
        });
        await pc.setLocalDescription(offer);
        
        await sendSignal('offer', offer);
        setDebugInfo('Offer sent, waiting for answer...');
      } else if (isReceiver) {
        // If receiver, notify that we accepted and start polling for offer
        setDebugInfo('Accepting call...');
        setCallStatus('ringing');
        await sendSignal('call_accepted', {});
        setDebugInfo('Waiting for offer from caller...');
      }

      return stream;
    } catch (err: any) {
      console.error('Initialize call error:', err);
      setError(err.message || 'Failed to access camera/microphone');
      setIsConnecting(false);
      setDebugInfo(`Error: ${err.message}`);
      return null;
    }
  };

  // Poll for incoming signals
  const pollSignals = async () => {
    try {
      const res = await fetch('/api/calls', {
        credentials: 'include'
      });
      const data = await res.json();
      
      if (data.success && data.signals && data.signals.length > 0) {
        console.log('Received signals:', data.signals.length);
        for (const signal of data.signals) {
          console.log('Processing signal:', signal.type);
          
          switch (signal.type) {
            case 'offer':
              await handleOffer(signal.data, signal.from);
              break;
            case 'answer':
              await handleAnswer(signal.data);
              break;
            case 'ice_candidate':
              await handleIceCandidate(signal.data);
              break;
            case 'call_accepted':
              // Receiver accepted the call - caller should re-send offer
              setCallStatus('connected');
              setDebugInfo('Call accepted, sending offer...');
              // Re-send the offer since the receiver just accepted
              if (!isReceiver && peerConnectionRef.current) {
                const pc = peerConnectionRef.current;
                if (pc.localDescription) {
                  await sendSignal('offer', pc.localDescription);
                  setDebugInfo('Offer re-sent to receiver');
                }
              }
              break;
            case 'call_rejected':
              setError('Call was declined');
              setCallStatus('ended');
              break;
            case 'call_ended':
              cleanup(false);
              break;
          }
        }
      }
    } catch (err) {
      console.error('Poll signals error:', err);
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
      // Stop screen sharing
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
      // Start screen sharing
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
    
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    if (notifyRemote) {
      fetch(`/api/calls?target=${remoteUserId}`, {
        method: 'DELETE',
        credentials: 'include'
      }).catch(() => {});
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
    hasCreatedOffer.current = false;
    pendingCandidates.current = [];
    onClose();
  };

  // Initialize on mount
  useEffect(() => {
    if (isOpen) {
      initializeCall();
      
      // Start polling for signals (faster polling for better responsiveness)
      pollingIntervalRef.current = setInterval(pollSignals, 500);
    }

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
      }
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
          {/* Debug info */}
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
                  Note: Both users must be in a call for connection to establish
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
