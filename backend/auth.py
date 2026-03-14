"""
auth.py
───────
FastAPI dependency for API-key authentication.

Usage in routes:
    from backend.auth import require_api_key
    from fastapi import Depends

    @app.post("/predict", dependencies=[Depends(require_api_key)])
    async def predict(...): ...

Environment variable:
    NIDS_API_KEY  – secret key clients must send in the X-API-Key header.
                    Falls back to "nids-dev-key-2025" for local development.
"""

from __future__ import annotations

import os

from fastapi import HTTPException, Security, status
from fastapi.security import APIKeyHeader

# ── Key storage ─────────────────────────────────────────────────────────
_HEADER_SCHEME = APIKeyHeader(name="X-API-Key", auto_error=False)
_VALID_KEY: str = os.getenv("NIDS_API_KEY", "nids-dev-key-2025")

# ── Dependency ───────────────────────────────────────────────────────────
async def require_api_key(key: str | None = Security(_HEADER_SCHEME)) -> str:
    """
    Raise HTTP 401 if the X-API-Key header is absent or incorrect.
    Returns the key string on success (usable for logging).
    """
    if key != _VALID_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=(
                "Invalid or missing API key. "
                "Provide a valid key in the X-API-Key request header."
            ),
            headers={"WWW-Authenticate": "ApiKey"},
        )
    return key
