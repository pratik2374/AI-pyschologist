"use useState, useEffect, useRef";

import { useState, useRef, useCallback } from 'react';
import { createParser } from 'eventsource-parser';

export type Message = {
  id: string;
  role: 'user' | 'aria';
  content: string;
};

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [mode, setMode] = useState<'A'|'B'>('A');
  const abortControllerRef = useRef<AbortController | null>(null);
  
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

  const appendMessage = useCallback((msg: Message) => {
    setMessages(prev => [...prev, msg]);
  }, []);

  const stopConversation = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsTyping(false);
  };

  const fetchHistory = async () => {
    try {
      const res = await fetch(`${apiUrl}/chat/history`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        if (data.messages) {
          const formatted = data.messages.map((m: any) => ({
            id: m._id,
            role: m.role,
            content: m.content
          }));
          setMessages(formatted);
          if (data.encryptionMode) setMode(data.encryptionMode);
        }
      }
    } catch (e) {
      console.error("Failed to fetch history", e);
    }
  };

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: input };
    appendMessage(userMsg);
    setInput('');
    setIsTyping(true);

    let ariaMsgId = (Date.now() + 1).toString();
    appendMessage({ id: ariaMsgId, role: 'aria', content: '' });

    abortControllerRef.current = new AbortController();

    try {
      const payload = mode === 'A' 
        ? { message: userMsg.content }
        : { encryptedMessage: userMsg.content, conversationContext: messages.concat(userMsg) }; // Mode B handles via client, simplified here.

      const res = await fetch(`${apiUrl}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: abortControllerRef.current.signal,
        credentials: 'include',
      });

      if (!res.ok) {
        throw new Error('Failed to send message');
      }

      if (!res.body) return;
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      
      const parser = createParser({
        onEvent: (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'chunk') {
              setMessages(prev => prev.map(m => 
                m.id === ariaMsgId ? { ...m, content: m.content + data.content } : m
              ));
            } else if (data.type === 'done') {
              setIsTyping(false);
              if (data.opener) {
                // Handle Mode B opener
                appendMessage({ id: (Date.now()+2).toString(), role: 'aria', content: data.opener });
              }
            } else if (data.type === 'error') {
              setIsTyping(false);
            }
          } catch (e) {
            console.error('SSE JSON parse error', e);
          }
        }
      });

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        parser.feed(decoder.decode(value, { stream: true }));
      }
      
      setIsTyping(false);
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Stream error:', error);
      }
      setIsTyping(false);
    }
  };

  return {
    messages,
    setMessages,
    input,
    setInput,
    isTyping,
    sendMessage,
    stopConversation,
    fetchHistory
  };
}
