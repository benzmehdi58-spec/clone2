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

# ── B. Model Registry ── (OpenRouter only)
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
OPENROUTER_MODEL = "google/gemini-2.5-flash"

# ── C. Rate Limit Tracker ──
_rate_limited_until: dict = {}

# ── D. call_llm() ── tries both keys, falls back on 402
async def call_llm(messages, tools=None):
    key_names = ["OPENROUTER_API_KEY", "OPENROUTER_API_KEY1"]
    last_error = None

    for key_name in key_names:
        api_key = get_key(key_name)
        if not api_key:
            continue

        payload = {
            "model": OPENROUTER_MODEL,
            "messages": messages,
            "max_tokens": 400,
        }
        if tools:
            payload["tools"] = tools

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                res = await client.post(OPENROUTER_URL, json=payload, headers=headers)

            if res.status_code == 402:
                print(f"[LLM] {key_name} has insufficient credits, trying next key...")
                last_error = f"{key_name}: insufficient credits (402)"
                continue  # try next key

            if res.status_code == 429:
                last_error = f"{key_name}: rate limited (429)"
                continue  # try next key

            if res.status_code != 200:
                last_error = f"{key_name}: error {res.status_code}: {res.text}"
                continue

            data = res.json()
            if not data.get("choices"):
                last_error = f"{key_name}: empty choices in response"
                continue

            print(f"[LLM] Using {key_name} successfully")
            return data["choices"][0]["message"]

        except Exception as e:
            last_error = f"{key_name}: request failed: {e}"
            continue

    raise Exception(f"All OpenRouter keys failed: {last_error}")

# ── E. Tool definitions ──
TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "get_recent_alerts",
            "description": "Fetch recent alerts from HDFS, SSH, UEBA, and/or Network pipelines from the alert buffer",
            "parameters": {
                "type": "object",
                "properties": {
                    "source": {
                        "type": "string",
                        "enum": ["HDFS", "SSH", "UEBA", "Network", "ALL"],
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
    },
    {
        "type": "function",
        "function": {
            "name": "search_knowledge_base",
            "description": "Search the uploaded document knowledge base for CVEs, MITRE techniques, or general security concepts using RAG.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string"}
                },
                "required": ["query"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_database_stats",
            "description": "Get summary statistics of alerts in the SIEM database, including counts by severity and source (e.g. Network, HDFS, SSH, UEBA).",
            "parameters": {"type": "object", "properties": {}}
        }
    }
]

