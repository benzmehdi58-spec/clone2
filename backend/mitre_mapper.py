# backend/mitre_mapper.py
# MITRE ATT&CK Mapper — Layer 1 (lookup) + Layer 2 (sub-technique) + Layer 3 (kill chain)
# Keyed on normalized attack class names from ThreeStagePipeline

from dataclasses import dataclass
from typing import Optional

@dataclass
class MITREResult:
    tactic:            str
    tactic_id:         str
    technique:         str
    technique_id:      str
    kill_chain_stage:  int
    kill_chain_name:   str
    sub_technique:     Optional[str] = None
    sub_id:            Optional[str] = None
    description:       str = ""

ATTACK_TO_MITRE = {
    "ddos": MITREResult(
        tactic="Impact", tactic_id="TA0040",
        technique="Network Denial of Service", technique_id="T1498",
        kill_chain_stage=7, kill_chain_name="Actions on Objectives",
        description="Attack intended to disrupt availability of a network."
    ),
    "dos": MITREResult(
        tactic="Impact", tactic_id="TA0040",
        technique="Endpoint Denial of Service", technique_id="T1499",
        kill_chain_stage=7, kill_chain_name="Actions on Objectives",
        description="Attack intended to disrupt availability of a host/service."
    ),
    "bruteforce": MITREResult(
        tactic="Credential Access", tactic_id="TA0006",
        technique="Brute Force", technique_id="T1110",
        kill_chain_stage=3, kill_chain_name="Delivery",
        description="Attempt to gain access by guessing credentials."
    ),
    "scanning": MITREResult(
        tactic="Reconnaissance", tactic_id="TA0043",
        technique="Active Scanning", technique_id="T1595",
        kill_chain_stage=1, kill_chain_name="Reconnaissance",
        description="Active probing of infrastructure to gather info."
    ),
    "bot": MITREResult(
        tactic="Command and Control", tactic_id="TA0011",
        technique="Application Layer Protocol", technique_id="T1071",
        kill_chain_stage=6, kill_chain_name="Command & Control",
        description="Traffic communicating with a C2 server via app protocols."
    ),
    "exploits": MITREResult(
        tactic="Initial Access", tactic_id="TA0001",
        technique="Exploit Public-Facing Application", technique_id="T1190",
        kill_chain_stage=3, kill_chain_name="Delivery",
        description="Exploitation of public facing service."
    ),
    # ── Auth Log (SSH) — Model A ──────────────────────────────────────────────
    "invalid_user_scan": MITREResult(
        tactic="Reconnaissance", tactic_id="TA0043",
        technique="Account Discovery", technique_id="T1087",
        kill_chain_stage=1, kill_chain_name="Reconnaissance",
        sub_technique="Local Account", sub_id="T1087.001",
        description="Adversary scanning for valid usernames via invalid SSH login attempts."
    ),
    # ── UEBA Insider Threat — Model B ─────────────────────────────────────────
    "insider_threat": MITREResult(
        tactic="Exfiltration", tactic_id="TA0010",
        technique="Exfiltration Over Alternative Protocol", technique_id="T1048",
        kill_chain_stage=7, kill_chain_name="Actions on Objectives",
        description="Insider threat — anomalous behavioral pattern across logon, device, file, web, and email activity over a 7-day window."
    ),
    "generic": MITREResult(
        tactic="Defense Evasion", tactic_id="TA0005",
        technique="Obfuscated Files or Information", technique_id="T1027",
        kill_chain_stage=4, kill_chain_name="Exploitation",
        description="General suspicious or malicious activity."
    ),
    "benign": MITREResult(
        tactic=None, tactic_id=None,
        technique=None, technique_id=None,
        kill_chain_stage=0, kill_chain_name="No Threat",
        description="Flow classified as normal traffic."
    )
}

