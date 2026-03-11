"""
Simplified Gemini service for TEXT-ONLY processing
No audio support - audio transcription happens on frontend with Web Speech API
"""
import asyncio
import logging
from typing import Optional, Dict, Any

from app.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)

# Lazy imports
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


class GeminiTextService:
    """
    Gemini service for text-only processing.
    Receives transcribed text from frontend (Web Speech API) and generates answers.
    """

    def __init__(self):
        self.model = None
        self._ready = False
        self._init_error: Optional[str] = None
        self._try_init()

    def _try_init(self):
        try:
            if not settings.GEMINI_API_KEY or settings.GEMINI_API_KEY == "your-gemini-api-key":
                self._init_error = "GEMINI_API_KEY not configured in .env"
                logger.warning(f"⚠️  {self._init_error}")
                return

            genai, HarmCategory, HarmBlockThreshold = _init_genai()
            genai.configure(api_key=settings.GEMINI_API_KEY)

            self.model = genai.GenerativeModel(
                "gemini-flash-latest",
                generation_config={
                    "temperature": 0.4,
                    "top_p": 0.9,
                    "top_k": 20,
                    "max_output_tokens": 500,
                },
                safety_settings={
                    HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_NONE,
                    HarmCategory.HARM_CATEGORY_HARASSMENT: HarmBlockThreshold.BLOCK_NONE,
                    HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: HarmBlockThreshold.BLOCK_NONE,
                    HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_NONE,
                },
            )
            self._ready = True
            self._init_error = None
            logger.info("✅ Gemini text service initialized (gemini-flash-latest - fast & better quota)")
        except Exception as exc:
            self._init_error = str(exc)
            logger.error(f"❌ Gemini init failed: {exc}")

    @property
    def ready(self) -> bool:
        return self._ready

    async def generate_answer(
        self, 
        question: str, 
        context: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Generate answer for a question.
        
        Args:
            question: The transcribed question text
            context: Optional context (company_name, role_title)
        Returns:
            AI-generated answer as string
        """
        if not self._ready:
            return f"❌ Gemini not available: {self._init_error}"

        try:
            context_str = ""
            if context:
                if context.get("company_name"):
                    context_str += f"Company: {context['company_name']}\n"
                if context.get("role_title"):
                    context_str += f"Role: {context['role_title']}\n"

            prompt = f"""{context_str}

Interview question: "{question}"

Provide a clear, professional answer (2-3 sentences). Be direct and confident.

Answer:"""

            response = await asyncio.to_thread(
                self.model.generate_content,
                prompt
            )

            return response.text.strip()

        except Exception as e:
            logger.error(f"Gemini answer generation error: {str(e)}")
            return f"Error generating answer: {str(e)}"

    async def analyze_transcript(
        self, 
        transcript: str,
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Analyze if transcript contains a question and generate answer if needed.
        
        Returns:
            dict with keys: is_question, answer, confidence
        """
        if not self._ready:
            return {
                "is_question": False,
                "answer": "",
                "confidence": 0.0,
                "error": self._init_error
            }

        try:
            transcript_lower = transcript.lower().strip()
            
            # ✅ OPTIMIZATION: Smart question detection with multiple signals
            question_words = ("what", "why", "how", "when", "where", "who", "which", 
                            "can", "could", "would", "should", "will", "shall",
                            "is", "are", "was", "were", "do", "does", "did",
                            "have", "has", "had", "may", "might", "must")
            
            has_question_mark = "?" in transcript
            starts_with_question = transcript_lower.startswith(question_words)
            contains_question_word = any(f" {qw} " in f" {transcript_lower} " for qw in question_words)
            
            # Combine signals for better accuracy
            is_question = has_question_mark or starts_with_question or (
                contains_question_word and len(transcript.split()) >= 4
            )

            if not is_question:
                return {
                    "is_question": False,
                    "answer": "",
                    "confidence": 0.95
                }

            # ✅ Generate answer for detected questions only
            answer = await self.generate_answer(transcript, context)

            return {
                "is_question": True,
                "answer": answer,
                "confidence": 0.92
            }

        except Exception as e:
            logger.error(f"Transcript analysis error: {e}")
            return {
                "is_question": False,
                "answer": "",
                "confidence": 0.0,
                "error": str(e)
            }


# Singleton instance
gemini_text_service = GeminiTextService()
