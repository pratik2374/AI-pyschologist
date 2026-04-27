"use client";

export default function ProgressDashboard() {
  return (
    <div className="flex flex-col items-center pb-32 relative z-10 text-[#3A423C]">
      <div className="max-w-3xl w-full mx-auto px-6 py-16">
        <header className="mb-16 text-center animate-in fade-in duration-700">
          <h1 className="text-3xl font-serif mb-4">Reflections</h1>
          <p className="text-[#8A9386] italic text-sm">A gentle look back at your last 30 days.</p>
        </header>

        <div className="space-y-12">
          
          {/* Card: Emotional Arc */}
          <div className="bg-white/40 backdrop-blur-md rounded-[2.5rem] p-10 border border-white/60 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
            <h3 className="text-xs uppercase tracking-[0.2em] text-[#8A9386] mb-8 text-center">Your Emotional Landscape</h3>
            
            <div className="h-40 w-full relative flex items-end justify-between gap-2 pb-4">
              {[40, 30, 50, 45, 60, 55, 70, 65, 80, 75, 85, 90].map((height, i) => (
                <div key={i} className="w-full relative group h-full flex items-end">
                  <div 
                    className="w-full bg-[#5C7060] rounded-full opacity-10 hover:opacity-30 transition-opacity duration-500"
                    style={{ height: `${height}%` }}
                  ></div>
                </div>
              ))}
              <svg className="absolute inset-0 h-full w-full pointer-events-none" preserveAspectRatio="none" viewBox="0 0 100 100">
                <path d="M 0 60 Q 20 70, 40 50 T 80 30 T 100 10" fill="none" stroke="#8A9386" strokeWidth="0.5" className="opacity-50" />
              </svg>
            </div>
          </div>

          {/* Card: Themes Explored */}
          <div className="bg-transparent px-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
            <h3 className="text-xs uppercase tracking-[0.2em] text-[#8A9386] mb-8 text-center">Current Threads</h3>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <span className="font-serif text-lg">Workplace Anxiety</span>
                <span className="text-xs text-[#8A9386] italic">Visited often</span>
              </div>
              <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-[#D5D0C5] to-transparent"></div>
              
              <div className="flex items-center justify-between">
                <span className="font-serif text-lg">Family Boundaries</span>
                <span className="text-xs text-[#8A9386] italic">Emerging</span>
              </div>
              <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-[#D5D0C5] to-transparent"></div>

              <div className="flex items-center justify-between">
                <span className="font-serif text-lg">Self-Compassion</span>
                <span className="text-xs text-[#5C7060] italic">Growing stronger</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
