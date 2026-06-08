import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Shield, LayoutDashboard, AlertTriangle, Zap, Brain, Settings } from 'lucide-react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from './ui/command';
import { useWebSocketData } from '../contexts/WebSocketContext';

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { allAlerts } = useWebSocketData();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const runCommand = (command: () => void) => {
    setOpen(false);
    command();
  };

  // Get top 5 recent critical alerts to show in search
  const recentCriticalAlerts = allAlerts
    .filter(a => a.severity === 'critical')
    .slice(0, 5);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search by IP, User, ID..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        
        <CommandGroup heading="Quick Navigation">
          <CommandItem onSelect={() => runCommand(() => navigate('/'))}>
            <LayoutDashboard className="mr-2 h-4 w-4" />
            <span>Dashboard</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate('/alerts'))}>
            <AlertTriangle className="mr-2 h-4 w-4" />
            <span>Alerts Explorer</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate('/simulation'))}>
            <Zap className="mr-2 h-4 w-4" />
            <span>Live Simulation</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate('/models'))}>
            <Brain className="mr-2 h-4 w-4" />
            <span>ML Models</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate('/settings'))}>
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </CommandItem>
        </CommandGroup>

        {recentCriticalAlerts.length > 0 && (
          <CommandGroup heading="Recent Critical Alerts">
            {recentCriticalAlerts.map(alert => (
              <CommandItem 
                key={alert.id} 
                onSelect={() => runCommand(() => navigate(`/alerts/${alert.id}`))}
              >
                <Shield className="mr-2 h-4 w-4 text-destructive" />
                <span className="truncate flex-1">
                  {alert.source === 'insider_threat' 
                    ? `UEBA: ${alert.user_id || alert.id}` 
                    : `Network: ${alert.src_ip || alert.id}`}
                </span>
                <span className="text-xs text-muted-foreground ml-2">
                  {alert.time || alert.window_start}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
