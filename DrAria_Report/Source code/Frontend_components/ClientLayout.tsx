"use client";

import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import AmbientBackground from "./ui/AmbientBackground";
import Navigation from "./ui/Navigation";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const handleQuickExit = () => {
    window.location.replace("https://google.com");
  };

  return (
    <>
      <AmbientBackground />
      {/* Trauma-Informed Feature: Quick Exit Button */}
      {pathname !== "/login" && pathname !== "/signup" && pathname !== "/" && (
        <button 
          onClick={handleQuickExit}
          aria-label="Quick Exit"
          className="fixed top-6 right-6 z-50 bg-white/50 hover:bg-[#EAE5D9] backdrop-blur-md p-3 rounded-full text-[#6B7567] hover:text-[#2C332E] transition-all shadow-sm focus-visible:ring-2 focus-visible:ring-[#475A4A] focus:outline-none"
          title="Quick Exit"
        >
          <X className="w-5 h-5" />
        </button>
      )}
      
      {/* Main Content */}
      <div className="relative z-10 w-full flex-grow flex flex-col">
        {children}
      </div>

      <Navigation />
    </>
  );
}
