from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from ai_psychologist import AIPsychologist, CrisisResponseAgent , TherapyModeDeterminer
from typing import Optional
import os
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse



app = FastAPI()
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
def root_page():
    return FileResponse("static/index.html")


class Query(BaseModel):
    query: str
    user_id: Optional[str] = "default"


# Lazily created singleton
psychologist: Optional[AIPsychologist] = None


@app.post("/psychologist")
def psychologist_endpoint(payload: Query):
    global psychologist

    message = (payload.query or "").strip()
    if not message:
        raise HTTPException(status_code=422, detail="Query must be a non-empty string")

    try:
        # Ensure API key exists for the underlying model
        if not os.getenv("OPENAI_API_KEY"):
            raise HTTPException(status_code=503, detail="Missing OPENAI_API_KEY in environment")

        if psychologist is None:
            psychologist = AIPsychologist()

        if psychologist.current_session_id is None or psychologist.user_id != (payload.user_id or "default"):
            psychologist.start_session(payload.user_id or "default")

        
        # Crisis pre-check using CrisisResponseAgent for consistency with ai_psychologist
        crisis_agent = CrisisResponseAgent()
        crisis_info = crisis_agent.detect_crisis(message)
        if crisis_info.get("is_crisis"):
            return {"response": crisis_agent.generate_crisis_response(message), "possible_crisis": True}

        # Otherwise, route to AI psychologist
        response_text = psychologist.process_message(message)
        history = psychologist.memory_manager.get_recent_conversations(
    user_id=psychologist.user_id,
    limit=10
)
        mode = TherapyModeDeterminer().determine_therapy_mode(history, message)
        return {
            "response": response_text,
            "therapy_mode": mode,
            "possible_crisis": False
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Internal error: {exc}")
