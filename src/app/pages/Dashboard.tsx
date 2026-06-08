import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip, ResponsiveContainer,
} from 'recharts';
import { Database, AlertTriangle, Zap, Activity, ChevronRight } from 'lucide-react';
import { useWebSocketData } from '../contexts/WebSocketContext';
import { fetchLogs } from '../api/agent';
import { MetricCard } from '../components/MetricCard';

/* ─── Badges ─── */
function VerdictBadge({ verdict }: { verdict?: string }) {
  if (!verdict) return null;
  const styles: Record<string, { bg: string; color: string; border: string }> = {
    ATTACK:   { bg: 'rgba(227,0,15,0.12)',   color: '#E3000F', border: 'rgba(227,0,15,0.3)' },
    BENIGN:   { bg: 'rgba(52,211,153,0.1)',  color: '#34D399', border: 'rgba(52,211,153,0.3)' },
    ZERO_DAY: { bg: 'rgba(167,139,250,0.1)', color: '#A78BFA', border: 'rgba(167,139,250,0.3)' },
  };
  const s = styles[verdict] ?? { bg: 'rgba(48,54,61,0.5)', color: '#8B949E', border: '#30363D' };
  return (
    <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold" style={{
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
    }}>
      {verdict.replace('_', '-')}
    </span>
  );
}

function SeverityDot({ severity }: { severity: string }) {
  const c: Record<string, string> = { critical: '#E3000F', warning: '#FBBF24', info: '#60A5FA' };
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: c[severity] ?? '#8B949E' }} />
      <span className="text-muted-foreground text-xs capitalize">{severity}</span>
    </span>
  );
}

