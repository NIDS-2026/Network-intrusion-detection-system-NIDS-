"""
generate_data.py
────────────────
Generates a synthetic NSL-KDD style dataset with 125,000 rows.

Class distribution:
  normal : 55,000
  dos    : 35,000
  probe  : 20,000
  r2l    : 10,000
  u2r    :  5,000

Output: data/nsl_kdd.csv
"""

import os
import numpy as np
import pandas as pd

# ──────────────────────────────────────────────
# Seed for reproducibility
# ──────────────────────────────────────────────
RNG = np.random.default_rng(seed=42)

# ──────────────────────────────────────────────
# Column order (matches NSL-KDD convention)
# ──────────────────────────────────────────────
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
    "label",
]

# ──────────────────────────────────────────────
# Categorical options
# ──────────────────────────────────────────────
ALL_SERVICES = ["http", "ftp", "smtp", "ssh", "dns", "ftp_data", "other"]
ALL_FLAGS    = ["SF", "S0", "REJ", "RSTO", "SH"]
ALL_PROTOS   = ["tcp", "udp", "icmp"]


# ═══════════════════════════════════════════════════════════════════
# Helper: clipped normal draw (returns float array)
# ═══════════════════════════════════════════════════════════════════
def _cn(mean, std, lo, hi, n):
    """Draw n samples from N(mean,std) clipped to [lo, hi]."""
    return np.clip(RNG.normal(mean, std, n), lo, hi)


def _cu(lo, hi, n):
    """Draw n integer samples uniformly from [lo, hi]."""
    return RNG.integers(lo, hi + 1, n)


def _cf(lo, hi, n):
    """Draw n float samples uniformly from [lo, hi]."""
    return RNG.uniform(lo, hi, n)


# ═══════════════════════════════════════════════════════════════════
# Per-class generators
# ═══════════════════════════════════════════════════════════════════

def generate_normal(n: int) -> pd.DataFrame:
    """Normal traffic: logged in, SF flag, balanced features."""
    df = pd.DataFrame()

    # Categorical
    df["protocol_type"] = RNG.choice(ALL_PROTOS, n, p=[0.5, 0.3, 0.2])
    df["service"]       = RNG.choice(ALL_SERVICES, n,
                                     p=[0.40, 0.12, 0.12, 0.10, 0.10, 0.08, 0.08])
    df["flag"]          = RNG.choice(ALL_FLAGS, n, p=[0.88, 0.02, 0.04, 0.04, 0.02])

    # Basic features
    df["duration"]          = np.clip(RNG.exponential(5, n), 0, 60).astype(int)
    df["src_bytes"]         = np.clip(RNG.exponential(3000, n), 0, 100_000).astype(int)
    df["dst_bytes"]         = np.clip(RNG.exponential(5000, n), 0, 100_000).astype(int)
    df["land"]              = RNG.integers(0, 2, n)
    df["wrong_fragments"]   = RNG.choice([0, 1, 2, 3], n, p=[0.95, 0.03, 0.01, 0.01])
    df["urgent"]            = RNG.choice([0, 1], n, p=[0.98, 0.02])

    # Content features
    df["hot"]               = _cu(0, 15, n)
    df["num_failed_logins"] = RNG.choice(range(6), n, p=[0.92, 0.04, 0.02, 0.01, 0.005, 0.005])
    df["logged_in"]         = RNG.choice([0, 1], n, p=[0.10, 0.90])
    df["num_compromised"]   = RNG.choice(range(11), n,
                                         p=[0.90]+[0.01]*10)
    df["root_shell"]        = RNG.choice([0, 1], n, p=[0.99, 0.01])
    df["su_attempted"]      = RNG.choice([0, 1], n, p=[0.99, 0.01])
    df["num_root"]          = _cu(0, 3, n)
    df["num_file_creations"]= _cu(0, 3, n)
    df["num_shells"]        = RNG.choice(range(6), n, p=[0.97, 0.01, 0.01, 0.005, 0.003, 0.002])
    df["num_access_files"]  = _cu(0, 3, n)
    df["num_outbound_cmds"] = np.zeros(n, dtype=int)
    df["is_host_login"]     = RNG.choice([0, 1], n, p=[0.97, 0.03])
    df["is_guest_login"]    = RNG.choice([0, 1], n, p=[0.95, 0.05])

    # Traffic features
    df["count"]             = _cu(1, 200, n)
    df["srv_count"]         = _cu(1, 200, n)
    df["serror_rate"]       = _cf(0.0, 0.15, n)
    df["srv_serror_rate"]   = _cf(0.0, 0.15, n)
    df["rerror_rate"]       = _cf(0.0, 0.15, n)
    df["srv_rerror_rate"]   = _cf(0.0, 0.15, n)
    df["same_srv_rate"]     = _cf(0.7, 1.0, n)
    df["diff_srv_rate"]     = _cf(0.0, 0.20, n)
    df["srv_diff_host_rate"]= _cf(0.0, 0.20, n)

    # Host-based features
    df["dst_host_count"]          = _cu(50, 256, n)
    df["dst_host_srv_count"]      = _cu(50, 256, n)
    df["dst_host_same_srv_rate"]  = _cf(0.6, 1.0, n)
    df["dst_host_diff_srv_rate"]  = _cf(0.0, 0.30, n)
    df["dst_host_same_src_port_rate"] = _cf(0.0, 0.50, n)
    df["dst_host_srv_diff_host_rate"] = _cf(0.0, 0.20, n)
    df["dst_host_serror_rate"]    = _cf(0.0, 0.15, n)
    df["dst_host_srv_serror_rate"]= _cf(0.0, 0.15, n)
    df["dst_host_rerror_rate"]    = _cf(0.0, 0.15, n)
    df["dst_host_srv_rerror_rate"]= _cf(0.0, 0.15, n)

    df["label"] = "normal"
    return df


