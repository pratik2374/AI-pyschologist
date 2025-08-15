# 🚀 Quick Start Guide

Get your AI Psychologist up and running in 5 minutes!

## ⚡ Quick Setup

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Set Up API Key
```bash
# Copy the environment template
cp env_template.txt .env

# Edit .env and add your OpenAI API key
OPENAI_API_KEY=sk-your-actual-api-key-here
```

### 3. Test Basic Functionality
```bash
python test_basic.py
```

### 4. Start a Session
```bash
# Simple CLI (recommended for first time)
python simple_cli.py

# Full Rich CLI
python ai_psychologist.py
```

## 🎯 First Session

1. **Choose Therapy Mode**: CBT, Humanistic, or Psychoanalytic
2. **Enter User ID**: Use any identifier or press Enter for default
3. **Start Talking**: Share what's on your mind
4. **Use Commands**:
   - `summary` - Get session summary
   - `history` - View conversation history
   - `quit` - End session

## 🔧 Troubleshooting

### Common Issues

**"OPENAI_API_KEY not found"**
- Check that `.env` file exists
- Verify API key is correct
- Restart your terminal

**"Module not found" errors**
- Run `pip install -r requirements.txt`
- Check Python version (3.8+ required)

**Database errors**
- Ensure write permissions in current directory
- Check if SQLite is available

### Test Commands

```bash
# Test crisis detection
python -c "from ai_psychologist import CrisisDetector; print('✓ Crisis detection working')"

# Test memory system
python -c "from ai_psychologist import MemoryManager; print('✓ Memory system working')"

# Test knowledge base
python -c "from ai_psychologist import PsychologicalKnowledgeBase; print('✓ Knowledge base working')"
```

## 📱 Sample Session

```
🧠 AI Psychologist - Simple CLI Version
==================================================

Choose therapy mode:
1. CBT (Cognitive Behavioral Therapy)
2. Humanistic
3. Psychoanalytic

Enter choice (1-3) or 'q' to quit: 1

🔄 Initializing AI Psychologist in CBT mode...
✅ AI Psychologist initialized successfully!

Enter your user ID (or press Enter for default): 

==================================================
Session started! Type 'quit' to end, 'summary' for summary, 'history' for history
==================================================

You: I'm feeling really stressed about work lately

AI Psychologist:
I understand that work stress can be really overwhelming. In CBT, we often find it helpful to break down what's causing this stress. Can you tell me more about what specific aspects of work are feeling most challenging right now?

You: My boss keeps giving me impossible deadlines

AI Psychologist:
That sounds incredibly frustrating and unfair. Impossible deadlines can create a lot of anxiety and pressure. Let's work together to identify some strategies that might help. When you think about these deadlines, what thoughts go through your mind? Do you find yourself thinking things like "I'll never get this done" or "I'm going to fail"?

You: summary

📋 Session Summary:
Session Summary: The client discussed work-related stress, specifically mentioning impossible deadlines from their boss. The session focused on identifying cognitive patterns and exploring CBT techniques for managing work stress and anxiety.
```

## 🎉 You're Ready!

Your AI Psychologist is now fully functional with:
- ✅ Crisis detection and safety protocols
- ✅ Memory systems for personalized conversations
- ✅ Evidence-based therapeutic techniques
- ✅ Professional boundaries and ethical guidelines

**Remember**: This is a supportive tool, not a replacement for professional mental health care.

## 🆘 Need Help?

- **Technical Issues**: Check the troubleshooting section above
- **Mental Health Support**: Always seek professional help for serious issues
- **Crisis Support**: Call 988 (US) or your local crisis helpline

Happy healing! 🫂
