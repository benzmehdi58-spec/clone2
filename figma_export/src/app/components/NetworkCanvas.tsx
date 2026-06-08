import { useRef, useEffect, useState } from 'react';
import type { Alert } from '../types';

interface NetworkCanvasProps {
  alerts: Alert[];
  height?: number;
}

// ─── Node topology ────────────────────────────────────────────────────────────
const NODES = {
  // Sources (col 1)
  ssh:        { rx: 0.06, ry: 0.22, r: 9,  label: 'SSH Auth',     sublabel: 'Log Source',   color: '#4DABF7', type: 'source' as const },
  ueba:       { rx: 0.06, ry: 0.50, r: 9,  label: 'UEBA',          sublabel: 'Behavioral',   color: '#9775FA', type: 'source' as const },
  network:    { rx: 0.06, ry: 0.78, r: 9,  label: 'Network',       sublabel: 'Packets',      color: '#51CF66', type: 'source' as const },
  // ML Models (col 2)
  bilstm:     { rx: 0.24, ry: 0.22, r: 14, label: 'Bi-LSTM',       sublabel: 'SSH Model',    color: '#4DABF7', type: 'model'  as const },
  cnnlstm:    { rx: 0.24, ry: 0.50, r: 14, label: 'CNN-BiLSTM',    sublabel: '8-Head Attn',  color: '#9775FA', type: 'model'  as const },
  lgbm:       { rx: 0.24, ry: 0.78, r: 14, label: 'LightGBM',      sublabel: 'Stage 1',      color: '#51CF66', type: 'model'  as const },
  // Network extended pipeline (col 3 & 4)
  xgb:        { rx: 0.43, ry: 0.78, r: 14, label: 'XGBoost',       sublabel: '21-class',     color: '#F59E0B', type: 'model'  as const },
  pytorch:    { rx: 0.60, ry: 0.78, r: 14, label: 'PyTorch AE',    sublabel: 'Autoencoder',  color: '#EC4899', type: 'model'  as const },
  // LangChain Agent (col 5)
  agent:      { rx: 0.78, ry: 0.48, r: 22, label: 'LangChain',     sublabel: 'MITRE Mapper', color: '#00D4FF', type: 'agent'  as const },
  // Specific verdicts / attack classes (col 6) — 5 outputs spread vertically
  benign:     { rx: 0.94, ry: 0.10, r: 10, label: 'BENIGN',        sublabel: '',             color: '#51CF66', type: 'output' as const },
  bruteforce: { rx: 0.94, ry: 0.28, r: 10, label: 'BRUTE FORCE',   sublabel: 'T1110',        color: '#E3000F', type: 'output' as const },
  ddos:       { rx: 0.94, ry: 0.46, r: 10, label: 'DDoS / DoS',    sublabel: 'T1498',        color: '#F97316', type: 'output' as const },
  exfil:      { rx: 0.94, ry: 0.64, r: 10, label: 'EXFIL',         sublabel: 'T1041',        color: '#9775FA', type: 'output' as const },
  zeroday:    { rx: 0.94, ry: 0.82, r: 10, label: 'ZERO-DAY',      sublabel: 'T????',        color: '#FBBF24', type: 'output' as const },
} as const;

type NodeKey = keyof typeof NODES;
type OutputKey = 'benign' | 'bruteforce' | 'ddos' | 'exfil' | 'zeroday';

// Static edges
const EDGES: [NodeKey, NodeKey][] = [
  ['ssh',     'bilstm'],
  ['ueba',    'cnnlstm'],
  ['network', 'lgbm'],
  ['lgbm',    'xgb'],
  ['xgb',     'pytorch'],
  ['bilstm',  'agent'],
  ['cnnlstm', 'agent'],
  ['pytorch', 'agent'],
  ['agent',   'benign'],
  ['agent',   'bruteforce'],
  ['agent',   'ddos'],
  ['agent',   'exfil'],
  ['agent',   'zeroday'],
];

