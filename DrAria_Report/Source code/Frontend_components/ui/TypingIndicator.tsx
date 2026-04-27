import { Feather } from 'lucide-react';

export default function TypingIndicator() {
  return (
    <div className="flex flex-col items-start w-full pr-6 md:pr-16 animate-in fade-in duration-500">
      <div 
        className="flex items-center gap-3 text-[#A39E93] font-handwritten text-lg animate-pulse-soft" 
        role="status" 
        aria-live="polite"
      >
        <Feather className="w-4 h-4" /> Aria is listening...
      </div>
    </div>
  );
}
