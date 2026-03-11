"""
Deepgram real-time transcription service
"""
from deepgram import DeepgramClient, LiveTranscriptionEvents, LiveOptions
from app.config import get_settings
import asyncio
from typing import Callable, Optional

settings = get_settings()

class TranscriptionService:
    def __init__(self):
        self.deepgram_client = None
        self.connection = None
        self.is_connected = False
        
    async def initialize(self, on_transcript: Callable[[str, bool], None], on_error: Optional[Callable[[str], None]] = None):
        """Initialize Deepgram connection"""
        if not settings.DEEPGRAM_API_KEY or settings.DEEPGRAM_API_KEY == "your-deepgram-api-key":
            raise ValueError("DEEPGRAM_API_KEY not configured")
        
        try:
            self.deepgram_client = DeepgramClient(settings.DEEPGRAM_API_KEY)
            
            self.connection = self.deepgram_client.listen.websocket.v("1")
            
            # Handle transcript events
            async def on_message(self, result, **kwargs):
                sentence = result.channel.alternatives[0].transcript
                if len(sentence) > 0:
                    is_final = result.is_final
                    await on_transcript(sentence, is_final)
            
            # Handle errors
            async def on_error_event(self, error, **kwargs):
                if on_error:
                    await on_error(str(error))
            
            # Register event handlers
            self.connection.on(LiveTranscriptionEvents.Transcript, on_message)
            self.connection.on(LiveTranscriptionEvents.Error, on_error_event)
            
            # Configure live transcription options
            options = LiveOptions(
                model="nova-2",
                language="en-US",
                smart_format=True,
                interim_results=True,
                punctuate=True,
                profanity_filter=False,
                diarize=False,  # Speaker diarization
                filler_words=False,
                encoding="linear16",
                sample_rate=16000,
                channels=1
            )
            
            # Start connection
            if await self.connection.start(options):
                self.is_connected = True
                return True
            else:
                raise Exception("Failed to start Deepgram connection")
                
        except Exception as e:
            if on_error:
                await on_error(f"Deepgram initialization error: {str(e)}")
            raise e
    
    async def send_audio(self, audio_data: bytes):
        """Send audio chunk to Deepgram"""
        if self.connection and self.is_connected:
            await self.connection.send(audio_data)
    
    async def close(self):
        """Close Deepgram connection"""
        if self.connection:
            await self.connection.finish()
            self.is_connected = False

# Singleton instance
transcription_service = TranscriptionService()
