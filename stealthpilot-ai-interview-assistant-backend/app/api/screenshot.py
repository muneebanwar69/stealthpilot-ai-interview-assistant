"""
Screenshot Analysis API
POST /api/screenshot/analyze — accepts a base64 image, returns AI analysis
"""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List

from app.core.dependencies import get_current_user
from app.models.user import User
from app.services.screenshot_analyzer import screenshot_analyzer

router = APIRouter()


class ScreenshotRequest(BaseModel):
    image: str = Field(..., description="Base64-encoded screenshot image (PNG or JPEG)")
    mime_type: str = Field(default="image/png", description="MIME type of the image")
    context: Optional[Dict[str, Any]] = Field(default=None, description="Optional context (company_name, role_title)")


class ScreenshotResponse(BaseModel):
    detected: bool
    questions: List[str]
    answer: str
    raw_text: str
    error: Optional[str] = None


@router.post("/analyze", response_model=ScreenshotResponse)
async def analyze_screenshot(
    payload: ScreenshotRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Accepts a base64 screenshot image and sends it to Gemini Vision
    to detect questions, code problems, or exam content and produce answers.
    """
    if not screenshot_analyzer.ready:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Screenshot analysis service is not available. Check GEMINI_API_KEY.",
        )

    # Validate image payload is not empty / too small
    if len(payload.image) < 100:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Image data is too small or empty.",
        )

    result = await screenshot_analyzer.analyze(
        image_base64=payload.image,
        mime_type=payload.mime_type,
        context=payload.context,
    )

    if "error" in result and result["error"]:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=result["error"],
        )

    return ScreenshotResponse(
        detected=result.get("detected", False),
        questions=result.get("questions", []),
        answer=result.get("answer", ""),
        raw_text=result.get("raw_text", ""),
    )