// Particle paths per source type (excluding the final output node)
const SOURCE_PATHS: Record<'ssh' | 'ueba' | 'network', NodeKey[]> = {
  ssh:     ['bilstm', 'agent'],
  ueba:    ['cnnlstm', 'agent'],
  network: ['lgbm', 'xgb', 'pytorch', 'agent'],
};

const SOURCE_MAP: Record<string, 'ssh' | 'ueba' | 'network'> = {
  SSH: 'ssh', UEBA: 'ueba', Network: 'network',
};

const DWELL_MS: Record<string, number> = {
  source: 0, model: 420, agent: 640, output: 0,
};

// ─── Output node resolution ───────────────────────────────────────────────────
function resolveOutput(isAttack: boolean, verdict?: string, attackType?: string, source?: string): OutputKey {
  if (!isAttack) return 'benign';
  if (verdict === 'ZERO_DAY') return 'zeroday';
  const t = (attackType ?? '').toLowerCase();
  if (t.includes('brute') || t.includes('credential') || t.includes('lateral') || t.includes('pivot') || t.includes('backdoor') || t.includes('key ex') || t.includes('forward')) return 'bruteforce';
  if (t.includes('ddos') || t.includes('dos') || t.includes('flood') || t.includes('port scan') || t.includes('sweep') || t.includes('scan') || t.includes('c2') || t.includes('ransomware') || t.includes('log4')) return 'ddos';
  if (t.includes('exfil') || t.includes('scp') || t.includes('email') || t.includes('bulk') || t.includes('data ex') || t.includes('http ex')) return 'exfil';
  // Fallback by source type
  if (source === 'SSH') return 'bruteforce';
  if (source === 'UEBA') return 'exfil';
  return 'ddos';
}

// Tooltip content
const NODE_INFO: Record<string, { title: string; desc: string; badge: string; badgeColor: string }> = {
  ssh:        { title: 'SSH Auth Log',              desc: 'Raw syslog authentication events from OpenSSH daemon',                                                          badge: 'Source',        badgeColor: '#4DABF7' },
  ueba:       { title: 'UEBA Log',                  desc: 'User & Entity Behavior Analytics — access patterns and session telemetry',                                      badge: 'Source',        badgeColor: '#9775FA' },
  network:    { title: 'Network Packets',           desc: 'Raw PCAP / NetFlow traffic data captured from network sniffers',                                               badge: 'Source',        badgeColor: '#51CF66' },
  bilstm:     { title: 'Bi-LSTM Model',             desc: 'Bidirectional LSTM trained on SSH sequences. Detects brute force, lateral movement & credential stuffing.',    badge: 'Deep Learning', badgeColor: '#4DABF7' },
  cnnlstm:    { title: 'CNN-BiLSTM + 8-Head Attn', desc: 'Temporal CNN with multi-head attention for UEBA. Identifies insider threats & anomalous access behavior.',      badge: 'Deep Learning', badgeColor: '#9775FA' },
  lgbm:       { title: 'LightGBM',                 desc: 'Gradient boosted trees — binary Stage 1 of the 3-model network pipeline.',                                      badge: 'Ensemble',      badgeColor: '#51CF66' },
  xgb:        { title: 'XGBoost — 21-Class',       desc: 'Multi-label classifier identifying DDoS, Port Scan, SQL Injection, C2, and 17 other attack categories.',        badge: 'Ensemble',      badgeColor: '#F59E0B' },
  pytorch:    { title: 'PyTorch Autoencoder',       desc: 'Reconstruction-error anomaly detection. Flags zero-day patterns not seen during supervised training.',          badge: 'Unsupervised',  badgeColor: '#EC4899' },
  agent:      { title: 'LangChain AI Agent',        desc: 'GPT-powered agent mapping detections to MITRE ATT&CK tactics and generating structured SOC incident reports.',  badge: 'AI Agent',      badgeColor: '#00D4FF' },
  benign:     { title: 'BENIGN',                   desc: 'No threat detected. Traffic classified as normal — logged for baseline model retraining.',                       badge: 'Verdict',       badgeColor: '#51CF66' },
  bruteforce: { title: 'BRUTE FORCE — T1110',      desc: 'Credential-based attack detected: brute force, credential stuffing, lateral movement via SSH.',                  badge: 'ATTACK',        badgeColor: '#E3000F' },
  ddos:       { title: 'DDoS / DoS — T1498',       desc: 'Volumetric or protocol attack: SYN flood, UDP amplification, port scan, C2 command-and-control traffic.',       badge: 'ATTACK',        badgeColor: '#F97316' },
  exfil:      { title: 'EXFILTRATION — T1041',     desc: 'Data exfiltration detected: bulk file download, SCP transfer, email leakage, or insider data theft.',           badge: 'ATTACK',        badgeColor: '#9775FA' },
  zeroday:    { title: 'ZERO-DAY — T????',         desc: 'Unknown attack pattern. PyTorch Autoencoder flagged high reconstruction error — no matching signature in DB.',   badge: 'ZERO-DAY',      badgeColor: '#FBBF24' },
};

