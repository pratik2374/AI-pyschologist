"""
AI Psychologist Demo Script

This script demonstrates the key features of the AI Psychologist app
without requiring a full OpenAI API session.
"""

import json
from datetime import datetime
from ai_psychologist import (
    CrisisDetector, 
    MemoryManager, 
    PsychologicalKnowledgeBase,
    AIPsychologist
)

def demo_crisis_detection():
    """Demonstrate crisis detection capabilities"""
    print("🚨 DEMO: Crisis Detection (HUMUN Safeguards)")
    print("=" * 60)
    
    # Initialize crisis detector
    crisis_keywords = [
        "suicide", "kill myself", "end my life", "want to die",
        "self-harm", "cut myself", "hurt myself",
        "abuse", "domestic violence", "sexual assault"
    ]
    
    detector = CrisisDetector(crisis_keywords)
    
    # Test various messages
    test_messages = [
        "I'm having a great day today!",
        "I feel sad and hopeless",
        "I want to kill myself",
        "I'm thinking about self-harm",
        "My relationship is challenging",
        "I'm being abused by my partner",
        "I'm stressed about work"
    ]
    
    for message in test_messages:
        result = detector.detect_crisis(message)
        status = "🚨 CRISIS" if result['is_crisis'] else "✅ Safe"
        print(f"{status} | '{message}'")
        
        if result['is_crisis']:
            print(f"    Keywords detected: {result['keywords']}")
            print(f"    Severity: {result['severity']}")
            print(f"    Response: {detector.get_crisis_response()[:100]}...")
        print()
    
    print("✅ Crisis detection demo completed\n")

def demo_memory_system():
    """Demonstrate memory management capabilities"""
    print("🧠 DEMO: Memory System (STM & LTM)")
    print("=" * 60)
    
    # Initialize memory manager
    memory = MemoryManager("demo_memory.db")
    
    # Simulate a therapy session
    session_data = [
        {
            "user": "I've been feeling anxious about my upcoming presentation",
            "agent": "Presentations can be really nerve-wracking. Can you tell me more about what specifically makes you anxious?",
            "tags": ["anxiety", "presentation", "work"],
            "time": "2025-01-15T10:00:00"
        },
        {
            "user": "I'm afraid I'll forget what to say and look stupid",
            "agent": "That's a very common fear. Let's explore this thought - what makes you think you'll look stupid?",
            "tags": ["anxiety", "fear", "self-esteem"],
            "time": "2025-01-15T10:05:00"
        },
        {
            "user": "I always mess up when I'm nervous",
            "agent": "I hear you saying that you 'always' mess up. Let's look at this more carefully - has there ever been a time when you were nervous but still did well?",
            "tags": ["anxiety", "cognitive_distortion", "self-talk"],
            "time": "2025-01-15T10:10:00"
        }
    ]
    
    # Store conversations
    print("📝 Storing conversation data...")
    for i, conv in enumerate(session_data, 1):
        memory.store_conversation(
            user_message=conv["user"],
            agent_response=conv["agent"],
            user_id="demo_user",
            session_id="demo_session_001",
            tags=conv["tags"],
            therapy_mode="cbt"
        )
        print(f"  {i}. Stored: {conv['user'][:50]}...")
    
    # Retrieve recent conversations
    print("\n📚 Retrieving recent conversations...")
    conversations = memory.get_recent_conversations("demo_user", limit=5)
    print(f"Found {len(conversations)} conversations")
    
    for i, conv in enumerate(conversations, 1):
        print(f"\n  {i}. Time: {conv['timestamp'][:19]}")
        print(f"     You: {conv['user_message']}")
        print(f"     AI: {conv['agent_response'][:80]}...")
        print(f"     Tags: {', '.join(conv['tags'])}")
    
    # Search by tags
    print("\n🔍 Searching by tags...")
    anxiety_conversations = memory.search_by_tags(["anxiety"], "demo_user")
    print(f"Found {len(anxiety_conversations)} conversations about anxiety")
    
    print("\n✅ Memory system demo completed\n")

