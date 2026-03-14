"""
main.py  (v2.0.0)
─────────────────
FastAPI backend for the NIDS — Network Intrusion Detection System.

Changes from v1:
  • Structured JSON logging (one JSON object per log line)
  • SQLite-backed /stats (survives restarts) via backend.db
  • API key authentication on /predict and /predict/batch via backend.auth
  • Version bumped to 2.0.0

Endpoints:
  GET  /              – Model info
  POST /predict       – Single prediction  [requires X-API-Key]
  GET  /health        – Health + uptime
  GET  /stats         – Persistent prediction statistics
  POST /predict/batch – Batch prediction   [requires X-API-Key]
"""

from __future__ import annotations

import json
import logging
import os
import sys
import time
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Any

import joblib
import numpy as np
import pandas as pd
from fastapi import Depends, FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# ── Local imports ────────────────────────────────────────────────────
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from backend.schema import NetworkConnection, PredictionResponse
from backend.db    import init_db, record_prediction, get_stats
from backend.auth  import require_api_key


# ══════════════════════════════════════════════════════════════════════
# Structured JSON logging
# ══════════════════════════════════════════════════════════════════════
class _JSONFormatter(logging.Formatter):
    _SKIP = {
        "msg", "args", "levelname", "levelno", "pathname", "filename",
        "module", "exc_info", "exc_text", "stack_info", "lineno",
        "funcName", "created", "msecs", "relativeCreated", "thread",
        "threadName", "processName", "process", "name", "message", "asctime",
    }

    def format(self, record: logging.LogRecord) -> str:
        entry: dict[str, Any] = {
            "ts":     datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "level":  record.levelname,
            "logger": record.name,
            "msg":    record.getMessage(),
        }
        if record.exc_info:
            entry["exc"] = self.formatException(record.exc_info)
        # Merge extra={...} fields passed to logger calls
        for k, v in record.__dict__.items():
            if k not in self._SKIP:
                entry[k] = v
        return json.dumps(entry)


def _setup_logging() -> logging.Logger:
    handler = logging.StreamHandler()
    handler.setFormatter(_JSONFormatter())
    root = logging.getLogger()
    root.handlers.clear()
    root.addHandler(handler)
    root.setLevel(logging.INFO)
    # Suppress noisy uvicorn access log — keep errors
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    return logging.getLogger("nids")


logger = _setup_logging()


# ══════════════════════════════════════════════════════════════════════
# Paths & constants
# ══════════════════════════════════════════════════════════════════════
BASE_DIR   = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_PATH = os.path.join(BASE_DIR, "model", "nids_model.pkl")
LABEL_PATH = os.path.join(BASE_DIR, "model", "label_encoder.pkl")

FEATURE_COLUMNS = [
    "duration", "protocol_type", "service", "flag",
    "src_bytes", "dst_bytes", "land", "wrong_fragments", "urgent",
    "hot", "num_failed_logins", "logged_in", "num_compromised",
    "root_shell", "su_attempted", "num_root", "num_file_creations",
    "num_shells", "num_access_files", "num_outbound_cmds",
    "is_host_login", "is_guest_login",
    "count", "srv_count",
    "serror_rate", "srv_serror_rate", "rerror_rate", "srv_rerror_rate",
    "same_srv_rate", "diff_srv_rate", "srv_diff_host_rate",
    "dst_host_count", "dst_host_srv_count",
    "dst_host_same_srv_rate", "dst_host_diff_srv_rate",
    "dst_host_same_src_port_rate", "dst_host_srv_diff_host_rate",
    "dst_host_serror_rate", "dst_host_srv_serror_rate",
    "dst_host_rerror_rate", "dst_host_srv_rerror_rate",
]

_TOP_FEATURE_HINTS: dict[str, list[str]] = {
    "dos":    ["serror_rate", "count", "src_bytes", "flag", "srv_serror_rate"],
    "probe":  ["diff_srv_rate", "dst_host_diff_srv_rate", "service", "srv_count", "srv_diff_host_rate"],
    "r2l":    ["num_failed_logins", "logged_in", "is_guest_login", "service", "flag"],
    "u2r":    ["root_shell", "su_attempted", "num_shells", "num_root", "num_compromised"],
    "normal": ["logged_in", "flag", "same_srv_rate", "serror_rate", "dst_host_same_srv_rate"],
}


# ══════════════════════════════════════════════════════════════════════
# Application state (model + uptime only — stats now in SQLite)
# ══════════════════════════════════════════════════════════════════════
class AppState:
    model      = None
    label_enc  = None
    model_type : str   = "unknown"
    start_time : float = 0.0

state = AppState()


# ══════════════════════════════════════════════════════════════════════
# Lifespan
# ══════════════════════════════════════════════════════════════════════
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Initialising NIDS API …", extra={"version": "2.0.0"})
    try:
        state.model     = joblib.load(MODEL_PATH)
        state.label_enc = joblib.load(LABEL_PATH)
        state.model_type = type(state.model.named_steps["classifier"]).__name__
        state.start_time = time.time()
        logger.info(
            "Model loaded",
            extra={
                "model_type": state.model_type,
                "classes":    list(state.label_enc.classes_),
                "features":   len(FEATURE_COLUMNS),
            },
        )
    except FileNotFoundError as exc:
        logger.error("Model file not found", extra={"error": str(exc)})
        raise RuntimeError("Model artifacts missing. Run model/train_model.py first.") from exc

    init_db()
    logger.info("SQLite database initialised", extra={"db": "nids.db"})

    yield  # ← server running

    db_stats = get_stats()
    logger.info(
        "Shutting down",
        extra={"total_predictions": db_stats["total_predictions"]},
    )


