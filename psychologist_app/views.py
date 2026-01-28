"""
Django views for AI Psychologist application.
"""
import os
import json
from django.http import JsonResponse, HttpResponse, HttpResponseBadRequest, HttpResponseServerError
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.shortcuts import render
from ai_psychologist import AIPsychologist, CrisisResponseAgent, TherapyModeDeterminer
from typing import Optional
from bson import ObjectId

from .mongo import (
    create_auth_session,
    delete_auth_session,
    get_user_by_token,
    hash_password,
    therapy_sessions_collection,
    users_collection,
    verify_password,
    conversation_logs_collection,
)
from config import Config


# Per-user psychologist instances (separate sessions per user)
psychologists = {}


def _ensure_session_record(user_object_id: ObjectId, session_id: str) -> None:
    from datetime import datetime

    therapy_sessions_collection().update_one(
        {"user_id": user_object_id, "session_id": session_id},
        {"$setOnInsert": {"created_at": datetime.utcnow()}},
        upsert=True,
    )


def index(request):
    """Serve the main index.html page"""
    user = get_user_by_token(request.COOKIES.get("auth_token", ""))
    if not user:
        return render(request, "login.html")
    return render(request, "index.html")


@csrf_exempt
@require_http_methods(["POST"])
def register(request):
    """Register a new user (email + password) stored in MongoDB."""
    try:
        data = json.loads(request.body or b"{}")
    except json.JSONDecodeError:
        return HttpResponseBadRequest(json.dumps({"detail": "Invalid JSON"}), content_type="application/json")

    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    if not email or not password:
        return HttpResponseBadRequest(json.dumps({"detail": "Email and password are required"}), content_type="application/json")

    try:
        doc = {
            "email": email,
            "password_hash": hash_password(password),
        }
        result = users_collection().insert_one(doc)
        user_id = result.inserted_id
    except Exception as exc:
        # likely duplicate email due to unique index
        return HttpResponseBadRequest(json.dumps({"detail": f"Could not create user: {str(exc)}"}), content_type="application/json")

    auth = create_auth_session(user_id=user_id)
    resp = JsonResponse({"ok": True, "user_id": str(user_id), "email": email})
    resp.set_cookie("auth_token", auth["token"], httponly=True, samesite="Lax")
    return resp


@csrf_exempt
@require_http_methods(["POST"])
def login(request):
    """Login with email+password; sets HttpOnly auth cookie."""
    try:
        data = json.loads(request.body or b"{}")
    except json.JSONDecodeError:
        return HttpResponseBadRequest(json.dumps({"detail": "Invalid JSON"}), content_type="application/json")

    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    if not email or not password:
        return HttpResponseBadRequest(json.dumps({"detail": "Email and password are required"}), content_type="application/json")

    user = users_collection().find_one({"email": email})
    if not user or not verify_password(password, user.get("password_hash", b"")):
        return JsonResponse({"detail": "Invalid credentials"}, status=401)

    auth = create_auth_session(user_id=user["_id"])
    resp = JsonResponse({"ok": True, "user_id": str(user["_id"]), "email": email})
    resp.set_cookie("auth_token", auth["token"], httponly=True, samesite="Lax")
    return resp


@csrf_exempt
@require_http_methods(["POST"])
def logout(request):
    raw = request.COOKIES.get("auth_token", "")
    delete_auth_session(raw)
    resp = JsonResponse({"ok": True})
    resp.delete_cookie("auth_token")
    return resp


@require_http_methods(["GET"])
def me(request):
    user = get_user_by_token(request.COOKIES.get("auth_token", ""))
    if not user:
        return JsonResponse({"detail": "Not authenticated"}, status=401)
    return JsonResponse({"user_id": str(user["_id"]), "email": user.get("email", "")})


@csrf_exempt
@require_http_methods(["POST"])
def start_therapy_session(request):
    """Create a new therapy session record for the logged-in user."""
    user = get_user_by_token(request.COOKIES.get("auth_token", ""))
    if not user:
        return JsonResponse({"detail": "Not authenticated"}, status=401)

    user_id = str(user["_id"])
    p = psychologists.get(user_id)
    if p is None:
        p = AIPsychologist()
        psychologists[user_id] = p
    p.start_session(user_id)

    from datetime import datetime

    therapy_sessions_collection().insert_one(
        {
            "user_id": user["_id"],
            "session_id": p.current_session_id,
            "created_at": datetime.utcnow(),
        }
    )
    return JsonResponse({"ok": True, "session_id": p.current_session_id})