# ── F. Tool executor ──
async def run_tool(name: str, inputs: dict, app_state):
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
            
        elif name == "search_knowledge_base":
            query = inputs.get("query")
            try:
                from analyst_store import retrieve_context
                retrieval = await retrieve_context(query, top_k=3)
                chunks = retrieval.get("chunks", [])
                if not chunks:
                    return json.dumps({"result": "No relevant info found."})
                
                # We return the exact chunk format so agent_chat can parse it for the UI
                return json.dumps({
                    "chunks": [{
                        "filename": c["filename"], 
                        "doc_type": c.get("doc_type", "document"),
                        "similarity": c.get("similarity", 0.0),
                        "snippet": c["snippet"]
                    } for c in chunks]
                })
            except Exception as e:
                return json.dumps({"error": str(e)})
                
        elif name == "get_database_stats":
            try:
                import database
                alerts = database.get_alerts()
                stats = {
                    "total_alerts": len(alerts), 
                    "severities": {"critical": 0, "high": 0, "medium": 0, "low": 0},
                    "sources": {}
                }
                for a in alerts:
                    sev = a.get("severity", "low")
                    if sev in stats["severities"]: stats["severities"][sev] += 1
                    src = a.get("source", "Unknown")
                    if src not in stats["sources"]: stats["sources"][src] = 0
                    stats["sources"][src] += 1
                return json.dumps(stats)
            except Exception as e:
                return json.dumps({"error": str(e)})
            
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
- NEVER override the ML's verdict. If the briefing says VERDICT: ATTACK or VERDICT: THREAT, you MUST generate a full, long, detailed incident report. DO NOT output the "Flow classified as normal" string under ANY circumstances if the verdict is ATTACK.
- If and ONLY if the briefing says VERDICT: BENIGN, you MUST still use the `create_incident` tool, but put the sentence "Flow classified as normal — no action required." inside the `report_markdown` parameter. DO NOT use this sentence for ATTACKs.
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
            {"role": "user", "content": mitre_context}
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
                        
                    res = await run_tool(name, args, app_state)
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
        if not alert.get("prediction"):
            alert["prediction"] = alert.get("attack_type") or alert.get("verdict") or "Normal"
        if not alert.get("verdict"):
            alert["verdict"] = alert["prediction"]
        
        if alert.get("source") in ("Network",):
            alert = mapper.enrich(alert, alert)
        elif alert.get("source") in ("SSH", "auth_log"):
            alert = mapper.enrich_ssh(alert)
        elif alert.get("source") in ("UEBA", "insider_threat"):
            alert = mapper.enrich_ueba(alert)

    if "vulnerability_analysis" not in alert and getattr(request.app.state, "rag_analyzer", None):
        import asyncio
        alert = await asyncio.to_thread(request.app.state.rag_analyzer.analyze, alert)

    mitre_context = build_mitre_context(alert)

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user",   "content": f"Manual investigation requested:\n{mitre_context}"}
    ]

    incident_data = None

    try:
        # ── FAST TRACK DATA GATHERING (No LLM Tool Overhead) ──
        gathered_data_summary = ""
        source = alert.get("source", "")
        
        if source in ("SSH", "auth_log"):
            ip = alert.get("src_ip")
            if ip:
                import sqlite3, os
                db_path = os.path.join(os.path.dirname(__file__), "cyberai.db")
                conn = sqlite3.connect(db_path)
                cursor = conn.cursor()
                try:
                    cursor.execute("SELECT date, hostname, process, message FROM ssh_logs WHERE src_ip = ? LIMIT 30", (ip,))
                    rows = cursor.fetchall()
                    if rows:
                        gathered_data_summary = "\n\nRAW SSH LOGS:\n" + "\n".join([f"{r[0]} {r[1]} {r[2]}: {r[3]}" for r in rows])
                except sqlite3.OperationalError:
                    pass
                finally:
                    conn.close()
                    
        elif source in ("UEBA", "insider_threat"):
            user_id = alert.get("user_id")
            if user_id:
                import sqlite3, os
                db_path = os.path.join(os.path.dirname(__file__), "cyberai.db")
                conn = sqlite3.connect(db_path)
                cursor = conn.cursor()
                try:
                    cursor.execute("SELECT date, log_type, activity, filename, email_to, url FROM ueba_logs WHERE user = ? LIMIT 30", (user_id,))
                    rows = cursor.fetchall()
                    if rows:
                        gathered_data_summary = "\n\nRAW UEBA LOGS:\n" + "\n".join([str(r) for r in rows])
                except sqlite3.OperationalError:
                    pass
                finally:
                    conn.close()
                    
        else:
            # Network flows
            raw = alert.get("raw", "")
            if raw:
                gathered_data_summary = f"\n\nRAW FLOW DATA:\n{raw}"

        # ── FAST REPORT GENERATION (Single Shot LLM Call) ──
        # We MUST use a new message list here
        verdict = alert.get("verdict", "ATTACK")

        report_system = (
            "You are a cybersecurity analyst writing an incident report for a SOC team. "
            "Write clear, structured markdown. No tool calls. No JSON. Just write the report."
        )

        if verdict in ("ATTACK", "ZERO_DAY", "THREAT"):
            attack_type = alert.get("attack_type", "Unknown").upper()
            report_user = (
                f"Write a cybersecurity incident report for this detected attack:\n\n"
                f"VERDICT: {verdict} — {attack_type}\n"
                f"CONFIDENCE: {alert.get('confidence', 0):.1f}%\n"
                f"SOURCE: {alert.get('source', 'Unknown')}\n"
                f"MITRE TACTIC: {alert.get('mitre', {}).get('tactic', 'Unknown')}\n"
                f"MITRE TECHNIQUE: {alert.get('mitre', {}).get('technique', 'Unknown')} "
                f"({alert.get('mitre', {}).get('technique_id', '')})\n"
                f"KILL CHAIN STAGE: {alert.get('mitre', {}).get('kill_chain_stage', '?')}"
                f" — {alert.get('mitre', {}).get('kill_chain_name', '')}\n"
                f"{gathered_data_summary}\n\n"
                f"Write the report using exactly these sections:\n\n"
                f"## Incident Summary\n"
                f"## MITRE ATT&CK Context\n"
                f"## Threat Assessment\n"
                f"## Recommended Actions\n"
                f"## Analyst Notes\n\n"
                f"Keep it under 350 words. Be specific and actionable."
            )
        else:
            report_user = (
                f"This alert has been classified as BENIGN with "
                f"{alert.get('confidence', 0):.1f}% confidence. "
                f"Write a one-paragraph summary confirming no action is required."
            )

        report_messages = [
            {"role": "system", "content": report_system},
            {"role": "user",   "content": report_user},
        ]

        final_msg = await call_llm(report_messages, tools=None)
        report_md = (final_msg.get("content") or "").strip()
        print(f"[AGENT] Phase 2 report length: {len(report_md)} chars")

        if not report_md:
            report_md = (
                f"## Incident Summary\nThe ML pipeline detected a **{verdict}** event "
                f"({alert.get('attack_type', 'unknown attack')}) with "
                f"{alert.get('confidence', 0):.1f}% confidence. "
                f"Manual analyst review required."
            )

        # Determine severity from verdict
        severity_map = {"ZERO_DAY": "critical", "ATTACK": "high", "THREAT": "medium"}
        severity = severity_map.get(verdict, "low")
        if alert.get("severity") == "critical":
            severity = "critical"

        inc_id = f"INC-MANUAL-{int(time.time())}"
        incident_data = {
            "id":             inc_id,
            "title":          alert.get("title") or f"{alert.get('attack_type','Unknown').upper()} Detected",
            "severity":       severity,
            "report_markdown": report_md,
            "correlated_ids": [alert.get("id", "")],
            "timestamp":      datetime.datetime.now().isoformat(),
        }
        database.save_incident(incident_data)
        print(f"[AGENT] Report generated successfully for {alert.get('id')}")
        return incident_data

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

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatAgentRequest(BaseModel):
    message: str
    context: dict = {}
    history: list[ChatMessage] = []

