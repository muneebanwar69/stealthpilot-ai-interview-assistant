"""
Gemini 2.0 Flash Live Audio Service
Native audio → text → answer pipeline (no separate transcription needed)
FREE and ultra-fast (~300ms latency)
"""
import asyncio
import base64
from typing import Optional, Dict, Any
import logging
from app.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)

# Lazy imports to avoid crashing when the key is missing
_genai = None
_HarmCategory = None
_HarmBlockThreshold = None

def _init_genai():
    global _genai, _HarmCategory, _HarmBlockThreshold
    if _genai is None:
        import google.generativeai as genai
        from google.generativeai.types import HarmCategory, HarmBlockThreshold
        _genai = genai
        _HarmCategory = HarmCategory
        _HarmBlockThreshold = HarmBlockThreshold
    return _genai, _HarmCategory, _HarmBlockThreshold


class GeminiAudioService:
    """
    Direct audio processing with Gemini 2.0 Flash
    Processes audio natively without separate transcription API.
    Initialises lazily so the app still starts if the key is missing.
    """

    def __init__(self):
        self.model = None
        self.audio_buffer = bytearray()
        self.min_audio_length = 16000 * 2  # 1 second at 16kHz, 16-bit
        self._ready = False
        self._init_error: Optional[str] = None
        self._try_init()

    # ------------------------------------------------------------------
    def _try_init(self):
        """Best-effort initialisation; errors are stored, not raised."""
        try:
            if not settings.GEMINI_API_KEY or settings.GEMINI_API_KEY == "your-gemini-api-key":
                self._init_error = "GEMINI_API_KEY not configured in .env"
                logger.warning(f"⚠️  {self._init_error}")
                return

            genai, HarmCategory, HarmBlockThreshold = _init_genai()
            genai.configure(api_key=settings.GEMINI_API_KEY)

            self.model = genai.GenerativeModel(
                'gemini-2.5-flash',
                generation_config={
                    "temperature": 0.7,
                    "top_p": 0.95,
                    "top_k": 40,
                    "max_output_tokens": 800,
                },
                safety_settings={
                    HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_NONE,
                    HarmCategory.HARM_CATEGORY_HARASSMENT: HarmBlockThreshold.BLOCK_NONE,
                    HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: HarmBlockThreshold.BLOCK_NONE,
                    HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_NONE,
                }
            )
            self._ready = True
            self._init_error = None
            logger.info("✅ Gemini 2.0 Flash audio service initialised")
        except Exception as exc:
            self._init_error = str(exc)
            logger.error(f"❌ Gemini init failed: {exc}")

    @property
    def ready(self) -> bool:
        return self._ready
    
    def add_audio_chunk(self, audio_data: bytes):
        """Buffer audio chunks until we have enough for processing"""
        self.audio_buffer.extend(audio_data)

    def has_sufficient_audio(self) -> bool:
        """Check if we have enough audio to process"""
        return len(self.audio_buffer) >= self.min_audio_length

    def clear_buffer(self):
        """Clear audio buffer after processing"""
        self.audio_buffer.clear()

    async def process_audio(
        self,
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        if not self._ready:
            return {"error": self._init_error or "Gemini service not initialised"}

        if not self.has_sufficient_audio():
            return {"error": "Insufficient audio data"}
        
        try:
            # Get system prompt
            system_prompt = self._build_prompt(context)
            
            # Convert audio buffer to base64
            audio_bytes = bytes(self.audio_buffer)
            
            # Create audio part for Gemini
            audio_part = {
                "mime_type": "audio/pcm",
                "data": base64.b64encode(audio_bytes).decode('utf-8')
            }
            
            # Generate content with audio + text prompt
            response = await asyncio.to_thread(
                self.model.generate_content,
                [
                    audio_part,
                    system_prompt
                ]
            )
            
            # Parse response
            response_text = response.text.strip()
            
            # Extract transcript and answer from response
            result = self._parse_response(response_text)
            
            # Clear buffer after successful processing
            self.clear_buffer()
            
            logger.info(f"Gemini processed audio: {result.get('transcript', '')[:50]}")
            return result
            
        except Exception as e:
            logger.error(f"Gemini audio processing error: {str(e)}")
            self.clear_buffer()
            return {"error": str(e)}
    
    def _build_prompt(self, context: Optional[Dict[str, Any]] = None) -> str:
        """Build system prompt for interview assistant"""
        context_str = ""
        if context:
            if context.get("company_name"):
                context_str += f"Company: {context['company_name']}\n"
            if context.get("role_title"):
                context_str += f"Role: {context['role_title']}\n"
        
        prompt = f"""You are an expert AI interview assistant. Listen to the audio and:

1. Transcribe exactly what was said
2. Determine if it's a question
3. If it's a question, provide a concise, professional answer (2-4 sentences)

{context_str}

Respond in this exact JSON format:
{{
  "transcript": "exact words spoken",
  "is_question": true/false,
  "answer": "your suggested answer (if question, otherwise empty string)",
  "confidence": 0.85
}}

Guidelines for answers:
- Keep answers brief (2-4 sentences max)
- Sound natural and conversational
- Be technically accurate but avoid unnecessary jargon
- Show confidence without arrogance
- Directly address the question

Respond only with the JSON, no additional text."""

        return prompt
    
    def _parse_response(self, response_text: str) -> Dict[str, Any]:
        """Parse Gemini's JSON response"""
        try:
            # Try to extract JSON from response
            import json
            
            # Remove markdown code blocks if present
            if "```json" in response_text:
                response_text = response_text.split("```json")[1].split("```")[0].strip()
            elif "```" in response_text:
                response_text = response_text.split("```")[1].split("```")[0].strip()
            
            result = json.loads(response_text)
            
            # Validate required fields
            if "transcript" not in result:
                result["transcript"] = ""
            if "is_question" not in result:
                result["is_question"] = "?" in result.get("transcript", "")
            if "answer" not in result:
                result["answer"] = ""
            if "confidence" not in result:
                result["confidence"] = 0.8
            
            return result
            
        except Exception as e:
            logger.error(f"Failed to parse Gemini response: {str(e)}")
            # Fallback: treat entire response as transcript
            return {
                "transcript": response_text[:200],
                "is_question": "?" in response_text,
                "answer": response_text if "?" in response_text else "",
                "confidence": 0.5
            }
    
    async def generate_simple_answer(self, question: str, context: Optional[Dict[str, Any]] = None) -> str:
        """
        Generate answer for typed question (fallback)
        """
        if not self._ready:
            return f"Gemini not available: {self._init_error}"

        try:
            context_str = ""
            if context:
                if context.get("company_name"):
                    context_str += f"Company: {context['company_name']}\n"
                if context.get("role_title"):
                    context_str += f"Role: {context['role_title']}\n"
            
            prompt = f"""{context_str}

Interview question: "{question}"

Provide a concise, professional answer (2-4 sentences) that:
- Sounds natural and conversational
- Is technically accurate
- Shows confidence without arrogance
- Directly addresses the question

Answer:"""

            response = await asyncio.to_thread(
                self.model.generate_content,
                prompt
            )
            
            return response.text.strip()
            
        except Exception as e:
            logger.error(f"Gemini answer generation error: {str(e)}")
            return f"Error generating answer: {str(e)}"

# Singleton instance
gemini_audio_service = GeminiAudioService()
