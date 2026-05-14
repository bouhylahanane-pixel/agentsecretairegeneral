from fastapi import FastAPI
from models.schemas import UserRequest
from services.orchestrator import executer_agent

from fastapi.responses import FileResponse
import os

from tools.meeting import (
    list_meetings,
    find_meeting_by_date,
    delete_meeting
)
from fastapi import FastAPI
from fastapi.responses import FileResponse
import os

app = FastAPI()


# =========================
# 🔥 DOWNLOAD PDF / AUDIO
# =========================

@app.get("/download/{file_path:path}")
def download_file(file_path: str):

    if os.path.exists(file_path):

        return FileResponse(
            path=file_path,
            filename=os.path.basename(file_path),
            media_type="application/octet-stream"
        )

    return {
        "error": "Fichier introuvable"
    }
app = FastAPI(
    title="Agent Secrétariat Intelligent",
    description="Système agentique avancé",
    version="3.0"
)

@app.post("/agent/process", tags=["Agent IA"])
async def process_task(request: UserRequest):
    return executer_agent(request.message, request.utilisateur)

@app.get("/health", tags=["System"])
async def health():
    return {"status": "OK"}

@app.post("/email/process", tags=["Email"])
async def process_email_endpoint(request: UserRequest):

    result = executer_agent(request.message, request.utilisateur)

    return {
        "to": request.sender,
        "subject": f"Re: {request.subject}",
        "message": result["response"]
    }

@app.get("/download/{file_path:path}")
def download_file(file_path: str):

    full_path = file_path

    if os.path.exists(full_path):

        return FileResponse(
            path=full_path,
            filename=os.path.basename(full_path),
            media_type='application/pdf'
        )

    return {
        "error": "Fichier introuvable"
    }
    # =========================
# 🔥 LISTE DES RÉUNIONS
# =========================

@app.get("/meetings", tags=["Meetings"])

async def get_meetings():

    return list_meetings()


# =========================
# 🔥 RECHERCHE RÉUNION
# =========================

@app.get("/meetings/search/{date}")
async def search_meetings(date: str):

    return find_meeting_by_date(date)

# =========================
# 🔥 SUPPRESSION RÉUNION
# =========================

@app.delete("/meetings/delete/{meeting_id}", tags=["Meetings"])

async def remove_meeting(meeting_id: int):

    return delete_meeting(meeting_id)