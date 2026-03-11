"""
Audio transcription service using Gemini for Electron support.
This is used when Web Speech API is not available (Electron).
Uses inline audio data for fast transcription (no file upload).
"""
import asyncio
import base64
import logging
from typing import Optional

from app.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)

# Lazy imports
_genai = None


def _init_genai():
    global _genai
    if _genai is None:
        import google.generativeai as genai
        genai.configure(api_key=settings.GEMINI_API_KEY)
        _genai = genai
    return _genai


class AudioTranscriptionService:
    """
    Transcribes audio using Gemini's multimodal capabilities.
    Uses inline audio data for fast transcription (no file upload).
    """

    def __init__(self):
        self.model = None
        self._ready = False
        self._init_error: Optional[str] = None
        self._try_init()

    def _try_init(self):
        try:
            if not settings.GEMINI_API_KEY:
                self._init_error = "GEMINI_API_KEY not configured"
                return

            genai = _init_genai()
            # Use gemini-2.0-flash which is faster
            self.model = genai.GenerativeModel(
                "gemini-2.0-flash",
                generation_config={
                    "temperature": 0.1,  # Low temp for accurate transcription
                    "max_output_tokens": 500,
                },
            )
            self._ready = True
            logger.info("✅ AudioTranscriptionService initialized with gemini-2.0-flash")
        except Exception as e:
            self._init_error = str(e)
            logger.error(f"❌ Failed to initialize AudioTranscriptionService: {e}")

    @property
    def is_ready(self) -> bool:
        return self._ready

    async def transcribe_audio(self, audio_base64: str, mime_type: str = "audio/webm") -> Optional[str]:
        """
        Transcribe audio using Gemini with inline audio data (fast, no file upload).
        
        Args:
            audio_base64: Base64 encoded audio data
            mime_type: MIME type of the audio (e.g., "audio/webm", "audio/wav")
            
        Returns:
            Transcribed text or None if failed
        """
        if not self._ready:
            logger.error(f"AudioTranscriptionService not ready: {self._init_error}")
            return None

        try:
            logger.info(f"Transcribing audio ({len(audio_base64)} bytes base64)...")
            
            # Create inline audio content
            audio_part = {
                "inline_data": {
                    "mime_type": mime_type,
                    "data": audio_base64
                }
            }
            
            prompt = """Listen to this audio and transcribe exactly what is said.
Output ONLY the transcribed text, nothing else.
If the audio is silent, unclear, or contains no speech, output exactly: [SILENCE]
Do not add any commentary, timestamps, labels, or formatting."""

            # Generate transcription using inline data (much faster than file upload)
            response = await asyncio.to_thread(
                self.model.generate_content,
                [prompt, audio_part]
            )

            if response.text:
                transcript = response.text.strip()
                # Skip silence markers
                if transcript == "[SILENCE]" or "[silence]" in transcript.lower():
                    logger.info("Audio was silent/unclear")
                    return None
                logger.info(f"Transcribed: {transcript[:100]}...")
                return transcript
            return None

        except Exception as e:
            logger.error(f"Transcription error: {e}")
            return None


# Global singleton
_audio_transcription_service: Optional[AudioTranscriptionService] = None


def get_audio_transcription_service() -> AudioTranscriptionService:
    global _audio_transcription_service
    if _audio_transcription_service is None:
        _audio_transcription_service = AudioTranscriptionService()
    return _audio_transcription_service