@require_http_methods(["GET"])
def list_therapy_sessions(request):
    """List sessions for logged-in user only."""
    user = get_user_by_token(request.COOKIES.get("auth_token", ""))
    if not user:
        return JsonResponse({"detail": "Not authenticated"}, status=401)

    sessions = list(
        therapy_sessions_collection()
        .find({"user_id": user["_id"]}, {"_id": 0, "session_id": 1, "created_at": 1})
        .sort("created_at", -1)
        .limit(100)
    )
    # stringify datetimes if any
    for s in sessions:
        if "created_at" in s and hasattr(s["created_at"], "isoformat"):
            s["created_at"] = s["created_at"].isoformat()
    return JsonResponse({"sessions": sessions})


@require_http_methods(["GET"])
def current_session(request):
    user = get_user_by_token(request.COOKIES.get("auth_token", ""))
    if not user:
        return JsonResponse({"detail": "Not authenticated"}, status=401)
    user_id = str(user["_id"])
    p = psychologists.get(user_id)
    return JsonResponse({"session_id": p.current_session_id if p else None})


@require_http_methods(["GET"])
def session_messages(request, session_id: str):
    """Return full message history for a session (user-only)."""
    user = get_user_by_token(request.COOKIES.get("auth_token", ""))
    if not user:
        return JsonResponse({"detail": "Not authenticated"}, status=401)

    # Fetch messages from the shared conversation_logs collection
    coll = conversation_logs_collection()
    cursor = coll.find(
        {"user_id": str(user["_id"]), "session_id": session_id},
        {"_id": 0, "timestamp": 1, "user_message": 1, "agent_response": 1, "therapy_mode": 1},
    ).sort("timestamp", 1).limit(2000)
    messages = []
    for doc in cursor:
        messages.append(
            {
                "timestamp": doc.get("timestamp", ""),
                "user_message": doc.get("user_message", ""),
                "agent_response": doc.get("agent_response", ""),
                "therapy_mode": doc.get("therapy_mode", "cbt"),
            }
        )
    return JsonResponse({"session_id": session_id, "messages": messages})


@csrf_exempt
@require_http_methods(["POST"])
def select_session(request):
    """Switch active session for the logged-in user."""
    user = get_user_by_token(request.COOKIES.get("auth_token", ""))
    if not user:
        return JsonResponse({"detail": "Not authenticated"}, status=401)
    try:
        data = json.loads(request.body or b"{}")
    except json.JSONDecodeError:
        return HttpResponseBadRequest(json.dumps({"detail": "Invalid JSON"}), content_type="application/json")

    session_id = (data.get("session_id") or "").strip()
    if not session_id:
        return HttpResponseBadRequest(json.dumps({"detail": "session_id is required"}), content_type="application/json")

    user_id = str(user["_id"])
    p = psychologists.get(user_id)
    if p is None:
        p = AIPsychologist()
        psychologists[user_id] = p
    p.user_id = user_id
    p.current_session_id = session_id
    _ensure_session_record(user["_id"], session_id)
    return JsonResponse({"ok": True, "session_id": session_id})


@csrf_exempt
@require_http_methods(["POST"])
def psychologist_endpoint(request):
    """
    Handle psychologist queries - equivalent to FastAPI /psychologist endpoint
    """
    try:
        # Parse JSON request body
        try:
            data = json.loads(request.body)
        except json.JSONDecodeError:
            return HttpResponseBadRequest(
                json.dumps({"detail": "Invalid JSON in request body"}),
                content_type='application/json'
            )
        
        user = get_user_by_token(request.COOKIES.get("auth_token", ""))
        if not user:
            return JsonResponse({"detail": "Not authenticated"}, status=401)

        # Extract query
        message = (data.get("query") or "").strip()
        
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
        
        # Ensure per-user psychologist instance
        user_id = str(user["_id"])
        p = psychologists.get(user_id)
        if p is None:
            p = AIPsychologist()
            psychologists[user_id] = p

        # Start session if needed
        if p.current_session_id is None or p.user_id != user_id:
            p.start_session(user_id)
            _ensure_session_record(user["_id"], p.current_session_id)
        
        # Crisis pre-check using CrisisResponseAgent for consistency with ai_psychologist
        crisis_agent = CrisisResponseAgent()
        crisis_info = crisis_agent.detect_crisis(message)
        if crisis_info.get("is_crisis"):
            return JsonResponse({
                "response": crisis_agent.generate_crisis_response(message),
                "possible_crisis": True
            })
        
        # Otherwise, route to AI psychologist
        response_text = p.process_message(message)
        history = p.memory_manager.get_recent_conversations(
            user_id=p.user_id,
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