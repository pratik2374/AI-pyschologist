"use client";

import { useState } from 'react';
import { X, HeartHandshake } from 'lucide-react';

export default function SoftCrisisBanner() {
  const [isVisible, setIsVisible] = useState(true); // Default false in real usage

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-full max-w-2xl px-6 z-30 animate-in slide-in-from-bottom-6 duration-700">
      <div className="bg-[#FCF5F5]/90 backdrop-blur-xl rounded-2xl p-4 shadow-[0_10px_40px_rgb(0,0,0,0.05)] border border-[#E5C9C9]/60 flex items-start gap-4">
        <HeartHandshake className="w-5 h-5 text-[#A05050] shrink-0 mt-0.5" />
        <div className="flex-1 space-y-1">
          <p className="font-serif text-sm text-[#3A423C]">
            If things feel too heavy right now, there are people available to listen instantly.
          </p>
          <div className="text-xs text-[#8A6B6B] flex gap-4 font-sans">
            <span>iCall: 9152987821</span>
            <span>Vandrevala: 9999 666 555</span>
          </div>
        </div>
        <button 
          onClick={() => setIsVisible(false)}
          className="text-[#8A6B6B] hover:text-[#A05050] transition-colors p-1"
          aria-label="Dismiss message"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
