import { Link, useLocation } from 'react-router';
import { Shield, LayoutDashboard, AlertTriangle, Zap, Wifi, WifiOff, Brain, Settings, LogOut, Sun, Moon } from 'lucide-react';
import { useWebSocketData } from '../../contexts/WebSocketContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';

const NAV = [
  { to: '/',           label: 'Dashboard',    icon: LayoutDashboard },
  { to: '/alerts',     label: 'Alerts',        icon: AlertTriangle },
  { to: '/simulation', label: 'Simulation',    icon: Zap },
  { to: '/models',     label: 'ML Models',     icon: Brain },
];

export function TopNav() {
  const { pathname } = useLocation();
  const { connected, allAlerts } = useWebSocketData();
  const { theme, setTheme } = useTheme();
  const { logout } = useAuth();
  const threatCount = allAlerts.filter(
    a => a.verdict === 'ATTACK' || a.verdict === 'ZERO_DAY'
  ).length;

  return (
    <nav className="fixed top-0 inset-x-0 z-50 h-16 flex items-center px-6 bg-background/90 backdrop-blur-md border-b border-border transition-colors duration-200">
      {/* Logo */}
      <Link to="/" className="flex items-center gap-2.5 mr-8 shrink-0 select-none">
        <Shield
          className="w-7 h-7 text-destructive"
          style={{ filter: 'drop-shadow(0 0 8px rgba(227,0,15,0.7))' }}
        />
        <span className="font-bold text-[15px] tracking-tight text-foreground">
          Cyber<span className="text-destructive">AI</span>
        </span>
      </Link>

      {/* Nav links */}
      <div className="flex items-center gap-0.5 flex-1">
        {NAV.map(({ to, label, icon: Icon }) => {
          const active = to === '/'
            ? pathname === '/' || pathname === ''
            : pathname.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                active 
                  ? "bg-destructive/10 text-destructive border border-destructive/25" 
                  : "text-muted-foreground border border-transparent hover:text-foreground"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          );
        })}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2">
        {/* Threat count pill */}
        {threatCount > 0 && (
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
            style={{ background: 'rgba(227,0,15,0.1)', border: '1px solid rgba(227,0,15,0.25)' }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#E3000F] animate-pulse-red" />
            <span className="text-[#E3000F] text-xs font-semibold">{threatCount} Active</span>
          </div>
        )}

        {/* Connection status */}
        <div
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
          style={connected
            ? { background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.25)' }
            : { background: 'rgba(48,54,61,0.3)',   border: '1px solid #30363D' }
          }
        >
          {connected
            ? <Wifi className="w-3.5 h-3.5 text-emerald-400" />
            : <WifiOff className="w-3.5 h-3.5 text-muted-foreground" />
          }
          <span className={`text-xs font-medium ${connected ? 'text-emerald-400' : 'text-muted-foreground'}`}>
            {connected ? 'Live' : 'Demo'}
          </span>
        </div>

        {/* Theme toggle */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-200"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Settings icon */}
        <Link
          to="/settings"
          className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200 ${
            pathname === '/settings'
              ? 'bg-destructive/10 text-destructive border border-destructive/25'
              : 'text-muted-foreground border border-transparent hover:text-foreground'
          }`}
        >
          <Settings className="w-4 h-4" />
        </Link>

        {/* Logout icon */}
        <button
          onClick={logout}
          title="Sign out"
          className="flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200 text-muted-foreground border border-transparent hover:text-destructive hover:bg-destructive/10"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </nav>
  );
}
