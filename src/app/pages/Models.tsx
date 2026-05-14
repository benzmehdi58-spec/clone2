import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/Card";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  AreaChart, Area, CartesianGrid, ReferenceLine, LineChart, Line,
} from "recharts";
import { ArrowUpRight, ArrowDownRight, Server, Network, Loader2 } from "lucide-react";
import { cn } from "../utils/cn";
import { fetchModelMetrics } from "../api/agent";
import { COLORS } from "../constants";

function fmt(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n);
}

export function Models() {
  const [activeTab, setActiveTab] = useState<"network" | "system">("system");
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    setData(null);
    const result = await fetchModelMetrics(activeTab);
    setData(result);
    setIsLoading(false);
  }, [activeTab]);

  useEffect(() => { load(); }, [load]);

  const accent = activeTab === "network" ? COLORS.blue : COLORS.amber;
  const cm = data?.confusionMatrix ?? { TP: 0, TN: 0, FP: 0, FN: 0 };

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-10">
      <div>
        <h1 className="text-2xl font-semibold text-white">Model Performance</h1>
        <p className="text-[#717182] text-sm mt-1">Evaluate and monitor AI detection models.</p>
      </div>

      <div className="flex border-b border-[#30363D]">
        <button
          className={cn("px-6 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2",
            activeTab === "system" ? "border-[#D29922] text-[#D29922]" : "border-transparent text-[#717182] hover:text-[#e9ebef]")}
          onClick={() => setActiveTab("system")}
        >
          <Server className="h-4 w-4" /> System Model (HDFS) — Live
        </button>
        <button
          className={cn("px-6 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2",
            activeTab === "network" ? "border-[#2F81F7] text-[#2F81F7]" : "border-transparent text-[#717182] hover:text-[#e9ebef]")}
          onClick={() => setActiveTab("network")}
        >
          <Network className="h-4 w-4" /> Network Model (CIC-IDS2017)
        </button>
      </div>

      {isLoading || !data ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-[#717182]" /></div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {data.metrics.map((m: any, i: number) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium text-[#717182] uppercase tracking-wider">{m.label}</p>
                      <h3 className="text-3xl font-bold font-mono text-white mt-2">{m.val}</h3>
                    </div>
                    <div className={cn("flex items-center text-xs font-medium", m.up ? "text-[#3FB950]" : "text-[#F85149]")}>
                      {m.up ? <ArrowUpRight className="h-4 w-4 mr-1" /> : <ArrowDownRight className="h-4 w-4 mr-1" />}
                      {activeTab === "system" ? "Real data" : m.trend}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Confusion Matrix */}
            <Card>
              <CardHeader><CardTitle>Confusion Matrix (Binary)</CardTitle></CardHeader>
              <CardContent className="flex flex-col items-center p-6 gap-3">
                <div className="grid grid-cols-[80px_1fr_1fr] gap-2 w-full max-w-sm">
                  <div />
                  <div className="text-center text-xs text-[#717182] font-semibold">Pred Normal</div>
                  <div className="text-center text-xs text-[#717182] font-semibold">Pred Anomaly</div>

                  <div className="flex items-center text-xs text-[#717182] font-semibold">Actual Normal</div>
                  <div className="h-24 bg-[#3FB950]/10 border border-[#3FB950]/30 rounded-md flex flex-col items-center justify-center hover:bg-[#3FB950]/20 transition-colors">
                    <span className="text-2xl font-mono font-bold text-white">{fmt(cm.TN)}</span>
                    <span className="text-xs text-[#3FB950] mt-1">True Negative</span>
                  </div>
                  <div className="h-24 bg-[#F85149]/10 border border-[#F85149]/30 rounded-md flex flex-col items-center justify-center hover:bg-[#F85149]/20 transition-colors">
                    <span className="text-2xl font-mono font-bold text-[#F85149]">{fmt(cm.FP)}</span>
                    <span className="text-xs text-[#F85149] mt-1">False Positive</span>
                  </div>

                  <div className="flex items-center text-xs text-[#717182] font-semibold">Actual Anomaly</div>
                  <div className="h-24 bg-[#F85149]/10 border border-[#F85149]/30 rounded-md flex flex-col items-center justify-center hover:bg-[#F85149]/20 transition-colors">
                    <span className="text-2xl font-mono font-bold text-[#F85149]">{fmt(cm.FN)}</span>
                    <span className="text-xs text-[#F85149] mt-1">False Negative</span>
                  </div>
                  <div className="h-24 bg-[#3FB950]/20 border border-[#3FB950]/50 rounded-md flex flex-col items-center justify-center hover:bg-[#3FB950]/30 transition-colors">
                    <span className="text-2xl font-mono font-bold text-white">{fmt(cm.TP)}</span>
                    <span className="text-xs text-[#3FB950] mt-1">True Positive</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ROC Curve */}
            <Card>
              <CardHeader className="flex flex-row justify-between items-center">
                <CardTitle>ROC Curve</CardTitle>
                <span className="text-sm font-bold bg-[#30363D] px-3 py-1 rounded-full text-white">
                  AUC: {data.auc ?? "—"}
                </span>
              </CardHeader>
              <CardContent>
                <div className="h-[280px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.rocData} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
                      <XAxis dataKey="fpr" type="number" stroke={COLORS.textMuted} domain={[0, 1]}
                        label={{ value: "False Positive Rate", position: "bottom", fill: COLORS.textMuted, fontSize: 12 }} />
                      <YAxis type="number" stroke={COLORS.textMuted} domain={[0, 1]}
                        label={{ value: "True Positive Rate", angle: -90, position: "insideLeft", fill: COLORS.textMuted, fontSize: 12 }} />
                      <Tooltip contentStyle={{ backgroundColor: COLORS.surface, borderColor: COLORS.border, color: COLORS.textPrimary }} />
                      <Line type="monotone" dataKey="tpr" stroke={accent} strokeWidth={3} dot={false} />
                      <ReferenceLine strokeDasharray="3 3" stroke={COLORS.textMuted} segment={[{ x: 0, y: 0 }, { x: 1, y: 1 }]} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Feature Importance */}
            <Card>
              <CardHeader><CardTitle>Feature Importance</CardTitle></CardHeader>
              <CardContent>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.featureImportance} layout="vertical" margin={{ left: 160, right: 20 }}>
                      <XAxis type="number" hide />
                      <YAxis dataKey="feature" type="category" axisLine={false} tickLine={false}
                        tick={{ fill: COLORS.textPrimary, fontSize: 11 }} width={155} />
                      <Tooltip cursor={{ fill: COLORS.border, opacity: 0.4 }}
                        contentStyle={{ backgroundColor: COLORS.surface, borderColor: COLORS.border, color: COLORS.textPrimary }} />
                      <Bar dataKey="value" fill={accent} radius={[0, 4, 4, 0]} barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Drift Monitor */}
            <Card>
              <CardHeader><CardTitle>Model Drift Monitor (Accuracy)</CardTitle></CardHeader>
              <CardContent>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.driftData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorDrift" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor={accent} stopOpacity={0.3} />
                          <stop offset="95%" stopColor={accent} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} vertical={false} />
                      <XAxis dataKey="day" stroke={COLORS.textMuted} fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis domain={["auto", "auto"]} stroke={COLORS.textMuted} fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: COLORS.surface, borderColor: COLORS.border, color: COLORS.textPrimary }} />
                      <ReferenceLine y={96.5} stroke={COLORS.red} strokeDasharray="3 3"
                        label={{ position: "insideTopLeft", value: "Min Threshold (96.5%)", fill: COLORS.red, fontSize: 12 }} />
                      <Area type="monotone" dataKey="accuracy" stroke={accent} fillOpacity={1} fill="url(#colorDrift)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
