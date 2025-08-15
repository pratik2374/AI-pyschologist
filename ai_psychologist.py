"""
AI Psychologist App using Agno Framework

A multi-layered psychological AI agent with:
- HUMUN safeguards for crisis detection
- Conversational flow management
- Short and long-term memory systems
- Psychological knowledge integration
- Multiple therapy modes
"""

import json
import os
import sqlite3
from datetime import datetime
from typing import Dict, List, Optional, Any
from pathlib import Path

from agno.agent import Agent
from agno.models.openai import OpenAIChat
from agno.storage.sqlite import SqliteStorage
from agno.memory.v2.db.sqlite import SqliteMemoryDb
from agno.memory.v2.memory import Memory
from agno.tools import tool
from rich.console import Console
from rich.panel import Panel
from rich.prompt import Prompt
from rich.text import Text
from rich.table import Table

from config import Config

console = Console()

class CrisisDetector:
    """HUMUN safeguard system for detecting crisis situations"""
    
    def __init__(self, crisis_keywords: List[str]):
        self.crisis_keywords = [kw.lower() for kw in crisis_keywords]
    
    def detect_crisis(self, message: str) -> Dict[str, Any]:
        """Detect potential crisis situations in user messages"""
        message_lower = message.lower()
        detected_keywords = []
        
        for keyword in self.crisis_keywords:
            if keyword in message_lower:
                detected_keywords.append(keyword)
        
        is_crisis = len(detected_keywords) > 0
        
        return {
            "is_crisis": is_crisis,
            "keywords": detected_keywords,
            "severity": "high" if is_crisis else "low"
        }
    
    def get_crisis_response(self) -> str:
        """Get standardized crisis response"""
        return """🚨 CRISIS DETECTED - IMMEDIATE ACTION REQUIRED 🚨

This sounds very serious and I care about your safety. I am an AI and cannot provide the professional help you need right now.

PLEASE:
1. Call a crisis helpline immediately:
   - National Suicide Prevention Lifeline (US): 988 or 1-800-273-8255
   - Crisis Text Line: Text HOME to 741741
   - Emergency Services: 911

2. Reach out to a licensed mental health professional
3. Talk to someone you trust
4. Go to the nearest emergency room if you're in immediate danger

Your life has value and there are people who want to help you. Please get professional support right away."""

