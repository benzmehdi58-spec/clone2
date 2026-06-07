import asyncio
import re
import random
import time
from collections import defaultdict
from typing import Callable, AsyncGenerator

import httpx

# ─── SSH Replay Engine ──────────────────────────────────────────────────────────

class SSHReplayEngine:
    def __init__(self, samples_path: str, delay_seconds: float = 2.0):
        self.samples_path = samples_path
        self.delay_seconds = delay_seconds
        self.sessions = []
        self.active = False
        self.sessions_played = 0
        self.current_index = 0
        self._load_samples()

    def _load_samples(self):
        import re
        IP_REGEX = re.compile(r'\bfrom\s+((?:\d{1,3}\.){3}\d{1,3})\b')
        try:
            with open(self.samples_path, "r", encoding="utf-8", errors="ignore") as f:
                raw_lines = f.readlines()
            
            current_ip = None
            current_session = []
            
            for line in raw_lines:
                line = line.strip()
                if not line: continue
                m = IP_REGEX.search(line)
                ip = m.group(1) if m else current_ip
                
                # If IP changed and we have a session, save it
                if ip != current_ip and current_session:
                    self.sessions.append((current_ip, "\n".join(current_session)))
                    current_session = []
                    
                current_ip = ip
                current_session.append(line)
                
            if current_session:
                self.sessions.append((current_ip, "\n".join(current_session)))
                
            print(f"[SSHReplayEngine] Loaded {len(self.sessions)} SSH sessions.")
        except Exception as e:
            print(f"[SSHReplayEngine] Error loading samples: {e}")

    async def start(self, callback: Callable, stop_event: asyncio.Event):
        self.active = True
        self.current_index = 0
        
        if not self.sessions:
            print("[SSHReplayEngine] No sessions loaded.")
            self.active = False
            return
            
        while not stop_event.is_set():
            ip, session_log = self.sessions[self.current_index]
            try:
                if asyncio.iscoroutinefunction(callback):
                    await callback(ip, session_log)
                else:
                    callback(ip, session_log)
            except Exception as e:
                print(f"[SSHReplayEngine] Error in callback: {e}")
            
            self.sessions_played += 1
            self.current_index = (self.current_index + 1) % len(self.sessions)
            
            try:
                await asyncio.wait_for(stop_event.wait(), timeout=self.delay_seconds)
            except asyncio.TimeoutError:
                pass # Continue loop

        self.active = False

    async def get_status(self) -> dict:
        return {
            "active": self.active,
            "sessions_total": len(self.sessions),
            "sessions_played": self.sessions_played,
            "current_index": self.current_index,
            "delay_seconds": self.delay_seconds
        }

# ─── Network Scenario Simulator ──────────────────────────────────────────────────

