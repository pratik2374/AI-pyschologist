"""
AI Psychologist App using Agno Framework

A multi-layered psychological AI agent with:
- CRISIS safeguards for emergency detection
- Direct agent-to-agent redirection for optimal therapy
- Integrated session history and memory tracking
- Specialized CBT, Humanistic, and Psychoanalytic therapy modes
- Streaming responses for real-time interaction
"""

import json
import sqlite3
from datetime import datetime
from typing import Dict, List, Any, Generator
import asyncio

from agno.agent import Agent
from agno.models.openai import OpenAIChat
from agno.storage.sqlite import SqliteStorage
from agno.memory.v2.db.sqlite import SqliteMemoryDb
from agno.memory.v2.memory import Memory
from agno.tools import tool
from rich.console import Console
from rich.panel import Panel
from rich.prompt import Prompt
from rich.live import Live
from rich.text import Text
from rich.spinner import Spinner
from langsmith import traceable
from dotenv import load_dotenv

load_dotenv()

# --- CONFIGURATION ---
class Config:
    CRISIS_KEYWORDS = [
        "kill myself", "suicide", "want to die", "end my life",
        "self-harm", "hopeless", "can't go on", "no reason to live",
        "better off dead", "hurt myself", "end it all"
    ]
    
    # Agent redirection keywords for faster inference
    REDIRECTION_KEYWORDS = {
        "cbt": ["thoughts", "thinking", "behavior", "coping", "anxiety", "depression", "stress", "patterns", "change", "techniques", "manage", "control", "strategies", "tools", "skills", "practice", "exercise", "homework", "routine", "habit"],
        "humanistic": ["feelings", "emotions", "self", "identity", "growth", "meaning", "purpose", "relationships", "acceptance", "authenticity", "values", "beliefs", "spirituality", "connection", "belonging", "potential", "freedom", "choice"],
        "psychoanalytic": ["childhood", "past", "patterns", "relationships", "unconscious", "defense", "transference", "early", "family", "recurring", "dreams", "memories", "trauma", "attachment", "dynamics", "conflict", "repression", "projection"]
    }
    
    @staticmethod
    def validate():
        pass

# --- INITIALIZE CONSOLE ---
console = Console()

# --- CRISIS DETECTION ---
@traceable(name="CrisisDetector")
class CrisisDetector:
    def __init__(self, crisis_keywords: List[str]):
        self.crisis_keywords = [kw.lower() for kw in crisis_keywords]
    
    def detect_crisis(self, message: str) -> Dict[str, Any]:
        message_lower = message.lower()
        detected_keywords = [kw for kw in self.crisis_keywords if kw in message_lower]
        return {
            "is_crisis": len(detected_keywords) > 0,
            "keywords": detected_keywords,
            "severity": "high" if detected_keywords else "low"
        }
    
    def get_crisis_response(self) -> str:
        return """🚨 **CRISIS DETECTED - IMMEDIATE ACTION REQUIRED** 🚨
This sounds very serious, and I care about your safety. I am an AI and cannot provide the professional help you need right now.
**PLEASE REACH OUT FOR HELP IMMEDIATELY:**
1. **Call a crisis helpline in India:**
    • Vandrevala Foundation: 9999666555 (24/7)
    • iCALL Helpline: 022-25521111 (Mon-Sat, 10 AM - 8 PM)
    • AASRA: 9820466726 (24/7)
2. **Emergency Services:** Call 112
3. **Reach out to a licensed mental health professional.**
Your life has value, and there are people who want to help you."""

