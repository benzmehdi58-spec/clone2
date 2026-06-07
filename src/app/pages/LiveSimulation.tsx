import { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { Activity, AlertTriangle, Globe, Server, Play, Square, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Switch } from '@/app/components/ui/switch';
import { Slider } from '@/app/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { useWebSocketData } from '../contexts/WebSocketContext';
import { controlSimulation } from '../api/agent';
import { MetricCard } from '../components/MetricCard';
import { NetworkCanvas } from '../components/NetworkCanvas';
import type { Alert } from '../types';

/* ─── Terminal feed component ─── */
function TerminalFeed({
  title,
  lines,
  colorFn,
}: {
  title: string;
  lines: string[];
  colorFn: (line: string) => string;
}) {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lines]);

  return (
    <div className="glass-card rounded-xl overflow-hidden flex flex-col h-56">
      {/* Terminal title bar */}
      <div className="px-4 py-2.5 flex items-center gap-2 shrink-0"
        style={{ borderBottom: '1px solid rgba(48,54,61,0.6)', background: 'rgba(13,17,23,0.7)' }}>
        <span className="flex gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#E3000F]/50" />
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400/50" />
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/50" />
        </span>
        <span className="text-[#8B949E] text-xs terminal-font ml-1">{title}</span>
        <span className="ml-auto w-1.5 h-3 bg-[#8B949E] animate-blink rounded-sm" />
      </div>
      {/* Feed body */}
      <div className="flex-1 overflow-y-auto p-3" style={{ background: 'rgba(9,12,16,0.7)' }}>
        {lines.map((line, i) => (
          <div key={i} className="terminal-font text-[11px] leading-5" style={{ color: colorFn(line) }}>
            {line}
          </div>
        ))}
        <div ref={endRef} />
      </div>
    </div>
  );
}

/* ─── Control card ─── */
interface SimControl {
  active: boolean;
  delay: number;
  loading: boolean;
}

