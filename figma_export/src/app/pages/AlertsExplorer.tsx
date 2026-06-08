import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { Search, SlidersHorizontal, ChevronLeft, ChevronRight, RefreshCw, ShieldAlert, ChevronRight as ArrowRight } from 'lucide-react';
import { Slider } from '@/app/components/ui/slider';
import { toast } from 'sonner';
import { fetchLogs, type LogsResponse } from '../api/agent';
import type { Alert } from '../types';

/* ─── Verdict badge ─── */
function VerdictBadge({ verdict }: { verdict?: string }) {
  if (!verdict) return null;
  const s: Record<string, { bg: string; color: string; border: string }> = {
    ATTACK:   { bg: 'rgba(227,0,15,0.14)',    color: '#E3000F', border: 'rgba(227,0,15,0.35)' },
    ZERO_DAY: { bg: 'rgba(167,139,250,0.14)', color: '#A78BFA', border: 'rgba(167,139,250,0.35)' },
  };
  const v = s[verdict] ?? { bg: 'rgba(48,54,61,0.5)', color: '#8B949E', border: '#30363D' };
  return (
    <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold"
      style={{ background: v.bg, color: v.color, border: `1px solid ${v.border}` }}>
      {verdict.replace('_', '-')}
    </span>
  );
}

/* ─── Severity indicator ─── */
const SEV_MAP: Record<string, { color: string; label: string }> = {
  critical: { color: '#E3000F', label: 'CRITICAL' },
  warning:  { color: '#FBBF24', label: 'HIGH' },
  info:     { color: '#60A5FA', label: 'MEDIUM' },
};
function SeverityBadge({ severity }: { severity?: string }) {
  const s = SEV_MAP[severity ?? 'info'] ?? SEV_MAP.info;
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold terminal-font" style={{ color: s.color }}>
      <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: s.color }} />
      {s.label}
    </span>
  );
}

/* ─── Attack type chip ─── */
const ATTACK_COLORS: Record<string, string> = {
  'Brute Force': '#E3000F', 'Credential Stuffing': '#E3000F', 'Lateral Movement': '#E3000F',
  'DDoS': '#F97316', 'Port Scan': '#F97316', 'SSH Tunneling': '#F97316',
  'Data Exfiltration': '#9775FA', 'Bulk Download': '#9775FA',
  'Ransomware': '#FBBF24', 'Log4Shell': '#FBBF24',
};
function AttackChip({ type }: { type?: string }) {
  if (!type) return <span className="text-[#8B949E] text-xs">—</span>;
  const color = ATTACK_COLORS[type] ?? '#8B949E';
  return (
    <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium"
      style={{ background: `${color}18`, color, border: `1px solid ${color}30` }}>
      {type}
    </span>
  );
}

/* ─── Confidence bar ─── */
function ConfBar({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(48,54,61,0.6)' }}>
        <div className="h-full rounded-full" style={{ width: `${value}%`, background: '#E3000F' }} />
      </div>
      <span className="text-xs terminal-font text-[#E3000F]">{value.toFixed(1)}%</span>
    </div>
  );
}

const SOURCE_OPTS = [
  { value: 'all',     label: 'All Sources' },
  { value: 'SSH',     label: 'SSH Auth' },
  { value: 'UEBA',    label: 'UEBA Insider' },
  { value: 'Network', label: 'Network Flows' },
];
const VERDICT_OPTS = [
  { value: 'all',      label: 'All Threats' },
  { value: 'ATTACK',   label: 'ATTACK' },
  { value: 'ZERO_DAY', label: 'ZERO-DAY' },
];

