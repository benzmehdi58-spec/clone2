import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line
} from "recharts";
import { ShieldAlert, Server, Network, Activity, Target, BrainCircuit } from "lucide-react";
import { useNavigate } from "react-router";
import { fetchDashboardStats, getIncidents } from "../api/agent";
import { COLORS } from "../constants";

export function Dashboard() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [incidents, setIncidents] = useState<any[]>([]);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const result = await getIncidents();
        setIncidents(Object.values(result));
      } catch (e) {}
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const loadData = async () => {
      const result = await fetchDashboardStats();
      setData(result);
      setIsLoading(false);
    };
    loadData();
  }, []);

  if (isLoading || !data) {
    return (
      <div className="flex flex-col gap-6 max-w-7xl mx-auto animate-pulse">
        <div className="flex items-center justify-between">
          <div className="h-8 w-48 bg-[#30363D] rounded-md"></div>
          <div className="h-4 w-32 bg-[#30363D] rounded-md"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-6 h-28 flex flex-col justify-between">
                <div className="h-4 w-24 bg-[#30363D] rounded-md"></div>
                <div className="h-8 w-16 bg-[#30363D] rounded-md mt-4"></div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <div className="h-6 w-48 bg-[#30363D] rounded-md"></div>
                <div className="h-6 w-20 bg-[#30363D] rounded-full"></div>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between mb-4">
                  <div className="h-4 w-40 bg-[#30363D] rounded-md"></div>
                  <div className="h-4 w-24 bg-[#30363D] rounded-md"></div>
                </div>
                <div className="h-16 w-full bg-[#30363D] rounded-md"></div>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader>
            <div className="h-6 w-48 bg-[#30363D] rounded-md"></div>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full bg-[#30363D]/50 rounded-md"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-white">Dashboard</h1>
        <div className="text-sm text-[#717182]">Last updated: Just now</div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-[#717182]">Total Logs Analyzed</p>
                <h3 className="text-3xl font-bold font-mono text-white mt-2">{data.stats.totalLogsAnalyzed}</h3>
              </div>
              <div className="p-2 bg-[#30363D] rounded-md">
                <Activity className="h-5 w-5" style={{ color: COLORS.blue }} />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-[#717182]">Anomalies Detected</p>
                <h3 className="text-3xl font-bold font-mono text-white mt-2">{data.stats.anomaliesDetected}</h3>
              </div>
              <div className="p-2 bg-[#30363D] rounded-md">
                <Target className="h-5 w-5" style={{ color: COLORS.amber }} />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-[#717182]">Active Alerts</p>
                <h3 className="text-3xl font-bold font-mono text-white mt-2">{data.stats.activeAlerts}</h3>
              </div>
              <div className="p-2 rounded-md" style={{ backgroundColor: `${COLORS.red}1A` }}>
                <ShieldAlert className="h-5 w-5" style={{ color: COLORS.red }} />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-[#717182]">Model Accuracy</p>
                <h3 className="text-3xl font-bold font-mono mt-2" style={{ color: COLORS.green }}>{data.stats.modelAccuracy}</h3>
              </div>
              <div className="p-2 rounded-md" style={{ backgroundColor: `${COLORS.green}1A` }}>
                <BrainCircuit className="h-5 w-5" style={{ color: COLORS.green }} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pipeline Status Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Server className="h-5 w-5" style={{ color: COLORS.amber }} /> HDFS System Logs
            </CardTitle>
            <Badge variant="success">Healthy</Badge>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between text-sm text-[#717182] mb-4">
              <span>Last parsed: <span className="font-mono text-[#e9ebef]">{data.pipelineStatus.hdfs.lastParsed}</span></span>
              <span>Anomaly Rate: <span className="font-mono" style={{ color: COLORS.amber }}>{data.pipelineStatus.hdfs.anomalyRate}</span></span>
            </div>
            <div className="h-16">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.pipelineStatus.hdfs.sparkline}>
                  <Line type="monotone" dataKey="value" stroke={COLORS.amber} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Network className="h-5 w-5" style={{ color: COLORS.blue }} /> Network Flows (CIC-IDS2017)
            </CardTitle>
            <Badge variant="warning">Elevated Activity</Badge>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between text-sm text-[#717182] mb-4">
              <span>Last parsed: <span className="font-mono text-[#e9ebef]">{data.pipelineStatus.network.lastParsed}</span></span>
              <span>Anomaly Rate: <span className="font-mono" style={{ color: COLORS.red }}>{data.pipelineStatus.network.anomalyRate}</span></span>
            </div>
            <div className="h-16">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.pipelineStatus.network.sparkline}>
                  <Line type="monotone" dataKey="value" stroke={COLORS.blue} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Anomaly Rate Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.anomalyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorNetwork" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.blue} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={COLORS.blue} stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorSystem" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.amber} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={COLORS.amber} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} vertical={false} />
                <XAxis dataKey="time" stroke={COLORS.textMuted} fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke={COLORS.textMuted} fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: COLORS.surface, borderColor: COLORS.border, color: COLORS.textPrimary }}
                  itemStyle={{ fontSize: 14 }}
                />
                <Area type="monotone" dataKey="network" stroke={COLORS.blue} fillOpacity={1} fill="url(#colorNetwork)" name="Network Logs" />
                <Area type="monotone" dataKey="system" stroke={COLORS.amber} fillOpacity={1} fill="url(#colorSystem)" name="System Logs" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Active Incidents Panel */}
      {incidents.length > 0 && (
        <Card className="border-[#F85149]/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BrainCircuit className="h-5 w-5 text-[#F85149]" /> Agent Incident Reports
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {incidents.map((inc: any) => (
                <div key={inc.id} className="p-4 rounded-lg bg-[#0D1117] border border-[#30363D] hover:border-[#F85149]/50 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold text-white">{inc.title}</h4>
                    <Badge variant={inc.severity === 'critical' ? 'critical' : inc.severity === 'high' ? 'warning' : 'info'}>
                      {inc.severity?.toUpperCase()}
                    </Badge>
                  </div>
                  <p className="text-xs text-[#717182] font-mono mb-3">{inc.timestamp}</p>
                  <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => navigate(`/alerts/${inc.correlated_ids?.[0] || inc.id}`)}>
                    View Full Report
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Alerts Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Critical Alerts</CardTitle>
          <Button variant="outline" size="sm" onClick={() => navigate('/alerts')}>View All</Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-[#717182] uppercase bg-[#0D1117] border-y border-[#30363D]">
                <tr>
                  <th className="px-4 py-3 font-medium">Time</th>
                  <th className="px-4 py-3 font-medium">Source</th>
                  <th className="px-4 py-3 font-medium">Attack Type</th>
                  <th className="px-4 py-3 font-medium">Severity</th>
                  <th className="px-4 py-3 font-medium">Confidence</th>
                  <th className="px-4 py-3 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {data.recentAlerts.map((alert: any) => (
                  <tr key={alert.id} className="border-b border-[#30363D] hover:bg-[#30363D]/30 transition-colors group cursor-pointer" onClick={() => navigate(`/alerts/${alert.id}`)}>
                    <td className="px-4 py-3 font-mono text-[#e9ebef]">{alert.time}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {alert.source === 'Network' ? <Network className="h-4 w-4" style={{ color: COLORS.blue }}/> : <Server className="h-4 w-4" style={{ color: COLORS.amber }}/>}
                        {alert.source}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium text-white">{alert.attack}</td>
                    <td className="px-4 py-3">
                      <Badge variant={alert.severity === 'critical' ? 'critical' : 'warning'}>
                        {alert.severity.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 font-mono">
                      <div className="flex items-center gap-2">
                        <span>{alert.confidence}%</span>
                        <div className="w-16 h-1.5 bg-[#30363D] rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-white" 
                            style={{ 
                              width: `${alert.confidence}%`,
                              backgroundColor: alert.confidence > 90 ? COLORS.red : COLORS.amber 
                            }} 
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                        Investigate
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