def generate_dos(n: int) -> pd.DataFrame:
    """DoS traffic: high count, serror_rate=1.0, S0 flag, no bytes."""
    df = pd.DataFrame()

    # Categorical — mostly icmp/tcp, flag=S0
    df["protocol_type"] = RNG.choice(ALL_PROTOS, n, p=[0.40, 0.08, 0.52])
    df["service"]       = RNG.choice(ALL_SERVICES, n,
                                     p=[0.25, 0.05, 0.05, 0.05, 0.30, 0.05, 0.25])
    df["flag"]          = RNG.choice(ALL_FLAGS, n, p=[0.05, 0.80, 0.08, 0.05, 0.02])

    # Basic features — signature: duration=0, bytes=0
    df["duration"]          = np.zeros(n, dtype=int)
    df["src_bytes"]         = np.zeros(n, dtype=int)
    df["dst_bytes"]         = np.zeros(n, dtype=int)
    df["land"]              = RNG.choice([0, 1], n, p=[0.95, 0.05])
    df["wrong_fragments"]   = RNG.choice([0, 1, 2, 3], n, p=[0.70, 0.15, 0.10, 0.05])
    df["urgent"]            = np.zeros(n, dtype=int)

    # Content features — mostly zero for DoS
    df["hot"]               = np.zeros(n, dtype=int)
    df["num_failed_logins"] = np.zeros(n, dtype=int)
    df["logged_in"]         = np.zeros(n, dtype=int)
    df["num_compromised"]   = np.zeros(n, dtype=int)
    df["root_shell"]        = np.zeros(n, dtype=int)
    df["su_attempted"]      = np.zeros(n, dtype=int)
    df["num_root"]          = np.zeros(n, dtype=int)
    df["num_file_creations"]= np.zeros(n, dtype=int)
    df["num_shells"]        = np.zeros(n, dtype=int)
    df["num_access_files"]  = np.zeros(n, dtype=int)
    df["num_outbound_cmds"] = np.zeros(n, dtype=int)
    df["is_host_login"]     = np.zeros(n, dtype=int)
    df["is_guest_login"]    = np.zeros(n, dtype=int)

    # Traffic features — signature: count=511+, serror_rate=1.0
    df["count"]             = _cu(400, 512, n)
    df["srv_count"]         = _cu(300, 512, n)
    df["serror_rate"]       = np.clip(_cn(0.95, 0.08, 0.0, 1.0, n), 0, 1)
    df["srv_serror_rate"]   = np.clip(_cn(0.92, 0.10, 0.0, 1.0, n), 0, 1)
    df["rerror_rate"]       = _cf(0.0, 0.10, n)
    df["srv_rerror_rate"]   = _cf(0.0, 0.10, n)
    df["same_srv_rate"]     = np.clip(_cn(0.90, 0.10, 0.0, 1.0, n), 0, 1)
    df["diff_srv_rate"]     = _cf(0.0, 0.10, n)
    df["srv_diff_host_rate"]= _cf(0.0, 0.10, n)

    # Host-based features
    df["dst_host_count"]          = _cu(200, 256, n)
    df["dst_host_srv_count"]      = _cu(200, 256, n)
    df["dst_host_same_srv_rate"]  = np.clip(_cn(0.88, 0.10, 0.0, 1.0, n), 0, 1)
    df["dst_host_diff_srv_rate"]  = _cf(0.0, 0.10, n)
    df["dst_host_same_src_port_rate"] = np.clip(_cn(0.85, 0.12, 0.0, 1.0, n), 0, 1)
    df["dst_host_srv_diff_host_rate"] = _cf(0.0, 0.05, n)
    df["dst_host_serror_rate"]    = np.clip(_cn(0.93, 0.09, 0.0, 1.0, n), 0, 1)
    df["dst_host_srv_serror_rate"]= np.clip(_cn(0.90, 0.10, 0.0, 1.0, n), 0, 1)
    df["dst_host_rerror_rate"]    = _cf(0.0, 0.10, n)
    df["dst_host_srv_rerror_rate"]= _cf(0.0, 0.10, n)

    df["label"] = "dos"
    return df


