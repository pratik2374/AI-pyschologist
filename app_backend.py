from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from ai_psychologist import AIPsychologist, Config , CrisisDetector
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

        
        # Lightweight crisis check; if detected, return crisis guidance
        lower_msg = message.lower()
        possible_crisis = any(kw in lower_msg for kw in Config.CRISIS_KEYWORDS)
        if possible_crisis:
            crisis = CrisisDetector(Config.CRISIS_KEYWORDS)
            return {"response": crisis.get_crisis_response(), "possible_crisis": True}

        # Otherwise, route to AI psychologist
        response_text = psychologist.process_message(message)
        return {"response": response_text, "therapy_mode": psychologist.current_agent, "possible_crisis": False}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Internal error: {exc}")
