import { useState, useEffect, useCallback, useRef } from "react";
import {
  Search, Filter, Server, ShieldCheck, ShieldAlert,
  X, FileJson, Play, Loader2, ChevronLeft, ChevronRight,
} from "lucide-react";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { Card } from "../components/ui/Card";
import { cn } from "../utils/cn";
import { fetchLogs, submitLogForAnalysis } from "../api/agent";
import { COLORS } from "../constants";

const STATUS_OPTIONS = ["all", "anomaly", "normal"] as const;
type Status = typeof STATUS_OPTIONS[number];

const EXAMPLE_LOG = `081109 203518 143 INFO dfs.DataNode$DataXceiver: Receiving block blk_-1608999687919862906 src: /10.250.19.102:54761 dest: /10.250.19.102:50010
081109 203518 143 INFO dfs.DataNode$PacketResponder: PacketResponder 2 for block blk_-1608999687919862906 terminating`;

export function Explorer() {
  // ── List state ────────────────────────────────────────────────────────────
  const [logs, setLogs]           = useState<any[]>([]);
  const [total, setTotal]         = useState(0);
  const [pages, setPages]         = useState(0);
  const [page, setPage]           = useState(1);
  const [search, setSearch]       = useState("");
  const [draftSearch, setDraftSearch] = useState("");
  const [status, setStatus]       = useState<Status>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<any | null>(null);
  const searchTimer               = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Submit-modal state ────────────────────────────────────────────────────
  const [isModalOpen, setIsModalOpen]   = useState(false);
  const [rawLog, setRawLog]             = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<any>(null);

  // ── Fetch logs from backend ───────────────────────────────────────────────
  const load = useCallback(async () => {
    setIsLoading(true);
    const result = await fetchLogs({ page, limit: 50, search, status });
    setLogs(result.logs);
    setTotal(result.total);
    setPages(result.pages);
    setIsLoading(false);
  }, [page, search, status]);

  useEffect(() => { load(); }, [load]);

  // Debounce search input
  const handleSearchInput = (val: string) => {
    setDraftSearch(val);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setSearch(val);
      setPage(1);
    }, 400);
  };

  const handleStatusChange = (s: Status) => {
    setStatus(s);
    setPage(1);
    setSelectedLog(null);
  };

  // ── Submit log ────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!rawLog.trim()) return;
    setIsSubmitting(true);
    setSubmitResult(null);
    const result = await submitLogForAnalysis(rawLog, "hdfs");
    setSubmitResult(result);
    setIsSubmitting(false);
  };

  const openModal = () => {
    setIsModalOpen(true);
    setSubmitResult(null);
    setRawLog("");
  };

  return (
    <div className="flex h-full flex-col gap-4 max-w-7xl mx-auto overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-semibold text-white">Log Explorer</h1>
          <p className="text-[#717182] text-sm mt-1">
            Browsing <span className="font-mono text-[#e9ebef]">{total.toLocaleString()}</span> HDFS block sessions · LSTM predictions
          </p>
        </div>
        <Button onClick={openModal} className="bg-[#2F81F7] hover:bg-[#2F81F7]/90 text-white">
          <FileJson className="h-4 w-4 mr-2" /> Submit Log for Analysis
        </Button>
      </div>

      <Card className="flex flex-col flex-1 min-h-0 overflow-hidden">
        {/* Filters */}
        <div className="p-4 border-b border-[#30363D] flex flex-wrap gap-3 items-center shrink-0">
          {/* Search */}
          <div className="relative flex-1 min-w-[250px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#717182]" />
            <input
              type="text"
              value={draftSearch}
              onChange={(e) => handleSearchInput(e.target.value)}
              placeholder="Search by block ID or log content…"
              className="w-full h-10 bg-[#0D1117] border border-[#30363D] rounded-md pl-10 pr-4 text-sm text-white focus:outline-none focus:border-[#2F81F7] focus:ring-1 focus:ring-[#2F81F7]"
            />
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-1 bg-[#0D1117] border border-[#30363D] rounded-md p-1">
            <Filter className="h-3.5 w-3.5 text-[#717182] ml-1" />
            {STATUS_OPTIONS.map((s) => (
              <button
                key={s}
                onClick={() => handleStatusChange(s)}
                className={cn(
                  "px-3 py-1 rounded text-xs font-medium capitalize transition-colors",
                  status === s
                    ? "bg-[#30363D] text-white"
                    : "text-[#717182] hover:text-white"
                )}
              >
                {s === "all" ? "All" : s === "anomaly" ? "Anomaly" : "Normal"}
              </button>
            ))}
          </div>
        </div>

        {/* Table + Sidebar */}
        <div className="flex flex-1 min-h-0 relative overflow-hidden">
          {/* Table */}
          <div className={cn("flex-1 overflow-auto custom-scrollbar transition-all duration-300", selectedLog ? "mr-80" : "")}>
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-[#717182]" />
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-12 text-[#717182]">
                <FileJson className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>No logs found matching your criteria.</p>
                {search && (
                  <button
                    onClick={() => { setDraftSearch(""); setSearch(""); setPage(1); }}
                    className="mt-3 text-[#2F81F7] text-sm hover:underline"
                  >
                    Clear search
                  </button>
                )}
              </div>
            ) : (
              <table className="w-full text-sm text-left whitespace-nowrap">
                <thead className="text-xs text-[#717182] uppercase bg-[#0D1117] sticky top-0 z-10 border-b border-[#30363D]">
                  <tr>
                    <th className="px-4 py-3 font-medium">Block ID</th>
                    <th className="px-4 py-3 font-medium">Source</th>
                    <th className="px-4 py-3 font-medium w-full">Log Preview</th>
                    <th className="px-4 py-3 font-medium">Events</th>
                    <th className="px-4 py-3 font-medium">Prediction</th>
                    <th className="px-4 py-3 font-medium">Ground Truth</th>
                    <th className="px-4 py-3 font-medium">Confidence</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => {
                    const isCorrect = log.prediction === log.truth;
                    return (
                      <tr
                        key={log.id}
                        onClick={() => setSelectedLog(log)}
                        className={cn(
                          "border-b border-[#30363D] hover:bg-[#30363D]/30 transition-colors cursor-pointer",
                          selectedLog?.id === log.id && "bg-[#30363D]/50"
                        )}
                      >
                        <td className="px-4 py-3 font-mono text-[#e9ebef] text-xs">{log.id}</td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="text-xs gap-1">
                            <Server className="h-3 w-3" style={{ color: COLORS.amber }} />
                            HDFS
                          </Badge>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-[#717182] max-w-[320px] truncate" title={log.preview}>
                          {log.preview}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-[#717182]">{log.eventCount}</td>
                        <td className="px-4 py-3">
                          {log.prediction === "Anomaly" ? (
                            <div className="flex items-center gap-1 text-[#F85149]">
                              <ShieldAlert className="h-4 w-4" /> Anomaly
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-[#3FB950]">
                              <ShieldCheck className="h-4 w-4" /> Normal
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn(
                            "text-xs font-mono",
                            isCorrect ? "text-[#3FB950]" : "text-[#F85149]"
                          )}>
                            {log.truth ?? "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-[#e9ebef] text-xs">{log.confidence}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Slide-in Sidebar */}
          <div className={cn(
            "absolute top-0 right-0 h-full w-80 bg-[#161B22] border-l border-[#30363D] shadow-xl transition-transform duration-300 transform",
            selectedLog ? "translate-x-0" : "translate-x-full"
          )}>
            {selectedLog && (
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between p-4 border-b border-[#30363D]">
                  <h3 className="font-semibold text-white">Block Details</h3>
                  <Button variant="ghost" size="icon" onClick={() => setSelectedLog(null)} className="h-8 w-8">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="p-4 flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-4 text-sm">
                  <div>
                    <span className="text-xs text-[#717182] uppercase mb-1 block">Block ID</span>
                    <span className="font-mono text-white break-all">{selectedLog.id}</span>
                  </div>
                  <div>
                    <span className="text-xs text-[#717182] uppercase mb-1 block">Events in Session</span>
                    <span className="font-mono text-white">{selectedLog.eventCount}</span>
                  </div>
                  <div>
                    <span className="text-xs text-[#717182] uppercase mb-1 block">LSTM Prediction</span>
                    <Badge variant={selectedLog.prediction === "Anomaly" ? "critical" : "success"}>
                      {selectedLog.prediction.toUpperCase()} &mdash; {selectedLog.confidence}%
                    </Badge>
                  </div>
                  <div>
                    <span className="text-xs text-[#717182] uppercase mb-1 block">Ground Truth</span>
                    <Badge variant={selectedLog.truth === "Anomaly" ? "critical" : "success"}>
                      {selectedLog.truth ?? "Unknown"}
                    </Badge>
                  </div>
                  {selectedLog.prediction !== selectedLog.truth && (
                    <div className="p-2 bg-[#F85149]/10 border border-[#F85149]/30 rounded text-xs text-[#F85149]">
                      ⚠ Misclassification detected
                    </div>
                  )}
                  <div>
                    <span className="text-xs text-[#717182] uppercase mb-1 block">Raw Log (first 5 lines)</span>
                    <div className="p-3 bg-[#0D1117] rounded-md border border-[#30363D] font-mono text-xs text-[#e9ebef] break-all whitespace-pre-wrap">
                      {selectedLog.raw || selectedLog.preview}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Pagination */}
        {!isLoading && pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[#30363D] shrink-0">
            <span className="text-xs text-[#717182]">
              Page <span className="text-white font-mono">{page}</span> of{" "}
              <span className="text-white font-mono">{pages}</span> &nbsp;·&nbsp;{" "}
              <span className="text-white font-mono">{total.toLocaleString()}</span> sessions
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline" size="sm"
                onClick={() => { setPage((p) => Math.max(1, p - 1)); setSelectedLog(null); }}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline" size="sm"
                onClick={() => { setPage((p) => Math.min(pages, p + 1)); setSelectedLog(null); }}
                disabled={page === pages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Submit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-[#161B22] border border-[#30363D] rounded-lg shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-[#30363D]">
              <h2 className="text-lg font-semibold text-white">Submit Log for Analysis</h2>
              <Button variant="ghost" size="icon" onClick={() => setIsModalOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="p-4">
              <label className="text-sm font-medium text-[#e9ebef] mb-2 block">
                Raw HDFS Log Lines (one or more, with block IDs)
              </label>
              <textarea
                className="w-full h-44 bg-[#0D1117] border border-[#30363D] rounded-md p-3 text-sm font-mono text-white focus:outline-none focus:border-[#2F81F7] focus:ring-1 focus:ring-[#2F81F7]"
                placeholder={EXAMPLE_LOG}
                value={rawLog}
                onChange={(e) => setRawLog(e.target.value)}
              />
              <p className="text-xs text-[#717182] mt-2">
                Tip: paste raw HDFS log lines — the LSTM model parses event templates automatically.
              </p>

              {submitResult && (
                <div className={cn(
                  "mt-4 p-4 rounded-md border",
                  submitResult.success ? "bg-[#0D1117] border-[#30363D]" : "bg-[#F85149]/10 border-[#F85149]/30"
                )}>
                  <h3 className="text-sm font-semibold text-white mb-2">Analysis Result</h3>
                  <div className="flex items-center gap-3 flex-wrap">
                    <Badge variant={submitResult.prediction === "Anomaly" ? "critical" : "success"}>
                      {submitResult.prediction?.toUpperCase()}
                    </Badge>
                    <span className="text-sm font-mono text-[#e9ebef]">Confidence: {submitResult.confidence}%</span>
                  </div>
                  {submitResult.tokens && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {submitResult.tokens.map((t: string, i: number) => (
                        <span key={i} className="text-xs bg-[#30363D] text-[#e9ebef] px-2 py-0.5 rounded font-mono">{t}</span>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-[#717182] mt-2">{submitResult.message}</p>
                </div>
              )}
            </div>
            <div className="p-4 border-t border-[#30363D] flex justify-end gap-3 bg-[#0D1117]/50">
              <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button
                className="bg-[#2F81F7] hover:bg-[#2F81F7]/90 text-white"
                onClick={handleSubmit}
                disabled={isSubmitting || !rawLog.trim()}
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
                {isSubmitting ? "Analyzing…" : "Run Analysis"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
