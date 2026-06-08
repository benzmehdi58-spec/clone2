import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Zap, Database, Network, BrainCircuit, ChevronDown, ChevronUp, Play, Square, ShieldAlert } from "lucide-react";
import { useWebSocket } from "../hooks/useWebSocket";
import { SimulationApi } from "../api/simulationApi";
import { COLORS } from "../constants";

export function Simulation() {
  const ws = useWebSocket();
  const [activeTab, setActiveTab] = useState<"ssh" | "network" | "ueba">("ssh");
  const [statusAll, setStatusAll] = useState<any>(null);
  
  // SSH State
  const [sshDelay, setSshDelay] = useState(() => parseFloat(localStorage.getItem("sim_ssh_delay") || "2.0"));
  
  // Network State
  const [netScenario, setNetScenario] = useState(() => localStorage.getItem("sim_net_scenario") || "ddos");
  const [netFps, setNetFps] = useState(() => parseFloat(localStorage.getItem("sim_net_fps") || "1.0"));
  
  // UEBA State
  const [uebaDelay, setUebaDelay] = useState(() => parseFloat(localStorage.getItem("sim_ueba_delay") || "2.0"));

  // History & Agent State
  const [history, setHistory] = useState<any[]>(() => {
    const saved = localStorage.getItem("sim_history");
    return saved ? JSON.parse(saved) : [];
  });
  const [historyOpen, setHistoryOpen] = useState(false);
  const [autoAnalyze, setAutoAnalyze] = useState(() => {
    return localStorage.getItem("sim_auto_analyze") === "true";
  });
  const [selectedIncident, setSelectedIncident] = useState<any>(null);

  // Poll status initially and periodically
  useEffect(() => {
    const loadStatus = async () => {
      try {
        const res = await SimulationApi.getAllStatus();
        setStatusAll(res);
      } catch (e) {}
    };
    loadStatus();
    const interval = setInterval(loadStatus, 2000);
    return () => clearInterval(interval);
  }, []);

  const saveHistory = (newRun: any) => {
    const updated = [newRun, ...history].slice(0, 20);
    setHistory(updated);
    localStorage.setItem("sim_history", JSON.stringify(updated));
  };

  const handleStartSsh = async () => {
    await SimulationApi.startSshReplay(sshDelay);
    saveHistory({ time: new Date().toLocaleTimeString(), type: "SSH", mode: "Replay", status: "Running" });
  };
  const handleStopSsh = async () => {
    await SimulationApi.stopSshReplay();
  };

  const handleStartNet = async () => {
    await SimulationApi.startNetwork(netScenario, netFps);
    saveHistory({ time: new Date().toLocaleTimeString(), type: "Network", mode: netScenario, status: "Running" });
  };
  const handleStopNet = async () => {
    await SimulationApi.stopNetwork();
  };

  const handleStartUeba = async () => {
    await SimulationApi.startUebaReplay(uebaDelay);
    saveHistory({ time: new Date().toLocaleTimeString(), type: "UEBA", mode: "Replay", status: "Running" });
  };
  const handleStopUeba = async () => {
    await SimulationApi.stopUebaReplay();
  };

  const sshRunning = statusAll?.ssh?.active;
  const netRunning = statusAll?.network?.active;
  const uebaRunning = statusAll?.ueba?.active;

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white flex items-center gap-2">
            <Zap className="h-6 w-6 text-yellow-400" /> Live Simulation
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Control the detection pipeline in real time. Replay real logs, trigger attack scenarios, or generate adversarial logs with AI.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-foreground bg-muted/50 px-3 py-1.5 rounded-full">
            <div className={`w-2 h-2 rounded-full ${ws.connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
            WebSocket: {ws.connected ? 'Connected' : 'Disconnected'}
          </div>
          <div className="flex items-center gap-2 text-sm text-foreground bg-muted/50 px-3 py-1.5 rounded-full">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            Agent: Ready
          </div>
        </div>
      </div>

      {/* Mini Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex flex-col">
            <div className="text-xs text-muted-foreground font-semibold mb-1 uppercase tracking-wider">Total Simulated</div>
            <div className="text-2xl font-bold text-white font-mono">
              { ((statusAll?.network?.flows_sent || 0) + (statusAll?.ssh?.sessions_played || 0) + (statusAll?.ueba?.alerts_played || 0)).toLocaleString() }
            </div>
            <div className="text-[10px] text-muted-foreground mt-1">Logs & Sessions</div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex flex-col">
            <div className="text-xs text-muted-foreground font-semibold mb-1 uppercase tracking-wider flex items-center gap-1">
              <ShieldAlert className="w-3 h-3 text-[#F85149]" /> Anomalies Caught
            </div>
            <div className="text-2xl font-bold text-[#F85149] font-mono">
              {ws.allAlerts.length.toLocaleString()}
            </div>
            <div className="text-[10px] text-muted-foreground mt-1">Live from Pipeline</div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex flex-col">
            <div className="text-xs text-muted-foreground font-semibold mb-1 uppercase tracking-wider">Network Scenarios</div>
            <div className="text-2xl font-bold text-[#2F81F7] font-mono">
              { (statusAll?.network?.flows_sent || 0).toLocaleString() }
            </div>
            <div className="text-[10px] text-muted-foreground mt-1">Flows Injected</div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex flex-col">
            <div className="text-xs text-muted-foreground font-semibold mb-1 uppercase tracking-wider">System Attacks</div>
            <div className="text-2xl font-bold text-[#8B5CF6] font-mono">
              { ((statusAll?.ssh?.sessions_played || 0) + (statusAll?.ueba?.alerts_played || 0)).toLocaleString() }
            </div>
            <div className="text-[10px] text-muted-foreground mt-1">SSH & UEBA</div>
          </CardContent>
        </Card>
      </div>

      {/* Section A: Data Source Control */}
      <Card>
        <CardHeader>
          <CardTitle>Data Source Control</CardTitle>
          <p className="text-sm text-muted-foreground">Choose what feeds the detection pipeline</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* SSH Card */}
            <div 
              className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col ${activeTab === 'ssh' ? 'border-[#D29922] bg-[#D29922]/5' : 'border-border hover:border-[#D29922]/50 bg-background'} ${sshRunning ? 'border-[#D29922] animate-pulse-border' : ''}`}
              onClick={() => setActiveTab('ssh')}
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2 text-white font-medium">
                  <Database className="h-5 w-5 text-[#D29922]" /> SSH Auth Replay
                </div>
                {sshRunning && <Badge variant="warning" className="bg-[#D29922]">RUNNING</Badge>}
              </div>
              <p className="text-xs text-muted-foreground mb-4 flex-1">Stream SSH authentication logs for brute force / invalid user detection</p>
              
              {activeTab === 'ssh' && (
                <div className="mt-2 space-y-4" onClick={e => e.stopPropagation()}>
                  <div>
                    <label className="text-xs text-foreground flex justify-between">
                      Delay between logs <span>{sshDelay}s</span>
                    </label>
                    <input type="range" min="0.5" max="10" step="0.5" value={sshDelay} onChange={e => { setSshDelay(parseFloat(e.target.value)); localStorage.setItem("sim_ssh_delay", e.target.value); }} className="w-full mt-1 accent-[#D29922]" />
                  </div>
                  <div className="pt-2 border-t border-border flex items-center justify-between">
                    <div className="text-xs text-muted-foreground">
                      Played: <span className="text-white font-mono">{statusAll?.ssh?.sessions_played || 0}</span>
                    </div>
                    {sshRunning ? (
                      <Button variant="outline" size="sm" className="border-red-500/50 text-red-500 hover:bg-red-500/10" onClick={handleStopSsh}>
                        <Square className="h-4 w-4 mr-1" /> Stop
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" className="border-[#D29922]/50 text-[#D29922] hover:bg-[#D29922]/10" onClick={handleStartSsh}>
                        <Play className="h-4 w-4 mr-1" /> Start Replay
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Network Card */}
            <div 
              className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col ${activeTab === 'network' ? 'border-[#2F81F7] bg-[#2F81F7]/5' : 'border-border hover:border-[#2F81F7]/50 bg-background'} ${netRunning ? 'border-[#2F81F7] animate-pulse-border' : ''}`}
              onClick={() => setActiveTab('network')}
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2 text-white font-medium">
                  <Network className="h-5 w-5 text-[#2F81F7]" /> Network Scenario
                </div>
                {netRunning && <Badge variant="info" className="bg-[#2F81F7]">RUNNING</Badge>}
              </div>
              <p className="text-xs text-muted-foreground mb-4 flex-1">Generate synthetic CIC-IDS2017 flows for specific attack scenarios</p>
              
              {activeTab === 'network' && (
                <div className="mt-2 space-y-4" onClick={e => e.stopPropagation()}>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      {id: 'ddos', name: 'DDoS', t: 'T1498'}, {id: 'scanning', name: 'Port Scan', t: 'T1595'},
                      {id: 'bruteforce', name: 'Brute Force', t: 'T1110'}, {id: 'bot', name: 'Bot', t: 'T1071'},
                      {id: 'zero_day', name: 'Zero-Day', t: '???'}, {id: 'mixed', name: 'Mixed', t: 'Traffic'}
                    ].map(s => (
                      <div key={s.id} onClick={() => { setNetScenario(s.id); localStorage.setItem("sim_net_scenario", s.id); }} className={`text-xs p-1.5 border rounded-md cursor-pointer text-center ${netScenario === s.id ? 'border-[#2F81F7] bg-[#2F81F7]/10 text-white' : 'border-border text-muted-foreground hover:border-[#717182]'}`}>
                        <div className="font-semibold">{s.name}</div>
                        <div className="text-[10px] opacity-70">{s.t}</div>
                      </div>
                    ))}
                  </div>
                  <div>
                    <label className="text-xs text-foreground flex justify-between">
                      Flows per second <span>{netFps}</span>
                    </label>
                    <input type="range" min="0.5" max="5.0" step="0.5" value={netFps} onChange={e => { setNetFps(parseFloat(e.target.value)); localStorage.setItem("sim_net_fps", e.target.value); }} className="w-full mt-1 accent-[#2F81F7]" />
                  </div>
                  <div className="pt-2 border-t border-border flex items-center justify-between">
                    <div className="text-xs text-muted-foreground">
                      Sent: <span className="text-white font-mono">{statusAll?.network?.flows_sent || 0}</span>
                    </div>
                    {netRunning ? (
                      <Button variant="outline" size="sm" className="border-red-500/50 text-red-500 hover:bg-red-500/10" onClick={handleStopNet}>
                        <Square className="h-4 w-4 mr-1" /> Stop
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" className="border-[#2F81F7]/50 text-[#2F81F7] hover:bg-[#2F81F7]/10" onClick={handleStartNet}>
                        <Play className="h-4 w-4 mr-1" /> Launch
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* UEBA Card */}
            <div 
              className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col ${activeTab === 'ueba' ? 'border-[#8B5CF6] bg-[#8B5CF6]/5' : 'border-border hover:border-[#8B5CF6]/50 bg-background'} ${uebaRunning ? 'border-[#8B5CF6] animate-pulse-border' : ''}`}
              onClick={() => setActiveTab('ueba')}
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2 text-white font-medium">
                  <BrainCircuit className="h-5 w-5 text-[#8B5CF6]" /> UEBA Insider Threat
                </div>
                {uebaRunning && <Badge variant="default" className="bg-[#8B5CF6]">RUNNING</Badge>}
              </div>
              <p className="text-xs text-muted-foreground mb-4 flex-1">Stream 7-day user behavior logs for insider threat detection</p>
              
              {activeTab === 'ueba' && (
                <div className="mt-2 space-y-4" onClick={e => e.stopPropagation()}>
                  <div>
                    <label className="text-xs text-foreground flex justify-between">
                      Delay between logs <span>{uebaDelay}s</span>
                    </label>
                    <input type="range" min="0.5" max="10" step="0.5" value={uebaDelay} onChange={e => { setUebaDelay(parseFloat(e.target.value)); localStorage.setItem("sim_ueba_delay", e.target.value); }} className="w-full mt-1 accent-[#8B5CF6]" />
                  </div>
                  <div className="pt-2 border-t border-border flex items-center justify-between">
                    <div className="text-xs text-muted-foreground">
                      Played: <span className="text-white font-mono">{statusAll?.ueba?.alerts_played || 0}</span>
                    </div>
                    {uebaRunning ? (
                      <Button variant="outline" size="sm" className="border-red-500/50 text-red-500 hover:bg-red-500/10" onClick={handleStopUeba}>
                        <Square className="h-4 w-4 mr-1" /> Stop
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" className="border-[#8B5CF6]/50 text-[#8B5CF6] hover:bg-[#8B5CF6]/10" onClick={handleStartUeba}>
                        <Play className="h-4 w-4 mr-1" /> Start Replay
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
            
          </div>
        </CardContent>
      </Card>

      {/* Section B: Live Feed Terminal */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* SSH Feed */}
        <Card className="flex flex-col h-[400px]">
          <CardHeader className="pb-2 border-b border-border flex flex-row items-center justify-between bg-card rounded-t-xl">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-[#D29922]" />
              <span className="font-semibold text-white">SSH Auth Logs</span>
            </div>
            <div className={`px-2 py-0.5 text-xs font-mono rounded-full ${sshRunning || uebaRunning ? 'bg-green-500/20 text-green-400 border border-green-500/50 animate-pulse' : 'bg-gray-800 text-gray-400 border border-gray-700'}`}>
              {sshRunning || uebaRunning ? 'LIVE' : 'IDLE'}
            </div>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-y-auto bg-background rounded-b-xl flex flex-col-reverse relative">
            <div className="p-2 font-mono text-xs flex flex-col justify-end">
              {ws.sshAlerts.slice(0, 50).reverse().map((a, i) => (
                <div key={i} className={`py-1 flex gap-2 border-l-2 pl-2 ${a.prediction !== 'Normal' && a.prediction !== 'BENIGN' ? 'border-red-500 bg-red-900/10 text-red-200' : 'border-border text-muted-foreground'}`}>
                  <span className="opacity-50">[{new Date().toLocaleTimeString()}]</span>
                  <span className="truncate w-32">{a.id.substring(0, 20)}</span>
                  <span className="font-bold uppercase">{a.prediction}</span>
                  <span>[{a.confidence.toFixed(1)}%]</span>
                </div>
              ))}
            </div>
          </CardContent>
          <div className="px-4 py-2 bg-card border-t border-border rounded-b-xl flex justify-between text-xs text-muted-foreground">
            <span>Analyzed: {ws.sshAlerts.length}</span>
            <span>Anomalies: {ws.sshAlerts.filter(a => a.prediction !== 'Normal' && a.prediction !== 'BENIGN').length}</span>
          </div>
        </Card>

        {/* Network Feed */}
        <Card className="flex flex-col h-[400px]">
          <CardHeader className="pb-2 border-b border-border flex flex-row items-center justify-between bg-card rounded-t-xl">
            <div className="flex items-center gap-2">
              <Network className="h-4 w-4 text-[#2F81F7]" />
              <span className="font-semibold text-white">Network Flows</span>
            </div>
            <div className={`px-2 py-0.5 text-xs font-mono rounded-full ${netRunning ? 'bg-green-500/20 text-green-400 border border-green-500/50 animate-pulse' : 'bg-gray-800 text-gray-400 border border-gray-700'}`}>
              {netRunning ? 'LIVE' : 'IDLE'}
            </div>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-y-auto bg-background rounded-b-xl flex flex-col-reverse">
            <div className="p-2 font-mono text-xs flex flex-col justify-end">
              {ws.networkAlerts.slice(0, 50).reverse().map((a, i) => (
                <div key={i} className={`py-1 flex gap-2 border-l-2 pl-2 ${a.verdict !== 'BENIGN' ? 'border-red-500 bg-red-900/10 text-red-200' : 'border-border text-muted-foreground'}`}>
                  <span className="opacity-50">[{new Date().toLocaleTimeString()}]</span>
                  <span className="truncate w-20">{a.verdict}</span>
                  <span className="truncate w-24">{a.attack_type || "—"}</span>
                  <span>[{a.confidence?.toFixed(1)}%]</span>
                </div>
              ))}
            </div>
          </CardContent>
          <div className="px-4 py-2 bg-card border-t border-border rounded-b-xl flex justify-between text-xs text-muted-foreground">
            <span>Flows: {ws.networkAlerts.length}</span>
            <span>Attacks: {ws.networkAlerts.filter(a => a.verdict !== 'BENIGN').length}</span>
          </div>
        </Card>
      </div>

      {/* Section C: Agent Analysis Panel */}
      <Card className="w-full">
        <CardHeader className="flex flex-row items-center justify-between border-b border-border pb-4">
          <CardTitle>AI Agent Analysis</CardTitle>
          <div className="flex items-center gap-2 text-sm text-foreground">
            <input 
              type="checkbox" 
              checked={autoAnalyze} 
              onChange={e => {
                setAutoAnalyze(e.target.checked);
                localStorage.setItem("sim_auto_analyze", e.target.checked.toString());
              }}
              className="accent-[#2F81F7] w-4 h-4 rounded bg-background border-border"
            />
            <label>Auto-analyze anomalies</label>
          </div>
        </CardHeader>
        <CardContent className="p-0 flex flex-col md:flex-row min-h-[400px]">
          {/* Incident Queue (Left 40%) */}
          <div className="w-full md:w-2/5 border-r border-border overflow-y-auto max-h-[500px] bg-card">
            {ws.allAlerts.filter(a => a.severity === 'critical' || (a.source === 'Network' && a.verdict !== 'BENIGN') || (a.source === 'SSH' && a.prediction !== 'Normal') || (a.source === 'UEBA' && a.prediction !== 'Normal')).length === 0 ? (
              <div className="p-8 text-center text-muted-foreground flex flex-col items-center gap-2">
                <ShieldAlert className="h-8 w-8 opacity-20" />
                <p>Waiting for anomalies to analyze...</p>
              </div>
            ) : (
              <div className="flex flex-col">
                {ws.allAlerts.filter(a => a.severity === 'critical' || (a.source === 'Network' && a.verdict !== 'BENIGN') || (a.source === 'SSH' && a.prediction !== 'Normal') || (a.source === 'UEBA' && a.prediction !== 'Normal')).slice(0,50).map((inc, i) => (
                  <div 
                    key={inc.id + i} 
                    onClick={() => setSelectedIncident(inc)}
                    className={`p-3 border-b border-border cursor-pointer hover:bg-muted/30 transition-colors border-l-4 ${selectedIncident?.id === inc.id ? 'bg-muted/40' : ''} ${inc.severity === 'critical' ? 'border-l-red-500' : 'border-l-amber-500'}`}
                  >
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-mono text-muted-foreground">{inc.id.substring(0, 15)}</span>
                      <span className="text-xs text-muted-foreground">{new Date().toLocaleTimeString()}</span>
                    </div>
                    <div className="font-medium text-white mt-1 text-sm truncate">{inc.title}</div>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[10px] bg-blue-900/40 text-blue-400 px-2 rounded-sm border border-blue-800">
                        {inc.mitre_id || (inc.source === 'Network' ? 'T1498' : 'T1078')}
                      </span>
                      <span className={`text-[10px] px-2 rounded-sm border ${inc.source === 'Network' ? 'bg-[#2F81F7]/20 text-[#2F81F7] border-[#2F81F7]/40' : inc.source === 'SSH' ? 'bg-[#D29922]/20 text-[#D29922] border-[#D29922]/40' : 'bg-[#8B5CF6]/20 text-[#8B5CF6] border-[#8B5CF6]/40'}`}>
                        {inc.source}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Analysis Output (Right 60%) */}
          <div className="w-full md:w-3/5 bg-background p-6 relative flex flex-col">
            {!selectedIncident ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground gap-3">
                <BrainCircuit className="h-12 w-12 opacity-20" />
                <p>Select an incident from the queue</p>
              </div>
            ) : (
              <div className="flex flex-col h-full animate-in fade-in duration-300">
                <div className="mb-4">
                  <h2 className="text-xl font-bold text-white mb-2">{selectedIncident.title}</h2>
                  <div className="flex gap-2 mb-4">
                    <Badge variant={selectedIncident.severity === 'critical' ? 'critical' : 'warning'}>{selectedIncident.severity.toUpperCase()}</Badge>
                    <Badge variant="info">{selectedIncident.mitre_id || 'TXXXX'}</Badge>
                    <Badge variant="outline" className="border-gray-500 text-gray-300">{selectedIncident.confidence?.toFixed(1)}% Conf</Badge>
                  </div>
                </div>
                
                <div className="flex-1 overflow-y-auto pr-2 text-sm text-foreground space-y-4">
                  <div>
                    <h3 className="text-[#2F81F7] font-semibold mb-1 uppercase text-xs tracking-wider">## Incident Summary</h3>
                    <p className="opacity-90">{selectedIncident.reason || "Anomalous patterns detected in the input stream exceeding the baseline threshold."}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-[#2F81F7] font-semibold mb-1 uppercase text-xs tracking-wider">## Raw Data Evidence</h3>
                    <pre className="bg-card p-2 rounded-md text-[11px] font-mono border border-border overflow-x-auto whitespace-pre-wrap">
                      {selectedIncident.raw?.substring(0, 300) || JSON.stringify(selectedIncident, null, 2).substring(0, 300)}...
                    </pre>
                  </div>
                  
                  <div>
                    <h3 className="text-[#2F81F7] font-semibold mb-1 uppercase text-xs tracking-wider">## Recommended Actions</h3>
                    <ul className="list-disc pl-4 opacity-90 space-y-1">
                      <li>Isolate affected node or IP address immediately.</li>
                      <li>Review associated user accounts for unauthorized access.</li>
                      <li>Export packet capture / log snippet to SIEM for correlation.</li>
                    </ul>
                  </div>
                </div>
                
                <div className="mt-6 pt-4 border-t border-border flex gap-3">
                  <Button variant="outline" className="border-green-500/50 text-green-500 hover:bg-green-500/10 flex-1">✓ Mark Resolved</Button>
                  <Button variant="outline" className="border-red-500/50 text-red-500 hover:bg-red-500/10 flex-1">↑ Escalate</Button>
                  <Button variant="outline" className="flex-1 text-muted-foreground">↓ Export</Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Section D: Simulation History */}
      <Card>
        <CardHeader 
          className="cursor-pointer hover:bg-muted/20 transition-colors rounded-xl" 
          onClick={() => setHistoryOpen(!historyOpen)}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Simulation History</CardTitle>
            {historyOpen ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
          </div>
        </CardHeader>
        
        {historyOpen && (
          <CardContent className="pt-0 pb-4">
            {history.length === 0 ? (
              <p className="text-muted-foreground text-center py-4 text-sm">No history available</p>
            ) : (
              <div className="overflow-x-auto mt-2">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-muted-foreground uppercase bg-background border-y border-border">
                    <tr>
                      <th className="px-4 py-2 font-medium">Started At</th>
                      <th className="px-4 py-2 font-medium">Type</th>
                      <th className="px-4 py-2 font-medium">Mode</th>
                      <th className="px-4 py-2 font-medium text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((row, i) => (
                      <tr key={i} className="border-b border-border hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-2 text-foreground font-mono text-xs">{row.time}</td>
                        <td className="px-4 py-2">
                          <Badge variant="outline" className="border-[#717182] text-muted-foreground">{row.type}</Badge>
                        </td>
                        <td className="px-4 py-2 text-white capitalize">{row.mode}</td>
                        <td className="px-4 py-2 text-right">
                          <span className={`text-xs ${row.status === 'Running' ? 'text-green-500' : 'text-muted-foreground'}`}>{row.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        )}
      </Card>
      
    </div>
  );
}
