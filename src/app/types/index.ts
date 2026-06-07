export interface Alert {
  id: string;
  source: string;            // "SSH" | "UEBA" | "Network" | "auth_log" | "insider_threat"
  time?: string;             // ISO timestamp or "Real-time"
  title?: string;
  reason?: string;
  preview?: string;          // Backend fallback for reason
  label?: string;            // "Anomaly" | "Normal"
  block_id?: string;
  session_key?: string;
  user_id?: string;
  severity?: 'critical' | 'warning' | 'info';
  confidence: number;        // 0–100
  verdict?: 'ATTACK' | 'BENIGN' | 'ZERO_DAY' | 'NORMAL' | 'THREAT';
  prediction?: string;
  attack_type?: string;
  reviewed?: boolean;
  mitre_technique?: string;
  mitre_id?: string;
  mitre?: Record<string, unknown>;
  src_ip?: string;
  event_count?: number;
}
