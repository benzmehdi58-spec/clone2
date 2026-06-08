import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
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
    <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold" style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
      {verdict.replace('_', '-')}
    </span>
  );
}

function SeverityDot({ severity }: { severity: string }) {
  const c: Record<string, string> = { critical: '#E3000F', warning: '#FBBF24', info: '#60A5FA' };
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: c[severity] ?? '#8B949E' }} />
      <span className="text-[#8B949E] text-xs capitalize">{severity}</span>
    </span>
  );
}

/* ─── Custom SVG chart — zero Recharts dependency ─── */
interface ChartPoint { label: string; traffic: number; threats: number }

function TrafficChart({ data }: { data: ChartPoint[] }) {
  const [hover, setHover] = useState<number | null>(null);

  const VB_W = 600, VB_H = 190;
  const PAD  = { t: 10, r: 10, b: 26, l: 36 };
  const pw   = VB_W - PAD.l - PAD.r;
  const ph   = VB_H - PAD.t - PAD.b;

  const maxVal = Math.max(...data.map(d => Math.max(d.traffic, d.threats)), 1);
  const n      = data.length;

  const xOf = (i: number) => PAD.l + (i / (n - 1)) * pw;
  const yOf = (v: number) => PAD.t + ph - (v / maxVal) * ph;

  const pts = (key: 'traffic' | 'threats') =>
    data.map((d, i) => `${xOf(i)},${yOf(d[key])}`).join(' ');

  // Area fill path for traffic
  const areaD = `M${xOf(0)},${yOf(data[0].traffic)} ` +
    data.slice(1).map((d, i) => `L${xOf(i + 1)},${yOf(d.traffic)}`).join(' ') +
    ` L${xOf(n - 1)},${PAD.t + ph} L${xOf(0)},${PAD.t + ph} Z`;

  // Y-axis ticks (4 levels)
  const yTicks = [0, 0.33, 0.66, 1].map(f => ({
    y: yOf(f * maxVal),
    v: Math.round(f * maxVal),
  }));

  // X-axis label indices every 4 hours
  const xLabels = data.map((_, i) => i).filter(i => i % 4 === 0);

  // Hover tooltip position (flip left when near right edge)
  const hx = hover !== null ? xOf(hover) : 0;
  const tipLeft = hover !== null && hx > VB_W * 0.72;
  const tipX = tipLeft ? hx - 88 : hx + 8;

  return (
    <svg
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      className="w-full"
      style={{ height: 190 }}
      onMouseLeave={() => setHover(null)}
    >
      {/* Horizontal grid */}
      {yTicks.map(t => (
        <g key={t.v}>
          <line x1={PAD.l} y1={t.y} x2={PAD.l + pw} y2={t.y} stroke="#30363D" strokeDasharray="3 6" strokeWidth={0.8} />
          <text x={PAD.l - 5} y={t.y + 3.5} textAnchor="end" fill="#8B949E" fontSize={8.5}>{t.v}</text>
        </g>
      ))}

      {/* X-axis labels */}
      {xLabels.map(i => (
        <text key={i} x={xOf(i)} y={VB_H - 5} textAnchor="middle" fill="#8B949E" fontSize={8.5}>
          {data[i].label}
        </text>
      ))}

      {/* Traffic area fill */}
      <path d={areaD} fill="#4DABF7" fillOpacity={0.08} />

      {/* Traffic line */}
      <polyline points={pts('traffic')} fill="none" stroke="#4DABF7" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />

      {/* Threats line */}
      <polyline points={pts('threats')} fill="none" stroke="#E3000F" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

      {/* Invisible hover hit areas */}
      {data.map((_, i) => (
        <rect
          key={i}
          x={xOf(i) - pw / n / 2}
          y={PAD.t}
          width={pw / n}
          height={ph}
          fill="transparent"
          onMouseEnter={() => setHover(i)}
        />
      ))}

      {/* Hover crosshair + dots + tooltip */}
      {hover !== null && (() => {
        const d = data[hover];
        return (
          <>
            <line x1={hx} y1={PAD.t} x2={hx} y2={PAD.t + ph} stroke="#30363D" strokeWidth={1} />
            <circle cx={hx} cy={yOf(d.traffic)} r={3.5} fill="#4DABF7" />
            <circle cx={hx} cy={yOf(d.threats)} r={3.5} fill="#E3000F" />
            <rect x={tipX} y={PAD.t + 4} width={82} height={44} rx={5} fill="rgba(22,27,34,0.96)" stroke="#30363D" strokeWidth={0.8} />
            <text x={tipX + 8} y={PAD.t + 17} fill="#8B949E" fontSize={8.5}>{d.label}</text>
            <text x={tipX + 8} y={PAD.t + 29} fill="#4DABF7" fontSize={8.5}>Traffic: <tspan fontWeight="600">{d.traffic}</tspan></text>
            <text x={tipX + 8} y={PAD.t + 41} fill="#E3000F" fontSize={8.5}>Threats: <tspan fontWeight="600">{d.threats}</tspan></text>
          </>
        );
      })()}
    </svg>
  );
}

