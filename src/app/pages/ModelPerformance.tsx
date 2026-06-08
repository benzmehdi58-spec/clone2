import { useState } from 'react';
import { motion } from 'motion/react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip, ResponsiveContainer, Cell,
  LineChart, Line,
} from 'recharts';
import { Brain, Target, TrendingUp, Activity, Clock, Database, Zap, Cpu } from 'lucide-react';
import { MetricCard } from '../components/MetricCard';

/* ─── Static mock data hook ─── */
function useModelStats(model: string) {
  const models = {
    ssh: {
      name: 'SSH Bi-LSTM',
      architecture: 'Bi-Directional LSTM with Attention',
      accuracy: 99.4, precision: 98.2, recall: 99.1, f1: 98.6,
      lastTrained: '2 hours ago',
      datasetSize: '1.2M rows',
      latency: '12ms',
      epochs: 140,
      lossHistory: [
        { epoch: 20, loss: 0.48 }, { epoch: 40, loss: 0.31 }, { epoch: 60, loss: 0.19 },
        { epoch: 80, loss: 0.12 }, { epoch: 100, loss: 0.08 }, { epoch: 120, loss: 0.05 },
        { epoch: 140, loss: 0.03 },
      ],
      confusion: { tp: 9847, fp: 112, tn: 87341, fn: 89 },
      features: [
        { name: 'Login Attempts', importance: 94 },
        { name: 'Inter-Packet Gap', importance: 81 },
        { name: 'Time of Day', importance: 73 },
        { name: 'Session Duration', importance: 66 },
        { name: 'Geo Distance', importance: 58 },
      ],
    },
    ueba: {
      name: 'UEBA Ensemble',
      architecture: 'Random Forest + Isolation Forest Ensemble',
      accuracy: 97.8, precision: 96.5, recall: 98.3, f1: 97.4,
      lastTrained: '5 hours ago',
      datasetSize: '840K rows',
      latency: '8ms',
      epochs: 200,
      lossHistory: [
        { epoch: 20, loss: 0.55 }, { epoch: 40, loss: 0.38 }, { epoch: 60, loss: 0.25 },
        { epoch: 80, loss: 0.17 }, { epoch: 100, loss: 0.11 }, { epoch: 140, loss: 0.07 },
        { epoch: 200, loss: 0.04 },
      ],
      confusion: { tp: 7234, fp: 198, tn: 65421, fn: 124 },
      features: [
        { name: 'Access Frequency', importance: 91 },
        { name: 'Data Volume', importance: 85 },
        { name: 'Privilege Level', importance: 79 },
        { name: 'Off-Hours Activity', importance: 71 },
        { name: 'Geo Anomaly', importance: 63 },
      ],
    },
    network: {
      name: 'Network XGBoost',
      architecture: 'XGBoost with SHAP Explanations',
      accuracy: 98.9, precision: 97.7, recall: 99.3, f1: 98.5,
      lastTrained: '1 hour ago',
      datasetSize: '2.1M rows',
      latency: '4ms',
      epochs: 350,
      lossHistory: [
        { epoch: 50,  loss: 0.42 }, { epoch: 100, loss: 0.28 }, { epoch: 150, loss: 0.18 },
        { epoch: 200, loss: 0.12 }, { epoch: 250, loss: 0.08 }, { epoch: 300, loss: 0.05 },
        { epoch: 350, loss: 0.03 },
      ],
      confusion: { tp: 18234, fp: 287, tn: 142891, fn: 134 },
      features: [
        { name: 'Packet Size', importance: 96 },
        { name: 'Protocol Type', importance: 88 },
        { name: 'Flow Duration', importance: 76 },
        { name: 'Bytes / Second', importance: 69 },
        { name: 'Dst Port', importance: 61 },
      ],
    },
  };
  return models[model as keyof typeof models] ?? models.ssh;
}

/* ─── Sub-components ─── */

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200"
      style={active ? {
        background: 'rgba(227,0,15,0.12)',
        color: '#E3000F',
        border: '1px solid rgba(227,0,15,0.3)',
      } : {
        color: '#8B949E',
        border: '1px solid transparent',
      }}
    >
      {children}
    </button>
  );
}

