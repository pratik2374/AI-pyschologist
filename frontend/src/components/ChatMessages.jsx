import "./ChatMessages.css";

export default function ChatMessages({ messages, loading, isTyping }) {
  if (loading) {
    return (
      <div className="chat-messages-loading">
        <p>Loading conversation…</p>
      </div>
    );
  }

  return (
    <div className="chat-messages">
      {messages.map((msg, i) => (
        <div key={i} className="chat-message-row">
          {msg.user_message && (
            <div className="msg msg-user">
              <span>{msg.user_message}</span>
            </div>
          )}
          {msg.agent_response && (
            <div className="msg msg-agent">
              <span>{msg.agent_response}</span>
            </div>
          )}
        </div>
      ))}

      {isTyping && (
        <div className="chat-message-row">
          <div className="msg msg-agent typing-bubble" aria-label="AI is thinking">
            <span className="typing-dots">
              <span></span>
              <span></span>
              <span></span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
