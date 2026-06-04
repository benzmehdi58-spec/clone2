# backend/rag_analyzer.py
"""
RAGAnalyzer — LLM synthesis layer for vulnerability intelligence.
Called after MITRE mapper, before the ReAct agent.
Uses the existing rag_manager ChromaDB instance for retrieval.
Synthesizes retrieved chunks into structured vulnerability_analysis{} JSON.
"""
import os
import json
import time
import asyncio
from anthropic import Anthropic

RAG_SYSTEM_PROMPT = """You are a vulnerability intelligence analyst in a Security Operations Center.

You receive a security detection with MITRE ATT&CK context and retrieved vulnerability intelligence chunks.
Synthesize the chunks into a structured vulnerability analysis report.

CRITICAL RULES:
- Return ONLY valid JSON — no markdown, no preamble, no explanation outside the JSON
- Only reference CVE IDs that appear in the retrieved chunks — never hallucinate CVE IDs
- If no CVEs are found in the chunks, return an empty cve_ids list
- Keep summary under 3 sentences
- Remediation steps must be specific and actionable
- Always reference the MITRE technique ID in the summary

Return exactly this JSON schema:
{
  "summary": "string",
  "cve_ids": ["CVE-YYYY-NNNNN"],
  "cvss_max": 0.0,
  "affected_systems": ["string"],
  "remediation_steps": ["string"],
  "analyst_notes": "string",
  "sources": ["string"]
}"""


class RAGAnalyzer:

    def __init__(self, rag_manager_instance):
        """
        Accepts the existing global rag_manager instance from rag_manager.py.
        Uses its .db (ChromaDB) for retrieval.
        """
        self.rag_manager = rag_manager_instance
        self.client      = Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY", ""))
        self.ready       = rag_manager_instance is not None
        if self.ready:
            print("[RAGAnalyzer] Ready — synthesis layer active")
        else:
            print("[RAGAnalyzer] WARNING — rag_manager unavailable, analysis degraded")

    def analyze(self, enriched_detection: dict) -> dict:
        """
        Main entry point. Adds vulnerability_analysis{} to the detection dict.
        Never raises — always returns the dict even if analysis fails.
        """
        start_ms = int(time.time() * 1000)

        # Skip benign flows
        verdict = (
            enriched_detection.get("verdict") or
            enriched_detection.get("prediction", "")
        )
        if verdict in ("BENIGN", "Normal"):
            enriched_detection["vulnerability_analysis"] = self._empty(
                "Benign traffic — no vulnerability analysis required.", start_ms
            )
            return enriched_detection

        # Skip if not ready
        if not self.ready:
            enriched_detection["vulnerability_analysis"] = self._empty(
                "RAG knowledge base unavailable — run: python rag_manager.py", start_ms
            )
            return enriched_detection

        try:
            query  = self._build_query(enriched_detection)
            chunks = self._retrieve_chunks(query)
            result = self._synthesize(enriched_detection, chunks)
            result["analysis_time_ms"] = int(time.time() * 1000) - start_ms
            enriched_detection["vulnerability_analysis"] = result

        except Exception as e:
            print(f"[RAGAnalyzer] Analysis failed: {e}")
            enriched_detection["vulnerability_analysis"] = self._empty(
                f"Analysis error: {str(e)[:100]}", start_ms
            )

        return enriched_detection

    def _build_query(self, detection: dict) -> str:
        mitre        = detection.get("mitre", {})
        attack_type  = detection.get("attack_type", "unknown") or "unknown"
        technique_id = mitre.get("technique_id", "")
        technique    = mitre.get("technique", "")
        tactic       = mitre.get("tactic", "")
        sub          = mitre.get("sub_technique", "")
        parts        = [p for p in [attack_type, technique_id, technique, tactic, sub] if p]
        return " ".join(parts)

    def _retrieve_chunks(self, query: str) -> list[str]:
        try:
            raw = self.rag_manager.retrieve_context(query)
            if not raw:
                return []
            # retrieve_context returns a string — split into chunks
            return [raw] if isinstance(raw, str) else raw
        except Exception as e:
            print(f"[RAGAnalyzer] Retrieval failed: {e}")
            return []

    def _synthesize(self, detection: dict, chunks: list) -> dict:
        mitre = detection.get("mitre", {})

        # Confidence display
        raw_conf = float(detection.get("confidence", 0.0))
        conf_pct = raw_conf if raw_conf > 1.0 else raw_conf * 100

        # Format chunks
        if chunks:
            chunks_text = "\n\n".join([
                f"[{i+1}] {str(c)[:400]}"
                for i, c in enumerate(chunks)
            ])
        else:
            chunks_text = "No specific vulnerability intelligence found."

        user_msg = f"""DETECTION:
Verdict: {detection.get('verdict') or detection.get('prediction', 'ATTACK')}
Attack Type: {detection.get('attack_type', 'unknown')}
Confidence: {conf_pct:.1f}%
MITRE Technique: {mitre.get('technique', 'Unknown')} ({mitre.get('technique_id', '')})
MITRE Tactic: {mitre.get('tactic', 'Unknown')} ({mitre.get('tactic_id', '')})
Sub-Technique: {mitre.get('sub_technique') or 'None'}
Kill Chain Stage: {mitre.get('kill_chain_stage', 0)} — {mitre.get('kill_chain_name', '')}

RETRIEVED INTELLIGENCE ({len(chunks)} chunks):
{chunks_text}

Synthesize the above into a vulnerability analysis JSON report."""

        response = self.client.messages.create(
            model      = "claude-3-5-sonnet-20240620", # updated model string to standard claude-3.5
            max_tokens = 1024,
            system     = RAG_SYSTEM_PROMPT,
            messages   = [{"role": "user", "content": user_msg}]
        )

        raw_text = response.content[0].text.strip()
        raw_text = raw_text.replace("```json", "").replace("```", "").strip()

        result = json.loads(raw_text)
        return result

    def _empty(self, summary: str, start_ms: int) -> dict:
        return {
            "summary":           summary,
            "cve_ids":           [],
            "cvss_max":          0.0,
            "affected_systems":  [],
            "remediation_steps": [],
            "analyst_notes":     "",
            "sources":           [],
            "analysis_time_ms":  int(time.time() * 1000) - start_ms
        }
