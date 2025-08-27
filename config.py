"""
Configuration for AI Psychologist App
"""

class Config:
    # Crisis detection keywords
    CRISIS_KEYWORDS = [
        "kill myself", "suicide", "want to die", "end my life",
        "self-harm", "hopeless", "can't go on", "no reason to live",
        "better off dead", "hurt myself", "end it all"
    ]
    
    # Therapy mode instructions (if needed for future use)
    THERAPY_INSTRUCTIONS = {
        "cbt": "Focus on cognitive restructuring and behavioral techniques",
        "humanistic": "Emphasize self-actualization and personal growth",
        "psychoanalytic": "Explore unconscious patterns and early experiences"
    }
    
    @staticmethod
    def validate():
        """Validate configuration settings"""
        # Add validation logic here if needed
        pass
