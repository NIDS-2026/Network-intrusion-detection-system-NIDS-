import { useState } from "react";
import { predictSingle, predictBatch } from "../services/api";
import { useHistoryStore } from "../hooks/HistoryContext";
import StatusPill from "../components/StatusPill";
import LoadingOverlay from "../components/LoadingOverlay";

const REQUIRED_FIELDS = ["protocol_type", "service", "flag"];

const DEFAULT_PAYLOAD = {
  protocol_type: "tcp",
  service: "http",
  flag: "SF",
  duration: 0,
  src_bytes: 0,
  dst_bytes: 0,
  logged_in: 1,
  count: 1,
  serror_rate: 0.0,
};

export default function Detection() {
  const { addEntry } = useHistoryStore();
  const [payload, setPayload] = useState(DEFAULT_PAYLOAD);
  const [errors, setErrors] = useState({});
  const [result, setResult] = useState(null);
  const [batchResults, setBatchResults] = useState(null);
  const [csvError, setCsvError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;
    setPayload((prev) => ({
      ...prev,
      [name]: name === "duration" || name.endsWith("_bytes") || name === "count"
        ? Number(value)
        : name.endsWith("_rate")
        ? Number(value)
        : name === "logged_in"
        ? Number(value)
        : value,
    }));
  }

  function validate() {
    const nextErrors = {};
    REQUIRED_FIELDS.forEach((f) => {
      if (!payload[f]) {
        nextErrors[f] = "Required";
      }
    });
    if (payload.duration < 0) {
      nextErrors.duration = "Must be ≥ 0";
    }
    if (payload.serror_rate < 0 || payload.serror_rate > 1) {
      nextErrors.serror_rate = "Between 0 and 1";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setResult(null);
    setBatchResults(null);

    const { data, fromFallback } = await predictSingle(payload);
    setResult({ ...data, fromFallback });
    addEntry({
      type: "single",
      input: payload,
      ...data,
    });
    setLoading(false);
  }

  async function handleCsvUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvError("");
    setBatchResults(null);
    setLoading(true);

    try {
      const text = await file.text();
      const lines = text
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);
      if (lines.length < 2) {
        throw new Error("CSV must include header and at least one row.");
      }
      const headers = lines[0].split(",").map((h) => h.trim());
      const rows = lines.slice(1).map((line) => {
        const values = line.split(",");
        const obj = {};
        headers.forEach((header, idx) => {
          const raw = values[idx]?.trim();
          if (raw === undefined || raw === "") return;
          const lower = header.toLowerCase();
          const num = Number(raw);
          obj[header] =
            Number.isNaN(num) || ["protocol_type", "service", "flag"].includes(lower)
              ? raw
              : num;
        });
        return obj;
      });
      const trimmed = rows.filter((r) => Object.keys(r).length > 0).slice(0, 100);
      if (trimmed.length === 0) {
        throw new Error("No valid rows parsed from CSV.");
      }

      const { data, fromFallback } = await predictBatch(trimmed);
      setBatchResults({ data, fromFallback, count: trimmed.length });
      data.forEach((res, idx) => {
        addEntry({
          type: "batch",
          index: idx,
          input: trimmed[idx],
          ...res,
        });
      });
    } catch (err) {
      setCsvError(err.message || "Failed to parse CSV.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 relative">
      {loading && <LoadingOverlay />}

      <div className="flex flex-col gap-2">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
          Live Detection
        </h1>
        <p className="text-sm text-slate-400 max-w-2xl">
          Analyze individual connections or upload captured traffic in CSV form.
          The backend model classifies each connection as normal or one of four
          attack types.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <form
          onSubmit={handleSubmit}
          className="glass-panel lg:col-span-3 p-4 md:p-5 space-y-4"
        >
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                Single connection
              </h2>
              <p className="text-xs text-slate-400">
                Key NSL-KDD features with safe defaults.
              </p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <Field
              label="Protocol"
              name="protocol_type"
              value={payload.protocol_type}
              onChange={handleChange}
              error={errors.protocol_type}
              as="select"
            >
              <option value="tcp">tcp</option>
              <option value="udp">udp</option>
              <option value="icmp">icmp</option>
            </Field>
            <Field
              label="Service"
              name="service"
              value={payload.service}
              onChange={handleChange}
              error={errors.service}
              as="select"
            >
              <option value="http">http</option>
              <option value="ssh">ssh</option>
              <option value="ftp">ftp</option>
              <option value="smtp">smtp</option>
              <option value="dns">dns</option>
              <option value="ftp_data">ftp_data</option>
              <option value="other">other</option>
            </Field>
            <Field
              label="Flag"
              name="flag"
              value={payload.flag}
              onChange={handleChange}
              error={errors.flag}
              as="select"
            >
              <option value="SF">SF (normal)</option>
              <option value="S0">S0 (half-open)</option>
              <option value="REJ">REJ</option>
              <option value="RSTO">RSTO</option>
              <option value="SH">SH</option>
            </Field>
            <Field
              label="Duration (s)"
              name="duration"
              type="number"
              min={0}
              value={payload.duration}
              onChange={handleChange}
              error={errors.duration}
            />
            <Field
              label="Src bytes"
              name="src_bytes"
              type="number"
              min={0}
              value={payload.src_bytes}
              onChange={handleChange}
            />
            <Field
              label="Dst bytes"
              name="dst_bytes"
              type="number"
              min={0}
              value={payload.dst_bytes}
              onChange={handleChange}
            />
            <Field
              label="Logged in"
              name="logged_in"
              as="select"
              value={payload.logged_in}
              onChange={handleChange}
            >
              <option value={1}>Yes</option>
              <option value={0}>No</option>
            </Field>
            <Field
              label="Count (2s window)"
              name="count"
              type="number"
              min={1}
              max={512}
              value={payload.count}
              onChange={handleChange}
            />
            <Field
              label="SYN error rate"
              name="serror_rate"
              type="number"
              step="0.01"
              min={0}
              max={1}
              value={payload.serror_rate}
              onChange={handleChange}
              error={errors.serror_rate}
            />
          </div>

          <div className="flex items-center justify-between gap-3 pt-2">
            <p className="text-xs text-slate-500">
              Only a subset of features is exposed here. The backend fills in
              the remaining NSL-KDD features with safe defaults.
            </p>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-slate-900"
            >
              Analyze traffic
            </button>
          </div>
        </form>

        <div className="space-y-4 lg:col-span-2">
          <div className="glass-panel p-4 md:p-5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                  CSV upload
                </h2>
                <p className="text-xs text-slate-400">
                  Batch classify up to 100 connections.
                </p>
              </div>
            </div>
            <label className="block">
              <span className="sr-only">Upload CSV</span>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={handleCsvUpload}
                className="block w-full text-xs text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-500/10 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-emerald-300 hover:file:bg-emerald-500/20"
              />
            </label>
            {csvError && (
              <p className="text-xs text-rose-400">{csvError}</p>
            )}
            <p className="text-[0.7rem] text-slate-500">
              CSV header should match NSL-KDD field names (e.g.{" "}
              <code className="font-mono text-emerald-300">
                protocol_type,service,flag,count,serror_rate,src_bytes,...
              </code>
              ). Extra columns are ignored, missing ones fall back to defaults.
            </p>
          </div>

          <div className="glass-panel p-4 md:p-5 space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
              Latest result
            </h2>
            {!result && !batchResults && (
              <p className="text-sm text-slate-500">
                Run a single prediction or upload a CSV to see results here.
              </p>
            )}

            {result && (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <StatusPill
                    isAttack={result.is_attack}
                    threatLevel={result.threat_level}
                  />
                  <div className="text-right text-xs">
                    <p className="text-slate-400">Prediction</p>
                    <p className="font-mono text-sm">
                      {result.prediction.toUpperCase()}
                    </p>
                    <p className="text-slate-400">
                      Confidence:{" "}
                      <span className="font-mono">
                        {(result.confidence * 100).toFixed(1)}%
                      </span>
                    </p>
                  </div>
                </div>
                <p className="text-xs text-slate-300">
                  {result.recommendation}
                  {result.fromFallback && (
                    <span className="block mt-1 text-amber-400">
                      Backend not reachable. Displaying simulated offline
                      result.
                    </span>
                  )}
                </p>
                {result.top_features && (
                  <div className="text-xs text-slate-400">
                    <p className="mb-1">Key contributing features:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {Object.entries(result.top_features).map(([k, v]) => (
                        <span
                          key={k}
                          className="px-2 py-0.5 rounded-full bg-slate-900/80 border border-slate-700/80 font-mono text-[0.7rem]"
                        >
                          {k}: {String(v)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {batchResults && (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-slate-200">
                    Batch classified{" "}
                    <span className="font-mono">
                      {batchResults.count} connections
                    </span>
                  </p>
                  {batchResults.fromFallback && (
                    <span className="text-xs text-amber-400">
                      Backend unreachable — showing simulated results.
                    </span>
                  )}
                </div>
                <div className="max-h-56 overflow-auto scrollbar-thin">
                  <table className="w-full text-xs">
                    <thead className="text-slate-400">
                      <tr className="border-b border-slate-800">
                        <th className="py-1.5 text-left font-medium">#</th>
                        <th className="py-1.5 text-left font-medium">
                          Prediction
                        </th>
                        <th className="py-1.5 text-left font-medium">
                          Confidence
                        </th>
                        <th className="py-1.5 text-left font-medium">
                          Threat
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {batchResults.data.map((row, idx) => (
                        <tr
                          key={idx}
                          className="border-b border-slate-900/80 last:border-0"
                        >
                          <td className="py-1.5">{idx + 1}</td>
                          <td className="py-1.5 font-mono">
                            {row.prediction.toUpperCase()}
                          </td>
                          <td className="py-1.5">
                            {(row.confidence * 100).toFixed(1)}%
                          </td>
                          <td className="py-1.5">{row.threat_level}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  name,
  as,
  type = "text",
  error,
  children,
  ...rest
}) {
  const InputComponent = as === "select" ? "select" : "input";
  return (
    <label className="flex flex-col gap-1 text-xs">
      <span className="text-slate-300">{label}</span>
      <InputComponent
        name={name}
        type={as === "select" ? undefined : type}
        className={`rounded-lg bg-slate-950/80 border px-2.5 py-1.5 text-xs outline-none focus:ring-1 ${
          error
            ? "border-rose-500/70 focus:ring-rose-400 focus:border-rose-400"
            : "border-slate-700/80 focus:ring-emerald-400 focus:border-emerald-400"
        }`}
        {...rest}
      >
        {children}
      </InputComponent>
      {error && <span className="text-rose-400 text-[0.7rem]">{error}</span>}
    </label>
  );
}