def refine_subtechnique(attack_type: str, flow_features: dict) -> tuple[Optional[str], Optional[str]]:
    """
    Returns (sub_technique_name, sub_technique_id) or (None, None)
    Uses raw NetFlow features for Layer 2 refinement.
    """
    protocol    = int(flow_features.get("Protocol", 0))
    dst_port    = int(flow_features.get("Dst Port", 0))
    fwd_pkts    = float(flow_features.get("Total Fwd Packets", 0))
    bwd_pkts    = float(flow_features.get("Total Backward Packets", 0))
    flow_bytes  = float(flow_features.get("Flow Bytes/s", 0))

    if attack_type == "ddos":
        # T1498.001 Direct Network Flood vs T1498.002 Reflection Amplification
        # Reflection: asymmetric packet ratio + amplified response (DNS=53, NTP=123, SSDP=1900)
        if dst_port in (53, 123, 1900, 11211) and bwd_pkts > fwd_pkts * 3:
            return "Reflection Amplification", "T1498.002"
        return "Direct Network Flood", "T1498.001"

    if attack_type == "dos":
        # T1499.002 Service Exhaustion Flood vs T1499.004 Application or System Exploitation
        if flow_bytes > 1_000_000:
            return "Service Exhaustion Flood", "T1499.002"
        return "Application Exhaustion Flood", "T1499.003"

    if attack_type == "bruteforce":
        # T1110.001 Password Guessing vs T1110.003 Password Spraying
        # FTP=21, SSH=22
        if dst_port == 22:
            return "Password Guessing via SSH", "T1110.001"
        if dst_port == 21:
            return "Password Guessing via FTP", "T1110.001"
        return "Credential Stuffing", "T1110.004"

    if attack_type == "scanning":
        # T1595.001 Scanning IP Blocks vs T1595.002 Vulnerability Scanning
        if fwd_pkts < 3 and bwd_pkts == 0:
            return "Scanning IP Blocks", "T1595.001"
        return "Vulnerability Scanning", "T1595.002"

    if attack_type == "bot":
        # T1071.001 Web Protocols vs T1071.004 DNS
        if dst_port in (80, 443, 8080):
            return "Web Protocols C2", "T1071.001"
        if dst_port == 53:
            return "DNS C2", "T1071.004"
        return "Application Layer C2", "T1071.001"

    if attack_type == "exploits":
        # T1190 — no sub-techniques, but check for web vs other
        if dst_port in (80, 443, 8080, 8443):
            return "Web Application Exploit", "T1190"
        return "Network Service Exploit", "T1190"

    return None, None

class MITREMapper:
    """
    Wraps around ThreeStagePipeline output.
    Adds a 'mitre' block to every result dict without breaking existing fields.
    """

    def enrich(self, result: dict, flow_features: dict) -> dict:
        """
        Input:  result dict from ThreeStagePipeline (after .to_dict() conversion)
                flow_features dict with raw NetFlow values
        Output: same dict with 'mitre' key added
        """
        attack_type = result.get("attack_type")  # None for benign
        verdict     = result.get("verdict", "BENIGN")

        # Benign flows get a minimal mitre block
        if verdict == "BENIGN" or attack_type is None:
            result["mitre"] = {
                "verdict":         "BENIGN",
                "tactic":          None,
                "tactic_id":       None,
                "technique":       None,
                "technique_id":    None,
                "sub_technique":   None,
                "sub_id":          None,
                "kill_chain_stage": 0,
                "kill_chain_name": "No Threat",
                "description":     "Flow classified as normal traffic."
            }
            return result

        # Look up the technique
        mitre_data = ATTACK_TO_MITRE.get(attack_type, ATTACK_TO_MITRE["generic"])

        # Layer 2 — refine sub-technique from flow features
        sub_name, sub_id = refine_subtechnique(attack_type, flow_features)
        
        # Avoid mutating the global object by creating a dict
        result["mitre"] = {
            "tactic":           mitre_data.tactic,
            "tactic_id":        mitre_data.tactic_id,
            "technique":        mitre_data.technique,
            "technique_id":     mitre_data.technique_id,
            "sub_technique":    sub_name or mitre_data.sub_technique,
            "sub_id":           sub_id or mitre_data.sub_id,
            "kill_chain_stage": mitre_data.kill_chain_stage,
            "kill_chain_name":  mitre_data.kill_chain_name,
            "description":      mitre_data.description
        }
        return result

    def enrich_batch(self, results: list[dict]) -> list[dict]:
        """Enrich a list of prediction dicts in one call."""
        enriched = []
        for r in results:
            # Extract flow features from the same dict (they were concat'd in Part 1 Fix 1)
            flow_features = {k: v for k, v in r.items()
                             if k not in ("verdict", "attack_type", "confidence",
                                          "zero_day_flag", "attack_probability",
                                          "reconstruction_error", "mitre")}
            enriched.append(self.enrich(r, flow_features))
        return enriched

    def enrich_ssh(self, result: dict) -> dict:
        """Enriches SSH Auth predictions with MITRE context."""
        prediction = result.get("prediction") or "Normal"
        
        if prediction == "Normal" or prediction == "BENIGN":
            result["mitre"] = {
                "tactic":           None,
                "technique":        None,
                "technique_id":     None,
                "kill_chain_stage": 0,
                "kill_chain_name":  "No Threat",
                "severity":         "none",
                "description":      "SSH session follows normal authentication pattern."
            }
            return result
            
        if "Brute Force" in prediction:
            mitre_data = ATTACK_TO_MITRE["bruteforce"]
            severity = "high"
        elif "Invalid User" in prediction:
            mitre_data = ATTACK_TO_MITRE["invalid_user_scan"]
            severity = "medium"
        else:
            mitre_data = ATTACK_TO_MITRE["generic"]
            severity = "low"
            
        result["mitre"] = {
            "tactic":           mitre_data.tactic,
            "tactic_id":        mitre_data.tactic_id,
            "technique":        mitre_data.technique,
            "technique_id":     mitre_data.technique_id,
            "sub_technique":    mitre_data.sub_technique,
            "sub_id":           mitre_data.sub_id,
            "kill_chain_stage": mitre_data.kill_chain_stage,
            "kill_chain_name":  mitre_data.kill_chain_name,
            "description":      mitre_data.description,
            "severity":         severity
        }
        return result

    def enrich_ueba(self, result: dict) -> dict:
        """Enriches UEBA Insider Threat predictions with MITRE context."""
        prediction = result.get("prediction", "Normal")
        
        if prediction == "Normal" or prediction == "BENIGN":
            result["mitre"] = {
                "tactic":           None,
                "technique":        None,
                "technique_id":     None,
                "kill_chain_stage": 0,
                "kill_chain_name":  "No Threat",
                "severity":         "none",
                "description":      "User behavior follows normal baseline."
            }
            return result
            
        mitre_data = ATTACK_TO_MITRE["insider_threat"]
        severity = "critical"
            
        result["mitre"] = {
            "tactic":           mitre_data.tactic,
            "tactic_id":        mitre_data.tactic_id,
            "technique":        mitre_data.technique,
            "technique_id":     mitre_data.technique_id,
            "sub_technique":    mitre_data.sub_technique,
            "sub_id":           mitre_data.sub_id,
            "kill_chain_stage": mitre_data.kill_chain_stage,
            "kill_chain_name":  mitre_data.kill_chain_name,
            "description":      mitre_data.description,
            "severity":         severity
        }
        return result


