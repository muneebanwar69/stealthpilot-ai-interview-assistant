"""
Audio transcription API endpoint for Electron support.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import logging

from app.services.audio_transcription import get_audio_transcription_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/transcribe", tags=["transcription"])


class TranscribeRequest(BaseModel):
    audio: str  # Base64 encoded audio
    mime_type: str = "audio/webm"


class TranscribeResponse(BaseModel):
    success: bool
    transcript: str | None = None
    error: str | None = None


@router.post("/audio", response_model=TranscribeResponse)
async def transcribe_audio(request: TranscribeRequest):
    """
    Transcribe audio using Gemini.
    Used by Electron where Web Speech API is not available.
    """
    service = get_audio_transcription_service()
    
    if not service.is_ready:
        raise HTTPException(status_code=503, detail="Transcription service not available")
    
    try:
        transcript = await service.transcribe_audio(request.audio, request.mime_type)
        
        if transcript is not None:
            return TranscribeResponse(success=True, transcript=transcript)
        else:
            return TranscribeResponse(success=False, error="Failed to transcribe audio")
            
    except Exception as e:
        logger.error(f"Transcription API error: {e}")
        return TranscribeResponse(success=False, error=str(e))