/* ─── Main component ─── */
export function Dashboard() {
  const navigate = useNavigate();
  const { allAlerts, sshAlerts, uebaAlerts, networkAlerts } = useWebSocketData();
  const prevCountRef = useRef(0);

  const attackAlerts   = allAlerts.filter(a => a.verdict === 'ATTACK');
  const zeroDayAlerts  = allAlerts.filter(a => a.verdict === 'ZERO_DAY');
  const recentIncidents = allAlerts
    .filter(a => a.verdict === 'ATTACK' || a.verdict === 'ZERO_DAY')
    .slice(0, 9);

  const [chartData, setChartData] = useState<ChartPoint[]>(() =>
    Array.from({ length: 24 }, (_, i) => {
      const hr = (new Date().getHours() - 23 + i + 24) % 24;
      return { label: `${String(hr).padStart(2, '0')}:00`, traffic: 0, threats: 0 };
    })
  );

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

  useEffect(() => {
    fetchLogs({ limit: 200 }).then(({ logs }) => {
      const buckets: Record<string, { traffic: number; threats: number }> = {};
      logs.forEach(log => {
        const d = new Date(log.time);
        if (!isNaN(d.getTime())) {
          const key = `${String(d.getHours()).padStart(2, '00')}:00`;
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
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="mb-8">
        <h1 className="text-[#F0F6FC] text-2xl font-bold tracking-tight">Command Center</h1>
        <p className="text-[#8B949E] text-sm mt-1">
          Real-time network threat intelligence — <span className="text-[#E3000F]">CyberAI</span>
        </p>
      </motion.div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard title="Total Analyzed Logs" value={allAlerts.length.toLocaleString()} icon={Database} delay={0}>
          <div className="flex gap-2 text-[10px] text-[#8B949E] flex-wrap">
            <span>SSH {sshAlerts.length}</span>
            <span className="opacity-40">·</span>
            <span>UEBA {uebaAlerts.length}</span>
            <span className="opacity-40">·</span>
            <span>Net {networkAlerts.length}</span>
          </div>
        </MetricCard>
        <MetricCard title="Active Threats" value={attackAlerts.length} subtitle="ATTACK verdict" icon={AlertTriangle} variant="danger" delay={0.07} />
        <MetricCard title="Zero-Day Anomalies" value={zeroDayAlerts.length} subtitle="Unknown pattern" icon={Zap} variant="warning" delay={0.14} />
        <MetricCard title="System Health" value="94%" icon={Activity} variant="success" delay={0.21}>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(48,54,61,0.6)' }}>
            <motion.div initial={{ width: 0 }} animate={{ width: '94%' }} transition={{ duration: 1.2, delay: 0.5, ease: 'easeOut' }} className="h-full rounded-full bg-emerald-400" />
          </div>
        </MetricCard>
      </div>

      {/* Chart row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.28 }} className="lg:col-span-2 glass-card rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-[#F0F6FC] font-semibold text-sm">Network Traffic vs Threat Volume</h2>
              <p className="text-[#8B949E] text-xs mt-0.5">Last 24 hours — WebSocket stream</p>
            </div>
            <div className="flex items-center gap-4 text-[10px] text-[#8B949E]">
              <span className="flex items-center gap-1.5"><span className="w-3 h-px rounded bg-[#4DABF7] inline-block" />Traffic</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-px rounded bg-[#E3000F] inline-block" />Threats</span>
            </div>
          </div>
          <TrafficChart data={chartData} />
        </motion.div>

        {/* Source breakdown */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.35 }} className="glass-card rounded-xl p-5">
          <h2 className="text-[#F0F6FC] font-semibold text-sm mb-5">Source Distribution</h2>
          {[
            { label: 'SSH Auth', count: sshAlerts.length,     color: '#4DABF7' },
            { label: 'UEBA',     count: uebaAlerts.length,    color: '#9775FA' },
            { label: 'Network',  count: networkAlerts.length, color: '#51CF66' },
          ].map(({ label, count, color }) => (
            <div key={label} className="mb-4">
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-[#8B949E]">{label}</span>
                <span className="text-[#F0F6FC] font-medium tabular-nums">{count.toLocaleString()}</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(48,54,61,0.6)' }}>
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

          <div className="mt-6 pt-4" style={{ borderTop: '1px solid rgba(48,54,61,0.7)' }}>
            <div className="flex justify-between text-xs mb-3">
              <span className="text-[#8B949E]">Attack Rate</span>
              <span className="text-[#E3000F] font-bold">
                {allAlerts.length > 0 ? ((attackAlerts.length / allAlerts.length) * 100).toFixed(1) : '0.0'}%
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-[#8B949E]">Zero-Day Rate</span>
              <span className="text-amber-400 font-bold">
                {allAlerts.length > 0 ? ((zeroDayAlerts.length / allAlerts.length) * 100).toFixed(1) : '0.0'}%
              </span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Recent Critical Incidents */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.42 }} className="glass-card rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(48,54,61,0.7)' }}>
          <div>
            <h2 className="text-[#F0F6FC] font-semibold text-sm">Recent Critical Incidents</h2>
            <p className="text-[#8B949E] text-xs mt-0.5">Latest ATTACK &amp; ZERO-DAY verdicts from live feed</p>
          </div>
          <button onClick={() => navigate('/alerts')} className="flex items-center gap-1 text-xs text-[#8B949E] hover:text-[#E3000F] transition-colors">
            View all <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        {recentIncidents.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <Activity className="w-8 h-8 text-[#30363D] mx-auto mb-3" />
            <p className="text-[#8B949E] text-sm">No critical incidents — system nominal</p>
            <p className="text-[#8B949E]/50 text-xs mt-1">Waiting for WebSocket feed…</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(48,54,61,0.5)' }}>
                  {['Time', 'ID', 'Source', 'Title', 'Verdict', 'Severity', 'Confidence'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[#8B949E] text-xs font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentIncidents.map(alert => (
                  <tr key={alert.id} onClick={() => navigate(`/alerts/${alert.id}`, { state: { alert } })} className="cursor-pointer transition-colors row-attack" style={{ borderBottom: '1px solid rgba(48,54,61,0.3)' }}>
                    <td className="px-4 py-3 text-[#8B949E] text-xs terminal-font">{alert.time}</td>
                    <td className="px-4 py-3 text-[#8B949E] text-xs terminal-font">{alert.id}</td>
                    <td className="px-4 py-3 text-[#F0F6FC] text-xs">{alert.source}</td>
                    <td className="px-4 py-3 text-[#F0F6FC] text-xs max-w-[200px] truncate">{alert.title}</td>
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
