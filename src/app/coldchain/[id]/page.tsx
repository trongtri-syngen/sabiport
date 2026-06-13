"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface Profile { min_temp_c: number; max_temp_c: number; warning_low_c: number | null; warning_high_c: number | null; monitoring_interval_sec: number; }
interface Reading { id: string; reading_ts: string; temperature_c: number; device_ref: string | null; }
interface Action { id: string; action_ts: string; action_owner: string; action_type: string; description: string; outcome: string | null; }
interface Excursion { id: string; excursion_type: string; breach_start_ts: string; breach_end_ts: string | null; peak_temp_c: number | null; alert_sent: boolean; escalated: boolean; status: string; cc_corrective_actions: Action[]; }
interface Shipment { id: string; shipment_ref: string; carrier: string; origin: string; destination: string; status: string; vehicle_ref: string | null; device_ref: string | null; calibration_due: string | null; }
interface Detail { shipment: Shipment; profile: Profile | null; telemetry: Reading[]; excursions: Excursion[]; latest: Reading | null; complianceStatus: string; }

const COMPLIANCE_STYLE: Record<string, string> = {
  IN_RANGE:  "bg-emerald-900/40 border-emerald-700 text-emerald-300",
  EXCURSION: "bg-orange-900/40 border-orange-700 text-orange-300",
  ESCALATED: "bg-red-900/40 border-red-700 text-red-300",
};

const ACTION_TYPES = ["REEFER_ADJUST", "DRIVER_ALERT", "STOP", "ESCALATE", "QUARANTINE"];

