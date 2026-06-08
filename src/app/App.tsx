import { HashRouter, Routes, Route } from 'react-router';
import { WebSocketProvider } from './contexts/WebSocketContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import { AppShell } from './components/layout/AppShell';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Dashboard } from './pages/Dashboard';
import { AlertsExplorer } from './pages/AlertsExplorer';
import { AlertDetail } from './pages/AlertDetail';
import { LiveSimulation } from './pages/LiveSimulation';
import { ModelPerformance } from './pages/ModelPerformance';
import { Settings } from './pages/Settings';
import { Login } from './pages/Login';
import { Toaster } from './components/ui/sonner';

export default function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <AuthProvider>
        <WebSocketProvider>
          <HashRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route element={<ProtectedRoute />}>
                <Route element={<AppShell />}>
                  <Route index element={<Dashboard />} />
                  <Route path="alerts" element={<AlertsExplorer />} />
                  <Route path="alerts/:id" element={<AlertDetail />} />
                  <Route path="simulation" element={<LiveSimulation />} />
                  <Route path="models" element={<ModelPerformance />} />
                  <Route path="settings" element={<Settings />} />
                </Route>
              </Route>
            </Routes>
          </HashRouter>
      <Toaster
        theme="dark"
        toastOptions={{
          style: {
            background: '#161B22',
            border: '1px solid #30363D',
            color: '#F0F6FC',
          },
        }}
      />
        </WebSocketProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
