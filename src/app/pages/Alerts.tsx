import { useState, useEffect } from "react";
import { Server, Network, ShieldAlert, CheckCircle2, Loader2 } from "lucide-react";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { useNavigate } from "react-router";
import { cn } from "../utils/cn";
import { fetchAlerts } from "../api/agent";
import { COLORS } from "../constants";

const filters = ["All", "Critical", "Network", "System", "Unreviewed"];

export function Alerts() {
  const [activeFilter, setActiveFilter] = useState("All");
  const [alerts, setAlerts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      const result = await fetchAlerts(activeFilter);
      setAlerts(result);
      setIsLoading(false);
    };
    loadData();
  }, [activeFilter]);

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

      <div className="flex flex-col gap-3">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[#717182]" />
          </div>
        ) : alerts.length === 0 ? (
          <div className="text-center py-12 text-[#717182]">
            <ShieldAlert className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p>No alerts match the current filter.</p>
          </div>
        ) : (
          alerts.map((alert) => (
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
              
              <div className="flex flex-1 flex-col md:flex-row p-4 md:p-5 gap-4 items-start md:items-center">
                {/* Icon & Time */}
                <div className="flex items-center gap-4 min-w-[120px]">
                  <div className={cn(
                    "p-2 rounded-md",
                    alert.source === "Network" ? "bg-[#2F81F7]/10 text-[#2F81F7]" : "bg-[#D29922]/10 text-[#D29922]"
                  )}>
                    {alert.source === "Network" ? <Network className="h-5 w-5" /> : <Server className="h-5 w-5" />}
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
                <div className="flex flex-col gap-2 min-w-[140px]">
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
                <div className="flex items-center gap-2 mt-4 md:mt-0 w-full md:w-auto">
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
