"""FastAPI application entry point."""

from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from backend.routers import conversation, generate, history, projects, settings, storage, templates
from backend.services import openrouter as openrouter_service


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage shared resources across the application lifetime."""
    openrouter_service.startup()
    yield
    await openrouter_service.shutdown()


app = FastAPI(title="Punchy Image API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:8000"],
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Content-Type"],
)

app.include_router(settings.router, prefix="/api")
app.include_router(generate.router, prefix="/api")
app.include_router(history.router, prefix="/api")
app.include_router(conversation.router, prefix="/api")
app.include_router(projects.router, prefix="/api")
app.include_router(templates.router, prefix="/api")
app.include_router(storage.router, prefix="/api")

# Serve frontend static files — must be last so API routes take priority
frontend_dist = Path(__file__).parent.parent / "frontend" / "dist"
if frontend_dist.exists():
    app.mount("/", StaticFiles(directory=str(frontend_dist), html=True), name="frontend")
