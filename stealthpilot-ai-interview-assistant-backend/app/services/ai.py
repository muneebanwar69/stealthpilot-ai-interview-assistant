"""
AI service for generating interview answers using Claude and OpenAI
"""
from anthropic import Anthropic, AsyncAnthropic
from openai import AsyncOpenAI
from app.config import get_settings
from typing import Optional, Dict, Any
import asyncio

settings = get_settings()

class AIService:
    def __init__(self):
        self.anthropic_client = None
        self.openai_client = None
        
    def _init_anthropic(self):
        """Initialize Anthropic client"""
        if not self.anthropic_client and settings.ANTHROPIC_API_KEY and settings.ANTHROPIC_API_KEY != "your-anthropic-api-key":
            self.anthropic_client = AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
    
    def _init_openai(self):
        """Initialize OpenAI client"""
        if not self.openai_client and settings.OPENAI_API_KEY and settings.OPENAI_API_KEY != "your-openai-api-key":
            self.openai_client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    
    async def generate_answer(
        self,
        question: str,
        context: Optional[Dict[str, Any]] = None,
        provider: str = "anthropic",
        stream: bool = False
    ) -> str:
        """
        Generate an answer to an interview question
        
        Args:
            question: The interview question to answer
            context: Additional context (company_name, role_title, previous_transcript, etc.)
            provider: 'anthropic' or 'openai'
            stream: Whether to stream the response (for real-time display)
        
        Returns:
            Generated answer text
        """
        # Build context string
        context_str = ""
        if context:
            if context.get("company_name"):
                context_str += f"Company: {context['company_name']}\n"
            if context.get("role_title"):
                context_str += f"Role: {context['role_title']}\n"
            if context.get("previous_transcript"):
                context_str += f"Previous conversation:\n{context['previous_transcript']}\n\n"
        
        prompt = f"""You are an expert interview coach helping a candidate answer interview questions in real-time. 

{context_str}

The interviewer just asked: "{question}"

Provide a concise, professional answer that:
- Is 2-4 sentences long (keep it brief for real-time delivery)
- Sounds natural and conversational
- Is technically accurate but avoids unnecessary jargon
- Shows confidence without arrogance
- Directly addresses the question

Answer:"""

        try:
            if provider == "anthropic":
                return await self._generate_anthropic(prompt, stream)
            elif provider == "openai":
                return await self._generate_openai(prompt, stream)
            else:
                raise ValueError(f"Unsupported provider: {provider}")
        except Exception as e:
            return f"Error generating answer: {str(e)}"
    
    async def _generate_anthropic(self, prompt: str, stream: bool = False) -> str:
        """Generate answer using Claude"""
        self._init_anthropic()
        if not self.anthropic_client:
            raise ValueError("Anthropic API key not configured")
        
        try:
            if stream:
                # Streaming response
                full_response = ""
                async with self.anthropic_client.messages.stream(
                    model="claude-3-5-sonnet-20241022",
                    max_tokens=300,
                    messages=[{"role": "user", "content": prompt}]
                ) as stream:
                    async for text in stream.text_stream:
                        full_response += text
                return full_response
            else:
                # Non-streaming response
                message = await self.anthropic_client.messages.create(
                    model="claude-3-5-sonnet-20241022",
                    max_tokens=300,
                    messages=[{"role": "user", "content": prompt}]
                )
                return message.content[0].text.strip()
        except Exception as e:
            raise Exception(f"Anthropic API error: {str(e)}")
    
    async def _generate_openai(self, prompt: str, stream: bool = False) -> str:
        """Generate answer using OpenAI"""
        self._init_openai()
        if not self.openai_client:
            raise ValueError("OpenAI API key not configured")
        
        try:
            response = await self.openai_client.chat.completions.create(
                model="gpt-4-turbo-preview",
                max_tokens=300,
                messages=[{"role": "user", "content": prompt}],
                stream=stream
            )
            
            if stream:
                full_response = ""
                async for chunk in response:
                    content = chunk.choices[0].delta.content
                    if content:
                        full_response += content
                return full_response
            else:
                return response.choices[0].message.content.strip()
        except Exception as e:
            raise Exception(f"OpenAI API error: {str(e)}")
    
    async def detect_question(self, transcript: str) -> Optional[str]:
        """
        Detect if the transcript contains a question that needs answering
        
        Returns:
            The question text if found, None otherwise
        """
        transcript = transcript.strip()
        
        # Simple heuristics for question detection
        question_indicators = ["?", "what", "how", "why", "when", "where", "who", "can you", "could you", "would you", "tell me", "explain", "describe"]
        
        # Check if transcript ends with ? or contains question words
        if "?" in transcript or any(indicator in transcript.lower() for indicator in question_indicators):
            # Extract the last sentence that looks like a question
            sentences = transcript.split(".")
            for sentence in reversed(sentences):
                sentence = sentence.strip()
                if "?" in sentence or any(indicator in sentence.lower() for indicator in question_indicators):
                    return sentence
        
        return None
    
    async def summarize_session(self, transcript: str, ai_responses: list) -> Dict[str, Any]:
        """Generate a summary of the interview session"""
        self._init_anthropic()
        if not self.anthropic_client:
            return {"error": "Anthropic API key not configured"}
        
        summary_prompt = f"""Analyze this interview transcript and provide a summary:

Transcript:
{transcript[:2000]}  # Limit to avoid token limits

Provide:
1. Main topics discussed (3-5 keywords)
2. Overall performance rating (1-10)
3. Strengths (2-3 points)
4. Areas for improvement (2-3 points)

Format as JSON."""

        try:
            message = await self.anthropic_client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=500,
                messages=[{"role": "user", "content": summary_prompt}]
            )
            return {"summary": message.content[0].text.strip()}
        except Exception as e:
            return {"error": str(e)}

# Singleton instance
ai_service = AIService()
