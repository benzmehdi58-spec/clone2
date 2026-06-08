import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { Search, SlidersHorizontal, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { Slider } from '@/app/components/ui/slider';
import { fetchLogs, type LogsResponse } from '../api/agent';
import type { Alert } from '../types';

/* â”€â”€â”€ Badges â”€â”€â”€ */
function VerdictBadge({ verdict }: { verdict?: string }) {
  if (!verdict) return <span className="text-muted-foreground text-xs">â€”</span>;
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
      <div className="w-20 h-1.5 rounded-full overflow-hidden bg-muted">
        <div className="h-full rounded-full" style={{ width: `${value}%`, background: color }} />
      </div>
      <span className="text-xs terminal-font" style={{ color }}>{value.toFixed(1)}%</span>
    </div>
  );
}

const SOURCES = ['HDFS', 'SSH', 'UEBA', 'Network'] as const;
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
      {/* â”€â”€ Sidebar â”€â”€ */}
      <aside
        className="w-64 shrink-0 p-5 overflow-y-auto border-r border-border bg-background/50"
      >
        <div className="flex items-center gap-2 mb-6">
          <SlidersHorizontal className="w-4 h-4 text-[#E3000F]" />
          <span className="text-foreground font-semibold text-sm">Filters</span>
        </div>

        {/* Source */}
        <div className="mb-6">
          <p className="text-muted-foreground text-xs font-medium uppercase tracking-widest mb-3">Source</p>
          {[{ value: 'all', label: 'All Sources' }, ...SOURCES.map(s => ({ value: s, label: s === 'HDFS' ? 'HDFS System' : s === 'SSH' ? 'SSH Auth' : s === 'UEBA' ? 'UEBA Insider' : 'Network Flows' }))].map(opt => (
            <label key={opt.value} className="flex items-center gap-2.5 mb-2.5 cursor-pointer group">
              <input
                type="radio"
                name="source"
                value={opt.value}
                checked={source === opt.value}
                onChange={() => setSource(opt.value)}
                className="accent-[#E3000F]"
              />
              <span className={`text-sm transition-colors ${source === opt.value ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground'}`}>
                {opt.label}
              </span>
            </label>
          ))}
        </div>

        {/* Verdict */}
        <div className="mb-6">
          <p className="text-muted-foreground text-xs font-medium uppercase tracking-widest mb-3">Verdict</p>
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
              <span className={`text-sm transition-colors ${status === opt.value ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground'}`}>
                {opt.label}
              </span>
            </label>
          ))}
        </div>

        {/* Confidence */}
        <div className="mb-6">
          <div className="flex justify-between mb-3">
            <p className="text-muted-foreground text-xs font-medium uppercase tracking-widest">Min Confidence</p>
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
          className="w-full p-3 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Clear Filters
        </button>
      </aside>

      {/* â”€â”€ Main content â”€â”€ */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="px-5 py-4 flex items-center gap-3 border-b border-border">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Search by ID, title, IPâ€¦"
              className="w-full pl-9 pr-4 py-2 rounded-lg text-sm text-foreground bg-muted/50 border border-border"
            />
          </div>

          <button
            onClick={loadData}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground transition-colors border border-border"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {data && (
            <span className="text-muted-foreground text-xs ml-1">
              {data.total.toLocaleString()} results
            </span>
          )}
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto">
          {error ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <p className="text-[#E3000F] text-sm font-medium mb-1">Failed to load alerts</p>
              <p className="text-muted-foreground text-xs mb-4">{error}</p>
              <button onClick={loadData} className="text-xs text-[#E3000F] underline">Retry</button>
            </div>
          ) : loading && !data ? (
            <div className="flex items-center justify-center h-64">
              <RefreshCw className="w-6 h-6 text-muted-foreground animate-spin" />
            </div>
          ) : (
            <table className="w-full">
              <thead className="sticky top-0 bg-background/95 backdrop-blur-sm">
                <tr className="border-b border-border">
                  {['Timestamp', 'ID', 'Source', 'Title', 'Verdict', 'Attack Type', 'AI Confidence', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-muted-foreground text-xs font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && !loading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground text-sm">
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
                    className="border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3 text-muted-foreground text-xs terminal-font whitespace-nowrap">{alert.time}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs terminal-font">{alert.id}</td>
                    <td className="px-4 py-3 text-foreground text-xs">{alert.source}</td>
                    <td className="px-4 py-3 text-foreground text-xs max-w-[180px] truncate">{alert.title}</td>
                    <td className="px-4 py-3"><VerdictBadge verdict={alert.verdict} /></td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{alert.attack_type ?? alert.prediction ?? 'â€”'}</td>
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
            className="px-5 py-3 flex items-center justify-between border-t border-border"
          >
            <span className="text-muted-foreground text-xs">
              Page {data.page} of {data.pages}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1.5 rounded text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
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
                className="p-1.5 rounded text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
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
