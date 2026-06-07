import { useState, useEffect, useCallback } from "react";
import { Server, Network, ShieldAlert, CheckCircle2, Loader2, Bug, User, Key, AlertTriangle } from "lucide-react";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Slider } from "../components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { useNavigate } from "react-router";
import { cn } from "../utils/cn";
import { fetchAlerts } from "../api/agent";
import { COLORS } from "../constants";

const filters = ["All", "Critical", "Network", "System", "SSH Auth", "UEBA Insider", "Honeypot", "Unreviewed"];

export function Alerts() {
  const [activeFilter, setActiveFilter] = useState("All");
  const [timeRange, setTimeRange] = useState("All Time");
  const [confidenceThreshold, setConfidenceThreshold] = useState(0);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await fetchAlerts(activeFilter);
      setAlerts(result);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [activeFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredAlerts = alerts.filter(alert => {
    // Confidence Filter
    const conf = alert.confidence || 0;
    if (conf < confidenceThreshold) return false;

    // Time Range Filter
    if (timeRange !== "All Time" && alert.time) {
      const alertTime = new Date(alert.time).getTime();
      const now = Date.now();
      const hours24 = 24 * 60 * 60 * 1000;
      
      if (timeRange === "Last 24h" && (now - alertTime) > hours24) return false;
      if (timeRange === "Last 7d" && (now - alertTime) > hours24 * 7) return false;
      if (timeRange === "Last 30d" && (now - alertTime) > hours24 * 30) return false;
    }
    return true;
  });

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Live Alert Feed</h1>
          <p className="text-[#717182] text-sm mt-1">Review and investigate detected anomalies.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {filters.map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={cn(
                "px-3 py-1.5 rounded-full text-sm font-medium transition-colors border",
                activeFilter === filter
                  ? "bg-[#30363D] text-white border-[#30363D]"
                  : "bg-transparent text-[#717182] border-[#30363D] hover:text-white hover:border-[#717182]"
              )}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* New UX Controls */}
      <div className="flex flex-col md:flex-row items-center gap-6 p-4 bg-[#161B22] rounded-lg border border-[#30363D]">
        {/* Time Range */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <span className="text-sm font-medium text-[#717182] whitespace-nowrap">Time Range:</span>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[140px] text-xs h-8 border-[#30363D] bg-[#0D1117] text-[#8B949E]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#161B22] border-[#30363D] text-[#F0F6FC]">
              <SelectItem value="All Time" className="text-xs">All Time</SelectItem>
              <SelectItem value="Last 24h" className="text-xs">Last 24h</SelectItem>
              <SelectItem value="Last 7d" className="text-xs">Last 7d</SelectItem>
              <SelectItem value="Last 30d" className="text-xs">Last 30d</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Confidence Threshold */}
        <div className="flex items-center gap-3 w-full md:flex-1">
          <span className="text-sm font-medium text-[#717182] whitespace-nowrap">
            Min Confidence ({confidenceThreshold}%)
          </span>
          <Slider 
            value={[confidenceThreshold]} 
            onValueChange={([v]) => setConfidenceThreshold(v)} 
            min={0} max={100} step={5}
            className="[&_[role=slider]]:bg-[#2F81F7] [&_[role=slider]]:border-[#2F81F7]"
          />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {error ? (
          <div className="flex flex-col items-center justify-center py-12 text-center bg-[#161B22] rounded-lg border border-[#F85149]/30">
            <AlertTriangle className="h-10 w-10 text-[#F85149] mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">Failed to load alerts</h3>
            <p className="text-[#717182] text-sm mb-6 max-w-md">{error}</p>
            <Button onClick={loadData} className="bg-[#30363D] hover:bg-[#8B949E] text-white">
              Retry Connection
            </Button>
          </div>
        ) : isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[#717182]" />
          </div>
        ) : filteredAlerts.length === 0 ? (
          <div className="text-center py-12 text-[#717182]">
            <ShieldAlert className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p>No alerts match the current filter.</p>
          </div>
        ) : (
          filteredAlerts.map((alert) => (
            <div
              key={alert.id}
              className="flex flex-col md:flex-row bg-[#161B22] rounded-lg border border-[#30363D] overflow-hidden hover:border-[#717182] transition-colors"
            >
              {/* Color Bar Indicator */}
              <div 
                className={cn(
                  "w-full md:w-1.5 h-1.5 md:h-auto",
                  alert.severity === "critical" ? "bg-[#F85149]" :
                  alert.severity === "warning" ? "bg-[#D29922]" : "bg-[#2F81F7]"
                )}
              />
              
              <div className="flex flex-1 flex-col md:flex-row p-4 md:p-5 gap-4 items-start md:items-center min-w-0">
                {/* Icon & Time */}
                <div className="flex items-center gap-4 min-w-[120px] shrink-0">
                  <div className={cn(
                    "p-2 rounded-md",
                    alert.source === "Network" ? "bg-[#2F81F7]/10 text-[#2F81F7]" : 
                    alert.source === "auth_log" ? "bg-[#8957E5]/10 text-[#8957E5]" : 
                    alert.source === "insider_threat" ? "bg-[#F85149]/10 text-[#F85149]" : 
                    alert.source === "Honeypot" ? "bg-[#8957E5]/10 text-[#8957E5]" : "bg-[#D29922]/10 text-[#D29922]"
                  )}>
                    {alert.source === "Network" ? <Network className="h-5 w-5" /> : 
                     alert.source === "auth_log" ? <Key className="h-5 w-5" /> : 
                     alert.source === "insider_threat" ? <User className="h-5 w-5" /> : 
                     alert.source === "Honeypot" ? <Bug className="h-5 w-5" /> : <Server className="h-5 w-5" />}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-mono text-[#e9ebef]">{alert.time}</span>
                    <span className="text-xs text-[#717182]">{alert.id}</span>
                  </div>
                </div>

                {/* Title & Reason */}
                <div className="flex-1 flex flex-col min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-white truncate">{alert.title}</h3>
                    {alert.reviewed && (
                      <span className="flex items-center gap-1 text-xs text-[#717182]">
                        <CheckCircle2 className="h-3.5 w-3.5 text-[#3FB950]" />
                        Reviewed
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-[#717182] truncate mt-0.5">{alert.reason}</p>
                </div>

                {/* Status & Confidence */}
                <div className="flex flex-col gap-2 min-w-[140px] shrink-0">
                  <Badge 
                    variant={alert.severity === "critical" ? "critical" : alert.severity === "warning" ? "warning" : "info"}
                    className="w-fit"
                  >
                    {alert.severity.toUpperCase()}
                  </Badge>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-[#717182]">Conf: {alert.confidence}%</span>
                    <div className="flex-1 h-1.5 bg-[#30363D] rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-white" 
                        style={{ 
                          width: `${alert.confidence}%`,
                          backgroundColor: alert.confidence > 90 ? COLORS.red : alert.confidence > 70 ? COLORS.amber : COLORS.blue
                        }} 
                      />
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 mt-4 md:mt-0 w-full md:w-auto shrink-0">
                  <Button 
                    variant="outline" 
                    className="flex-1 md:flex-none"
                    onClick={() => console.log('Dismissed')}
                  >
                    Dismiss
                  </Button>
                  <Button 
                    variant="default"
                    className="flex-1 md:flex-none bg-[#2F81F7] hover:bg-[#2F81F7]/90 text-white"
                    onClick={() => navigate(`/alerts/${alert.id}`)}
                  >
                    Investigate
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
