"""
db.py
─────
SQLite persistence layer for NIDS prediction statistics.

  init_db()           – create schema on startup
  record_prediction() – insert one row per inference call
  get_stats()         – return aggregated counters
"""

from __future__ import annotations

import sqlite3
import os
from pathlib import Path

# Database lives next to the project root so it persists across restarts.
_DEFAULT_DB_PATH = str(Path(__file__).parent.parent / "nids.db")
# Render-specific: allow a persistent disk mount to be used for sqlite storage.
DB_PATH = os.getenv("NIDS_DB_PATH", _DEFAULT_DB_PATH)

# ── DDL ────────────────────────────────────────────────────────────────
_CREATE_TABLE = """
CREATE TABLE IF NOT EXISTS predictions (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    ts           TEXT    DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    prediction   TEXT    NOT NULL,
    confidence   REAL    NOT NULL,
    threat_level TEXT    NOT NULL,
    is_attack    INTEGER NOT NULL,    -- 1 = attack, 0 = normal
    resp_ms      REAL                -- API-level response time (optional)
);
"""

# ── Public API ─────────────────────────────────────────────────────────

def init_db() -> None:
    """Create the predictions table if it doesn't already exist."""
    con = sqlite3.connect(DB_PATH)
    try:
        con.execute(_CREATE_TABLE)
        con.commit()
    finally:
        con.close()


def record_prediction(
    prediction: str,
    confidence: float,
    threat_level: str,
    is_attack: bool,
    resp_ms: float | None = None,
) -> None:
    """Insert a single prediction row."""
    con = sqlite3.connect(DB_PATH)
    try:
        con.execute(
            "INSERT INTO predictions (prediction, confidence, threat_level, is_attack, resp_ms)"
            " VALUES (?, ?, ?, ?, ?)",
            (prediction, confidence, threat_level, 1 if is_attack else 0, resp_ms),
        )
        con.commit()
    finally:
        con.close()


def get_stats() -> dict:
    """Return aggregated prediction statistics from the database."""
    con = sqlite3.connect(DB_PATH)
    try:
        total    = con.execute("SELECT COUNT(*) FROM predictions").fetchone()[0]
        attacks  = con.execute(
            "SELECT COUNT(*) FROM predictions WHERE is_attack = 1"
        ).fetchone()[0]
        breakdown: dict[str, int] = {}
        for atype in ("dos", "probe", "r2l", "u2r"):
            breakdown[atype] = con.execute(
                "SELECT COUNT(*) FROM predictions WHERE prediction = ?", (atype,)
            ).fetchone()[0]
    finally:
        con.close()

    rate = f"{attacks / total * 100:.1f}%" if total > 0 else "0%"
    return {
        "total_predictions": total,
        "attacks_detected":  attacks,
        "attack_breakdown":  breakdown,
        "detection_rate":    rate,
    }
