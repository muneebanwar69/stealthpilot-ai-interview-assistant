"""
Groq API Service for fast text response generation.

Primary text-response path: Groq with daily model rotation + streaming.
Fallback: Gemma-3-27b-it via Google GenAI.

Mirrors the cheating-daddy architecture where Gemini handles audio
transcription and Groq handles the fast text answer generation.
"""
import asyncio
import logging
from typing import Optional, Dict, Any, AsyncIterator, List

from app.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)

# ── Groq daily model rotation ──────────────────────────────────────────────

GROQ_MODELS = [
    "qwen-qwq-32b",
    "deepseek-r1-distill-llama-70b",
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant",
    "meta-llama/llama-4-scout-17b-16e-instruct",
]


def _get_model_for_today() -> str:
    """Rotate models daily so rate limits are shared."""
    from datetime import datetime

    day_of_year = datetime.utcnow().timetuple().tm_yday
    return GROQ_MODELS[day_of_year % len(GROQ_MODELS)]


def _strip_thinking_tags(text: str) -> str:
    import re
    return re.sub(r"<think>[\s\S]*?</think>", "", text).strip()


# ── Groq Service ───────────────────────────────────────────────────────────

class GroqService:
    """Async Groq API client with streaming SSE and daily model rotation."""

    def __init__(self):
        self._ready = False
        self._init_error: Optional[str] = None
        self._try_init()

    def _try_init(self):
        api_key = getattr(settings, "GROQ_API_KEY", "")
        if not api_key or api_key == "your-groq-api-key":
            self._init_error = "GROQ_API_KEY not configured in .env"
            logger.warning(f"⚠️  {self._init_error}")
            return
        self._ready = True
        logger.info(f"✅ Groq service ready (model today: {_get_model_for_today()})")

    @property
    def ready(self) -> bool:
        return self._ready

    async def generate_answer(
        self,
        question: str,
        context: Optional[Dict[str, Any]] = None,
        system_prompt: str = "",
        conversation_history: Optional[List[Dict[str, str]]] = None,
    ) -> str:
        """
        Generate an answer via Groq streaming, strip <think> tags, return full text.
        Falls back to a simple error string if the key is missing.
        """
        if not self._ready:
            return f"❌ Groq not available: {self._init_error}"

        import httpx

        api_key = settings.GROQ_API_KEY
        model = _get_model_for_today()

        # Build messages array
        messages: List[Dict[str, str]] = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        else:
            context_str = ""
            if context:
                if context.get("company_name"):
                    context_str += f"Company: {context['company_name']}\n"
                if context.get("role_title"):
                    context_str += f"Role: {context['role_title']}\n"
            messages.append({
                "role": "system",
                "content": f"You are an expert interview assistant.{chr(10) + context_str if context_str else ''}"
            })

        # Append conversation history for multi-turn context
        if conversation_history:
            messages.extend(conversation_history[-20:])

        messages.append({"role": "user", "content": question.strip()})

        try:
            full_text = ""
            async with httpx.AsyncClient(timeout=30.0) as client:
                async with client.stream(
                    "POST",
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": model,
                        "messages": messages,
                        "stream": True,
                        "temperature": 0.7,
                        "max_tokens": 1024,
                    },
                ) as resp:
                    if resp.status_code != 200:
                        body = await resp.aread()
                        logger.error(f"Groq API error {resp.status_code}: {body.decode()}")
                        return f"Groq error: HTTP {resp.status_code}"

                    async for line in resp.aiter_lines():
                        if not line.startswith("data: "):
                            continue
                        data = line[6:]
                        if data == "[DONE]":
                            break
                        try:
                            import json
                            payload = json.loads(data)
                            token = payload.get("choices", [{}])[0].get("delta", {}).get("content", "")
                            if token:
                                full_text += token
                        except Exception:
                            pass

            cleaned = _strip_thinking_tags(full_text)
            logger.info(f"Groq response completed ({model}): {cleaned[:80]}")
            return cleaned

        except Exception as e:
            logger.error(f"Groq error: {e}")
            return f"Error: {e}"


# ── Gemma fallback ─────────────────────────────────────────────────────────

class GemmaService:
    """Fallback text generation via Gemma-3-27b-it through Google GenAI SDK."""

    def __init__(self):
        self._ready = False
        self._init_error: Optional[str] = None
        self._try_init()

    def _try_init(self):
        if not settings.GEMINI_API_KEY or settings.GEMINI_API_KEY == "your-gemini-api-key":
            self._init_error = "GEMINI_API_KEY not configured"
            return
        self._ready = True
        logger.info("✅ Gemma fallback service ready (gemma-3-27b-it)")

    @property
    def ready(self) -> bool:
        return self._ready

    async def generate_answer(
        self,
        question: str,
        context: Optional[Dict[str, Any]] = None,
        system_prompt: str = "",
        conversation_history: Optional[List[Dict[str, str]]] = None,
    ) -> str:
        if not self._ready:
            return f"❌ Gemma not available: {self._init_error}"

        try:
            import google.generativeai as genai

            genai.configure(api_key=settings.GEMINI_API_KEY)
            model = genai.GenerativeModel("gemma-3-27b-it")

            # Build conversation
            messages = []
            if system_prompt:
                messages.append({"role": "user", "parts": [{"text": system_prompt}]})
                messages.append({"role": "model", "parts": [{"text": "Understood. I will follow these instructions."}]})

            if conversation_history:
                for msg in conversation_history[-20:]:
                    role = "model" if msg["role"] == "assistant" else "user"
                    messages.append({"role": role, "parts": [{"text": msg["content"]}]})

            messages.append({"role": "user", "parts": [{"text": question.strip()}]})

            response = await asyncio.to_thread(
                model.generate_content,
                messages,
            )

            return response.text.strip()

        except Exception as e:
            logger.error(f"Gemma error: {e}")
            return f"Error: {e}"


# ── Singleton instances ────────────────────────────────────────────────────

groq_service = GroqService()
gemma_service = GemmaService()


async def generate_text_response(
    question: str,
    context: Optional[Dict[str, Any]] = None,
    system_prompt: str = "",
    conversation_history: Optional[List[Dict[str, str]]] = None,
) -> str:
    """Primary entry point: try Groq first, fall back to Gemma."""
    if groq_service.ready:
        return await groq_service.generate_answer(question, context, system_prompt, conversation_history)
    if gemma_service.ready:
        return await gemma_service.generate_answer(question, context, system_prompt, conversation_history)
    # Final fallback to existing Gemini text service
    from app.services.gemini_text import gemini_text_service
    return await gemini_text_service.generate_answer(question, context)
