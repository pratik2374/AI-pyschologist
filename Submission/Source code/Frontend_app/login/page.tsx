"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Feather } from 'lucide-react';
import axios from 'axios';

export default function LoginScreen() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');
      await axios.post(`${apiUrl}/auth/login`, formData, {
        withCredentials: true
      });
      router.push('/chat');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] p-6 text-[#2C332E]">
      <div className="w-full max-w-md relative z-10 animate-in fade-in duration-1000">
        
        <div className="text-center mb-16">
          <h1 className="text-4xl font-serif text-[#3A423C] tracking-wide mb-3">Welcome Back</h1>
          <p className="text-[#6B7567] text-xs tracking-[0.2em] uppercase">Aria is ready</p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-8">
          <div className="space-y-6">
            <input 
              type="email" 
              placeholder="Your Email" 
              value={formData.email}
              onChange={e => setFormData({...formData, email: e.target.value})}
              required
              className="w-full bg-transparent border-b border-[#D5D0C5]/60 py-4 px-2 focus:outline-none focus:border-[#5C7060] transition-colors placeholder-[#B8B4AA] text-lg text-center font-serif text-[#2C332E]" 
            />
            <input 
              type="password" 
              placeholder="Your Password" 
              value={formData.password}
              onChange={e => setFormData({...formData, password: e.target.value})}
              required
              className="w-full bg-transparent border-b border-[#D5D0C5]/60 py-4 px-2 focus:outline-none focus:border-[#5C7060] transition-colors placeholder-[#B8B4AA] text-lg text-center font-serif text-[#2C332E]" 
            />
          </div>
          
          <button 
            type="submit"
            disabled={loading}
            className="w-full mt-12 bg-[#3A423C] text-[#F7F5F0] rounded-full py-4 flex items-center justify-center gap-2 hover:bg-[#2C332E] transition-all tracking-widest uppercase text-sm disabled:opacity-50"
          >
            {loading ? "Entering..." : "Enter"} <Feather className="w-4 h-4 ml-2 opacity-50" />
          </button>
          
          <div className="text-center mt-6">
            <button 
              type="button"
              onClick={() => router.push('/')}
              className="text-xs text-[#8A9386] hover:text-[#5C7060] uppercase tracking-widest transition-colors"
            >
              I am new here (Sign Up)
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
