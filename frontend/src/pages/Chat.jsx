import { useState, useEffect, useRef } from "react";
import { api } from "../api/client";
import PastChats from "../components/PastChats";
import SuggestedTopics from "../components/SuggestedTopics";
import ChatMessages from "../components/ChatMessages";
import ChatInput from "../components/ChatInput";
import TherapistProfile from "../components/TherapistProfile";
import "./Chat.css";

function getSessionTitle(messages) {
  if (!messages?.length) return "New chat";
  const first = messages.find((m) => m.user_message);
  return first?.user_message?.slice(0, 40) + (first?.user_message?.length > 40 ? "…" : "") || "Chat";
}

function groupPastChatsBySession(response) {
  if (!response?.response?.length) return [];
  const bySession = new Map();
  for (const log of response.response) {
    const sid = log.session_id;
    if (!bySession.has(sid)) {
      bySession.set(sid, {
        sessionId: sid,
        messages: [],
        createdAt: log.createdAt,
      });
    }
    bySession.get(sid).messages.push(log);
  }
  return Array.from(bySession.values())
    .map((s) => ({
      ...s,
      title: getSessionTitle(s.messages),
      updatedAt: s.messages[s.messages.length - 1]?.createdAt || s.createdAt,
    }))
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
}

export default function Chat() {
  const [pastChats, setPastChats] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [loadingSession, setLoadingSession] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });

  const loadPastChats = async () => {
    setLoadingHistory(true);
    try {
      const data = await api.getPastChats();
      setPastChats(groupPastChatsBySession(data));
    } catch {
      setPastChats([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadPastChats();
  }, []);

  const loadSession = async (sid) => {
    if (!sid) {
      setSessionId(null);
      setMessages([]);
      return;
    }
    setLoadingSession(true);
    setSessionId(sid);
    try {
      const data = await api.getChatSession(sid);
      setMessages(data.response || []);
    } catch {
      setMessages([]);
    } finally {
      setLoadingSession(false);
    }
  };

  const startNewChat = async () => {
    try {
      const { sessionId: newId } = await api.generateSessionId();
      setSessionId(newId);
      setMessages([]);
    } catch {
      setSessionId(null);
      setMessages([]);
    }
  };

  const sendMessage = async (query) => {
    let sid = sessionId;
    if (!sid) {
      try {
        const res = await api.generateSessionId();
        sid = res.sessionId;
        setSessionId(sid);
      } catch {
        return;
      }
    }
    const userMsg = { user_message: query, agent_response: "", createdAt: new Date().toISOString() };
    setMessages((prev) => [...prev, userMsg]);
    setSending(true);
    scrollToBottom();
    try {
      const data = await api.sendMessage(query, sid);
      const agentText = data?.data?.response ?? data?.data?.message ?? "I'm here for you. Could you tell me more?";
      setMessages((prev) =>
        prev.map((m, i) =>
          i === prev.length - 1 && m.user_message === query
            ? { ...m, agent_response: agentText }
            : m
        )
      );
      loadPastChats();
    } catch {
      setMessages((prev) =>
        prev.map((m, i) =>
          i === prev.length - 1 && m.user_message === query
            ? { ...m, agent_response: "Sorry, something went wrong. Please try again." }
            : m
        )
      );
    } finally {
      setSending(false);
      scrollToBottom();
    }
  };

  const handleTopicSelect = (topic) => {
    startNewChat();
    setTimeout(() => sendMessage(topic), 100);
  };

  return (
    <div className="chat-page">
      <aside className="chat-sidebar">
        <PastChats
          chats={pastChats}
          loading={loadingHistory}
          currentSessionId={sessionId}
          onSelect={loadSession}
          onNewChat={startNewChat}
        />
      </aside>
      <div className="chat-main">
        <div className="chat-content">
          <div className="chat-messages-wrap">
            {messages.length === 0 && !loadingSession ? (
              <>
                <TherapistProfile />
                <div className="chat-welcome">
                  <h2>How can I assist you today?</h2>
                  <SuggestedTopics onSelect={handleTopicSelect} />
                </div>
              </>
            ) : (
              <ChatMessages messages={messages} loading={loadingSession} isTyping={sending} />
            )}
            <div ref={messagesEndRef} />
          </div>
          <ChatInput onSend={sendMessage} disabled={sending} placeholder="Type your message..." />
        </div>
      </div>
    </div>
  );
}
