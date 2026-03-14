import "./PastChats.css";

const formatTime = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now - d;
  if (diff < 60000) return "Just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return d.toLocaleDateString();
};

const topicIcons = [
  "💭", "🌙", "💪", "😌", "🌿", "🧘", "💙", "🌅"
];

function getIcon(sessionId, index) {
  const i = (sessionId?.length || 0 + index) % topicIcons.length;
  return topicIcons[i];
}

export default function PastChats({ chats, loading, currentSessionId, onSelect, onNewChat }) {
  return (
    <div className="past-chats">
      <div className="past-chats-header">
        <h3>Past Chats</h3>
        <button type="button" className="btn-new-chat" onClick={onNewChat}>
          New chat
        </button>
      </div>
      {loading ? (
        <p className="past-chats-loading">Loading…</p>
      ) : chats.length === 0 ? (
        <p className="past-chats-empty">No past conversations yet.</p>
      ) : (
        <ul className="past-chats-list">
          {chats.map((chat, i) => (
            <li key={chat.sessionId}>
              <button
                type="button"
                className={`past-chat-item ${currentSessionId === chat.sessionId ? "active" : ""}`}
                onClick={() => onSelect(chat.sessionId)}
              >
                <span className="past-chat-icon">{getIcon(chat.sessionId, i)}</span>
                <span className="past-chat-title">{chat.title}</span>
                <span className="past-chat-time">{formatTime(chat.updatedAt)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
