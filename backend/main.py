"""
CyberAI FastAPI Backend
Loads:
  - HDFS LSTM (system logs)
  - Three-Stage Network pipeline (LightGBM + XGBoost + Autoencoder)
  - Model A: SSH Auth Log Detector (CNN + BiLSTM + Attention)
  - Model B: UEBA Insider Threat Detector (MultiScale CNN + BiLSTM + 8-Head Attention)
at startup and serves real predictions + pre-computed 3% inference results.
"""

import os
import re
import math
import joblib
import asyncio
import numpy as np
import pandas as pd
from pathlib import Path
from typing import Optional
from contextlib import asynccontextmanager
from collections import defaultdict

os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"
import tensorflow as tf
from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing.sequence import pad_sequences
# Network pipeline (imported lazily to avoid torch startup noise before TF)
try:
    from network_pipeline import ThreeStagePipeline
    _NET_PIPELINE_AVAILABLE = True
except Exception as _net_err:
    _NET_PIPELINE_AVAILABLE = False
    print(f"[WARN] network_pipeline import failed: {_net_err}")

from mitre_mapper import MITREMapper
mitre_mapper = MITREMapper()

from fastapi import FastAPI, Query, HTTPException, BackgroundTasks, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import database
# ─── Paths ──────────────────────────────────────────────────────────────────
_HERE    = Path(__file__).parent          # /app in Docker | .../backend locally
_ROOT    = _HERE.parent                   # /   in Docker  | project root locally

# Smart model finder: prefer backend/models/ (Docker), fall back to root/models/ (local dev)
_MODELS_DIR  = _HERE / "models" if (_HERE / "models").exists() else _ROOT / "models"
_DATA_DIR    = _HERE / "data"   if (_HERE / "data").exists()   else _ROOT / "data"

BASE_DIR     = _ROOT
MODEL_PATH   = _MODELS_DIR / "lstm_final.keras"
VOCAB_PATH   = _MODELS_DIR / "vocab.pkl"
SAMPLES_PATH = _DATA_DIR   / "inference_samples.txt"
LABELS_PATH  = _DATA_DIR   / "inference_labels.csv"

# ─── Model A — SSH Auth Log Detector paths ─────────────────────────────
SSH_MODEL_PATH    = _MODELS_DIR / "ssh_model.keras"
SSH_VOCAB_PATH    = _MODELS_DIR / "ssh_vocab.pkl"
SSH_LE_PATH       = _MODELS_DIR / "ssh_label_encoder.pkl"
SSH_RESULTS_PATH  = _DATA_DIR   / "ssh_inference_results.json"
SSH_MAX_SEQ_LEN   = 128

# ─── Model B — UEBA Insider Threat Detector paths ───────────────────────
UEBA_MODEL_PATH   = _MODELS_DIR / "ueba_model.keras"
UEBA_LE_PATH      = _MODELS_DIR / "ueba_label_encoder.pkl"
UEBA_SCALER_PATH  = _MODELS_DIR / "ueba_scaler.pkl"
UEBA_FEAT_PATH    = _MODELS_DIR / "ueba_feature_cols.pkl"
UEBA_RESULTS_PATH = _DATA_DIR   / "ueba_inference_results.json"
UEBA_WINDOW_SIZE  = 7

# ─── Hyperparameters (match notebook exactly) ───────────────────────────────
MAX_SEQ_LEN = 50

# ─── FocalLoss shim (needed by load_model for both SSH and UEBA Keras models) ───
if tf is not None:
    class _FocalLoss(tf.keras.losses.Loss):
        """FocalLoss used during SSH and UEBA training. Required for load_model()."""
        def __init__(self, alpha=0.25, gamma=2.0, **kwargs):
            super().__init__(**kwargs)
            self.alpha = alpha
            self.gamma = gamma
        def call(self, y_true, y_pred):
            y_true = tf.cast(tf.squeeze(y_true), tf.int32)
            y_pred = tf.cast(tf.clip_by_value(y_pred, 1e-7, 1.0), tf.float32)
            y_oh   = tf.one_hot(y_true, depth=tf.shape(y_pred)[-1], dtype=tf.float32)
            p_t    = tf.reduce_sum(y_oh * y_pred, axis=-1)
            return tf.reduce_mean(self.alpha * tf.pow(1.0 - p_t, self.gamma) * (-tf.math.log(p_t)))
        def get_config(self):
            cfg = super().get_config()
            cfg.update({'alpha': self.alpha, 'gamma': self.gamma})
            return cfg
else:
    class _FocalLoss:
        pass


BLOCK_RE = re.compile(r'(blk_-?\d+)')

# ─── Global state (populated at startup) ────────────────────────────────────
state: dict = {
    "logs":          [],    # unified log explorer — all sources feed into here
    "metrics":       {},
    # ─ Network ────────────────────────────────────────
    "net_pipeline":  None,
    "net_metrics":   {},
    "net_logs":      [],
    # ─ Shared ───────────────────────────────────────────────
    "incidents":     {},
    "alert_buffer":  [],    # high-confidence alerts for correlation engine
    "net_simulator":  None,
    "ssh_simulator": None,
    "ueba_simulator": None,
    "hdfs_simulator": None,
    "net_stop_event":  None,
    "ssh_stop_event": None,
    "ueba_stop_event": None,
    "hdfs_stop_event": None,
    # ─ System (HDFS) ──────────────────────────────────────────────
    "hdfs_pipeline": None,
    "hdfs_logs":     [],
    "hdfs_metrics":  {},
    # ─ Model A: SSH Auth Log Detector ─────────────────────────────
    "ssh_model":     None,   # Keras CNN-BiLSTM (optional — for live inference)
    "ssh_vocab":     None,   # {template_str: int_index}
    "ssh_le":        None,   # LabelEncoder: bruteforce, invalid_user_scan, normal
    "ssh_logs":      [],     # rolling buffer
    "ssh_metrics":   {},     # accuracy stats from 3% holdout JSON
    # ─ Model B: UEBA Insider Threat Detector ─────────────────────
    "ueba_model":    None,   # Keras MultiScale CNN-BiLSTM (optional)
    "ueba_le":       None,   # LabelEncoder: insider_threat, normal
    "ueba_scaler":   None,   # StandardScaler fitted on training data
    "ueba_feat":     None,   # list[str] of 26 feature names (order matters)
    "ueba_logs":     [],     # rolling buffer
    "ueba_metrics":  {},     # accuracy stats from 3% holdout JSON
}


