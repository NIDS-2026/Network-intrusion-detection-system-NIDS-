"""
schema.py
─────────
Pydantic v2 models for the NIDS API.

  NetworkConnection  – Input: all 41 NSL-KDD features with validation
  PredictionResponse – Output: prediction, confidence, threat level, etc.

Changes from v1:
  - service: expanded from 7-value Literal → str with a field_validator
    (maps unknown service names to "other"; handles all 69 NSL-KDD services)
  - flag:    expanded from 5 → 11 values to cover the full NSL-KDD flag set
"""

from __future__ import annotations

from typing import Literal
from pydantic import BaseModel, Field, field_validator


# ═══════════════════════════════════════════════════════════════════
#  Threat-level helpers
# ═══════════════════════════════════════════════════════════════════
_BASE_THREAT: dict[str, str] = {
    "normal": "None",
    "dos":    "Critical",
    "probe":  "High",
    "r2l":    "High",
    "u2r":    "Critical",
}
_LEVELS = ["None", "Low", "Medium", "High", "Critical"]

_ATTACK_NAMES: dict[str, str] = {
    "normal": "No Threat Detected",
    "dos":    "Denial of Service (DoS)",
    "probe":  "Network Probe / Surveillance",
    "r2l":    "Remote-to-Local (R2L)",
    "u2r":    "User-to-Root (U2R) Privilege Escalation",
}
_RECOMMENDATIONS: dict[str, str] = {
    "normal": "No action required. Connection appears legitimate.",
    "dos": (
        "IMMEDIATE ACTION: Block source IP, activate rate-limiting rules, "
        "and alert the security team. Escalate to incident response."
    ),
    "probe": (
        "Investigate source IP for scanning activity. "
        "Review firewall rules and enable IPS signatures for port scans."
    ),
    "r2l": (
        "Lock the targeted account, force password reset, and enable "
        "multi-factor authentication. Audit login attempts from source IP."
    ),
    "u2r": (
        "CRITICAL: Isolate the affected host immediately. "
        "Audit privilege escalation paths and review sudo/su logs."
    ),
}

# All services that appear in the real NSL-KDD dataset
_KNOWN_SERVICES: frozenset[str] = frozenset({
    "aol", "auth", "bgp", "courier", "csnet_ns", "ctf", "daytime", "discard",
    "domain", "domain_u", "echo", "eco_i", "ecr_i", "efs", "exec", "finger",
    "ftp", "ftp_data", "gopher", "harvest", "hostnames", "http", "http_2784",
    "http_443", "http_8001", "imap4", "IRC", "iso_tsap", "klogin", "kshell",
    "ldap", "link", "login", "mtp", "name", "netbios_dgm", "netbios_ns",
    "netbios_ssn", "netstat", "nnsp", "nntp", "ntp_u", "other", "pm_dump",
    "pop_2", "pop_3", "printer", "private", "red_i", "remote_job", "rje",
    "shell", "smtp", "sql_net", "ssh", "sunrpc", "supdup", "systat", "telnet",
    "tftp_u", "tim_i", "time", "urh_i", "urp_i", "uucp", "uucp_path",
    "vmnet", "whois", "X11", "Z39_50",
})


def compute_threat_level(prediction: str, confidence: float) -> str:
    base = _BASE_THREAT.get(prediction, "None")
    if base == "None":
        return "None"
    base_idx  = _LEVELS.index(base)
    downgrade = 0 if confidence >= 0.90 else (1 if confidence >= 0.70 else 2)
    return _LEVELS[max(0, base_idx - downgrade)]