def generate_probe(n: int) -> pd.DataFrame:
    """Probe traffic: high diff_srv_rate, many services, tcp heavy."""
    df = pd.DataFrame()

    # Categorical — probe hits many services
    df["protocol_type"] = RNG.choice(ALL_PROTOS, n, p=[0.70, 0.15, 0.15])
    df["service"]       = RNG.choice(ALL_SERVICES, n,
                                     p=[0.14, 0.14, 0.14, 0.14, 0.14, 0.14, 0.16])
    df["flag"]          = RNG.choice(ALL_FLAGS, n, p=[0.35, 0.25, 0.25, 0.10, 0.05])

    # Basic features
    df["duration"]          = np.clip(RNG.exponential(2, n), 0, 60).astype(int)
    df["src_bytes"]         = np.clip(RNG.exponential(500, n), 0, 100_000).astype(int)
    df["dst_bytes"]         = np.clip(RNG.exponential(200, n), 0, 100_000).astype(int)
    df["land"]              = np.zeros(n, dtype=int)
    df["wrong_fragments"]   = RNG.choice([0, 1, 2], n, p=[0.90, 0.07, 0.03])
    df["urgent"]            = np.zeros(n, dtype=int)

    # Content features
    df["hot"]               = _cu(0, 5, n)
    df["num_failed_logins"] = np.zeros(n, dtype=int)
    df["logged_in"]         = RNG.choice([0, 1], n, p=[0.60, 0.40])
    df["num_compromised"]   = np.zeros(n, dtype=int)
    df["root_shell"]        = np.zeros(n, dtype=int)
    df["su_attempted"]      = np.zeros(n, dtype=int)
    df["num_root"]          = np.zeros(n, dtype=int)
    df["num_file_creations"]= np.zeros(n, dtype=int)
    df["num_shells"]        = np.zeros(n, dtype=int)
    df["num_access_files"]  = np.zeros(n, dtype=int)
    df["num_outbound_cmds"] = np.zeros(n, dtype=int)
    df["is_host_login"]     = np.zeros(n, dtype=int)
    df["is_guest_login"]    = np.zeros(n, dtype=int)

    # Traffic features — signature: high diff_srv_rate
    df["count"]             = _cu(1, 150, n)
    df["srv_count"]         = _cu(1, 50, n)
    df["serror_rate"]       = _cf(0.0, 0.50, n)
    df["srv_serror_rate"]   = _cf(0.0, 0.50, n)
    df["rerror_rate"]       = _cf(0.0, 0.50, n)
    df["srv_rerror_rate"]   = _cf(0.0, 0.50, n)
    df["same_srv_rate"]     = _cf(0.0, 0.40, n)
    df["diff_srv_rate"]     = np.clip(_cn(0.75, 0.20, 0.0, 1.0, n), 0, 1)  # HIGH
    df["srv_diff_host_rate"]= np.clip(_cn(0.60, 0.25, 0.0, 1.0, n), 0, 1)

    # Host-based features — high diff rates indicate scanning
    df["dst_host_count"]          = _cu(1, 100, n)
    df["dst_host_srv_count"]      = _cu(1, 60, n)
    df["dst_host_same_srv_rate"]  = _cf(0.0, 0.40, n)
    df["dst_host_diff_srv_rate"]  = np.clip(_cn(0.70, 0.20, 0.0, 1.0, n), 0, 1)
    df["dst_host_same_src_port_rate"] = _cf(0.0, 0.30, n)
    df["dst_host_srv_diff_host_rate"] = np.clip(_cn(0.55, 0.25, 0.0, 1.0, n), 0, 1)
    df["dst_host_serror_rate"]    = _cf(0.0, 0.40, n)
    df["dst_host_srv_serror_rate"]= _cf(0.0, 0.40, n)
    df["dst_host_rerror_rate"]    = _cf(0.0, 0.40, n)
    df["dst_host_srv_rerror_rate"]= _cf(0.0, 0.40, n)

    df["label"] = "probe"
    return df


