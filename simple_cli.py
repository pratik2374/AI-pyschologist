"""
Simple CLI version of AI Psychologist for testing and development
"""

import os
from dotenv import load_dotenv
from ai_psychologist import AIPsychologist

def simple_cli():
    """Simple command-line interface for AI Psychologist"""
    
    # Load environment variables
    load_dotenv()
    
    print("🧠 AI Psychologist - Simple CLI Version")
    print("=" * 50)
    
    # Check for API key
    if not os.getenv("OPENAI_API_KEY"):
        print("❌ OPENAI_API_KEY not found in environment variables")
        print("Please create a .env file with your OpenAI API key:")
        print("OPENAI_API_KEY=your_api_key_here")
        return
    
    # Choose therapy mode
    print("\nChoose therapy mode:")
    print("1. CBT (Cognitive Behavioral Therapy)")
    print("2. Humanistic")
    print("3. Psychoanalytic")
    
    while True:
        choice = input("\nEnter choice (1-3) or 'q' to quit: ").strip()
        
        if choice.lower() == 'q':
            print("Goodbye! 👋")
            return
        
        if choice in ['1', '2', '3']:
            modes = ['cbt', 'humanistic', 'psychoanalytic']
            selected_mode = modes[int(choice) - 1]
            break
        else:
            print("Invalid choice. Please enter 1, 2, 3, or 'q'.")
    
    try:
        # Initialize AI Psychologist
        print(f"\n🔄 Initializing AI Psychologist in {selected_mode.upper()} mode...")
        psychologist = AIPsychologist(therapy_mode=selected_mode)
        print("✅ AI Psychologist initialized successfully!")
        
        # Start session
        user_id = input("\nEnter your user ID (or press Enter for default): ").strip()
        if not user_id:
            user_id = "default"
        
        psychologist.start_session(user_id)
        
        # Main conversation loop
        print("\n" + "="*50)
        print("Session started! Type 'quit' to end, 'summary' for summary, 'history' for history")
        print("="*50)
        
        while True:
            user_input = input("\nYou: ").strip()
            
            if user_input.lower() in ['quit', 'exit', 'bye', 'q']:
                print("\n🔄 Ending session...")
                break
            elif user_input.lower() == 'summary':
                summary = psychologist.get_session_summary()
                print(f"\n📋 Session Summary:\n{summary}")
                continue
            elif user_input.lower() == 'history':
                history = psychologist.get_conversation_history(5)
                if history:
                    print("\n📚 Recent Conversation History:")
                    for i, conv in enumerate(history, 1):
                        print(f"\n{i}. Time: {conv['timestamp'][:19]}")
                        print(f"   You: {conv['user_message'][:80]}...")
                        print(f"   AI: {conv['agent_response'][:80]}...")
                else:
                    print("\n📚 No conversation history available yet.")
                continue
            elif not user_input:
                continue
            
            # Process message
            print("\nAI Psychologist:")
            try:
                response = psychologist.process_message(user_input)
                print(response)
            except Exception as e:
                print(f"❌ Error: {e}")
                print("Please try again.")
        
        # Final summary
        if psychologist.current_session_id:
            final_summary = psychologist.get_session_summary()
            if final_summary and final_summary != "Session summary not available yet.":
                print(f"\n📋 Final Session Summary:\n{final_summary}")
        
        print("\n🙏 Thank you for your session. Take care! 🫂")
        
    except Exception as e:
        print(f"\n❌ Failed to initialize AI Psychologist: {e}")
        print("Please check your configuration and try again.")

if __name__ == "__main__":
    simple_cli()
