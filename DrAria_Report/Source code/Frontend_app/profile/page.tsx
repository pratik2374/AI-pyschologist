"use client";

import { Shield, AlertCircle } from 'lucide-react';

export default function ProfileSettings() {
  return (
    <div className="flex flex-col items-center pb-32 relative z-10 text-[#3A423C]">
      <div className="w-full max-w-2xl px-6 py-16">
        <h1 className="text-4xl font-serif mb-16 text-center">You</h1>

        <div className="space-y-16">
          <section className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="space-y-8">
              <div className="flex flex-col group">
                <label className="text-xs uppercase tracking-[0.2em] text-[#8A9386] mb-2">I call you</label>
                <input 
                  type="text" 
                  defaultValue="Elena" 
                  className="bg-transparent border-b border-[#D5D0C5]/40 py-2 focus:outline-none focus:border-[#5C7060] text-2xl font-serif text-[#3A423C] transition-colors w-full" 
                />
              </div>
              <div className="flex flex-col group">
                <label className="text-xs uppercase tracking-[0.2em] text-[#8A9386] mb-2">You are joining from</label>
                <input 
                  type="text" 
                  defaultValue="A quiet room in Seattle" 
                  className="bg-transparent border-b border-[#D5D0C5]/40 py-2 focus:outline-none focus:border-[#5C7060] text-xl font-serif text-[#3A423C] transition-colors w-full" 
                />
              </div>
            </div>
          </section>

          <section className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
            <h2 className="text-xs uppercase tracking-[0.2em] text-[#8A9386] border-b border-[#D5D0C5]/40 pb-3 flex items-center gap-2">
              <Shield className="w-3 h-3" /> Safety Network
            </h2>
            <div className="bg-white/30 backdrop-blur-md p-8 rounded-[2rem] border border-white/50">
              <p className="text-sm text-[#8A9386] mb-6 leading-relaxed">
                A trusted person we can reach out to if you ever feel overwhelmed and need an external anchor.
              </p>
              <div className="space-y-6">
                <input 
                  type="text" 
                  placeholder="Their Name" 
                  className="w-full bg-transparent border-b border-[#D5D0C5]/40 py-2 focus:outline-none focus:border-[#5C7060] font-serif text-lg text-[#3A423C]" 
                />
                <input 
                  type="tel" 
                  placeholder="Their Number" 
                  className="w-full bg-transparent border-b border-[#D5D0C5]/40 py-2 focus:outline-none focus:border-[#5C7060] font-serif text-lg text-[#3A423C]" 
                />
              </div>
            </div>
          </section>

          <section className="space-y-6 pt-12 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
            <div className="p-8 rounded-[2rem] border border-[#E5C9C9]/50 bg-[#FCF5F5]/50 backdrop-blur-sm">
              <div className="flex flex-col items-center text-center gap-4">
                <AlertCircle className="w-6 h-6 text-[#A05050]/70" />
                <div>
                  <h3 className="font-serif text-lg text-[#A05050] mb-2">Forget Everything</h3>
                  <p className="text-sm text-[#8A6B6B] mb-6 max-w-sm mx-auto leading-relaxed">
                    Ask Aria to permanently erase all memories, insights, and journals. We will start completely fresh.
                  </p>
                  <button className="text-xs tracking-widest uppercase font-medium text-[#A05050] hover:text-[#7A3A3A] transition-colors border-b border-[#A05050]/30 pb-1">
                    Erase My Data
                  </button>
                </div>
              </div>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