# ═══════════════════════════════════════════════════════════════════
#  Input Model — NetworkConnection (41 features)
# ═══════════════════════════════════════════════════════════════════
class NetworkConnection(BaseModel):
    """
    Represents a single network connection record in NSL-KDD format.
    All 41 features are present with sensible defaults matching a
    typical normal (HTTP) connection.
    """

    # ── Categorical features ────────────────────────────────────────
    protocol_type: Literal["tcp", "udp", "icmp"] = Field(
        default="tcp",
        description="Network protocol used by the connection.",
    )
    service: str = Field(
        default="http",
        description=(
            "Network service on the destination (e.g. http, ftp, ssh). "
            "Unknown services are mapped to 'other' automatically."
        ),
    )
    flag: Literal[
        "SF", "S0", "REJ", "RSTO", "SH",
        "S1", "S2", "S3", "OTH", "RSTOS0", "RSTR"
    ] = Field(
        default="SF",
        description="Status flag of the connection (all 11 NSL-KDD values supported).",
    )

    @field_validator("service", mode="before")
    @classmethod
    def normalise_service(cls, v: str) -> str:
        """Map unknown service names to 'other' instead of raising a validation error."""
        return v if v in _KNOWN_SERVICES else "other"

    # ── Basic features ──────────────────────────────────────────────
    duration:        int   = Field(default=0,    ge=0,   le=60)
    src_bytes:       int   = Field(default=491,  ge=0,   le=100_000)
    dst_bytes:       int   = Field(default=5001, ge=0,   le=100_000)
    land:            int   = Field(default=0,    ge=0,   le=1)
    wrong_fragments: int   = Field(default=0,    ge=0,   le=3)
    urgent:          int   = Field(default=0,    ge=0,   le=1)

    # ── Content features ────────────────────────────────────────────
    hot:               int = Field(default=0,  ge=0, le=30)
    num_failed_logins: int = Field(default=0,  ge=0, le=5)
    logged_in:         int = Field(default=1,  ge=0, le=1)
    num_compromised:   int = Field(default=0,  ge=0, le=10)
    root_shell:        int = Field(default=0,  ge=0, le=1)
    su_attempted:      int = Field(default=0,  ge=0, le=1)
    num_root:          int = Field(default=0,  ge=0, le=10)
    num_file_creations:int = Field(default=0,  ge=0, le=10)
    num_shells:        int = Field(default=0,  ge=0, le=5)
    num_access_files:  int = Field(default=0,  ge=0, le=10)
    num_outbound_cmds: int = Field(default=0,  ge=0, le=0)
    is_host_login:     int = Field(default=0,  ge=0, le=1)
    is_guest_login:    int = Field(default=0,  ge=0, le=1)

    # ── Traffic features (2-second window) ──────────────────────────
    count:              int   = Field(default=10,   ge=1, le=512)
    srv_count:          int   = Field(default=10,   ge=1, le=512)
    serror_rate:        float = Field(default=0.0,  ge=0.0, le=1.0)
    srv_serror_rate:    float = Field(default=0.0,  ge=0.0, le=1.0)
    rerror_rate:        float = Field(default=0.0,  ge=0.0, le=1.0)
    srv_rerror_rate:    float = Field(default=0.0,  ge=0.0, le=1.0)
    same_srv_rate:      float = Field(default=1.0,  ge=0.0, le=1.0)
    diff_srv_rate:      float = Field(default=0.0,  ge=0.0, le=1.0)
    srv_diff_host_rate: float = Field(default=0.0,  ge=0.0, le=1.0)

    # ── Host-based traffic features (100-connection window) ─────────
    dst_host_count:                int   = Field(default=150, ge=1, le=256)
    dst_host_srv_count:            int   = Field(default=25,  ge=1, le=256)
    dst_host_same_srv_rate:        float = Field(default=1.0, ge=0.0, le=1.0)
    dst_host_diff_srv_rate:        float = Field(default=0.0, ge=0.0, le=1.0)
    dst_host_same_src_port_rate:   float = Field(default=0.0, ge=0.0, le=1.0)
    dst_host_srv_diff_host_rate:   float = Field(default=0.0, ge=0.0, le=1.0)
    dst_host_serror_rate:          float = Field(default=0.0, ge=0.0, le=1.0)
    dst_host_srv_serror_rate:      float = Field(default=0.0, ge=0.0, le=1.0)
    dst_host_rerror_rate:          float = Field(default=0.0, ge=0.0, le=1.0)
    dst_host_srv_rerror_rate:      float = Field(default=0.0, ge=0.0, le=1.0)

    model_config = {
        "json_schema_extra": {
            "examples": [{
                "summary": "Typical normal HTTP connection",
                "value": {
                    "protocol_type": "tcp", "service": "http", "flag": "SF",
                    "duration": 0, "src_bytes": 491, "dst_bytes": 5001,
                    "land": 0, "wrong_fragments": 0, "urgent": 0,
                    "hot": 0, "num_failed_logins": 0, "logged_in": 1,
                    "num_compromised": 0, "root_shell": 0, "su_attempted": 0,
                    "num_root": 0, "num_file_creations": 0, "num_shells": 0,
                    "num_access_files": 0, "num_outbound_cmds": 0,
                    "is_host_login": 0, "is_guest_login": 0,
                    "count": 10, "srv_count": 10,
                    "serror_rate": 0.0, "srv_serror_rate": 0.0,
                    "rerror_rate": 0.0, "srv_rerror_rate": 0.0,
                    "same_srv_rate": 1.0, "diff_srv_rate": 0.0,
                    "srv_diff_host_rate": 0.0,
                    "dst_host_count": 150, "dst_host_srv_count": 25,
                    "dst_host_same_srv_rate": 1.0, "dst_host_diff_srv_rate": 0.0,
                    "dst_host_same_src_port_rate": 0.0,
                    "dst_host_srv_diff_host_rate": 0.0,
                    "dst_host_serror_rate": 0.0, "dst_host_srv_serror_rate": 0.0,
                    "dst_host_rerror_rate": 0.0, "dst_host_srv_rerror_rate": 0.0,
                },
            }]
        }
    }


# ═══════════════════════════════════════════════════════════════════
#  Output Model — PredictionResponse
# ═══════════════════════════════════════════════════════════════════
class PredictionResponse(BaseModel):
    """NIDS prediction result returned by the inference endpoint."""

    prediction:   str   = Field(description="Predicted class: normal | dos | probe | r2l | u2r")
    confidence:   float = Field(ge=0.0, le=1.0)
    threat_level: str   = Field(description="None | Low | Medium | High | Critical")
    attack_type:  str   = Field(description="Human-readable attack category.")
    is_attack:    bool  = Field(description="True if connection is classified as an attack.")
    recommendation: str = Field(description="Recommended action for the security operator.")
    top_features: dict  = Field(description="Top-5 feature names and input values.")

    @classmethod
    def build(
        cls,
        prediction: str,
        confidence: float,
        top_features: dict,
    ) -> "PredictionResponse":
        """Convenience constructor — fills all derived fields automatically."""
        return cls(
            prediction    = prediction,
            confidence    = round(confidence, 4),
            threat_level  = compute_threat_level(prediction, confidence),
            attack_type   = _ATTACK_NAMES.get(prediction, prediction),
            is_attack     = (prediction != "normal"),
            recommendation= _RECOMMENDATIONS.get(
                prediction, "Review connection for suspicious activity."
            ),
            top_features  = top_features,
        )
