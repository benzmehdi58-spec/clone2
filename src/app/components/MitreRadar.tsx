import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Tooltip } from 'recharts';

interface MitreRadarProps {
  technique?: string;
  techniqueId?: string;
}

const TACTICS = [
  { full: 'Initial Access',     abbr: 'Init.' },
  { full: 'Execution',          abbr: 'Exec.' },
  { full: 'Persistence',        abbr: 'Persist.' },
  { full: 'Priv. Escalation',   abbr: 'PrivEsc' },
  { full: 'Defense Evasion',    abbr: 'Evasion' },
  { full: 'Credential Access',  abbr: 'Creds.' },
  { full: 'Discovery',          abbr: 'Discov.' },
  { full: 'Lateral Movement',   abbr: 'Lateral' },
  { full: 'Exfiltration',       abbr: 'Exfil.' },
  { full: 'Impact',             abbr: 'Impact' },
];

const KEYWORD_MAP: Record<string, Partial<Record<string, number>>> = {
  'bruteforce':         { 'Credential Access': 95, 'Initial Access': 72, 'Discovery': 38 },
  'brute force':        { 'Credential Access': 95, 'Initial Access': 72, 'Discovery': 38 },
  'valid accounts':     { 'Initial Access': 90, 'Persistence': 75, 'Lateral Movement': 62 },
  'port scan':          { 'Discovery': 95, 'Initial Access': 50 },
  'network scan':       { 'Discovery': 92, 'Initial Access': 48 },
  'exfiltration':       { 'Exfiltration': 96, 'Defense Evasion': 55 },
  'data exfiltration':  { 'Exfiltration': 96, 'Defense Evasion': 55 },
  'ddos':               { 'Impact': 97, 'Execution': 42 },
  'sql injection':      { 'Execution': 90, 'Initial Access': 82, 'Priv. Escalation': 58 },
  'command injection':  { 'Execution': 94, 'Priv. Escalation': 70 },
  'persistence':        { 'Persistence': 96, 'Defense Evasion': 68 },
  'lateral movement':   { 'Lateral Movement': 95, 'Discovery': 72, 'Credential Access': 60 },
  'ssh':                { 'Initial Access': 88, 'Credential Access': 65, 'Lateral Movement': 45 },
  'ueba':               { 'Defense Evasion': 75, 'Discovery': 60, 'Exfiltration': 52 },
};

function buildData(technique?: string) {
  const lower = technique?.toLowerCase() ?? '';
  let overrides: Partial<Record<string, number>> = {};
  for (const [kw, vals] of Object.entries(KEYWORD_MAP)) {
    if (lower.includes(kw)) { overrides = vals; break; }
  }
  // Deterministic noise seed from technique string
  let hash = 5381;
  for (let i = 0; i < lower.length; i++) hash = ((hash << 5) + hash + lower.charCodeAt(i)) & 0xffffffff;

  return TACTICS.map(({ full, abbr }, i) => ({
    abbr,
    full,
    score: overrides[full] ?? Math.abs(((hash >> i) & 0x1f) + 8),
  }));
}

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: { payload: { full: string; score: number } }[] }) => {
  if (!active || !payload?.length) return null;
  const { full, score } = payload[0].payload;
  return (
    <div className="glass-card rounded-lg px-3 py-2 text-xs">
      <p className="text-[#8B949E]">{full}</p>
      <p className="text-[#E3000F] font-semibold">{score}</p>
    </div>
  );
};

export function MitreRadar({ technique, techniqueId }: MitreRadarProps) {
  const data = buildData(technique);
  return (
    <div>
      {(techniqueId || technique) && (
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          {techniqueId && (
            <span
              className="px-2 py-0.5 rounded text-[#E3000F] text-xs font-mono font-semibold"
              style={{ background: 'rgba(227,0,15,0.1)', border: '1px solid rgba(227,0,15,0.25)' }}
            >
              {techniqueId}
            </span>
          )}
          {technique && <span className="text-[#8B949E] text-xs">{technique}</span>}
        </div>
      )}
      <ResponsiveContainer width="100%" height={220}>
        <RadarChart data={data} margin={{ top: 10, right: 28, bottom: 10, left: 28 }}>
          <PolarGrid stroke="#30363D" />
          <PolarAngleAxis dataKey="abbr" tick={{ fill: '#8B949E', fontSize: 10 }} />
          <Radar
            name="Threat Score"
            dataKey="score"
            stroke="#E3000F"
            fill="#E3000F"
            fillOpacity={0.18}
            strokeWidth={1.5}
          />
          <Tooltip content={<CustomTooltip />} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
