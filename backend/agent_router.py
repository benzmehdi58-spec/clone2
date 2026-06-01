import os
import json
import time
import httpx
from pathlib import Path
from fastapi import APIRouter, Request, HTTPException

router = APIRouter()

# ── A. Key Loading ──
BASE_DIR = Path(__file__).parent.parent
keys_file = BASE_DIR / "keys.txt"

keys = {}
if keys_file.exists():
    with open(keys_file, "r") as f:
        for line in f:
            if "=" in line:
                k, v = line.split("=", 1)
                keys[k.strip()] = v.strip()

def get_key(key_name):
    return keys.get(key_name, os.environ.get(key_name))

# ── B. Model Registry ──
MODELS = [
    {
        "name": "gemini",
        "url": "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
        "key_name": "GEMINI_API_KEY",
        "model": "gemini-2.5-flash",
        "priority": 1
    },
    {
        "name": "groq",
        "url": "https://api.groq.com/openai/v1/chat/completions",
        "key_name": "GROQ_API_KEY",
        "model": "llama-3.3-70b-versatile",
        "priority": 2
    },
    {
        "name": "cerebras",
        "url": "https://api.cerebras.ai/v1/chat/completions",
        "key_name": "CEREBRAS_API_KEY",
        "model": "llama-3.3-70b",
        "priority": 3
    },
]

# ── C. Rate Limit Tracker ──
_rate_limited_until: dict = {}

# ── D. call_llm() ──
def call_llm(messages, tools=None):
    errors = []
    for m in sorted(MODELS, key=lambda x: x["priority"]):
        now = time.time()
        if m["name"] in _rate_limited_until and _rate_limited_until[m["name"]] > now:
            continue
            
        api_key = get_key(m["key_name"])
        if not api_key:
            errors.append(f"{m['name']} skipped (no key)")
            continue
            
        payload = {
            "model": m["model"],
            "messages": messages,
        }
        if tools:
            payload["tools"] = tools
            
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        
        try:
            with httpx.Client(timeout=30.0) as client:
                res = client.post(m["url"], json=payload, headers=headers)
                
            if res.status_code == 429:
                _rate_limited_until[m["name"]] = time.time() + 60
                errors.append(f"{m['name']} rate limited (429)")
                continue
                
            if res.status_code != 200:
                errors.append(f"{m['name']} error {res.status_code}: {res.text}")
                continue
                
            data = res.json()
            message = data["choices"][0]["message"]
            return message
            
        except Exception as e:
            errors.append(f"{m['name']} request failed: {e}")
            continue
            
    raise Exception(f"All LLMs failed: {'; '.join(errors)}")

