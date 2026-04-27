export default function MessageBubble({ role, content }: { role: 'user' | 'aria', content: string }) {
  if (role === 'user') {
    return (
      <div className="flex flex-col items-end w-full pl-6 md:pl-16 animate-in fade-in slide-in-from-bottom-2 duration-500">
        <div className="text-[#4A5D4E] leading-[1.5] text-xl md:text-[1.6rem] font-handwritten -rotate-1 opacity-90 whitespace-pre-wrap">
          {content}
        </div>
      </div>
    );
  }

  // Aria's Message
  return (
    <div className="flex flex-col items-start w-full pr-6 md:pr-16 relative animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Subtle line indicator for Aria's voice */}
      <div className="absolute left-[-12px] md:left-[-20px] top-2 bottom-2 w-[1px] bg-gradient-to-b from-transparent via-[#8A9386]/30 to-transparent"></div>
      <div className="font-handwritten text-[#3A423C] leading-[1.7] text-xl md:text-[1.5rem] space-y-6 whitespace-pre-wrap">
        {content}
      </div>
    </div>
  );
}
