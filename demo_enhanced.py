#!/usr/bin/env python3
"""
Enhanced Demo for AI Psychologist Direct Agent Redirection System

This demo showcases the direct agent-to-agent redirection approach with:
- Crisis detection
- Automatic agent redirection
- Session management
- Memory tracking
- Streaming-like responses
"""

from ai_psychologist import AIPsychologist
from rich.console import Console
from rich.panel import Panel
from rich.prompt import Prompt
from rich.live import Live
from rich.spinner import Spinner

console = Console()

def demo_crisis_detection():
    """Demonstrate crisis detection capabilities"""
    console.print(Panel(
        "🚨 Testing Crisis Detection System",
        title="Crisis Detection Demo",
        border_style="red"
    ))
    
    psychologist = AIPsychologist()
    
    # Test crisis detection
    test_messages = [
        "I'm feeling really hopeless today",
        "I just want to end my life",
        "I'm having a great day!",
        "I can't go on like this anymore"
    ]
    
    for message in test_messages:
        console.print(f"\n[bold blue]Test Message:[/bold blue] {message}")
        crisis_info = psychologist.crisis_detector.detect_crisis(message)
        console.print(f"[bold red]Crisis Detected:[/bold red] {crisis_info['is_crisis']}")
        if crisis_info['is_crisis']:
            console.print(f"[yellow]Keywords:[/yellow] {crisis_info['keywords']}")
            response = psychologist.crisis_detector.get_crisis_response()
            console.print(f"[green]Response:[/green] {response[:200]}...")

def demo_agent_redirection():
    """Demonstrate direct agent redirection"""
    console.print(Panel(
        "🔄 Testing Direct Agent Redirection",
        title="Agent Redirection Demo",
        border_style="blue"
    ))
    
    psychologist = AIPsychologist()
    psychologist.start_session("demo_user")
    
    # Test different types of messages to see redirection
    test_scenarios = [
        ("I keep having negative thoughts about myself", "CBT - Cognitive patterns"),
        ("I feel like I don't know who I really am", "Humanistic - Self-discovery"),
        ("I notice I keep having the same relationship problems", "Psychoanalytic - Patterns"),
        ("I'm anxious about my upcoming presentation", "CBT - Practical coping"),
        ("I want to find meaning in my life", "Humanistic - Purpose exploration"),
        ("My childhood experiences still affect me today", "Psychoanalytic - Early influences")
    ]
    
    for message, expected_mode in test_scenarios:
        console.print(f"\n[bold blue]User:[/bold blue] {message}")
        console.print(f"[dim]Expected Mode:[/dim] {expected_mode}")
        console.print(f"[dim]Current Agent:[/dim] {psychologist.current_agent.upper()}")
        
        try:
            with Live(Spinner("dots"), console=console, refresh_per_second=10):
                response = psychologist.process_message(message)
            
            console.print(f"[bold green]AI Response:[/bold green] {response[:300]}...")
            console.print(f"[dim]Final Agent:[/dim] {psychologist.current_agent.upper()}")
            
        except Exception as e:
            console.print(f"[red]Error: {e}[/red]")

def demo_session_management():
    """Demonstrate session management features"""
    console.print(Panel(
        "📋 Testing Session Management",
        title="Session Management Demo",
        border_style="green"
    ))
    
    psychologist = AIPsychologist()
    psychologist.start_session("demo_user")
    
    # Simulate a conversation with redirections
    messages = [
        "I've been feeling stressed at work lately",
        "I think it's affecting my sleep",
        "I want to learn better coping strategies",
        "But I also feel like I'm losing my sense of self",
        "Maybe it goes back to how I was raised"
    ]
    
    for i, message in enumerate(messages, 1):
        console.print(f"\n[bold blue]Message {i}:[/bold blue] {message}")
        console.print(f"[dim]Agent Before:[/dim] {psychologist.current_agent.upper()}")
        
        with Live(Spinner("dots"), console=console, refresh_per_second=10):
            response = psychologist.process_message(message)
        
        console.print(f"[dim]Agent After:[/dim] {psychologist.current_agent.upper()}")
        console.print(f"[bold green]Response:[/bold green] {response[:200]}...")
    
    # Test agent status
    console.print("\n[bold cyan]Current Agent Status:[/bold cyan]")
    status = psychologist.get_current_agent_status()
    console.print(Panel(status, title="Agent Status", border_style="cyan"))

def demo_streaming_features():
    """Demonstrate streaming-like response features"""
    console.print(Panel(
        "⚡ Testing Streaming Response Features",
        title="Streaming Demo",
        border_style="yellow"
    ))
    
    psychologist = AIPsychologist()
    psychologist.start_session("demo_user")
    
    # Test a longer message to show streaming effect
    test_message = "I've been struggling with anxiety for months now. It started when I got promoted at work, and now I can't stop worrying about everything. I think it's affecting my relationships too, because I'm always on edge. I want to find better ways to cope, but I also feel like there might be deeper issues from my childhood that I need to explore."
    
    console.print(f"[bold blue]Long Test Message:[/bold blue] {test_message}")
    console.print(f"[dim]Starting Agent:[/dim] {psychologist.current_agent.upper()}")
    
    console.print("\n[bold green]Processing with streaming effect...[/bold green]")
    
    with Live(Spinner("dots"), console=console, refresh_per_second=10):
        response = psychologist.process_message(test_message)
    
    console.print(f"[dim]Final Agent:[/dim] {psychologist.current_agent.upper()}")
    console.print(f"[bold green]Response:[/bold green] {response[:400]}...")

def main():
    """Main demo function"""
    console.print(Panel(
        "🧠 AI Psychologist Direct Agent Redirection Demo\n\n"
        "This demo showcases the new direct agent redirection system with:\n"
        "• Crisis detection and response\n"
        "• Automatic agent redirection\n"
        "• Session management and memory\n"
        "• Streaming-like responses\n"
        "• Fast inference capabilities",
        title="Welcome to the Enhanced Demo",
        border_style="green"
    ))
    
    while True:
        choice = Prompt.ask(
            "\nChoose a demo",
            choices=["1", "2", "3", "4", "quit"],
            default="1"
        )
        
        if choice == "1":
            demo_crisis_detection()
        elif choice == "2":
            demo_agent_redirection()
        elif choice == "3":
            demo_session_management()
        elif choice == "4":
            demo_streaming_features()
        elif choice == "quit":
            break
    
    console.print("[green]Demo completed! Thank you for testing the AI Psychologist system.[/green]")

if __name__ == "__main__":
    main()
