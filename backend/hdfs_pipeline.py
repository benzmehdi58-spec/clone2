import os
import re
import joblib
import numpy as np
import pandas as pd
from typing import Tuple, List, Dict
from collections import defaultdict

# ─── Event template patterns — ordered most-specific first ────────────
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
ENTRY_RE = re.compile(r'(?=\d{6}\s\d{6}\s\d+\s)')
MAX_SEQ_LEN = 50

class HDFSPipeline:
    def __init__(self, model_path: str, vocab_path: str):
        print("[HDFS] Loading model and vocabulary...")
        # Try loading Keras model first, fallback to joblib (for rf_model)
        try:
            from tensorflow.keras.models import load_model
            self.is_keras = True
            
            # FocalLoss shim needed for Keras models
            import tensorflow as tf
            class _FocalLoss(tf.keras.losses.Loss):
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

            self.model = load_model(model_path, custom_objects={"FocalLoss": _FocalLoss})
        except Exception as e:
            print(f"[HDFS] Falling back to joblib for model load: {e}")
            self.is_keras = False
            self.model = joblib.load(model_path)
            
        self.vocab = joblib.load(vocab_path)
        print(f"[HDFS] Model loaded. Vocab size: {len(self.vocab)}")

    def parse_event(self, line: str) -> str:
        """Map a raw log line to the exact vocab key (Drain template string)."""
        for pattern, template in PATTERNS:
            if pattern.search(line):
                if template in self.vocab:
                    return template
        return '<UNK>'

    def parse_raw_log_to_tokens(self, raw: str) -> List[str]:
        """Parse a multi-line raw log text into event tokens matching the vocab."""
        parts = ENTRY_RE.split(raw)
        if len(parts) <= 1:
            parts = raw.strip().split('\n')
        return [self.parse_event(p.strip()) for p in parts if p.strip()]

    def encode_and_pad(self, tokens: List[str]) -> np.ndarray:
        if self.is_keras:
            from tensorflow.keras.preprocessing.sequence import pad_sequences
            seq = [self.vocab.get(t, 0) for t in tokens]
            return pad_sequences([seq], maxlen=MAX_SEQ_LEN, padding='post', truncating='post')
        else:
            indices = [self.vocab.get(t, 0) for t in tokens]
            vec = np.bincount(indices, minlength=len(self.vocab)).astype(float)
            return vec.reshape(1, -1)

    def predict_session(self, tokens: List[str]) -> Tuple[str, float]:
        """Run model on a list of event tokens. Returns (label, confidence 0-100)."""
        padded = self.encode_and_pad(tokens)
        
        if self.is_keras:
            # Assuming output shape (1, max_len, num_classes) or (1, num_classes)
            # Standard anomaly detection output for Keras LSTM
            preds = self.model.predict(padded, verbose=0)
            if len(preds.shape) == 3:
                # take last time step
                preds = preds[:, -1, :]
            prob = float(preds[0][-1]) # Assuming last class is anomaly, or binary crossentropy
            # Or if it's binary scalar output:
            if preds.shape[-1] == 1:
                prob = float(preds[0][0])
            elif preds.shape[-1] >= 2:
                prob = float(preds[0][1]) # Assuming index 1 is Anomaly
        else:
            prob = float(self.model.predict_proba(padded)[0][1])
            
        label = "Anomaly" if prob >= 0.5 else "Normal"
        confidence = round((prob if prob >= 0.5 else 1.0 - prob) * 100, 1)
        return label, confidence

    def run_batch_inference(self, samples_path: str, labels_path: str) -> Tuple[List[Dict], Dict]:
        print("[HDFS] Parsing inference_samples.txt ...")
        block_lines: Dict[str, List[str]] = defaultdict(list)
        try:
            with open(samples_path, "r", encoding="utf-8", errors="ignore") as f:
                raw = f.read()
            entries = ENTRY_RE.split(raw)
            for entry in entries:
                entry = entry.strip()
                if not entry: continue
                match = BLOCK_RE.search(entry)
                if match:
                    block_id = match.group(1)
                    block_lines[block_id].append(entry)
        except FileNotFoundError:
            print("[HDFS] No inference_samples.txt found.")
            return [], {}

        print(f"[HDFS] Found {len(block_lines)} unique block sessions")
        
        try:
            labels_df = pd.read_csv(labels_path)
            label_map = dict(zip(labels_df["block_id"], labels_df["Label"]))
        except Exception:
            label_map = {}

        logs = []
        y_true, y_pred = [], []
        block_ids = list(block_lines.keys())
        
        if not block_ids:
            return [], {}
            
        # Batch predict
        all_tokens = [[self.parse_event(line) for line in block_lines[bid]] for bid in block_ids]
        
        if self.is_keras:
            from tensorflow.keras.preprocessing.sequence import pad_sequences
            seqs = [[self.vocab.get(t, 0) for t in toks] for toks in all_tokens]
            X_batch = pad_sequences(seqs, maxlen=MAX_SEQ_LEN, padding='post', truncating='post')
            preds = self.model.predict(X_batch, batch_size=512, verbose=1)
            if len(preds.shape) == 3:
                preds = preds[:, -1, :]
            if preds.shape[-1] == 1:
                probs = preds.flatten()
            else:
                probs = preds[:, 1]
        else:
            all_seqs = [self.encode_and_pad(toks)[0] for toks in all_tokens]
            X_batch = np.vstack(all_seqs)
            probs = self.model.predict_proba(X_batch)[:, 1]

        import time
        for i, bid in enumerate(block_ids):
            prob = float(probs[i])
            label = "Anomaly" if prob >= 0.5 else "Normal"
            conf = round((prob if prob >= 0.5 else 1.0 - prob) * 100, 1)
            truth = label_map.get(bid, "Normal")
            
            raw_preview = block_lines[bid][0] if block_lines[bid] else ""
            
            # Format to match common log schema used in the app
            alert = {
                "id": f"HDFS-{bid}",
                "block_id": bid,
                "source": "HDFS",
                "label": label,
                "verdict": "ATTACK" if label == "Anomaly" else "BENIGN",
                "attack_type": "hdfs_anomaly" if label == "Anomaly" else None,
                "confidence": conf,
                "truth": truth,
                "raw": "\n".join(block_lines[bid][:5]),
                "preview": raw_preview[:120],
                "event_count": len(block_lines[bid]),
                "time": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                "title": "HDFS System Anomaly" if label == "Anomaly" else "HDFS Block Normal",
                "reason": "Anomalous sequence of events in HDFS block" if label == "Anomaly" else "",
            }
            logs.append(alert)
            
            y_true.append(1 if truth == "Anomaly" else 0)
            y_pred.append(1 if label == "Anomaly" else 0)

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

        # ROC curve
        thresholds = np.linspace(0, 1, 10)
        roc_data = []
        for t in thresholds:
            preds_t = (probs >= t).astype(int)
            tp_t = int(np.sum((preds_t == 1) & (y_true_arr == 1)))
            fp_t = int(np.sum((preds_t == 1) & (y_true_arr == 0)))
            fn_t = int(np.sum((preds_t == 0) & (y_true_arr == 1)))
            tn_t = int(np.sum((preds_t == 0) & (y_true_arr == 0)))
            tpr  = round(tp_t / (tp_t + fn_t + 1e-9), 4)
            fpr  = round(fp_t / (fp_t + tn_t + 1e-9), 4)
            roc_data.append({"fpr": fpr, "tpr": tpr})
        roc_data.sort(key=lambda x: x["fpr"])
        auc = round(float(np.trapz([p["tpr"] for p in roc_data], [p["fpr"] for p in roc_data])), 3)

        # Drift data (mock 30 day)
        np.random.seed(42)
        drift_data = []
        chunk_size = max(1, len(y_true) // 30)
        for day in range(30):
            start = day * chunk_size
            end   = min(start + chunk_size, len(y_true))
            if start >= len(y_true): break
            acc = round(float(np.mean(y_true_arr[start:end] == y_pred_arr[start:end])) * 100, 2)
            drift_data.append({"day": f"Day {day + 1}", "accuracy": acc})

        metrics = {
            "total": len(y_true),
            "precision": precision,
            "recall": recall,
            "f1": f1,
            "accuracy": accuracy,
            "TP": TP, "TN": TN, "FP": FP, "FN": FN,
            "auc": auc,
            "roc_data": roc_data,
            "drift_data": drift_data,
        }
        
        print(f"[HDFS Metrics] Acc: {accuracy}% F1: {f1}% (TP:{TP} TN:{TN} FP:{FP} FN:{FN})")
        return logs, metrics