def generate_r2l(n: int) -> pd.DataFrame:
    """R2L: high failed logins, guest login, not logged in, tcp/smtp/ftp."""
    df = pd.DataFrame()

    # Categorical
    df["protocol_type"] = RNG.choice(ALL_PROTOS, n, p=[0.75, 0.15, 0.10])
    df["service"]       = RNG.choice(ALL_SERVICES, n,
                                     p=[0.30, 0.20, 0.20, 0.10, 0.05, 0.05, 0.10])
    df["flag"]          = RNG.choice(ALL_FLAGS, n, p=[0.50, 0.10, 0.20, 0.15, 0.05])

    # Basic features
    df["duration"]          = np.clip(RNG.exponential(15, n), 0, 60).astype(int)
    df["src_bytes"]         = np.clip(RNG.exponential(2000, n), 0, 100_000).astype(int)
    df["dst_bytes"]         = np.clip(RNG.exponential(1000, n), 0, 100_000).astype(int)
    df["land"]              = np.zeros(n, dtype=int)
    df["wrong_fragments"]   = RNG.choice([0, 1, 2], n, p=[0.88, 0.08, 0.04])
    df["urgent"]            = np.zeros(n, dtype=int)

    # Content features — signature: many failed logins, guest_login=1
    df["hot"]               = _cu(0, 10, n)
    df["num_failed_logins"] = np.clip(RNG.integers(2, 6, n), 0, 5)   # HIGH
    df["logged_in"]         = np.zeros(n, dtype=int)                  # not logged in
    df["num_compromised"]   = _cu(0, 3, n)
    df["root_shell"]        = np.zeros(n, dtype=int)
    df["su_attempted"]      = np.zeros(n, dtype=int)
    df["num_root"]          = np.zeros(n, dtype=int)
    df["num_file_creations"]= RNG.choice(range(4), n, p=[0.80, 0.10, 0.06, 0.04])
    df["num_shells"]        = np.zeros(n, dtype=int)
    df["num_access_files"]  = _cu(0, 5, n)
    df["num_outbound_cmds"] = np.zeros(n, dtype=int)
    df["is_host_login"]     = np.zeros(n, dtype=int)
    df["is_guest_login"]    = np.ones(n, dtype=int)                   # guest login=1

    # Traffic features
    df["count"]             = _cu(1, 50, n)
    df["srv_count"]         = _cu(1, 30, n)
    df["serror_rate"]       = _cf(0.0, 0.20, n)
    df["srv_serror_rate"]   = _cf(0.0, 0.20, n)
    df["rerror_rate"]       = _cf(0.0, 0.30, n)
    df["srv_rerror_rate"]   = _cf(0.0, 0.30, n)
    df["same_srv_rate"]     = _cf(0.4, 0.90, n)
    df["diff_srv_rate"]     = _cf(0.0, 0.30, n)
    df["srv_diff_host_rate"]= _cf(0.0, 0.20, n)

    # Host-based features
    df["dst_host_count"]          = _cu(10, 150, n)
    df["dst_host_srv_count"]      = _cu(10, 100, n)
    df["dst_host_same_srv_rate"]  = _cf(0.3, 0.90, n)
    df["dst_host_diff_srv_rate"]  = _cf(0.0, 0.30, n)
    df["dst_host_same_src_port_rate"] = _cf(0.0, 0.40, n)
    df["dst_host_srv_diff_host_rate"] = _cf(0.0, 0.20, n)
    df["dst_host_serror_rate"]    = _cf(0.0, 0.20, n)
    df["dst_host_srv_serror_rate"]= _cf(0.0, 0.20, n)
    df["dst_host_rerror_rate"]    = _cf(0.0, 0.30, n)
    df["dst_host_srv_rerror_rate"]= _cf(0.0, 0.30, n)

    df["label"] = "r2l"
    return df


