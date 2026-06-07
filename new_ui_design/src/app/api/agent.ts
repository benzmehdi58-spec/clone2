import type { Alert } from '../types';
import { getMockLogsResponse, getMockReport } from '../data/mockAlerts';

const BASE = 'http://localhost:8000';

export interface LogsParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;  // "all" | "ATTACK" | "BENIGN" | "ZERO_DAY"
  source?: string;  // "all" | "SSH" | "UEBA" | "Network"
}

export interface LogsResponse {
  logs: Alert[];
  total: number;
  page: number;
  pages: number;
}

export async function fetchLogs(params: LogsParams = {}): Promise<LogsResponse> {
  try {
    const qs = new URLSearchParams();
    (Object.entries(params) as [string, string | number | undefined][]).forEach(([k, v]) => {
      if (v !== undefined && v !== '') qs.set(k, String(v));
    });
    const res = await fetch(`${BASE}/api/alerts?${qs}`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) throw new Error(`fetchLogs: HTTP ${res.status}`);
    return res.json();
  } catch {
    return getMockLogsResponse(params);
  }
}

export async function analyzeAlert(
  alertId: string,
  source: string,
  alert?: Record<string, unknown>
): Promise<{ report: string }> {
  try {
    const res = await fetch(`${BASE}/api/agent/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ alertId, source, alert }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`analyzeAlert: HTTP ${res.status}`);
    return res.json();
  } catch {
    return { report: getMockReport(alertId, source) };
  }
}

export async function controlSimulation(
  type: 'ssh' | 'ueba' | 'network',
  action: 'start' | 'stop',
  params: { delay?: number; scenario?: string } = {}
): Promise<void> {
  try {
    const res = await fetch(`${BASE}/api/simulation/${type}/${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) throw new Error(`simulation control: HTTP ${res.status}`);
  } catch {
    // Backend not available — simulation runs in demo mode via mock stream
  }
}
