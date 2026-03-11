from fastapi import FastAPI, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from sqlalchemy import select
from app.config import get_settings
from app.database import engine, Base, AsyncSessionLocal
from app.models.user import User, UserRole, UserStatus
from app.core.security import get_password_hash, generate_api_key
from app.api import auth, users, sessions, admin, websocket, screenshot, transcribe

settings = get_settings()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Create tables and seed admin
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    # Create default admin user if not exists
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.email == settings.ADMIN_EMAIL))
        admin_user = result.scalar_one_or_none()
        
        if not admin_user:
            admin_user = User(
                email=settings.ADMIN_EMAIL,
                username="admin",
                hashed_password=get_password_hash(settings.ADMIN_PASSWORD),
                full_name="Admin User",
                role=UserRole.ADMIN,
                status=UserStatus.APPROVED,
                is_active=True,
                api_key=generate_api_key()
            )
            db.add(admin_user)
            await db.commit()
            print(f"✅ Admin user created: {settings.ADMIN_EMAIL}")
    
    yield
    
    # Shutdown
    await engine.dispose()

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="StealthPilot - Invisible AI Interview Assistant API",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(users.router, prefix="/api/users", tags=["Users"])
app.include_router(sessions.router, prefix="/api/sessions", tags=["Sessions"])
app.include_router(admin.router, prefix="/api/admin", tags=["Admin"])
app.include_router(websocket.router, prefix="/api", tags=["WebSocket"])
app.include_router(screenshot.router, prefix="/api/screenshot", tags=["Screenshot"])
app.include_router(transcribe.router, tags=["Transcription"])

@app.get("/")
async def root():
    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running",
        "docs": "/docs"
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": "2026-03-03"}

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Internal server error", "error": str(exc)}
    )
