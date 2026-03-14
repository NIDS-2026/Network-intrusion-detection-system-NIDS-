"""
download_nsl_kdd.py
───────────────────
Downloads the real NSL-KDD dataset files from a public GitHub mirror.

Files downloaded into the same directory (data/):
  KDDTrain+.txt  – 125,973 labelled training records
  KDDTest+.txt   –  22,544 labelled test records

Usage:
  python data/download_nsl_kdd.py
"""

from __future__ import annotations

import sys
import urllib.request
from pathlib import Path

DATA_DIR = Path(__file__).parent

# Public mirror — original NSL-KDD by Canadian Institute for Cybersecurity
_BASE = "https://raw.githubusercontent.com/defcom17/NSL_KDD/master"
URLS = {
    "KDDTrain+.txt": f"{_BASE}/KDDTrain+.txt",
    "KDDTest+.txt":  f"{_BASE}/KDDTest+.txt",
}


def _progress(block_num: int, block_size: int, total_size: int) -> None:
    downloaded = block_num * block_size
    if total_size > 0:
        pct = min(100, downloaded / total_size * 100)
        bar = "█" * int(pct / 2) + "░" * (50 - int(pct / 2))
        print(f"\r  [{bar}] {pct:5.1f}%", end="", flush=True)


def download(force: bool = False) -> None:
    print("─" * 55)
    print("  NSL-KDD Dataset Downloader")
    print("─" * 55)
    any_downloaded = False

    for fname, url in URLS.items():
        dest = DATA_DIR / fname
        if dest.exists() and not force:
            size_kb = dest.stat().st_size // 1024
            print(f"  ✓ {fname} already exists ({size_kb:,} KB) — skipping.")
            continue

        print(f"\n  Downloading {fname} …")
        try:
            urllib.request.urlretrieve(url, dest, reporthook=_progress)
            print(f"\n  ✓ Saved → {dest}  ({dest.stat().st_size // 1024:,} KB)")
            any_downloaded = True
        except Exception as exc:
            print(f"\n  ✗ Failed to download {fname}: {exc}", file=sys.stderr)
            if dest.exists():
                dest.unlink()
            sys.exit(1)

    print("\n" + "─" * 55)
    if any_downloaded:
        print("  All files downloaded. Run model/train_model.py to retrain.")
    else:
        print("  All files already present. Nothing to do.")
    print("─" * 55)


if __name__ == "__main__":
    import argparse
    p = argparse.ArgumentParser(description="Download the NSL-KDD dataset.")
    p.add_argument("--force", action="store_true", help="Re-download even if files exist.")
    args = p.parse_args()
    download(force=args.force)
