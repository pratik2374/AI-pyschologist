"""
Simple CLI for AI Psychologist Multi-Agent System

A streamlined command-line interface for the AI Psychologist
with direct agent redirection and streaming responses for fast inference.
"""

import sys
from ai_psychologist import AIPsychologist
from rich.console import Console
from rich.panel import Panel
from rich.prompt import Prompt
from rich.text import Text
from rich.live import Live
from rich.spinner import Spinner
from rich.progress import Progress, SpinnerColumn, TextColumn

console = Console()

def print_welcome():
    """Display welcome message"""
    welcome_text = Text()
    welcome_text.append("🧠 AI Psychologist - Direct Agent Redirection\n\n", style="bold blue")
    welcome_text.append("Powered by Agno Framework with intelligent redirection:\n", style="dim")
    welcome_text.append("• CBT Specialist - Practical coping strategies\n", style="cyan")
    welcome_text.append("• Humanistic Specialist - Self-discovery & growth\n", style="green")
    welcome_text.append("• Psychoanalytic Specialist - Pattern recognition\n", style="yellow")
    welcome_text.append("• Smart Redirection - Automatic agent switching\n", style="bold magenta")
    
    console.print(Panel(
        welcome_text,
        title="Welcome",
        border_style="blue"
    ))

def print_help():
    """Display help information"""
    help_text = """
Available Commands:
• Type your message to start a therapy session
• 'summary' - Get session summary
• 'history' - View conversation history
• 'agent' - Show current agent status
• 'help' - Show this help message
• 'quit' or 'exit' - End session

Special Features:
• Crisis detection with immediate response
• Automatic agent redirection for optimal care
• Session memory and tracking
• Fast inference with specialized agents
• Streaming-like responses for real-time interaction
    """
    
    console.print(Panel(
        help_text,
        title="Help",
        border_style="green"
    ))

def main():
    """Main CLI function"""
    print_welcome()
    
    # Initialize AI Psychologist
    try:
        psychologist = AIPsychologist()
        console.print("[green]✓ Direct agent redirection system initialized[/green]")
    except Exception as e:
        console.print(f"[red]✗ Failed to initialize: {e}[/red]")
        console.print("[yellow]Please check your configuration and try again.[/yellow]")
        return
    
    # Get user ID
    user_id = Prompt.ask(
        "\nEnter your user ID", 
        default="user_001")
    
    # Start session
    psychologist.start_session(user_id)
    console.print("\n[dim]Type 'help' for available commands[/dim]")
    
    # Main conversation loop
    try:
        while True:
            user_input = Prompt.ask("\n[bold blue]You[/bold blue]")
            
            if user_input.lower() in ['quit', 'exit', 'bye']:
                console.print("[yellow]Ending session...[/yellow]")
                break
            elif user_input.lower() == 'help':
                print_help()
                continue
            elif user_input.lower() == 'summary':
                console.print("\n[bold cyan]Requesting session summary...[/bold cyan]")
                try:
                    summary = psychologist._get_current_agent().run(
                        "Please provide a session summary",
                        user_id=psychologist.user_id,
                        session_id=psychologist.current_session_id
                    )
                    console.print(Panel(
                        summary.content,
                        title="Session Summary",
                        border_style="cyan"
                    ))
                except Exception as e:
                    console.print(f"[red]Error getting summary: {e}[/red]")
                continue
            elif user_input.lower() == 'history':
                console.print("\n[bold cyan]Requesting conversation history...[/bold cyan]")
                try:
                    history = psychologist._get_current_agent().run(
                        "Please provide conversation history",
                        user_id=psychologist.user_id,
                        session_id=psychologist.current_session_id
                    )
                    console.print(Panel(
                        history.content,
                        title="Conversation History",
                        border_style="cyan"
                    ))
                except Exception as e:
                    console.print(f"[red]Error getting history: {e}[/red]")
                continue
            elif user_input.lower() == 'agent':
                status = psychologist.get_current_agent_status()
                console.print(Panel(
                    status,
                    title="Agent Status",
                    border_style="cyan"
                ))
                continue
            
            # Process message
            console.print("\n[bold green]AI Psychologist[/bold green]")
            
            # Show current agent
            console.print(f"[dim]🤖 {psychologist.current_agent.upper()} Specialist[/dim]")
            
            # Process message with streaming-like response
            with Live(Spinner("dots"), console=console, refresh_per_second=10):
                response = psychologist.process_message(user_input)
            
            console.print(response)
            
    except KeyboardInterrupt:
        console.print("\n[yellow]Session interrupted by user.[/yellow]")
    except Exception as e:
        console.print(f"\n[red]Unexpected error: {e}[/red]")
    finally:
        console.print("[green]Thank you for your session. Take care! 🫂[/green]")

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        console.print(f"[red]Fatal error: {e}[/red]")
        sys.exit(1)
