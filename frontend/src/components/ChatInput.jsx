import { useState } from "react";
import "./ChatInput.css";

export default function ChatInput({ onSend, disabled, placeholder }) {
  const [value, setValue] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    const text = value.trim();
    if (!text || disabled) return;
    onSend(text);
    setValue("");
  };

  return (
    <form className="chat-input-wrap" onSubmit={handleSubmit}>
      <input
        type="text"
        className="chat-input"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder || "Type your message..."}
        disabled={disabled}
        autoComplete="off"
      />
      <button type="submit" className="chat-send" disabled={disabled || !value.trim()} aria-label="Send">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="22" y1="2" x2="11" y2="13" />
          <polygon points="22 2 15 22 11 13 2 9 22 2" />
        </svg>
      </button>
    </form>
  );
}
