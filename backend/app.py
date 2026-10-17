
"""
Optional local preview server.

Form submissions use Web3Forms in the browser.

Run from the project root:

python -m uvicorn backend.app:app --reload
"""

from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles


ROOT = Path(__file__).resolve().parent.parent
FRONTEND = ROOT / "frontend"

app = FastAPI(
    title="Spandan Portfolio Preview",
    docs_url=None,
    redoc_url=None
)

app.mount(
    "/assets",
    StaticFiles(directory=FRONTEND / "assets"),
    name="assets"
)


@app.get("/")
@app.get("/index.html")
def index():
    return FileResponse(FRONTEND / "index.html")


@app.get("/cv.html")
def cv():
    return FileResponse(FRONTEND / "cv.html")


@app.get("/messages.html")
def messages():
    return FileResponse(FRONTEND / "messages.html")


@app.get("/favicon.ico")
def favicon():
    return FileResponse(
        FRONTEND / "assets" / "favicon.svg",
        media_type="image/svg+xml"
    )


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "contact_provider": "Web3Forms",
        "preview_only": True
    }