# ─── Startup: load models + pre-process all inference data ───────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize SQLite database explicitly on startup
    database.init_db()

    print("=========================================================================")
    print("INFO: Loading heavy machine learning models... This may take 15-30 seconds!")
    print("INFO: Please do not press Ctrl+C, the server is NOT frozen.")
    print("=========================================================================")
    print("[*] Loading HDFS model alongside Network, SSH, and UEBA.")

    # ─── HDFS Pipeline ────────────────────────────────────────────────────────
    try:
        from hdfs_pipeline import HDFSPipeline
        hdfs_pipeline = HDFSPipeline(str(MODEL_PATH), str(VOCAB_PATH))
        state["hdfs_pipeline"] = hdfs_pipeline
        hdfs_logs, hdfs_metrics = hdfs_pipeline.run_batch_inference(str(SAMPLES_PATH), str(LABELS_PATH))
        for _r in hdfs_logs:
            if _r.get("verdict") == "ATTACK":
                database.save_alert(_r)
                state["alert_buffer"].append(_r)
        state["hdfs_logs"] = hdfs_logs
        state["hdfs_metrics"] = hdfs_metrics
        state["logs"].extend(hdfs_logs)
        print("[OK] HDFS Pipeline loaded successfully.")
    except Exception as e:
        print(f"[HDFS] ERROR loading HDFS pipeline: {e}")

    # ─── Network pipeline ────────────────────────────────────────────────────
    if _NET_PIPELINE_AVAILABLE:
        try:
            net = ThreeStagePipeline()
            state["net_pipeline"] = net
            state["net_metrics"]  = net.smoke_test()
            if "logs_sample" in state["net_metrics"]:
                _net_sample = state["net_metrics"]["logs_sample"]
                import time as _time_mod
                for _l in _net_sample:
                    _l.setdefault("id", _l.get("block_id", f"NET-{id(_l)}"))
                    _l.setdefault("source", "Network")
                    _l.setdefault("time", _time_mod.strftime("%Y-%m-%dT%H:%M:%SZ", _time_mod.gmtime()))
                    _l.setdefault("title", _l.get("preview", "Network Flow"))
                    _l.setdefault("reason", _l.get("preview", ""))
                    _l.setdefault("confidence", _l.get("confidence", 0.0))
                # Append network logs so they appear in /api/logs
                state["logs"].extend(_net_sample)
                # Remove from metrics dict to save memory
                del state["net_metrics"]["logs_sample"]
        except Exception as e:
            print(f"[NET] ERROR loading network pipeline: {e}")
    else:
        print("[NET] Skipping network pipeline (import unavailable)")

    # ─── Background Tasks (Correlation & Honeypot) ───────────────────────────
    import asyncio
    try:
        from correlation_engine import correlation_loop
        asyncio.create_task(correlation_loop(state))
    except Exception as e:
        print(f"[WARN] Failed to start correlation engine: {e}")

    try:
        from honeypot_parser import tail_honeypot
        asyncio.create_task(tail_honeypot(state))
    except Exception as e:
        print(f"[WARN] Failed to start honeypot tailer: {e}")

    # After rag_manager initialization
    try:
        from rag_manager import rag_manager as _rag_manager
        from rag_analyzer import RAGAnalyzer
        rag_analyzer = RAGAnalyzer(_rag_manager)
        app.state.rag_analyzer = rag_analyzer
    except Exception as e:
        app.state.rag_analyzer = None
        print(f"[RAGAnalyzer] Not available: {e}")

    try:
        from simulators import NetworkScenarioSimulator, SSHReplayEngine, UEBAReplayEngine, HDFSReplayEngine
        state["net_simulator"] = NetworkScenarioSimulator()
        state["ssh_simulator"] = SSHReplayEngine(str(BASE_DIR / "data" / "ssh_inference_samples.txt"))
        state["ueba_simulator"] = UEBAReplayEngine(str(BASE_DIR / "data" / "ueba_inference_results.json"))
        state["hdfs_simulator"] = HDFSReplayEngine(state.get("hdfs_logs", []))
        state["net_stop_event"] = asyncio.Event()
        state["ssh_stop_event"] = asyncio.Event()
        state["ueba_stop_event"] = asyncio.Event()
        state["hdfs_stop_event"] = asyncio.Event()
    except Exception as e:
        print(f"[Simulators] Not available: {e}")

    # ─── Model A: SSH Auth Log — load pre-computed 3% inference results ───────
    import json as _json
    try:
        with open(SSH_RESULTS_PATH, "r", encoding="utf-8") as _f:
            _ssh_results = _json.load(_f)
        import time as _time_ssh
        for _r in _ssh_results:
            _r.setdefault("source",      "SSH")
            _r.setdefault("id", _r.get("block_id", "AUTH-" + _r.get("src_ip", "")))
            _r["block_id"] = _r["id"]
            _r.setdefault("event_count", 1)
            _r.setdefault("label",  "Anomaly" if _r.get("verdict") == "ATTACK" else "Normal")
            _r.setdefault("time",   _time_ssh.strftime("%Y-%m-%dT%H:%M:%SZ", _time_ssh.gmtime()))
            _r.setdefault("title",  _r.get("preview", "SSH Session"))
            _r.setdefault("reason", _r.get("preview", ""))
            _r["timestamp_epoch"] = _time_ssh.time()
            if _r.get("verdict") == "ATTACK":
                database.save_alert(_r)
        state["ssh_logs"] = _ssh_results
        state["logs"].extend(_ssh_results)
        _n     = len(_ssh_results)
        _atk   = sum(1 for r in _ssh_results if r.get("verdict") == "ATTACK")
        _corr  = sum(1 for r in _ssh_results if r.get("is_correct", True))
        state["ssh_metrics"] = {
            "total":    _n,
            "attacks":  _atk,
            "normals":  _n - _atk,
            "accuracy": round(_corr / _n * 100, 2) if _n else 0,
        }
        print(f"[OK] SSH inference results loaded: {_n} sessions  (attacks={_atk})")
    except FileNotFoundError:
        print(f"[INFO] ssh_inference_results.json not found — drop into backend/data/ when ready")
    except Exception as _e:
        print(f"[WARN] SSH results load error: {_e}")

    # Optional: load SSH Keras model for live /predict/auth
    try:
        _ssh_model = load_model(str(SSH_MODEL_PATH), custom_objects={"FocalLoss": _FocalLoss})
        _ssh_vocab = joblib.load(str(SSH_VOCAB_PATH))
        _ssh_le    = joblib.load(str(SSH_LE_PATH))
        state["ssh_model"] = _ssh_model
        state["ssh_vocab"] = _ssh_vocab
        state["ssh_le"]    = _ssh_le
        print(f"[OK] SSH Keras model loaded.  Classes: {list(_ssh_le.classes_)}")
    except FileNotFoundError:
        print("[INFO] SSH Keras model files not found — live /predict/auth will return 503")
    except Exception as _e:
        print(f"[WARN] SSH Keras model load error: {_e}")

    # ─── Model B: UEBA Insider Threat — load pre-computed 3% inference results ─
    try:
        with open(UEBA_RESULTS_PATH, "r", encoding="utf-8") as _f:
            _ueba_results = _json.load(_f)
        import time as _time_ueba
        for _r in _ueba_results:
            _r.setdefault("source", "UEBA")
            _r.setdefault("id", _r.get("block_id", "UEBA-" + _r.get("user_id", "")))
            _r["block_id"] = _r["id"]
            if _r.get("verdict") == "THREAT":
                _r["verdict"] = "ATTACK"
            elif _r.get("verdict") in ("NORMAL", None):
                _r["verdict"] = "BENIGN"
            _r.setdefault("label", "Anomaly" if _r.get("verdict") == "ATTACK" else "Normal")
            _r.setdefault("event_count", UEBA_WINDOW_SIZE)
            _r.setdefault("time",  _time_ueba.strftime("%Y-%m-%dT%H:%M:%SZ", _time_ueba.gmtime()))
            _r.setdefault("title", _r.get("preview", "UEBA Window"))
            _r.setdefault("reason", _r.get("preview", ""))
            _r["timestamp_epoch"] = _time_ueba.time()
            if _r.get("verdict") == "ATTACK":
                database.save_alert(_r)
        state["ueba_logs"] = _ueba_results
        state["logs"].extend(_ueba_results)
        _n      = len(_ueba_results)
        _threat = sum(1 for r in _ueba_results if r.get("verdict") == "ATTACK")
        _corr   = sum(1 for r in _ueba_results if r.get("is_correct", True))
        state["ueba_metrics"] = {
            "total":   _n,
            "threats": _threat,
            "normals": _n - _threat,
            "accuracy": round(_corr / _n * 100, 2) if _n else 0,
        }
        print(f"[OK] UEBA inference results loaded: {_n} windows  (threats={_threat})")
    except FileNotFoundError:
        print(f"[INFO] ueba_inference_results.json not found — drop into backend/data/ when ready")
    except Exception as _e:
        print(f"[WARN] UEBA results load error: {_e}")

    # Optional: load UEBA Keras model for live /predict/ueba
    try:
        _ueba_model  = load_model(str(UEBA_MODEL_PATH), custom_objects={"FocalLoss": _FocalLoss})
        _ueba_le     = joblib.load(str(UEBA_LE_PATH))
        _ueba_scaler = joblib.load(str(UEBA_SCALER_PATH))
        _ueba_feat   = joblib.load(str(UEBA_FEAT_PATH))
        state["ueba_model"]  = _ueba_model
        state["ueba_le"]     = _ueba_le
        state["ueba_scaler"] = _ueba_scaler
        state["ueba_feat"]   = _ueba_feat
        print(f"[OK] UEBA Keras model loaded.  Features: {len(_ueba_feat)}, Classes: {list(_ueba_le.classes_)}")
    except FileNotFoundError:
        print("[INFO] UEBA Keras model files not found — live /predict/ueba will return 503")
    except Exception as _e:
        print(f"[WARN] UEBA Keras model load error: {_e}")

    # ── Auto-start all simulators so data flows immediately on connect ────────
    async def _auto_start_simulators():
        """Wait 3 s for the app to fully bind, then start all replay engines."""
        await asyncio.sleep(3)

        # ── SSH ──────────────────────────────────────────────────────────────
        ssh_sim = state.get("ssh_simulator")
        ssh_evt = state.get("ssh_stop_event")
        if ssh_sim and ssh_evt and not ssh_sim.active:
            async def _ssh_cb(ip, session_log):
                import time as _t
                alert = {
                    "id":          f"SSH-SIM-{int(_t.time()*1000)}",
                    "source":      "SSH",
                    "time":        _t.strftime("%Y-%m-%dT%H:%M:%SZ", _t.gmtime()),
                    "src_ip":      ip or "unknown",
                    "verdict":     "BENIGN",
                    "confidence":  50.0,
                    "title":       f"SSH session from {ip}",
                    "reason":      f"SSH session replay — {len(session_log.splitlines())} log lines",
                    "preview":     f"SSH session from {ip}",
                    "raw":         session_log[:300],
                }
                lower = session_log.lower()
                if any(k in lower for k in ("failed password", "invalid user", "authentication failure")):
                    alert["verdict"]     = "ATTACK"
                    alert["attack_type"] = "brute_force"
                    alert["confidence"]  = 92.0
                    alert["label"]       = "Anomaly"
                else:
                    alert["label"] = "Normal"
                alert["block_id"] = alert["id"]
                state["ssh_logs"].append(alert)
                state["ssh_logs"] = state["ssh_logs"][-500:]
                state["logs"].append(alert)
                await manager.broadcast(alert)
                if alert["verdict"] == "ATTACK":
                    database.save_alert(alert)

            asyncio.ensure_future(ssh_sim.start(_ssh_cb, ssh_evt))
            print("[AutoSim] SSH replay started automatically")

        # ── UEBA ─────────────────────────────────────────────────────────────
        ueba_sim = state.get("ueba_simulator")
        ueba_evt = state.get("ueba_stop_event")
        if ueba_sim and ueba_evt and not ueba_sim.active:
            async def _ueba_cb(alert):
                import time as _t
                alert = dict(alert)
                alert["time"]      = _t.strftime("%Y-%m-%dT%H:%M:%SZ", _t.gmtime())
                alert["id"]        = f"UEBA-SIM-{int(_t.time()*1000)}"
                alert["block_id"]  = alert["id"]
                alert["source"]    = "insider_threat"
                if alert.get("verdict") in ("NORMAL", None):
                    alert["verdict"] = "BENIGN"
                alert.setdefault("title",  alert.get("preview", "UEBA Activity"))
                alert.setdefault("reason", alert.get("preview", "UEBA behavioral window"))
                state["ueba_logs"].append(alert)
                state["ueba_logs"] = state["ueba_logs"][-500:]
                state["logs"].append(alert)
                await manager.broadcast(alert)

            asyncio.ensure_future(ueba_sim.start(_ueba_cb, ueba_evt))
            print("[AutoSim] UEBA replay started automatically")

        # ── HDFS ─────────────────────────────────────────────────────────────
        hdfs_sim = state.get("hdfs_simulator")
        hdfs_evt = state.get("hdfs_stop_event")
        if hdfs_sim and hdfs_evt and not hdfs_sim.active:
            async def _hdfs_cb(alert):
                import time as _t
                alert = dict(alert)
                state["hdfs_logs"].append(alert)
                state["hdfs_logs"] = state["hdfs_logs"][-500:]
                state["logs"].append(alert)
                await manager.broadcast(alert)
                
                if alert.get("verdict") == "ATTACK":
                    database.save_alert(alert)
                    state["alert_buffer"].append(alert)

            asyncio.ensure_future(hdfs_sim.start(_hdfs_cb, hdfs_evt))
            print("[AutoSim] HDFS replay started automatically")

        # ── Network ──────────────────────────────────────────────────────────
        net_sim = state.get("net_simulator")
        net_evt = state.get("net_stop_event")
        if net_sim and net_evt and not net_sim.active:
            async def _net_cb(flow):
                import time as _t
                import pandas as pd
                try:
                    pipeline = state.get("net_pipeline")
                    if pipeline is None:
                        return
                    # Run inference synchronously (pipeline expects a DataFrame and is not thread-safe)
                    df_in = pd.DataFrame([flow])
                    result_df = pipeline.predict(df_in)
                    result = result_df.to_dict(orient="records")[0]
                    
                    result.setdefault("id",     result.get("block_id", f"NET-SIM-{int(_t.time()*1000)}"))
                    result.setdefault("source", "Network")
                    result["time"]     = _t.strftime("%Y-%m-%dT%H:%M:%SZ", _t.gmtime())
                    result["block_id"] = result["id"]
                    result.setdefault("title",  result.get("preview", "Network Flow"))
                    result.setdefault("reason", result.get("preview", ""))
                    state["net_logs"].append(result)
                    state["net_logs"] = state["net_logs"][-500:]
                    state["logs"].append(result)
                    await manager.broadcast(result)
                    if result.get("verdict") in ("ATTACK", "ZERO_DAY"):
                        database.save_alert(result)
                except Exception as e:
                    import traceback
                    traceback.print_exc()
                    print(f"[AutoSim-Net] {e}")

            asyncio.ensure_future(net_sim.run_scenario("mixed", _net_cb, net_evt, 0.5))
            print("[AutoSim] Network replay started automatically (mixed, 0.5 fps)")

    asyncio.ensure_future(_auto_start_simulators())

    yield
    print("[*] Shutting down.")




