"""
CyberAI FastAPI Backend
Loads lstm_final.keras + vocab.pkl, pre-processes HDFS inference data at startup,
and serves real predictions to the React frontend.
"""

import os
import re
import math
import joblib
import numpy as np
import pandas as pd
from pathlib import Path
from typing import Optional
from contextlib import asynccontextmanager
from collections import defaultdict

import tensorflow as tf
from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing.sequence import pad_sequences

from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# ─── Paths ──────────────────────────────────────────────────────────────────
BASE_DIR    = Path(__file__).parent.parent          # project root
MODEL_PATH  = BASE_DIR / "models" / "lstm_final.keras"
VOCAB_PATH  = BASE_DIR / "models" / "vocab.pkl"
SAMPLES_PATH = BASE_DIR / "data" / "inference_samples.txt"
LABELS_PATH  = BASE_DIR / "data" / "inference_labels.csv"

# ─── Hyperparameters (match notebook exactly) ───────────────────────────────
MAX_SEQ_LEN = 50

# ─── Event template patterns — ordered most-specific first ────────────────────
# Each tuple: (compiled regex, exact vocab key)
PATTERNS = [
    # PacketResponder variants (most specific first)
    (re.compile(r'PacketResponder.*Interrupted', re.I),
     'PacketResponder <*> for block BLK Interrupted.'),
    (re.compile(r'PacketResponder BLK.*InterruptedIO', re.I),
     'PacketResponder BLK <*> Exception java.io.InterruptedIOException: Interruped while waiting for IO on channel java.nio.channels.SocketChannel[connected local=IP remote=IP]. <*> millis timeout left.'),
    (re.compile(r'PacketResponder BLK.*SocketTimeout', re.I),
     'PacketResponder BLK <*> Exception java.net.SocketTimeoutException: <*> millis timeout while waiting for channel to be ready for read. ch : java.nio.channels.SocketChannel[connected local=IP remote=IP]'),
    (re.compile(r'PacketResponder BLK.*EOFException', re.I),
     'PacketResponder BLK <*> Exception java.io.EOFException'),
    (re.compile(r'PacketResponder BLK.*Connection reset', re.I),
     'PacketResponder BLK <*> Exception java.io.IOException: Connection reset by peer'),
    (re.compile(r'PacketResponder BLK.*ClosedByInterrupt', re.I),
     'PacketResponder BLK <*> Exception java.nio.channels.ClosedByInterruptException'),
    (re.compile(r'PacketResponder BLK.*Broken pipe', re.I),
     'PacketResponder BLK <*> Exception java.io.IOException: Broken pipe'),
    (re.compile(r'PacketResponder BLK.*InterruptedIOException.*closed', re.I),
     'PacketResponder BLK <*> Exception java.io.InterruptedIOException: Interruped while waiting for IO on channel java.nio.channels.SocketChannel[closed]. <*> millis timeout left.'),
    (re.compile(r'PacketResponder BLK.*stream is closed', re.I),
     'PacketResponder BLK <*> Exception java.io.IOException: The stream is closed'),
    (re.compile(r'PacketResponder.*terminating', re.I),
     'PacketResponder <*> for block BLK terminating'),
    (re.compile(r'PacketResponder', re.I),
     'PacketResponder <*> for block BLK terminating'),
    # writeBlock variants
    (re.compile(r'writeBlock.*Connection reset', re.I),
     'writeBlock BLK received exception java.io.IOException: Connection reset by peer'),
    (re.compile(r'writeBlock.*Connection reset by peer', re.I),
     'writeBlock BLK received exception java.io.IOException: Connection reset by peer'),
    (re.compile(r'writeBlock.*EOFException', re.I),
     'writeBlock BLK received exception java.io.EOFException'),
    (re.compile(r'writeBlock.*valid.*cannot be written', re.I),
     'writeBlock BLK received exception java.io.IOException: Block BLK is valid, and cannot be written to.'),
    (re.compile(r'writeBlock.*Interrupted receiveBlock', re.I),
     'writeBlock BLK received exception java.io.IOException: Interrupted receiveBlock'),
    (re.compile(r'writeBlock.*SocketTimeoutException.*read', re.I),
     'writeBlock BLK received exception java.net.SocketTimeoutException: <*> millis timeout while waiting for channel to be ready for read. ch : java.nio.channels.SocketChannel[connected local=IP remote=IP]'),
    (re.compile(r'writeBlock.*SocketTimeoutException.*write', re.I),
     'writeBlock BLK received exception java.net.SocketTimeoutException: <*> millis timeout while waiting for channel to be ready for write. ch : java.nio.channels.SocketChannel[connected local=IP remote=IP]'),
    (re.compile(r'writeBlock.*SocketTimeoutException', re.I),
     'writeBlock BLK received exception java.net.SocketTimeoutException'),
    (re.compile(r'writeBlock.*ClosedByInterrupt', re.I),
     'writeBlock BLK received exception java.nio.channels.ClosedByInterruptException'),
    (re.compile(r'writeBlock.*Broken pipe', re.I),
     'writeBlock BLK received exception java.io.IOException: Broken pipe'),
    (re.compile(r'writeBlock.*NoRouteToHost', re.I),
     'writeBlock BLK received exception java.net.NoRouteToHostException: No route to host'),
    (re.compile(r'writeBlock.*InterruptedIO', re.I),
     'writeBlock BLK received exception java.io.InterruptedIOException: Interruped while waiting for IO on channel java.nio.channels.SocketChannel[connected local=IP remote=IP]. <*> millis timeout left.'),
    # receiveBlock / Exception in receiveBlock
    (re.compile(r'Exception in receiveBlock.*Connection reset', re.I),
     'Exception in receiveBlock for block BLK java.io.IOException: Connection reset by peer'),
    (re.compile(r'Exception in receiveBlock.*EOFException', re.I),
     'Exception in receiveBlock for block BLK java.io.EOFException'),
    (re.compile(r'Exception in receiveBlock.*ClosedByInterrupt', re.I),
     'Exception in receiveBlock for block BLK java.nio.channels.ClosedByInterruptException'),
    (re.compile(r'Exception in receiveBlock.*SocketTimeout.*write', re.I),
     'Exception in receiveBlock for block BLK java.net.SocketTimeoutException: <*> millis timeout while waiting for channel to be ready for write. ch : java.nio.channels.SocketChannel[connected local=IP remote=IP]'),
    (re.compile(r'Exception in receiveBlock.*InterruptedIO', re.I),
     'Exception in receiveBlock for block BLK java.io.InterruptedIOException: Interruped while waiting for IO on channel java.nio.channels.SocketChannel[connected local=IP remote=IP]. <*> millis timeout left.'),
    (re.compile(r'Exception in receiveBlock.*Broken pipe', re.I),
     'Exception in receiveBlock for block BLK java.io.IOException: Broken pipe'),
    # Received / Receiving block
    (re.compile(r'Received block.*src:.*dest:.*size', re.I),
     'Received block BLK src: IP dest: IP of size <*>'),
    (re.compile(r'Received block.*of size.*from', re.I),
     'Received block BLK of size <*> from IP'),
    (re.compile(r'Received block', re.I),
     'Received block BLK of size <*> from IP'),
    (re.compile(r'Receiving empty packet', re.I),
     'Receiving empty packet for block BLK'),
    (re.compile(r'Receiving block', re.I),
     'Receiving block BLK src: IP dest: IP'),
    # BLOCK* NameSystem
    (re.compile(r'BLOCK.*NameSystem\.allocateBlock', re.I),
     'BLOCK* NameSystem.allocateBlock: PATH BLK'),
    (re.compile(r'BLOCK.*addStoredBlock.*request received.*does not belong', re.I),
     'BLOCK* NameSystem.addStoredBlock: addStoredBlock request received for BLK on IP size <*> But it does not belong to any file.'),
    (re.compile(r'BLOCK.*addStoredBlock.*Redundant', re.I),
     'BLOCK* NameSystem.addStoredBlock: Redundant addStoredBlock request received for BLK on IP size <*>'),
    (re.compile(r'BLOCK.*addStoredBlock', re.I),
     'BLOCK* NameSystem.addStoredBlock: blockMap updated: IP is added to BLK size <*>'),
    (re.compile(r'BLOCK.*NameSystem\.delete', re.I),
     'BLOCK* NameSystem.delete: BLK is added to invalidSet of IP'),
    (re.compile(r'BLOCK.*ask.*replicate.*IP IP', re.I),
     'BLOCK* ask IP to replicate BLK to datanode(s) IP IP'),
    (re.compile(r'BLOCK.*ask.*replicate', re.I),
     'BLOCK* ask IP to replicate BLK to datanode(s) IP'),
    (re.compile(r'BLOCK.*Removing block.*neededReplication', re.I),
     'BLOCK* Removing block BLK from neededReplications as it does not belong to any file.'),
    # Deleting / block file operations
    (re.compile(r'Deleting block', re.I),
     'Deleting block BLK file PATH'),
    (re.compile(r'Changing block file offset', re.I),
     'Changing block file offset of block BLK from <*> to <*> meta file offset to <*>'),
    (re.compile(r'Unexpected error.*delete block', re.I),
     'Unexpected error trying to delete block BLK. BlockInfo not found in volumeMap.'),
    (re.compile(r'Adding an already existing block', re.I),
     'Adding an already existing block BLK'),
    (re.compile(r'PendingReplication.*timed out', re.I),
     'PendingReplicationMonitor timed out block BLK'),
    (re.compile(r'Reopen Block', re.I),
     'Reopen Block BLK'),
    # Transfer
    (re.compile(r'Starting thread to transfer.*IP, IP', re.I),
     'IP Starting thread to transfer block BLK to IP, IP'),
    (re.compile(r'Starting thread to transfer', re.I),
     'IP Starting thread to transfer block BLK to IP'),
    (re.compile(r'Transmitted block', re.I),
     'IP:Transmitted block BLK to IP'),
    (re.compile(r'Failed to transfer', re.I),
     'IP:Failed to transfer BLK to IP got java.io.IOException: Connection reset by peer'),
    (re.compile(r'Exception writing block.*mirror', re.I),
     'IP:Exception writing block BLK to mirror IP'),
    # Served / Got exception
    (re.compile(r'Served block', re.I),
     'IP Served block BLK to IP'),
    (re.compile(r'Got exception.*serving', re.I),
     'IP:Got exception while serving BLK to IP:'),
    # Verification
    (re.compile(r'Verification.*succeeded', re.I),
     'Verification succeeded for BLK'),
]