# --- MEMORY MANAGEMENT ---
class MemoryManager:
    def __init__(self, db_file: str = "psychologist_memory.db"):
        self.db_file = db_file
        self.setup_database()
    
    @traceable(name="setup_database")
    def setup_database(self):
        with sqlite3.connect(self.db_file) as conn:
            cursor = conn.cursor()
            
            # Check if redirected_from column exists
            cursor.execute("PRAGMA table_info(conversation_logs)")
            columns = [column[1] for column in cursor.fetchall()]
            
            if 'redirected_from' not in columns:
                # Create table with redirected_from column
                cursor.execute('''CREATE TABLE IF NOT EXISTS conversation_logs (
                    id INTEGER PRIMARY KEY, timestamp TEXT, user_id TEXT, session_id TEXT,
                    user_message TEXT, agent_response TEXT, tags TEXT,
                    crisis_detected BOOLEAN, therapy_mode TEXT, redirected_from TEXT)''')
            else:
                # Create table without redirected_from column (for existing databases)
                cursor.execute('''CREATE TABLE IF NOT EXISTS conversation_logs (
                    id INTEGER PRIMARY KEY, timestamp TEXT, user_id TEXT, session_id TEXT,
                    user_message TEXT, agent_response TEXT, tags TEXT,
                    crisis_detected BOOLEAN, therapy_mode TEXT)''')
    
    def upgrade_database_schema(self):
        """Upgrade existing database to include redirected_from column if needed"""
        with sqlite3.connect(self.db_file) as conn:
            cursor = conn.cursor()
            
            # Check if redirected_from column exists
            cursor.execute("PRAGMA table_info(conversation_logs)")
            columns = [column[1] for column in cursor.fetchall()]
            
            if 'redirected_from' not in columns:
                try:
                    # Add the redirected_from column to existing table
                    cursor.execute("ALTER TABLE conversation_logs ADD COLUMN redirected_from TEXT")
                    conn.commit()
                    print("✓ Database schema upgraded successfully")
                except Exception as e:
                    print(f"⚠ Could not upgrade schema: {e}")
                    print("Continuing with existing schema...")
            else:
                print("✓ Database schema is up to date")
    
    @traceable(name="store_conversation")
    def store_conversation(self, user_message: str, agent_response: str,
                           user_id: str = "default", session_id: str = "default",
                           tags: List[str] = None, crisis_detected: bool = False,
                           therapy_mode: str = "dynamic", redirected_from: str = None):
        with sqlite3.connect(self.db_file) as conn:
            cursor = conn.cursor()
            tags_json = json.dumps(tags or [])
            
            # Check if redirected_from column exists
            cursor.execute("PRAGMA table_info(conversation_logs)")
            columns = [column[1] for column in cursor.fetchall()]
            
            if 'redirected_from' in columns:
                # Use the new schema with redirected_from
                cursor.execute('''INSERT INTO conversation_logs 
                    (timestamp, user_id, session_id, user_message, agent_response, tags, crisis_detected, therapy_mode, redirected_from)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)''',
                    (datetime.now().isoformat(), user_id, session_id,
                     user_message, agent_response, tags_json, crisis_detected, therapy_mode, redirected_from))
            else:
                # Use the old schema without redirected_from
                cursor.execute('''INSERT INTO conversation_logs 
                    (timestamp, user_id, session_id, user_message, agent_response, tags, crisis_detected, therapy_mode)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)''',
                    (datetime.now().isoformat(), user_id, session_id,
                     user_message, agent_response, tags_json, crisis_detected, therapy_mode))
    
    def get_recent_conversations(self, user_id: str = "default", limit: int = 5) -> List[Dict]:
        with sqlite3.connect(self.db_file) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute('SELECT * FROM conversation_logs WHERE user_id = ? ORDER BY timestamp DESC LIMIT ?', (user_id, limit))
            return [dict(row) for row in cursor.fetchall()]

