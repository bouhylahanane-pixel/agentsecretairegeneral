from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel
from api.routers.auth import get_current_user
from tools.rag_engine import interroger_rag_employe
from tools.history_manager import save_history
from services.llm_service import transcrire_audio

router = APIRouter(prefix="/api/chat", tags=["Chat IA"])

class ChatRequest(BaseModel):
    message: str

class ChatResponse(BaseModel):
    response: str

@router.post("/transcribe")
async def transcribe_audio_endpoint(
    audio: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Reçoit un fichier audio et le convertit en texte via Whisper."""
    try:
        content = await audio.read()
        texte = transcrire_audio(content, audio.filename)
        if not texte:
            raise HTTPException(status_code=500, detail="Échec de la transcription audio.")
        return {"text": texte}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/restricted", response_model=ChatResponse)
async def chat_restricted(request: ChatRequest, current_user: dict = Depends(get_current_user)):
    """
    Interface RAG Restreinte : répond aux questions de l'utilisateur
    en se basant uniquement sur SES documents officiels et ses informations personnelles.
    """
    try:
        reponse_ia = interroger_rag_employe(request.message, current_user)
        return ChatResponse(response=reponse_ia)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
