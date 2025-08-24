"""
Basic functionality tests for AI Psychologist components
Tests core classes without requiring OpenAI API
"""

import json
from datetime import datetime
from ai_psychologist import CrisisDetector, MemoryManager, PsychologicalKnowledgeBase

def test_crisis_detector():
    """Test crisis detection functionality"""
    print("🧪 Testing CrisisDetector...")
    
    # Test crisis keywords
    crisis_keywords = ["suicide", "self-harm", "abuse", "kill myself"]
    detector = CrisisDetector(crisis_keywords)
    
    # Test crisis detection
    test_messages = [
        "I feel sad today",
        "I want to kill myself",
        "I'm thinking about self-harm",
        "I'm having a bad day"
    ]
    
    for message in test_messages:
        result = detector.detect_crisis(message)
        print(f"Message: '{message}'")
        print(f"  Crisis: {result['is_crisis']}")
        print(f"  Keywords: {result['keywords']}")
        print(f"  Severity: {result['severity']}")
        print()
    
    print("✅ CrisisDetector tests completed\n")

def test_memory_manager():
    """Test memory management functionality"""
    print("🧪 Testing MemoryManager...")
    
    # Use test database
    memory = MemoryManager("test_memory.db")
    
    # Test conversation storage
    test_conversations = [
        {
            "user": "I feel anxious about work",
            "agent": "Let's explore what's causing this anxiety. Can you tell me more?",
            "tags": ["anxiety", "work"]
        },
        {
            "user": "I'm having relationship problems",
            "agent": "Relationships can be challenging. What specific issues are you facing?",
            "tags": ["relationships", "conflict"]
        }
    ]
    
    for conv in test_conversations:
        memory.store_conversation(
            user_message=conv["user"],
            agent_response=conv["agent"],
            user_id="test_user",
            session_id="test_session",
            tags=conv["tags"],
            therapy_mode="cbt"
        )
        print(f"Stored: {conv['user'][:30]}...")
    
    # Test retrieval
    conversations = memory.get_recent_conversations("test_user", limit=5)
    print(f"Retrieved {len(conversations)} conversations")
    
    # Test tag search
    anxiety_conversations = memory.search_by_tags(["anxiety"], "test_user")
    print(f"Found {len(anxiety_conversations)} conversations with anxiety tag")
    
    print("✅ MemoryManager tests completed\n")

def test_knowledge_base():
    """Test psychological knowledge base"""
    print("🧪 Testing PsychologicalKnowledgeBase...")
    
    kb = PsychologicalKnowledgeBase()
    
    # Test technique retrieval
    for mode in ["cbt", "humanistic", "psychoanalytic"]:
        techniques = kb.get_techniques(mode)
        print(f"\n{mode.upper()} techniques:")
        for category, technique_list in techniques.items():
            print(f"  {category}: {len(technique_list)} techniques")
    
    # Test therapeutic responses
    test_contexts = ["anxiety", "depression", "relationship issues"]
    
    for context in test_contexts:
        for mode in ["cbt", "humanistic", "psychoanalytic"]:
            response = kb.get_therapeutic_response(mode, context)
            print(f"\n{mode.upper()} response to '{context}':")
            print(f"  {response[:100]}...")
    
    print("\n✅ PsychologicalKnowledgeBase tests completed\n")

def test_data_structures():
    """Test data structure and serialization"""
    print("🧪 Testing Data Structures...")
    
    # Test conversation log structure
    conversation_log = {
        "timestamp": datetime.now().isoformat(),
        "user_id": "test_user_123",
        "session_id": "session_20250115_140500",
        "user_message": "I feel overwhelmed with stress",
        "agent_response": "Stress can be really challenging. Let's break this down together.",
        "tags": ["stress", "overwhelmed"],
        "crisis_detected": False,
        "therapy_mode": "cbt"
    }
    
    # Test JSON serialization
    json_data = json.dumps(conversation_log, indent=2)
    print("Conversation log JSON:")
    print(json_data)
    
    # Test deserialization
    parsed_data = json.loads(json_data)
    print(f"\nParsed data - User ID: {parsed_data['user_id']}")
    print(f"Tags: {parsed_data['tags']}")
    print(f"Crisis detected: {parsed_data['crisis_detected']}")
    
    print("\n✅ Data structure tests completed\n")

def main():
    """Run all basic tests"""
    print("🧠 AI Psychologist - Basic Functionality Tests")
    print("=" * 60)
    print("Testing core components without OpenAI API...\n")
    
    try:
        test_crisis_detector()
        test_memory_manager()
        test_knowledge_base()
        test_data_structures()
        
        print("🎉 All basic tests completed successfully!")
        print("\nNext steps:")
        print("1. Set up your OpenAI API key in .env file")
        print("2. Run 'python simple_cli.py' for a test session")
        print("3. Run 'python ai_psychologist.py' for the full experience")
        
    except Exception as e:
        print(f"❌ Test failed with error: {e}")
        print("Please check your installation and try again.")

if __name__ == "__main__":
    main()
