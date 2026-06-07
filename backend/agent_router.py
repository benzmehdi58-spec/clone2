import os
import json
import time
import httpx
from pathlib import Path
from fastapi import APIRouter, Request, HTTPException
import database

try:
    from rag_manager import rag_manager
except ImportError:
    rag_manager = None

router = APIRouter()

def _extract_urgency(result: dict) -> str:
    stage = int(result.get("mitre", {}).get("kill_chain_stage", 0))
    if stage == 0: return "none"
    if stage <= 2: return "low"
    if stage <= 4: return "medium"
    if stage <= 6: return "high"
    return "critical"


def build_mitre_context(result: dict) -> str:
    mitre      = result.get("mitre", {})
    verdict    = result.get("verdict") or result.get("prediction", "UNKNOWN")
    confidence = float(result.get("confidence", 0.0))
    kill_stage = int(mitre.get("kill_chain_stage", 0))

    if verdict == "BENIGN" or kill_stage == 0:
        return (
            f"VERDICT: BENIGN\n"
            f"Confidence: {confidence:.1f}%\n"
            f"Assessment: Normal traffic — no threat indicators detected."
        )
        
    # Normalize THREAT to ATTACK so the LLM system prompt rule triggers
    if str(verdict).upper() == "THREAT":
        verdict = "ATTACK"

    if kill_stage <= 2:
        urgency      = "LOW"
        urgency_note = "Early-stage activity. Monitor and log. No immediate containment needed."
        action_note  = "Enable enhanced logging on affected systems. No blocking action required yet."
    elif kill_stage <= 4:
        urgency      = "MEDIUM"
        urgency_note = "Active attack in progress. Attacker is attempting delivery or exploitation."
        action_note  = "Isolate affected network segment. Review firewall rules immediately."
    elif kill_stage <= 6:
        urgency      = "HIGH"
        urgency_note = "Possible system compromise. Attacker may have established persistence or C2."
        action_note  = "Begin incident response. Forensic snapshot of affected systems. Block C2 IPs."
    else:
        urgency      = "CRITICAL"
        urgency_note = "Final impact phase. Data destruction or service disruption is occurring NOW."
        action_note  = "Activate incident response plan immediately. Executive notification required."

    attack_type  = result.get("attack_type", "unknown") or "unknown"
    zero_day     = result.get("zero_day_flag", False)
    attack_label = f"{attack_type.upper()}{' [ZERO-DAY]' if zero_day else ''}"
    tactic       = mitre.get("tactic",       "Unknown")
    tactic_id    = mitre.get("tactic_id",    "")
    technique    = mitre.get("technique",    "Unknown")
    technique_id = mitre.get("technique_id", "")
    sub_technique = mitre.get("sub_technique")
    sub_id        = mitre.get("sub_id")
    description   = mitre.get("description", "")

    sub_line = f"  Sub-Technique : {sub_technique} ({sub_id})\n" if sub_technique and sub_id else ""

    flow_line = ""
    if "Flow Bytes/s" in result:
        protocol   = int(result.get("Protocol",               0))
        dst_port   = int(result.get("Dst Port",               0))
        flow_bytes = float(result.get("Flow Bytes/s",         0))
        fwd_pkts   = int(result.get("Total Fwd Packets",      0))
        bwd_pkts   = int(result.get("Total Backward Packets", 0))
        proto_name = {6: "TCP", 17: "UDP", 1: "ICMP"}.get(protocol, str(protocol))
        flow_line  = (
            f"\nKEY FLOW FEATURES:\n"
            f"  Protocol        : {proto_name}\n"
            f"  Destination Port: {dst_port}\n"
            f"  Flow Bytes/s    : {flow_bytes:,.0f}\n"
            f"  Fwd Packets     : {fwd_pkts}  |  Bwd Packets: {bwd_pkts}\n"
        )

    auth_line = ""
    if "src_ip" in result and result.get("source") == "auth_log":
        auth_line = (
            f"\nSSH AUTH CONTEXT:\n"
            f"  Source IP : {result.get('src_ip', 'unknown')}\n"
            f"  Log Events: {result.get('n_events', 0)} events in session\n"
        )

    ueba_line = ""
    if "user_id" in result and result.get("source") == "insider_threat":
        ueba_line = (
            f"\nUEBA BEHAVIOR CONTEXT:\n"
            f"  User ID   : {result.get('user_id', 'unknown')}\n"
            f"  Window    : {result.get('window_start', 'unknown')} to {result.get('window_end', 'unknown')}\n"
        )

    vuln_line = ""
    vuln = result.get("vulnerability_analysis", {})
    if vuln and vuln.get("cve_ids"):
        cve_list  = ", ".join(vuln["cve_ids"][:5])
        cvss      = vuln.get("cvss_max", 0.0)
        top_fix   = vuln.get("remediation_steps", ["No specific remediation found"])[0]
        vuln_line = (
            f"\nVULNERABILITY INTELLIGENCE:\n"
            f"  CVEs          : {cve_list}\n"
            f"  Max CVSS      : {cvss}\n"
            f"  Top Remediation: {top_fix}\n"
            f"  Summary       : {vuln.get('summary', '')[:200]}\n"
        )
    elif vuln and vuln.get("summary"):
        vuln_line = f"\nVULNERABILITY INTELLIGENCE:\n  {vuln['summary']}\n"

    return (
        f"VERDICT          : {verdict} — {attack_label}\n"
        f"Confidence       : {confidence:.1f}%\n"
        f"Urgency Level    : {urgency}\n"
        f"\nMITRE ATT&CK INTELLIGENCE:\n"
        f"  Tactic        : {tactic} ({tactic_id})\n"
        f"  Technique     : {technique} ({technique_id})\n"
        f"{sub_line}"
        f"  Kill Chain    : Stage {kill_stage} — {mitre.get('kill_chain_name', '')}\n"
        f"  Description   : {description}\n"
        f"{flow_line}"
        f"{auth_line}"
        f"{ueba_line}"
        f"{vuln_line}"
        f"\nSITUATION: {urgency_note}\n"
        f"INITIAL ACTION : {action_note}"
    )

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
        "name": "openrouter",
        "url": "https://openrouter.ai/api/v1/chat/completions",
        "key_name": "OPENROUTER_API_KEY",
        "model": "google/gemini-2.5-flash",
        "priority": 1
    },
    {
        "name": "gemini",
        "url": "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
        "key_name": "GEMINI_API_KEY",
        "model": "gemini-2.5-flash",
        "priority": 2
    },
    {
        "name": "groq",
        "url": "https://api.groq.com/openai/v1/chat/completions",
        "key_name": "GROQ_API_KEY",
        "model": "llama-3.3-70b-versatile",
        "priority": 3
    },
    {
        "name": "cerebras",
        "url": "https://api.cerebras.ai/v1/chat/completions",
        "key_name": "CEREBRAS_API_KEY",
        "model": "llama3.1-70b",
        "priority": 4
    },
]