class MemoryManager:
    """Manages short-term and long-term memory systems"""
    
    def __init__(self, db_file: str = "psychologist_memory.db"):
        self.db_file = db_file
        self.setup_database()
    
    def setup_database(self):
        """Initialize the SQLite database for long-term memory"""
        conn = sqlite3.connect(self.db_file)
        cursor = conn.cursor()
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS conversation_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                user_id TEXT,
                session_id TEXT,
                user_message TEXT NOT NULL,
                agent_response TEXT NOT NULL,
                tags TEXT,
                crisis_detected BOOLEAN DEFAULT FALSE,
                therapy_mode TEXT
            )
        ''')
        
        conn.commit()
        conn.close()
    
    def store_conversation(self, user_message: str, agent_response: str, 
                          user_id: str = "default", session_id: str = "default",
                          tags: List[str] = None, crisis_detected: bool = False,
                          therapy_mode: str = "cbt"):
        """Store conversation in long-term memory"""
        conn = sqlite3.connect(self.db_file)
        cursor = conn.cursor()
        
        tags_json = json.dumps(tags or [])
        
        cursor.execute('''
            INSERT INTO conversation_logs 
            (timestamp, user_id, session_id, user_message, agent_response, tags, crisis_detected, therapy_mode)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            datetime.now().isoformat(),
            user_id,
            session_id,
            user_message,
            agent_response,
            tags_json,
            crisis_detected,
            therapy_mode
        ))
        
        conn.commit()
        conn.close()
    
    def get_recent_conversations(self, user_id: str = "default", limit: int = 5) -> List[Dict]:
        """Retrieve recent conversations for context"""
        conn = sqlite3.connect(self.db_file)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT user_message, agent_response, timestamp, tags, therapy_mode
            FROM conversation_logs 
            WHERE user_id = ? 
            ORDER BY timestamp DESC 
            LIMIT ?
        ''', (user_id, limit))
        
        rows = cursor.fetchall()
        conn.close()
        
        conversations = []
        for row in rows:
            conversations.append({
                "user_message": row[0],
                "agent_response": row[1],
                "timestamp": row[2],
                "tags": json.loads(row[3]) if row[3] else [],
                "therapy_mode": row[4]
            })
        
        return conversations
    
    def search_by_tags(self, tags: List[str], user_id: str = "default") -> List[Dict]:
        """Search conversations by tags for pattern recognition"""
        conn = sqlite3.connect(self.db_file)
        cursor = conn.cursor()
        
        # Create placeholders for SQL query
        placeholders = ','.join(['?' for _ in tags])
        
        cursor.execute(f'''
            SELECT user_message, agent_response, timestamp, tags, therapy_mode
            FROM conversation_logs 
            WHERE user_id = ? AND tags LIKE ?
        ''', (user_id, f'%{tags[0]}%'))
        
        rows = cursor.fetchall()
        conn.close()
        
        conversations = []
        for row in rows:
            conversations.append({
                "user_message": row[0],
                "agent_response": row[1],
                "timestamp": row[2],
                "tags": json.loads(row[3]) if row[3] else [],
                "therapy_mode": row[4]
            })
        
        return conversations

class PsychologicalKnowledgeBase:
    """Provides psychological techniques and knowledge"""
    
    def __init__(self):
        self.techniques = {
            "cbt": {
                "cognitive_restructuring": [
                    "Identify automatic thoughts",
                    "Challenge cognitive distortions",
                    "Replace with balanced thoughts",
                    "Practice thought records"
                ],
                "behavioral_techniques": [
                    "Graded exposure",
                    "Behavioral activation",
                    "Relaxation techniques",
                    "Problem-solving skills"
                ]
            },
            "humanistic": {
                "client_centered": [
                    "Active listening",
                    "Unconditional positive regard",
                    "Empathetic understanding",
                    "Genuineness and congruence"
                ],
                "growth_focused": [
                    "Self-actualization support",
                    "Personal growth encouragement",
                    "Authentic self-expression",
                    "Meaning and purpose exploration"
                ]
            },
            "psychoanalytic": {
                "exploration": [
                    "Unconscious pattern recognition",
                    "Childhood experience analysis",
                    "Defense mechanism identification",
                    "Transference exploration"
                ],
                "insight": [
                    "Pattern recognition",
                    "Emotional processing",
                    "Relationship dynamics",
                    "Internal conflict resolution"
                ]
            }
        }
    
    def get_techniques(self, mode: str) -> Dict[str, List[str]]:
        """Get psychological techniques for specific therapy mode"""
        return self.techniques.get(mode, self.techniques["cbt"])
    
    def get_therapeutic_response(self, mode: str, context: str) -> str:
        """Generate context-appropriate therapeutic response"""
        techniques = self.get_techniques(mode)
        
        if "anxiety" in context.lower():
            if mode == "cbt":
                return "Let's work on identifying the thoughts that are contributing to your anxiety. Can you tell me what's going through your mind when you feel anxious?"
            elif mode == "humanistic":
                return "I hear that anxiety is really challenging for you right now. It's completely normal to feel this way, and I'm here to support you through it."
            else:  # psychoanalytic
                return "Anxiety often has deeper roots. Can you tell me more about when this anxiety first started appearing in your life?"
        
        elif "depression" in context.lower():
            if mode == "cbt":
                return "Depression can make everything feel overwhelming. Let's break this down into smaller, manageable steps. What's one small thing you could do today?"
            elif mode == "humanistic":
                return "I want you to know that your feelings are valid, and it's okay to not be okay. You're showing real strength by talking about this."
            else:  # psychoanalytic
                return "Depression often masks deeper emotional needs. Can you help me understand what might be underneath these feelings?"
        
        else:
            return "I'd like to understand this better. Can you tell me more about how this is affecting you?"

class AIPsychologist:
    """Main AI Psychologist agent using Agno framework"""
    
    def __init__(self, therapy_mode: str = "cbt"):
        # Validate configuration
        Config.validate()
        
        self.therapy_mode = therapy_mode
        self.crisis_detector = CrisisDetector(Config.CRISIS_KEYWORDS)
        self.memory_manager = MemoryManager()
        self.knowledge_base = PsychologicalKnowledgeBase()
        
        # Initialize Agno components
        self.storage = SqliteStorage(
            table_name="psychologist_sessions", 
            db_file="psychologist_sessions.db"
        )
        
        self.memory = Memory(
            model=OpenAIChat(id="gpt-4o-mini"),
            db=SqliteMemoryDb(table_name="user_memories", db_file="psychologist_memory.db")
        )
        
        # Create the main agent
        self.agent = Agent(
            name="AI Psychologist",
            role="Licensed psychological AI therapist providing evidence-based therapeutic support",
            model=OpenAIChat(id="gpt-4o-mini"),
            tools=[self._get_session_summary, self._get_conversation_history],
            storage=self.storage,
            memory=self.memory,
            enable_agentic_memory=True,
            enable_user_memories=True,
            enable_session_summaries=True,
            add_history_to_messages=True,
            num_history_runs=3,
            read_chat_history=True,
            markdown=True,
            instructions=self._get_therapy_instructions()
        )
        
        # Session state
        self.current_session_id = None
        self.user_id = "default"
        self.session_count = 0
    
    def _get_therapy_instructions(self) -> str:
        """Get therapy mode specific instructions"""
        base_instructions = f"""
        You are an AI Psychologist operating in {self.therapy_mode.upper()} mode.
        
        Core Principles:
        1. Always prioritize client safety and well-being
        2. Use evidence-based psychological techniques
        3. Maintain professional boundaries while showing empathy
        4. Encourage self-reflection and personal growth
        5. Normalize difficult emotions and experiences
        
        Therapy Mode: {self.therapy_mode}
        {Config.THERAPY_INSTRUCTIONS.get(self.therapy_mode, '')}
        
        Response Guidelines:
        - Ask reflective questions to encourage exploration
        - Provide validation and normalization of feelings
        - Offer practical coping strategies when appropriate
        - Maintain a warm, supportive, and non-judgmental tone
        - Focus on the client's strengths and resilience
        
        Remember: You are a supportive AI therapist, not a replacement for professional mental health care.
        """
        return base_instructions
    
    @tool
    def _get_session_summary(self, session_id: str = None) -> str:
        """Get a summary of the current or specified session"""
        if not session_id:
            session_id = self.current_session_id or "current"
        
        summary = self.memory.get_session_summary(
            user_id=self.user_id, 
            session_id=session_id
        )
        
        if summary and summary.summary:
            return f"Session Summary: {summary.summary}"
        else:
            return "No session summary available yet."
    
    @tool
    def _get_conversation_history(self, limit: int = 5) -> str:
        """Get recent conversation history for context"""
        conversations = self.memory_manager.get_recent_conversations(
            user_id=self.user_id, 
            limit=limit
        )
        
        if not conversations:
            return "No previous conversations found."
        
        history = "Recent Conversation History:\n"
        for i, conv in enumerate(conversations[-limit:], 1):
            history += f"\n{i}. User: {conv['user_message'][:100]}...\n"
            history += f"   Response: {conv['agent_response'][:100]}...\n"
        
        return history
    
    def start_session(self, user_id: str = None):
        """Start a new therapy session"""
        if user_id:
            self.user_id = user_id
        
        self.current_session_id = f"session_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        self.session_count += 1
        
        console.print(Panel(
            f"🫂 Welcome to your AI Therapy Session #{self.session_count}\n"
            f"Therapy Mode: {self.therapy_mode.upper()}\n"
            f"Session ID: {self.current_session_id}\n\n"
            "Type 'quit' to end the session, 'summary' for session summary, or 'history' for conversation history.",
            title="AI Psychologist Session Started",
            border_style="blue"
        ))
    
    def process_message(self, user_message: str) -> str:
        """Process user message and generate therapeutic response"""
        
        # Crisis detection (HUMUN safeguard)
        crisis_info = self.crisis_detector.detect_crisis(user_message)
        
        if crisis_info["is_crisis"]:
            crisis_response = self.crisis_detector.get_crisis_response()
            
            # Store crisis conversation
            self.memory_manager.store_conversation(
                user_message=user_message,
                agent_response=crisis_response,
                user_id=self.user_id,
                session_id=self.current_session_id,
                tags=crisis_info["keywords"],
                crisis_detected=True,
                therapy_mode=self.therapy_mode
            )
            
            return crisis_response
        
        # Generate therapeutic response using Agno agent
        try:
            response = self.agent.run(
                user_message,
                user_id=self.user_id,
                session_id=self.current_session_id
            )
            
            agent_response = response.content
            
            # Store conversation in memory
            self.memory_manager.store_conversation(
                user_message=user_message,
                agent_response=agent_response,
                user_id=self.user_id,
                session_id=self.current_session_id,
                tags=self._extract_tags(user_message),
                crisis_detected=False,
                therapy_mode=self.therapy_mode
            )
            
            return agent_response
            
        except Exception as e:
            console.print(f"[red]Error generating response: {e}[/red]")
            return "I'm experiencing some technical difficulties right now. Please try again in a moment."
    
    def _extract_tags(self, message: str) -> List[str]:
        """Extract relevant tags from user message"""
        tags = []
        message_lower = message.lower()
        
        # Basic emotion and topic detection
        if any(word in message_lower for word in ["anxious", "anxiety", "worried", "stress"]):
            tags.append("anxiety")
        if any(word in message_lower for word in ["sad", "depressed", "depression", "hopeless"]):
            tags.append("depression")
        if any(word in message_lower for word in ["angry", "anger", "frustrated", "mad"]):
            tags.append("anger")
        if any(word in message_lower for word in ["relationship", "partner", "family", "friend"]):
            tags.append("relationships")
        if any(word in message_lower for word in ["work", "job", "career", "professional"]):
            tags.append("work")
        
        return tags
    
    def get_session_summary(self) -> str:
        """Get summary of current session"""
        if not self.current_session_id:
            return "No active session."
        
        summary = self.memory.get_session_summary(
            user_id=self.user_id,
            session_id=self.current_session_id
        )
        
        if summary and summary.summary:
            return summary.summary
        else:
            return "Session summary not available yet."
    
    def get_conversation_history(self, limit: int = 10) -> List[Dict]:
        """Get conversation history for current user"""
        return self.memory_manager.get_recent_conversations(
            user_id=self.user_id,
            limit=limit
        )

def main():
    """Main application entry point"""
    console.print(Panel(
        "🧠 AI Psychologist App\n"
        "Powered by Agno Framework\n\n"
        "This is an AI therapy assistant for educational and support purposes.\n"
        "It is NOT a replacement for professional mental health care.",
        title="Welcome",
        border_style="green"
    ))
    
    # Get therapy mode
    mode_choice = Prompt.ask(
        "Choose therapy mode",
        choices=["cbt", "humanistic", "psychoanalytic"],
        default="cbt"
    )
    
    # Initialize AI Psychologist
    try:
        psychologist = AIPsychologist(therapy_mode=mode_choice)
        console.print(f"[green]✓ AI Psychologist initialized in {mode_choice.upper()} mode[/green]")
    except Exception as e:
        console.print(f"[red]✗ Failed to initialize AI Psychologist: {e}[/red]")
        return
    
    # Start session
    user_id = Prompt.ask("Enter your user ID (or press Enter for default)")
    if not user_id:
        user_id = "default"
    
    psychologist.start_session(user_id)
    
    # Main conversation loop
    try:
        while True:
            user_input = Prompt.ask("\n[bold blue]You[/bold blue]")
            
            if user_input.lower() in ['quit', 'exit', 'bye']:
                console.print("[yellow]Ending session...[/yellow]")
                break
            elif user_input.lower() == 'summary':
                summary = psychologist.get_session_summary()
                console.print(Panel(summary, title="Session Summary", border_style="cyan"))
                continue
            elif user_input.lower() == 'history':
                history = psychologist.get_conversation_history(5)
                if history:
                    table = Table(title="Recent Conversation History")
                    table.add_column("Time", style="cyan")
                    table.add_column("Your Message", style="blue")
                    table.add_column("Response", style="green")
                    
                    for conv in history:
                        table.add_row(
                            conv['timestamp'][:19],
                            conv['user_message'][:50] + "..." if len(conv['user_message']) > 50 else conv['user_message'],
                            conv['agent_response'][:50] + "..." if len(conv['agent_response']) > 50 else conv['agent_response']
                        )
                    
                    console.print(table)
                else:
                    console.print("[yellow]No conversation history available.[/yellow]")
                continue
            
            # Process message
            console.print("\n[bold green]AI Psychologist[/bold green]")
            response = psychologist.process_message(user_input)
            console.print(response)
            
    except KeyboardInterrupt:
        console.print("\n[yellow]Session interrupted by user.[/yellow]")
    except Exception as e:
        console.print(f"\n[red]An error occurred: {e}[/red]")
    finally:
        # Final summary
        if psychologist.current_session_id:
            final_summary = psychologist.get_session_summary()
            if final_summary and final_summary != "Session summary not available yet.":
                console.print(Panel(
                    final_summary,
                    title="Final Session Summary",
                    border_style="yellow"
                ))
        
        console.print("[green]Thank you for your session. Take care! 🫂[/green]")

if __name__ == "__main__":
    main()