function MiniSparkline() {
  const data = [
    { v: 96 }, { v: 97 }, { v: 97.5 }, { v: 98 }, { v: 97.8 }, { v: 98.5 }, { v: 99.1 },
  ];
  return (
    <ResponsiveContainer width="100%" height={28}>
      <LineChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
        <Line type="monotone" dataKey="v" stroke="#34D399" strokeWidth={1.5} dot={false} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

function ConfusionMatrix({ tp, fp, tn, fn }: { tp: number; fp: number; tn: number; fn: number }) {
  const total = tp + fp + tn + fn;
  const cells = [
    { label: 'True Positive', short: 'TP', value: tp, heat: tp / total, good: true },
    { label: 'False Positive', short: 'FP', value: fp, heat: fp / total, good: false },
    { label: 'False Negative', short: 'FN', value: fn, heat: fn / total, good: false },
    { label: 'True Negative', short: 'TN', value: tn, heat: tn / total, good: true },
  ];

  function cellColor(heat: number, good: boolean) {
    if (good) {
      // dark blue → cyan for good cells (low → high)
      const i = Math.round(heat * 255);
      return `rgba(${Math.round(30 + heat * 48)},${Math.round(80 + heat * 130)},${Math.round(120 + heat * 135)},${0.25 + heat * 0.55})`;
    } else {
      // dark → red for bad cells
      return `rgba(227,${Math.round(0 + (1 - heat) * 20)},15,${0.08 + heat * 0.55})`;
    }
  }

  return (
    <div>
      <div className="text-xs text-muted-foreground mb-3 flex items-center gap-2">
        <span className="uppercase tracking-wider">Confusion Matrix</span>
        <span className="text-[#30363D]">·</span>
        <span>{total.toLocaleString()} samples</span>
      </div>
      <div className="mb-1 grid grid-cols-2 gap-1 text-center text-[10px] text-muted-foreground">
        <span>Predicted: ATTACK</span>
        <span>Predicted: BENIGN</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {cells.map(c => (
          <motion.div
            key={c.short}
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="rounded-xl p-4 flex flex-col items-center justify-center gap-1"
            style={{ background: cellColor(c.heat, c.good), border: `1px solid ${c.good ? 'rgba(77,171,247,0.2)' : 'rgba(227,0,15,0.2)'}` }}
          >
            <span className="text-[10px] font-mono text-muted-foreground">{c.short}</span>
            <span className="text-xl font-bold tabular-nums" style={{ color: c.good ? '#4DABF7' : '#E3000F' }}>
              {c.value.toLocaleString()}
            </span>
            <span className="text-[10px] text-muted-foreground text-center">{c.label}</span>
            <span className="text-[10px] font-mono" style={{ color: c.good ? '#34D399' : '#FBBF24' }}>
              {((c.value / total) * 100).toFixed(2)}%
            </span>
          </motion.div>
        ))}
      </div>

      {/* Row labels */}
      <div className="mt-3 grid grid-cols-2 gap-1 text-center text-[10px] text-muted-foreground">
        <span>Actual: ATTACK</span>
        <span>Actual: BENIGN</span>
      </div>
    </div>
  );
}

const BAR_COLORS = ['#E3000F', '#F03030', '#4DABF7', '#9775FA', '#51CF66'];

function FeatureImportance({ features }: { features: { name: string; importance: number }[] }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Feature Importance (SHAP)</div>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart
          data={features}
          layout="vertical"
          margin={{ top: 0, right: 12, bottom: 0, left: 8 }}
        >
          <CartesianGrid strokeDasharray="3 6" stroke="#30363D" horizontal={false} />
          <XAxis type="number" domain={[0, 100]} tick={{ fill: '#8B949E', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} />
          <YAxis type="category" dataKey="name" tick={{ fill: '#8B949E', fontSize: 10 }} tickLine={false} axisLine={false} width={100} />
          <RTooltip
            formatter={(v: number) => [`${v}%`, 'Importance']}
            contentStyle={{ background: '#161B22', border: '1px solid #30363D', borderRadius: 8, fontSize: 12, color: '#F0F6FC' }}
          />
          <Bar dataKey="importance" radius={[0, 4, 4, 0]} isAnimationActive={false}>
            {features.map((_, i) => (
              <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function LossChart({ data }: { data: { epoch: number; loss: number }[] }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Training Loss Curve</div>
      <ResponsiveContainer width="100%" height={120}>
        <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
          <CartesianGrid strokeDasharray="3 6" stroke="#30363D" vertical={false} />
          <XAxis dataKey="epoch" tick={{ fill: '#8B949E', fontSize: 10 }} tickLine={false} axisLine={false} label={{ value: 'Epoch', position: 'insideBottom', fill: '#8B949E', fontSize: 10, dy: 8 }} />
          <YAxis tick={{ fill: '#8B949E', fontSize: 10 }} tickLine={false} axisLine={false} />
          <RTooltip
            formatter={(v: number) => [v.toFixed(3), 'Loss']}
            contentStyle={{ background: '#161B22', border: '1px solid #30363D', borderRadius: 8, fontSize: 12, color: '#F0F6FC' }}
          />
          <Line id="loss-line" type="monotone" dataKey="loss" stroke="#E3000F" strokeWidth={2} dot={{ fill: '#E3000F', r: 3 }} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ─── Model Spec Card ─── */
function ModelSpecCard({ stats }: { stats: ReturnType<typeof useModelStats> }) {
  const specs = [
    { icon: Clock,    label: 'Last Trained',      value: stats.lastTrained },
    { icon: Database, label: 'Dataset Size',       value: stats.datasetSize },
    { icon: Zap,      label: 'Inference Latency',  value: stats.latency },
    { icon: Cpu,      label: 'Architecture',       value: stats.architecture },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.45, delay: 0.3 }}
      className="glass-card rounded-xl p-5 h-fit"
    >
      <div className="flex items-center gap-2 mb-5">
        <Brain className="w-4 h-4 text-[#E3000F]" style={{ filter: 'drop-shadow(0 0 6px rgba(227,0,15,0.6))' }} />
        <span className="text-foreground font-semibold text-sm">Model Specs</span>
      </div>

      <div className="space-y-4">
        {specs.map(({ icon: Icon, label, value }) => (
          <div key={label}>
            <div className="flex items-center gap-2 mb-1">
              <Icon className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-muted-foreground text-xs">{label}</span>
            </div>
            <div className="text-foreground text-sm font-medium pl-5">{value}</div>
          </div>
        ))}
      </div>

      <div className="mt-5 pt-4" style={{ borderTop: '1px solid rgba(48,54,61,0.7)' }}>
        <div className="text-muted-foreground text-xs mb-3">ROC-AUC Score</div>
        <div className="flex items-end gap-2">
          <span className="text-[#34D399] text-2xl font-bold">0.998</span>
          <span className="text-muted-foreground text-xs mb-1">/ 1.000</span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden mt-2" style={{ background: 'rgba(48,54,61,0.6)' }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: '99.8%' }}
            transition={{ duration: 1.2, delay: 0.5, ease: 'easeOut' }}
            className="h-full rounded-full"
            style={{ background: 'linear-gradient(90deg, #34D399, #4DABF7)' }}
          />
        </div>
      </div>

      <div className="mt-4">
        <div className="text-muted-foreground text-xs mb-2">Status</div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-emerald-400 text-sm font-medium">Production — Healthy</span>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Page ─── */
const TABS = [
  { id: 'ssh',     label: 'SSH Bi-LSTM' },
  { id: 'ueba',    label: 'UEBA Ensemble' },
  { id: 'network', label: 'Network XGBoost' },
];

export function ModelPerformance() {
  const [activeModel, setActiveModel] = useState('ssh');
  const stats = useModelStats(activeModel);

  return (
    <div className="p-6 max-w-screen-2xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-8"
      >
        <h1 className="text-foreground text-2xl font-bold tracking-tight">Model Performance & ML Ops</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Deep learning model metrics — <span className="text-[#E3000F]">CyberAI</span> inference engine
        </p>
      </motion.div>

      {/* Model Selector Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="glass-card rounded-xl p-1.5 inline-flex gap-1 mb-6"
      >
        {TABS.map(t => (
          <TabButton key={t.id} active={activeModel === t.id} onClick={() => setActiveModel(t.id)}>
            {t.label}
          </TabButton>
        ))}
      </motion.div>

      {/* Layout: main content + side panel */}
      <div className="flex gap-4 items-start">
        <div className="flex-1 min-w-0 space-y-4">
          {/* Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard title="Accuracy" value={`${stats.accuracy}%`} icon={Target} variant="success" delay={0.1}>
              <MiniSparkline />
            </MetricCard>
            <MetricCard title="Precision" value={`${stats.precision}%`} icon={Activity} variant="success" delay={0.17}>
              <MiniSparkline />
            </MetricCard>
            <MetricCard title="Recall" value={`${stats.recall}%`} icon={TrendingUp} variant="success" delay={0.24}>
              <MiniSparkline />
            </MetricCard>
            <MetricCard title="F1-Score" value={`${stats.f1}%`} icon={Brain} variant="success" delay={0.31}>
              <MiniSparkline />
            </MetricCard>
          </div>

          {/* Confusion Matrix + Feature Importance */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <motion.div
              key={`confusion-${activeModel}`}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.35 }}
              className="glass-card rounded-xl p-5"
            >
              <ConfusionMatrix {...stats.confusion} />
            </motion.div>

            <motion.div
              key={`features-${activeModel}`}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.42 }}
              className="glass-card rounded-xl p-5"
            >
              <FeatureImportance features={stats.features} />
            </motion.div>
          </div>

          {/* Training Loss Curve */}
          <motion.div
            key={`loss-${activeModel}`}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.48 }}
            className="glass-card rounded-xl p-5"
          >
            <LossChart data={stats.lossHistory} />
          </motion.div>
        </div>

        {/* Spec Panel */}
        <div className="w-64 shrink-0 hidden lg:block">
          <ModelSpecCard key={activeModel} stats={stats} />
        </div>
      </div>

      {/* Mobile spec card */}
      <div className="lg:hidden mt-4">
        <ModelSpecCard key={`mob-${activeModel}`} stats={stats} />
      </div>
    </div>
  );
}
