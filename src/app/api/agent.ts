import type { Alert } from '../types';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

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

export async function fetchAlerts(filter: string = 'All'): Promise<Alert[]> {
  const qs = new URLSearchParams();
  if (filter && filter !== 'All') qs.set('filter', filter);
  
  const res = await fetch(`${BASE}/api/alerts?${qs}`, { signal: AbortSignal.timeout(3000) });
  if (!res.ok) throw new Error(`fetchAlerts: HTTP ${res.status}`);
  return res.json();
}

export async function fetchLogs(params: LogsParams = {}): Promise<LogsResponse> {
  const qs = new URLSearchParams();
  (Object.entries(params) as [string, string | number | undefined][]).forEach(([k, v]) => {
    if (v !== undefined && v !== '') qs.set(k, String(v));
  });
  
  const res = await fetch(`${BASE}/api/logs?${qs}`, { signal: AbortSignal.timeout(5000) });
  if (!res.ok) throw new Error(`fetchLogs: HTTP ${res.status}`);
  
  const data = await res.json();
  
  // Backend returns { logs, total, page, pages }
  if (data && Array.isArray(data.logs)) {
    return data as LogsResponse;
  }
  // Fallback if backend returns a flat array
  if (Array.isArray(data)) {
    const page = params.page || 1;
    const limit = params.limit || 50;
    const start = (page - 1) * limit;
    return {
      logs: data.slice(start, start + limit),
      total: data.length,
      page,
      pages: Math.ceil(data.length / limit)
    };
  }
  return data;
}

export interface AgentReport {
  report_markdown: string;
  title: string;
  severity: string;
  correlated_ids?: string[];
  id?: string;
  timestamp?: string;
}

export async function analyzeAlert(
  alertId: string,
  source: string,
  alert?: Record<string, unknown>
): Promise<AgentReport> {
  const res = await fetch(`${BASE}/api/agent/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ alert_id: alertId, source, alert }),
    signal: AbortSignal.timeout(60000), // Agents take time
  });
  if (!res.ok) throw new Error(`analyzeAlert: HTTP ${res.status}`);
  return res.json();
}

export async function controlSimulation(
  type: 'ssh' | 'ueba' | 'network',
  action: 'start' | 'stop',
  params: { delay?: number; scenario?: string } = {}
): Promise<void> {
  let body: any = {};
  if (type === 'network') {
    body = {
      scenario: params.scenario || 'mixed',
      flows_per_second: params.delay ? (1000 / params.delay) : 1.0
    };
  } else {
    body = {
      delay_seconds: params.delay ? (params.delay / 1000) : (type === 'ssh' ? 2.0 : 3.0)
    };
  }

  const res = await fetch(`${BASE}/api/simulate/${type}/${action}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(3000),
  });
  if (!res.ok) throw new Error(`simulation control: HTTP ${res.status}`);
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function sendChatMessage(
  message: string,
  history: ChatMessage[] = [],
  context: Record<string, any> = {}
): Promise<{ answer: string, sources?: any[] }> {
  const res = await fetch(`${BASE}/api/agent/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, history, context }),
    signal: AbortSignal.timeout(60000),
  });
  if (!res.ok) throw new Error(`sendChatMessage: HTTP ${res.status}`);
  return res.json();
}
