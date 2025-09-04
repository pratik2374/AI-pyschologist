import os
from typing import Literal
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class Config:
    """Configuration for the Psychological AI Agent App"""
    
    # OpenAI API Configuration
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
    
    # App Configuration
    THERAPY_MODE = os.getenv("THERAPY_MODE", "cbt")
    ENABLE_SAFEGUARDS = os.getenv("ENABLE_SAFEGUARDS", "true").lower() == "true"
    MAX_SESSION_LENGTH = int(os.getenv("MAX_SESSION_LENGTH", "50"))
    
    # Crisis keywords for HUMUN safeguard
    CRISIS_KEYWORDS = [
        "suicide", "kill myself", "end my life", "want to die",
        "self-harm", "cut myself", "hurt myself",
        "abuse", "domestic violence", "sexual assault",
        "extreme distress", "mental breakdown", "psychotic"
    ]
    
    # Therapy mode instructions
    THERAPY_INSTRUCTIONS = {
        "cbt": "Focus on cognitive restructuring, identifying thought patterns, and behavioral techniques.",
        "humanistic": "Emphasize empathy, unconditional positive regard, and client-centered approaches.",
        "psychoanalytic": "Explore deeper unconscious patterns, childhood experiences, and defense mechanisms."
    }
    
    # MongoDB configuration
    MONGODB_URL = os.getenv("MONGODB_URL")
    MONGODB_DB_NAME = os.getenv("MONGODB_DB_NAME", "agno")
    MONGODB_SESSIONS_COLLECTION = os.getenv("MONGODB_SESSIONS_COLLECTION", "psychologist_sessions")
    
    @classmethod
    def validate(cls):
        """Validate configuration"""
        if not cls.OPENAI_API_KEY:
            raise ValueError("OPENAI_API_KEY is required. Please set it in your environment variables.")
        
        if cls.THERAPY_MODE not in ["cbt", "humanistic", "psychoanalytic"]:
            raise ValueError(f"Invalid therapy mode: {cls.THERAPY_MODE}")

        if not cls.MONGODB_URL:
            raise ValueError("MONGODB_URL is required. Please set it in your environment variables.")
