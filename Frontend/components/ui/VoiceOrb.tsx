"use client";

import React, { useMemo } from 'react';
import { BarVisualizer, useVoiceAssistant } from '@livekit/components-react';

interface VoiceOrbProps {
  className?: string;
}

export default function VoiceOrb({ className = '' }: VoiceOrbProps) {
  const { state: agentState, audioTrack } = useVoiceAssistant();

  // agentState is already a string union: 'listening' | 'speaking' | 'thinking' | 'connecting' | etc.
  const stateString = agentState ?? 'connecting';

  // Compute visual orb styles according to agent's state
  const orbConfig = useMemo(() => {
    switch (stateString) {
      case 'speaking':
        return {
          glow: 'shadow-[0_0_90px_rgba(71,90,74,0.45)] scale-105 border-[#5C7060]',
          gradient: 'from-[#4A5E4E] via-[#5C7060] to-[#8A9386]',
          ringAnim: 'animate-ping',
          label: 'Dr. Aria is speaking...',
          color: 'text-[#475A4A]'
        };
      case 'thinking':
        return {
          glow: 'shadow-[0_0_60px_rgba(138,147,134,0.35)] scale-[0.98] border-[#8A9386]',
          gradient: 'from-[#6E7B6C] via-[#8A9386] to-[#A39E93]',
          ringAnim: 'animate-pulse',
          label: 'Dr. Aria is reflecting...',
          color: 'text-[#8A9386]'
        };
      case 'listening':
        return {
          glow: 'shadow-[0_0_70px_rgba(92,112,96,0.25)] scale-100 border-[#8A9386]/60',
          gradient: 'from-[#5C7060]/90 via-[#8A9386]/80 to-[#D4DDD2]',
          ringAnim: 'animate-pulse',
          label: 'Dr. Aria is listening...',
          color: 'text-[#5C7060]'
        };
      case 'connecting':
      case 'initializing':
      case 'idle':
      case 'pre-connect-buffering':
        return {
          glow: 'shadow-[0_0_40px_rgba(200,190,170,0.3)] scale-95 border-amber-300/40',
          gradient: 'from-[#A39E93] via-[#C5BFA8] to-[#DDD8CD]',
          ringAnim: 'animate-pulse',
          label: 'Joining therapy session...',
          color: 'text-[#A39E93]'
        };
      default:
        return {
          glow: 'shadow-[0_0_40px_rgba(138,147,134,0.2)] scale-95 border-[#8A9386]/30',
          gradient: 'from-[#8A9386]/60 via-[#A39E93]/60 to-[#F0ECE1]',
          ringAnim: 'opacity-10',
          label: 'Session ended',
          color: 'text-[#8A9386]'
        };
    }
  }, [stateString]);

  return (
    <div className={`flex flex-col items-center justify-center relative ${className}`}>
      {/* Outer breathing aura rings */}
      <div className={`absolute w-72 h-72 md:w-96 md:h-96 rounded-full bg-gradient-to-r ${orbConfig.gradient} ${orbConfig.ringAnim} blur-2xl pointer-events-none transition-all duration-1000`} />
      <div className="absolute w-56 h-56 md:w-72 md:h-72 rounded-full border border-[#8A9386]/20 animate-spin pointer-events-none" style={{ animationDuration: '20s' }} />

      {/* Main Orb Center */}
      <div className={`relative w-44 h-44 md:w-56 md:h-56 rounded-full bg-gradient-to-tr ${orbConfig.gradient} ${orbConfig.glow} border transition-all duration-700 flex items-center justify-center backdrop-blur-xl overflow-hidden`}>
        {/* Organic inner waves / light refraction */}
        <div className="absolute inset-2 rounded-full bg-white/10 backdrop-blur-sm" />
        <div className="absolute w-32 h-32 rounded-full bg-gradient-to-b from-white/25 to-transparent blur-md -top-6 -left-6" />

        {/* LiveKit Real-time Audio Bar Visualizer */}
        {audioTrack && (
          <div className="relative z-10 w-28 h-14 flex items-center justify-center opacity-85">
            <BarVisualizer
              state={agentState}
              track={audioTrack}
              barCount={7}
              className="flex items-center gap-1.5 justify-center h-full w-full"
            />
          </div>
        )}
      </div>

      {/* Gentle Status Label */}
      <div className="mt-8 text-center">
        <span className={`text-sm tracking-[0.25em] uppercase font-mono font-medium transition-colors duration-500 ${orbConfig.color}`}>
          {orbConfig.label}
        </span>
      </div>
    </div>
  );
}
