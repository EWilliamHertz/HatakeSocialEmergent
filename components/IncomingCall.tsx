'use client';

import { Phone, PhoneOff, Video } from 'lucide-react';

interface IncomingCallProps {
  callerName: string;
  callerPicture?: string;
  callType: 'audio' | 'video';
  onAccept: () => void;
  onReject: () => void;
}

export default function IncomingCall({ 
  callerName, 
  callerPicture, 
  callType, 
  onAccept, 
  onReject 
}: IncomingCallProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" data-testid="incoming-call-modal">
      <div className="bg-gray-900 rounded-2xl p-8 w-full max-w-sm mx-4 text-center shadow-2xl animate-pulse-subtle">
        {/* Caller Info */}
        <div className="mb-6">
          {callerPicture ? (
            <img 
              src={callerPicture} 
              alt={callerName} 
              className="w-24 h-24 rounded-full mx-auto mb-4 ring-4 ring-green-500 ring-opacity-50"
            />
          ) : (
            <div className="w-24 h-24 bg-blue-600 rounded-full flex items-center justify-center text-white text-3xl font-semibold mx-auto mb-4 ring-4 ring-green-500 ring-opacity-50">
              {callerName.charAt(0).toUpperCase()}
            </div>
          )}
          <h3 className="text-white text-xl font-semibold">{callerName}</h3>
          <p className="text-gray-400 mt-1 flex items-center justify-center gap-2">
            {callType === 'video' ? (
              <>
                <Video className="w-4 h-4" /> Incoming video call...
              </>
            ) : (
              <>
                <Phone className="w-4 h-4" /> Incoming voice call...
              </>
            )}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center gap-8">
          <button
            onClick={onReject}
            className="p-4 bg-red-600 hover:bg-red-700 rounded-full transition-transform hover:scale-110"
            data-testid="reject-call-btn"
          >
            <PhoneOff className="w-8 h-8 text-white" />
          </button>
          <button
            onClick={onAccept}
            className="p-4 bg-green-600 hover:bg-green-700 rounded-full transition-transform hover:scale-110 animate-bounce"
            data-testid="accept-call-btn"
          >
            <Phone className="w-8 h-8 text-white" />
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes pulse-subtle {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.95; }
        }
        .animate-pulse-subtle {
          animation: pulse-subtle 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