# --- AI PSYCHOLOGIST CLASS ---
@traceable(name="AIPsychologist")
class AIPsychologist:
    def __init__(self):
        Config.validate()
        
        self.crisis_detector = CrisisDetector(Config.CRISIS_KEYWORDS)
        self.memory_manager = MemoryManager()
        
        # Automatically upgrade database schema if needed
        self.memory_manager.upgrade_database_schema()
        
        self.storage = SqliteStorage(table_name="psychologist_sessions", db_file="psychologist_sessions.db")
        self.memory = Memory(
            model=OpenAIChat(id="gpt-4o-mini"),
            db=SqliteMemoryDb(table_name="user_memories", db_file="psychologist_memory.db")
        )

        self.current_session_id = None
        self.user_id = "default"
        self.session_count = 0
        self.current_agent = "humanistic"  # Start with Humanistic as default
        self.conversation_context = []
        self.redirection_keywords = Config.REDIRECTION_KEYWORDS
        self.redirection_history = {}  # Track redirections to avoid loops

        # --- TOOLS ---
        @tool
        def get_session_summary() -> str:
            if not self.current_session_id:
                return "No active session."
            summary = self.memory.get_session_summary(user_id=self.user_id, session_id=self.current_session_id)
            if summary and getattr(summary, "summary", None):
                return f"📋 Session Summary:\n{summary.summary}"
            recent = self.memory_manager.get_recent_conversations(user_id=self.user_id, limit=5)
            if not recent:
                return "No session summary available yet."
            bullets = []
            for row in reversed(recent):
                u = (row.get("user_message") or "").strip().replace("\n", " ")
                a = (row.get("agent_response") or "").strip().replace("\n", " ")
                if u:
                    bullets.append(f"- User: {u[:100]}{'...' if len(u) > 100 else ''}")
                if a:
                    bullets.append(f"  AI: {a[:100]}{'...' if len(a) > 100 else ''}")
                if len(bullets) >= 8:
                    break
            return "📋 Session Summary:\n" + "\n".join(bullets)

        @tool
        def get_conversation_history(limit: int = 5) -> str:
            conversations = self.memory_manager.get_recent_conversations(user_id=self.user_id, limit=limit)
            if not conversations:
                return "No previous conversations found."
            history = "Recent Conversation History:\n"
            for i, conv in enumerate(conversations, 1):
                history += f"\n{i}. User: {conv['user_message'][:100]}...\n"
                history += f"   Response: {conv['agent_response'][:100]}...\n"
            return history

        agent_tools = [get_session_summary, get_conversation_history]

        # --- CBT AGENT ---
        self.cbt_agent = Agent(
            name="CBT Specialist",
            model=OpenAIChat(id="gpt-4o-mini"),
            role="Expert in Cognitive Behavioral Therapy for practical coping strategies.",
            tools=agent_tools,
            storage=self.storage,
            instructions=[
                "You are Dr. Sarah Chen, a licensed CBT therapist.",
                "Be warm, empathetic, and concise.",
                "Steps:",
                "1. Validate the user's emotions with empathy.",
                "2. Explain the connection between their thoughts, feelings, and behaviors.",
                "3. Introduce one simple CBT technique.",
                "4. Suggest a small actionable practice task.",
                "Keep responses focused, supportive, and jargon-free.",
                "If you notice the conversation shifting to emotional exploration or identity issues, consider redirecting to the Humanistic specialist.",
                "If you detect recurring patterns or childhood influences, consider redirecting to the Psychoanalytic specialist."
            ]
        )

        # --- HUMANISTIC AGENT ---
        self.humanistic_agent = Agent(
            name="Humanistic Specialist",
            model=OpenAIChat(id="gpt-4o-mini"),
            role="A compassionate therapist focusing on self-discovery and acceptance, with ability to redirect to specialized care.",
            tools=agent_tools,
            storage=self.storage,
            instructions=[
                "You are Dr. Michael Rodriguez, a licensed Humanistic therapist.",
                "Provide unconditional positive regard and empathetic reflections.",
                "Steps:",
                "1. Deeply validate their emotions and experiences.",
                "2. Reflect back their experiences to show understanding.",
                "3. Ask open-ended self-discovery questions.",
                "4. Reinforce self-worth and capacity for growth.",
                "5. Assess if specialized care would be beneficial.",
                "Redirection Guidelines:",
                "- Redirect to CBT Specialist when clients need practical coping strategies, anxiety management, thought restructuring, or behavioral techniques.",
                "- Redirect to Psychoanalytic Specialist when clients show recurring patterns, childhood influences, family dynamics, or unconscious processes.",
                "- Stay with Humanistic approach for identity exploration, emotional validation, meaning-making, and relationship growth.",
                "Be warm, empathetic, and always consider the client's best therapeutic path."
            ]
        )

        # --- PSYCHOANALYTIC AGENT ---
        self.psychoanalytic_agent = Agent(
            name="Psychoanalytic Specialist",
            model=OpenAIChat(id="gpt-4o-mini"),
            role="Expert therapist uncovering hidden patterns and early-life influences.",
            tools=agent_tools,
            storage=self.storage,
            instructions=[
                "You are Dr. Elena Petrov, a licensed Psychoanalytic therapist.",
                "Use a reflective and exploratory tone.",
                "Steps:",
                "1. Acknowledge the user's feelings with curiosity.",
                "2. Highlight subtle recurring patterns you notice.",
                "3. Ask open-ended questions linking past and present.",
                "4. Guide them towards deeper self-awareness.",
                "If you notice the conversation shifting to practical coping strategies or thought patterns, consider redirecting to the CBT specialist.",
                "If you detect the conversation shifting to emotional validation or self-discovery, consider redirecting to the Humanistic specialist."
            ]
        )

    def _should_redirect(self, current_agent: str, message: str, conversation_context: List[Dict]) -> Dict[str, Any]:
        """Determine if redirection to another agent is beneficial"""
        message_lower = message.lower()
        
        # Debug: Show what's being checked
        console.print(f"[dim]🔍 Checking redirection for: {current_agent.upper()}[/dim]")
        console.print(f"[dim]📝 Message: {message[:50]}...[/dim]")
        
        # Check for redirection keywords
        for target_agent, keywords in self.redirection_keywords.items():
            if target_agent != current_agent:
                keyword_matches = [kw for kw in keywords if kw in message_lower]
                if keyword_matches:
                    console.print(f"[dim]🎯 Found {target_agent.upper()} keywords: {', '.join(keyword_matches)}[/dim]")
                    # Check if this would be a beneficial redirection
                    if self._is_beneficial_redirection(current_agent, target_agent, message, conversation_context):
                        console.print(f"[dim]✅ Redirection approved to {target_agent.upper()}[/dim]")
                        return {
                            "should_redirect": True,
                            "target_agent": target_agent,
                            "reason": f"Detected {target_agent.upper()} keywords: {', '.join(keyword_matches)}",
                            "confidence": len(keyword_matches) / len(keywords)
                        }
                    else:
                        console.print(f"[dim]❌ Redirection rejected to {target_agent.upper()}[/dim]")
        
        console.print(f"[dim]🔄 No redirection needed[/dim]")
        return {"should_redirect": False}
    
    def _is_beneficial_redirection(self, from_agent: str, to_agent: str, message: str, context: List[Dict]) -> bool:
        """Determine if redirection would be beneficial based on context"""
        
        # Avoid redirection loops
        if len(context) > 0:
            last_agent = context[-1].get('therapy_mode', 'unknown')
            if last_agent == to_agent:
                return False
        
        # Use the same keywords as the main redirection logic
        message_content = message.lower()
        
        if to_agent == "cbt":
            cbt_indicators = self.redirection_keywords["cbt"]
            return any(indicator in message_content for indicator in cbt_indicators)
        
        elif to_agent == "humanistic":
            humanistic_indicators = self.redirection_keywords["humanistic"]
            return any(indicator in message_content for indicator in humanistic_indicators)
        
        elif to_agent == "psychoanalytic":
            psychoanalytic_indicators = self.redirection_keywords["psychoanalytic"]
            return any(indicator in message_content for indicator in psychoanalytic_indicators)
        
        return False

    def start_session(self, user_id: str = None):
        if user_id:
            self.user_id = user_id
        self.current_session_id = f"session_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        self.session_count += 1
        self.current_agent = "humanistic"  # Reset to default agent
        self.conversation_context = []
        
        console.print(Panel(
            f"🫂 Welcome to your AI Therapy Session #{self.session_count}\n"
            f"**Current Agent:** {self.current_agent.upper()}\n"
            f"Session ID: {self.current_session_id}\n\n"
            "💡 Agents will automatically redirect to the best specialist for your needs.\n"
            "Type 'quit', 'summary', 'history', or 'agent' for current agent status.",
            title="AI Psychologist Session Started",
            border_style="blue"
        ))

    def _get_current_agent(self) -> Agent:
        """Get the currently active therapy agent"""
        if self.current_agent == "cbt":
            return self.cbt_agent
        elif self.current_agent == "humanistic":
            return self.humanistic_agent
        elif self.current_agent == "psychoanalytic":
            return self.psychoanalytic_agent
        else:
            return self.cbt_agent  # Default fallback
        
    @traceable(name="Response time")
    def _stream_response(self, agent: Agent, message: str) -> Generator[str, None, None]:
        """Stream the agent's response for real-time interaction"""
        try:
            # Use the agent's streaming capability if available
            response = agent.run(message, user_id=self.user_id, session_id=self.current_session_id)
            
            # Simulate streaming by yielding words with small delays
            words = response.content.split()
            for i, word in enumerate(words):
                yield word + (" " if i < len(words) - 1 else "")
                # Small delay for realistic streaming effect
                if i % 3 == 0:  # Yield every 3rd word
                    yield ""  # Empty yield for smooth streaming
                    
        except Exception as e:
            yield f"Error generating response: {e}"

    @traceable(run_type="chain", name="AIPsychologist.process_message")
    def process_message(self, user_message: str) -> str:
        crisis_info = self.crisis_detector.detect_crisis(user_message)
        if crisis_info["is_crisis"]:
            crisis_response = self.crisis_detector.get_crisis_response()
            self.memory_manager.store_conversation(
                user_message=user_message, agent_response=crisis_response,
                user_id=self.user_id, session_id=self.current_session_id,
                tags=crisis_info["keywords"], crisis_detected=True)
            return crisis_response

        # Check if redirection is needed using internal method
        redirection_info = self._should_redirect(
            self.current_agent, user_message, self.conversation_context
        )
        
        old_agent = self.current_agent
        if redirection_info["should_redirect"]:
            self.current_agent = redirection_info["target_agent"]
            console.print(f"[yellow]🔄 Redirecting from {old_agent.upper()} to {self.current_agent.upper()}[/yellow]")
            console.print(f"[dim]Reason: {redirection_info['reason']}[/dim]")

        # Get response from current agent
        try:
            current_agent = self._get_current_agent()
            response = current_agent.run(user_message, user_id=self.user_id, session_id=self.current_session_id)
            agent_response = response.content
            
            # Store conversation with redirection info
            self.memory_manager.store_conversation(
                user_message=user_message, agent_response=agent_response,
                user_id=self.user_id, session_id=self.current_session_id,
                tags=self._extract_tags(user_message),
                therapy_mode=self.current_agent,
                redirected_from=old_agent if old_agent != self.current_agent else None
            )
            
            # Update conversation context
            self.conversation_context.append({
                "user_message": user_message,
                "agent_response": agent_response,
                "therapy_mode": self.current_agent,
                "timestamp": datetime.now().isoformat()
            })
            
            return agent_response
            
        except Exception as e:
            console.print(f"[red]Error generating response: {e}[/red]")
            return "I'm experiencing technical difficulties. Please try again."

    def get_current_agent_status(self) -> str:
        """Get current agent status and redirection information"""
        status = f"**Current Agent:** {self.current_agent.upper()}\n\n"
        
        if self.conversation_context:
            recent_agents = [ctx.get('therapy_mode', 'unknown') for ctx in self.conversation_context[-3:]]
            status += f"**Recent Agents:** {' → '.join(recent_agents)}\n\n"
        
        status += "**Agent Specializations:**\n"
        status += "• **CBT**: Practical coping, thought patterns, anxiety/depression\n"
        status += "• **Humanistic**: Self-discovery, emotional validation, growth\n"
        status += "• **Psychoanalytic**: Pattern recognition, childhood influences\n\n"
        
        status += "**Redirection Logic:**\n"
        status += "Agents automatically redirect to the best specialist based on your needs."
        
        return status

    def _extract_tags(self, message: str) -> List[str]:
        tags = []
        message_lower = message.lower()
        tag_map = {
            "anxiety": ["anxious", "anxiety", "worried", "stress"],
            "depression": ["sad", "depressed", "hopeless"],
            "anger": ["angry", "frustrated", "mad"],
            "relationships": ["partner", "family", "friend"],
            "work": ["work", "job", "career"]
        }
        for tag, keywords in tag_map.items():
            if any(word in message_lower for word in keywords):
                tags.append(tag)
        return tags

