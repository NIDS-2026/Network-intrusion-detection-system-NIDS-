import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
const API_KEY =
  import.meta.env.VITE_NIDS_API_KEY ||
  // Safe development fallback – matches backend default
  "nids-dev-key-2025";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 8000,
});

apiClient.interceptors.request.use((config) => {
  if (!config.headers) config.headers = {};
  config.headers["X-API-Key"] = API_KEY;
  return config;
});

apiClient.interceptors.response.use(
  (res) => res,
  (error) => {
    // Let callers decide how to fallback, but attach a friendly flag
    if (error.response) {
      // Server returned an error
      // eslint-disable-next-line no-console
      console.error("API error:", error.response.status, error.response.data);
    } else if (error.request) {
      // eslint-disable-next-line no-console
      console.error("API unreachable:", error.message);
    } else {
      // eslint-disable-next-line no-console
      console.error("API config error:", error.message);
    }
    return Promise.reject(error);
  }
);

// ── Helpers with graceful fallbacks ─────────────────────────────

export async function fetchHealth() {
  try {
    const res = await axios.get(`${API_BASE_URL}/health`);
    return { data: res.data, fromFallback: false };
  } catch {
    return {
      fromFallback: true,
      data: {
        status: "degraded",
        model_loaded: false,
        uptime: "0 seconds",
      },
    };
  }
}

export async function fetchModelInfo() {
  try {
    const res = await axios.get(`${API_BASE_URL}/`);
    return { data: res.data, fromFallback: false };
  } catch {
    return {
      fromFallback: true,
      data: {
        status: "offline",
        model_loaded: false,
        version: "unknown",
        model_type: "N/A",
        features: 41,
        attack_types: ["dos", "probe", "r2l", "u2r", "normal"],
      },
    };
  }
}

export async function fetchStats() {
  try {
    const res = await axios.get(`${API_BASE_URL}/stats`);
    return { data: res.data, fromFallback: false };
  } catch {
    return {
      fromFallback: true,
      data: {
        total_predictions: 0,
        attacks_detected: 0,
        attack_breakdown: {
          dos: 0,
          probe: 0,
          r2l: 0,
          u2r: 0,
        },
        detection_rate: "0%",
      },
    };
  }
}

export async function predictSingle(payload) {
  try {
    const res = await apiClient.post("/predict", payload || {});
    return { data: res.data, fromFallback: false };
  } catch (error) {
    return {
      fromFallback: true,
      error,
      data: {
        prediction: "normal",
        confidence: 0.5,
        threat_level: "Unknown",
        attack_type: "Offline mode (simulated)",
        is_attack: false,
        recommendation:
          "Backend not reachable. Verify FastAPI is running on http://localhost:8000.",
        top_features: {},
      },
    };
  }
}

export async function predictBatch(payloadList) {
  try {
    const res = await apiClient.post("/predict/batch", payloadList || []);
    return { data: res.data, fromFallback: false };
  } catch (error) {
    return {
      fromFallback: true,
      error,
      data: (payloadList || []).map(() => ({
        prediction: "normal",
        confidence: 0.5,
        threat_level: "Unknown",
        attack_type: "Offline mode (simulated)",
        is_attack: false,
        recommendation:
          "Backend not reachable. Verify FastAPI is running on http://localhost:8000.",
        top_features: {},
      })),
    };
  }
}

