import { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { Terminal, Search, SlidersHorizontal, RefreshCw, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { Slider } from '@/app/components/ui/slider';
import { fetchLogs, type LogsResponse } from '../api/agent';
import type { Alert } from '../types';

/* ─── Verdict pill ─── */
function VerdictPill({ verdict }: { verdict?: string }) {
  if (!verdict) return <span className="text-[#8B949E] text-xs">—</span>;
  const styles: Record<string, { bg: string; color: string }> = {
    ATTACK:   { bg: 'rgba(227,0,15,0.15)',   color: '#E3000F' },
    BENIGN:   { bg: 'rgba(52,211,153,0.12)', color: '#34D399' },
    ZERO_DAY: { bg: 'rgba(167,139,250,0.12)', color: '#A78BFA' },
  };
  const s = styles[verdict] ?? { bg: 'rgba(48,54,61,0.5)', color: '#8B949E' };
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wide terminal-font"
      style={{ background: s.bg, color: s.color }}
    >
      {verdict.replace('_', '-')}
    </span>
  );
}

/* ─── Source tag ─── */
const SOURCE_COLORS: Record<string, { color: string; bg: string }> = {
  SSH:     { color: '#4DABF7', bg: 'rgba(77,171,247,0.1)' },
  UEBA:    { color: '#9775FA', bg: 'rgba(151,117,250,0.1)' },
  Network: { color: '#51CF66', bg: 'rgba(81,207,102,0.1)' },
  HDFS:    { color: '#D29922', bg: 'rgba(210,153,34,0.1)' },
};
function SourceTag({ source }: { source: string }) {
  const s = SOURCE_COLORS[source] ?? { color: '#8B949E', bg: 'rgba(48,54,61,0.3)' };
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium terminal-font"
      style={{ background: s.bg, color: s.color }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.color }} />
      {source}
    </span>
  );
}

/* ─── Confidence bar ─── */
function ConfBar({ value }: { value: number }) {
  const color = value >= 95 ? '#E3000F' : value >= 80 ? '#FBBF24' : '#34D399';
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1 rounded-full" style={{ background: 'rgba(48,54,61,0.6)' }}>
        <div className="h-full rounded-full" style={{ width: `${value}%`, background: color }} />
      </div>
      <span className="text-[10px] terminal-font" style={{ color }}>{value.toFixed(1)}%</span>
    </div>
  );
}

const SOURCES = ['SSH', 'UEBA', 'Network', 'HDFS'] as const;
const VERDICT_OPTS = [
  { value: 'all',      label: 'All Logs' },
  { value: 'BENIGN',   label: 'Benign' },
  { value: 'ATTACK',   label: 'Attack' },
  { value: 'ZERO_DAY', label: 'Zero-Day' },
];