# ─── App ──────────────────────────────────────────────────────────────────────

app = FastAPI(title="CyberAI Backend", version="1.0.0", lifespan=lifespan)
app.state.global_state = state

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

from analyst_router import router as analyst_router
app.include_router(analyst_router)

from agent_router import router as agent_router
app.include_router(agent_router)

class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        if "type" not in message and "data" not in message:
            message = {"type": "new_alert", "data": message}

        dead = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                dead.append(connection)
        for d in dead:
            if d in self.active_connections:
                self.active_connections.remove(d)

manager = ConnectionManager()

@app.websocket("/ws/alerts")
async def websocket_alerts(websocket: WebSocket):
    await manager.connect(websocket)

    async def _keepalive():
        """Send a ping every 20 s so proxies/browsers never kill idle connections."""
        try:
            while True:
                await asyncio.sleep(20)
                try:
                    await websocket.send_json({"type": "ping"})
                except Exception:
                    break
        except asyncio.CancelledError:
            pass

    ping_task = asyncio.create_task(_keepalive())
    try:
        while True:
            # Receive frames from client (pong replies or control messages)
            data = await websocket.receive_text()
            # If client sends a pong reply, ignore it silently
    except WebSocketDisconnect:
        pass
    except Exception:
        pass
    finally:
        ping_task.cancel()
        manager.disconnect(websocket)

# ─── Request / Response Models ────────────────────────────────────────────────

class AnalyzeRequest(BaseModel):
    raw_log: str


# ─── Endpoints ───────────────────────────────────────────────────────────────

@app.get("/api/health")
def health():
    return {"status": "ok", "model_loaded": state["net_pipeline"] is not None}