// Particle colors per verdict / output type
const OUTPUT_COLORS: Record<OutputKey, string> = {
  benign:     '#A8D5FF',
  bruteforce: '#E3000F',
  ddos:       '#F97316',
  exfil:      '#9775FA',
  zeroday:    '#FBBF24',
};

const ATTACK_CYCLE: OutputKey[] = ['bruteforce', 'ddos', 'exfil', 'zeroday'];

interface Particle {
  id: string;
  output: OutputKey;
  sourceKey: 'ssh' | 'ueba' | 'network';
  path: NodeKey[];
  segIdx: number;
  phase: 'moving' | 'dwelling';
  progress: number;
  dwellStart: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);
const lerp  = (a: number, b: number, t: number) => a + (b - a) * clamp(t, 0, 1);

function hexAlpha(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function buildPath(srcKey: 'ssh' | 'ueba' | 'network', output: OutputKey): NodeKey[] {
  return [srcKey, ...SOURCE_PATHS[srcKey], output];
}

function spawnParticle(id: string, srcKey: 'ssh' | 'ueba' | 'network', output: OutputKey): Particle {
  return { id, output, sourceKey: srcKey, path: buildPath(srcKey, output), segIdx: 0, phase: 'moving', progress: 0, dwellStart: 0 };
}

function bezierPt(t: number, p0x: number, p0y: number, p1x: number, p1y: number, p2x: number, p2y: number, p3x: number, p3y: number): [number, number] {
  const u = 1 - t;
  return [u*u*u*p0x + 3*u*u*t*p1x + 3*u*t*t*p2x + t*t*t*p3x, u*u*u*p0y + 3*u*u*t*p1y + 3*u*t*t*p2y + t*t*t*p3y];
}

function ctrlPts(fx: number, fy: number, tx: number, ty: number): [number, number, number, number] {
  const dx = tx - fx;
  const bend = Math.abs(ty - fy) > 18 ? 0.42 : 0.15;
  return [fx + dx * bend, fy, tx - dx * bend, ty];
}

export function NetworkCanvas({ alerts, height = 430 }: NetworkCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dimsRef   = useRef({ w: 0, h: 0 });
  const stateRef  = useRef({
    particles:     [] as Particle[],
    prevCount:     0,
    autoSpawnTime: 0,
    lastTime:      0,
    nodeFlash:     {} as Record<string, number>,
    nodeProcessed: {} as Record<string, number>,
  });
  const animRef = useRef<number | null>(null);

  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [tooltipPos,  setTooltipPos]  = useState({ x: 0, y: 0 });

  // ─── Inject real alert particles ─────────────────────────────────────────
  useEffect(() => {
    const s = stateRef.current;
    if (alerts.length > s.prevCount) {
      alerts.slice(0, alerts.length - s.prevCount).forEach(a => {
        const srcKey = SOURCE_MAP[a.source] ?? 'ssh';
        const isAttack = a.verdict === 'ATTACK' || a.verdict === 'ZERO_DAY';
        const output = resolveOutput(isAttack, a.verdict, a.attack_type, a.source);
        s.particles.push(spawnParticle(a.id, srcKey, output));
      });
      if (s.particles.length > 80) s.particles = s.particles.slice(-80);
    }
    s.prevCount = alerts.length;
  }, [alerts]);

  // ─── Animation loop ───────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;

    function resize() {
      const rect = canvas!.getBoundingClientRect();
      dimsRef.current = { w: rect.width, h: rect.height };
      canvas!.width  = rect.width  * dpr;
      canvas!.height = rect.height * dpr;
      ctx!.setTransform(1, 0, 0, 1, 0, 0);
      ctx!.scale(dpr, dpr);
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    function npos(key: NodeKey) {
      const { w, h } = dimsRef.current;
      const n = NODES[key];
      return { x: n.rx * w, y: n.ry * h, r: n.r };
    }

    function drawEdge(fromKey: NodeKey, toKey: NodeKey, now: number) {
      const f = npos(fromKey);
      const t = npos(toKey);
      const [cp1x, cp1y, cp2x, cp2y] = ctrlPts(f.x, f.y, t.x, t.y);
      const col = NODES[toKey].color;
      ctx!.save();
      ctx!.beginPath();
      ctx!.setLineDash([5, 11]);
      ctx!.lineDashOffset = -(now * 0.016) % 16;
      ctx!.moveTo(f.x, f.y);
      ctx!.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, t.x, t.y);
      ctx!.strokeStyle = hexAlpha(col, 0.16);
      ctx!.lineWidth = 1;
      ctx!.stroke();
      ctx!.restore();
    }

    function drawNode(key: NodeKey, now: number) {
      const { x, y, r } = npos(key);
      const n = NODES[key];
      const s = stateRef.current;
      const flashAge = now - (s.nodeFlash[key] ?? -99999);
      const flash    = flashAge < 900 ? clamp(1 - flashAge / 900, 0, 1) : 0;
      const isCore   = n.type === 'agent';

      // Glow halo
      const glowR = r * (isCore ? 3.8 : 2.8);
      const grd = ctx!.createRadialGradient(x, y, 0, x, y, glowR);
      grd.addColorStop(0, hexAlpha(n.color, (isCore ? 0.38 : 0.20) + flash * 0.28));
      grd.addColorStop(1, 'transparent');
      ctx!.beginPath();
      ctx!.arc(x, y, glowR, 0, Math.PI * 2);
      ctx!.fillStyle = grd;
      ctx!.fill();

      // Spinning inference ring
      if (flash > 0.04 && (n.type === 'model' || n.type === 'agent')) {
        const angle  = (now * 0.004) % (Math.PI * 2);
        const arcLen = Math.PI * (0.55 + flash * 0.9);
        ctx!.save();
        ctx!.beginPath();
        ctx!.arc(x, y, r + 6, angle, angle + arcLen);
        ctx!.strokeStyle = hexAlpha(n.color, flash * 0.95);
        ctx!.lineWidth = 2;
        ctx!.lineCap = 'round';
        ctx!.stroke();
        ctx!.beginPath();
        ctx!.arc(x, y, r + 9, -angle * 0.6, -angle * 0.6 + Math.PI * 0.4);
        ctx!.strokeStyle = hexAlpha(n.color, flash * 0.3);
        ctx!.lineWidth = 1;
        ctx!.stroke();
        ctx!.restore();
      }

      // Node body
      ctx!.beginPath();
      ctx!.arc(x, y, r, 0, Math.PI * 2);
      ctx!.fillStyle = '#0D1117';
      ctx!.fill();
      ctx!.strokeStyle = flash > 0.04 ? hexAlpha(n.color, 0.6 + flash * 0.4) : n.color;
      ctx!.lineWidth = isCore ? 2.5 : 1.8;
      ctx!.stroke();

      // Inner dot
      ctx!.beginPath();
      ctx!.arc(x, y, r * 0.30, 0, Math.PI * 2);
      ctx!.fillStyle = n.color;
      ctx!.fill();

      // Label
      ctx!.textAlign = 'center';
      ctx!.font = `10px Inter, system-ui`;
      ctx!.fillStyle = '#8B949E';
      ctx!.fillText(n.label, x, y + r + 13);
      if (n.sublabel && (n.type === 'model' || n.type === 'agent' || n.type === 'output')) {
        ctx!.font = `9px Inter, system-ui`;
        ctx!.fillStyle = n.type === 'output' ? hexAlpha(n.color, 0.55) : '#374151';
        ctx!.fillText(n.sublabel, x, y + r + 23);
      }

      // Process count badge
      const count = s.nodeProcessed[key] ?? 0;
      if (count > 0 && (n.type === 'model' || n.type === 'agent')) {
        const badge = `×${count}`;
        ctx!.font = `bold 8px Inter, system-ui`;
        const bw = ctx!.measureText(badge).width + 6;
        const bx = x + r;
        const by = y - r + 1;
        ctx!.beginPath();
        ctx!.roundRect(bx - bw / 2, by - 7, bw, 11, 3);
        ctx!.fillStyle = hexAlpha(n.color, 0.85);
        ctx!.fill();
        ctx!.fillStyle = '#0D1117';
        ctx!.fillText(badge, bx, by + 0.5);
      }
    }

    function frame(now: number) {
      const { w, h } = dimsRef.current;
      const s = stateRef.current;
      const dt = Math.min(now - (s.lastTime || now), 50);
      s.lastTime = now;
      ctx!.clearRect(0, 0, w, h);

      // Auto-spawn demo particles
      if (s.prevCount === 0 && now - s.autoSpawnTime > 1400) {
        s.autoSpawnTime = now;
        const srcs = ['ssh', 'ueba', 'network'] as const;
        const srcKey = srcs[Math.floor(now / 1400) % 3];
        const isCycleAttack = Math.floor(now / 1400) % 5 !== 0;
        const output: OutputKey = isCycleAttack
          ? ATTACK_CYCLE[Math.floor(now / 1400) % 4]
          : 'benign';
        s.particles.push(spawnParticle(`auto-${now}`, srcKey, output));
        if (s.particles.length > 60) s.particles = s.particles.slice(-60);
      }

      EDGES.forEach(([f, t]) => drawEdge(f, t, now));
      (Object.keys(NODES) as NodeKey[]).forEach(k => drawNode(k, now));

      const SPEED = 0.00058;
      s.particles = s.particles.filter(p => {
        if (p.segIdx >= p.path.length - 1) return false;

        const fromKey = p.path[p.segIdx];
        const toKey   = p.path[p.segIdx + 1];
        const f = npos(fromKey);
        const t = npos(toKey);
        const [cp1x, cp1y, cp2x, cp2y] = ctrlPts(f.x, f.y, t.x, t.y);

        let px = 0, py = 0;

        if (p.phase === 'moving') {
          p.progress = Math.min(p.progress + SPEED * dt, 1);
          [px, py] = bezierPt(p.progress, f.x, f.y, cp1x, cp1y, cp2x, cp2y, t.x, t.y);

          if (p.progress >= 1) {
            px = t.x; py = t.y;
            const dwell = DWELL_MS[NODES[toKey].type] ?? 0;
            if (dwell > 0) {
              p.phase = 'dwelling';
              p.dwellStart = now;
              s.nodeFlash[toKey] = now;
              s.nodeProcessed[toKey] = (s.nodeProcessed[toKey] ?? 0) + 1;
            } else {
              if (NODES[toKey].type === 'output') return false;
              p.segIdx++; p.phase = 'moving'; p.progress = 0;
            }
          }
        } else {
          px = t.x; py = t.y;
          if (now - p.dwellStart >= (DWELL_MS[NODES[toKey].type] ?? 0)) {
            if (NODES[toKey].type === 'output') return false;
            p.segIdx++; p.phase = 'moving'; p.progress = 0;
          }
        }

        const isExiting = p.phase === 'moving' && p.progress > 0.78 && NODES[toKey].type === 'output';
        const alpha = isExiting ? lerp(1, 0, (p.progress - 0.78) / 0.22) : 1;
        const col  = OUTPUT_COLORS[p.output];
        const size = p.output === 'benign' ? 3.5 : 5;

        // Glow halo
        const grd = ctx!.createRadialGradient(px, py, 0, px, py, size * 3.5);
        grd.addColorStop(0, hexAlpha(col, 0.55 * alpha));
        grd.addColorStop(1, 'transparent');
        ctx!.beginPath();
        ctx!.arc(px, py, size * 3.5, 0, Math.PI * 2);
        ctx!.fillStyle = grd;
        ctx!.fill();

        ctx!.globalAlpha = alpha;
        ctx!.beginPath();
        ctx!.arc(px, py, size, 0, Math.PI * 2);
        ctx!.fillStyle = col;
        ctx!.fill();
        ctx!.globalAlpha = 1;

        return true;
      });

      animRef.current = requestAnimationFrame(frame);
    }

    animRef.current = requestAnimationFrame(frame);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      ro.disconnect();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Interaction ──────────────────────────────────────────────────────────
  function hitTest(e: React.MouseEvent<HTMLCanvasElement>): string | null {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const { w, h } = dimsRef.current;
    for (const [key, node] of Object.entries(NODES)) {
      if (Math.sqrt((mx - node.rx * w) ** 2 + (my - node.ry * h) ** 2) <= node.r + 9) return key;
    }
    return null;
  }

  function handleMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    const hit = hitTest(e);
    setHoveredNode(hit);
    if (hit) setTooltipPos({ x: e.clientX, y: e.clientY });
  }

  function handleClick(e: React.MouseEvent<HTMLCanvasElement>) {
    const hit = hitTest(e);
    if (!hit || NODES[hit as NodeKey].type !== 'source') return;
    const srcKey = hit as 'ssh' | 'ueba' | 'network';
    const isAttack = Math.random() < 0.75;
    const output: OutputKey = isAttack
      ? ATTACK_CYCLE[Math.floor(Math.random() * 4)]
      : 'benign';
    stateRef.current.particles.push(spawnParticle(`click-${Date.now()}`, srcKey, output));
  }

  const info     = hoveredNode ? NODE_INFO[hoveredNode] : null;
  const isSource = hoveredNode ? NODES[hoveredNode as NodeKey]?.type === 'source' : false;

  return (
    <div className="relative select-none">
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height, display: 'block', cursor: hoveredNode ? (isSource ? 'pointer' : 'crosshair') : 'default' }}
        className="rounded-xl"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredNode(null)}
        onClick={handleClick}
      />

      {hoveredNode && isSource && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 pointer-events-none">
          <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(227,0,15,0.15)', color: '#E3000F', border: '1px solid rgba(227,0,15,0.25)' }}>
            Click to inject packet
          </span>
        </div>
      )}

      {info && (
        <div className="fixed z-50 pointer-events-none" style={{ left: tooltipPos.x + 16, top: tooltipPos.y - 12 }}>
          <div className="rounded-xl text-xs max-w-[240px]" style={{ background: 'rgba(22,27,34,0.97)', border: '1px solid rgba(48,54,61,0.9)', backdropFilter: 'blur(16px)', boxShadow: '0 8px 32px rgba(0,0,0,0.55)', padding: '10px 13px' }}>
            <div className="text-[#F0F6FC] font-semibold mb-1 text-[11px]">{info.title}</div>
            <div className="text-[#8B949E] text-[10px] leading-relaxed mb-2">{info.desc}</div>
            <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold" style={{ background: hexAlpha(info.badgeColor, 0.12), color: info.badgeColor, border: `1px solid ${hexAlpha(info.badgeColor, 0.28)}` }}>
              {info.badge}
            </span>
            {isSource && <span className="ml-1.5 text-[#8B949E] text-[9px]">· click to inject</span>}
          </div>
        </div>
      )}
    </div>
  );
}