BLOCK_RE = re.compile(r'(blk_-?\d+)')

# ─── Global state (populated at startup) ────────────────────────────────────
state: dict = {
    "model": None,
    "vocab": None,
    "logs": [],          # list of dicts, one per block session
    "metrics": {},       # pre-computed model metrics vs ground truth
}


# ─── Helpers ─────────────────────────────────────────────────────────────────

def parse_event(line: str, vocab: dict) -> str:
    """Map a raw log line to the exact vocab key (Drain template string)."""
    for pattern, template in PATTERNS:
        if pattern.search(line):
            if template in vocab:
                return template
    return '<UNK>'


#def encode_and_pad(tokens: list[str], vocab: dict) -> np.ndarray:
 #   seq = [vocab.get(t, 0) for t in tokens]
  #  return pad_sequences([seq], maxlen=MAX_SEQ_LEN, padding='post', truncating='post')


def encode_and_pad(tokens, vocab):
    indices = [vocab.get(t, 0) for t in tokens]
    vec = np.bincount(indices, minlength=len(vocab)).astype(float)
    return vec.reshape(1, -1)   # shape (1, 56)


def predict_session(tokens: list[str], model, vocab: dict) -> tuple[str, float]:
    """Run LSTM on a list of event tokens. Returns (label, confidence 0-100)."""
    padded = encode_and_pad(tokens, vocab)
    prob = float(model.predict_proba(padded)[0][1])  
    label = "Anomaly" if prob >= 0.5 else "Normal"
    confidence = round((prob if prob >= 0.5 else 1.0 - prob) * 100, 1)
    return label, confidence


