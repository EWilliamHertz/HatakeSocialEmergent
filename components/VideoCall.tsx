'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff, Monitor, MonitorOff, X, Maximize2, Minimize2 } from 'lucide-react';

interface VideoCallProps {
  isOpen: boolean;
  onClose: () => void;
  callType: 'audio' | 'video';
  remoteUserName: string;
  remoteUserPicture?: string;
}

export default function VideoCall({ isOpen, onClose, callType, remoteUserName, remoteUserPicture }: VideoCallProps) {
  const [isConnecting, setIsConnecting] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(callType === 'audio');
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // ICE servers for STUN/TURN (using public Google STUN servers)
  const iceServers = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
    ],
  };

  // Format call duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Initialize local media stream
  const initializeMedia = useCallback(async () => {
    try {
      setIsConnecting(true);
      setError(null);

      const constraints = {
        audio: true,
        video: callType === 'video' ? { width: 1280, height: 720 } : false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Create peer connection
      const pc = new RTCPeerConnection(iceServers);
      peerConnectionRef.current = pc;

      // Add local tracks to peer connection
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      // Handle incoming remote stream
      pc.ontrack = (event) => {
        if (remoteVideoRef.current && event.streams[0]) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };

      // ICE candidate handling
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          // In a real app, send this to the signaling server
          console.log('ICE candidate:', event.candidate);
        }
      };

      // Connection state handling
      pc.onconnectionstatechange = () => {
        console.log('Connection state:', pc.connectionState);
        if (pc.connectionState === 'connected') {
          setIsConnected(true);
          setIsConnecting(false);
          // Start call timer
          callTimerRef.current = setInterval(() => {
            setCallDuration((prev) => prev + 1);
          }, 1000);
        } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
          handleEndCall();
        }
      };

      // For demo purposes, simulate connection after 2 seconds
      // In a real app, you'd exchange SDP offers/answers via a signaling server
      setTimeout(() => {
        setIsConnected(true);
        setIsConnecting(false);
        callTimerRef.current = setInterval(() => {
          setCallDuration((prev) => prev + 1);
        }, 1000);
      }, 2000);

    } catch (err: any) {
      console.error('Media initialization error:', err);
      setError(err.message || 'Failed to access camera/microphone');
      setIsConnecting(false);
    }
  }, [callType]);

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

        // Show screen share in local video
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }
      }

      // Handle screen share stop
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

    // Restore camera video
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

    onClose();
  }, [onClose]);

  // Initialize on mount
  useEffect(() => {
    if (isOpen) {
      initializeMedia();
    }

    return () => {
      handleEndCall();
    };
  }, [isOpen, initializeMedia]);

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
              {isConnecting ? 'Connecting...' : isConnected ? formatDuration(callDuration) : 'Disconnected'}
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
              <p className="text-white/60">{isConnecting ? 'Connecting...' : 'Voice Call'}</p>
            </div>
          )}

          {/* Connecting overlay */}
          {isConnecting && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80">
              <div className="text-center">
                <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-white text-lg">Connecting to {remoteUserName}...</p>
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

          {/* Video Toggle (only for video calls) */}
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