export function LogExplorer() {
  const [source, setSource]         = useState('all');
  const [status, setStatus]         = useState('all');
  const [minConf, setMinConf]       = useState(0);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch]         = useState('');
  const [page, setPage]             = useState(1);
  const [data, setData]             = useState<LogsResponse | null>(null);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 420);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => { setPage(1); }, [source, status, minConf]);

  const loadData = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchLogs({ page, limit: 25, search, status, source })
      .then(res => { setData(res); setLoading(false); })
      .catch(e  => { setError(e.message); setLoading(false); });
  }, [page, search, status, source]);

  useEffect(() => { loadData(); }, [loadData]);

  const rows: Alert[] = (data?.logs ?? []).filter(a => a.confidence >= minConf);
  const totalBenign = (data?.logs ?? []).filter(a => a.verdict === 'BENIGN').length;
  const totalAttack = (data?.logs ?? []).filter(a => a.verdict === 'ATTACK' || a.verdict === 'ZERO_DAY').length;

  const exportCsv = () => {
    if (!data?.logs.length) return;
    const header = 'ID,Time,Source,Title,Verdict,Attack Type,Confidence\n';
    const csvRows = data.logs.map(a =>
      `"${a.id}","${a.time}","${a.source}","${a.title}","${a.verdict ?? ''}","${a.attack_type ?? ''}","${a.confidence}"`
    ).join('\n');
    const blob = new Blob([header + csvRows], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `cyberai-logs-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* ── Sidebar ── */}
      <aside
        className="w-60 shrink-0 p-5 overflow-y-auto"
        style={{ borderRight: '1px solid rgba(48,54,61,0.7)', background: 'rgba(13,17,23,0.5)' }}
      >
        <div className="flex items-center gap-2 mb-6">
          <SlidersHorizontal className="w-4 h-4 text-[#4DABF7]" />
          <span className="text-[#F0F6FC] font-semibold text-sm">Filters</span>
        </div>

        {/* Stats summary */}
        <div className="mb-6 p-3 rounded-lg space-y-2" style={{ background: 'rgba(22,27,34,0.8)', border: '1px solid rgba(48,54,61,0.6)' }}>
          <div className="flex justify-between text-xs">
            <span className="text-[#8B949E]">Total logs</span>
            <span className="text-[#F0F6FC] terminal-font">{data?.total ?? 0}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-[#34D399]">Benign</span>
            <span className="text-[#34D399] terminal-font">{totalBenign}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-[#E3000F]">Threats</span>
            <span className="text-[#E3000F] terminal-font">{totalAttack}</span>
          </div>
        </div>

        {/* Source */}
        <div className="mb-6">
          <p className="text-[#8B949E] text-[10px] font-medium uppercase tracking-widest mb-3">Source</p>
          {[{ value: 'all', label: 'All Sources' }, ...SOURCES.map(s => ({
            value: s,
            label: s === 'SSH' ? 'SSH Auth' : s === 'UEBA' ? 'UEBA Behavioral' : s === 'Network' ? 'Network Flows' : 'HDFS System',
          }))].map(opt => (
            <label key={opt.value} className="flex items-center gap-2.5 mb-2.5 cursor-pointer group">
              <input
                type="radio" name="log-source" value={opt.value}
                checked={source === opt.value}
                onChange={() => setSource(opt.value)}
                className="accent-[#4DABF7]"
              />
              <span className={`text-sm transition-colors ${source === opt.value ? 'text-[#F0F6FC]' : 'text-[#8B949E] group-hover:text-[#F0F6FC]'}`}>
                {opt.label}
              </span>
            </label>
          ))}
        </div>

        {/* Verdict */}
        <div className="mb-6">
          <p className="text-[#8B949E] text-[10px] font-medium uppercase tracking-widest mb-3">Verdict</p>
          {VERDICT_OPTS.map(opt => (
            <label key={opt.value} className="flex items-center gap-2.5 mb-2.5 cursor-pointer group">
              <input
                type="radio" name="log-verdict" value={opt.value}
                checked={status === opt.value}
                onChange={() => setStatus(opt.value)}
                className="accent-[#4DABF7]"
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
            <span className="text-[#4DABF7] text-xs terminal-font">{minConf}%</span>
          </div>
          <Slider
            value={[minConf]} onValueChange={([v]) => setMinConf(v)}
            min={0} max={99} step={5}
            className="[&_[role=slider]]:bg-[#4DABF7] [&_[role=slider]]:border-[#4DABF7]"
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

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="px-5 py-3.5 flex items-center gap-3 shrink-0"
          style={{ borderBottom: '1px solid rgba(48,54,61,0.7)' }}>
          <Terminal className="w-4 h-4 text-[#4DABF7] shrink-0" />
          <span className="text-[#F0F6FC] text-sm font-semibold mr-2">Log Explorer</span>

          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8B949E]" />
            <input
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Search ID, IP, event description…"
              className="w-full pl-9 pr-4 py-1.5 rounded-lg text-xs text-[#F0F6FC] placeholder-[#8B949E] outline-none"
              style={{ background: 'rgba(22,27,34,0.8)', border: '1px solid rgba(48,54,61,0.8)' }}
            />
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {data && (
              <span className="text-[#8B949E] text-xs">
                {rows.length.toLocaleString()} / {data.total.toLocaleString()} logs
              </span>
            )}
            <button
              onClick={exportCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-[#8B949E] hover:text-[#F0F6FC] transition-colors"
              style={{ border: '1px solid rgba(48,54,61,0.7)' }}
              title="Export CSV"
            >
              <Download className="w-3.5 h-3.5" /> Export
            </button>
            <button
              onClick={loadData}
              className="p-1.5 rounded-lg text-[#8B949E] hover:text-[#F0F6FC] transition-colors"
              style={{ border: '1px solid rgba(48,54,61,0.7)' }}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Log table */}
        <div className="flex-1 overflow-y-auto" style={{ background: 'rgba(9,12,16,0.3)' }}>
          {error ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <p className="text-[#E3000F] text-sm mb-1">Failed to load logs</p>
              <p className="text-[#8B949E] text-xs mb-4">{error}</p>
              <button onClick={loadData} className="text-xs text-[#4DABF7] underline">Retry</button>
            </div>
          ) : loading && !data ? (
            <div className="flex items-center justify-center h-64">
              <RefreshCw className="w-5 h-5 text-[#8B949E] animate-spin" />
            </div>
          ) : (
            <table className="w-full">
              <thead className="sticky top-0" style={{ background: 'rgba(9,12,16,0.97)', backdropFilter: 'blur(8px)' }}>
                <tr style={{ borderBottom: '1px solid rgba(48,54,61,0.6)' }}>
                  {['Timestamp', 'Log ID', 'Source', 'Event Description', 'Verdict', 'Type', 'Confidence'].map(h => (
                    <th key={h} className="px-3 py-2.5 text-left text-[#8B949E] text-[10px] font-medium uppercase tracking-widest whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && !loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-[#8B949E] text-sm">
                      No logs match the current filters
                    </td>
                  </tr>
                ) : rows.map((log, i) => {
                  const isAttack = log.verdict === 'ATTACK' || log.verdict === 'ZERO_DAY';
                  return (
                    <motion.tr
                      key={log.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.15, delay: i * 0.02 }}
                      className="group transition-colors"
                      style={{
                        borderBottom: '1px solid rgba(48,54,61,0.2)',
                        background: isAttack
                          ? 'rgba(227,0,15,0.03)'
                          : 'transparent',
                        borderLeft: isAttack ? '2px solid rgba(227,0,15,0.4)' : '2px solid transparent',
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = isAttack ? 'rgba(227,0,15,0.06)' : 'rgba(22,27,34,0.5)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = isAttack ? 'rgba(227,0,15,0.03)' : 'transparent'; }}
                    >
                      <td className="px-3 py-2 text-[#8B949E] text-[11px] terminal-font whitespace-nowrap">
                        {new Date(log.time).toLocaleTimeString('en-GB', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        <span className="block text-[9px] text-[#8B949E]/50">
                          {new Date(log.time).toLocaleDateString('en-GB')}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-[#4DABF7] text-[11px] terminal-font whitespace-nowrap">{log.id}</td>
                      <td className="px-3 py-2"><SourceTag source={log.source} /></td>
                      <td className="px-3 py-2 max-w-[260px]">
                        <p className="text-[#F0F6FC] text-[11px] truncate">{log.title}</p>
                        <p className="text-[#8B949E] text-[10px] truncate mt-0.5">{log.reason?.slice(0, 80)}…</p>
                      </td>
                      <td className="px-3 py-2"><VerdictPill verdict={log.verdict} /></td>
                      <td className="px-3 py-2 text-[#8B949E] text-[11px] max-w-[120px] truncate">
                        {log.attack_type ?? log.prediction ?? '—'}
                      </td>
                      <td className="px-3 py-2"><ConfBar value={log.confidence} /></td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {data && data.pages > 1 && (
          <div className="px-5 py-2.5 flex items-center justify-between shrink-0"
            style={{ borderTop: '1px solid rgba(48,54,61,0.7)' }}>
            <span className="text-[#8B949E] text-xs terminal-font">
              Page {data.page} / {data.pages} · {data.total.toLocaleString()} total
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1.5 rounded text-[#8B949E] hover:text-[#F0F6FC] disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              {Array.from({ length: Math.min(5, data.pages) }, (_, i) => {
                const p = page <= 3 ? i + 1 : page + i - 2;
                if (p < 1 || p > data.pages) return null;
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className="w-6 h-6 rounded text-xs font-medium transition-all terminal-font"
                    style={p === page
                      ? { background: 'rgba(77,171,247,0.15)', color: '#4DABF7', border: '1px solid rgba(77,171,247,0.3)' }
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
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
