"""
Django views for AI Psychologist application.
"""
import os
import json
from typing import Optional
from django.http import JsonResponse, HttpResponseBadRequest, HttpResponseServerError
from django.views.decorators.csrf import csrf_exempt
from datetime import datetime
from django.views.decorators.http import require_http_methods
from django.shortcuts import render
from ai_psychologist import AIPsychologist, CrisisResponseAgent, TherapyModeDeterminer

# Global psychologist instance (lazily initialized)
psychologist: Optional[AIPsychologist] = None

def index(request):
    """Serve the main index.html page"""
    return render(request, "index.html")

@csrf_exempt
@require_http_methods(["POST"])
def psychologist_endpoint(request):
    """
    Handle psychologist queries - equivalent to FastAPI /psychologist endpoint in app_backend.py
    """
    global psychologist
    
    try:
        # Parse JSON request body
        try:
            data = json.loads(request.body)
        except json.JSONDecodeError:
            return HttpResponseBadRequest(
                json.dumps({"detail": "Invalid JSON in request body"}),
                content_type='application/json'
            )
            
        message = (data.get("query") or "").strip()
        user_id = data.get("user_id") or "default"
        session_id = data.get("session_id") or f"session_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        # Validate message
        if not message:
            return HttpResponseBadRequest(
                json.dumps({"detail": "Query must be a non-empty string"}),
                content_type='application/json',
                status=422
            )
        
        # Ensure API key exists
        if not os.getenv("OPENAI_API_KEY"):
            return HttpResponseServerError(
                json.dumps({"detail": "Missing OPENAI_API_KEY in environment"}),
                content_type='application/json',
                status=503
            )
        
        # Initialize global psychologist if needed
        if psychologist is None:
            psychologist = AIPsychologist()

        # Start/Switch session if needed
        if psychologist.current_session_id is None or psychologist.user_id != user_id:
            psychologist.start_session(user_id, session_id)
        
        # Crisis pre-check using CrisisResponseAgent
        crisis_agent = CrisisResponseAgent()
        crisis_info = crisis_agent.detect_crisis(message)
        if crisis_info.get("is_crisis"):
            return JsonResponse({
                "response": crisis_agent.generate_crisis_response(message),
                "possible_crisis": True
            })
        
        # Route to AI psychologist
        response_text = psychologist.process_message(message)
        
        # Get history and mode
        # Using memory_manager directly as in app_backend.py
        history = psychologist.memory_manager.get_recent_conversations(
            user_id=psychologist.user_id,
            limit=10
        )
        mode = TherapyModeDeterminer().determine_therapy_mode(history, message)
        
        return JsonResponse({
            "response": response_text,
            "therapy_mode": mode,
            "possible_crisis": False
        })
        
    except Exception as exc:
        return HttpResponseServerError(
            json.dumps({"detail": f"Internal error: {str(exc)}"}),
            content_type='application/json',
            status=500
        )