# --- APPLICATION ENTRY POINT ---
@traceable(name="main")
def main():
    console.print(Panel(
        "🧠 **AI Psychologist App**\n"
        "Powered by Direct Agent Redirection\n\n"
        "**Not a replacement for professional mental health care.**",
        title="Welcome",
        border_style="green"
    ))
    try:
        psychologist = AIPsychologist()
        console.print("[green]✓ Multi-agent system with direct redirection initialized[/green]")
    except Exception as e:
        console.print(f"[red]✗ Failed to initialize AI Psychologist: {e}[/red]")
        return
    
    user_id = Prompt.ask("Enter your user ID (or press Enter for default)", default="default")
    psychologist.start_session(user_id)
    try:
        while True:
            user_input = Prompt.ask("\n[bold blue]You[/bold blue]")
            if user_input.lower() in ['quit', 'exit', 'bye']:
                console.print("[yellow]Ending session...[/yellow]")
                break
            elif user_input.lower() == 'summary':
                summary = psychologist._get_current_agent().run("Please provide a session summary", user_id=psychologist.user_id, session_id=psychologist.current_session_id)
                console.print(Panel(summary.content, title="Session Summary", border_style="cyan"))
                continue
            elif user_input.lower() == 'history':
                history = psychologist._get_current_agent().run("Please provide conversation history", user_id=psychologist.user_id, session_id=psychologist.current_session_id)
                console.print(Panel(history.content, title="Conversation History", border_style="cyan"))
                continue
            elif user_input.lower() == 'agent':
                status = psychologist.get_current_agent_status()
                console.print(Panel(status, title="Agent Status", border_style="cyan"))
                continue
            elif user_input.lower() == 'debug':
                # Debug redirection logic
                console.print("\n[bold cyan]🔍 Debugging Redirection Logic[/bold cyan]")
                console.print(f"Current Agent: {psychologist.current_agent.upper()}")
                console.print(f"Redirection Keywords:")
                for agent, keywords in psychologist.redirection_keywords.items():
                    console.print(f"  {agent.upper()}: {', '.join(keywords[:5])}...")
                
                # Test redirection with a sample message
                test_message = "This reminds me of how my parents treated me"
                console.print(f"\nTest Message: '{test_message}'")
                redirection_result = psychologist._should_redirect(
                    psychologist.current_agent, test_message, psychologist.conversation_context
                )
                console.print(f"Redirection Result: {redirection_result}")
                continue
            
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
        console.print(f"\n[red]An error occurred: {e}[/red]")
    finally:
        console.print("[green]Thank you for your session. Take care! 🫂[/green]")

if __name__ == "__main__":
    main()