export default function ShipmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [simTemp, setSimTemp] = useState("6");
  const [simMsg, setSimMsg] = useState("");
  const [actionForm, setActionForm] = useState({ excursion_id: "", owner: "", type: "REEFER_ADJUST", desc: "", close: false });
  const [actionMsg, setActionMsg] = useState("");
  const [escalateMsg, setEscalateMsg] = useState("");

  const load = useCallback(async () => {
    const r = await fetch(`/api/coldchain/shipments/${id}`);
    if (r.ok) setDetail(await r.json());
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function simulate(e: React.FormEvent) {
    e.preventDefault();
    const r = await fetch("/api/coldchain/telemetry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shipment_id: id, temperature_c: parseFloat(simTemp), device_ref: detail?.shipment.device_ref }),
    });
    const data = await r.json();
    setSimMsg(
      data.excursion_opened
        ? `⚠ Excursion OPENED — ${data.excursion?.excursion_type} breach at ${simTemp}°C`
        : data.excursion_closed
        ? `✓ Excursion closed — temp back in range`
        : `✓ Reading logged at ${simTemp}°C`
    );
    load();
  }

  async function logAction(e: React.FormEvent) {
    e.preventDefault();
    const r = await fetch(`/api/coldchain/excursions/${actionForm.excursion_id}/actions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action_owner: actionForm.owner,
        action_type: actionForm.type,
        description: actionForm.desc,
        close: actionForm.close,
      }),
    });
    if (r.ok) { setActionMsg("Action logged."); setActionForm(f => ({ ...f, desc: "", outcome: "" })); load(); }
    else setActionMsg("Error logging action.");
  }

  async function escalate() {
    const r = await fetch("/api/coldchain/escalate", { method: "POST" });
    const d = await r.json();
    setEscalateMsg(`Escalated ${d.escalated_count} excursion(s). ${d.summary ?? ""}`);
    load();
  }

  if (!detail) return <p className="p-6 text-slate-400">Loading…</p>;
  const { shipment, profile, telemetry, excursions, latest, complianceStatus } = detail;
  const openExcursions = excursions.filter(e => e.status === "OPEN" || e.status === "UNDER_REVIEW");

  return (
    <main className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/coldchain" className="text-slate-400 hover:text-white text-sm">← Control Tower</Link>
        <span className="text-slate-600">/</span>
        <h1 className="text-xl font-bold text-white">{shipment.shipment_ref}</h1>
      </div>

      {/* Compliance card */}
      <div className={`border rounded-lg p-5 ${COMPLIANCE_STYLE[complianceStatus] ?? COMPLIANCE_STYLE.IN_RANGE}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium opacity-80">Compliance status</p>
            <p className="text-2xl font-bold mt-1">{complianceStatus}</p>
          </div>
          {profile && (
            <div className="text-right text-sm">
              <p className="opacity-70">Required range</p>
              <p className="font-mono font-bold text-lg">{profile.min_temp_c}°C – {profile.max_temp_c}°C</p>
            </div>
          )}
          {latest && (
            <div className="text-right text-sm">
              <p className="opacity-70">Latest reading</p>
              <p className="font-mono font-bold text-lg">{latest.temperature_c}°C</p>
              <p className="text-xs opacity-50">{new Date(latest.reading_ts).toLocaleTimeString()}</p>
            </div>
          )}
        </div>
      </div>

      {/* Meta */}
      <div className="grid grid-cols-4 gap-4 text-sm">
        {[
          ["Carrier", shipment.carrier],
          ["Route", `${shipment.origin} → ${shipment.destination}`],
          ["Vehicle", shipment.vehicle_ref ?? "—"],
          ["Device", shipment.device_ref ?? "—"],
        ].map(([k, v]) => (
          <div key={k} className="bg-slate-800 rounded p-3">
            <p className="text-slate-400 text-xs">{k}</p>
            <p className="text-white font-medium mt-0.5">{v}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Telemetry feed */}
        <div>
          <h2 className="text-sm font-semibold text-slate-300 mb-3">Telemetry — last 20 readings</h2>
          {telemetry.length === 0 ? (
            <p className="text-slate-500 text-sm">No readings yet.</p>
          ) : (
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {telemetry.map(r => {
                const inRange = profile
                  ? r.temperature_c >= profile.min_temp_c && r.temperature_c <= profile.max_temp_c
                  : true;
                return (
                  <div key={r.id} className={`flex justify-between items-center px-3 py-1.5 rounded text-sm ${inRange ? "bg-slate-800" : "bg-orange-900/30 border border-orange-700/50"}`}>
                    <span className="text-slate-400 font-mono text-xs">{new Date(r.reading_ts).toLocaleString()}</span>
                    <span className={`font-mono font-bold ${inRange ? "text-emerald-400" : "text-orange-400"}`}>{r.temperature_c}°C</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Simulate reading */}
          <div className="mt-4 bg-slate-800 border border-slate-700 rounded p-4">
            <h3 className="text-xs font-semibold text-slate-400 mb-3 uppercase tracking-wide">Simulate reading</h3>
            <form onSubmit={simulate} className="flex gap-2">
              <input
                type="number" step="0.1" value={simTemp}
                onChange={e => setSimTemp(e.target.value)}
                className="w-28 bg-slate-900 border border-slate-600 rounded px-3 py-1.5 text-sm text-white font-mono"
                placeholder="°C"
              />
              <button type="submit" className="bg-orange-500 hover:bg-orange-400 text-white px-4 py-1.5 rounded text-sm font-medium">
                Ingest
              </button>
            </form>
            {simMsg && <p className="mt-2 text-xs text-slate-300">{simMsg}</p>}
          </div>
        </div>

        {/* Excursion workbench */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-300">Excursion workbench</h2>
            <button onClick={escalate} className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-1 rounded">
              Run escalation check
            </button>
          </div>
          {escalateMsg && <p className="text-xs text-slate-400 mb-2">{escalateMsg}</p>}

          {excursions.length === 0 ? (
            <p className="text-slate-500 text-sm">No excursions.</p>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {excursions.map(ex => (
                <div key={ex.id} className={`border rounded p-3 text-sm ${
                  ex.status === "OPEN" ? "border-orange-700 bg-orange-900/20"
                  : ex.escalated ? "border-red-700 bg-red-900/20"
                  : "border-slate-700 bg-slate-800"
                }`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`font-bold ${ex.status === "OPEN" ? "text-orange-300" : "text-slate-300"}`}>
                      {ex.excursion_type} — {ex.status}
                    </span>
                    {ex.escalated && <span className="text-xs bg-red-900 text-red-300 px-1.5 py-0.5 rounded">ESCALATED</span>}
                    {ex.alert_sent && <span className="text-xs text-slate-400">alert sent</span>}
                  </div>
                  <p className="text-xs text-slate-400">
                    Start: {new Date(ex.breach_start_ts).toLocaleString()}
                    {ex.breach_end_ts && ` → End: ${new Date(ex.breach_end_ts).toLocaleString()}`}
                  </p>
                  {ex.peak_temp_c != null && (
                    <p className="text-xs text-slate-400">Peak: <span className="font-mono text-orange-300">{ex.peak_temp_c}°C</span></p>
                  )}

                  {/* Corrective actions logged */}
                  {ex.cc_corrective_actions?.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {ex.cc_corrective_actions.map((a: Action) => (
                        <div key={a.id} className="bg-slate-900/50 rounded px-2 py-1 text-xs text-slate-400">
                          <span className="text-slate-300 font-medium">{a.action_type}</span> by {a.action_owner} — {a.description}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Log action button */}
                  {ex.status === "OPEN" && (
                    <button
                      onClick={() => setActionForm(f => ({ ...f, excursion_id: ex.id }))}
                      className="mt-2 text-xs text-orange-400 hover:text-orange-300"
                    >
                      + Log corrective action
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Log action form */}
          {actionForm.excursion_id && (
            <form onSubmit={logAction} className="mt-4 bg-slate-800 border border-slate-700 rounded p-4 space-y-3">
              <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wide">Log corrective action</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Owner</label>
                  <input value={actionForm.owner} onChange={e => setActionForm(f => ({ ...f, owner: e.target.value }))}
                    className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-sm text-white" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Type</label>
                  <select value={actionForm.type} onChange={e => setActionForm(f => ({ ...f, type: e.target.value }))}
                    className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-sm text-white">
                    {ACTION_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Description</label>
                <input value={actionForm.desc} onChange={e => setActionForm(f => ({ ...f, desc: e.target.value }))}
                  className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-sm text-white" />
              </div>
              <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
                <input type="checkbox" checked={actionForm.close} onChange={e => setActionForm(f => ({ ...f, close: e.target.checked }))} />
                Close excursion
              </label>
              <div className="flex gap-2">
                <button type="submit" className="bg-orange-500 hover:bg-orange-400 text-white px-3 py-1.5 rounded text-sm font-medium">Save</button>
                <button type="button" onClick={() => setActionForm(f => ({ ...f, excursion_id: "" }))} className="bg-slate-700 text-slate-300 px-3 py-1.5 rounded text-sm">Cancel</button>
              </div>
              {actionMsg && <p className="text-xs text-slate-400">{actionMsg}</p>}
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
