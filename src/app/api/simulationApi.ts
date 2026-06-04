const BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

async function apiFetch(path: string, opts?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, opts);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${path} → ${res.status}: ${text}`);
  }
  return res.json();
}

export const SimulationApi = {
  // HDFS
  startHdfsReplay: async (delay_seconds: number = 2.0) => {
    return apiFetch("/api/simulate/hdfs/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ delay_seconds })
    });
  },
  stopHdfsReplay: async () => {
    return apiFetch("/api/simulate/hdfs/stop", { method: "POST" });
  },
  getHdfsStatus: async () => {
    return apiFetch("/api/simulate/hdfs/status");
  },

  // Network
  startNetwork: async (scenario: string, flows_per_second: number = 1.0) => {
    return apiFetch("/api/simulate/network/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scenario, flows_per_second })
    });
  },
  stopNetwork: async () => {
    return apiFetch("/api/simulate/network/stop", { method: "POST" });
  },
  getNetworkStatus: async () => {
    return apiFetch("/api/simulate/network/status");
  },

  // LLM Generator
  startLLM: async (params: { attack_type: string, block_count: number, speed: string, api_key: string }) => {
    return apiFetch("/api/simulate/llm/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params)
    });
  },
  stopLLM: async () => {
    return apiFetch("/api/simulate/llm/stop", { method: "POST" });
  },

  // Combined status
  getAllStatus: async () => {
    return apiFetch("/api/simulate/status/all");
  }
};
