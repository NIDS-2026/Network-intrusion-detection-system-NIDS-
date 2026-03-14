# NIDS — Network Intrusion Detection System

A machine-learning backend that classifies network connections as **normal** or one of four attack types using a synthetic NSL-KDD-style dataset.

---

## Project Structure

```
NIDS BK/
├── data/
│   ├── generate_data.py     # Synthetic dataset generator (125,000 rows)
│   └── nsl_kdd.csv          # Generated dataset (created by step 1)
├── model/
│   ├── train_model.py       # Trains RF + GBM, saves best model
│   ├── nids_model.pkl       # Saved model pipeline (created by step 2)
│   └── label_encoder.pkl    # Label encoder (created by step 2)
├── backend/
│   ├── main.py              # FastAPI application
│   └── schema.py            # Pydantic input/output models
├── requirements.txt
└── README.md
```

---

## Quick Start

### 1 — Install dependencies

```bash
pip install -r requirements.txt
```

### 2 — Generate the dataset

```bash
python data/generate_data.py
```

**Expected output:**
```
Generating synthetic NSL-KDD style dataset ...
  Generating  55,000 normal samples ... done
  Generating  35,000 dos samples ... done
  Generating  20,000 probe samples ... done
  Generating  10,000 r2l samples ... done
  Generating   5,000 u2r samples ... done

Dataset saved → ...\data\nsl_kdd.csv
Shape          : (125000, 42)

Class distribution:
label
normal    55000
dos       35000
probe     20000
r2l       10000
u2r        5000
```

### 3 — Train the model

```bash
python model/train_model.py
```

**Expected output:**
```
  ── Training RandomForest ──
     Fit time : ~2-5s
     Accuracy : 1.0000

  ── Training GradientBoosting ──
     Fit time : ~400-500s
     Accuracy : 1.0000
  ...
  Model saved as nids_model.pkl — Best model: RandomForest with F1: 1.0000
```

> **Note on accuracy:** Both models achieve perfect scores on the synthetic dataset because the attack signatures are well-separated by design. Performance on real NSL-KDD data is typically 97–99% for Random Forest.

### 4 — Start the API server

```bash
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

The interactive API docs will be available at:
- **Swagger UI** → http://localhost:8000/docs
- **ReDoc** → http://localhost:8000/redoc

---

## API Reference

### `GET /` — Model Info

```bash
curl http://localhost:8000/
```

```json
{
  "status": "ok",
  "model_loaded": true,
  "version": "1.0.0",
  "model_type": "RandomForestClassifier",
  "features": 41,
  "attack_types": ["dos", "normal", "probe", "r2l", "u2r"]
}
```

---

### `GET /health` — Health Check

```bash
curl http://localhost:8000/health
```

```json
{
  "status": "healthy",
  "model_loaded": true,
  "uptime": "42 seconds"
}
```

---

### `GET /stats` — Prediction Statistics

```bash
curl http://localhost:8000/stats
```

```json
{
  "total_predictions": 10,
  "attacks_detected": 4,
  "attack_breakdown": {
    "dos": 2,
    "probe": 1,
    "r2l": 0,
    "u2r": 1
  },
  "detection_rate": "40.0%"
}
```

---

### `POST /predict` — Classify a Single Connection

Accepts all 41 NSL-KDD features. All fields have sensible defaults (normal HTTP connection), so you only need to override what differs.

**Example — DoS attack signature:**

```bash
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{
    "duration": 0,
    "protocol_type": "tcp",
    "service": "http",
    "flag": "S0",
    "src_bytes": 0,
    "dst_bytes": 0,
    "land": 0,
    "wrong_fragments": 0,
    "urgent": 0,
    "hot": 0,
    "num_failed_logins": 0,
    "logged_in": 0,
    "num_compromised": 0,
    "root_shell": 0,
    "su_attempted": 0,
    "num_root": 0,
    "num_file_creations": 0,
    "num_shells": 0,
    "num_access_files": 0,
    "num_outbound_cmds": 0,
    "is_host_login": 0,
    "is_guest_login": 0,
    "count": 511,
    "srv_count": 500,
    "serror_rate": 1.0,
    "srv_serror_rate": 1.0,
    "rerror_rate": 0.0,
    "srv_rerror_rate": 0.0,
    "same_srv_rate": 1.0,
    "diff_srv_rate": 0.0,
    "srv_diff_host_rate": 0.0,
    "dst_host_count": 255,
    "dst_host_srv_count": 255,
    "dst_host_same_srv_rate": 1.0,
    "dst_host_diff_srv_rate": 0.0,
    "dst_host_same_src_port_rate": 1.0,
    "dst_host_srv_diff_host_rate": 0.0,
    "dst_host_serror_rate": 1.0,
    "dst_host_srv_serror_rate": 1.0,
    "dst_host_rerror_rate": 0.0,
    "dst_host_srv_rerror_rate": 0.0
  }'