if __name__ == "__main__":
    mapper = MITREMapper()

    # Test 1 — Benign flow
    r1 = {"verdict": "BENIGN", "attack_type": None, "confidence": 0.0}
    f1 = {"Protocol": 6, "Dst Port": 443, "Total Fwd Packets": 10,
            "Total Backward Packets": 8, "Flow Bytes/s": 5000.0}
    out1 = mapper.enrich(r1, f1)
    print("TEST 1 — BENIGN:")
    print(f"  kill_chain_stage : {out1['mitre']['kill_chain_stage']}")
    print(f"  tactic           : {out1['mitre']['tactic']}")
    assert out1["mitre"]["kill_chain_stage"] == 0

    # Test 2 — DDoS via DNS reflection
    r2 = {"verdict": "ATTACK", "attack_type": "ddos", "confidence": 0.97}
    f2 = {"Protocol": 17, "Dst Port": 53, "Total Fwd Packets": 5,
            "Total Backward Packets": 200, "Flow Bytes/s": 1_500_000.0}
    out2 = mapper.enrich(r2, f2)
    print("\nTEST 2 — DDoS (DNS Reflection):")
    print(f"  technique        : {out2['mitre']['technique_id']}")
    print(f"  sub_technique    : {out2['mitre']['sub_id']}")
    print(f"  kill_chain_stage : {out2['mitre']['kill_chain_stage']}")
    assert out2["mitre"]["technique_id"] == "T1498"
    assert out2["mitre"]["sub_id"]       == "T1498.002"

    # Test 3 — SSH Brute Force
    r3 = {"verdict": "ATTACK", "attack_type": "bruteforce", "confidence": 0.89}
    f3 = {"Protocol": 6, "Dst Port": 22, "Total Fwd Packets": 500,
            "Total Backward Packets": 480, "Flow Bytes/s": 12000.0}
    out3 = mapper.enrich(r3, f3)
    print("\nTEST 3 — SSH Brute Force:")
    print(f"  technique        : {out3['mitre']['technique_id']}")
    print(f"  sub_technique    : {out3['mitre']['sub_id']}")
    print(f"  kill_chain_stage : {out3['mitre']['kill_chain_stage']}")
    assert out3["mitre"]["technique_id"] == "T1110"
    assert out3["mitre"]["sub_id"]       == "T1110.001"

    print("\n✅ All 3 tests passed.")