export function AlertsExplorer() {
  const navigate = useNavigate();

  const [source, setSource]           = useState('all');
  const [status, setStatus]           = useState('all');
  const [minConf, setMinConf]         = useState(0);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch]           = useState('');
  const [page, setPage]               = useState(1);
  const [data, setData]               = useState<LogsResponse | null>(null);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 420);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => { setPage(1); }, [source, status, minConf]);

  const loadData = useCallback(() => {
    setLoading(true);
    setError(null);
    // Alerts page always fetches threats only
    const effectiveStatus = status === 'all' ? 'ATTACK' : status;
    fetchLogs({ page, limit: 20, search, status: effectiveStatus, source })
      .then(res => { setData(res); setLoading(false); })
      .catch(e  => { setError(e.message); setLoading(false); });
  }, [page, search, status, source]);

  useEffect(() => { loadData(); }, [loadData]);

  const rows: Alert[] = (data?.logs ?? [])
    .filter(a => (a.verdict === 'ATTACK' || a.verdict === 'ZERO_DAY') && a.confidence >= minConf);

  const criticalCount = rows.filter(a => a.severity === 'critical').length;
  const zeroDayCount  = rows.filter(a => a.verdict === 'ZERO_DAY').length;

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* ── Sidebar ── */}
      <aside
        className="w-60 shrink-0 p-5 overflow-y-auto"
        style={{ borderRight: '1px solid rgba(48,54,61,0.7)', background: 'rgba(13,17,23,0.5)' }}
      >
        <div className="flex items-center gap-2 mb-6">
          <SlidersHorizontal className="w-4 h-4 text-[#E3000F]" />
          <span className="text-[#F0F6FC] font-semibold text-sm">Filters</span>
        </div>

        {/* Threat summary */}
        <div className="mb-6 rounded-xl p-3 space-y-2.5"
          style={{ background: 'rgba(227,0,15,0.06)', border: '1px solid rgba(227,0,15,0.2)' }}>
          <div className="flex justify-between text-xs">
            <span className="text-[#8B949E]">Total threats</span>
            <span className="text-[#E3000F] terminal-font font-bold">{data?.total ?? 0}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-[#8B949E]">Critical</span>
            <span className="text-[#E3000F] terminal-font">{criticalCount}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-[#8B949E]">Zero-Day</span>
            <span className="text-[#A78BFA] terminal-font">{zeroDayCount}</span>
          </div>
        </div>

        {/* Source */}
        <div className="mb-6">
          <p className="text-[#8B949E] text-[10px] font-medium uppercase tracking-widest mb-3">Source</p>
          {SOURCE_OPTS.map(opt => (
            <label key={opt.value} className="flex items-center gap-2.5 mb-2.5 cursor-pointer group">
              <input type="radio" name="alert-source" value={opt.value}
                checked={source === opt.value}
                onChange={() => setSource(opt.value)}
                className="accent-[#E3000F]"
              />
              <span className={`text-sm transition-colors ${source === opt.value ? 'text-[#F0F6FC]' : 'text-[#8B949E] group-hover:text-[#F0F6FC]'}`}>
                {opt.label}
              </span>
            </label>
          ))}
        </div>

        {/* Verdict */}
        <div className="mb-6">
          <p className="text-[#8B949E] text-[10px] font-medium uppercase tracking-widest mb-3">Threat Type</p>
          {VERDICT_OPTS.map(opt => (
            <label key={opt.value} className="flex items-center gap-2.5 mb-2.5 cursor-pointer group">
              <input type="radio" name="alert-verdict" value={opt.value}
                checked={status === opt.value}
                onChange={() => setStatus(opt.value)}
                className="accent-[#E3000F]"
              />
              <span className={`text-sm transition-colors ${status === opt.value ? 'text-[#F0F6FC]' : 'text-[#8B949E] group-hover:text-[#F0F6FC]'}`}>
                {opt.label}
              </span>
            </label>
          ))}
        </div>

        {/* Confidence */}
        <div className="mb-6">
          <div className="flex justify-between mb-3">
            <p className="text-[#8B949E] text-[10px] font-medium uppercase tracking-widest">Min Confidence</p>
            <span className="text-[#E3000F] text-xs terminal-font">{minConf}%</span>
          </div>
          <Slider
            value={[minConf]} onValueChange={([v]) => setMinConf(v)}
            min={0} max={99} step={5}
            className="[&_[role=slider]]:bg-[#E3000F] [&_[role=slider]]:border-[#E3000F]"
          />
        </div>

        <button
          onClick={() => { setSource('all'); setStatus('all'); setMinConf(0); setSearchInput(''); }}
          className="w-full py-2 rounded-lg text-xs text-[#8B949E] hover:text-[#F0F6FC] transition-colors"
          style={{ border: '1px solid rgba(48,54,61,0.7)' }}
        >
          Clear Filters
        </button>
      </aside>

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="px-5 py-3.5 flex items-center gap-3 shrink-0"
          style={{ borderBottom: '1px solid rgba(48,54,61,0.7)' }}>
          <ShieldAlert className="w-4 h-4 text-[#E3000F] shrink-0"
            style={{ filter: 'drop-shadow(0 0 5px rgba(227,0,15,0.6))' }} />
          <span className="text-[#F0F6FC] text-sm font-semibold mr-2">Active Threats</span>

          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8B949E]" />
            <input
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Search ID, title, attack type…"
              className="w-full pl-9 pr-4 py-1.5 rounded-lg text-xs text-[#F0F6FC] placeholder-[#8B949E] outline-none"
              style={{ background: 'rgba(22,27,34,0.8)', border: '1px solid rgba(48,54,61,0.8)' }}
              onFocus={e => { e.currentTarget.style.borderColor = 'rgba(227,0,15,0.4)'; }}
              onBlur={e => { e.currentTarget.style.borderColor = 'rgba(48,54,61,0.8)'; }}
            />
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {data && (
              <span className="text-[#8B949E] text-xs">
                {rows.length} alert{rows.length !== 1 ? 's' : ''}
              </span>
            )}
            <button onClick={loadData}
              className="p-1.5 rounded-lg text-[#8B949E] hover:text-[#F0F6FC] transition-colors"
              style={{ border: '1px solid rgba(48,54,61,0.7)' }}>
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto">
          {error ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <p className="text-[#E3000F] text-sm font-medium mb-1">Failed to load alerts</p>
              <p className="text-[#8B949E] text-xs mb-4">{error}</p>
              <button onClick={loadData} className="text-xs text-[#E3000F] underline">Retry</button>
            </div>
          ) : loading && !data ? (
            <div className="flex items-center justify-center h-64">
              <RefreshCw className="w-6 h-6 text-[#8B949E] animate-spin" />
            </div>
          ) : (
            <table className="w-full">
              <thead className="sticky top-0" style={{ background: 'rgba(13,17,23,0.97)', backdropFilter: 'blur(8px)' }}>
                <tr style={{ borderBottom: '1px solid rgba(48,54,61,0.7)' }}>
                  {['Severity', 'Timestamp', 'ID', 'Source', 'Alert Title', 'Verdict', 'Attack Type', 'AI Confidence', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[#8B949E] text-[10px] font-medium uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && !loading ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center"
                          style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)' }}>
                          <ShieldAlert className="w-5 h-5 text-emerald-400" />
                        </div>
                        <p className="text-[#8B949E] text-sm">No active threats match the current filters</p>
                      </div>
                    </td>
                  </tr>
                ) : rows.map((alert, i) => (
                  <motion.tr
                    key={alert.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2, delay: i * 0.025 }}
                    onClick={() => navigate(`/alerts/${alert.id}`, { state: { alert } })}
                    className="cursor-pointer group row-attack"
                    style={{ borderBottom: '1px solid rgba(48,54,61,0.3)' }}
                  >
                    <td className="px-4 py-3">
                      <SeverityBadge severity={alert.severity} />
                    </td>
                    <td className="px-4 py-3 text-[#8B949E] text-xs terminal-font whitespace-nowrap">
                      {alert.time}
                    </td>
                    <td className="px-4 py-3 text-[#E3000F] text-xs terminal-font">{alert.id}</td>
                    <td className="px-4 py-3 text-[#F0F6FC] text-xs">{alert.source}</td>
                    <td className="px-4 py-3 max-w-[200px]">
                      <p className="text-[#F0F6FC] text-xs truncate">{alert.title}</p>
                      {alert.mitre_id && (
                        <span className="text-[9px] text-[#8B949E] terminal-font">{alert.mitre_id}</span>
                      )}
                    </td>
                    <td className="px-4 py-3"><VerdictBadge verdict={alert.verdict} /></td>
                    <td className="px-4 py-3"><AttackChip type={alert.attack_type ?? alert.prediction} /></td>
                    <td className="px-4 py-3"><ConfBar value={alert.confidence} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={e => { e.stopPropagation(); toast.success(`Alert ${alert.id} escalated to Tier 2`); }}
                          className="px-2 py-0.5 rounded text-[10px] font-medium text-[#FBBF24] opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)' }}
                        >
                          Escalate
                        </button>
                        <ArrowRight className="w-4 h-4 text-[#30363D] group-hover:text-[#E3000F] transition-colors" />
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {data && data.pages > 1 && (
          <div className="px-5 py-3 flex items-center justify-between shrink-0"
            style={{ borderTop: '1px solid rgba(48,54,61,0.7)' }}>
            <span className="text-[#8B949E] text-xs">
              Page {data.page} of {data.pages}
            </span>
            <div className="flex items-center gap-1.5">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                className="p-1.5 rounded text-[#8B949E] hover:text-[#F0F6FC] disabled:opacity-30 transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: Math.min(5, data.pages) }, (_, i) => {
                const p = page <= 3 ? i + 1 : page + i - 2;
                if (p < 1 || p > data.pages) return null;
                return (
                  <button key={p} onClick={() => setPage(p)}
                    className="w-7 h-7 rounded text-xs font-medium transition-all"
                    style={p === page
                      ? { background: 'rgba(227,0,15,0.15)', color: '#E3000F', border: '1px solid rgba(227,0,15,0.3)' }
                      : { color: '#8B949E' }
                    }>
                    {p}
                  </button>
                );
              })}
              <button onClick={() => setPage(p => Math.min(data.pages, p + 1))} disabled={page >= data.pages}
                className="p-1.5 rounded text-[#8B949E] hover:text-[#F0F6FC] disabled:opacity-30 transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