# ── C. Rate Limit Tracker ──
_rate_limited_until: dict = {}

# ── D. call_llm() ──
async def call_llm(messages, tools=None):
    errors = []
    for m in sorted(MODELS, key=lambda x: x["priority"]):
        now = time.time()
        if m["name"] in _rate_limited_until and _rate_limited_until[m["name"]] > now:
            errors.append(f"{m['name']} rate limited (cooldown)")
            continue
            
        api_key = get_key(m["key_name"])
        if not api_key:
            errors.append(f"{m['name']} skipped (no key)")
            continue
            
        payload = {
            "model": m["model"],
            "messages": messages,
            "max_tokens": 1024,
        }
        if tools:
            payload["tools"] = tools
            
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                res = await client.post(m["url"], json=payload, headers=headers)
                
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
                        "enum": ["SSH", "UEBA", "Network", "ALL"],
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
            "name": "get_ssh_auth_session",
            "description": "Get raw SSH authentication log lines for a specific IP address. Use when source is auth_log.",
            "parameters": {
                "type": "object",
                "properties": {
                    "ip_address": {"type": "string"}
                },
                "required": ["ip_address"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_ueba_user_behavior",
            "description": "Get cross-channel raw behavior logs (logon, device, file, email, http) for a specific user ID. Use when source is insider_threat.",
            "parameters": {
                "type": "object",
                "properties": {
                    "user_id": {"type": "string"}
                },
                "required": ["user_id"]
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
            

        elif name == "get_ssh_auth_session":
            ip_address = inputs.get("ip_address")
            try:
                import os
                path = os.path.join(os.path.dirname(__file__), "data", "ssh_inference_samples.txt")
                matched_lines = []
                with open(path, "r", encoding="utf-8") as f:
                    for line in f:
                        if ip_address in line:
                            matched_lines.append(line.strip())
                if not matched_lines:
                    return json.dumps({"error": f"No logs found for IP {ip_address}"})
                # Limit to 50 lines so we don't blow up context window
                return json.dumps({"ip_address": ip_address, "logs": matched_lines[:50]})
            except Exception as e:
                return json.dumps({"error": str(e)})

        elif name == "get_ueba_user_behavior":
            user_id = inputs.get("user_id")
            try:
                import sqlite3
                import os
                db_path = os.path.join(os.path.dirname(__file__), "cyberai.db")
                conn = sqlite3.connect(db_path)
                cursor = conn.cursor()
                cursor.execute("SELECT date, log_type, activity, filename, email_to, url, content FROM ueba_logs WHERE user = ? LIMIT 50", (user_id,))
                rows = cursor.fetchall()
                conn.close()
                if not rows:
                    return json.dumps({"error": f"No behavior logs found for user {user_id}"})
                results = []
                for r in rows:
                    res = {"date": r[0], "log_type": r[1]}
                    if r[2]: res["activity"] = r[2]
                    if r[3]: res["filename"] = r[3]
                    if r[4]: res["email_to"] = r[4]
                    if r[5]: res["url"] = r[5]
                    if r[6]: res["content"] = r[6]
                    results.append(res)
                return json.dumps({"user_id": user_id, "logs": results})
            except Exception as e:
                return json.dumps({"error": str(e)})
                
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
SYSTEM_PROMPT = """You are CyberAI — an expert AI security analyst embedded in a Security Operations Center (SOC).

You receive structured MITRE ATT&CK intelligence briefings from an automated ML detection pipeline that analyzes network flows and system logs.

YOUR JOB:
Analyze each briefing using your available tools, then produce a concise actionable incident report for a human SOC analyst who needs to act fast.

ALWAYS structure your final response in exactly this format:

## Incident Summary
One paragraph. What happened, what MITRE technique was used, how confident the system is.

## MITRE ATT&CK Context
Explain the tactic and technique in plain English. What is the attacker trying to achieve at this kill chain stage?

## Threat Assessment
Based on kill chain stage and confidence, how serious is this? What is the likely next step if not contained?

## Recommended Actions
A numbered list of 3-5 specific actionable steps the analyst should take RIGHT NOW. Reference protocol, port, or system type when known.

## Analyst Notes
Additional context, false positive indicators to rule out, or follow-up investigations.

RULES:
- Always reference the MITRE technique ID (e.g. T1498.002) in your summary.
- Always state the kill chain stage number and name.
- Never say "I cannot determine" — make your best assessment from the data given.
- Keep total response under 400 words.
- NEVER override the ML's verdict. If the briefing says VERDICT: ATTACK, you MUST generate a full, long, detailed incident report.
- If the briefing says VERDICT: BENIGN, generate a short incident report explaining why the traffic was classified as normal.
- CRITICAL: You MUST use the `create_incident` tool to submit your final report. Put your markdown report inside the `report_markdown` parameter. Do not output the report as regular chat text.
- Check the source: If auth_log use get_ssh_auth_session. If insider_threat use get_ueba_user_behavior. If Network use get_flows_by_type.
- You MUST use the tools to retrieve raw logs and summarize the specific events/commands the attacker executed.
- CRITICAL: You MUST use the `create_incident` tool to submit your final report. Put your markdown report inside the `report_markdown` parameter. Do not output the report as regular chat text.
"""

# ── H. Agent Loop ──
import uuid
import datetime
import time

_last_agent_run = 0.0

async def run_agent(trigger_payload: dict, app_state):
    global _last_agent_run
    now = time.time()
    # Throttle agent execution to max 1 per 10 seconds globally
    if now - _last_agent_run < 10.0:
        print(f"[Agent] Skipped due to 10s throttle. (Payload: {trigger_payload.get('title', 'Unknown')})")
        return
    _last_agent_run = now

    try:
        mitre_context = build_mitre_context(trigger_payload)
        
        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"A new security alert has been triggered!\n\n{mitre_context}\n\nPlease analyze this alert and generate an incident report.\n\nRaw Log Evidence:\n```json\n{json.dumps(trigger_payload, indent=2)}\n```"}
        ]
        
        has_created_incident = False
        incident_data = None
        
        for _ in range(8):
            msg = await call_llm(messages, tools=TOOLS)
            messages.append(msg)
            
            if msg.get("tool_calls"):
                for tc in msg["tool_calls"]:
                    name = tc["function"]["name"]
                    try:
                        args = json.loads(tc["function"]["arguments"])
                    except (json.JSONDecodeError, KeyError) as e:
                        messages.append({
                            "role":    "tool",
                            "content": f"Tool call failed — invalid JSON arguments: {e}. Please retry with valid JSON.",
                            "tool_call_id": tc.get("id", "unknown")
                        })
                        continue
                    
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
            
            database.save_incident(incident_data)
            state.setdefault("incidents", {})[inc_id] = incident_data
            
        incident_was_created = any(
            tool_call.get("function", {}).get("name") == "create_incident"
            for message in messages
            if message.get("role") == "assistant"
            for tool_call in message.get("tool_calls", [])
        )

        if not incident_was_created:
            fallback_incident = {
                "id":          f"FALLBACK-{int(datetime.datetime.utcnow().timestamp())}",
                "title":       f"Unresolved Alert — {trigger_payload.get('attack_type', 'unknown').upper()}",
                "severity":    _extract_urgency(trigger_payload),
                "status":      "unresolved",
                "summary":     "Agent loop exhausted without producing a final report. Manual review required.",
                "raw_payload": trigger_payload,
                "created_at":  datetime.datetime.utcnow().isoformat(),
                "mitre":       trigger_payload.get("mitre", {})
            }
            database.save_incident(fallback_incident)
            app_state.global_state["incidents"][fallback_incident["id"]] = fallback_incident
            
    except Exception as e:
        print(f"Agent error: {e}")
        try:
            error_incident = {
                "id":          f"ERR-{int(datetime.datetime.utcnow().timestamp())}",
                "title":       "Agent Analysis Failed",
                "severity":    _extract_urgency(trigger_payload),
                "status":      "error",
                "error":       str(e),
                "raw_payload": trigger_payload,
                "created_at":  datetime.datetime.utcnow().isoformat(),
                "mitre":       trigger_payload.get("mitre", {})
            }
            database.save_incident(error_incident)
            app_state.global_state["incidents"][error_incident["id"]] = error_incident
        except Exception as save_err:
            print(f"Failed to save error incident: {save_err}")


# ── I. API Routes ──
from pydantic import BaseModel

class AnalyzeManualRequest(BaseModel):
    alert_id: str
    source: str
    alert: dict = None  # optional: full alert dict can be passed inline

@router.post("/api/agent/analyze")
async def manual_analyze(req: AnalyzeManualRequest, request: Request):
    """Triggers the agent synchronously and returns the incident report."""
    state = request.app.state.global_state
    alert = None

    # Priority 1: full alert dict passed inline
    if req.alert:
        alert = req.alert
        if "raw_payload" in alert and isinstance(alert["raw_payload"], dict):
            # Flatten raw_payload into the top-level dict so we can read verdict/prediction
            for k, v in alert["raw_payload"].items():
                if k not in alert or not alert[k]:
                    alert[k] = v

    # Priority 2: find in alert_buffer by ID
    if not alert:
        for a in state.get("alert_buffer", []):
            if a.get("block_id") == req.alert_id or a.get("id") == req.alert_id:
                alert = a
                break

    if not alert:
        for log_key in ("net_logs", "ssh_logs", "ueba_logs", "logs"):
            for l in state.get(log_key, []):
                if l.get("block_id") == req.alert_id or l.get("id") == req.alert_id:
                    alert = l
                    break
            if alert:
                break

    # Last resort: minimal stub so agent still runs
    if not alert:
        alert = {"id": req.alert_id, "source": req.source,
                 "note": "Manual trigger — full alert context not found in buffer"}
                 
    print(f"[DEBUG] manual_analyze alert before enrichment: {json.dumps(alert, indent=2)}")

    # Ensure MITRE and RAG context are fully populated for manual triggers
    if not alert.get("mitre"):
        from mitre_mapper import MITREMapper
        mapper = MITREMapper()
        if "label" in alert and "prediction" not in alert:
            alert["prediction"] = alert["label"]
        if "prediction" not in alert:
            alert["prediction"] = alert.get("attack_type") or alert.get("verdict")
        if "prediction" in alert and "verdict" not in alert:
            alert["verdict"] = alert["prediction"]
        
        if alert.get("source") == "Network":
            alert = mapper.enrich(alert, alert)
        elif alert.get("source") in ["auth_log", "SSH"]:
            alert = mapper.enrich_ssh(alert)
        elif alert.get("source") in ["insider_threat", "UEBA"]:
            alert = mapper.enrich_ueba(alert)

    if "vulnerability_analysis" not in alert and getattr(request.app.state, "rag_analyzer", None):
        import asyncio
        alert = await asyncio.to_thread(request.app.state.rag_analyzer.analyze, alert)

    briefing = build_mitre_context(alert)
    
    with open("debug_agent.txt", "a", encoding="utf-8") as f:
        f.write(f"\n--- NEW RUN ---\n")
        f.write(f"ALERT: {json.dumps(alert)}\n")
        f.write(f"BRIEFING:\n{briefing}\n")

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": f"A new security alert has been triggered!\n\n{briefing}\n\nPlease analyze this alert and generate an incident report.\n\nRaw Log Evidence:\n```json\n{json.dumps(alert, indent=2)}\n```"}
    ]

    incident_data = None

    try:
        for _ in range(8):
            msg = await call_llm(messages, tools=TOOLS)
            messages.append(msg)

            if not msg.get("tool_calls"):
                # LLM responded with plain text instead of using tools.
                # Print it so we can debug what the model said.
                print(f"[AGENT] LLM plain-text response (no tool call):\n{msg.get('content', '')}")
                # Do NOT break — give the agent another turn to self-correct.
                # Prompt it explicitly if no tool was called.
                messages.append({
                    "role":    "user",
                    "content": (
                        "You have not called any tool yet. "
                        "Please call `get_recent_alerts` first, then `create_incident` to submit your report. "
                        "Do NOT write the report as plain text."
                    )
                })
                continue

            for tc in msg["tool_calls"]:
                name = tc["function"]["name"]
                try:
                    args = json.loads(tc["function"]["arguments"])
                except (json.JSONDecodeError, KeyError) as e:
                    messages.append({
                        "role":        "tool",
                        "content":     f"Tool call failed — invalid JSON: {e}. Retry with valid JSON.",
                        "tool_call_id": tc.get("id", "unknown")
                    })
                    continue

                if name == "create_incident" and not incident_data:
                    incident_data = args

                res = run_tool(name, args, request.app.state)
                messages.append({
                    "role":         "tool",
                    "tool_call_id": tc["id"],
                    "content":      res
                })

            if incident_data:
                break  # Report saved — exit loop

        if incident_data:
            inc_id = f"INC-MANUAL-{int(time.time())}"
            incident_data["id"] = inc_id
            incident_data["timestamp"] = datetime.datetime.now().isoformat()
            database.save_incident(incident_data)
            return incident_data
        else:
            print("[AGENT] Loop exhausted without create_incident. Full messages:")
            print(json.dumps(messages, indent=2))
            return {"report_markdown": "Agent completed analysis but did not generate a final report."}

    except Exception as e:
        print(f"[AGENT ERROR] {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/api/incidents")
