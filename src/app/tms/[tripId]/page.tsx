"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { TripResult, ShipmentResult, Mechanism } from "@/lib/tms/types";

const MECHANISMS: Mechanism[] = ["PALLET", "WEIGHT", "LDM", "CBM"];

interface ShipmentForm {
  client_name: string;
  pallets: string;
  weight_kg: string;
  height_m: string;
  charging_mechanism: Mechanism;
}

const EMPTY_FORM: ShipmentForm = {
  client_name: "",
  pallets: "",
  weight_kg: "",
  height_m: "1.8",
  charging_mechanism: "PALLET",
};

function pct(v: number) {
  return (v * 100).toFixed(1) + "%";
}

function eur(v: number) {
  return "€" + v.toFixed(2);
}

function MarginCell({ margin }: { margin: number }) {
  const cls = margin >= 0 ? "margin-positive" : "margin-negative";
  return <span className={`number ${cls}`}>{pct(margin)}</span>;
}

export default function TripPage() {
  const params = useParams();
  const router = useRouter();
  const tripId = params.tripId as string;

  const [result, setResult] = useState<TripResult | null>(null);
  const [simulation, setSimulation] = useState<ShipmentResult[] | null>(null);
  const [simMechanism, setSimMechanism] = useState<Mechanism | "">("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ShipmentForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load(sim?: Mechanism) {
    const url = sim ? `/api/tms/trips/${tripId}?simulate=${sim}` : `/api/tms/trips/${tripId}`;
    const res = await fetch(url);
    if (!res.ok) { router.push("/tms"); return; }
    const data = await res.json();
    setResult(data);
    if (sim && data.simulation) setSimulation(data.simulation);
    else setSimulation(null);
  }

  useEffect(() => { load(); }, [tripId]);

  async function addShipment(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/tms/trips/${tripId}/shipments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_name: form.client_name,
          pallets: parseInt(form.pallets),
          weight_kg: parseFloat(form.weight_kg),
          height_m: parseFloat(form.height_m),
          charging_mechanism: form.charging_mechanism,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError("Error adding shipment");
        console.error(d);
      } else {
        setForm(EMPTY_FORM);
        setShowForm(false);
        await load(simMechanism || undefined);
      }
    } finally {
      setSaving(false);
    }
  }

  async function deleteShipment(sid: string) {
    if (!confirm("Remove this shipment?")) return;
    await fetch(`/api/tms/trips/${tripId}/shipments?shipment_id=${sid}`, { method: "DELETE" });
    await load(simMechanism || undefined);
  }

  async function runSim(mech: Mechanism | "") {
    setSimMechanism(mech);
    if (mech) await load(mech);
    else { setSimulation(null); await load(); }
  }

  if (!result) {
    return <div style={{ color: "var(--text-muted)", padding: 40 }}>Loading…</div>;
  }

  const displayShipments = simulation ?? result.shipments;

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <button
          onClick={() => router.push("/tms")}
          style={{ color: "var(--text-muted)", fontSize: 13, background: "none", border: "none", cursor: "pointer", marginBottom: 8 }}
        >
          ← Trips
        </button>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)" }}>{result.name}</h1>
        {result.origin && result.destination && (
          <p style={{ color: "var(--text-secondary)", fontSize: 14, marginTop: 2 }}>
            {result.origin} → {result.destination}
          </p>
        )}
      </div>

      {/* Summary stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Truck Cost", value: eur(result.total_cost), orange: true },
          { label: "Total Pallets", value: result.total_pallets, orange: false },
          { label: "Total Charge", value: eur(simulation ? displayShipments.reduce((s, r) => s + r.client_charge, 0) : result.total_charge), orange: false },
          {
            label: "Overall Margin",
            value: pct(simulation
              ? (displayShipments.reduce((s, r) => s + r.client_charge, 0) / result.total_cost) - 1
              : result.total_margin),
            orange: false,
            margin: simulation
              ? (displayShipments.reduce((s, r) => s + r.client_charge, 0) / result.total_cost) - 1
              : result.total_margin,
          },
        ].map((s) => (
          <div key={s.label} className="card" style={{ padding: "14px 18px" }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>{s.label}</div>
            <div style={{
              fontSize: 22,
              fontWeight: 700,
              fontVariantNumeric: "tabular-nums",
              color: "margin" in s
                ? s.margin! >= 0 ? "var(--success)" : "var(--danger)"
                : s.orange ? "var(--brand-orange)" : "var(--text-primary)",
            }}>
              {String(s.value)}
            </div>
          </div>
        ))}
      </div>

      {/* Scenario simulator */}
      <div className="card" style={{ marginBottom: 24, display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
          Scenario Simulator:
        </span>
        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Apply uniform mechanism across all clients →</span>
        {(["", ...MECHANISMS] as (Mechanism | "")[]).map((m) => (
          <button
            key={m || "current"}
            className="btn"
            onClick={() => runSim(m)}
            style={{
              fontSize: 12,
              padding: "5px 10px",
              background: simMechanism === m ? "var(--brand-orange)" : "rgba(255,255,255,0.06)",
              color: simMechanism === m ? "white" : "var(--text-secondary)",
              border: simMechanism === m ? "none" : "1px solid var(--border)",
              borderRadius: 6,
            }}
          >
            {m || "Current"}
          </button>
        ))}
        {simulation && (
          <span style={{ fontSize: 12, color: "var(--warning)", marginLeft: 4 }}>
            Simulated: all {simMechanism}
          </span>
        )}
      </div>

      {/* Shipments table */}
      <div className="card" style={{ padding: 0, marginBottom: 24 }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ fontSize: 15, fontWeight: 600 }}>Client Shipments</h2>
          <button className="btn btn-primary" style={{ fontSize: 12 }} onClick={() => setShowForm(!showForm)}>
            + Add Client
          </button>
        </div>

        {showForm && (
          <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", background: "rgba(0,0,0,0.2)" }}>
            {error && <div style={{ color: "var(--danger)", fontSize: 12, marginBottom: 8 }}>{error}</div>}
            <form onSubmit={addShipment}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr) auto", gap: 10, alignItems: "end" }}>
                <div>
                  <label className="label">Client</label>
                  <input className="input" value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })} placeholder="Acer" required />
                </div>
                <div>
                  <label className="label">Pallets</label>
                  <input className="input" type="number" min="1" value={form.pallets} onChange={(e) => setForm({ ...form, pallets: e.target.value })} placeholder="6" required />
                </div>
                <div>
                  <label className="label">Weight (kg)</label>
                  <input className="input" type="number" step="0.1" value={form.weight_kg} onChange={(e) => setForm({ ...form, weight_kg: e.target.value })} placeholder="2400" required />
                </div>
                <div>
                  <label className="label">Height (m)</label>
                  <input className="input" type="number" step="0.01" value={form.height_m} onChange={(e) => setForm({ ...form, height_m: e.target.value })} placeholder="1.8" required />
                </div>
                <div>
                  <label className="label">Mechanism</label>
                  <select
                    className="input"
                    value={form.charging_mechanism}
                    onChange={(e) => setForm({ ...form, charging_mechanism: e.target.value as Mechanism })}
                  >
                    {MECHANISMS.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button type="submit" className="btn btn-primary" style={{ fontSize: 12, whiteSpace: "nowrap" }} disabled={saving}>
                    {saving ? "…" : "Add"}
                  </button>
                  <button type="button" className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => setShowForm(false)}>
                    Cancel
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {displayShipments.length === 0 ? (
          <div style={{ padding: 32, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
            No shipments yet. Add a client above.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="table-base">
              <thead>
                <tr>
                  <th>Client</th>
                  <th style={{ textAlign: "right" }}>Pallets</th>
                  <th style={{ textAlign: "right" }}>Weight</th>
                  <th style={{ textAlign: "right" }}>LDM</th>
                  <th style={{ textAlign: "right" }}>CBM</th>
                  <th>Mechanism</th>
                  <th style={{ textAlign: "right" }}>Cost Alloc.</th>
                  <th style={{ textAlign: "right" }}>Charge</th>
                  <th style={{ textAlign: "right" }}>Margin</th>
                  {!simulation && <th style={{ textAlign: "right" }}>Optimal</th>}
                  {!simulation && <th style={{ textAlign: "right" }}>Δ Margin</th>}
                  <th />
                </tr>
              </thead>
              <tbody>
                {displayShipments.map((sh) => (
                  <tr key={sh.id}>
                    <td style={{ color: "var(--text-primary)", fontWeight: 500 }}>{sh.client_name}</td>
                    <td style={{ textAlign: "right" }} className="number">{sh.pallets}</td>
                    <td style={{ textAlign: "right" }} className="number">{sh.weight_kg.toFixed(0)} kg</td>
                    <td style={{ textAlign: "right" }} className="number">{sh.ldm.toFixed(2)}</td>
                    <td style={{ textAlign: "right" }} className="number">{sh.cbm.toFixed(3)}</td>
                    <td>
                      <span style={{ fontSize: 11, padding: "2px 7px", borderRadius: 6, background: "rgba(255,94,26,0.12)", color: "var(--brand-orange)", fontWeight: 600 }}>
                        {sh.charging_mechanism}
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }} className="number">{eur(sh.cost_allocation)}</td>
                    <td style={{ textAlign: "right" }} className="number-orange">{eur(sh.client_charge)}</td>
                    <td style={{ textAlign: "right" }}><MarginCell margin={sh.margin} /></td>
                    {!simulation && (
                      <td style={{ textAlign: "right" }}>
                        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{sh.optimal_mechanism}</span>
                        {" "}
                        <span className="number">{eur(sh.optimal_charge)}</span>
                      </td>
                    )}
                    {!simulation && (
                      <td style={{ textAlign: "right" }}>
                        <span className={sh.delta_margin > 0 ? "margin-positive number" : "number"}>
                          {sh.delta_margin > 0 ? "+" : ""}{pct(sh.delta_margin)}
                        </span>
                      </td>
                    )}
                    <td>
                      <button
                        onClick={() => deleteShipment(sh.id)}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: 14, padding: "2px 4px" }}
                        title="Remove"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={simulation ? 6 : 6} style={{ fontWeight: 700, color: "var(--text-primary)", borderTop: "1px solid var(--border)", paddingTop: 10 }}>
                    Total
                  </td>
                  <td style={{ textAlign: "right", fontWeight: 700, color: "var(--text-primary)", borderTop: "1px solid var(--border)" }} className="number">
                    {eur(result.total_cost)}
                  </td>
                  <td style={{ textAlign: "right", borderTop: "1px solid var(--border)" }} className="number-orange">
                    {eur(displayShipments.reduce((s, r) => s + r.client_charge, 0))}
                  </td>
                  <td style={{ textAlign: "right", borderTop: "1px solid var(--border)" }}>
                    <MarginCell margin={(displayShipments.reduce((s, r) => s + r.client_charge, 0) / result.total_cost) - 1} />
                  </td>
                  {!simulation && <td colSpan={2} style={{ borderTop: "1px solid var(--border)" }} />}
                  <td style={{ borderTop: "1px solid var(--border)" }} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
