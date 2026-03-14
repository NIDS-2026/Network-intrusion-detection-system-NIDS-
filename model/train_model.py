"""
train_model.py
──────────────
Trains a RandomForest + GradientBoosting classifier on the real NSL-KDD dataset.

Usage:
  # Step 1 – download data (if not already done)
  python data/download_nsl_kdd.py

  # Step 2 – train
  python model/train_model.py

Outputs:
  model/nids_model.pkl      – best sklearn Pipeline
  model/label_encoder.pkl   – LabelEncoder for the 5 classes
"""

from __future__ import annotations

import sys
import time
import warnings
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
)
from sklearn.model_selection import StratifiedKFold, cross_val_score, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import LabelEncoder, OrdinalEncoder, StandardScaler
from sklearn.compose import ColumnTransformer

warnings.filterwarnings("ignore")

# ── Paths ──────────────────────────────────────────────────────────────
BASE_DIR   = Path(__file__).parent.parent
DATA_DIR   = BASE_DIR / "data"
MODEL_DIR  = Path(__file__).parent

TRAIN_FILE = DATA_DIR / "KDDTrain+.txt"
TEST_FILE  = DATA_DIR / "KDDTest+.txt"
MODEL_OUT  = MODEL_DIR / "nids_model.pkl"
LABEL_OUT  = MODEL_DIR / "label_encoder.pkl"

# ── NSL-KDD column names (no header in file) ───────────────────────────
COLUMNS = [
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
    "label", "difficulty",
]

FEATURE_COLS = [c for c in COLUMNS if c not in ("label", "difficulty")]
CAT_COLS     = ["protocol_type", "service", "flag"]
NUM_COLS     = [c for c in FEATURE_COLS if c not in CAT_COLS]

# ── Attack-label → 5-class mapping ─────────────────────────────────────
_DOS   = {"back","land","neptune","pod","smurf","teardrop","apache2",
          "udpstorm","processtable","worm","mailbomb"}
_PROBE = {"ipsweep","nmap","portsweep","satan","mscan","saint"}
_R2L   = {"ftp_write","guess_passwd","imap","multihop","phf","spy",
          "warezclient","warezmaster","sendmail","named","snmpgetattack",
          "snmpguess","xlock","xsnoop","httptunnel"}
_U2R   = {"buffer_overflow","loadmodule","perl","rootkit","ps","sqlattack","xterm"}

def _map_label(label: str) -> str:
    label = label.strip().lower()
    if label == "normal":   return "normal"
    if label in _DOS:       return "dos"
    if label in _PROBE:     return "probe"
    if label in _R2L:       return "r2l"
    if label in _U2R:       return "u2r"
    return "dos"            # unknown attack → treat as DoS


# ══════════════════════════════════════════════════════════════════════
# Data loading
# ══════════════════════════════════════════════════════════════════════
def load_dataset() -> tuple[pd.DataFrame, pd.DataFrame]:
    """Load KDDTrain+ and KDDTest+; fall back to synthetic CSV if missing."""
    if not TRAIN_FILE.exists():
        print(f"[WARN] {TRAIN_FILE} not found.", file=sys.stderr)
        print("  Run: python data/download_nsl_kdd.py", file=sys.stderr)
        legacy = DATA_DIR / "nsl_kdd.csv"
        if legacy.exists():
            print(f"  Falling back to synthetic {legacy.name} …")
            df = pd.read_csv(legacy)
            df["label"] = df["label"].str.strip()
            # split 80/20 from synthetic
            train, test = train_test_split(df, test_size=0.2, random_state=42,
                                           stratify=df["label"])
            return train.reset_index(drop=True), test.reset_index(drop=True)
        print("  No dataset found. Aborting.", file=sys.stderr)
        sys.exit(1)

    print(f"  Loading {TRAIN_FILE.name} …")
    train = pd.read_csv(TRAIN_FILE, header=None, names=COLUMNS)
    train["label"] = train["label"].apply(_map_label)

    print(f"  Loading {TEST_FILE.name} …")
    test  = pd.read_csv(TEST_FILE,  header=None, names=COLUMNS)
    test["label"]  = test["label"].apply(_map_label)

    return train, test


# ══════════════════════════════════════════════════════════════════════
# Pipeline builder
# ══════════════════════════════════════════════════════════════════════
def build_pipeline(classifier) -> Pipeline:
    preprocessor = ColumnTransformer(
        transformers=[
            ("cat", OrdinalEncoder(
                handle_unknown="use_encoded_value",
                unknown_value=-1,         # unknown service/flag → -1
            ), CAT_COLS),
            ("num", StandardScaler(), NUM_COLS),
        ],
        remainder="drop",
    )
    return Pipeline([
        ("preprocessor", preprocessor),
        ("classifier",   classifier),
    ])


# ══════════════════════════════════════════════════════════════════════
# Evaluation helpers
# ══════════════════════════════════════════════════════════════════════
def _print_section(title: str) -> None:
    print(f"\n{'═'*60}")
    print(f"  {title}")
    print(f"{'═'*60}")