# ══════════════════════════════════════════════════════════════════════
# App
# ══════════════════════════════════════════════════════════════════════
app = FastAPI(
    title="NIDS — Network Intrusion Detection System",
    description=(
        "ML-powered API that classifies network connections as "
        "**normal** or one of four attack types: dos, probe, r2l, u2r.\n\n"
        "Protected endpoints require an `X-API-Key` header."
    ),
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ══════════════════════════════════════════════════════════════════════
# Global exception handler
# ══════════════════════════════════════════════════════════════════════
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.error(
        "Unhandled exception",
        extra={"method": request.method, "path": request.url.path, "error": str(exc)},
    )
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": f"Internal server error: {exc}"},
    )


# ══════════════════════════════════════════════════════════════════════
# Helpers
# ══════════════════════════════════════════════════════════════════════
def _connection_to_df(conn: NetworkConnection) -> pd.DataFrame:
    row = {col: getattr(conn, col) for col in FEATURE_COLUMNS}
    return pd.DataFrame([row])


def _build_top_features(prediction: str, conn: NetworkConnection) -> dict[str, Any]:
    keys = _TOP_FEATURE_HINTS.get(prediction, FEATURE_COLUMNS[:5])
    return {k: getattr(conn, k) for k in keys}


def _run_prediction(conn: NetworkConnection) -> PredictionResponse:
    df         = _connection_to_df(conn)
    pred_idx   = state.model.predict(df)[0]
    proba      = state.model.predict_proba(df)[0]
    confidence = float(np.max(proba))
    prediction = state.label_enc.inverse_transform([pred_idx])[0]
    top_feats  = _build_top_features(prediction, conn)
    return PredictionResponse.build(prediction, confidence, top_feats)


# ══════════════════════════════════════════════════════════════════════
# Routes
# ══════════════════════════════════════════════════════════════════════

@app.get("/", summary="Model info", tags=["System"])
async def root() -> dict:
    return {
        "status":       "ok",
        "model_loaded": state.model is not None,
        "version":      "2.0.0",
        "model_type":   state.model_type,
        "features":     len(FEATURE_COLUMNS),
        "attack_types": list(state.label_enc.classes_) if state.label_enc else [],
    }


@app.get("/health", summary="Health check", tags=["System"])
async def health() -> dict:
    uptime = int(time.time() - state.start_time) if state.start_time else 0
    return {
        "status":       "healthy",
        "model_loaded": state.model is not None,
        "uptime":       f"{uptime} seconds",
    }


@app.get("/stats", summary="Prediction statistics (persistent)", tags=["System"])
async def stats() -> dict:
    """Returns cumulative prediction statistics from the SQLite database."""
    return get_stats()


@app.post(
    "/predict",
    response_model=PredictionResponse,
    summary="Predict single connection",
    tags=["Prediction"],
    dependencies=[Depends(require_api_key)],
)
async def predict(conn: NetworkConnection) -> PredictionResponse:
    """
    Classify a single network connection.
    Requires **X-API-Key** header.
    """
    if state.model is None:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE,
                            detail="Model not loaded.")
    t0   = time.perf_counter()
    resp = _run_prediction(conn)
    ms   = round((time.perf_counter() - t0) * 1000, 2)

    record_prediction(
        prediction   = resp.prediction,
        confidence   = resp.confidence,
        threat_level = resp.threat_level,
        is_attack    = resp.is_attack,
        resp_ms      = ms,
    )
    logger.info(
        "predict",
        extra={
            "prediction":   resp.prediction,
            "confidence":   resp.confidence,
            "threat_level": resp.threat_level,
            "is_attack":    resp.is_attack,
            "resp_ms":      ms,
        },
    )
    return resp


@app.post(
    "/predict/batch",
    response_model=list[PredictionResponse],
    summary="Batch prediction (up to 100)",
    tags=["Prediction"],
    dependencies=[Depends(require_api_key)],
)
async def predict_batch(connections: list[NetworkConnection]) -> list[PredictionResponse]:
    """Classify up to 100 connections. Requires **X-API-Key** header."""
    if state.model is None:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE,
                            detail="Model not loaded.")
    if not connections:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY,
                            detail="Batch must not be empty.")
    if len(connections) > 100:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY,
                            detail=f"Batch size {len(connections)} exceeds 100.")

    rows      = [{col: getattr(c, col) for col in FEATURE_COLUMNS} for c in connections]
    df        = pd.DataFrame(rows)
    pred_idxs = state.model.predict(df)
    probas    = state.model.predict_proba(df)

    responses: list[PredictionResponse] = []
    for i, conn in enumerate(connections):
        prediction = state.label_enc.inverse_transform([pred_idxs[i]])[0]
        confidence = float(np.max(probas[i]))
        top_feats  = _build_top_features(prediction, conn)
        resp       = PredictionResponse.build(prediction, confidence, top_feats)
        record_prediction(resp.prediction, resp.confidence,
                          resp.threat_level, resp.is_attack)
        responses.append(resp)

    n_attacks = sum(1 for r in responses if r.is_attack)
    logger.info("predict_batch", extra={"count": len(connections), "attacks": n_attacks})
    return responses
