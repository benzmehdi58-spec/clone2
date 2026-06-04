import asyncio
import re
import random
import time
from collections import defaultdict
from typing import Callable, AsyncGenerator

import httpx

# ─── HDFS Replay Engine ──────────────────────────────────────────────────────────

class HDFSReplayEngine:
    def __init__(self, samples_path: str, delay_seconds: float = 2.0):
        self.samples_path = samples_path
        self.delay_seconds = delay_seconds
        self.sessions = []
        self.active = False
        self.sessions_played = 0
        self.current_index = 0
        self._load_samples()

    def _load_samples(self):
        ENTRY_RE = re.compile(r'(?=\d{6}\s\d{6}\s\d+\s)')
        BLOCK_RE = re.compile(r'(blk_-?\d+)')
        block_lines = defaultdict(list)
        try:
            with open(self.samples_path, "r", encoding="utf-8", errors="ignore") as f:
                raw = f.read()
            entries = ENTRY_RE.split(raw)
            for entry in entries:
                entry = entry.strip()
                if not entry:
                    continue
                match = BLOCK_RE.search(entry)
                if match:
                    block_lines[match.group(1)].append(entry)
            self.sessions = list(block_lines.values())
        except Exception as e:
            print(f"[HDFSReplayEngine] Error loading samples: {e}")

    async def start(self, callback: Callable, stop_event: asyncio.Event):
        self.active = True
        self.current_index = 0
        
        if not self.sessions:
            print("[HDFSReplayEngine] No sessions loaded.")
            self.active = False
            return
            
        while not stop_event.is_set():
            session_lines = self.sessions[self.current_index]
            try:
                if asyncio.iscoroutinefunction(callback):
                    await callback("\n".join(session_lines))
                else:
                    callback("\n".join(session_lines))
            except Exception as e:
                print(f"[HDFSReplayEngine] Error in callback: {e}")
            
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
                sub_df = self.df[self.df["label_multi"].isin(target_labels)]
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

# ─── LLM Log Generator ───────────────────────────────────────────────────────────

async def llm_generate_hdfs_logs(
    block_count: int,
    attack_type: str,
    api_key: str,
    speed: str
) -> AsyncGenerator[list[str], None]:
    
    speed_map = {"slow": 3.0, "medium": 1.5, "fast": 0.5}
    delay = speed_map.get(speed, 1.5)
    
    system_prompt = (
        "You are an HDFS log generator. Output ONLY raw HDFS log lines, "
        "nothing else, no explanations. Format exactly: "
        "YYMMDD HHMMSS <pid> <LEVEL> dfs.<Component>: <message containing blk_<id>>"
    )
    
    guidance = {
        "normal": "Make them look like standard block allocation, replication, and deletion without errors.",
        "exfiltration": "Include unusual high-volume read requests, possibly multiple rapid reads of the same block from strange IPs.",
        "deletion": "Include multiple rapid 'Deleting block' logs and NameSystem.delete logs bypassing normal workflows.",
        "replication": "Include unauthorized replication requests, or addStoredBlock requests that do not belong to any file."
    }
    
    user_prompt = (
        f"Generate {block_count} log sessions for a {attack_type} scenario. "
        f"Each session is 5-15 lines for the same blk_<random_id>. "
        f"For {attack_type} sessions make the event patterns subtly anomalous: "
        f"{guidance.get(attack_type, '')}\n"
        "Separate each session with a blank line."
    )
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": api_key,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json"
                },
                json={
                    "model": "claude-3-haiku-20240307",
                    "max_tokens": 4096,
                    "system": system_prompt,
                    "messages": [{"role": "user", "content": user_prompt}]
                },
                timeout=30.0
            )
            response.raise_for_status()
            data = response.json()
            content = data["content"][0]["text"]
            
            # Split into sessions based on blank lines or block IDs
            sessions_raw = re.split(r'\n\s*\n', content.strip())
            for session in sessions_raw:
                lines = [line.strip() for line in session.split('\n') if line.strip()]
                if lines:
                    yield lines
                    await asyncio.sleep(delay)
                    
    except Exception as e:
        print(f"[LLMGenerator] Error generating logs: {e}")
        # Yield a dummy anomalous session to show something on failure, or just raise
        yield [
            "081109 203518 143 INFO dfs.DataNode$DataXceiver: Receiving block blk_-1608999687919862906 src: /10.250.19.102:54106 dest: /10.250.19.102:50010",
            "081109 203518 143 WARN dfs.DataNode$DataXceiver: writeBlock blk_-1608999687919862906 received exception java.io.IOException: Connection reset by peer",
            "081109 203518 143 ERROR dfs.DataNode$DataXceiver: Exception in receiveBlock for block blk_-1608999687919862906 java.io.IOException: Connection reset by peer"
        ]