/* ─── Custom recharts tooltip ─── */
const ChartTooltip = ({ active, payload, label }: { active?: boolean; payload?: { color: string; name: string; value: number }[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card rounded-lg px-3 py-2 text-xs">
      <p className="text-muted-foreground mb-1">{label}</p>
      {payload.map(e => (
        <p key={e.name} style={{ color: e.color }}>{e.name}: <strong>{e.value}</strong></p>
      ))}
    </div>
  );
};

/* ─── Main component ─── */
export function Dashboard() {
  const navigate = useNavigate();
  const { allAlerts, sshAlerts, uebaAlerts, networkAlerts, hdfsAlerts } = useWebSocketData();
  const prevCountRef = useRef(0);

  const attackAlerts  = allAlerts.filter(a => a.verdict === 'ATTACK');
  const zeroDayAlerts = allAlerts.filter(a => a.verdict === 'ZERO_DAY');
  const recentIncidents = allAlerts
    .filter(a => a.verdict === 'ATTACK' || a.verdict === 'ZERO_DAY')
    .slice(0, 9);

  // 24-hour rolling chart — seeded by hour labels
  const [chartData, setChartData] = useState(() =>
    Array.from({ length: 24 }, (_, i) => {
      const hr = (new Date().getHours() - 23 + i + 24) % 24;
      return { label: `${String(hr).padStart(2, '0')}:00`, traffic: 0, threats: 0 };
    })
  );

  // Accumulate new WebSocket alerts into current hour bucket
  useEffect(() => {
    const newCount = allAlerts.length - prevCountRef.current;
    if (newCount <= 0) return;
    prevCountRef.current = allAlerts.length;
    const newAlerts = allAlerts.slice(0, newCount);
    const hour = `${String(new Date().getHours()).padStart(2, '0')}:00`;
    const newThreats = newAlerts.filter(a => a.verdict === 'ATTACK' || a.verdict === 'ZERO_DAY').length;
    setChartData(prev => prev.map(item =>
      item.label === hour
        ? { ...item, traffic: item.traffic + newCount, threats: item.threats + newThreats }
        : item
    ));
  }, [allAlerts]);

  // Seed chart from historical API on mount (parses ISO timestamps)
  useEffect(() => {
    fetchLogs({ limit: 200 }).then(({ logs }) => {
      const buckets: Record<string, { traffic: number; threats: number }> = {};
      logs.forEach(log => {
        const d = new Date(log.time);
        if (!isNaN(d.getTime())) {
          const key = `${String(d.getHours()).padStart(2, '0')}:00`;
          if (!buckets[key]) buckets[key] = { traffic: 0, threats: 0 };
          buckets[key].traffic++;
          if (log.verdict === 'ATTACK' || log.verdict === 'ZERO_DAY') buckets[key].threats++;
        }
      });
      if (Object.keys(buckets).length > 0) {
        setChartData(prev => prev.map(item => ({
          ...item,
          traffic: item.traffic + (buckets[item.label]?.traffic ?? 0),
          threats: item.threats + (buckets[item.label]?.threats ?? 0),
        })));
      }
    }).catch(() => {});
  }, []);

  return (
    <div className="p-6 max-w-screen-2xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-8"
      >
        <h1 className="text-foreground text-2xl font-bold tracking-tight">Command Center</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Real-time network threat intelligence — <span className="text-[#E3000F]">CyberAI</span>
        </p>
      </motion.div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard title="Total Analyzed Logs" value={allAlerts.length.toLocaleString()} icon={Database} delay={0}>
          <div className="flex gap-2 text-[10px] text-muted-foreground flex-wrap">
            <span>SSH {sshAlerts.length}</span>
            <span className="opacity-40">·</span>
            <span>UEBA {uebaAlerts.length}</span>
            <span className="opacity-40">·</span>
            <span>Net {networkAlerts.length}</span>
            <span className="opacity-40">·</span>
            <span>HDFS {hdfsAlerts.length}</span>
          </div>
        </MetricCard>

        <MetricCard
          title="Active Threats"
          value={attackAlerts.length}
          subtitle="ATTACK verdict"
          icon={AlertTriangle}
          variant="danger"
          delay={0.07}
        />

        <MetricCard
          title="Zero-Day Anomalies"
          value={zeroDayAlerts.length}
          subtitle="Unknown pattern"
          icon={Zap}
          variant="warning"
          delay={0.14}
        />

        <MetricCard title="System Health" value="94%" icon={Activity} variant="success" delay={0.21}>
          <div className="h-1.5 rounded-full overflow-hidden bg-muted">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: '94%' }}
              transition={{ duration: 1.2, delay: 0.5, ease: 'easeOut' }}
              className="h-full rounded-full bg-emerald-400"
            />
          </div>
        </MetricCard>
      </div>

      {/* Chart row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Main chart */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.28 }}
          className="lg:col-span-2 glass-card rounded-xl p-5"
        >
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-foreground font-semibold text-sm">Network Traffic vs Threat Volume</h2>
              <p className="text-muted-foreground text-xs mt-0.5">Last 24 hours — WebSocket stream</p>
            </div>
            <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-px rounded bg-[#4DABF7] inline-block" />Traffic
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-px rounded bg-[#E3000F] inline-block" />Threats
              </span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={210}>
            <ComposedChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 6" stroke="#30363D" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: '#8B949E', fontSize: 10 }} tickLine={false} axisLine={false} interval={3} />
              <YAxis tick={{ fill: '#8B949E', fontSize: 10 }} tickLine={false} axisLine={false} />
              <RTooltip content={<ChartTooltip />} />
              <Area id="area-traffic" type="monotone" dataKey="traffic" name="Traffic" stroke="#4DABF7" strokeWidth={1.5} fill="#4DABF7" fillOpacity={0.12} isAnimationActive={false} />
              <Line id="line-threats" type="monotone" dataKey="threats" name="Threats" stroke="#E3000F" strokeWidth={2} dot={false} isAnimationActive={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Source breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.35 }}
          className="glass-card rounded-xl p-5"
        >
          <h2 className="text-foreground font-semibold text-sm mb-5">Source Distribution</h2>
          {[
            { label: 'HDFS System',count: hdfsAlerts.length,    color: '#D29922' },
            { label: 'SSH Auth',  count: sshAlerts.length,     color: '#4DABF7' },
            { label: 'UEBA',      count: uebaAlerts.length,    color: '#9775FA' },
            { label: 'Network',   count: networkAlerts.length, color: '#51CF66' },
          ].map(({ label, count, color }) => (
            <div key={label} className="mb-4">
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-muted-foreground">{label}</span>
                <span className="text-foreground font-medium tabular-nums">{count.toLocaleString()}</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden bg-muted">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: allAlerts.length > 0 ? `${(count / allAlerts.length * 100).toFixed(1)}%` : '0%' }}
                  transition={{ duration: 0.9, delay: 0.5, ease: 'easeOut' }}
                  className="h-full rounded-full"
                  style={{ background: color }}
                />
              </div>
            </div>
          ))}

          <div className="mt-6 pt-4 border-t border-border">
            <div className="flex justify-between text-xs mb-3">
              <span className="text-muted-foreground">Attack Rate</span>
              <span className="text-[#E3000F] font-bold">
                {allAlerts.length > 0
                  ? ((attackAlerts.length / allAlerts.length) * 100).toFixed(1)
                  : '0.0'}%
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Zero-Day Rate</span>
              <span className="text-amber-400 font-bold">
                {allAlerts.length > 0
                  ? ((zeroDayAlerts.length / allAlerts.length) * 100).toFixed(1)
                  : '0.0'}%
              </span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Recent Critical Incidents table */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.42 }}
        className="glass-card rounded-xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h2 className="text-foreground font-semibold text-sm">Recent Critical Incidents</h2>
            <p className="text-muted-foreground text-xs mt-0.5">Latest ATTACK &amp; ZERO-DAY verdicts from live feed</p>
          </div>
          <button
            onClick={() => navigate('/alerts')}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-[#E3000F] transition-colors"
          >
            View all <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        {recentIncidents.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <Activity className="w-8 h-8 text-[#30363D] mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">No critical incidents — system nominal</p>
            <p className="text-muted-foreground/50 text-xs mt-1">Waiting for WebSocket feed…</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  {['Time', 'ID', 'Source', 'Title', 'Verdict', 'Severity', 'Confidence'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-muted-foreground text-xs font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentIncidents.map(alert => (
                  <tr
                    key={alert.id}
                    onClick={() => navigate(`/alerts/${alert.id}`, { state: { alert } })}
                    className="cursor-pointer transition-colors border-b border-border/50 hover:bg-muted/30"
                  >
                    <td className="px-4 py-3 text-muted-foreground text-xs terminal-font">{alert.time}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs terminal-font">{alert.id}</td>
                    <td className="px-4 py-3 text-foreground text-xs">{alert.source}</td>
                    <td className="px-4 py-3 text-foreground text-xs max-w-[200px] truncate">{alert.title}</td>
                    <td className="px-4 py-3"><VerdictBadge verdict={alert.verdict} /></td>
                    <td className="px-4 py-3"><SeverityDot severity={alert.severity} /></td>
                    <td className="px-4 py-3 text-xs terminal-font">
                      <span style={{ color: alert.confidence > 90 ? '#E3000F' : '#8B949E' }}>
                        {alert.confidence.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </div>
  );
}
