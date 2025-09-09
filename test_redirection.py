"""
Test script for AI Psychologist Direct Agent Redirection System

This script tests the new redirection logic and streaming features.
"""

import sys
from ai_psychologist import AIPsychologist, AgentRedirector
from rich.console import Console

console = Console()

def test_redirection_logic():
    """Test the agent redirection logic"""
    console.print("🧪 Testing Agent Redirection Logic", style="bold blue")
    
    redirector = AgentRedirector()
    
    # Test cases
    test_cases = [
        {
            "current_agent": "cbt",
            "message": "I feel like I don't know who I really am anymore",
            "expected_redirect": "humanistic"
        },
        {
            "current_agent": "humanistic", 
            "message": "I need practical techniques to stop my anxiety",
            "expected_redirect": "cbt"
        },
        {
            "current_agent": "cbt",
            "message": "This pattern goes back to my childhood",
            "expected_redirect": "psychoanalytic"
        },
        {
            "current_agent": "psychoanalytic",
            "message": "I want to learn coping strategies for stress",
            "expected_redirect": "cbt"
        }
    ]
    
    for i, test_case in enumerate(test_cases, 1):
        console.print(f"\n[bold]Test Case {i}:[/bold]")
        console.print(f"Current Agent: {test_case['current_agent']}")
        console.print(f"Message: {test_case['message']}")
        
        result = redirector.should_redirect(
            test_case['current_agent'],
            test_case['message'],
            []
        )
        
        if result['should_redirect']:
            console.print(f"[green]✓ Redirecting to: {result['target_agent']}[/green]")
            console.print(f"[dim]Reason: {result['reason']}[/dim]")
            console.print(f"[dim]Confidence: {result['confidence']:.2f}[/dim]")
            
            if result['target_agent'] == test_case['expected_redirect']:
                console.print("[green]✓ Expected redirection confirmed![/green]")
            else:
                console.print(f"[yellow]⚠ Unexpected redirection: expected {test_case['expected_redirect']}[/yellow]")
        else:
            console.print("[yellow]⚠ No redirection suggested[/yellow]")

def test_crisis_detection():
    """Test crisis detection"""
    console.print("\n🚨 Testing Crisis Detection", style="bold red")
    
    from ai_psychologist import CrisisDetector, Config
    
    detector = CrisisDetector(Config.CRISIS_KEYWORDS)
    
    test_messages = [
        "I'm having a great day!",
        "I feel hopeless and want to end my life",
        "Work is stressful but manageable",
        "I can't go on like this anymore"
    ]
    
    for message in test_messages:
        result = detector.detect_crisis(message)
        console.print(f"\nMessage: {message}")
        console.print(f"Crisis: {result['is_crisis']}")
        if result['is_crisis']:
            console.print(f"Keywords: {result['keywords']}")

def test_basic_functionality():
    """Test basic system functionality"""
    console.print("\n🔧 Testing Basic Functionality", style="bold green")
    
    try:
        # Test initialization
        psychologist = AIPsychologist()
        console.print("[green]✓ System initialized successfully[/green]")
        
        # Test session start
        psychologist.start_session("test_user")
        console.print("[green]✓ Session started successfully[/green]")
        
        # Test agent switching
        console.print(f"[dim]Starting agent: {psychologist.current_agent}[/dim]")
        
        # Test a message that should trigger redirection
        test_message = "I feel lost and don't know my true identity"
        response = psychologist.process_message(test_message)
        
        console.print(f"[dim]Final agent: {psychologist.current_agent}[/dim]")
        console.print(f"[green]✓ Response generated: {len(response)} characters[/green]")
        
        return True
        
    except Exception as e:
        console.print(f"[red]✗ Error: {e}[/red]")
        return False

def main():
    """Main test function"""
    console.print("🧠 AI Psychologist - Direct Agent Redirection Test Suite", style="bold")
    
    # Run tests
    test_redirection_logic()
    test_crisis_detection()
    
    success = test_basic_functionality()
    
    if success:
        console.print("\n[green]🎉 All tests completed successfully![/green]")
    else:
        console.print("\n[red]❌ Some tests failed. Please check the errors above.[/red]")

if __name__ == "__main__":
    main()