```

**Expected response:**

```json
{
  "prediction": "dos",
  "confidence": 0.97,
  "threat_level": "Critical",
  "attack_type": "Denial of Service (DoS)",
  "is_attack": true,
  "recommendation": "IMMEDIATE ACTION: Block source IP, activate rate-limiting rules, and alert the security team. Escalate to incident response.",
  "top_features": {
    "serror_rate": 1.0,
    "count": 511,
    "src_bytes": 0,
    "flag": "S0",
    "srv_serror_rate": 1.0
  }
}
```

**Example — Normal connection (using defaults):**

```bash
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{}'
```

```json
{
  "prediction": "normal",
  "confidence": 0.9998,
  "threat_level": "None",
  "attack_type": "No Threat Detected",
  "is_attack": false,
  "recommendation": "No action required. Connection appears legitimate.",
  "top_features": { ... }
}
```

**Example — U2R (Privilege Escalation):**

```bash
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{
    "protocol_type": "tcp", "service": "ssh", "flag": "SF",
    "root_shell": 1, "su_attempted": 1, "num_shells": 4,
    "num_root": 8, "num_compromised": 7, "logged_in": 1,
    "hot": 20, "count": 5, "srv_count": 3
  }'
```

---

### `POST /predict/batch` — Classify Multiple Connections

Accepts a JSON array of up to **100** connection objects. Returns results in the same order.

```bash
curl -X POST http://localhost:8000/predict/batch \
  -H "Content-Type: application/json" \
  -d '[{}, {"flag": "S0", "count": 511, "serror_rate": 1.0, "src_bytes": 0, "logged_in": 0, "srv_serror_rate": 1.0, "dst_host_serror_rate": 1.0}]'
```

Returns a JSON array of `PredictionResponse` objects.

---

## Feature Reference

| Feature | Type | Range | Description |
|---|---|---|---|
| `protocol_type` | str | tcp/udp/icmp | Network protocol |
| `service` | str | http/ftp/smtp/ssh/dns/ftp_data/other | Destination service |
| `flag` | str | SF/S0/REJ/RSTO/SH | Connection status flag |
| `duration` | int | 0–60 | Connection duration (seconds) |
| `src_bytes` | int | 0–100000 | Bytes from source |
| `dst_bytes` | int | 0–100000 | Bytes from destination |
| `logged_in` | int | 0–1 | Successful login indicator |
| `count` | int | 1–512 | Connections to same host (2s window) |
| `serror_rate` | float | 0.0–1.0 | % SYN error connections |
| `root_shell` | int | 0–1 | Root shell obtained |
| `su_attempted` | int | 0–1 | su root attempted |
| `num_shells` | int | 0–5 | Shell prompts |
| `num_failed_logins` | int | 0–5 | Failed login attempts |
| `diff_srv_rate` | float | 0.0–1.0 | % connections to different services |
| *(+ 27 more)* | | | See `/docs` for complete schema |

---

## Attack Signatures

| Type | Key Features | Threat Level |
|---|---|---|
| **DoS** | `flag=S0`, `count≈511`, `serror_rate=1.0`, `src_bytes=0` | Critical |
| **Probe** | `diff_srv_rate` high, many different services | High |
| **R2L** | `num_failed_logins≥2`, `logged_in=0`, `is_guest_login=1` | High |
| **U2R** | `root_shell=1`, `su_attempted=1`, `num_shells≥2` | Critical |
| **Normal** | `flag=SF`, `logged_in=1`, low error rates | None |

### Threat Level Downgrade by Confidence

| Confidence | DoS/U2R | Probe/R2L |
|---|---|---|
| ≥ 0.90 | Critical | High |
| 0.70 – 0.89 | High | Medium |
| < 0.70 | Medium | Low |

---

## Model Performance

Training and evaluation are performed on an 80/20 stratified split of 125,000 synthetic NSL-KDD-style rows.

| Metric | RandomForest | GradientBoosting |
|---|---|---|
| Accuracy | 1.0000 | 1.0000 |
| Weighted F1 | 1.0000 | 1.0000 |
| CV F1 (mean) | 1.0000 | 1.0000 |
| Fit time | ~3s | ~450s |
| **Winner** | ✅ | — |

**Per-class detection rates (recall):**

| Class | Detection Rate |
|---|---|
| DoS | 100% |
| Probe | 100% |
| R2L | 100% |
| U2R | 100% |

> **Note:** Perfect scores reflect the clean, well-separated synthetic dataset. On real NSL-KDD data, Random Forest typically achieves **97–99% accuracy** with DoS/Normal detection > 99% and U2R/R2L detection of 85–95% (due to their small sample sizes in the real dataset).

---

## Tech Stack

| Component | Library |
|---|---|
| API framework | FastAPI 0.128+ |
| ML | scikit-learn (RandomForest, GradientBoosting) |
| Data | pandas, numpy |
| Validation | Pydantic v2 |
| Server | Uvicorn |
| Model persistence | joblib |

---

## License

MIT
