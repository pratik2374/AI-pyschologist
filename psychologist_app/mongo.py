import hashlib
import secrets
from datetime import datetime, timedelta
from typing import Any, Dict, Optional, Tuple

import bcrypt
from bson import ObjectId
from pymongo import ASCENDING, MongoClient

from config import Config


def _utcnow() -> datetime:
    # MongoDB typically returns naive UTC datetimes (tz_aware=False default),
    # so we keep all stored/computed timestamps naive UTC to avoid
    # "can't compare offset-naive and offset-aware datetimes".
    return datetime.utcnow()


_client: Optional[MongoClient] = None


def get_db():
    global _client
    Config.validate()
    if _client is None:
        _client = MongoClient(Config.MONGODB_URL)
    return _client[Config.MONGODB_DB_NAME]


def users_collection():
    db = get_db()
    col = db["users"]
    col.create_index([("email", ASCENDING)], unique=True)
    return col


def auth_sessions_collection():
    db = get_db()
    col = db["auth_sessions"]
    col.create_index([("token_sha256", ASCENDING)], unique=True)
    col.create_index([("user_id", ASCENDING), ("created_at", ASCENDING)])
    col.create_index([("expires_at", ASCENDING)])
    return col


def therapy_sessions_collection():
    db = get_db()
    col = db["therapy_sessions"]
    col.create_index([("user_id", ASCENDING), ("created_at", ASCENDING)])
    col.create_index([("session_id", ASCENDING)], unique=True)
    return col


def conversation_logs_collection():
    """
    Shared MongoDB collection for per-message chat logs.

    Schema (per document):
    - user_id: str (stringified Mongo ObjectId of the user)
    - session_id: str (opaque session identifier from AIPsychologist.current_session_id)
    - timestamp: ISO8601 string or datetime (sorted ascending for playback)
    - user_message: str
    - agent_response: str
    - therapy_mode: str (e.g. 'cbt', 'humanistic', 'psychoanalytic')
    - tags: [str]
    - crisis_detected: bool
    """
    db = get_db()
    col = db["conversation_logs"]
    # Indexes optimized for fetching messages by user and session
    col.create_index([("user_id", ASCENDING), ("timestamp", ASCENDING)])
    col.create_index([("session_id", ASCENDING), ("timestamp", ASCENDING)])
    return col


def hash_password(password: str) -> bytes:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt())


def verify_password(password: str, password_hash: bytes) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash)
    except Exception:
        return False


def new_session_token() -> Tuple[str, str]:
    raw = secrets.token_urlsafe(32)
    sha = hashlib.sha256(raw.encode("utf-8")).hexdigest()
    return raw, sha


def create_auth_session(user_id: ObjectId, days: int = 14) -> Dict[str, Any]:
    raw, sha = new_session_token()
    now = _utcnow()
    doc = {
        "user_id": user_id,
        "token_sha256": sha,
        "created_at": now,
        "expires_at": now + timedelta(days=days),
    }
    auth_sessions_collection().insert_one(doc)
    return {"token": raw, "expires_at": doc["expires_at"]}


def get_user_by_token(raw_token: str) -> Optional[Dict[str, Any]]:
    if not raw_token:
        return None
    sha = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
    sess = auth_sessions_collection().find_one({"token_sha256": sha})
    if not sess:
        return None
    if sess.get("expires_at") and sess["expires_at"] < _utcnow():
        auth_sessions_collection().delete_one({"_id": sess["_id"]})
        return None
    return users_collection().find_one({"_id": sess["user_id"]})


def delete_auth_session(raw_token: str) -> None:
    if not raw_token:
        return
    sha = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
    auth_sessions_collection().delete_one({"token_sha256": sha})
