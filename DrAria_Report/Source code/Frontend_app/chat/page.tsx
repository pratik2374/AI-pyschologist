"use client";

import { useEffect, useRef } from 'react';
import { Leaf } from 'lucide-react';
import { useChat } from '@/hooks/useChat';
import MessageBubble from '@/components/ui/MessageBubble';
import TypingIndicator from '@/components/ui/TypingIndicator';


export default function TherapyRoom() {
  const { messages, input, setInput, isTyping, sendMessage, fetchHistory } = useChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch history on mount
  useEffect(() => {
    fetchHistory();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    sendMessage(); // Defaults to Mode A for standard usage. Can pull mode from context if needed.
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex flex-col h-screen relative z-10">
      {/* Subtle Header */}
      <div className="px-6 py-8 flex justify-between items-center sticky top-0 bg-gradient-to-b from-[#F7F5F0] via-[#F7F5F0]/80 to-transparent z-20">
        <button 
          onClick={() => window.history.back()}
          className="text-xs uppercase tracking-[0.2em] text-[#8A9386] hover:text-[#5C7060] transition-colors"
          aria-label="Go Back"
        >
          ← Back
        </button>
        <span className="text-xs uppercase tracking-[0.3em] text-[#8A9386] flex items-center gap-3">
          <Leaf className="w-3 h-3 opacity-50" /> Aria is present
        </span>
        <div className="w-12"></div> {/* Spacer to keep header centered */}
      </div>

      {/* Chat Area - Manuscript format */}
      <div className="flex-1 w-full overflow-y-auto custom-scrollbar">
        <div className="w-full max-w-3xl mx-auto px-6 space-y-16 pb-48 pt-24">
        {messages.length === 0 && !isTyping && (
          <div className="flex items-center justify-center h-full">
            <span className="text-sm text-[#A39E93] italic font-serif">It's quiet in here...</span>
          </div>
        )}
        
        {messages.map((m) => (
          <MessageBubble key={m.id} role={m.role} content={m.content} />
        ))}

        {isTyping && <TypingIndicator />}
        
        <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area - Journal entry style */}
      <div className="fixed bottom-8 md:bottom-12 left-0 w-full px-4 md:px-6 flex justify-center z-20 pointer-events-none">
        <div className="w-full max-w-3xl bg-white/40 backdrop-blur-2xl rounded-[2rem] p-3 shadow-[0_10px_40px_rgb(0,0,0,0.03)] border border-white/60 pointer-events-auto transition-all focus-within:bg-white/80 focus-within:shadow-[0_10px_40px_rgb(0,0,0,0.06)]">
          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <textarea 
              rows={1}
              aria-label="Message Aria"
              placeholder="Take your time..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isTyping}
              className="w-full bg-transparent resize-none py-1 px-2 focus:outline-none text-[#2C332E] placeholder-[#8A9386] text-xl font-handwritten max-h-32 leading-relaxed"
            />
            <button 
              type="submit"
              disabled={isTyping || !input.trim()}
              aria-label="Share message"
              className="text-[#475A4A] hover:bg-white/50 focus-visible:ring-2 focus-visible:ring-[#475A4A]/50 focus:outline-none rounded-full font-handwritten text-xl px-4 py-1 transition-all flex items-center shrink-0 disabled:opacity-50"
            >
              Share
            </button>
          </form>
        </div>
      </div>

    </div>
  );
}
