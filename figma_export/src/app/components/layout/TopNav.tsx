import { Link, useLocation } from 'react-router';
import { Shield, LayoutDashboard, AlertTriangle, Zap, Wifi, WifiOff, Brain, Settings, LogIn, ScrollText } from 'lucide-react';
import { useWebSocketData } from '../../contexts/WebSocketContext';

const NAV = [
  { to: '/',           label: 'Dashboard',    icon: LayoutDashboard },
  { to: '/logs',       label: 'Log Explorer', icon: ScrollText },
  { to: '/alerts',     label: 'Alerts',       icon: AlertTriangle },
  { to: '/simulation', label: 'Simulation',   icon: Zap },
  { to: '/models',     label: 'ML Models',    icon: Brain },
];

export function TopNav() {
  const { pathname } = useLocation();
  const { connected, allAlerts } = useWebSocketData();
  const threatCount = allAlerts.filter(
    a => a.verdict === 'ATTACK' || a.verdict === 'ZERO_DAY'
  ).length;

  return (
    <nav
      className="fixed top-0 inset-x-0 z-50 h-16 flex items-center px-6"
      style={{
        background: 'rgba(13,17,23,0.92)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(48,54,61,0.8)',
      }}
    >
      {/* Logo */}
      <Link to="/" className="flex items-center gap-2.5 mr-8 shrink-0 select-none">
        <Shield
          className="w-7 h-7 text-[#E3000F]"
          style={{ filter: 'drop-shadow(0 0 8px rgba(227,0,15,0.7))' }}
        />
        <span className="font-bold text-[15px] tracking-tight text-[#F0F6FC]">
          Cyber<span className="text-[#E3000F]">AI</span>
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
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200"
              style={active ? {
                background: 'rgba(227,0,15,0.1)',
                color: '#E3000F',
                border: '1px solid rgba(227,0,15,0.25)',
              } : {
                color: '#8B949E',
                border: '1px solid transparent',
              }}
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
            : <WifiOff className="w-3.5 h-3.5 text-[#8B949E]" />
          }
          <span className={`text-xs font-medium ${connected ? 'text-emerald-400' : 'text-[#8B949E]'}`}>
            {connected ? 'Live' : 'Demo'}
          </span>
        </div>

        {/* Settings icon */}
        <Link
          to="/settings"
          className="flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200"
          style={pathname === '/settings'
            ? { background: 'rgba(227,0,15,0.1)', color: '#E3000F', border: '1px solid rgba(227,0,15,0.25)' }
            : { color: '#8B949E', border: '1px solid transparent' }
          }
        >
          <Settings className="w-4 h-4" />
        </Link>

        {/* Login icon */}
        <Link
          to="/login"
          className="flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200"
          style={pathname === '/login'
            ? { background: 'rgba(77,171,247,0.1)', color: '#4DABF7', border: '1px solid rgba(77,171,247,0.25)' }
            : { color: '#8B949E', border: '1px solid transparent' }
          }
        >
          <LogIn className="w-4 h-4" />
        </Link>
      </div>
    </nav>
  );
}
