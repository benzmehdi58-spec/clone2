import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { ArrowLeft, Download, ShieldAlert, Flag, Activity, AlertTriangle, Loader2, BrainCircuit } from "lucide-react";
import { Button } from "../components/ui/Button";
import ReactMarkdown from "react-markdown";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Cell, Tooltip } from "recharts";
import { fetchAlertDetail, analyzeAlert } from "../api/agent";
import { COLORS } from "../constants";

export function AlertDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [agentLoading, setAgentLoading] = useState(false);
  const [agentReport, setAgentReport] = useState<string | null>(null);

  const handleAnalyze = async () => {
    setAgentLoading(true);
    try {
      const json = await analyzeAlert(data.id, data.source);
      setAgentReport(json.report_markdown || "Agent returned an empty report.");
    } catch (e) {
      console.error(e);
      setAgentReport("Failed to load agent report.");
    } finally {
      setAgentLoading(false);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      const result = await fetchAlertDetail(id || "ALT-892");
      setData(result);
      setIsLoading(false);
    };
    loadData();
  }, [id]);

  if (isLoading || !data) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-[#717182]" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/alerts')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-white">{data.title}</h1>
              <Badge variant={data.severity === 'critical' ? 'critical' : data.severity === 'warning' ? 'warning' : 'info'}>
                {data.severity.toUpperCase()}
              </Badge>
            </div>
            <p className="text-sm text-[#717182] mt-1 font-mono">
              Alert ID: {data.id} • Source: {data.source} • Time: {data.time}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
          <Button variant="outline" className="text-[#3FB950] border-[#30363D] hover:bg-[#3FB950]/10">
            <Flag className="h-4 w-4 mr-2" />
            Mark False Positive
          </Button>
          <Button variant="danger">
            <ShieldAlert className="h-4 w-4 mr-2" />
            Escalate
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel (60% equivalent if 2 cols, using 2 of 3) */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Top Contributing Features</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.shapData} layout="vertical" margin={{ left: 150, right: 20 }}>
                    <XAxis type="number" hide />
                    <YAxis dataKey="feature" type="category" axisLine={false} tickLine={false} tick={{fill: COLORS.textPrimary, fontSize: 12}} width={140} />
                    <Tooltip 
                      cursor={{fill: COLORS.border, opacity: 0.4}}
                      contentStyle={{ backgroundColor: COLORS.surface, borderColor: COLORS.border, color: COLORS.textPrimary }}
                      formatter={(val: number, name: string, props: any) => [props.payload.raw, 'Raw Value']}
                    />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {data.shapData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.type === 'positive' ? COLORS.red : COLORS.blue} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center justify-center gap-6 mt-4 text-sm text-[#717182]">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLORS.red }} /> Pushes prediction toward Anomaly
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLORS.blue }} /> Pushes prediction toward Normal
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Raw Flow Features</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {data.features.map((f: any, i: number) => (
                  <div 
                    key={i} 
                    className={`p-3 rounded-md border ${f.isAnomalous ? 'bg-[#F85149]/10 border-[#F85149]/50' : 'bg-[#0D1117] border-[#30363D]'}`}
                  >
                    <div className={`text-xs ${f.isAnomalous ? 'text-[#F85149]' : 'text-[#717182]'} mb-1 truncate`} title={f.name}>
                      {f.name}
                    </div>
                    <div className={`font-mono text-sm ${f.isAnomalous ? 'text-[#F85149] font-bold' : 'text-[#e9ebef]'}`}>
                      {f.value}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Panel (40% equivalent, 1 of 3 cols) */}
        <div className="flex flex-col gap-6">
          <Card className="bg-[#161B22] border-[#F85149]/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-center mb-6">
                <div className="relative flex items-center justify-center w-32 h-32 rounded-full border-4 border-[#F85149]/20">
                  <svg className="absolute inset-0 w-full h-full transform -rotate-90">
                    <circle 
                      cx="60" cy="60" r="58" 
                      fill="none" stroke={COLORS.red} strokeWidth="4" 
                      strokeDasharray="364" strokeDashoffset={364 - (364 * (data.confidence / 100))} 
                      className="origin-center" 
                    />
                  </svg>
                  <div className="text-center">
                    <div className="text-3xl font-bold font-mono text-white">{data.confidence}%</div>
                    <div className="text-xs text-[#F85149] uppercase font-semibold">Confidence</div>
                  </div>
                </div>
              </div>
              <h3 className="font-semibold text-white mb-2 flex items-center gap-2">
                <Activity className="h-4 w-4" style={{ color: COLORS.blue }} /> Model Explanation
              </h3>
              {agentReport ? (
                <div className="text-sm text-[#e9ebef] leading-relaxed prose prose-invert prose-p:my-2 prose-h3:text-white prose-h3:font-semibold prose-strong:text-[#F85149]">
                  <ReactMarkdown>{agentReport}</ReactMarkdown>
                </div>
              ) : (
                <>
                  <div className="text-sm text-[#e9ebef] leading-relaxed prose prose-invert prose-p:my-2 prose-h3:text-white prose-h3:font-semibold prose-strong:text-[#F85149]">
                    <ReactMarkdown>{data.explanation}</ReactMarkdown>
                  </div>
                  <Button 
                    variant="outline" 
                    className="mt-4 w-full border-[#30363D] hover:bg-[#30363D]/50"
                    onClick={handleAnalyze}
                    disabled={agentLoading}
                  >
                    {agentLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <BrainCircuit className="h-4 w-4 mr-2" />}
                    {agentLoading ? "Analyzing Context..." : "Analyze with Agent"}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" style={{ color: COLORS.amber }} /> Similar Past Alerts
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {data.similarAlerts.map((past: any, i: number) => (
                <div key={i} className="flex flex-col p-3 rounded-md bg-[#0D1117] border border-[#30363D]">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold text-white">{past.id}</span>
                    <Badge variant="outline" className="text-xs">{past.match}</Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#717182]">{past.date}</span>
                    <span className={past.status === 'True Positive' ? 'text-[#F85149]' : 'text-[#3FB950]'}>
                      {past.status}
                    </span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
