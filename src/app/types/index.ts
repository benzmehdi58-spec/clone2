export interface Alert {
  id: string;
  source: string;           // "SSH" | "UEBA" | "Network"
  time: string;             // ISO timestamp or "Real-time"
  title: string;
  reason: string;
  severity: 'critical' | 'warning' | 'info';
  confidence: number;       // 0–100
  verdict?: 'ATTACK' | 'BENIGN' | 'ZERO_DAY';
  prediction?: string;
  attack_type?: string;
  reviewed: boolean;
  mitre_technique?: string;
  mitre_id?: string;
}
