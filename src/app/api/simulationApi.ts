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
  // SSH Auth
  startSshReplay: async (delay_seconds: number = 2.0) => {
    return apiFetch("/api/simulate/ssh/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ delay_seconds })
    });
  },
  stopSshReplay: async () => {
    return apiFetch("/api/simulate/ssh/stop", { method: "POST" });
  },
  getSshStatus: async () => {
    return apiFetch("/api/simulate/ssh/status");
  },

  // UEBA Insider Threat
  startUebaReplay: async (delay_seconds: number = 2.0) => {
    return apiFetch("/api/simulate/ueba/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ delay_seconds })
    });
  },
  stopUebaReplay: async () => {
    return apiFetch("/api/simulate/ueba/stop", { method: "POST" });
  },
  getUebaStatus: async () => {
    return apiFetch("/api/simulate/ueba/status");
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

  // Combined status
  getAllStatus: async () => {
    return apiFetch("/api/simulate/status/all");
  }
};
