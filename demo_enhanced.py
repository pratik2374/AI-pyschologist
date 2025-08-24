#!/usr/bin/env python3
"""
Enhanced AI Psychologist Demo

This demo showcases the new features:
- Automatic therapy mode determination after 2-3 conversations
- Separate crisis response agent with soothing tone
- Real-time mode switching based on conversation patterns
"""

from ai_psychologist import AIPsychologist
from rich.console import Console
from rich.panel import Panel
from rich.prompt import Prompt

console = Console()

def demo_mode_determination():
    """Demo the automatic therapy mode determination"""
    console.print(Panel(
        "🧠 Enhanced AI Psychologist Demo\n"
        "Automatic Therapy Mode Determination\n\n"
        "This demo will show how the AI automatically determines\n"
        "the optimal therapy mode based on conversation patterns.",
        title="Demo Mode",
        border_style="green"
    ))
    
    # Initialize with CBT mode
    psychologist = AIPsychologist(therapy_mode="cbt")
    psychologist.start_session("demo_user")
    
    # Demo conversation flow
    demo_conversations = [
        "I've been feeling really anxious about my job lately. I can't stop worrying about making mistakes.",
        "I think my childhood experiences with my parents might be affecting my relationships now.",
        "I want to learn practical techniques to manage my stress and anxiety."
    ]
    
    console.print("\n[bold cyan]Starting Demo Conversations:[/bold cyan]")
    
    for i, message in enumerate(demo_conversations, 1):
        console.print(f"\n[bold blue]Demo Message {i}:[/bold blue] {message}")
        
        # Process message
        response = psychologist.process_message(message)
        console.print(f"\n[bold green]AI Response {i}:[/bold green] {response[:200]}...")
        
        # Show current status
        console.print(f"\n[dim]Conversation Count: {psychologist.conversation_count}[/dim]")
        console.print(f"[dim]Current Mode: {psychologist.therapy_mode.upper()}[/dim]")
        
        if i < len(demo_conversations):
            input("\nPress Enter to continue to next conversation...")
    
    # Final summary
    console.print(Panel(
        f"Demo Complete!\n\n"
        f"Final Therapy Mode: {psychologist.therapy_mode.upper()}\n"
        f"Initial Mode: {psychologist.initial_therapy_mode.upper()}\n"
        f"Total Conversations: {psychologist.conversation_count}\n\n"
        f"The AI automatically determined the optimal therapy approach\n"
        f"based on the conversation patterns and user needs.",
        title="Demo Results",
        border_style="green"
    ))

def demo_crisis_response():
    """Demo the enhanced crisis response system"""
    console.print(Panel(
        "🚨 Crisis Response Demo\n"
        "Enhanced Soothing Crisis Intervention\n\n"
        "This demo shows the new crisis response agent\n"
        "with a more soothing and gradual approach.",
        title="Crisis Demo",
        border_style="red"
    ))
    
    psychologist = AIPsychologist(therapy_mode="cbt")
    psychologist.start_session("crisis_demo_user")
    
    # Demo crisis message
    crisis_message = "I've been thinking about ending my life. I just can't take it anymore."
    
    console.print(f"\n[bold red]Crisis Message:[/bold red] {crisis_message}")
    console.print("\n[bold green]AI Crisis Response:[/bold green]")
    
    response = psychologist.process_message(crisis_message)
    console.print(response)
    
    console.print(Panel(
        "Notice how the crisis response:\n"
        "• Starts with empathy and validation\n"
        "• Uses a soothing, caring tone\n"
        "• Gradually guides toward professional help\n"
        "• Provides specific, actionable steps\n"
        "• Shows genuine care and concern",
        title="Crisis Response Features",
        border_style="yellow"
    ))

def main():
    """Main demo function"""
    console.print(Panel(
        "🧠 Enhanced AI Psychologist Demo Suite\n"
        "Powered by Agno Framework\n\n"
        "Choose a demo to run:",
        title="Welcome",
        border_style="blue"
    ))
    
    choice = Prompt.ask(
        "Select demo",
        choices=["1", "2", "3"],
        default="1"
    )
    
    if choice == "1":
        demo_mode_determination()
    elif choice == "2":
        demo_crisis_response()
    elif choice == "3":
        console.print("[yellow]Running both demos...[/yellow]")
        demo_mode_determination()
        console.print("\n" + "="*50 + "\n")
        demo_crisis_response()
    
    console.print("\n[green]Demo completed! Thank you for exploring the Enhanced AI Psychologist! 🫂[/green]")

if __name__ == "__main__":
    main()
