import { useState, useEffect, useCallback } from 'react';

let ws: WebSocket | null = null;
let isConnecting = false;
let connected = false;
let allAlerts: any[] = [];
let lastAlert: any = null;

const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

let reconnectTimeout: ReturnType<typeof setTimeout>;
let reconnectAttempts = 0;

function connect() {
  if (ws || isConnecting) return;
  isConnecting = true;

  try {
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const wsUrl = baseUrl.replace(/^http/, 'ws') + '/ws/alerts';
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      isConnecting = false;
      connected = true;
      reconnectAttempts = 0;
      notify();
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'ping') {
          return; // Ignore keep-alive
        }
        
        if (message.type === 'new_alert') {
          // Unify the alert object
          const alert = message.data;
          
          // Format based on source
          let formattedAlert: any;
          
          if (alert.source === 'ssh' || alert.source === 'auth_log') {
            formattedAlert = {
              id: alert.id || `SSH-${Date.now()}`,
              time: "Real-time",
              source: "SSH",
              title: "SSH Authentication Anomaly",
              reason: alert.preview || "",
              severity: alert.confidence > 85 ? "critical" : "warning",
              confidence: alert.confidence,
              reviewed: false,
              mitre_technique: alert.mitre?.technique,
              mitre_id: alert.mitre?.technique_id,
              mitre: alert.mitre,
              ...alert,
            };
          } else if (alert.source === 'ueba' || alert.source === 'insider_threat') {
            formattedAlert = {
              id: alert.id || `UEBA-${Date.now()}`,
              time: "Real-time",
              source: "UEBA",
              title: "Insider Threat Detected",
              reason: alert.preview || "",
              severity: alert.confidence > 85 ? "critical" : "warning",
              confidence: alert.confidence,
              reviewed: false,
              mitre_technique: alert.mitre?.technique,
              mitre_id: alert.mitre?.technique_id,
              mitre: alert.mitre,
              ...alert,
            };
          } else {
            formattedAlert = {
              id: alert.id || `FLOW-${Date.now()}`,
              time: "Real-time",
              source: "Network",
              title: alert.zero_day_flag ? "Zero-Day Anomaly" : `${(alert.attack_type || "UNKNOWN").toUpperCase()} Attack Detected`,
              reason: `S1 Prob: ${(alert.attack_probability || 0).toFixed(2)} | Type: ${alert.attack_type}`,
              severity: alert.verdict === "ZERO_DAY" || alert.confidence > 85 ? "critical" : "warning",
              confidence: alert.confidence,
              reviewed: false,
              mitre_technique: alert.mitre?.technique,
              mitre_id: alert.mitre?.technique_id,
              mitre: alert.mitre,
              ...alert,
            };
          }

          lastAlert = formattedAlert;
          allAlerts = [formattedAlert, ...allAlerts].slice(0, 200);
          notify();
        }
      } catch (err) {
        console.error("Error parsing WS message:", err);
      }
    };

    ws.onclose = () => {
      isConnecting = false;
      connected = false;
      ws = null;
      notify();
      
      // Exponential backoff reconnect
      const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
      reconnectAttempts++;
      clearTimeout(reconnectTimeout);
      reconnectTimeout = setTimeout(connect, delay);
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      // onclose will handle reconnect
    };
  } catch (error) {
    isConnecting = false;
    connected = false;
    ws = null;
  }
}

export interface WebSocketData {
  connected: boolean;
  lastAlert: any;
  allAlerts: any[];
  sshAlerts: any[];
  uebaAlerts: any[];
  networkAlerts: any[];
}

export function useWebSocket(): WebSocketData {
  const [, setTick] = useState(0);

  useEffect(() => {
    const listener = () => setTick((t) => t + 1);
    listeners.add(listener);
    
    // Connect on first hook usage
    if (!ws && !isConnecting && !connected) {
      connect();
    }

    return () => {
      listeners.delete(listener);
    };
  }, []);

  const sshAlerts = allAlerts.filter(a => a.source === 'SSH');
  const uebaAlerts = allAlerts.filter(a => a.source === 'UEBA');
  const networkAlerts = allAlerts.filter(a => a.source === 'Network');

  return {
    connected,
    lastAlert,
    allAlerts,
    sshAlerts,
    uebaAlerts,
    networkAlerts
  };
}