def get_incidents(request: Request):
    return database.get_incidents()

@router.get("/api/incidents/{incident_id}")
def get_incident(incident_id: str, request: Request):
    inc = database.get_incident_by_id(incident_id)
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")
    return inc

if __name__ == "__main__":

    # Test 1 — Benign
    r1 = {
        "verdict": "BENIGN", "attack_type": None, "confidence": 0.0,
        "mitre": {"kill_chain_stage": 0, "kill_chain_name": "No Threat",
                  "tactic": None, "technique": None, "technique_id": None,
                  "description": "Normal traffic."}
    }
    ctx1 = build_mitre_context(r1)
    assert "BENIGN"         in ctx1
    assert "Normal traffic" in ctx1
    print("Test 1 passed - Benign context correct")

    # Test 2 — Critical DDoS
    r2 = {
        "verdict": "ATTACK", "attack_type": "ddos", "confidence": 0.97,
        "zero_day_flag": False, "Flow Bytes/s": 1500000.0,
        "Dst Port": 53, "Protocol": 17,
        "Total Fwd Packets": 5, "Total Backward Packets": 200,
        "mitre": {"tactic": "Impact", "tactic_id": "TA0040",
                  "technique": "Network Denial of Service", "technique_id": "T1498",
                  "sub_technique": "Reflection Amplification", "sub_id": "T1498.002",
                  "kill_chain_stage": 7, "kill_chain_name": "Actions on Objectives",
                  "description": "Adversary attempts to make network resource unavailable."}
    }
    ctx2 = build_mitre_context(r2)
    assert "CRITICAL" in ctx2
    assert "T1498"    in ctx2
    assert "Stage 7"  in ctx2
    print("Test 2 passed - DDoS CRITICAL context correct")

    # Test 3 — SSH anomaly
    r3 = {
        "source": "auth_log", "prediction": "Brute Force", "confidence": 0.92,
        "src_ip": "192.168.1.100", "n_events": 14,
        "mitre": {"tactic": "Credential Access", "tactic_id": "TA0006",
                  "technique": "Brute Force", "technique_id": "T1110",
                  "kill_chain_stage": 4, "kill_chain_name": "Exploitation",
                  "severity": "high",
                  "description": "High-confidence SSH brute force."}
    }
    ctx3 = build_mitre_context(r3)
    assert "192.168.1.100"            in ctx3
    assert "T1110"                    in ctx3
    assert "14 events"                in ctx3
    print("Test 3 passed - SSH anomaly context correct")

    # Test 4 — urgency ladder
    assert _extract_urgency({"mitre": {"kill_chain_stage": 0}}) == "none"
    assert _extract_urgency({"mitre": {"kill_chain_stage": 1}}) == "low"
    assert _extract_urgency({"mitre": {"kill_chain_stage": 3}}) == "medium"
    assert _extract_urgency({"mitre": {"kill_chain_stage": 5}}) == "high"
    assert _extract_urgency({"mitre": {"kill_chain_stage": 7}}) == "critical"
    print("Test 4 passed - urgency ladder correct")

    print("\nAll tests passed.")
