import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { Search, SlidersHorizontal, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { Slider } from '@/app/components/ui/slider';
import { fetchLogs, type LogsResponse } from '../api/agent';
import type { Alert } from '../types';

/* ─── Badges ─── */
function VerdictBadge({ verdict }: { verdict?: string }) {
  if (!verdict) return <span className="text-[#8B949E] text-xs">—</span>;
  const s: Record<string, { bg: string; color: string; border: string }> = {
    ATTACK:   { bg: 'rgba(227,0,15,0.12)',   color: '#E3000F', border: 'rgba(227,0,15,0.3)' },
    BENIGN:   { bg: 'rgba(52,211,153,0.1)',  color: '#34D399', border: 'rgba(52,211,153,0.3)' },
    ZERO_DAY: { bg: 'rgba(167,139,250,0.1)', color: '#A78BFA', border: 'rgba(167,139,250,0.3)' },
  };
  const v = s[verdict] ?? { bg: 'rgba(48,54,61,0.5)', color: '#8B949E', border: '#30363D' };
  return (
    <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold"
      style={{ background: v.bg, color: v.color, border: `1px solid ${v.border}` }}>
      {verdict.replace('_', '-')}
    </span>
  );
}

function ConfidencePill({ value }: { value: number }) {
  const color = value >= 95 ? '#E3000F' : value >= 80 ? '#FBBF24' : '#34D399';
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(48,54,61,0.6)' }}>
        <div className="h-full rounded-full" style={{ width: `${value}%`, background: color }} />
      </div>
      <span className="text-xs terminal-font" style={{ color }}>{value.toFixed(1)}%</span>
    </div>
  );
}

const SOURCES = ['SSH', 'UEBA', 'Network'] as const;
const VERDICTS = [
  { value: 'all',      label: 'All Verdicts' },
  { value: 'ATTACK',   label: 'ATTACK' },
  { value: 'BENIGN',   label: 'BENIGN' },
  { value: 'ZERO_DAY', label: 'ZERO-DAY' },
];

