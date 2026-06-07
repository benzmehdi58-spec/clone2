import { createContext, useContext, type ReactNode } from 'react';
import { useWebSocket, type WebSocketData } from '../hooks/useWebSocket';

const WebSocketContext = createContext<WebSocketData>({
  connected: false,
  allAlerts: [],
  sshAlerts: [],
  uebaAlerts: [],
  networkAlerts: [],
});

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const data = useWebSocket();
  return (
    <WebSocketContext.Provider value={data}>
      {children}
    </WebSocketContext.Provider>
  );
}

export const useWebSocketData = () => useContext(WebSocketContext);
