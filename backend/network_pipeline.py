"""
network_pipeline.py
Three-Stage CIC-IDS2017 Network Intrusion Detection Pipeline.

Stage 1 — LightGBM binary gate   : BENIGN vs ATTACK
Stage 2 — XGBoost multiclass     : attack type classification
Stage 3 — Autoencoder zero-day   : novelty / zero-day detection

Loaded once at FastAPI startup and kept in memory.
"""

from __future__ import annotations

import os
import pickle
import warnings
from pathlib import Path
from typing import Any

import joblib
import lightgbm as lgb
import numpy as np
import pandas as pd
import torch
import torch.nn as nn
import xgboost as xgb
import shap
from sklearn.metrics import roc_auc_score, f1_score

warnings.filterwarnings("ignore")

# ── Default paths ────────────────────────────────────────────────────────────
ARTIFACTS_DIR = Path(__file__).parent.parent / "network_logs_models"

# Stage 1 threshold from notebook precision-recall curve
OPTIMAL_S1_THRESHOLD: float = 0.30


# ── Stage 3 autoencoder architecture (must match training exactly) ────────────

class ZeroDayAutoencoder(nn.Module):
    def __init__(self, input_dim: int, bottleneck: int = 16):
        super().__init__()
        self.encoder = nn.Sequential(
            nn.Linear(input_dim, 128), nn.BatchNorm1d(128), nn.ReLU(), nn.Dropout(0.2),
            nn.Linear(128, 64),        nn.BatchNorm1d(64),  nn.ReLU(),
            nn.Linear(64, bottleneck),
        )
        self.decoder = nn.Sequential(
            nn.Linear(bottleneck, 64),  nn.BatchNorm1d(64),  nn.ReLU(),
            nn.Linear(64, 128),         nn.BatchNorm1d(128), nn.ReLU(), nn.Dropout(0.2),
            nn.Linear(128, input_dim),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.decoder(self.encoder(x))

    def reconstruction_error(self, x: torch.Tensor) -> torch.Tensor:
        with torch.no_grad():
            return torch.mean((x - self.forward(x)) ** 2, dim=1)


# ── Main pipeline class ───────────────────────────────────────────────────────

class ThreeStagePipeline:
    """
    Full three-stage network intrusion detection pipeline.

    Output per flow:
        verdict             : "BENIGN" | "ATTACK" | "ZERO_DAY"
        attack_probability  : float  — Stage 1 raw P(attack)
        attack_type         : str    — Stage 2 class name
        s2_confidence       : float  — Stage 2 max class probability
        reconstruction_error: float  — Stage 3 MSE
        zero_day_flag       : bool
    """

    def __init__(
        self,
        artifacts_dir: str | Path = ARTIFACTS_DIR,
        s1_threshold: float = OPTIMAL_S1_THRESHOLD,
        device: str | None = None,
    ):
        self.artifacts_dir = Path(artifacts_dir)
        self.s1_threshold  = s1_threshold
        self.device        = device or ("cuda" if torch.cuda.is_available() else "cpu")

        p = self.artifacts_dir

        # ── Preprocessing ────────────────────────────────────────────────────
        self.scaler       = joblib.load(p / "scaler.pkl")
        self.feature_cols: list[str] = joblib.load(p / "feature_cols_final.pkl")
        self.le           = joblib.load(p / "label_encoder.pkl")
        self.le2          = joblib.load(p / "label_encoder_stage2.pkl")

        # ── Stage 1: LightGBM binary ─────────────────────────────────────────
        self.lgb_model = lgb.Booster(model_file=str(p / "lightgbm_model.txt"))

        # ── Stage 2: XGBoost multiclass ─────────────────────────────────────
        self.xgb_stage2 = xgb.Booster()
        self.xgb_stage2.load_model(str(p / "xgb_stage2_attack_classifier.json"))

        # ── Stage 3: Autoencoder ─────────────────────────────────────────────
        input_dim         = len(self.feature_cols)
        self.autoencoder  = ZeroDayAutoencoder(input_dim=input_dim).to(self.device)
        state             = torch.load(str(p / "autoencoder.pt"), map_location=self.device)
        # Strip DataParallel 'module.' prefix if present
        if any(k.startswith("module.") for k in state.keys()):
            state = {k.replace("module.", ""): v for k, v in state.items()}
        self.autoencoder.load_state_dict(state)
        self.autoencoder.eval()

        with open(p / "zero_day_threshold.pkl", "rb") as f:
            self.zero_day_threshold: float = pickle.load(f)

        print(f"[NET] ThreeStagePipeline loaded")
        print(f"[NET]   Features           : {len(self.feature_cols)}")
        print(f"[NET]   Attack classes     : {list(self.le2.classes_)}")
        print(f"[NET]   S1 threshold       : {self.s1_threshold}")
        print(f"[NET]   Zero-day threshold : {self.zero_day_threshold:.6f}")
        print(f"[NET]   Device             : {self.device}")

    # ── Preprocessing ─────────────────────────────────────────────────────────

    def _preprocess(self, df_raw: pd.DataFrame) -> np.ndarray:
        df = df_raw.copy()
        df.columns = df.columns.str.strip()
        df.replace([np.inf, -np.inf], np.nan, inplace=True)
        # Fill missing columns with 0
        for col in self.feature_cols:
            if col not in df.columns:
                df[col] = 0.0
        X = df[self.feature_cols].fillna(0).values.astype(np.float32)
        return self.scaler.transform(X)

    # ── Batch prediction ──────────────────────────────────────────────────────

    def predict(self, df_raw: pd.DataFrame) -> pd.DataFrame:
        """
        Run the full three-stage pipeline on a batch of flows.

        Parameters
        ----------
        df_raw : DataFrame with raw (unscaled) feature columns

        Returns
        -------
        DataFrame with columns:
            verdict, attack_probability, attack_type,
            s2_confidence, reconstruction_error, zero_day_flag
        """
        X = self._preprocess(df_raw)
        n = len(X)

        results = pd.DataFrame({
            "verdict"             : ["BENIGN"] * n,
            "attack_probability"  : np.zeros(n, dtype=np.float32),
            "attack_type"         : [None] * n,
            "confidence"          : np.zeros(n, dtype=np.float32),
            "reconstruction_error": np.zeros(n, dtype=np.float32),
            "zero_day_flag"       : [False] * n,
            "shap_data"           : [None] * n,
        })

        # ── Stage 1 ───────────────────────────────────────────────────────────
        s1_probs = self.lgb_model.predict(X).astype(np.float32)
        results["attack_probability"] = s1_probs
        attack_mask = s1_probs >= self.s1_threshold
        results.loc[attack_mask, "verdict"] = "ATTACK"

        if not attack_mask.any():
            return results

        # ── Stage 2 ───────────────────────────────────────────────────────────
        X_atk       = X[attack_mask]
        d_atk       = xgb.DMatrix(X_atk)
        prob_matrix = self.xgb_stage2.predict(d_atk).reshape(-1, len(self.le2.classes_))
        s2_idx      = prob_matrix.argmax(axis=1)
        raw_names   = self.le2.inverse_transform(s2_idx)
        
        ATTACK_MAP = {
            "Bot":         "bot",
            "DDoS":        "ddos",
            "DoS":         "dos",
            "FTP-Patator": "bruteforce",
            "PortScan":    "scanning",
            "Rare Attack": "generic",
            "SSH-Patator": "bruteforce",
            "Web Attack":  "exploits"
        }
        s2_names    = [ATTACK_MAP.get(name, "generic") for name in raw_names]
        s2_conf     = prob_matrix.max(axis=1)

        results.loc[attack_mask, "attack_type"]   = s2_names
        results.loc[attack_mask, "confidence"]    = s2_conf.astype(np.float32)

        # ── Stage 3 ───────────────────────────────────────────────────────────
        X_atk_t      = torch.tensor(X_atk, dtype=torch.float32).to(self.device)
        recon_errors = self.autoencoder.reconstruction_error(X_atk_t).cpu().numpy()
        zero_day     = recon_errors > self.zero_day_threshold

        atk_indices  = np.where(attack_mask)[0]
        results.loc[attack_mask, "reconstruction_error"] = recon_errors.astype(np.float32)
        results.loc[attack_mask, "zero_day_flag"]        = zero_day

        # Zero-day overrides Stage 2 label
        zd_global = atk_indices[zero_day]
        results.loc[zd_global, "verdict"]     = "ZERO_DAY"
        results.loc[zd_global, "attack_type"] = "generic"

        # ── XAI: SHAP values ──────────────────────────────────────────────────
        try:
            explainer = shap.TreeExplainer(self.lgb_model)
            calc_n = min(n, 2000)
            shap_values = explainer.shap_values(X[:calc_n])
            # shap_values could be a list for multiclass, or array for binary.
            # LightGBM binary gives array of shape (n_samples, n_features) or list of 2.
            if isinstance(shap_values, list):
                shap_vals = shap_values[1]  # take positive class
            else:
                shap_vals = shap_values
            
            shap_data_list = []
            for i in range(calc_n):
                row_shaps = shap_vals[i]
                top_indices = np.argsort(np.abs(row_shaps))[-4:][::-1] # top 4 by magnitude
                
                row_shap_data = []
                for idx in top_indices:
                    val = float(row_shaps[idx])
                    feat_name = self.feature_cols[idx]
                    raw_val = float(df_raw.iloc[i][feat_name]) if feat_name in df_raw.columns else 0.0
                    row_shap_data.append({
                        "feature": feat_name,
                        "value": val,
                        "raw": f"{raw_val:.4f}",
                        "type": "positive" if val > 0 else "negative"
                    })
                shap_data_list.append(row_shap_data)
            
            for i in range(calc_n, n):
                shap_data_list.append(None)
                
            results["shap_data"] = shap_data_list
        except Exception as e:
            print(f"[NET] SHAP computation failed: {e}")

        return pd.concat([df_raw.reset_index(drop=True), results], axis=1)

    # ── Smoke-test on inference_set.parquet ───────────────────────────────────

    def smoke_test(self) -> dict[str, Any]:
        """
        Run the pipeline on the held-out inference set and return metrics dict.
        Expected: Macro F1 > 0.85, AUC > 0.97, zero-day rate 1-5%.
        """
        parquet_path = self.artifacts_dir / "inference_set.parquet"
        if not parquet_path.exists():
            print("[NET] WARNING: inference_set.parquet not found, skipping smoke test")
            return {}

        print(f"[NET] Running smoke test on inference_set.parquet ...")
        infer_df       = pd.read_parquet(str(parquet_path))
        y_b_true       = infer_df["label_binary"].values.astype(int)
        y_m_true_enc   = infer_df["label_multi"].values.astype(int)
        X_raw          = infer_df[self.feature_cols]

        out = self.predict(X_raw)

        # Binary metrics (ZERO_DAY counts as ATTACK)
        y_b_pred = (out["verdict"] != "BENIGN").astype(int).values
        try:
            auc = round(float(roc_auc_score(y_b_true, out["attack_probability"].values)), 4)
        except Exception:
            auc = 0.0

        # Macro F1 over all multi-class labels (map predictions back)
        # Build predicted multi-class array: 0=Benign, else le.transform(attack_type)
        y_m_pred = np.zeros(len(out), dtype=int)
        attack_rows = out["verdict"] != "BENIGN"
        known_atk   = attack_rows & (out["attack_type"] != "ZERO_DAY")
        if known_atk.any():
            try:
                y_m_pred[known_atk.values] = self.le.transform(
                    out.loc[known_atk, "attack_type"].values
                )
            except Exception:
                pass

        macro_f1 = round(float(f1_score(y_m_true_enc, y_m_pred, average="macro", zero_division=0)), 4)

        # Verdict distribution
        verdict_counts = out["verdict"].value_counts().to_dict()
        attack_type_counts = (
            out[out["verdict"] == "ATTACK"]["attack_type"]
            .value_counts().to_dict()
        )
        zero_day_rate = round(float(out["zero_day_flag"].mean()) * 100, 2)

        # ROC data (10-point curve)
        thresholds = np.linspace(0, 1, 10)
        s1_probs   = out["attack_probability"].values
        roc_data   = []
        for t in thresholds:
            p_t  = (s1_probs >= t).astype(int)
            tp_t = int(np.sum((p_t == 1) & (y_b_true == 1)))
            fp_t = int(np.sum((p_t == 1) & (y_b_true == 0)))
            fn_t = int(np.sum((p_t == 0) & (y_b_true == 1)))
            tn_t = int(np.sum((p_t == 0) & (y_b_true == 0)))
            tpr  = round(tp_t / (tp_t + fn_t + 1e-9), 4)
            fpr  = round(fp_t / (fp_t + tn_t + 1e-9), 4)
            roc_data.append({"fpr": fpr, "tpr": tpr})
        roc_data.sort(key=lambda x: x["fpr"])

        # Confusion matrix (binary)
        TP = int(np.sum((y_b_pred == 1) & (y_b_true == 1)))
        TN = int(np.sum((y_b_pred == 0) & (y_b_true == 0)))
        FP = int(np.sum((y_b_pred == 1) & (y_b_true == 0)))
        FN = int(np.sum((y_b_pred == 0) & (y_b_true == 1)))

        precision = round(TP / (TP + FP + 1e-9) * 100, 2)
        recall    = round(TP / (TP + FN + 1e-9) * 100, 2)
        f1_bin    = round(2 * precision * recall / (precision + recall + 1e-9), 2)

        # Drift: daily accuracy over 30 chunks
        chunk = max(1, len(y_b_true) // 30)
        drift = []
        for day in range(30):
            s = day * chunk
            e = min(s + chunk, len(y_b_true))
            if s >= len(y_b_true):
                break
            acc = round(float(np.mean(y_b_pred[s:e] == y_b_true[s:e])) * 100, 2)
            drift.append({"day": f"Day {day+1}", "accuracy": acc})

        # Feature importance from LightGBM
        try:
            imp = self.lgb_model.feature_importance(importance_type="gain")
            feat_names = self.lgb_model.feature_name()
            top_idx = np.argsort(imp)[::-1][:8]
            feat_imp = [
                {"feature": feat_names[i], "value": round(float(imp[i] / (imp.max() + 1e-9)), 3)}
                for i in top_idx
            ]
        except Exception:
            feat_imp = []

        metrics = {
            "precision"        : precision,
            "recall"           : recall,
            "f1"               : f1_bin,
            "macro_f1"         : macro_f1,
            "auc"              : auc,
            "accuracy"         : round((TP + TN) / (len(y_b_true) + 1e-9) * 100, 2),
            "TP": TP, "TN": TN, "FP": FP, "FN": FN,
            "roc_data"         : roc_data,
            "drift_data"       : drift,
            "feat_imp"         : feat_imp,
            "verdict_counts"   : verdict_counts,
            "attack_type_counts": attack_type_counts,
            "zero_day_rate"    : zero_day_rate,
            "zero_day_threshold": round(float(self.zero_day_threshold), 6),
            "total_flows"      : len(out),
            "s1_threshold"     : self.s1_threshold,
            "attack_classes"   : list(self.le2.classes_),
        }

        print(f"[NET] Smoke test complete:")
        print(f"[NET]   Flows      : {len(out):,}")
        print(f"[NET]   Macro F1   : {macro_f1:.4f}  (target >0.85)")
        print(f"[NET]   AUC        : {auc:.4f}  (target >0.97)")
        print(f"[NET]   Zero-day % : {zero_day_rate:.2f}%  (target 1-5%)")
        print(f"[NET]   Verdicts   : {verdict_counts}")

        # Sample the first 2000 flows for the Explorer UI
        sample_size = min(2000, len(infer_df))
        logs_sample = []
        for i in range(sample_size):
            pred = out.iloc[i]
            
            # Create a simple preview string
            preview = f"Flow | S1 Prob: {pred['attack_probability']:.2f} | Type: {pred['attack_type']}"
            
            logs_sample.append({
                "block_id": f"FLOW-{i+100000}", # unique ID
                "source": "Network",
                "preview": preview,
                "raw": "Network Flow Record\n" + "\n".join([f"{k}: {v}" for k, v in infer_df.iloc[i][self.feature_cols[:15]].to_dict().items()]) + "\n...",
                "label": "Normal" if pred["verdict"] == "BENIGN" else "Anomaly",
                "confidence": round(float(pred["attack_probability"] * 100 if pred["verdict"] != "BENIGN" else (1 - pred["attack_probability"]) * 100), 1),
                "truth": "Normal" if y_b_true[i] == 0 else "Anomaly",
                "event_count": 1, # A flow is a single event record
                "verdict": pred["verdict"],
                "attack_type": pred["attack_type"]
            })
            
        metrics["logs_sample"] = logs_sample

        return metrics
