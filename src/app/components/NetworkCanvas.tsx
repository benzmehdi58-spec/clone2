import { useRef, useEffect } from 'react';
import type { Alert } from '../types';

interface NetworkCanvasProps {
  alerts: Alert[];
  height?: number;
}

interface Particle {
  id: string;
  isAttack: boolean;
  sourceKey: 'ssh' | 'ueba' | 'network';
  phase: 'toCore' | 'atCore' | 'toOutput';
  progress: number;
  output: 'benign' | 'anomaly';
  coreArrivalTime: number;
}

// Proportional node positions [0..1]
const NODES = {
  ssh:     { rx: 0.08, ry: 0.22, r: 11, label: 'SSH Auth',  color: '#4DABF7' },
  ueba:    { rx: 0.08, ry: 0.50, r: 11, label: 'UEBA',      color: '#9775FA' },
  network: { rx: 0.08, ry: 0.78, r: 11, label: 'Network',   color: '#51CF66' },
  core:    { rx: 0.50, ry: 0.50, r: 24, label: 'AI Core',   color: '#00D4FF' },
  benign:  { rx: 0.88, ry: 0.28, r: 13, label: 'BENIGN',    color: '#51CF66' },
  anomaly: { rx: 0.88, ry: 0.72, r: 13, label: 'ANOMALY',   color: '#E3000F' },
} as const;

type NodeKey = keyof typeof NODES;

const SOURCE_MAP: Record<string, 'ssh' | 'ueba' | 'network'> = {
  SSH: 'ssh', UEBA: 'ueba', Network: 'network',
};

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);
const lerp  = (a: number, b: number, t: number) => a + (b - a) * clamp(t, 0, 1);

