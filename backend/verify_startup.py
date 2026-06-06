#!/usr/bin/env python3
"""
Run this script LOCALLY before pushing to Hugging Face Spaces.
It verifies every model artifact and environment variable is in place.
Usage: python verify_startup.py
"""
import os, sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
print(f"Working directory: {HERE}\n")

# ── Model artifacts ────────────────────────────────────────────────────────────
artifacts = [
    HERE / "models" / "vocab.pkl",
    HERE / "models" / "lstm_final.keras",
    HERE / "artifacts" / "network" / "feature_cols_final.pkl",
    HERE / "artifacts" / "network" / "scaler.pkl",
    HERE / "artifacts" / "network" / "label_encoder.pkl",
    HERE / "artifacts" / "network" / "label_encoder_stage2.pkl",
    HERE / "artifacts" / "network" / "lightgbm_model.txt",
    HERE / "artifacts" / "network" / "xgb_stage2_attack_classifier.json",
    HERE / "artifacts" / "network" / "autoencoder.pt",
    HERE / "artifacts" / "network" / "zero_day_threshold.pkl",
    HERE / "artifacts" / "network" / "inference_set.parquet",
]

print("── Artifact checks ─────────────────────────────────────────")
all_ok = True
for path in artifacts:
    exists = path.exists()
    size   = path.stat().st_size if exists else 0
    status = "OK   " if exists else "MISSING"
    size_str = f"{size/1024:.1f} KB" if exists else "—"
    print(f"  [{status}] {path.name:<45} {size_str}")
    if not exists:
        all_ok = False

# ── Environment variables ──────────────────────────────────────────────────────
print("\n── Environment variable checks ─────────────────────────────")
secrets = [
    "ANTHROPIC_API_KEY",
    "GEMINI_API_KEY",
    "GROQ_API_KEY",
    "CEREBRAS_API_KEY",
]
for key in secrets:
    val = os.environ.get(key)
    status = "OK   " if val else "MISSING"
    print(f"  [{status}] {key}")
    if not val:
        all_ok = False

# ── Port check ─────────────────────────────────────────────────────────────────
print("\n── Port check ──────────────────────────────────────────────")
try:
    import subprocess, json
    result = subprocess.run(["grep", "-n", "7860", "main.py"], capture_output=True, text=True, cwd=str(HERE))
    if "7860" in result.stdout:
        print("  [OK   ] Port 7860 found in main.py / Dockerfile")
    else:
        print("  [WARN ] Port 7860 not found — HF Spaces requires port 7860")
except Exception:
    pass

print()
if all_ok:
    print("✓ All checks passed. Safe to push to Hugging Face Spaces.")
else:
    print("✗ Fix the MISSING items above before deploying to Hugging Face.")
    sys.exit(1)
