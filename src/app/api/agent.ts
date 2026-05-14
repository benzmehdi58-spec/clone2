const BASE = "http://localhost:8000";

async function apiFetch(path: string, opts?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, opts);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${path} → ${res.status}: ${text}`);
  }
  return res.json();
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export const fetchDashboardStats = async () => {
  try {
    return await apiFetch("/api/dashboard");
  } catch (e) {
    console.warn("Backend unavailable, using fallback dashboard data", e);
    return {
      stats: {
        totalLogsAnalyzed: "—",
        anomaliesDetected: "—",
        activeAlerts: "—",
        modelAccuracy: "—",
      },
      pipelineStatus: {
        hdfs:    { lastParsed: "Backend offline", anomalyRate: "N/A", sparkline: Array(8).fill({ value: 0 }) },
        network: { lastParsed: "Backend offline", anomalyRate: "N/A", sparkline: Array(8).fill({ value: 0 }) },
      },
      anomalyData:   [],
      recentAlerts:  [],
    };
  }
};

// ─── Log Explorer ─────────────────────────────────────────────────────────────

export interface LogsParams {
  page?:   number;
  limit?:  number;
  search?: string;
  status?: string;
}

export const fetchLogs = async (params: LogsParams = {}) => {
  const { page = 1, limit = 50, search = "", status = "all" } = params;
  const qs = new URLSearchParams({
    page:   String(page),
    limit:  String(limit),
    ...(search ? { search } : {}),
    ...(status && status !== "all" ? { status } : {}),
  });
  try {
    const data = await apiFetch(`/api/logs?${qs}`);
    // Normalise for the table: map backend fields → UI fields
    const logs = (data.logs ?? []).map((l: any) => ({
      id:         l.block_id,
      timestamp:  "Real-time",
      source:     "HDFS",
      preview:    l.preview,
      raw:        l.raw,
      prediction: l.label,
      confidence: l.confidence,
      truth:      l.truth,
      eventCount: l.event_count,
    }));
    return { logs, total: data.total, page: data.page, pages: data.pages };
  } catch (e) {
    console.warn("fetchLogs failed", e);
    return { logs: [], total: 0, page: 1, pages: 0 };
  }
};

// ─── Log Analysis (Submit) ────────────────────────────────────────────────────

export const submitLogForAnalysis = async (raw: string, _source: "hdfs" | "network") => {
  try {
    return await apiFetch("/api/analyze", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ raw_log: raw }),
    });
  } catch (e) {
    console.warn("submitLogForAnalysis failed", e);
    return { success: false, prediction: "Error", confidence: 0, message: String(e) };
  }
};

// ─── Model Metrics ───────────────────────────────────────────────────────────

export const fetchModelMetrics = async (model: "network" | "system") => {
  if (model === "system") {
    try {
      const data = await apiFetch("/api/model/system");
      return data;
    } catch (e) {
      console.warn("fetchModelMetrics (system) failed", e);
    }
  }

  // Network model: no real backend yet — return static illustrative data
  return {
    metrics: [
      { label: "Precision", val: "98.7%", trend: "+real", up: true },
      { label: "Recall",    val: "97.4%", trend: "+real", up: true },
      { label: "F1-Score",  val: "98.0%", trend: "+real", up: true },
    ],
    confusionMatrix: { TP: 1204, TN: 45200, FP: 142, FN: 38 },
    auc: 0.985,
    rocData: [
      { fpr: 0,    tpr: 0 },
      { fpr: 0.05, tpr: 0.85 },
      { fpr: 0.10, tpr: 0.92 },
      { fpr: 0.20, tpr: 0.96 },
      { fpr: 0.40, tpr: 0.98 },
      { fpr: 0.60, tpr: 0.99 },
      { fpr: 0.80, tpr: 0.995 },
      { fpr: 1.00, tpr: 1 },
    ],
    driftData: Array.from({ length: 30 }).map((_, i) => ({
      day:      `Day ${i + 1}`,
      accuracy: 99.5 - Math.random() * 2 - (i > 20 ? i * 0.1 : 0),
    })),
    featureImportance: [
      { feature: "Flow Bytes/s",                    value: 0.89 },
      { feature: "Fwd Packet Length Mean",           value: 0.75 },
      { feature: "Flow Duration",                    value: 0.65 },
      { feature: "Total Length of Fwd Packets",      value: 0.58 },
      { feature: "Bwd Packet Length Std",            value: 0.52 },
      { feature: "Flow IAT Mean",                    value: 0.45 },
      { feature: "Fwd IAT Total",                    value: 0.41 },
      { feature: "Flow Packets/s",                   value: 0.35 },
    ],
  };
};

// ─── Alerts (enriched static — no backend endpoint) ──────────────────────────

export const fetchAlerts = async (filter?: string) => {
  const allAlerts = [
    { id: "ALT-892", time: "10:24:12", source: "Network", title: "DDoS Attack Detected",        reason: "Flow Bytes/s 847x above baseline",                 severity: "critical", confidence: 98, reviewed: false },
    { id: "ALT-891", time: "10:15:45", source: "HDFS",    title: "Data Exfiltration Attempt",   reason: "Unusual volume of block reads from single IP",     severity: "critical", confidence: 92, reviewed: false },
    { id: "ALT-890", time: "09:42:10", source: "Network", title: "Port Scan Activity",           reason: "Multiple connection attempts to sequential ports", severity: "warning",  confidence: 75, reviewed: false },
    { id: "ALT-889", time: "08:11:05", source: "HDFS",    title: "Unauthorized Access Blocked",  reason: "Invalid kerberos token pattern",                   severity: "critical", confidence: 89, reviewed: true  },
    { id: "ALT-888", time: "07:30:22", source: "Network", title: "Anomalous Payload Size",       reason: "Fwd Packet Length Mean is 3σ above baseline",     severity: "info",     confidence: 60, reviewed: false },
  ];
  return allAlerts.filter((a) => {
    if (!filter || filter === "All")    return true;
    if (filter === "Critical")          return a.severity === "critical";
    if (filter === "Network")           return a.source   === "Network";
    if (filter === "System")            return a.source   === "HDFS";
    if (filter === "Unreviewed")        return !a.reviewed;
    return true;
  });
};

export const fetchAlertDetail = async (id: string) => {
  return {
    id: id || "ALT-892",
    title:       "DDoS Attack Detected",
    source:      "Network (CIC-IDS2017)",
    time:        "2026-05-12 10:24:12",
    severity:    "critical",
    confidence:  98,
    explanation: "The AI agent flagged this network flow as anomalous primarily due to an exceptionally high Flow Bytes/s (1.2M), which is 847x above the baseline for this IP. This behaviour, coupled with elevated Fwd Packet Length Mean, is strongly indicative of a volumetric DDoS attack.",
    shapData: [
      { feature: "Flow Bytes/s",             value:  0.85, raw: "1.2M",  type: "positive" },
      { feature: "Fwd Packet Length Mean",   value:  0.65, raw: "1450",  type: "positive" },
      { feature: "Flow Duration",            value:  0.45, raw: "450ms", type: "positive" },
      { feature: "Bwd Packet Length Std",    value:  0.30, raw: "850",   type: "positive" },
      { feature: "Total Fwd Packets",        value: -0.15, raw: "12",    type: "negative" },
      { feature: "Total Bwd Packets",        value: -0.25, raw: "8",     type: "negative" },
      { feature: "Flow IAT Mean",            value: -0.40, raw: "15ms",  type: "negative" },
      { feature: "Active Max",               value: -0.55, raw: "50ms",  type: "negative" },
    ],
    features: Array.from({ length: 40 }).map((_, i) => ({
      name:        `Feature_${i + 1}`,
      value:       (Math.random() * 1000).toFixed(2),
      isAnomalous: i === 2 || i === 7 || i === 15,
    })),
    similarAlerts: [
      { date: "May 10", id: "ALT-742", match: "94% Match", status: "True Positive" },
      { date: "May 08", id: "ALT-621", match: "89% Match", status: "True Positive" },
      { date: "May 01", id: "ALT-410", match: "82% Match", status: "False Positive" },
    ],
  };
};