export function AlertsExplorer() {
  const navigate = useNavigate();

  // Filter state
  const [source, setSource] = useState('all');
  const [status, setStatus] = useState('all');
  const [minConf, setMinConf]   = useState(0);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch]     = useState('');
  const [page, setPage]         = useState(1);

  // Data state
  const [data, setData]         = useState<LogsResponse | null>(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 420);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [source, status, minConf]);

  const loadData = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchLogs({ page, limit: 20, search, status, source })
      .then(res => { setData(res); setLoading(false); })
      .catch(e  => { setError(e.message); setLoading(false); });
  }, [page, search, status, source]);

  useEffect(() => { loadData(); }, [loadData]);

  // Client-side confidence filter on top of API results
  const rows: Alert[] = (data?.logs ?? []).filter(a => a.confidence >= minConf);

  const isAttack = (a: Alert) => a.verdict === 'ATTACK' || a.verdict === 'ZERO_DAY';

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* ── Sidebar ── */}
      <aside
        className="w-64 shrink-0 p-5 overflow-y-auto"
        style={{ borderRight: '1px solid rgba(48,54,61,0.7)', background: 'rgba(13,17,23,0.5)' }}
      >
        <div className="flex items-center gap-2 mb-6">
          <SlidersHorizontal className="w-4 h-4 text-[#E3000F]" />
          <span className="text-[#F0F6FC] font-semibold text-sm">Filters</span>
        </div>

        {/* Source */}
        <div className="mb-6">
          <p className="text-[#8B949E] text-xs font-medium uppercase tracking-widest mb-3">Source</p>
          {[{ value: 'all', label: 'All Sources' }, ...SOURCES.map(s => ({ value: s, label: s === 'SSH' ? 'SSH Auth' : s === 'UEBA' ? 'UEBA Insider' : 'Network Flows' }))].map(opt => (
            <label key={opt.value} className="flex items-center gap-2.5 mb-2.5 cursor-pointer group">
              <input
                type="radio"
                name="source"
                value={opt.value}
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
          <p className="text-[#8B949E] text-xs font-medium uppercase tracking-widest mb-3">Verdict</p>
          {VERDICTS.map(opt => (
            <label key={opt.value} className="flex items-center gap-2.5 mb-2.5 cursor-pointer group">
              <input
                type="radio"
                name="verdict"
                value={opt.value}
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
            <p className="text-[#8B949E] text-xs font-medium uppercase tracking-widest">Min Confidence</p>
            <span className="text-[#E3000F] text-xs font-bold">{minConf}%</span>
          </div>
          <Slider
            value={[minConf]}
            onValueChange={([v]) => setMinConf(v)}
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
        <div className="px-5 py-4 flex items-center gap-3" style={{ borderBottom: '1px solid rgba(48,54,61,0.7)' }}>
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8B949E]" />
            <input
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Search by ID, title, IP…"
              className="w-full pl-9 pr-4 py-2 rounded-lg text-sm text-[#F0F6FC] placeholder-[#8B949E] outline-none focus:ring-1 focus:ring-[#E3000F]/50"
              style={{ background: 'rgba(22,27,34,0.8)', border: '1px solid rgba(48,54,61,0.8)' }}
            />
          </div>

          <button
            onClick={loadData}
            className="p-2 rounded-lg text-[#8B949E] hover:text-[#F0F6FC] transition-colors"
            style={{ border: '1px solid rgba(48,54,61,0.7)' }}
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {data && (
            <span className="text-[#8B949E] text-xs ml-1">
              {data.total.toLocaleString()} results
            </span>
          )}
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
              <thead className="sticky top-0" style={{ background: 'rgba(13,17,23,0.95)', backdropFilter: 'blur(8px)' }}>
                <tr style={{ borderBottom: '1px solid rgba(48,54,61,0.7)' }}>
                  {['Timestamp', 'ID', 'Source', 'Title', 'Verdict', 'Attack Type', 'AI Confidence', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[#8B949E] text-xs font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && !loading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-[#8B949E] text-sm">
                      No alerts match the current filters
                    </td>
                  </tr>
                ) : rows.map((alert, i) => (
                  <motion.tr
                    key={alert.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2, delay: i * 0.03 }}
                    onClick={() => navigate(`/alerts/${alert.id}`, { state: { alert } })}
                    className={`cursor-pointer transition-colors ${isAttack(alert) ? 'row-attack' : ''}`}
                    style={{ borderBottom: '1px solid rgba(48,54,61,0.3)' }}
                  >
                    <td className="px-4 py-3 text-[#8B949E] text-xs terminal-font whitespace-nowrap">{alert.time}</td>
                    <td className="px-4 py-3 text-[#8B949E] text-xs terminal-font">{alert.id}</td>
                    <td className="px-4 py-3 text-[#F0F6FC] text-xs">{alert.source}</td>
                    <td className="px-4 py-3 text-[#F0F6FC] text-xs max-w-[180px] truncate">{alert.title}</td>
                    <td className="px-4 py-3"><VerdictBadge verdict={alert.verdict} /></td>
                    <td className="px-4 py-3 text-[#8B949E] text-xs">{alert.attack_type ?? alert.prediction ?? '—'}</td>
                    <td className="px-4 py-3"><ConfidencePill value={alert.confidence} /></td>
                    <td className="px-4 py-3">
                      <ChevronRight className="w-4 h-4 text-[#30363D]" />
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {data && data.pages > 1 && (
          <div
            className="px-5 py-3 flex items-center justify-between"
            style={{ borderTop: '1px solid rgba(48,54,61,0.7)' }}
          >
            <span className="text-[#8B949E] text-xs">
              Page {data.page} of {data.pages}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1.5 rounded text-[#8B949E] hover:text-[#F0F6FC] disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: Math.min(5, data.pages) }, (_, i) => {
                const p = page <= 3 ? i + 1 : page + i - 2;
                if (p < 1 || p > data.pages) return null;
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className="w-7 h-7 rounded text-xs font-medium transition-all"
                    style={p === page
                      ? { background: 'rgba(227,0,15,0.15)', color: '#E3000F', border: '1px solid rgba(227,0,15,0.3)' }
                      : { color: '#8B949E' }
                    }
                  >
                    {p}
                  </button>
                );
              })}
              <button
                onClick={() => setPage(p => Math.min(data.pages, p + 1))}
                disabled={page >= data.pages}
                className="p-1.5 rounded text-[#8B949E] hover:text-[#F0F6FC] disabled:opacity-30 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