def demo_knowledge_base():
    """Demonstrate psychological knowledge integration"""
    print("📚 DEMO: Psychological Knowledge Base")
    print("=" * 60)
    
    # Initialize knowledge base
    kb = PsychologicalKnowledgeBase()
    
    # Show available techniques for each therapy mode
    print("Available Therapy Techniques:")
    for mode in ["cbt", "humanistic", "psychoanalytic"]:
        print(f"\n{mode.upper()} MODE:")
        techniques = kb.get_techniques(mode)
        
        for category, technique_list in techniques.items():
            print(f"  {category.replace('_', ' ').title()}:")
            for technique in technique_list:
                print(f"    • {technique}")
    
    # Demonstrate context-aware responses
    print("\n🎯 Context-Aware Therapeutic Responses:")
    contexts = [
        "I'm feeling really anxious about my relationship",
        "I've been depressed for weeks",
        "I keep having panic attacks at work"
    ]
    
    for context in contexts:
        print(f"\nContext: '{context}'")
        for mode in ["cbt", "humanistic", "psychoanalytic"]:
            response = kb.get_therapeutic_response(mode, context)
            print(f"  {mode.upper()}: {response}")
    
    print("\n✅ Knowledge base demo completed\n")

def demo_session_management():
    """Demonstrate session management capabilities"""
    print("🔄 DEMO: Session Management")
    print("=" * 60)
    
    print("This demo shows how the AI Psychologist manages therapy sessions:")
    print("• Session creation and tracking")
    print("• User identification and isolation")
    print("• Conversation history and summaries")
    print("• Crisis detection integration")
    print("• Memory persistence across sessions")
    
    # Show session structure
    session_example = {
        "session_id": "session_20250115_143000",
        "user_id": "user_123",
        "therapy_mode": "cbt",
        "start_time": "2025-01-15T14:30:00",
        "conversation_count": 0,
        "crisis_events": 0,
        "tags": []
    }
    
    print(f"\n📋 Sample Session Structure:")
    print(json.dumps(session_example, indent=2))
    
    print("\n✅ Session management demo completed\n")

def demo_safety_features():
    """Demonstrate safety and ethical features"""
    print("🛡️ DEMO: Safety & Ethical Features")
    print("=" * 60)
    
    print("The AI Psychologist includes several safety mechanisms:")
    print()
    
    safety_features = [
        "🚨 Crisis Detection: Automatic identification of crisis situations",
        "📞 Helpline Referrals: Immediate crisis response with professional resources",
        "⚠️ Professional Disclaimers: Clear boundaries about AI limitations",
        "🔒 Privacy Protection: Local data storage, no cloud transmission",
        "👥 User Isolation: Separate sessions and memories for each user",
        "📋 Session Logging: Complete audit trail for safety monitoring",
        "🎯 Ethical Guidelines: Built-in professional therapy standards"
    ]
    
    for feature in safety_features:
        print(f"  {feature}")
    
    print("\n✅ Safety features demo completed\n")

def main():
    """Run the complete demo"""
    print("🧠 AI Psychologist - Complete Feature Demo")
    print("=" * 70)
    print("This demo showcases all major features without requiring OpenAI API\n")
    
    try:
        # Run all demos
        demo_crisis_detection()
        demo_memory_system()
        demo_knowledge_base()
        demo_session_management()
        demo_safety_features()
        
        print("🎉 All demos completed successfully!")
        print("\n🚀 Ready to try the full AI Psychologist?")
        print("1. Set up your OpenAI API key: cp env_template.txt .env")
        print("2. Run a test session: python simple_cli.py")
        print("3. Experience the full app: python ai_psychologist.py")
        
    except Exception as e:
        print(f"❌ Demo failed with error: {e}")
        print("Please check your installation and try again.")

if __name__ == "__main__":
    main()