def evaluate(model, X_test: pd.DataFrame, y_test: pd.Series,
             label_enc: LabelEncoder, name: str) -> float:
    _print_section(f"Results — {name}")
    y_pred_enc = model.predict(X_test)
    y_pred     = label_enc.inverse_transform(y_pred_enc)
    y_true_str = label_enc.inverse_transform(y_test)

    acc = accuracy_score(y_test, y_pred_enc)
    print(f"\n  Accuracy : {acc * 100:.2f}%")

    print("\n  Classification Report:")
    print(classification_report(y_true_str, y_pred,
                                 target_names=label_enc.classes_,
                                 zero_division=0))

    print("  Confusion Matrix:")
    cm = confusion_matrix(y_test, y_pred_enc)
    header = "  " + "".join(f"{c:>10}" for c in label_enc.classes_)
    print(header)
    for i, row in enumerate(cm):
        print("  " + f"{label_enc.classes_[i]:<8}" +
              "".join(f"{v:>10}" for v in row))

    print("\n  Per-class Detection Rates:")
    for cls in label_enc.classes_:
        idx = list(label_enc.classes_).index(cls)
        tp  = cm[idx, idx]
        fn  = cm[idx].sum() - tp
        rate = tp / (tp + fn) * 100 if (tp + fn) > 0 else 0.0
        print(f"    {cls:<8} : {rate:.1f}%")

    return acc


# ══════════════════════════════════════════════════════════════════════
# Main
# ══════════════════════════════════════════════════════════════════════
def main() -> None:
    print("╔══════════════════════════════════════════════════════════╗")
    print("║           NIDS — Model Training Pipeline                 ║")
    print("╚══════════════════════════════════════════════════════════╝\n")

    # ── Load ──────────────────────────────────────────────────────────
    train_df, test_df = load_dataset()
    print(f"\n  Train size : {len(train_df):,}  rows")
    print(f"  Test size  : {len(test_df):,}  rows")
    print("\n  Class distribution (train):")
    for cls, cnt in train_df["label"].value_counts().items():
        print(f"    {cls:<8} : {cnt:>7,}")

    # ── Encode labels ─────────────────────────────────────────────────
    label_enc = LabelEncoder()
    all_labels = pd.concat([train_df["label"], test_df["label"]])
    label_enc.fit(all_labels)
    print(f"\n  Classes    : {list(label_enc.classes_)}")

    X_train = train_df[FEATURE_COLS]
    y_train = label_enc.transform(train_df["label"])
    X_test  = test_df[FEATURE_COLS]
    y_test  = label_enc.transform(test_df["label"])

    # ── Train RandomForest ────────────────────────────────────────────
    _print_section("Training RandomForestClassifier …")
    t0_rf = time.time()
    rf_clf = RandomForestClassifier(
        n_estimators=200, max_depth=15, min_samples_leaf=3,
        class_weight="balanced", n_jobs=-1, random_state=42,
    )
    rf_pipe = build_pipeline(rf_clf)
    rf_pipe.fit(X_train, y_train)
    rf_time = time.time() - t0_rf
    print(f"  Trained in {rf_time:.1f}s")
    rf_acc = evaluate(rf_pipe, X_test, y_test, label_enc, "RandomForest")

    # ── 5-fold CV on RandomForest ─────────────────────────────────────
    print("\n  5-fold Cross-Validation (F1 macro) …")
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    rf_cv = cross_val_score(rf_pipe, X_train, y_train,
                             cv=cv, scoring="f1_macro", n_jobs=-1)
    print(f"  RF CV F1 : {rf_cv.mean():.4f} ± {rf_cv.std():.4f}")

    # ── Train GradientBoosting ────────────────────────────────────────
    _print_section("Training GradientBoostingClassifier …")
    t0_gb = time.time()
    gb_clf = GradientBoostingClassifier(
        n_estimators=200, max_depth=6, learning_rate=0.1, random_state=42,
    )
    gb_pipe = build_pipeline(gb_clf)
    gb_pipe.fit(X_train, y_train)
    gb_time = time.time() - t0_gb
    print(f"  Trained in {gb_time:.1f}s")
    gb_acc = evaluate(gb_pipe, X_test, y_test, label_enc, "GradientBoosting")

    # ── Select best ───────────────────────────────────────────────────
    _print_section("Model Selection")
    best_pipe, best_name, best_acc = (
        (rf_pipe, "RandomForest",      rf_acc) if rf_acc >= gb_acc
        else (gb_pipe, "GradientBoosting", gb_acc)
    )
    print(f"  RandomForest      accuracy: {rf_acc * 100:.2f}%")
    print(f"  GradientBoosting  accuracy: {gb_acc * 100:.2f}%")
    print(f"\n  ✓ Selected: {best_name}  ({best_acc * 100:.2f}%)")

    # ── Save ──────────────────────────────────────────────────────────
    MODEL_DIR.mkdir(exist_ok=True)
    joblib.dump(best_pipe, MODEL_OUT)
    joblib.dump(label_enc, LABEL_OUT)
    print(f"\n  Saved model       → {MODEL_OUT}")
    print(f"  Saved label enc   → {LABEL_OUT}")
    print("\n  Training complete.\n")


if __name__ == "__main__":
    main()
