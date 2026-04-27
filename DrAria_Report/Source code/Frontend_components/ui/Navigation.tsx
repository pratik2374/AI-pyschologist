"use client";

import { usePathname, useRouter } from "next/navigation";
import { User, Feather, BarChart2, Settings } from "lucide-react";

export default function Navigation() {
  const pathname = usePathname();
  const router = useRouter();

  // Do not show navigation on login/signup pages or verification
  if (['/login', '/signup', '/verify-otp', '/', '/chat'].includes(pathname)) {
    return null;
  }

  const navItems = [
    { id: '/login', icon: User, label: 'Entry' }, // In a real app 'Entry' might not be visible when logged in, or maps to profile
    { id: '/chat', icon: Feather, label: 'Room' },
    { id: '/dashboard', icon: BarChart2, label: 'Reflect' },
    { id: '/profile', icon: Settings, label: 'You' },
  ];

  // Map Entry to Home or Auth depending on actual UX flow.
  // Replacing 'Entry' mapped to onboarding in the prototype. We will hide 'Entry' from logged-in nav,
  // or point it to a home portal. For now we will only list the protected routes.
  const loggedInNavItems = [
    { id: '/chat', icon: Feather, label: 'Room' },
    { id: '/dashboard', icon: BarChart2, label: 'Reflect' },
    { id: '/profile', icon: Settings, label: 'You' },
  ];

  return (
    <nav 
      aria-label="Main Navigation"
      className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-white/30 backdrop-blur-xl px-8 py-4 rounded-full border border-white/50 flex gap-10 z-50 shadow-[0_4px_20px_rgb(0,0,0,0.02)]"
    >
      {loggedInNavItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.id;
        return (
          <button
            key={item.id}
            onClick={() => router.push(item.id)}
            aria-label={`Maps to ${item.label}`}
            aria-current={isActive ? "page" : undefined}
            className={`transition-all duration-500 focus-visible:ring-2 focus-visible:ring-[#475A4A]/50 focus:outline-none rounded-full p-2 ${
              isActive ? 'text-[#2C332E] scale-110' : 'text-[#8A9386] hover:text-[#6B7567]'
            }`}
          >
            <Icon className="w-5 h-5" strokeWidth={isActive ? 2 : 1.5} />
          </button>
        );
      })}
    </nav>
  );
}
