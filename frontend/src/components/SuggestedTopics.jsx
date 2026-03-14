import "./SuggestedTopics.css";

const TOPICS = [
  "Managing anxiety and stress",
  "Building self-confidence",
  "Improving my sleep",
  "Improving self-esteem",
  "Dealing with loneliness",
  "Coping with work stress",
  "Mindfulness and relaxation",
];

const COLORS = ["peach", "mint", "sky", "lavender", "peach", "mint", "sky"];

export default function SuggestedTopics({ onSelect }) {
  return (
    <div className="suggested-topics">
      {TOPICS.map((topic, i) => (
        <button
          key={topic}
          type="button"
          className={`topic-chip topic-${COLORS[i % COLORS.length]}`}
          onClick={() => onSelect(topic)}
        >
          {topic}
        </button>
      ))}
    </div>
  );
}
