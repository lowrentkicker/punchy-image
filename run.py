#!/usr/bin/env python3
"""ImageGen launcher. Starts the backend and serves the frontend."""

import argparse
import json
import os
import subprocess
import sys
from pathlib import Path

IMAGEGEN_DIR = Path.home() / ".imagegen"


def ensure_directories() -> None:
    """Create the ~/.imagegen/ directory structure on first launch."""
    dirs = [
        IMAGEGEN_DIR,
        IMAGEGEN_DIR / "projects" / "default" / "images",
        IMAGEGEN_DIR / "projects" / "default" / "thumbnails",
        IMAGEGEN_DIR / "projects" / "default" / "conversations",
        IMAGEGEN_DIR / "projects" / "default" / "references",
        IMAGEGEN_DIR / "templates",
        IMAGEGEN_DIR / "styles",
    ]
    for d in dirs:
        d.mkdir(parents=True, exist_ok=True)

    # Initialize empty JSON files if they don't exist
    config_path = IMAGEGEN_DIR / "config.json"
    if not config_path.exists():
        config_path.write_text(json.dumps({}, indent=2))

    history_path = IMAGEGEN_DIR / "projects" / "default" / "history.json"
    if not history_path.exists():
        history_path.write_text(json.dumps([], indent=2))

    project_path = IMAGEGEN_DIR / "projects" / "default" / "project.json"
    if not project_path.exists():
        project_path.write_text(json.dumps({"name": "default"}, indent=2))


def build_frontend() -> None:
    """Build the React frontend if dist/ doesn't exist."""
    frontend_dir = Path(__file__).parent / "frontend"
    dist_dir = frontend_dir / "dist"

    if dist_dir.exists():
        return

    print("Building frontend...")
    if not (frontend_dir / "node_modules").exists():
        subprocess.run(
            ["npm", "install"],
            cwd=str(frontend_dir),
            check=True,
        )
    subprocess.run(
        ["npm", "run", "build"],
        cwd=str(frontend_dir),
        check=True,
    )
    print("Frontend built successfully.")


def main() -> None:
    parser = argparse.ArgumentParser(description="Start ImageGen")
    parser.add_argument(
        "--port",
        type=int,
        default=int(os.environ.get("IMAGEGEN_PORT", "8000")),
        help="Port to run on (default: 8000)",
    )
    parser.add_argument(
        "--dev",
        action="store_true",
        help="Development mode: enables reload, skips frontend build",
    )
    args = parser.parse_args()

    ensure_directories()

    if not args.dev:
        build_frontend()
    else:
        print(f"Dev mode: start Vite separately with 'cd frontend && npm run dev'")

    import uvicorn

    uvicorn.run(
        "backend.main:app",
        host="127.0.0.1",
        port=args.port,
        reload=args.dev,
    )


if __name__ == "__main__":
    main()