def generate_u2r(n: int) -> pd.DataFrame:
    """U2R: root_shell=1, high num_shells, su_attempted=1, num_root high."""
    df = pd.DataFrame()

    # Categorical
    df["protocol_type"] = RNG.choice(ALL_PROTOS, n, p=[0.80, 0.10, 0.10])
    df["service"]       = RNG.choice(ALL_SERVICES, n,
                                     p=[0.15, 0.15, 0.10, 0.35, 0.10, 0.05, 0.10])
    df["flag"]          = RNG.choice(ALL_FLAGS, n, p=[0.70, 0.05, 0.10, 0.10, 0.05])

    # Basic features
    df["duration"]          = np.clip(RNG.exponential(20, n), 0, 60).astype(int)
    df["src_bytes"]         = np.clip(RNG.exponential(4000, n), 0, 100_000).astype(int)
    df["dst_bytes"]         = np.clip(RNG.exponential(8000, n), 0, 100_000).astype(int)
    df["land"]              = np.zeros(n, dtype=int)
    df["wrong_fragments"]   = RNG.choice([0, 1], n, p=[0.90, 0.10])
    df["urgent"]            = np.zeros(n, dtype=int)

    # Content features — signature: root_shell=1, su_attempted=1, num_shells high
    df["hot"]               = _cu(5, 30, n)
    df["num_failed_logins"] = RNG.choice(range(6), n, p=[0.70, 0.15, 0.07, 0.04, 0.02, 0.02])
    df["logged_in"]         = np.ones(n, dtype=int)      # logged in
    df["num_compromised"]   = _cu(3, 10, n)
    df["root_shell"]        = np.ones(n, dtype=int)      # root shell = 1
    df["su_attempted"]      = np.ones(n, dtype=int)      # su attempted = 1
    df["num_root"]          = _cu(4, 10, n)              # high num_root
    df["num_file_creations"]= _cu(2, 10, n)
    df["num_shells"]        = _cu(2, 5, n)               # high num_shells
    df["num_access_files"]  = _cu(3, 10, n)
    df["num_outbound_cmds"] = np.zeros(n, dtype=int)
    df["is_host_login"]     = RNG.choice([0, 1], n, p=[0.70, 0.30])
    df["is_guest_login"]    = np.zeros(n, dtype=int)

    # Traffic features — low volume (targeted attack)
    df["count"]             = _cu(1, 30, n)
    df["srv_count"]         = _cu(1, 20, n)
    df["serror_rate"]       = _cf(0.0, 0.10, n)
    df["srv_serror_rate"]   = _cf(0.0, 0.10, n)
    df["rerror_rate"]       = _cf(0.0, 0.10, n)
    df["srv_rerror_rate"]   = _cf(0.0, 0.10, n)
    df["same_srv_rate"]     = _cf(0.5, 1.0, n)
    df["diff_srv_rate"]     = _cf(0.0, 0.20, n)
    df["srv_diff_host_rate"]= _cf(0.0, 0.15, n)

    # Host-based features
    df["dst_host_count"]          = _cu(1, 50, n)
    df["dst_host_srv_count"]      = _cu(1, 30, n)
    df["dst_host_same_srv_rate"]  = _cf(0.4, 1.0, n)
    df["dst_host_diff_srv_rate"]  = _cf(0.0, 0.20, n)
    df["dst_host_same_src_port_rate"] = _cf(0.0, 0.30, n)
    df["dst_host_srv_diff_host_rate"] = _cf(0.0, 0.10, n)
    df["dst_host_serror_rate"]    = _cf(0.0, 0.10, n)
    df["dst_host_srv_serror_rate"]= _cf(0.0, 0.10, n)
    df["dst_host_rerror_rate"]    = _cf(0.0, 0.10, n)
    df["dst_host_srv_rerror_rate"]= _cf(0.0, 0.10, n)

    df["label"] = "u2r"
    return df