AGENT_CHAT_PROMPT = """You are CyberAI — an expert AI security analyst embedded in a Security Operations Center (SOC).
You have access to real-time tools to query the SIEM database, SSH logs, UEBA logs, network flows, and a RAG knowledge base.
You are currently chatting directly with a human SOC analyst.

UI Context:
{ui_context}

RULES:
1. Always use tools to verify information before making claims about the SIEM state.
2. If asked about general security (CVEs, MITRE), use `search_knowledge_base`.
3. If asked about current alerts or stats, use `get_database_stats` or `get_recent_alerts`.
4. If investigating an IP or User, use `get_ssh_auth_session` or `get_ueba_user_behavior`. If investigating HDFS, rely on the alert data from `get_recent_alerts`.
5. Keep your answers concise, professional, and directly address the user's question.
6. Do NOT use `create_incident` unless explicitly asked to generate an incident report.
"""

@router.post("/api/agent/chat")
async def agent_chat(req: ChatAgentRequest, request: Request):
    app_state = request.app.state
    
    ctx_str = "No specific UI context provided."
    if req.context:
        ctx_str = json.dumps(req.context, indent=2)
        
    system_prompt = AGENT_CHAT_PROMPT.replace("{ui_context}", ctx_str)
    
    messages = [{"role": "system", "content": system_prompt}]
    
    for msg in req.history:
        messages.append({"role": msg.role, "content": msg.content})
        
    messages.append({"role": "user", "content": req.message})
    
    try:
        for _ in range(8):
            msg = await call_llm(messages, tools=TOOLS)
            messages.append(msg)
            
            if msg.get("tool_calls"):
                for tc in msg["tool_calls"]:
                    name = tc["function"]["name"]
                    try:
                        args = json.loads(tc["function"]["arguments"])
                    except Exception as e:
                        messages.append({
                            "role": "tool",
                            "content": f"JSON error: {e}",
                            "tool_call_id": tc["id"]
                        })
                        continue
                        
                    res = await run_tool(name, args, app_state)
                    messages.append({
                        "role": "tool",
                        "content": res,
                        "tool_call_id": tc["id"]
                    })
            else:
                break
                
        final_answer = ""
        for m in reversed(messages):
            if m.get("role") == "assistant" and m.get("content"):
                final_answer = m["content"]
                break
                
        if not final_answer:
            final_answer = "I've completed the tool calls, but did not generate a final text response."
            
        # Extract sources if search_knowledge_base was used
        sources = []
        for m in messages:
            if m.get("role") == "tool":
                try:
                    data = json.loads(m["content"])
                    if "chunks" in data:
                        sources.extend(data["chunks"])
                except:
                    pass
            
        return {"answer": final_answer, "sources": sources}
        
    except Exception as e:
        print(f"Chat agent error: {e}")
        return {"answer": f"Error: {str(e)}", "sources": []}

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
