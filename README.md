# 🧠 AI Psychologist App

A sophisticated AI-powered psychological therapy assistant built with the Agno framework, featuring multi-layered psychological support, crisis detection, and evidence-based therapeutic techniques.

## 🚀 Features

### Core Framework (Layered Architecture)
- **HUMUN Safeguards**: Crisis detection and intervention for suicidal ideation, abuse, and extreme distress
- **Conversational Flow**: Natural language understanding and therapeutic questioning
- **Memory Systems**: Short-term and long-term memory with pattern recognition
- **Knowledge Integration**: Evidence-based psychological techniques (CBT, Humanistic, Psychoanalytic)

### Therapy Modes
- **CBT (Cognitive Behavioral Therapy)**: Focus on thought patterns and behavioral change
- **Humanistic**: Client-centered approach with empathy and growth focus
- **Psychoanalytic**: Deep exploration of unconscious patterns and childhood experiences

### Safety Features
- Real-time crisis keyword detection
- Automatic crisis response with helpline information
- Professional mental health disclaimers
- Ethical boundaries and safety protocols

## 🛠️ Installation

### Prerequisites
- Python 3.8+
- OpenAI API key

### Setup
1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd "AI pyschologist"
   ```

2. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure environment variables**
   ```bash
   
   # Edit .env with your OpenAI API key
   OPENAI_API_KEY=your_actual_api_key_here
   ```

## 🚀 Usage

### Option 1: Rich CLI Interface (Recommended)
```bash
python ai_psychologist.py
```

### Option 2: Simple CLI Interface
```bash
python simple_cli.py
```

### Session Commands
- `summary` - Get current session summary
- `history` - View conversation history
- `quit` - End the session

## 🏗️ Architecture

### 1. CrisisDetector (HUMUN Safeguards)
- Monitors user messages for crisis keywords
- Provides immediate crisis response
- Ensures user safety and professional referral

### 2. MemoryManager
- **Short-term Memory**: Last 2-3 conversation turns
- **Long-term Memory**: Persistent storage in SQLite database
- **Pattern Recognition**: Tag-based search for recurring themes

### 3. PsychologicalKnowledgeBase
- Evidence-based techniques for each therapy mode
- Context-aware therapeutic responses
- Integration with psychological research and best practices

### 4. AIPsychologist (Agno Agent)
- Built on Agno framework for multi-agent capabilities
- Session management and state persistence
- Tool integration for memory and knowledge access

## 🔧 Configuration

### Environment Variables
```bash
# Required
OPENAI_API_KEY=your_api_key

# Optional
THERAPY_MODE=cbt|humanistic|psychoanalytic
ENABLE_SAFEGUARDS=true|false
MAX_SESSION_LENGTH=50
```

### Crisis Keywords
Customizable crisis detection keywords in `config.py`:
```python
CRISIS_KEYWORDS = [
    "suicide", "kill myself", "end my life",
    "self-harm", "abuse", "extreme distress"
]
```

## 📊 Data Storage

### Database Files
- `psychologist_sessions.db` - Session storage and chat history
- `psychologist_memory.db` - User memories and session summaries
- `psychologist_memory.db` - Conversation logs with tags

### Data Structure
```json
{
  "timestamp": "2025-01-15T14:05:00",
  "user_id": "user123",
  "session_id": "session_20250115_140500",
  "user_message": "I feel anxious about work",
  "agent_response": "Let's explore what's causing this anxiety...",
  "tags": ["anxiety", "work"],
  "crisis_detected": false,
  "therapy_mode": "cbt"
}
```

## 🧪 Testing

### Crisis Detection Test
```bash
# Test crisis detection with keywords
python -c "
from ai_psychologist import CrisisDetector
detector = CrisisDetector(['suicide', 'self-harm'])
result = detector.detect_crisis('I want to kill myself')
print(f'Crisis detected: {result}')
"
```

### Memory System Test
```bash
# Test memory storage and retrieval
python -c "
from ai_psychologist import MemoryManager
memory = MemoryManager()
memory.store_conversation('test', 'response', tags=['test'])
conversations = memory.get_recent_conversations(limit=1)
print(f'Stored conversations: {len(conversations)}')
"
```

## 🚨 Safety and Ethics

### Important Disclaimers
- **This is NOT a replacement for professional mental health care**
- **For educational and support purposes only**
- **Always seek professional help for serious mental health issues**

### Crisis Response
- Automatic detection of crisis situations
- Immediate referral to crisis helplines
- Clear professional mental health guidance

### Privacy and Data
- Local data storage (no cloud transmission)
- User session isolation
- Configurable data retention policies

## 🔮 Future Enhancements

### Phase 2: Advanced Memory
- RAG integration with psychological literature
- Pattern analysis and trend detection
- Personalized therapy recommendations

### Phase 3: Multi-Agent Collaboration
- Specialized therapy agents
- Team-based therapeutic approaches
- Cross-modal therapy integration

### Phase 4: Knowledge Expansion
- Integration with therapy case studies
- Research paper analysis
- Evidence-based technique updates

## 🤝 Contributing

### Development Guidelines
1. Follow the layered architecture design
2. Maintain safety and ethical standards
3. Add comprehensive testing for new features
4. Document all psychological techniques and sources

### Testing Requirements
- Crisis detection accuracy
- Memory system reliability
- Therapy mode effectiveness
- Safety protocol compliance

## 📚 Resources

### Psychological Knowledge
- Cognitive Behavioral Therapy (CBT) techniques
- Humanistic therapy principles
- Psychoanalytic approaches
- Crisis intervention protocols

### Technical Documentation
- [Agno Framework Documentation](https://docs.agno.com)
- OpenAI API documentation
- SQLite database management
- Python async programming

## 📄 License

This project is for educational and research purposes. Please ensure compliance with:
- OpenAI API usage policies
- Mental health professional guidelines
- Ethical AI development standards
- Data privacy regulations

## 🆘 Support

### Technical Issues
- Check configuration and API key setup
- Verify database file permissions
- Review error logs and stack traces

### Mental Health Support
- **Crisis Helpline (US)**: 988 or 1-800-273-8255
- **Crisis Text Line**: Text HOME to 741741
- **Emergency Services**: 911
- **Professional Mental Health**: Seek licensed therapist or psychiatrist

---

**Remember**: This AI is a supportive tool, not a replacement for professional mental health care. Your well-being matters, and professional help is available.
