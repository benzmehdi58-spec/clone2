import { useState, useEffect, useRef, useCallback } from 'react';
import type { Alert } from '../types';

export interface WebSocketData {
  connected: boolean;
  allAlerts: Alert[];
  sshAlerts: Alert[];
  uebaAlerts: Alert[];
  networkAlerts: Alert[];
}

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws/alerts';
const MAX_ALERTS = 500;

export function useWebSocket(): WebSocketData {
  const [connected, setConnected] = useState(false);
  const [allAlerts, setAllAlerts] = useState<Alert[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const connectedRef = useRef(false);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = async () => {
        connectedRef.current = true;
        setConnected(true);
        // Pre-load historical alerts
        try {
          const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
          const res = await fetch(`${BASE}/api/logs?limit=100`);
          if (res.ok) {
            const history = await res.json();
            if (history && Array.isArray(history.logs)) {
              const normalized = history.logs.map((l: Alert & { block_id?: string }) => ({
                ...l,
                id: l.id || l.block_id || `log-${Math.random()}`,
              }));
              setAllAlerts(normalized.slice(0, MAX_ALERTS));
            }
          }
        } catch (e) {
          console.error("Failed to load initial alerts:", e);
        }
      };

      ws.onmessage = ({ data }) => {
        try {
          const parsed = JSON.parse(data);
          // Ignore keepalive pings from server
          if (parsed?.type === 'ping') return;
          if (Array.isArray(parsed)) {
            setAllAlerts(parsed.slice(0, MAX_ALERTS));
          } else if (parsed?.type === "new_alert" && parsed?.data) {
            const alert = parsed.data as Alert;
            // Normalize: use block_id as fallback for id
            if (!alert.id && (alert as any).block_id) alert.id = (alert as any).block_id;
            setAllAlerts(prev => [alert, ...prev].slice(0, MAX_ALERTS));
          } else if (parsed?.id || (parsed as any)?.block_id || parsed?.source) {
            // Normalize: use block_id as fallback for id
            if (!parsed.id) parsed.id = (parsed as any).block_id;
            setAllAlerts(prev => [parsed as Alert, ...prev].slice(0, MAX_ALERTS));
          }
        } catch { /* ignore malformed frames */ }
      };

      ws.onclose = () => {
        connectedRef.current = false;
        setConnected(false);
        reconnectRef.current = setTimeout(connect, 3000);
      };

      ws.onerror = () => ws.close();
    } catch {
      reconnectRef.current = setTimeout(connect, 3000);
    }
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  return {
    connected,
    allAlerts,
    sshAlerts: allAlerts.filter(a => a.source === 'SSH' || a.source === 'auth_log'),
    uebaAlerts: allAlerts.filter(a => a.source === 'UEBA' || a.source === 'insider_threat'),
    networkAlerts: allAlerts.filter(a => a.source === 'Network' || a.source === 'network'),
  };
}