@app.get("/api/logs")
def get_logs(
    page:   int           = Query(1, ge=1),
    limit:  int           = Query(50, ge=1, le=500),
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    source: Optional[str] = Query(None),
):
    logs = state["logs"]
    if not logs:
        return {"logs": [], "total": 0, "page": page, "pages": 0}

    # Filter
    filtered = logs
    if search:
        s = search.lower()
        filtered = [l for l in filtered if s in l.get("block_id", "").lower() or s in l.get("session_key", "").lower() or s in l.get("preview", "").lower()]
    if status and status.lower() != "all":
        s_val = status.upper()
        if s_val in ("ATTACK", "BENIGN", "ZERO_DAY", "THREAT"):
            filtered = [l for l in filtered if l.get("verdict", "").upper() == s_val]
        else:
            target = "Anomaly" if status.lower() == "anomaly" else "Normal"
            filtered = [l for l in filtered if l.get("label") == target]
    if source and source.lower() != "all":
        src_map = {"ssh": "auth_log", "ueba": "insider_threat", "network": "network"}
        target_src = src_map.get(source.lower(), source.lower())
        filtered = [l for l in filtered if l.get("source", "HDFS").lower() == target_src]

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

@app.get("/api/explorer/{alert_id}")
def get_alert_explorer(alert_id: str):
    # Serves the raw log evidence for the frontend Log Explorer
    if alert_id.startswith("UEBA-"):
        user_id = alert_id.split("-", 1)[1] if "-" in alert_id else alert_id
        try:
            import sqlite3
            conn = sqlite3.connect(database.DB_PATH)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute("SELECT date, log_type, activity, filename, email_to, url, content FROM ueba_logs WHERE user = ? LIMIT 150", (user_id,))
            rows = cursor.fetchall()
            conn.close()
            
            result = {"device": [], "email": [], "file": [], "http": [], "logon": []}
            for r in rows:
                row_dict = dict(r)
                ltype = row_dict.pop("log_type")
                if ltype in result:
                    result[ltype].append(row_dict)
            return {"user_id": user_id, "logs": result}
        except Exception as e:
            from fastapi import HTTPException
            raise HTTPException(status_code=500, detail=str(e))
            
    elif alert_id.startswith("AUTH-"):
        ip_address = alert_id.split("-", 1)[1] if "-" in alert_id else alert_id
        try:
            matched_lines = []
            with open(_DATA_DIR / "ssh_inference_samples.txt", "r", encoding="utf-8") as f:
                for line in f:
                    if ip_address in line:
                        matched_lines.append(line.strip())
            return {"ip_address": ip_address, "logs": {"ssh": matched_lines[:100]}}
        except Exception as e:
            from fastapi import HTTPException
            raise HTTPException(status_code=500, detail=str(e))
            
    return {"error": "Explorer not implemented for this source type"}

@app.get("/api/alerts")
def get_alerts(filter: Optional[str] = Query(None)):
    alerts = database.get_alerts(filter)
    
    # Add correlated indicators to titles for UI if present
    for a in alerts:
        payload = a.get("raw_payload", {})
        if "correlated_ids" in payload and payload["correlated_ids"]:
            if not a["title"].startswith("[CORRELATED]"):
                a["title"] = f"[CORRELATED] {a['title']}"
                
    return alerts


