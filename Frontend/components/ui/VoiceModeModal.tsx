"use client";

import React, { useState, useEffect, useCallback } from 'react';
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useVoiceAssistant,
  useLocalParticipant,
} from '@livekit/components-react';
import { Mic, MicOff, PhoneOff, Subtitles, X } from 'lucide-react';
import VoiceOrb from './VoiceOrb';

interface VoiceModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSessionEnded?: () => void;
}

function VoiceRoomContent({ onClose }: { onClose: () => void }) {
  const { state: agentState, agentTranscriptions } = useVoiceAssistant();
  const { isMicrophoneEnabled, localParticipant } = useLocalParticipant();
  const [showCaptions, setShowCaptions] = useState(true);
  const [sessionSeconds, setSessionSeconds] = useState(0);

  // Timer for session duration
  useEffect(() => {
    const timer = setInterval(() => {
      setSessionSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const toggleMic = useCallback(async () => {
    if (localParticipant) {
      await localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled);
    }
  }, [localParticipant, isMicrophoneEnabled]);

  // Latest transcription text
  const latestTranscript = agentTranscriptions?.length
    ? agentTranscriptions[agentTranscriptions.length - 1]?.text
    : '';

  return (
    <div className="flex flex-col h-full justify-between items-center px-6 py-8 relative z-20">
      {/* Top Bar */}
      <div className="w-full max-w-xl flex justify-between items-center">
        <div className="flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-[#5C7060] animate-pulse" />
          <span className="text-xs uppercase tracking-[0.25em] text-[#8A9386] font-mono">
            Live Session • {formatTime(sessionSeconds)}
          </span>
        </div>
        <button
          onClick={onClose}
          aria-label="Exit Voice Mode"
          className="p-2 rounded-full hover:bg-[#8A9386]/10 text-[#8A9386] hover:text-[#475A4A] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Center - Pulsing Voice Orb */}
      <div className="my-auto flex flex-col items-center justify-center">
        <VoiceOrb />

        {/* Live Captions / Transcript preview */}
        {showCaptions && (
          <div className="mt-10 min-h-[4rem] max-w-md text-center px-4 transition-all">
            {latestTranscript ? (
              <p className="text-lg md:text-xl font-handwritten text-[#3A423C] leading-relaxed animate-in fade-in duration-300">
                &ldquo;{latestTranscript}&rdquo;
              </p>
            ) : (
              <p className="text-xs tracking-wider uppercase font-mono text-[#A39E93]/70 italic">
                Speak naturally. Dr. Aria is listening to your thoughts.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Bottom Controls */}
      <div className="w-full max-w-md flex items-center justify-center gap-6 pb-4">
        {/* Toggle Captions */}
        <button
          onClick={() => setShowCaptions((prev) => !prev)}
          className={`p-3.5 rounded-full transition-all border ${
            showCaptions
              ? 'bg-white/70 border-[#8A9386]/40 text-[#475A4A] shadow-sm'
              : 'bg-white/30 border-transparent text-[#8A9386] hover:bg-white/50'
          }`}
          title={showCaptions ? 'Hide captions' : 'Show captions'}
          aria-label="Toggle captions"
        >
          <Subtitles className="w-5 h-5" />
        </button>

        {/* Mic Toggle (Primary) */}
        <button
          onClick={toggleMic}
          className={`p-5 rounded-full transition-all transform hover:scale-105 shadow-md ${
            isMicrophoneEnabled
              ? 'bg-[#475A4A] text-white hover:bg-[#3B4B3D]'
              : 'bg-red-500/90 text-white hover:bg-red-600'
          }`}
          title={isMicrophoneEnabled ? 'Mute Microphone' : 'Unmute Microphone'}
          aria-label="Toggle microphone"
        >
          {isMicrophoneEnabled ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
        </button>

        {/* End Call / Leave Session */}
        <button
          onClick={onClose}
          className="p-3.5 rounded-full bg-red-100 hover:bg-red-200 text-red-700 transition-all border border-red-200"
          title="End Voice Session"
          aria-label="End session"
        >
          <PhoneOff className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

export default function VoiceModeModal({ isOpen, onClose, onSessionEnded }: VoiceModeModalProps) {
  const [token, setToken] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

  // Fetch session token when modal opens
  useEffect(() => {
    if (!isOpen) {
      setToken(null);
      setError(null);
      return;
    }

    let isMounted = true;
    const fetchToken = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${apiUrl}/voice/token`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.message || 'Could not initiate voice session');
        }

        const data = await res.json();
        if (isMounted) {
          setToken(data.token);
          setServerUrl(data.url);
        }
      } catch (err: any) {
        if (isMounted) {
          console.error('[VoiceMode] Failed to get voice token:', err);
          setError(err.message || 'Unable to connect to Dr. Aria voice service');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchToken();

    return () => {
      isMounted = false;
    };
  }, [isOpen, apiUrl]);

  const handleClose = () => {
    onClose();
    if (onSessionEnded) onSessionEnded();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#F7F5F0]/95 backdrop-blur-2xl animate-in fade-in duration-300">
      {loading && (
        <div className="flex flex-col items-center justify-center gap-4 text-[#8A9386]">
          <div className="w-12 h-12 rounded-full border-2 border-[#5C7060] border-t-transparent animate-spin" />
          <span className="font-mono text-xs uppercase tracking-[0.25em] text-[#5C7060]">
            Preparing Dr. Aria's voice room...
          </span>
        </div>
      )}

      {error && (
        <div className="max-w-md p-6 bg-white/70 border border-red-200 rounded-2xl text-center shadow-lg">
          <p className="text-red-700 text-sm mb-4 font-sans">{error}</p>
          <div className="flex justify-center gap-3">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-xs uppercase tracking-wider text-[#5C7060] hover:bg-white rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {!loading && !error && token && serverUrl && (
        <LiveKitRoom
          serverUrl={serverUrl}
          token={token}
          connect={true}
          audio={true}
          video={false}
          onDisconnected={handleClose}
          className="w-full h-full"
        >
          <RoomAudioRenderer />
          <VoiceRoomContent onClose={handleClose} />
        </LiveKitRoom>
      )}
    </div>
  );
}
