"""
Screenshot Analysis Service
Sends raw screenshot images to Gemini 2.0 Flash vision API
to detect questions, programming problems, or exam content
and generate answers.
"""
import asyncio
import base64
import json
import logging
from typing import Optional, Dict, Any

from app.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)

# Reuse the lazy-init pattern from gemini_audio
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


class ScreenshotAnalyzer:
    """
    Sends a screenshot image to Gemini 2.0 Flash and asks the model
    to detect visible questions / code problems and produce answers.
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
                    "max_output_tokens": 3000,
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
            logger.info("✅ Screenshot Analyzer (Gemini Vision) initialised")
        except Exception as exc:
            self._init_error = str(exc)
            logger.error(f"❌ Screenshot Analyzer init failed: {exc}")

    @property
    def ready(self) -> bool:
        return self._ready

    async def analyze(
        self,
        image_base64: str,
        mime_type: str = "image/png",
        context: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Analyse a screenshot image.

        Parameters
        ----------
        image_base64 : str
            Base-64 encoded screenshot (PNG or JPEG).
        mime_type : str
            MIME type of the image.
        context : dict, optional
            Extra context (company, role, etc.) to tailor the answer.

        Returns
        -------
        dict with keys: detected (bool), questions (list[str]), answer (str), raw_text (str)
        """
        if not self._ready:
            return {"error": self._init_error or "Screenshot Analyzer not initialised"}

        try:
            prompt = self._build_prompt(context)

            image_part = {
                "mime_type": mime_type,
                "data": image_base64,
            }

            response = await asyncio.to_thread(
                self.model.generate_content,
                [image_part, prompt],
            )

            response_text = response.text.strip()
            result = self._parse_response(response_text)
            logger.info(
                f"Screenshot analysed — detected={result.get('detected')}, "
                f"questions={len(result.get('questions', []))}"
            )
            return result

        except Exception as e:
            logger.error(f"Screenshot analysis error: {e}")
            return {"error": str(e)}

    def _build_prompt(self, context: Optional[Dict[str, Any]] = None) -> str:
        context_str = ""
        if context:
            if context.get("company_name"):
                context_str += f"Company: {context['company_name']}\n"
            if context.get("role_title"):
                context_str += f"Role: {context['role_title']}\n"

        return f"""You are an expert AI assistant. Look at this screenshot carefully.

Your task:
1. Identify any visible questions, programming problems, coding challenges, exam questions, interview questions, or technical prompts on the screen.
2. If you find any, provide a detailed, correct, and well-structured answer for each one.
3. If there is code visible, also explain what it does and point out any bugs or improvements.
4. If you see nothing relevant (just a desktop, browser tab, etc.) say so.

{context_str}

Respond in this exact JSON format:
{{
  "detected": true,
  "questions": ["question 1 text", "question 2 text"],
  "answer": "Your detailed answer covering all detected questions. Use markdown formatting, code blocks where appropriate.",
  "raw_text": "Brief plain-text summary of what is visible on the screen"
}}

If nothing relevant is detected:
{{
  "detected": false,
  "questions": [],
  "answer": "",
  "raw_text": "Description of what is visible on the screen"
}}

Guidelines:
- Be thorough and technically accurate.
- For programming problems provide working code solutions.
- For multiple-choice questions, explain why the correct answer is correct.
- Use markdown: headings, bullet points, and fenced code blocks.
- Respond ONLY with the JSON, no additional text."""

    def _parse_response(self, text: str) -> Dict[str, Any]:
        try:
            # Strip markdown fences
            if "```json" in text:
                text = text.split("```json")[1].split("```")[0].strip()
            elif "```" in text:
                text = text.split("```")[1].split("```")[0].strip()

            result = json.loads(text)

            # Ensure required fields
            result.setdefault("detected", False)
            result.setdefault("questions", [])
            result.setdefault("answer", "")
            result.setdefault("raw_text", "")
            return result

        except Exception as e:
            logger.error(f"Failed to parse screenshot response: {e}")
            # Treat the whole response as a freeform answer
            return {
                "detected": True,
                "questions": [],
                "answer": text,
                "raw_text": text[:300],
            }


# Singleton
screenshot_analyzer = ScreenshotAnalyzer()