// Convert a 6-digit hex color to rgba() — avoids invalid "hex + alpha-hex-suffix" strings.
function hexAlpha(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export function NetworkCanvas({ alerts, height = 290 }: NetworkCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dimsRef   = useRef({ w: 0, h: 0 });
  const stateRef  = useRef({
    particles: [] as Particle[],
    prevCount: 0,
    coreFlashTime: 0,
    lastTime: 0,
  });
  const animRef = useRef<number | null>(null);

  // Inject new particles when real alerts arrive
  useEffect(() => {
    const s = stateRef.current;
    // Only react to new alerts arriving AFTER the initial load
    // Use a small threshold so the initial 100-alert preload doesn't flood the canvas
    const delta = alerts.length - s.prevCount;
    if (delta > 0) {
      // Take the newest alerts (the delta), cap at 8 to avoid flooding
      const incoming = alerts.slice(0, Math.min(delta, 8));
      incoming.forEach(a => {
        const isAttack = a.verdict === 'ATTACK' || a.verdict === 'ZERO_DAY';
        s.particles.push({
          id: a.id,
          isAttack,
          sourceKey: SOURCE_MAP[a.source] ?? 'network',
          phase: 'toCore',
          progress: 0,
          output: isAttack ? 'anomaly' : 'benign',
          coreArrivalTime: 0,
        });
      });
      if (s.particles.length > 60) s.particles = s.particles.slice(-60);
    }
    s.prevCount = alerts.length;
  }, [alerts]);

  // Canvas animation loop — runs once on mount
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

    function nodePos(key: NodeKey) {
      const { w, h } = dimsRef.current;
      const n = NODES[key];
      return { x: n.rx * w, y: n.ry * h, r: n.r };
    }

    function drawNode(key: NodeKey, flashIntensity = 0) {
      const { x, y, r } = nodePos(key);
      const n = NODES[key];
      const isCore = key === 'core';
      // Resolved ring/dot color — always a valid CSS color string.
      const ringColor = (isCore && flashIntensity > 0)
        ? `rgba(227,0,15,${flashIntensity})`
        : n.color;
      // Glow halo uses hexAlpha so we never produce "rgba(...)66"-style garbage.
      const haloAlpha = isCore ? 0.4 * (flashIntensity || 1) : 0.27;
      const haloColor = (isCore && flashIntensity > 0)
        ? `rgba(227,0,15,${haloAlpha})`
        : hexAlpha(n.color, haloAlpha);

      // Outer glow halo
      const g = ctx!.createRadialGradient(x, y, 0, x, y, r * (isCore ? 3.5 : 2.8));
      g.addColorStop(0, haloColor);
      g.addColorStop(1, 'transparent');
      ctx!.beginPath();
      ctx!.arc(x, y, r * (isCore ? 3.5 : 2.8), 0, Math.PI * 2);
      ctx!.fillStyle = g;
      ctx!.fill();

      // Ring
      ctx!.beginPath();
      ctx!.arc(x, y, r, 0, Math.PI * 2);
      ctx!.fillStyle = '#0D1117';
      ctx!.fill();
      ctx!.strokeStyle = ringColor;
      ctx!.lineWidth = isCore ? 2.5 : 1.5;
      ctx!.stroke();

      // Inner dot
      ctx!.beginPath();
      ctx!.arc(x, y, r * 0.34, 0, Math.PI * 2);
      ctx!.fillStyle = ringColor;
      ctx!.fill();

      // Label
      ctx!.font = `11px Inter, system-ui`;
      ctx!.textAlign = 'center';
      ctx!.fillStyle = '#8B949E';
      ctx!.fillText(n.label, x, y + r + 15);
    }

    function drawEdge(ax: number, ay: number, bx: number, by: number, color: string) {
      ctx!.beginPath();
      ctx!.setLineDash([5, 10]);
      ctx!.moveTo(ax, ay);
      ctx!.lineTo(bx, by);
      ctx!.strokeStyle = color;
      ctx!.lineWidth = 1;
      ctx!.stroke();
      ctx!.setLineDash([]);
    }

    function frame(now: number) {
      const { w, h } = dimsRef.current;
      const s = stateRef.current;
      const dt = Math.min(now - (s.lastTime || now), 50);
      s.lastTime = now;

      ctx!.clearRect(0, 0, w, h);



      const cP = nodePos('core');
      const bP = nodePos('benign');
      const aP = nodePos('anomaly');

      // Edges
      (['ssh', 'ueba', 'network'] as NodeKey[]).forEach(k => {
        const p = nodePos(k);
        drawEdge(p.x, p.y, cP.x, cP.y, '#30363D');
      });
      drawEdge(cP.x, cP.y, bP.x, bP.y, '#51CF6628');
      drawEdge(cP.x, cP.y, aP.x, aP.y, '#E3000F28');

      // Flash calc
      const flashAge = now - s.coreFlashTime;
      const flashIntensity = flashAge < 700 ? clamp(1 - flashAge / 700, 0, 1) : 0;

      // Static nodes
      (['ssh', 'ueba', 'network', 'benign', 'anomaly'] as NodeKey[]).forEach(k => drawNode(k));
      drawNode('core', flashIntensity);

      // Particles
      const SPEED = 0.00075;
      s.particles = s.particles.filter(p => {
        const srcP = nodePos(p.sourceKey);
        const outP = nodePos(p.output === 'anomaly' ? 'anomaly' : 'benign');
        let px = 0, py = 0;

        if (p.phase === 'toCore') {
          p.progress = Math.min(p.progress + SPEED * dt, 1);
          px = lerp(srcP.x, cP.x, p.progress);
          py = lerp(srcP.y, cP.y, p.progress);
          if (p.progress >= 1) {
            p.phase = 'atCore';
            p.coreArrivalTime = now;
            if (p.isAttack) s.coreFlashTime = now;
          }
        } else if (p.phase === 'atCore') {
          px = cP.x; py = cP.y;
          if (now - p.coreArrivalTime > 480) { p.phase = 'toOutput'; p.progress = 0; }
        } else {
          p.progress = Math.min(p.progress + SPEED * dt, 1);
          px = lerp(cP.x, outP.x, p.progress);
          py = lerp(cP.y, outP.y, p.progress);
          if (p.progress >= 1) return false;
        }

        const color = p.isAttack ? '#E3000F' : '#A8D5FF';
        const alpha = p.phase === 'toOutput' ? 1 - p.progress : 1;
        const size  = p.isAttack ? 5 : 4;

        // Glow halo
        const grd = ctx!.createRadialGradient(px, py, 0, px, py, size * 3.5);
        grd.addColorStop(0, p.isAttack
          ? `rgba(227,0,15,${0.55 * alpha})`
          : `rgba(168,213,255,${0.4 * alpha})`);
        grd.addColorStop(1, 'transparent');
        ctx!.beginPath();
        ctx!.arc(px, py, size * 3.5, 0, Math.PI * 2);
        ctx!.fillStyle = grd;
        ctx!.fill();

        // Core dot
        ctx!.globalAlpha = alpha;
        ctx!.beginPath();
        ctx!.arc(px, py, size, 0, Math.PI * 2);
        ctx!.fillStyle = color;
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

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height, display: 'block' }}
      className="rounded-xl"
    />
  );
}