class NetworkScenarioSimulator:
    def __init__(self, parquet_path="artifacts/network/inference_set.parquet", features_path="artifacts/network/feature_cols_final.pkl"):
        self.active = False
        self.flows_sent = 0
        self.scenario = None
        
        import pandas as pd
        import pickle
        
        try:
            with open(features_path, "rb") as f:
                self.feature_cols = pickle.load(f)
            self.df = pd.read_parquet(parquet_path)
            self.ready = True
        except Exception as e:
            print(f"[NetworkSimulator] Initialization failed: {e}")
            self.df = None
            self.feature_cols = []
            self.ready = False

    async def run_scenario(self, scenario: str, callback: Callable, stop_event: asyncio.Event, flows_per_second: float = 1.0):
        self.active = True
        self.scenario = scenario
        self.flows_sent = 0
        
        delay = 1.0 / flows_per_second if flows_per_second > 0 else 1.0
        
        if not self.ready or self.df is None:
            print("[NetworkSimulator] Cannot run scenario: dataset not loaded.")
            self.active = False
            return

        import random

        # Determine target classes based on scenario name
        scenario_map = {
            "ddos": ["DDoS"],
            "bot": ["Bot"],
            "bruteforce": ["FTP-Patator", "SSH-Patator"],
            "scanning": ["PortScan"],
            "mixed": ["DDoS", "Bot", "FTP-Patator", "SSH-Patator", "PortScan", "Web Attack"],
            "benign": ["BENIGN"]
        }
        
        target_labels = scenario_map.get(scenario, ["BENIGN"])
        
        if scenario == "benign":
            sub_df = self.df[self.df["label_binary"] == 0]
        elif scenario == "mixed":
            sub_df = self.df  # sample everything
        else:
            if "label_multi" in self.df.columns:
                import joblib
                try:
                    le = joblib.load("artifacts/network/label_encoder.pkl")
                    target_ints = [i for i, cls in enumerate(le.classes_) if cls in target_labels]
                    sub_df = self.df[self.df["label_multi"].isin(target_ints)]
                except Exception as e:
                    print(f"[NetworkSimulator] Error mapping labels: {e}")
                    sub_df = self.df[self.df["label_binary"] == 1]
            else:
                sub_df = self.df[self.df["label_binary"] == 1]
                
        if len(sub_df) == 0:
            print(f"[NetworkSimulator] No flows found for scenario: {scenario}, falling back to benign.")
            sub_df = self.df[self.df["label_binary"] == 0]

        while not stop_event.is_set():
            # Sample one row
            sample_row = sub_df.sample(n=1).iloc[0]
            
            # Keep only the expected feature columns that exist in the dataframe
            cols_to_send = [c for c in self.feature_cols if c in self.df.columns]
            
            flow_dict = sample_row[cols_to_send].to_dict()
            
            # Fix numpy serialization for JSON
            import pandas as pd
            flow_dict = {k: float(v) if pd.notna(v) else 0.0 for k, v in flow_dict.items()}

            try:
                if asyncio.iscoroutinefunction(callback):
                    await callback(flow_dict)
                else:
                    callback(flow_dict)
            except Exception as e:
                print(f"[NetworkSimulator] Error in callback: {e}")
                
            self.flows_sent += 1
            
            try:
                await asyncio.wait_for(stop_event.wait(), timeout=delay)
            except asyncio.TimeoutError:
                pass

        self.active = False

    async def get_status(self) -> dict:
        return {
            "active": self.active,
            "scenario": self.scenario,
            "flows_sent": self.flows_sent
        }

# ─── UEBA Replay Engine ─────────────────────────────────────────────────────────

class UEBAReplayEngine:
    def __init__(self, results_path: str, delay_seconds: float = 3.0):
        self.results_path = results_path
        self.delay_seconds = delay_seconds
        self.alerts = []
        self.active = False
        self.alerts_played = 0
        self.current_index = 0
        self._load_alerts()

    def _load_alerts(self):
        import json
        try:
            with open(self.results_path, "r", encoding="utf-8") as f:
                self.alerts = json.load(f)
            # Load ALL records so the simulation shows mixed benign/attack traffic
            self.alerts = self.alerts  # no filter — show all
            # Separate attacks for logging
            attacks = [a for a in self.alerts if a.get("verdict") not in ["NORMAL", "BENIGN", None]]
            print(f"[UEBAReplayEngine] Loaded {len(self.alerts)} UEBA records ({len(attacks)} anomalies).")

        except Exception as e:
            print(f"[UEBAReplayEngine] Error loading results: {e}")

    async def start(self, callback: Callable, stop_event: asyncio.Event):
        self.active = True
        self.current_index = 0
        
        if not self.alerts:
            print("[UEBAReplayEngine] No alerts loaded.")
            self.active = False
            return
            
        import random
        while not stop_event.is_set():
            alert = dict(self.alerts[self.current_index])
            try:
                # Add current time to alert
                import time as _time
                alert["time"] = _time.strftime("%Y-%m-%dT%H:%M:%SZ", _time.gmtime())
                alert["timestamp_epoch"] = _time.time()
                alert["id"] = f"UEBA-SIM-{int(_time.time()*1000)}"
                alert["block_id"] = alert["id"]
                
                if asyncio.iscoroutinefunction(callback):
                    await callback(alert)
                else:
                    callback(alert)
            except Exception as e:
                print(f"[UEBAReplayEngine] Error in callback: {e}")
            
            self.alerts_played += 1
            self.current_index = (self.current_index + 1) % len(self.alerts)
            
            try:
                actual_delay = self.delay_seconds * random.uniform(0.8, 1.2)
                await asyncio.wait_for(stop_event.wait(), timeout=actual_delay)
            except asyncio.TimeoutError:
                pass

        self.active = False

    async def get_status(self) -> dict:
        return {
            "active": self.active,
            "alerts_total": len(self.alerts),
            "alerts_played": self.alerts_played,
            "current_index": self.current_index,
            "delay_seconds": self.delay_seconds
        }
