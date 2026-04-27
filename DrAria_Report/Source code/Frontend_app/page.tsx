"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Wind, EyeOff, Feather } from 'lucide-react';
import axios from 'axios';

export default function OnboardingScreen() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState({
    name: '',
    preferredName: '',
    email: '',
    password: '',
    encryptionMode: 'A',
    otp: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

  useEffect(() => {
    if (step === 0) {
      const timer = setTimeout(() => setStep(1), 3500);
      return () => clearTimeout(timer);
    }
  }, [step]);

  const handleRequestOtp = async () => {
    try {
      if (!formData.name || !formData.email || !formData.password) {
        setError("Please provide name, email, and password.");
        return;
      }
      setLoading(true);
      setError('');
      await axios.post(`${apiUrl}/auth/generate-otp`, { email: formData.email });
      setStep(4); // Move to OTP step
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async () => {
    try {
      if (!formData.otp) {
        setError("Please provide the OTP.");
        return;
      }
      setLoading(true);
      setError('');
      
      const payload = {
        name: formData.name,
        preferredName: formData.preferredName || formData.name,
        email: formData.email,
        password: formData.password,
        otp: formData.otp,
        encryptionMode: formData.encryptionMode
      };
      
      await axios.post(`${apiUrl}/auth/signup`, payload, {
        withCredentials: true
      });
      router.push('/chat');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] p-6 text-[#2C332E]">
      <div className="w-full max-w-md relative z-10 transition-all duration-1000">
        
        {/* Step 0: The Deep Breath */}
        {step === 0 && (
          <div className="flex flex-col items-center justify-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-[#9EA398] to-[#BCC1B6] animate-pulse-soft blur-sm"></div>
            <p className="font-serif text-2xl text-[#5C7060] tracking-wide text-center">Take a deep breath.</p>
          </div>
        )}

        {step > 0 && (
          <div className="text-center mb-16">
            <h1 className="text-4xl font-serif text-[#3A423C] tracking-wide mb-3">Aria</h1>
            <p className="text-[#6B7567] text-xs tracking-[0.2em] uppercase">I'm here to listen</p>
          </div>
        )}

        {/* Notice of error */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm text-center">
            {error}
          </div>
        )}

        {/* Step 1: Basic Info */}
        {step === 1 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <div className="space-y-6">
              <input 
                type="text" 
                placeholder="What should I call you?" 
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                className="w-full bg-transparent border-b border-[#D5D0C5]/60 py-4 px-2 focus:outline-none focus:border-[#5C7060] transition-colors placeholder-[#B8B4AA] text-lg text-center font-serif text-[#2C332E]" 
              />
              <input 
                type="email" 
                placeholder="Where can I quietly reach you? (Email)" 
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
                className="w-full bg-transparent border-b border-[#D5D0C5]/60 py-4 px-2 focus:outline-none focus:border-[#5C7060] transition-colors placeholder-[#B8B4AA] text-lg text-center font-serif text-[#2C332E]" 
              />
              <input 
                type="password" 
                placeholder="A secret phrase (Password)" 
                value={formData.password}
                onChange={e => setFormData({...formData, password: e.target.value})}
                className="w-full bg-transparent border-b border-[#D5D0C5]/60 py-4 px-2 focus:outline-none focus:border-[#5C7060] transition-colors placeholder-[#B8B4AA] text-lg text-center font-serif text-[#2C332E]" 
              />
            </div>
            
            <button 
              onClick={() => {
                if(formData.name && formData.email && formData.password) {
                  setError('');
                  setStep(2);
                } else {
                  setError('Please fill in all fields to continue.');
                }
              }}
              className="w-full mt-12 text-[#5C7060] py-4 flex items-center justify-center gap-2 hover:text-[#3A423C] transition-all tracking-widest uppercase text-sm"
            >
              Gently continue <Feather className="w-4 h-4 ml-2 opacity-50" />
            </button>
            
            <div className="text-center mt-6">
              <a href="/login" className="text-xs text-[#8A9386] hover:text-[#5C7060] uppercase tracking-widest transition-colors">
                I already know you (Log In)
              </a>
            </div>
          </div>
        )}

        {/* Step 2: Privacy Mode */}
        {step === 2 && (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <div className="text-center space-y-3">
              <h2 className="text-2xl font-serif text-[#3A423C]">How should we remember this?</h2>
              <p className="text-[#6B7567] text-sm">Your boundaries define this space.</p>
            </div>

            <div className="space-y-6">
              {/* Option A */}
              <div 
                onClick={() => setFormData({...formData, encryptionMode: 'A'})}
                className={`p-6 rounded-3xl border cursor-pointer transition-all group ${
                  formData.encryptionMode === 'A' 
                    ? 'border-[#5C7060] bg-white/60 shadow-sm' 
                    : 'border-[#E2DED5]/50 bg-white/40 hover:bg-white/60'
                }`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <Wind className={`w-5 h-5 ${formData.encryptionMode === 'A' ? 'text-[#3A423C]' : 'text-[#8A9386]'}`} />
                    <h3 className="font-serif text-lg text-[#3A423C]">A Continuous Thread</h3>
                  </div>
                </div>
                <p className="text-[#6B7567] text-sm leading-relaxed pr-4">
                  I will remember our past conversations, allowing me to understand your journey over time and reflect on your growth.
                </p>
              </div>

              {/* Option B */}
              <div 
                onClick={() => setFormData({...formData, encryptionMode: 'B'})}
                className={`p-6 rounded-3xl border cursor-pointer transition-all group ${
                  formData.encryptionMode === 'B' 
                    ? 'border-[#5C7060] bg-[#EFECE5]/80 shadow-sm' 
                    : 'border-[#E2DED5]/50 bg-[#EFECE5]/40 hover:bg-[#EFECE5]/70'
                }`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <EyeOff className={`w-5 h-5 ${formData.encryptionMode === 'B' ? 'text-[#3A423C]' : 'text-[#8A9386]'}`} />
                    <h3 className="font-serif text-lg text-[#3A423C]">The Present Moment</h3>
                  </div>
                </div>
                <p className="text-[#6B7567] text-sm leading-relaxed pr-4">
                  A blank slate every time. I forget everything the moment you leave. Pure confidentiality, just for today.
                </p>
              </div>
            </div>

            <button 
              onClick={handleRequestOtp}
              disabled={loading}
              className="w-full mt-8 bg-[#3A423C] text-[#F7F5F0] rounded-full py-4 hover:bg-[#2C332E] transition-all font-serif text-lg tracking-wide shadow-lg shadow-[#3A423C]/10 disabled:opacity-50"
            >
              {loading ? "Preparing..." : "Enter the Room"}
            </button>
          </div>
        )}

        {/* Step 4: OTP Verification */}
        {step === 4 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <div className="text-center space-y-3">
              <h2 className="text-2xl font-serif text-[#3A423C]">Verify It's You</h2>
              <p className="text-[#6B7567] text-sm">Please enter the 6-digit code sent to your email.</p>
            </div>
            
            <div className="space-y-6 flex flex-col items-center">
              <input 
                type="text" 
                maxLength={6}
                placeholder="------" 
                value={formData.otp}
                onChange={e => setFormData({...formData, otp: e.target.value})}
                className="w-32 bg-transparent border-b-2 border-[#D5D0C5] py-4 px-2 focus:outline-none focus:border-[#5C7060] transition-colors placeholder-[#B8B4AA] text-3xl tracking-[0.5em] text-center font-serif text-[#2C332E]" 
              />
            </div>
            
            <button 
              onClick={handleSignup}
              disabled={loading}
              className="w-full mt-12 bg-[#3A423C] text-[#F7F5F0] rounded-full py-4 hover:bg-[#2C332E] transition-all font-serif text-lg tracking-wide shadow-lg disabled:opacity-50"
            >
              {loading ? "Verifying..." : "Begin"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