def parse_raw_log_to_tokens(raw: str, vocab: dict) -> list[str]:
    """Parse a multi-line raw log text into event tokens matching the vocab."""
    # Handle both newline-separated and concatenated formats
    ENTRY_RE = re.compile(r'(?=\d{6}\s\d{6}\s\d+\s)')
    parts = ENTRY_RE.split(raw)
    if len(parts) <= 1:
        # Fallback: split on newlines
        parts = raw.strip().split('\n')
    return [parse_event(p.strip(), vocab) for p in parts if p.strip()]


# ─── Startup: load models + pre-process all inference data ───────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("[*] Loading LSTM model and vocabulary...")
    #model = load_model(str(MODEL_PATH))

    model = joblib.load(str(BASE_DIR / "models" / "rf_model.pkl"))


    vocab = joblib.load(str(VOCAB_PATH))
    state["model"] = model
    state["vocab"] = vocab
    print(f"[OK] Model loaded. Vocab size: {len(vocab)}")

    print("[*] Parsing inference_samples.txt ...")
    # The file has no newlines — split on HDFS timestamp pattern (YYMMDD HHMMSS threadID)
    ENTRY_RE = re.compile(r'(?=\d{6}\s\d{6}\s\d+\s)')
    block_lines: dict[str, list[str]] = defaultdict(list)
    with open(SAMPLES_PATH, "r", encoding="utf-8", errors="ignore") as f:
        raw = f.read()
    entries = ENTRY_RE.split(raw)
    for entry in entries:
        entry = entry.strip()
        if not entry:
            continue
        match = BLOCK_RE.search(entry)
        if match:
            block_id = match.group(1)
            block_lines[block_id].append(entry)

    print(f"    Found {len(block_lines)} unique block sessions")

    # Load ground truth labels
    labels_df = pd.read_csv(LABELS_PATH)
    label_map = dict(zip(labels_df["block_id"], labels_df["Label"]))

    print("[*] Running batch LSTM inference on all sessions...")
    logs = []
    y_true, y_pred = [], []

    block_ids = list(block_lines.keys())
    # Batch predict for speed
    all_tokens = [[parse_event(line, vocab) for line in block_lines[bid]] for bid in block_ids]
    all_seqs   = [encode_and_pad(toks, vocab) for toks in all_tokens]
    X_batch    = np.vstack(all_seqs)                        # shape: (N, MAX_SEQ_LEN)
    probs      = model.predict(X_batch, batch_size=512, verbose=1).flatten()

    for i, bid in enumerate(block_ids):
        prob  = float(probs[i])
        label = "Anomaly" if prob >= 0.5 else "Normal"
        conf  = round((prob if prob >= 0.5 else 1.0 - prob) * 100, 1)
        truth = label_map.get(bid, "Normal")

        raw_preview = block_lines[bid][0] if block_lines[bid] else ""

        logs.append({
            "block_id":   bid,
            "label":      label,
            "confidence": conf,
            "truth":      truth,
            "raw":        "\n".join(block_lines[bid][:5]),  # first 5 entries as preview
            "preview":    raw_preview[:120],
            "event_count": len(block_lines[bid]),
        })

        y_true.append(1 if truth == "Anomaly" else 0)
        y_pred.append(1 if label == "Anomaly" else 0)

    state["logs"] = logs
    print(f"[OK] Inference complete on {len(logs)} sessions")

    # ── Compute real metrics ──────────────────────────────────────────────
    y_true_arr = np.array(y_true)
    y_pred_arr = np.array(y_pred)

    TP = int(np.sum((y_pred_arr == 1) & (y_true_arr == 1)))
    TN = int(np.sum((y_pred_arr == 0) & (y_true_arr == 0)))
    FP = int(np.sum((y_pred_arr == 1) & (y_true_arr == 0)))
    FN = int(np.sum((y_pred_arr == 0) & (y_true_arr == 1)))

    precision = round(TP / (TP + FP + 1e-9) * 100, 2)
    recall    = round(TP / (TP + FN + 1e-9) * 100, 2)
    f1        = round(2 * precision * recall / (precision + recall + 1e-9), 2)
    accuracy  = round((TP + TN) / (len(y_true) + 1e-9) * 100, 2)

    # ROC curve (simplified 10-point)
    thresholds = np.linspace(0, 1, 10)
    probs_arr  = probs[:len(y_true)]
    roc_data   = []
    for t in thresholds:
        preds_t = (probs_arr >= t).astype(int)
        tp_t = int(np.sum((preds_t == 1) & (y_true_arr == 1)))
        fp_t = int(np.sum((preds_t == 1) & (y_true_arr == 0)))
        fn_t = int(np.sum((preds_t == 0) & (y_true_arr == 1)))
        tn_t = int(np.sum((preds_t == 0) & (y_true_arr == 0)))
        tpr  = round(tp_t / (tp_t + fn_t + 1e-9), 4)
        fpr  = round(fp_t / (fp_t + tn_t + 1e-9), 4)
        roc_data.append({"fpr": fpr, "tpr": tpr})
    roc_data.sort(key=lambda x: x["fpr"])

    # AUC (trapezoid)
    auc = round(float(np.trapz([p["tpr"] for p in roc_data], [p["fpr"] for p in roc_data])), 3)

    # Daily accuracy drift (simulate 30 day window using shuffled subsets)
    np.random.seed(42)
    drift_data = []
    chunk_size = max(1, len(y_true) // 30)
    for day in range(30):
        start = day * chunk_size
        end   = min(start + chunk_size, len(y_true))
        if start >= len(y_true):
            break
        chunk_true = y_true_arr[start:end]
        chunk_pred = y_pred_arr[start:end]
        acc = round(float(np.mean(chunk_true == chunk_pred)) * 100, 2)
        drift_data.append({"day": f"Day {day + 1}", "accuracy": acc})

    state["metrics"] = {
        "precision": precision,
        "recall":    recall,
        "f1":        f1,
        "accuracy":  accuracy,
        "TP": TP, "TN": TN, "FP": FP, "FN": FN,
        "auc":       auc,
        "roc_data":  roc_data,
        "drift_data": drift_data,
    }

    print(f"[METRICS] Precision: {precision}%  Recall: {recall}%  F1: {f1}%  Accuracy: {accuracy}%")
    print(f"    Confusion  TP:{TP}  TN:{TN}  FP:{FP}  FN:{FN}")
    yield
    print("[*] Shutting down.")


# ─── App ──────────────────────────────────────────────────────────────────────

app = FastAPI(title="CyberAI Backend", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Request / Response Models ────────────────────────────────────────────────

class AnalyzeRequest(BaseModel):
    raw_log: str


# ─── Endpoints ───────────────────────────────────────────────────────────────

@app.get("/api/health")
def health():
    return {"status": "ok", "model_loaded": state["model"] is not None}


@app.get("/api/logs")
def get_logs(
    page:   int           = Query(1, ge=1),
    limit:  int           = Query(50, ge=1, le=500),
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
):
    logs = state["logs"]
    if not logs:
        return {"logs": [], "total": 0, "page": page, "pages": 0}

    # Filter
    filtered = logs
    if search:
        s = search.lower()
        filtered = [l for l in filtered if s in l["block_id"].lower() or s in l["preview"].lower()]
    if status and status.lower() != "all":
        target = "Anomaly" if status.lower() == "anomaly" else "Normal"
        filtered = [l for l in filtered if l["label"] == target]

    total  = len(filtered)
    pages  = math.ceil(total / limit)
    start  = (page - 1) * limit
    end    = start + limit
    chunk  = filtered[start:end]

    return {
        "logs":  chunk,
        "total": total,
        "page":  page,
        "pages": pages,
    }


@app.get("/api/dashboard")
def get_dashboard():
    logs = state["logs"]
    if not logs:
        return {}

    total    = len(logs)
    anomalies = sum(1 for l in logs if l["label"] == "Anomaly")
    rate     = round(anomalies / total * 100, 2)

    # Sparkline: anomaly counts across 8 time-buckets
    bucket_size = max(1, total // 8)
    sparkline   = []
    for i in range(8):
        start  = i * bucket_size
        end    = min(start + bucket_size, total)
        bucket = logs[start:end]
        count  = sum(1 for l in bucket if l["label"] == "Anomaly")
        sparkline.append({"value": count})

    # Recent alerts: last 10 anomalies
    anomaly_logs = [l for l in logs if l["label"] == "Anomaly"][-10:]
    recent_alerts = [
        {
            "id":         f"ALT-{i+100}",
            "time":       "Real-time",
            "source":     "HDFS",
            "attack":     "HDFS Anomaly",
            "severity":   "critical" if l["confidence"] > 85 else "warning",
            "confidence": l["confidence"],
            "block_id":   l["block_id"],
        }
        for i, l in enumerate(reversed(anomaly_logs[:4]))
    ]

    return {
        "stats": {
            "totalLogsAnalyzed": f"{total:,}",
            "anomaliesDetected": f"{anomalies:,}",
            "activeAlerts":      str(min(anomalies, 99)),
            "modelAccuracy":     f"{state['metrics'].get('accuracy', 0):.1f}%",
        },
        "pipelineStatus": {
            "hdfs": {
                "lastParsed":  "Live — inference_samples.txt",
                "anomalyRate": f"{rate:.2f}%",
                "sparkline":   sparkline,
            },
            "network": {
                "lastParsed":  "Model not ready",
                "anomalyRate": "N/A",
                "sparkline":   [{"value": 0}] * 8,
            }
        },
        "anomalyData": [
            {"time": f"{i*4:02d}:00",
             "system": sum(1 for l in logs[i*bucket_size:(i+1)*bucket_size] if l["label"] == "Anomaly"),
             "network": 0}
            for i in range(7)
        ],
        "recentAlerts": recent_alerts,
    }


@app.post("/api/analyze")
def analyze_log(req: AnalyzeRequest):
    model = state["model"]
    vocab = state["vocab"]
    if model is None or vocab is None:
        raise HTTPException(status_code=503, detail="Model not loaded yet")

    tokens = parse_raw_log_to_tokens(req.raw_log, vocab)
    if not tokens:
        raise HTTPException(status_code=400, detail="No parseable log lines found")

    label, confidence = predict_session(tokens, model, vocab)

    return {
        "success":    True,
        "prediction": label,
        "confidence": confidence,
        "tokens":     tokens,
        "message":    f"Analyzed {len(tokens)} log event(s) using LSTM model.",
    }


@app.get("/api/model/system")
def get_system_model_metrics():
    m = state["metrics"]
    if not m:
        raise HTTPException(status_code=503, detail="Metrics not computed yet")

    return {
        "metrics": [
            {"label": "Precision", "val": f"{m['precision']:.1f}%",
             "trend": "+real", "up": True},
            {"label": "Recall",    "val": f"{m['recall']:.1f}%",
             "trend": "+real", "up": True},
            {"label": "F1-Score",  "val": f"{m['f1']:.1f}%",
             "trend": "+real", "up": True},
        ],
        "confusionMatrix": {
            "TP": m["TP"], "TN": m["TN"], "FP": m["FP"], "FN": m["FN"]
        },
        "auc":       m["auc"],
        "rocData":   m["roc_data"],
        "driftData": m["drift_data"],
        "featureImportance": [
            {"feature": "PacketResponder",    "value": 0.82},
            {"feature": "ReceivingBlock",     "value": 0.76},
            {"feature": "AddStoredBlock",     "value": 0.61},
            {"feature": "Exception",          "value": 0.59},
            {"feature": "AllocateBlock",      "value": 0.52},
            {"feature": "ReceivedBlock",      "value": 0.44},
            {"feature": "DataXceiver",        "value": 0.38},
            {"feature": "PacketResponder_term","value": 0.31},
        ],
    }
