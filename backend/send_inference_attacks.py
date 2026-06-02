"""
send_inference_attacks.py
--------------------------
Reads real attack flows from the inference_set.parquet and POSTs them to the
live /api/predict/network endpoint so the pipeline detects them, stores them
with full MITRE context, and makes them available for agent analysis in the UI.

Usage:
    .venv\\Scripts\\python.exe send_inference_attacks.py
"""
import requests
import pandas as pd
import pickle
import json

PARQUET = "artifacts/network/inference_set.parquet"
FEATURES_PKL = "artifacts/network/feature_cols_final.pkl"
API = "http://localhost:8000/api/predict/network"

# Load feature columns
with open(FEATURES_PKL, "rb") as f:
    feature_cols = pickle.load(f)

# Load inference data
df = pd.read_parquet(PARQUET)
print(f"Total rows in inference set: {len(df)}")

# Select only labelled ATTACK rows (non-benign)
# The parquet has label_binary: 0=benign, 1=attack
attacks = df[df["label_binary"] == 1].copy()
print(f"Attack rows available: {len(attacks)}")

# Pick 5 diverse attacks (one of each attack type if possible)
if "label_multi" in attacks.columns:
    sample = attacks.groupby("label_multi", group_keys=False).apply(
        lambda g: g.sample(min(1, len(g)), random_state=42)
    ).head(5)
else:
    sample = attacks.sample(min(5, len(attacks)), random_state=42)

print(f"\nSending {len(sample)} attack flows to the API...\n")

# Keep only feature columns that exist in the parquet
cols_to_send = [c for c in feature_cols if c in sample.columns]

flows = sample[cols_to_send].to_dict(orient="records")

res = requests.post(API, json={"flows": flows}, timeout=60)
print(f"Status: {res.status_code}")
if res.status_code == 200:
    results = res.json()
    for r in results:
        verdict = r.get("verdict", "?")
        attack  = r.get("attack_type", "?")
        conf    = r.get("confidence", 0)
        rid     = r.get("id", "NO-ID")
        mitre   = r.get("mitre", {})
        tech    = mitre.get("technique", "No MITRE")
        tid     = mitre.get("technique_id", "")
        print(f"  [{rid}]  verdict={verdict:<9} type={attack:<12} conf={conf:.0f}%  MITRE: {tech} ({tid})")
    print("\nDone! Now go to the Alerts page in the UI and click 'Analyze with Agent'.")
else:
    print(res.text)
