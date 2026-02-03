"""
Django views for AI Psychologist application.
"""
import os
import json
import uuid
from typing import List, Dict, Any
from datetime import datetime

from django.http import JsonResponse, HttpResponseBadRequest, HttpResponseServerError
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.shortcuts import render

# Import helper classes that don't depend on Mongo instance
from ai_psychologist import CrisisResponseAgent, TherapyModeDeterminer
from agno.agent import Agent
from agno.models.openai import OpenAIChat
from config import Config

# Simple in-memory storage for active sessions
# Structure: { user_id: { "agent": Agent, "history": [], "mode": "cbt" } }
active_sessions = {}

class SimpleAIPsychologist:
    """
    A lightweight version of AIPsychologist that avoids MongoDB.
    Uses in-memory storage for the duration of the server runtime.
    """
    def __init__(self, user_id: str):
        self.user_id = user_id
        self.therapy_mode = "cbt"
        self.history: List[Dict] = []
        
        self.crisis_detector = CrisisResponseAgent()
        self.therapy_mode_determiner = TherapyModeDeterminer()
        
        # Initialize Agent without Mongo storage
        self.agent = Agent(
            name="AI Psychologist",
            role="Licensed psychological AI therapist providing evidence-based therapeutic support",
            model=OpenAIChat(id="gpt-4o-mini"),
            markdown=True,
            instructions=self._get_therapy_instructions
        )

    def _get_therapy_instructions(self, context=None) -> str:
        # Dynamic instructions based on current mode
        base_instructions = f"""
        You are an AI Psychologist operating in {self.therapy_mode.upper()} mode.
        
        Core Principles:
        1. One thought, one turn. Never deliver a monologue.
        2. Always prioritize client safety.
        3. Use evidence-based psychological techniques.
        
        Therapy Mode: {self.therapy_mode}
        
        Response Guidelines:
        - Maintain a warm, supportive tone.
        - Focus on the client's strengths.
        """
        # Append mode specific details from Config if available
        if Config.THERAPY_INSTRUCTIONS.get(self.therapy_mode):
             base_instructions += f"\n{Config.THERAPY_INSTRUCTIONS.get(self.therapy_mode)}"
             
        return base_instructions

    def process_message(self, message: str) -> str:
        # 1. Crisis Detection
        crisis_info = self.crisis_detector.detect_crisis(message)
        if crisis_info["is_crisis"]:
            response = self.crisis_detector.generate_crisis_response(message)
            self._log_interaction(message, response, crisis=True)
            return response

        # 2. Mode Determination (every few turns)
        if len(self.history) >= 2:
            determined_mode = self.therapy_mode_determiner.determine_therapy_mode(self.history, message)
            if determined_mode != self.therapy_mode:
                self.therapy_mode = determined_mode
        
        # 3. Generate Response
        # Pass history explicitly if the Agent is stateless/in-memory
        agent_response = self.agent.run(message)
        response_text = agent_response.content
        
        # 4. Store in memory
        self._log_interaction(message, response_text)
        
        return response_text

    def _log_interaction(self, user_msg: str, agent_msg: str, crisis: bool = False):
        self.history.append({
            "user_message": user_msg,
            "agent_response": agent_msg,
            "timestamp": datetime.now().isoformat(),
            "therapy_mode": self.therapy_mode,
            "crisis": crisis
        })
        # Keep history manageable
        if len(self.history) > 20:
            self.history.pop(0)

def index(request):
    """Serve the main index.html page"""
    return render(request, "index.html")

@csrf_exempt
@require_http_methods(["POST"])
def psychologist_endpoint(request):
    """
    Handle psychologist queries using SimpleAIPsychologist
    """
    try:
        try:
            data = json.loads(request.body)
        except json.JSONDecodeError:
            return HttpResponseBadRequest(json.dumps({"detail": "Invalid JSON"}), content_type='application/json')
        
        user_id = data.get("user_id")
        if not user_id:
            return HttpResponseBadRequest(json.dumps({"detail": "user_id required"}), content_type='application/json')

        message = (data.get("query") or "").strip()
        if not message:
            return HttpResponseBadRequest(json.dumps({"detail": "Query must be string"}), content_type='application/json', status=422)
        
        if not os.getenv("OPENAI_API_KEY"):
            return HttpResponseServerError(json.dumps({"detail": "Missing OPENAI_API_KEY"}), content_type='application/json', status=503)
        
        # Get or create session
        session = active_sessions.get(user_id)
        if not session:
            session = SimpleAIPsychologist(user_id)
            active_sessions[user_id] = session
        
        response_text = session.process_message(message)
        
        return JsonResponse({
            "response": response_text,
            "therapy_mode": session.therapy_mode,
            "possible_crisis": False 
        })
        
    except Exception as exc:
        return HttpResponseServerError(
            json.dumps({"detail": f"Internal error: {str(exc)}"}),
            content_type='application/json',
            status=500
        )