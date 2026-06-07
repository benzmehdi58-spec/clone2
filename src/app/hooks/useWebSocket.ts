import { useState, useEffect, useRef, useCallback } from 'react';
import type { Alert } from '../types';
import { MOCK_ALERTS, generateStreamAlert } from '../data/mockAlerts';

export interface WebSocketData {
  connected: boolean;
  allAlerts: Alert[];
  sshAlerts: Alert[];
  uebaAlerts: Alert[];
  networkAlerts: Alert[];
}

const WS_URL = import.meta.env.PROD 
  ? 'wss://benzmehdi-cyber.hf.space/ws/alerts' 
  : 'ws://localhost:8000/ws/alerts';
const MAX_ALERTS = 500;

export function useWebSocket(): WebSocketData {
  const [connected, setConnected] = useState(false);
  const [allAlerts, setAllAlerts] = useState<Alert[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mockSeedRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mockStreamRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const connectedRef = useRef(false);

  const stopMock = useCallback(() => {
    if (mockSeedRef.current) { clearTimeout(mockSeedRef.current); mockSeedRef.current = null; }
    if (mockStreamRef.current) { clearInterval(mockStreamRef.current); mockStreamRef.current = null; }
  }, []);

  const startMock = useCallback(() => {
    // Seed after 1.2 s if still not connected to real backend
    mockSeedRef.current = setTimeout(() => {
      if (connectedRef.current) return;
      setAllAlerts(MOCK_ALERTS.slice());

      // Stream a new alert every 4 s while disconnected
      mockStreamRef.current = setInterval(() => {
        if (connectedRef.current) { stopMock(); return; }
        setAllAlerts(prev => [generateStreamAlert(), ...prev].slice(0, MAX_ALERTS));
      }, 4000);
    }, 1200);
  }, [stopMock]);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        connectedRef.current = true;
        setConnected(true);
        stopMock();
      };

      ws.onmessage = ({ data }) => {
        try {
          const parsed = JSON.parse(data);
          if (Array.isArray(parsed)) {
            setAllAlerts(parsed.slice(0, MAX_ALERTS));
          } else if (parsed?.id) {
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
  }, [stopMock]);

  useEffect(() => {
    startMock();
    connect();
    return () => {
      stopMock();
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      wsRef.current?.close();
    };
  }, [connect, startMock, stopMock]);

  return {
    connected,
    allAlerts,
    sshAlerts: allAlerts.filter(a => a.source === 'SSH'),
    uebaAlerts: allAlerts.filter(a => a.source === 'UEBA'),
    networkAlerts: allAlerts.filter(a => a.source === 'Network'),
  };
}