# ═══════════════════════════════════════════════════════════════════
# Main
# ═══════════════════════════════════════════════════════════════════

def main():
    print("Generating synthetic NSL-KDD style dataset ...")

    counts = {
        "normal": 55_000,
        "dos":    35_000,
        "probe":  20_000,
        "r2l":    10_000,
        "u2r":     5_000,
    }

    generators = {
        "normal": generate_normal,
        "dos":    generate_dos,
        "probe":  generate_probe,
        "r2l":    generate_r2l,
        "u2r":    generate_u2r,
    }

    frames = []
    for label, gen_fn in generators.items():
        n = counts[label]
        print(f"  Generating {n:>6,} {label} samples ...", end=" ", flush=True)
        df = gen_fn(n)
        frames.append(df)
        print("done")

    # Concatenate and shuffle
    full_df = pd.concat(frames, ignore_index=True)
    full_df = full_df.sample(frac=1, random_state=42).reset_index(drop=True)

    # Enforce column order
    full_df = full_df[COLUMNS]

    # Round float columns to 4 decimal places for readability
    float_cols = [c for c in full_df.columns if full_df[c].dtype == float]
    full_df[float_cols] = full_df[float_cols].round(4)

    # Save
    out_dir = os.path.dirname(os.path.abspath(__file__))
    out_path = os.path.join(out_dir, "nsl_kdd.csv")
    full_df.to_csv(out_path, index=False)

    print(f"\nDataset saved → {out_path}")
    print(f"Shape          : {full_df.shape}")
    print("\nClass distribution:")
    print(full_df["label"].value_counts().to_string())
    print("\nColumn dtypes (sample):")
    print(full_df.dtypes)


if __name__ == "__main__":
    main()
