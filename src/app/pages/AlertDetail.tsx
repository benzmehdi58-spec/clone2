import { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { ArrowLeft, Copy, Check, Loader2, AlertTriangle, ShieldCheck, Zap, ListChecks, Bot } from 'lucide-react';
import { toast } from 'sonner';
import { analyzeAlert, AgentReport } from '../api/agent';
import { useWebSocketData } from '../contexts/WebSocketContext';
import { MitreRadar } from '../components/MitreRadar';
import type { Alert } from '../types';

/* ─── Verdict badge ─── */
function VerdictBadge({ verdict }: { verdict?: string }) {
  const s: Record<string, { bg: string; color: string; border: string }> = {
    ATTACK:   { bg: 'rgba(227,0,15,0.12)',   color: '#E3000F', border: 'rgba(227,0,15,0.3)' },
    BENIGN:   { bg: 'rgba(52,211,153,0.1)',  color: '#34D399', border: 'rgba(52,211,153,0.3)' },
    ZERO_DAY: { bg: 'rgba(167,139,250,0.1)', color: '#A78BFA', border: 'rgba(167,139,250,0.3)' },
  };
  if (!verdict) return null;
  const v = s[verdict] ?? { bg: 'rgba(48,54,61,0.5)', color: '#8B949E', border: '#30363D' };
  return (
    <span className="inline-flex px-2.5 py-1 rounded-md text-xs font-bold"
      style={{ background: v.bg, color: v.color, border: `1px solid ${v.border}` }}>
      {verdict.replace('_', '-')}
    </span>
  );
}

/* ─── JSON display (safe — no innerHTML) ─── */
function JsonDisplay({ data }: { data: Alert }) {
  const entries = Object.entries(data).filter(([, v]) => v !== undefined && v !== null) as [string, string | number | boolean][];
  return (
    <pre className="terminal-font text-xs leading-relaxed p-5 overflow-auto h-full"
      style={{ background: 'transparent', color: '#F0F6FC', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
      <span style={{ color: '#8B949E' }}>{'{'}</span>
      {entries.map(([key, val], i) => (
        <div key={key} className="ml-4">
          <span style={{ color: '#79C0FF' }}>"{key}"</span>
          <span style={{ color: '#8B949E' }}>: </span>
          <span style={{
            color: typeof val === 'string' ? '#A5D6FF'
              : typeof val === 'number' ? '#D2A8FF'
              : typeof val === 'boolean' ? '#FF7B72'
              : '#F0F6FC',
          }}>
            {typeof val === 'string' ? `"${val}"` : String(val)}
          </span>
          {i < entries.length - 1 && <span style={{ color: '#8B949E' }}>,</span>}
        </div>
      ))}
      <span style={{ color: '#8B949E' }}>{'}'}</span>
    </pre>
  );
}

/* ─── Markdown section renderer ─── */
function MarkdownBody({ content, isActions }: { content: string; isActions?: boolean }) {
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const lines = content.split('\n').filter(l => l.trim());

  return (
    <div className="space-y-2 text-sm text-[#8B949E] leading-relaxed">
      {lines.map((line, i) => {
        if (line.startsWith('### ')) {
          return <p key={i} className="text-[#F0F6FC] font-semibold mt-4 mb-1">{line.slice(4)}</p>;
        }
        if ((line.startsWith('- [ ] ') || line.startsWith('- [x] ')) && isActions) {
          const text = line.replace(/^- \[.\] /, '');
          const done = checked.has(i);
          return (
            <label key={i} className="flex items-start gap-2.5 cursor-pointer group">
              <input
                type="checkbox"
                checked={done}
                onChange={() => setChecked(prev => {
                  const n = new Set(prev);
                  done ? n.delete(i) : n.add(i);
                  return n;
                })}
                className="mt-0.5 accent-[#E3000F]"
              />
              <span className={`transition-colors ${done ? 'line-through text-[#8B949E]/50' : 'group-hover:text-[#F0F6FC]'}`}>
                {text}
              </span>
            </label>
          );
        }
        if (line.startsWith('- ')) {
          return (
            <div key={i} className="flex items-start gap-2">
              <span className="text-[#E3000F] mt-0.5 shrink-0">›</span>
              <span>{line.slice(2)}</span>
            </div>
          );
        }
        // Inline bold
        const parts = line.split(/(\*\*[^*]+\*\*)/g);
        return (
          <p key={i}>
            {parts.map((part, j) =>
              part.startsWith('**') && part.endsWith('**')
                ? <strong key={j} className="text-[#F0F6FC]">{part.slice(2, -2)}</strong>
                : part
            )}
          </p>
        );
      })}
    </div>
  );
}

/* ─── Section config ─── */
const SECTION_CONFIG: Record<string, { icon: typeof AlertTriangle; color: string }> = {
  'Incident Summary':     { icon: AlertTriangle, color: '#E3000F' },
  'MITRE ATT&CK Context': { icon: ShieldCheck,   color: '#A78BFA' },
  'Threat Assessment':    { icon: Zap,           color: '#FBBF24' },
  'Recommended Actions':  { icon: ListChecks,    color: '#34D399' },
};

function parseReport(md: string): { title: string; body: string }[] {
  return md
    .split(/(?=^## )/m)
    .filter(Boolean)
    .map(section => {
      const lines = section.split('\n');
      return {
        title: lines[0].replace(/^## /, '').trim(),
        body: lines.slice(1).join('\n').trim(),
      };
    });
}

/* ─── Main component ─── */
export function AlertDetail() {
  const { id } = useParams<{ id: string }>();
  const { state } = useLocation() as { state: { alert?: Alert } };
  const { allAlerts } = useWebSocketData();
  const navigate = useNavigate();

  // Resolve alert from nav state first, then WebSocket cache
  const alert: Alert | undefined = state?.alert ?? allAlerts.find(a => a.id === id);

  const [report, setReport]   = useState<AgentReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [copied, setCopied]   = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    setReport(null);
    analyzeAlert(id, alert?.source ?? '', alert as unknown as Record<string, unknown>)
      .then(r => { setReport(r as AgentReport); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const copyJson = () => {
    if (!alert) return;
    navigator.clipboard.writeText(JSON.stringify(alert, null, 2)).then(() => {
      setCopied(true);
      toast.success('JSON copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const sections = report?.report_markdown ? parseReport(report.report_markdown) : [];

  const isAttack = alert?.verdict === 'ATTACK' || alert?.verdict === 'ZERO_DAY';

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div
        className="px-5 py-3.5 flex items-center gap-4 shrink-0"
        style={{ borderBottom: '1px solid rgba(48,54,61,0.7)', background: 'rgba(13,17,23,0.8)' }}
      >
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-[#8B949E] hover:text-[#F0F6FC] transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <div className="w-px h-5 bg-[#30363D]" />

        <div className="flex items-center gap-3 flex-1">
          <span className="text-[#8B949E] text-xs terminal-font">{alert?.id ?? id}</span>
          {alert && <VerdictBadge verdict={alert.verdict} />}
          {alert && (
            <span className="text-[#8B949E] text-xs hidden sm:block truncate max-w-xs">{alert.title}</span>
          )}
        </div>

        <div className="flex items-center gap-2 ml-auto">
          {alert?.source === 'insider_threat' && alert.window_start && alert.window_end ? (
            <span className="text-[#8B949E] text-xs hidden md:block">
              {alert.window_start} — {alert.window_end}
            </span>
          ) : (
            <span className="text-[#8B949E] text-xs hidden md:block">{alert?.time}</span>
          )}
          {alert && (
            <button
              onClick={copyJson}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all"
              style={{ border: '1px solid rgba(48,54,61,0.7)', color: '#8B949E' }}
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy JSON'}
            </button>
          )}
        </div>
      </div>

      {/* Split body */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── Left: Raw JSON terminal ── */}
        <div
          className="w-1/2 shrink-0 flex flex-col overflow-hidden"
          style={{ borderRight: '1px solid rgba(48,54,61,0.7)' }}
        >
          <div
            className="px-4 py-3 flex items-center gap-2 shrink-0"
            style={{ borderBottom: '1px solid rgba(48,54,61,0.5)', background: 'rgba(13,17,23,0.6)' }}
          >
            <span className="flex gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#E3000F]/60" />
              <span className="w-3 h-3 rounded-full bg-amber-400/60" />
              <span className="w-3 h-3 rounded-full bg-emerald-400/60" />
            </span>
            <span className="text-[#8B949E] text-xs terminal-font ml-2">alert.json</span>
          </div>
          <div className="flex-1 overflow-auto" style={{ background: 'rgba(9,12,16,0.6)' }}>
            {alert ? (
              <JsonDisplay data={alert} />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center p-6">
                <AlertTriangle className="w-8 h-8 text-[#30363D] mb-3" />
                <p className="text-[#8B949E] text-sm">Alert not found in live cache</p>
                <p className="text-[#8B949E]/50 text-xs mt-1">ID: {id}</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Right: AI Intelligence Briefing ── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div
            className="px-5 py-3 flex items-center gap-2 shrink-0"
            style={{ borderBottom: '1px solid rgba(48,54,61,0.5)', background: 'rgba(13,17,23,0.6)' }}
          >
            <Bot className="w-4 h-4 text-[#E3000F]" style={{ filter: 'drop-shadow(0 0 6px rgba(227,0,15,0.6))' }} />
            <span className="text-[#F0F6FC] text-sm font-semibold">LangChain AI Intelligence Report</span>
            {loading && <Loader2 className="w-3.5 h-3.5 text-[#8B949E] animate-spin ml-auto" />}
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {loading && !report && (
              <div className="flex flex-col items-center justify-center h-64 gap-4">
                <div className="relative">
                  <div className="w-12 h-12 rounded-full border-2 border-[#E3000F]/20 flex items-center justify-center">
                    <Bot className="w-5 h-5 text-[#E3000F]" />
                  </div>
                  <Loader2 className="w-12 h-12 text-[#E3000F] animate-spin absolute inset-0" />
                </div>
                <p className="text-[#8B949E] text-sm">AI agent analyzing threat…</p>
              </div>
            )}

            {error && (
              <div
                className="rounded-xl p-4"
                style={{ background: 'rgba(227,0,15,0.06)', border: '1px solid rgba(227,0,15,0.2)' }}
              >
                <p className="text-[#E3000F] text-sm font-medium mb-1">Analysis failed</p>
                <p className="text-[#8B949E] text-xs">{error}</p>
                <p className="text-[#8B949E]/60 text-xs mt-2">Ensure the backend is running at localhost:8000</p>
              </div>
            )}

            {report && sections.length === 0 && (
              <div className="rounded-xl p-4 bg-[#0D1117] border border-[#30363D]">
                <h3 className="font-semibold text-[#F0F6FC] mb-3 flex items-center gap-2">
                  <Bot size={18} className="text-[#8B949E]" />
                  {report.title || "AI Analyst Report"}
                  {report.severity && (
                    <span className={`px-2 py-0.5 rounded text-xs ml-2 ${
                      report.severity === 'critical' ? 'bg-[#E3000F] text-white' :
                      report.severity === 'high' ? 'bg-orange-500 text-white' :
                      'bg-yellow-500 text-black'
                    }`}>
                      {report.severity.toUpperCase()}
                    </span>
                  )}
                </h3>
                <div className="text-[13px] text-[#C9D1D9] whitespace-pre-wrap font-mono leading-relaxed">
                  {report.report_markdown || (report as any).report}
                </div>
              </div>
            )}

            {sections.map(({ title, body }) => {
              const cfg = SECTION_CONFIG[title];
              const Icon = cfg?.icon ?? AlertTriangle;
              const isMitre   = title.toLowerCase().includes('mitre');
              const isActions = title.toLowerCase().includes('action');
              return (
                <motion.div
                  key={title}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35 }}
                  className="glass-card rounded-xl overflow-hidden"
                >
                  <div className="px-4 py-3 flex items-center gap-2.5" style={{ borderBottom: '1px solid rgba(48,54,61,0.5)' }}>
                    <Icon className="w-4 h-4 shrink-0" style={{ color: cfg?.color ?? '#8B949E' }} />
                    <span className="text-[#F0F6FC] font-semibold text-sm">{title}</span>
                  </div>
                  <div className="p-4">
                    {isMitre && alert?.mitre_technique && (
                      <MitreRadar technique={alert.mitre_technique} techniqueId={alert.mitre_id} />
                    )}
                    <MarkdownBody content={body} isActions={isActions} />
                  </div>
                </motion.div>
              );
            })}

            {/* Threat metadata pill row when alert is available */}
            {alert && !loading && (
              <div className="flex flex-wrap gap-2 mt-2">
                {[
                  { label: 'Source',     value: alert.source },
                  { label: 'Confidence', value: `${alert.confidence}%` },
                  { label: 'Attack Type', value: alert.attack_type ?? alert.prediction ?? 'Unknown' },
                  isAttack ? { label: 'MITRE', value: alert.mitre_id ?? '—' } : null,
                ].filter(Boolean).map(item => item && (
                  <div key={item.label} className="px-3 py-1.5 rounded-lg text-xs"
                    style={{ background: 'rgba(22,27,34,0.8)', border: '1px solid rgba(48,54,61,0.7)' }}>
                    <span className="text-[#8B949E]">{item.label}: </span>
                    <span className="text-[#F0F6FC] font-medium">{item.value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
