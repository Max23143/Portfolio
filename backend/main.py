
"""
Alternative FastAPI entry point.

Run from the Portfolio root:

python -m uvicorn backend.main:app --reload
"""

from .app import app