function ControlCard({
  title,
  icon: Icon,
  type,
  ctrl,
  onToggle,
  onDelayChange,
  extra,
}: {
  title: string;
  icon: typeof Play;
  type: 'ssh' | 'ueba' | 'network';
  ctrl: SimControl;
  onToggle: (active: boolean) => void;
  onDelayChange: (v: number) => void;
  extra?: React.ReactNode;
}) {
  return (
    <div
      className="glass-card rounded-xl p-4 transition-all duration-300"
      style={ctrl.active ? {
        boxShadow: '0 0 20px rgba(227,0,15,0.12)',
        borderColor: 'rgba(227,0,15,0.2)',
      } : {}}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg" style={{ background: ctrl.active ? 'rgba(227,0,15,0.1)' : 'rgba(48,54,61,0.5)' }}>
            <Icon className="w-4 h-4" style={{ color: ctrl.active ? '#E3000F' : '#8B949E' }} />
          </div>
          <div>
            <p className="text-[#F0F6FC] text-sm font-semibold">{title}</p>
            <p className="text-[#8B949E] text-[10px]">{ctrl.active ? 'Streaming…' : 'Idle'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {ctrl.loading && <Loader2 className="w-3.5 h-3.5 text-[#8B949E] animate-spin" />}
          <Switch
            checked={ctrl.active}
            onCheckedChange={onToggle}
            className="data-[state=checked]:bg-[#E3000F]"
          />
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-[#8B949E]">Log delay</span>
            <span className="text-[#F0F6FC] terminal-font">{ctrl.delay}ms</span>
          </div>
          <Slider
            value={[ctrl.delay]}
            onValueChange={([v]) => onDelayChange(v)}
            min={100} max={2000} step={100}
            disabled={!ctrl.active}
            className="[&_[role=slider]]:bg-[#E3000F] [&_[role=slider]]:border-[#E3000F] disabled:opacity-40"
          />
        </div>
        {extra}
      </div>
    </div>
  );
}

/* ─── Main page ─── */
export function LiveSimulation() {
  const { allAlerts, sshAlerts, uebaAlerts, networkAlerts } = useWebSocketData();

  const attackAlerts  = allAlerts.filter(a => a.verdict === 'ATTACK' || a.verdict === 'ZERO_DAY');
  const prevLenRef    = useRef(0);

  // Cumulative simulation counters (track totals since page mount)
  const [totals, setTotals] = useState({ simulated: 0, caught: 0 });
  useEffect(() => {
    const newCount = allAlerts.length - prevLenRef.current;
    if (newCount > 0) {
      const incoming = allAlerts.slice(0, newCount);
      const newCaught = incoming.filter(a => a.verdict === 'ATTACK' || a.verdict === 'ZERO_DAY').length;
      setTotals(prev => ({ simulated: prev.simulated + newCount, caught: prev.caught + newCaught }));
      prevLenRef.current = allAlerts.length;
    }
  }, [allAlerts]);

  // Control states — start as active=true to match the backend auto-start
  const [ssh, setSsh]         = useState<SimControl>({ active: true,  delay: 500,  loading: false });
  const [ueba, setUeba]       = useState<SimControl>({ active: true,  delay: 800,  loading: false });
  const [net, setNet]         = useState<SimControl>({ active: true,  delay: 300,  loading: false });
  const [scenario, setScenario] = useState('mixed');

  // Sync actual backend state on mount
  useEffect(() => {
    const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    fetch(`${BASE}/api/simulate/status/all`, { signal: AbortSignal.timeout(3000) })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return;
        if (data.ssh)     setSsh(p  => ({ ...p, active: data.ssh.active  ?? p.active  }));
        if (data.ueba)    setUeba(p => ({ ...p, active: data.ueba.active  ?? p.active  }));
        if (data.network) setNet(p  => ({ ...p, active: data.network.active ?? p.active }));
      })
      .catch(() => { /* backend not ready yet — keep defaults */ });
  }, []);

  async function handleToggle(
    type: 'ssh' | 'ueba' | 'network',
    next: boolean,
    setter: React.Dispatch<React.SetStateAction<SimControl>>,
    delay: number
  ) {
    setter(p => ({ ...p, loading: true }));
    try {
      await controlSimulation(type, next ? 'start' : 'stop', {
        delay,
        scenario: type === 'network' ? scenario : undefined,
      });
      setter(p => ({ ...p, active: next, loading: false }));
      toast.success(`${type.toUpperCase()} replay ${next ? 'started' : 'stopped'}`);
    } catch (e) {
      setter(p => ({ ...p, loading: false }));
      toast.error(`Control failed: ${(e as Error).message}`);
    }
  }


  // Build terminal feed lines from live alerts
  const formatRaw = (a: Alert) =>
    `[${a.time ?? new Date().toISOString()}] ${a.source ?? '?'} | ${a.id ?? '?'} | ${(a.reason ?? a.preview ?? a.title ?? '').slice(0, 70)}`;

  const formatVerdict = (a: Alert) =>
    `[${a.time ?? '?'}] ${(a.id ?? '?').padEnd(14)} → ${a.verdict ?? 'PENDING'} (${Number(a.confidence ?? 0).toFixed(1)}%)`;

  const verdictColor = (line: string) =>
    line.includes('ATTACK') || line.includes('ZERO_DAY') ? '#E3000F'
    : line.includes('BENIGN') ? '#34D399'
    : '#8B949E';

  const feedLines = allAlerts.slice(0, 60).reverse();

  return (
    <div className="p-6 max-w-screen-2xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="mb-6">
        <h1 className="text-[#F0F6FC] text-2xl font-bold tracking-tight">Live Simulation</h1>
        <p className="text-[#8B949E] text-sm mt-1">
          Inject attacks into the ML pipeline and watch the AI classify them in real-time
        </p>
      </motion.div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard title="Total Simulated" value={totals.simulated.toLocaleString()} icon={Activity} delay={0} />
        <MetricCard title="Anomalies Caught" value={totals.caught.toLocaleString()} icon={AlertTriangle} variant="danger" delay={0.07} />
        <MetricCard title="Network Flows" value={networkAlerts.length.toLocaleString()} icon={Globe} variant="info" delay={0.14} />
        <MetricCard title="System Attacks" value={attackAlerts.length.toLocaleString()} icon={Server} variant="warning" delay={0.21}
          subtitle={allAlerts.length > 0 ? `${((attackAlerts.length / allAlerts.length) * 100).toFixed(1)}% rate` : undefined} />
      </div>

      {/* 3D Canvas Hero */}
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.25 }}
        className="glass-card rounded-xl overflow-hidden mb-6"
        style={{ boxShadow: '0 0 40px rgba(227,0,15,0.07)' }}
      >
        <div className="px-5 py-3.5 flex items-center justify-between"
          style={{ borderBottom: '1px solid rgba(48,54,61,0.6)' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-2 h-2 rounded-full bg-[#E3000F] animate-pulse-red" />
            <span className="text-[#F0F6FC] font-semibold text-sm">AI Data Pipeline — WebGL Inference Core</span>
          </div>
          <div className="flex items-center gap-4 text-[10px] text-[#8B949E]">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#A8D5FF]/70 inline-block" /> BENIGN</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#E3000F] inline-block" /> ATTACK</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#9775FA] inline-block" /> UEBA</span>
          </div>
        </div>
        <div style={{ background: 'rgba(9,12,16,0.6)' }}>
          <NetworkCanvas alerts={allAlerts} height={300} />
        </div>
        <div className="px-5 py-2.5 flex items-center gap-6 text-[10px] text-[#8B949E]"
          style={{ borderTop: '1px solid rgba(48,54,61,0.5)', background: 'rgba(13,17,23,0.4)' }}>
          <span>SSH Auth <span className="text-[#4DABF7] font-semibold">{sshAlerts.length}</span></span>
          <span>UEBA <span className="text-[#9775FA] font-semibold">{uebaAlerts.length}</span></span>
          <span>Network <span className="text-[#51CF66] font-semibold">{networkAlerts.length}</span></span>
          <span className="ml-auto">Particles represent individual log inferences flowing through the AI core</span>
        </div>
      </motion.div>

      {/* Control panel */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <ControlCard
          title="SSH Replay" icon={Play} type="ssh" ctrl={ssh}
          onToggle={v => handleToggle('ssh', v, setSsh, ssh.delay)}
          onDelayChange={v => setSsh(p => ({ ...p, delay: v }))}
        />
        <ControlCard
          title="UEBA Replay" icon={Play} type="ueba" ctrl={ueba}
          onToggle={v => handleToggle('ueba', v, setUeba, ueba.delay)}
          onDelayChange={v => setUeba(p => ({ ...p, delay: v }))}
        />
        <ControlCard
          title="Network Scenarios" icon={Globe} type="network" ctrl={net}
          onToggle={v => handleToggle('network', v, setNet, net.delay)}
          onDelayChange={v => setNet(p => ({ ...p, delay: v }))}
          extra={
            <Select value={scenario} onValueChange={setScenario}>
              <SelectTrigger
                className="text-xs h-8 border-[#30363D] bg-[#0D1117] text-[#8B949E]"
                disabled={!net.active}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#161B22] border-[#30363D] text-[#F0F6FC]">
                {[
                  { value: 'normal',   label: 'Normal Traffic' },
                  { value: 'ddos',     label: 'DDoS Flood' },
                  { value: 'portscan', label: 'Port Scan' },
                  { value: 'exfil',   label: 'Data Exfiltration' },
                  { value: 'mixed',   label: 'Mixed Attack' },
                ].map(o => (
                  <SelectItem key={o.value} value={o.value} className="text-xs focus:bg-[#E3000F]/10 focus:text-[#E3000F]">
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
        />
      </div>

      {/* Live terminal feeds */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <p className="text-[#8B949E] text-xs font-medium mb-2 uppercase tracking-widest">Raw Log Feed</p>
          <TerminalFeed
            title="raw_logs.stream"
            lines={feedLines.map(formatRaw)}
            colorFn={() => '#A8D5FF'}
          />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
          <p className="text-[#8B949E] text-xs font-medium mb-2 uppercase tracking-widest">Verdict Feed</p>
          <TerminalFeed
            title="ai_verdicts.stream"
            lines={feedLines.map(formatVerdict)}
            colorFn={verdictColor}
          />
        </motion.div>
      </div>
    </div>
  );
}