# ── E. Tool definitions ──
TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "get_recent_alerts",
            "description": "Fetch recent alerts from HDFS and/or Network pipelines from the alert buffer",
            "parameters": {
                "type": "object",
                "properties": {
                    "source": {
                        "type": "string",
                        "enum": ["HDFS", "Network", "ALL"],
                        "description": "Which pipeline to fetch from"
                    },
                    "limit": {
                        "type": "integer",
                        "default": 20,
                        "description": "Max number of alerts to return"
                    }
                },
                "required": ["source"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_block_session",
            "description": "Get raw log lines and event sequence for a specific HDFS block ID",
            "parameters": {
                "type": "object",
                "properties": {
                    "block_id": {"type": "string"}
                },
                "required": ["block_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_flows_by_type",
            "description": "Get recent network flows filtered by attack type",
            "parameters": {
                "type": "object",
                "properties": {
                    "attack_type": {"type": "string"},
                    "limit": {"type": "integer", "default": 10}
                },
                "required": ["attack_type"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "create_incident",
            "description": "Save the completed incident report to storage. Call this only when you have enough evidence to write a complete report.",
            "parameters": {
                "type": "object",
                "properties": {
                    "severity": {
                        "type": "string",
                        "enum": ["low", "medium", "high", "critical"]
                    },
                    "title": {"type": "string"},
                    "report_markdown": {
                        "type": "string",
                        "description": "Full incident report in markdown format"
                    },
                    "correlated_ids": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "List of alert IDs or block IDs involved in this incident"
                    }
                },
                "required": ["severity", "title", "report_markdown", "correlated_ids"]
            }
        }
    }
]

# ── F. Tool executor ──
def run_tool(name: str, inputs: dict, app_state):
    state = app_state.global_state
    
    try:
        if name == "get_recent_alerts":
            source = inputs.get("source", "ALL")
            limit = inputs.get("limit", 20)
            alerts = state.get("alert_buffer", [])
            if source != "ALL":
                alerts = [a for a in alerts if a.get("source", "").lower() == source.lower()]
            return json.dumps(alerts[-limit:])
            
        elif name == "get_block_session":
            block_id = inputs.get("block_id")
            logs = state.get("logs", [])
            for l in logs:
                if l.get("block_id") == block_id:
                    return json.dumps({"block_id": block_id, "raw": l.get("raw")})
            return json.dumps({"error": f"Block {block_id} not found"})
            
        elif name == "get_flows_by_type":
            attack_type = inputs.get("attack_type")
            limit = inputs.get("limit", 10)
            flows = state.get("net_logs", [])
            matched = [f for f in flows if f.get("attack_type") == attack_type]
            return json.dumps(matched[-limit:])
            
        elif name == "create_incident":
            # Just return a success message so the agent knows it worked
            # We will extract this call's arguments in the main loop to save it
            return json.dumps({"status": "Incident saved successfully. You may stop."})
            
        else:
            return json.dumps({"error": f"Unknown tool {name}"})
    except Exception as e:
        return json.dumps({"error": str(e)})

# ── G. System Prompt ──
SYSTEM_PROMPT = """
You are the CyberAI SOC Analyst Agent. You automatically investigate security alerts
from two detection pipelines and produce actionable incident reports.

## Pipeline 1 — HDFS System Logs (BiLSTM)
- prediction: "Normal" or "Anomaly"
- confidence: 0.0 to 1.0 (above 0.85 = high confidence)
- block_id: HDFS block session identifier
- Key events: PacketResponder Exception SocketTimeoutException = network saturation
              writeBlock received exception IOException = write failure
              Served block = normal read

## Pipeline 2 — Network Intrusion (Three-Stage)
- Stage 1: attack_probability (threshold > 0.30 triggers Stage 2)
- Stage 2: attack_type — one of: DoS, DDoS, Web Attack, Bot, PortScan,
           FTP-Patator, SSH-Patator, Rare Attack
- Stage 3: zero_day_flag = true means reconstruction_error exceeded 95th
           percentile threshold — ALWAYS treat as CRITICAL severity

## Correlation patterns you must check on every alert:
- DDoS or DoS (Network) + SocketTimeout or BrokenPipe (HDFS) within 60 seconds
  → Network flood caused infrastructure disruption. Single coordinated attack.
- PortScan (Network) + HDFS anomaly with unusual block allocation events
  → Reconnaissance phase. Attacker mapping internal filesystem layout.
- zero_day_flag true + ANY HDFS anomaly
  → Novel breach with possible lateral movement. Isolate immediately.
- FTP-Patator or SSH-Patator (Network) + HDFS write anomalies
  → Credential attack attempting filesystem access.

## Your behavior:
1. Always call get_recent_alerts(source="ALL") first — never analyze in isolation
2. Look for temporal overlap — alerts within 60 seconds of each other are likely related
3. Call get_block_session() for any HDFS anomaly to see the raw event sequence
4. Call get_flows_by_type() to see the volume and pattern of network attacks
5. Only call create_incident() when you have enough evidence for a complete report
6. Never invent data — only use what the tools return

## Report format (inside report_markdown):
### Root cause
One paragraph explaining what happened and why, referencing specific IDs and timestamps.

### Evidence
- List each piece of evidence with its source pipeline, ID, and confidence score

### Remediation
**Immediate:** actions to take right now (block, isolate, rotate)
**Investigate:** what to check next (logs, sibling nodes, access records)
**Monitor:** what threshold or pattern to watch going forward
"""

# ── H. Agent Loop ──
import uuid
import datetime

async def run_agent(trigger_payload: dict, app_state):
    try:
        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"New high-confidence alert triggered:\n{json.dumps(trigger_payload)}"}
        ]
        
        has_created_incident = False
        incident_data = None
        
        for _ in range(8):
            msg = call_llm(messages, tools=TOOLS)
            messages.append(msg)
            
            if msg.get("tool_calls"):
                for tc in msg["tool_calls"]:
                    name = tc["function"]["name"]
                    args = json.loads(tc["function"]["arguments"])
                    
                    if name == "create_incident" and not has_created_incident:
                        incident_data = args
                        has_created_incident = True
                        
                    res = run_tool(name, args, app_state)
                    messages.append({
                        "role": "tool",
                        "tool_call_id": tc["id"],
                        "content": res
                    })
            else:
                break
                
        if has_created_incident and incident_data:
            state = app_state.global_state
            inc_id = f"INC-{int(time.time())}"
            incident_data["id"] = inc_id
            incident_data["timestamp"] = datetime.datetime.now().isoformat()
            state.setdefault("incidents", {})[inc_id] = incident_data
            
    except Exception as e:
        print(f"[AGENT ERROR] {e}")


# ── I. API Routes ──
from pydantic import BaseModel

class AnalyzeManualRequest(BaseModel):
    alert_id: str
    source: str

@router.post("/api/agent/analyze")
def manual_analyze(req: AnalyzeManualRequest, request: Request):
    # Triggers agent synchronously, returns incident report
    state = request.app.state.global_state
    alert = None
    
    # Try to find the alert in buffer
    for a in state.get("alert_buffer", []):
        if a.get("block_id") == req.alert_id or a.get("id") == req.alert_id:
            alert = a
            break
            
    if not alert:
        # Fallback to search in all logs
        for l in state.get("logs", []):
            if l.get("block_id") == req.alert_id:
                alert = l
                break
                
    if not alert:
        alert = {"id": req.alert_id, "source": req.source, "note": "Manual trigger context not found in buffer"}
        
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": f"Manual investigation requested for alert:\n{json.dumps(alert)}"}
    ]
    
    incident_data = None
    
    try:
        for _ in range(8):
            msg = call_llm(messages, tools=TOOLS)
            messages.append(msg)
            
            if msg.get("tool_calls"):
                for tc in msg["tool_calls"]:
                    name = tc["function"]["name"]
                    args = json.loads(tc["function"]["arguments"])
                    
                    if name == "create_incident" and not incident_data:
                        incident_data = args
                        
                    # Request.app is the app_state structure we need for run_tool
                    res = run_tool(name, args, request.app.state)
                    messages.append({
                        "role": "tool",
                        "tool_call_id": tc["id"],
                        "content": res
                    })
            else:
                break
                
        if incident_data:
            return incident_data
        else:
            return {"report_markdown": "Agent completed analysis but did not generate a final report."}
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/api/incidents")
def get_incidents(request: Request):
    state = request.app.state.global_state
    return state.get("incidents", {})

@router.get("/api/incidents/{incident_id}")
def get_incident(incident_id: str, request: Request):
    state = request.app.state.global_state
    inc = state.get("incidents", {}).get(incident_id)
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")
    return inc