@app.get("/api/alerts/{alert_id}")
def get_alert_detail(alert_id: str):
    target = None

    target_db = database.get_alert_by_id(alert_id)
    if target_db and target_db.get("raw_payload"):
        target = target_db["raw_payload"]

    if not target:
        # 1. Net logs (where predict_network stores flows with MITRE)
        for r in state.get("net_logs", []):
            if r.get("id") == alert_id or r.get("block_id") == alert_id:
                target = r
                break

    # 2. Alert buffer fallback
    if not target:
        for a in state.get("alert_buffer", []):
            if a.get("id") == alert_id or a.get("block_id") == alert_id:
                target = a
                break

    # 3. HDFS logs
    if not target:
        for l in state.get("logs", []):
            if l.get("block_id") == alert_id or l.get("id") == alert_id:
                target = l
                break

    if not target:
        raise HTTPException(status_code=404, detail="Alert not found")

        
    confidence = target.get("confidence", 0)
    source = target.get("source", "HDFS")

    # ── Title by source ─────────────────────────────────────────────
    if source == "Network":
        title = "Network Anomaly Detected"
        if "Type: " in target.get("preview", ""):
            try:
                t = target["preview"].split("Type: ")[1].split(" |")[0]
                if t != "ZERO_DAY" and t != "ATTACK":
                    title = f"{t} Attack Detected"
            except Exception:
                pass
    elif source == "auth_log":
        atk = target.get("attack_type", "")
        title = target.get("title") or (
            f"SSH {atk.replace('_', ' ').title()} Detected" if atk else "SSH Auth Anomaly"
        )
    elif source == "insider_threat":
        title = target.get("title") or "Insider Threat Detected"
    else:
        title = "HDFS System Anomaly"

    # ── Feature extraction by source ───────────────────────────────
    features = []
    raw_str = target.get("raw", "")

    if source == "Network":
        lines = raw_str.split("\n")
        for line in lines:
            if ":" in line:
                parts = line.split(":", 1)
                features.append({
                    "name": parts[0].strip(),
                    "value": parts[1].strip(),
                    "isAnomalous": False
                })
        if len(features) > 2:
            features[0]["isAnomalous"] = True
            features[1]["isAnomalous"] = True

    elif source == "auth_log":
        # SSH sessions: show IP, attack type, confidence, event count
        features = [
            {"name": "Source IP",   "value": target.get("src_ip", target.get("session_key", "N/A")),
             "isAnomalous": True},
            {"name": "Attack Type", "value": target.get("attack_type", "normal").replace("_", " ").title(),
             "isAnomalous": target.get("verdict") == "ATTACK"},
            {"name": "Events",      "value": str(target.get("event_count", "?")) + " log entries",
             "isAnomalous": False},
            {"name": "Confidence",  "value": f"{confidence}%",
             "isAnomalous": confidence > 85},
            {"name": "Session Key", "value": target.get("session_key", "N/A"),
             "isAnomalous": False},
        ]

    elif source == "insider_threat":
        # UEBA windows: show user, window, and per-source behavioral summary
        features = [
            {"name": "User ID",      "value": target.get("user_id", target.get("session_key", "N/A")),
             "isAnomalous": True},
            {"name": "Window Start", "value": target.get("window_start", "N/A"), "isAnomalous": False},
            {"name": "Window End",   "value": target.get("window_end",   "N/A"), "isAnomalous": False},
            {"name": "Prediction",   "value": target.get("prediction", "N/A"),
             "isAnomalous": target.get("verdict") == "ATTACK"},
            {"name": "Confidence",   "value": f"{confidence}%", "isAnomalous": confidence > 85},
        ]
        # Append behavioral breakdown if raw preview has info
        preview = target.get("preview", "")
        if "|" in preview:
            for part in preview.split("|")[1:]:
                if ":" in part:
                    k, v = part.split(":", 1)
                    features.append({"name": k.strip(), "value": v.strip(), "isAnomalous": False})

    else:  # HDFS
        lines = raw_str.split("\n")
        for i, line in enumerate(lines[:10]):
            features.append({
                "name": f"Event {i+1}",
                "value": line[:60] + "..." if len(line) > 60 else line,
                "isAnomalous": "Exception" in line or "timeout" in line.lower()
            })

    if "shap_data" in target and target["shap_data"]:
        shapData = target["shap_data"]
    else:
        shapData = [
            {"feature": features[0]["name"] if len(features) > 0 else "Feature 1",
             "value": 0.85, "raw": features[0]["value"] if len(features) > 0 else "High", "type": "positive"},
            {"feature": features[1]["name"] if len(features) > 1 else "Feature 2",
             "value": 0.65, "raw": features[1]["value"] if len(features) > 1 else "Elevated", "type": "positive"},
            {"feature": features[2]["name"] if len(features) > 2 else "Feature 3",
             "value": 0.45, "raw": features[2]["value"] if len(features) > 2 else "Unusual", "type": "positive"},
            {"feature": features[3]["name"] if len(features) > 3 else "Feature 4",
             "value": -0.25, "raw": features[3]["value"] if len(features) > 3 else "Normal", "type": "negative"},
        ]

    # ── UEBA-specific extra fields for the UI ───────────────────────────
    ueba_extra = {}
    if source == "insider_threat":
        ueba_extra = {
            "user_id":      target.get("user_id"),
            "window_start": target.get("window_start"),
            "window_end":   target.get("window_end"),
        }

    return {
        "id":         alert_id,
        "title":      title,
        "source":     source,
        "time":       target.get("time", "Real-time"),
        "severity":   target.get("severity") or ("critical" if confidence > 85 else "warning"),
        "confidence": confidence,
        "explanation": (
            f"Model B (UEBA) flagged user {target.get('user_id')} as a potential insider threat over the "
            f"{target.get('window_start')} – {target.get('window_end')} window. "
            f"Behavioral anomalies detected across logon, device, file, HTTP, and email sources. "
            f"Confidence: {confidence}%."
            if source == "insider_threat" else
            f"Model A (SSH Auth) flagged IP {target.get('src_ip', 'N/A')} as {target.get('attack_type', 'unknown').replace('_',' ')} "
            f"based on a session of {target.get('event_count', '?')} log events. Confidence: {confidence}%."
            if source == "auth_log" else
            f"The AI flagged this {source} log/flow as anomalous. "
            f"It scored {confidence}% on the anomaly prediction model."
        ),
        "shapData":   shapData,
        "features":   features,
        "similarAlerts": [
            {"date": "Recent",    "id": "ALT-SIM-1", "match": "89% Match", "status": "True Positive"},
            {"date": "Past Week", "id": "ALT-SIM-2", "match": "75% Match", "status": "True Positive"},
        ],
        # Raw pipeline fields for the Analyst Agent
        "verdict":       target.get("verdict") or target.get("label", "ATTACK"),
        "prediction":    target.get("prediction", "Anomaly"),
        "attack_type":   target.get("attack_type"),
        "zero_day_flag": target.get("zero_day_flag", False),
        "block_id":      target.get("block_id"),
        "n_events":      target.get("event_count"),
        "mitre":         target.get("mitre", {}),
        **ueba_extra,
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
                "lastParsed":  "Live — CIC-IDS2017 inference set" if state["net_metrics"] else "Model not ready",
                "anomalyRate": f"{100 - state['net_metrics'].get('accuracy', 0):.2f}%" if state["net_metrics"] else "N/A",
                "sparkline":   (
                    [{"value": (state["net_metrics"].get("TP", 0) + state["net_metrics"].get("FP", 0)) // 8}] * 8
                    if state["net_metrics"] else [{"value": 0}] * 8
                ),
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





# ─── Network pipeline endpoints ────────────────────────────────────────────────────

class NetworkFlowItem(BaseModel):
    Protocol: float = Field(alias="Protocol")
    Flow_Duration: float = Field(alias="Flow Duration")
    Total_Fwd_Packets: float = Field(alias="Total Fwd Packets")
    Fwd_Packets_Length_Total: float = Field(alias="Fwd Packets Length Total")
    Fwd_Packet_Length_Max: float = Field(alias="Fwd Packet Length Max")
    Fwd_Packet_Length_Min: float = Field(alias="Fwd Packet Length Min")
    Fwd_Packet_Length_Mean: float = Field(alias="Fwd Packet Length Mean")
    Bwd_Packet_Length_Max: float = Field(alias="Bwd Packet Length Max")
    Bwd_Packet_Length_Min: float = Field(alias="Bwd Packet Length Min")
    Flow_Bytes_per_s: float = Field(alias="Flow Bytes/s")
    Flow_Packets_per_s: float = Field(alias="Flow Packets/s")
    Flow_IAT_Mean: float = Field(alias="Flow IAT Mean")
    Flow_IAT_Std: float = Field(alias="Flow IAT Std")
    Flow_IAT_Max: float = Field(alias="Flow IAT Max")
    Flow_IAT_Min: float = Field(alias="Flow IAT Min")
    Fwd_IAT_Mean: float = Field(alias="Fwd IAT Mean")
    Fwd_IAT_Std: float = Field(alias="Fwd IAT Std")
    Fwd_IAT_Min: float = Field(alias="Fwd IAT Min")
    Bwd_IAT_Total: float = Field(alias="Bwd IAT Total")
    Bwd_IAT_Mean: float = Field(alias="Bwd IAT Mean")
    Bwd_IAT_Std: float = Field(alias="Bwd IAT Std")
    Bwd_IAT_Max: float = Field(alias="Bwd IAT Max")
    Bwd_IAT_Min: float = Field(alias="Bwd IAT Min")
    Fwd_PSH_Flags: float = Field(alias="Fwd PSH Flags")
    Fwd_URG_Flags: float = Field(alias="Fwd URG Flags")
    Fwd_Header_Length: float = Field(alias="Fwd Header Length")
    Bwd_Header_Length: float = Field(alias="Bwd Header Length")
    Bwd_Packets_per_s: float = Field(alias="Bwd Packets/s")
    Packet_Length_Min: float = Field(alias="Packet Length Min")
    Packet_Length_Max: float = Field(alias="Packet Length Max")
    Packet_Length_Mean: float = Field(alias="Packet Length Mean")
    Packet_Length_Variance: float = Field(alias="Packet Length Variance")
    FIN_Flag_Count: float = Field(alias="FIN Flag Count")
    RST_Flag_Count: float = Field(alias="RST Flag Count")
    PSH_Flag_Count: float = Field(alias="PSH Flag Count")
    ACK_Flag_Count: float = Field(alias="ACK Flag Count")
    URG_Flag_Count: float = Field(alias="URG Flag Count")
    Down_Up_Ratio: float = Field(alias="Down/Up Ratio")
    Init_Fwd_Win_Bytes: float = Field(alias="Init Fwd Win Bytes")
    Init_Bwd_Win_Bytes: float = Field(alias="Init Bwd Win Bytes")
    Fwd_Act_Data_Packets: float = Field(alias="Fwd Act Data Packets")
    Fwd_Seg_Size_Min: float = Field(alias="Fwd Seg Size Min")
    Active_Mean: float = Field(alias="Active Mean")
    Active_Std: float = Field(alias="Active Std")
    Active_Max: float = Field(alias="Active Max")
    Active_Min: float = Field(alias="Active Min")
    Idle_Std: float = Field(alias="Idle Std")

class NetworkFlowRequest(BaseModel):
    flows: list[NetworkFlowItem]


@app.post("/api/predict/network")
async def predict_network(req: NetworkFlowRequest, background_tasks: BackgroundTasks, request: Request):
    """Run the three-stage pipeline on a batch of network flows."""
    pipe = state["net_pipeline"]
    if pipe is None:
        raise HTTPException(status_code=503, detail="Network pipeline not loaded")
    if not req.flows:
        raise HTTPException(status_code=400, detail="No flows provided")

    df = pd.DataFrame([f.model_dump(by_alias=True) for f in req.flows])
    results = pipe.predict(df).to_dict(orient="records")
    import time as _time
    for i, r in enumerate(results):
        r["id"]     = f"FLOW-{int(_time.time() * 1000) + i}"
        r["source"] = "Network"   # set BEFORE storing in net_logs
        
        # Add missing fields expected by the UI
        r["block_id"] = r["id"]
        r["label"] = "Anomaly" if r.get("verdict") != "BENIGN" else "Normal"
        r["preview"] = f"Network Flow | Type: {r.get('attack_type')}"
        r["event_count"] = 1
        r["time"] = "Real-time"

    # Enrich batch of results with MITRE data
    results = mitre_mapper.enrich_batch(results)
    
    if request.app.state.rag_analyzer:
        results = [
            await asyncio.to_thread(request.app.state.rag_analyzer.analyze, r)
            if r.get("verdict") != "BENIGN" else r
            for r in results
        ]

    state["net_logs"].extend(results)
    state["net_logs"] = state["net_logs"][-500:]  # keep last 500
    state["logs"].extend(results)  # Add to unified logs for the Explorer page

    has_triggered_agent = False
    from agent_router import run_agent
    for result in results:
        asyncio.create_task(manager.broadcast(result))
        
        if result.get("verdict") != "BENIGN" and result.get("prediction") != "Normal":
            confidence = float(result.get("confidence", 0))
            attack_type = result.get("attack_type") or "unknown"
            is_zero_day = result.get("zero_day_flag", False)
            title = "Zero-Day Anomaly" if is_zero_day else f"{attack_type.upper()} Attack Detected"
            
            result["title"] = title
            result["severity"] = "critical" if result.get("verdict") == "ZERO_DAY" or confidence > 85 else "warning"
            result["time"] = "Real-time"
            result["reason"] = f"S1 Prob: {result.get('attack_probability', 0):.2f} | Type: {attack_type}"
            
            database.save_alert(result)
            state["alert_buffer"].append(result)
            
            if not has_triggered_agent:
                background_tasks.add_task(run_agent, trigger_payload=result, app_state=request.app.state)
                has_triggered_agent = True

    return results




# ─── Model A: SSH Auth Log — Live Inference Endpoint ────────────────────

class AuthLogRequest(BaseModel):
    raw_log: str              # multi-line SSH log text
    src_ip:  Optional[str] = None  # extracted from log if not provided


@app.post("/api/predict/auth")
async def predict_auth(req: AuthLogRequest, background_tasks: BackgroundTasks, request: Request):
    """
    Live SSH Auth Log inference via Model A (CNN + BiLSTM + Attention).
    Requires ssh_model.keras + ssh_vocab.pkl + ssh_label_encoder.pkl in models/.
    Falls back gracefully if model is not loaded.
    """
    import time as _time, re as _re

    model = state["ssh_model"]
    vocab = state["ssh_vocab"]
    le    = state["ssh_le"]
    if model is None or vocab is None or le is None:
        raise HTTPException(
            status_code=503,
            detail="SSH model not loaded. Drop ssh_model.keras + ssh_vocab.pkl + ssh_label_encoder.pkl into backend/models/ and restart."
        )

    IP_REGEX = _re.compile(r'\bfrom\s+((?:\d{1,3}\.){3}\d{1,3})\b')
    lines = [l.strip() for l in req.raw_log.strip().split("\n") if l.strip()]

    # Extract source IP
    src_ip = req.src_ip or "UNKNOWN"
    if src_ip == "UNKNOWN":
        for line in lines:
            m = IP_REGEX.search(line)
            if m:
                src_ip = m.group(1)
                break

    # Tokenise using the saved Drain3 vocab
    OOV_IDX = len(vocab)
    event_seq = []
    for line in lines:
        matched = False
        for tmpl, idx in vocab.items():
            if any(word in line for word in tmpl.split() if len(word) > 4):
                event_seq.append(idx)
                matched = True
                break
        if not matched:
            event_seq.append(OOV_IDX)

    padded = pad_sequences(
        [event_seq], maxlen=SSH_MAX_SEQ_LEN, padding="post", truncating="post"
    )

    probs    = model.predict(padded, verbose=0)[0].astype(float)
    pred_idx = int(np.argmax(probs))
    pred_conf = round(float(np.max(probs)) * 100, 2)
    pred_cls  = le.classes_[pred_idx]
    is_attack = pred_cls != "normal"

    alert_id = f"AUTH-{src_ip}-{int(_time.time()*1000)}"
    result = {
        "id":          alert_id,
        "block_id":    alert_id,
        "session_key": src_ip,
        "source":      "auth_log",
        "src_ip":      src_ip,
        "prediction":  pred_cls.replace("_", " ").title(),
        "verdict":     "ATTACK" if is_attack else "BENIGN",
        "attack_type": pred_cls if is_attack else None,
        "confidence":  pred_conf,
        "preview":     f"AUTH | IP: {src_ip} | {len(lines)} events | {pred_cls}",
        "label":       "Anomaly" if is_attack else "Normal",
        "title":       f"SSH {pred_cls.replace('_', ' ').title()} Detected" if is_attack else "Normal SSH Activity",
        "severity":    "critical" if pred_conf > 85 else ("warning" if is_attack else "info"),
        "time":        _time.strftime("%Y-%m-%dT%H:%M:%SZ", _time.gmtime()),
        "event_count": len(lines),
        "timestamp_epoch": _time.time(),
    }

    # Enrich with MITRE
    result = mitre_mapper.enrich(result, {"Dst Port": 22, "Protocol": 6})

    state["ssh_logs"].append(result)
    state["ssh_logs"] = state["ssh_logs"][-500:]
    state["logs"].append(result)

    asyncio.create_task(manager.broadcast(result))

    if is_attack:
        database.save_alert(result)
        state["alert_buffer"].append(result)
        from agent_router import run_agent
        background_tasks.add_task(run_agent, trigger_payload=result, app_state=request.app.state)

    return result


# ─── Model B: UEBA Insider Threat — Live Inference Endpoint ───────────────

class DailyFeatures(BaseModel):
    logon_total:         float = 0.0
    logon_after_h:       float = 0.0
    logon_weekend:       float = 0.0
    logon_unique_pcs:    float = 0.0
    logon_count:         float = 0.0
    logoff_count:        float = 0.0
    device_total:        float = 0.0
    device_after_h:      float = 0.0
    device_weekend:      float = 0.0
    device_connects:     float = 0.0
    file_total:          float = 0.0
    file_after_h:        float = 0.0
    file_weekend:        float = 0.0
    file_unique_names:   float = 0.0
    file_sensitive:      float = 0.0
    http_total:          float = 0.0
    http_after_h:        float = 0.0
    http_weekend:        float = 0.0
    http_unique_domains: float = 0.0
    http_suspicious:     float = 0.0
    email_total:         float = 0.0
    email_after_h:       float = 0.0
    email_weekend:       float = 0.0
    email_attachments:   float = 0.0
    email_avg_size:      float = 0.0
    email_recipients:    float = 0.0


class UEBARequest(BaseModel):
    user_id:        str
    window_start:   str
    window_end:     str
    daily_features: list[DailyFeatures]


@app.post("/api/predict/ueba")
async def predict_ueba(req: UEBARequest, background_tasks: BackgroundTasks, request: Request):
    """
    Live UEBA inference via Model B (MultiScale CNN + BiLSTM + 8-Head Attention).
    Requires ueba_model.keras + ueba_label_encoder.pkl + ueba_scaler.pkl + ueba_feature_cols.pkl.
    """
    import time as _time

    model   = state["ueba_model"]
    le      = state["ueba_le"]
    scaler  = state["ueba_scaler"]
    feat_cols = state["ueba_feat"]

    if model is None or le is None or scaler is None or feat_cols is None:
        raise HTTPException(
            status_code=503,
            detail="UEBA model not loaded. Drop ueba_model.keras + ueba_label_encoder.pkl + ueba_scaler.pkl + ueba_feature_cols.pkl into backend/models/ and restart."
        )
    if len(req.daily_features) != UEBA_WINDOW_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"UEBA requires exactly {UEBA_WINDOW_SIZE} daily feature dicts (got {len(req.daily_features)})."
        )

    # Build (7, 26) matrix
    X = np.array(
        [[getattr(day, f, 0.0) for f in feat_cols] for day in req.daily_features],
        dtype=np.float32
    )
    X = scaler.transform(X)
    X = X.reshape(1, UEBA_WINDOW_SIZE, len(feat_cols))

    probs     = model.predict(X, verbose=0)[0].astype(float)
    pred_idx  = int(np.argmax(probs))
    pred_conf = round(float(np.max(probs)) * 100, 2)
    pred_cls  = le.classes_[pred_idx]
    is_threat = pred_cls == "insider_threat"

    alert_id = f"UEBA-{req.user_id}-{req.window_start}"
    result = {
        "id":           alert_id,
        "block_id":     alert_id,
        "session_key":  req.user_id,
        "source":       "insider_threat",
        "user_id":      req.user_id,
        "window_start": req.window_start,
        "window_end":   req.window_end,
        "prediction":   "Insider Threat" if is_threat else "Normal",
        "verdict":      "ATTACK" if is_threat else "BENIGN",   # normalized
        "attack_type":  "insider_threat" if is_threat else None,
        "confidence":   pred_conf,
        "preview":      f"UEBA | User: {req.user_id} | {req.window_start} - {req.window_end}",
        "label":        "Anomaly" if is_threat else "Normal",
        "title":        "Insider Threat Detected" if is_threat else "Normal User Activity",
        "severity":     "critical" if pred_conf > 85 else ("warning" if is_threat else "info"),
        "time":         req.window_end + "T00:00:00Z",
        "event_count":  UEBA_WINDOW_SIZE,
        "timestamp_epoch": _time.time(),
    }

    # Enrich with MITRE
    result = mitre_mapper.enrich(result, {})

    state["ueba_logs"].append(result)
    state["ueba_logs"] = state["ueba_logs"][-500:]
    state["logs"].append(result)

    asyncio.create_task(manager.broadcast(result))

    if is_threat:
        database.save_alert(result)
        state["alert_buffer"].append(result)
        from agent_router import run_agent
        background_tasks.add_task(run_agent, trigger_payload=result, app_state=request.app.state)

    return result


# ─── Model A metrics endpoint ─────────────────────────────────────────────

@app.get("/api/model/auth")
def get_auth_model_metrics():
    """Return pre-computed metrics from the SSH 3% holdout."""
    m = state["ssh_metrics"]
    if not m:
        m = {"accuracy": 0, "attacks": 0, "total": 0}

    logs = state["ssh_logs"]
    attack_counts = {}
    for r in logs:
        atk = r.get("attack_type") or "normal"
        attack_counts[atk] = attack_counts.get(atk, 0) + 1

    return {
        "model":    "SSH Auth Log Detector (CNN + BiLSTM + Attention)",
        "dataset":  "LogHub SSH (omduggineni/loghub-ssh-log-data)",
        "classes":  ["bruteforce", "invalid_user_scan", "normal"],
        "metrics": [
            {"label": "Accuracy",   "val": f"{m['accuracy']:.1f}%",  "up": True},
            {"label": "Attacks",    "val": str(m['attacks']),         "up": False},
            {"label": "Sessions",   "val": str(m['total']),           "up": True},
        ],
        "attackBreakdown": [
            {"type": k, "count": v}
            for k, v in sorted(attack_counts.items(), key=lambda x: -x[1])
        ],
        "modelLoaded": state["ssh_model"] is not None,
        "totalSessions": m["total"],
    }


# ─── Model B metrics endpoint ─────────────────────────────────────────────

@app.get("/api/model/ueba")
def get_ueba_model_metrics():
    """Return pre-computed metrics from the UEBA 3% holdout."""
    m = state["ueba_metrics"]
    if not m:
        m = {"accuracy": 0, "threats": 0, "total": 0}

    logs = state["ueba_logs"]
    users_flagged = list({r.get("user_id") for r in logs if r.get("verdict") == "ATTACK"})

    return {
        "model":    "UEBA Insider Threat Detector (MultiScale CNN + BiLSTM + 8-Head Attention)",
        "dataset":  "CERT Insider Threat r4.2 (CMU SEI)",
        "classes":  ["insider_threat", "normal"],
        "windowSize": UEBA_WINDOW_SIZE,
        "features": 26,
        "metrics": [
            {"label": "Accuracy",      "val": f"{m['accuracy']:.1f}%", "up": True},
            {"label": "Threats Found", "val": str(m['threats']),        "up": False},
            {"label": "Windows",       "val": str(m['total']),          "up": True},
        ],
        "usersFlagged":  users_flagged[:20],
        "modelLoaded":   state["ueba_model"] is not None,
        "totalWindows":  m["total"],
    }


# ─── Alerts Clear Endpoint ───────────────────────────────────────────────────

@app.delete("/api/alerts/clear")
def clear_alerts():
    database.clear_alerts()
    state["alert_buffer"].clear()
    return {"status": "ok", "message": "Alerts cleared"}

# ─── Simulation Endpoints ────────────────────────────────────────────────────

class NetworkSimRequest(BaseModel):
    scenario: str
    flows_per_second: float = 1.0

@app.post("/api/simulate/network/start")
async def start_network_sim(req: NetworkSimRequest, background_tasks: BackgroundTasks, request: Request):
    sim = state.get("net_simulator")
    if not sim:
        raise HTTPException(status_code=503, detail="Simulator not available")
    
    if sim.active:
        return {"status": "already running"}
        
    state["net_stop_event"].clear()
    
    async def network_callback(flow: dict):
        try:
            flow_req = NetworkFlowRequest(flows=[flow])
            await predict_network(flow_req, background_tasks, request)
        except Exception as e:
            print(f"[Sim] Error sending flow: {e}")

    background_tasks.add_task(sim.run_scenario, req.scenario, network_callback, state["net_stop_event"], req.flows_per_second)
    return {"status": "started", "scenario": req.scenario}

@app.post("/api/simulate/network/stop")
async def stop_network_sim():
    if state.get("net_stop_event"):
        state["net_stop_event"].set()
    return {"status": "stopped"}

@app.get("/api/simulate/network/status")
async def network_sim_status():
    sim = state.get("net_simulator")
    if sim:
        return await sim.get_status()
    return {"active": False}

class SshSimRequest(BaseModel):
    delay_seconds: float = 2.0

@app.post("/api/simulate/ssh/start")
async def start_ssh_sim(req: SshSimRequest, background_tasks: BackgroundTasks, request: Request):
    sim = state.get("ssh_simulator")
    if not sim:
        raise HTTPException(status_code=503, detail="SSH Simulator not available")
        
    if sim.active:
        return {"status": "already running"}
        
    sim.delay_seconds = req.delay_seconds
    state["ssh_stop_event"].clear()
    
    async def ssh_callback(ip: str, session_log: str):
        try:
            auth_req = AuthLogRequest(raw_log=session_log, src_ip=ip)
            await predict_auth(auth_req, background_tasks, request)
        except Exception as e:
            print(f"[Sim] Error sending SSH log: {e}")

    background_tasks.add_task(sim.start, ssh_callback, state["ssh_stop_event"])
    return {"status": "started"}

@app.post("/api/simulate/ssh/stop")
async def stop_ssh_sim():
    if state.get("ssh_stop_event"):
        state["ssh_stop_event"].set()
    return {"status": "stopped"}

@app.get("/api/simulate/ssh/status")
async def ssh_sim_status():
    sim = state.get("ssh_simulator")
    if sim:
        return await sim.get_status()
    return {"active": False}

class UebaSimRequest(BaseModel):
    delay_seconds: float = 3.0

@app.post("/api/simulate/ueba/start")
async def start_ueba_sim(req: UebaSimRequest, background_tasks: BackgroundTasks, request: Request):
    sim = state.get("ueba_simulator")
    if not sim:
        raise HTTPException(status_code=503, detail="UEBA Simulator not available")
        
    if sim.active:
        return {"status": "already running"}
        
    sim.delay_seconds = req.delay_seconds
    state["ueba_stop_event"].clear()
    
    async def ueba_callback(alert: dict):
        import time as _time
        # Normalize fields so the frontend can render them
        alert = dict(alert)
        alert["time"] = _time.strftime("%Y-%m-%dT%H:%M:%SZ", _time.gmtime())
        alert["id"] = f"UEBA-SIM-{int(_time.time()*1000)}"
        alert["block_id"] = alert["id"]
        alert["source"] = "insider_threat"
        # Normalize verdict: NORMAL -> BENIGN so frontend renders consistently
        if alert.get("verdict") in ("NORMAL", None):
            alert["verdict"] = "BENIGN"
        if not alert.get("title"):
            alert["title"] = alert.get("preview", "UEBA Activity")
        if not alert.get("reason"):
            alert["reason"] = alert.get("preview", "UEBA behavioral window")

        state["ueba_logs"].append(alert)
        state["ueba_logs"] = state["ueba_logs"][-500:]
        state["logs"].append(alert)
        # Always broadcast so live simulation shows live feed
        asyncio.create_task(manager.broadcast(alert))

        is_threat = alert.get("verdict") not in ("BENIGN", "NORMAL", None)
        if is_threat:
            database.save_alert(alert)
            state["alert_buffer"].append(alert)
            from agent_router import run_agent
            background_tasks.add_task(run_agent, trigger_payload=alert, app_state=request.app.state)

    background_tasks.add_task(sim.start, ueba_callback, state["ueba_stop_event"])
    return {"status": "started"}

@app.post("/api/simulate/ueba/stop")
async def stop_ueba_sim():
    if state.get("ueba_stop_event"):
        state["ueba_stop_event"].set()
    return {"status": "stopped"}

@app.get("/api/simulate/ueba/status")
async def ueba_sim_status():
    sim = state.get("ueba_simulator")
    if sim:
        return await sim.get_status()
    return {"active": False}

@app.get("/api/simulate/status/all")
async def get_all_sim_status():
    net_sim = state.get("net_simulator")
    ssh_sim = state.get("ssh_simulator")
    ueba_sim = state.get("ueba_simulator")
    hdfs_sim = state.get("hdfs_simulator")
    
    return {
        "network": await net_sim.get_status() if net_sim else {"active": False},
        "ssh": await ssh_sim.get_status() if ssh_sim else {"active": False},
        "ueba": await ueba_sim.get_status() if ueba_sim else {"active": False},
        "hdfs": await hdfs_sim.get_status() if hdfs_sim else {"active": False}
    }

class HdfsSimRequest(BaseModel):
    delay_seconds: float = 3.0

@app.post("/api/simulate/hdfs/start")
async def start_hdfs_sim(req: HdfsSimRequest, background_tasks: BackgroundTasks, request: Request):
    sim = state.get("hdfs_simulator")
    if not sim:
        raise HTTPException(status_code=503, detail="HDFS Simulator not available")
        
    if sim.active:
        return {"status": "already running"}
        
    sim.delay_seconds = req.delay_seconds
    state["hdfs_stop_event"].clear()
    
    async def hdfs_callback(alert: dict):
        import time as _time
        alert = dict(alert)
        state["hdfs_logs"].append(alert)
        state["hdfs_logs"] = state["hdfs_logs"][-500:]
        state["logs"].append(alert)
        asyncio.create_task(manager.broadcast(alert))

        is_threat = alert.get("verdict") == "ATTACK"
        if is_threat:
            database.save_alert(alert)
            state["alert_buffer"].append(alert)
            from agent_router import run_agent
            background_tasks.add_task(run_agent, trigger_payload=alert, app_state=request.app.state)

    background_tasks.add_task(sim.start, hdfs_callback, state["hdfs_stop_event"])
    return {"status": "started"}

@app.post("/api/simulate/hdfs/stop")
async def stop_hdfs_sim():
    if state.get("hdfs_stop_event"):
        state["hdfs_stop_event"].set()
    return {"status": "stopped"}

@app.get("/api/simulate/hdfs/status")
async def hdfs_sim_status():
    sim = state.get("hdfs_simulator")
    if sim:
        return await sim.get_status()
    return {"active": False}




@app.get("/api/model/network")
def get_network_model_metrics():
    """Return pre-computed metrics from the network smoke-test."""
    m = state["net_metrics"]
    if not m:
        raise HTTPException(status_code=503, detail="Network metrics not ready")

    # Verdict distribution sparkline (8 buckets based on attack vs benign ratio)
    total_flows = m.get("total_flows", 1)
    benign_n  = m.get("TN", 0) + m.get("FP", 0)   # predicted benign
    attack_n  = total_flows - benign_n
    sparkline = [{"value": round(attack_n / 8)} for _ in range(8)]

    # Attack type breakdown for bar chart
    atk_counts = m.get("attack_type_counts", {})
    attack_breakdown = [
        {"type": k, "count": v}
        for k, v in sorted(atk_counts.items(), key=lambda x: -x[1])
    ]

    # Verdict distribution
    vc = m.get("verdict_counts", {})
    verdict_dist = [
        {"name": "Benign",   "value": vc.get("BENIGN",   0)},
        {"name": "Attack",   "value": vc.get("ATTACK",   0)},
        {"name": "Zero-Day", "value": vc.get("ZERO_DAY", 0)},
    ]

    return {
        "metrics": [
            {"label": "Precision", "val": f"{m['precision']:.1f}%", "trend": "+real", "up": True},
            {"label": "Recall",    "val": f"{m['recall']:.1f}%",    "trend": "+real", "up": True},
            {"label": "F1-Score",  "val": f"{m['f1']:.1f}%",       "trend": "+real", "up": True},
        ],
        "macroF1"         : m["macro_f1"],
        "confusionMatrix" : {"TP": m["TP"], "TN": m["TN"], "FP": m["FP"], "FN": m["FN"]},
        "auc"             : m["auc"],
        "rocData"         : m["roc_data"],
        "driftData"       : m["drift_data"],
        "featureImportance": m["feat_imp"],
        "verdictDist"     : verdict_dist,
        "attackBreakdown" : attack_breakdown,
        "zeroDay": {
            "rate"      : m["zero_day_rate"],
            "threshold" : m["zero_day_threshold"],
            "count"     : vc.get("ZERO_DAY", 0),
        },
        "attackClasses"   : m["attack_classes"],
        "totalFlows"      : total_flows,
        "s1Threshold"     : m["s1_threshold"],
        "sparkline"       : sparkline,
    }

# ─── Model System (HDFS) metrics endpoint ──────────────────────────────────
@app.get("/api/model/system")
def get_system_model_metrics():
    """Return pre-computed metrics from the HDFS batch inference."""
    m = state.get("hdfs_metrics")
    if not m:
        m = {"accuracy": 0, "TP": 0, "TN": 0, "FP": 0, "FN": 0, "total": 0, "precision": 0, "recall": 0, "f1": 0, "auc": 0}

    logs = state.get("hdfs_logs", [])
    anomalies = sum(1 for l in logs if l.get("verdict") == "ATTACK")

    return {
        "metrics": [
            {"label": "Precision", "val": f"{m.get('precision', 0):.1f}%", "up": True},
            {"label": "Recall",    "val": f"{m.get('recall', 0):.1f}%",    "up": True},
            {"label": "F1-Score",  "val": f"{m.get('f1', 0):.1f}%",       "up": True},
        ],
        "confusionMatrix" : {"TP": m.get("TP", 0), "TN": m.get("TN", 0), "FP": m.get("FP", 0), "FN": m.get("FN", 0)},
        "auc"             : m.get("auc", 0),
        "rocData"         : m.get("roc_data", []),
        "driftData"       : m.get("drift_data", []),
        "modelLoaded"     : state.get("hdfs_pipeline") is not None,
        "totalBlocks"     : m.get("total", 0),
        "anomalies"       : anomalies
    }

try:
    from agent_router import router as agent_router
    app.include_router(agent_router)
except ImportError:
    print("[WARN] agent_router not found, skipping agent routes")

# Force reload

# Force reload 2

# Force reload 3
