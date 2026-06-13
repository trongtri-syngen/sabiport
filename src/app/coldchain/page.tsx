"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface ShipmentRow {
  id: string;
  shipment_ref: string;
  carrier: string;
  origin: string;
  destination: string;
  status: string;
  product_category: string;
  complianceStatus: "IN_RANGE" | "EXCURSION" | "ESCALATED";
  openExcursions: number;
  created_at: string;
}

const BADGE: Record<string, string> = {
  IN_RANGE:  "bg-emerald-900 text-emerald-300",
  EXCURSION: "bg-orange-900 text-orange-300",
  ESCALATED: "bg-red-900 text-red-300",
};

const STATUS_BADGE: Record<string, string> = {
  PLANNED:    "bg-slate-700 text-slate-300",
  IN_TRANSIT: "bg-blue-900 text-blue-300",
  DELIVERED:  "bg-emerald-900 text-emerald-300",
  HOLD:       "bg-red-900 text-red-300",
};

export default function ColdChainPage() {
  const [rows, setRows] = useState<ShipmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    shipment_ref: "", carrier: "", origin: "", destination: "",
    product_category: "PHARMA", vehicle_ref: "", device_ref: "",
    min_temp_c: "2", max_temp_c: "8",
    warning_low_c: "3", warning_high_c: "7",
  });

  const [loadError, setLoadError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setLoadError(null);
    try {
      const r = await fetch("/api/coldchain/shipments");
      const data = await r.json();
      if (!r.ok || !Array.isArray(data)) {
        setRows([]);
        setLoadError(
          (data && data.error) || `Could not load shipments (HTTP ${r.status}).`
        );
      } else {
        setRows(data);
      }
    } catch (err) {
      setRows([]);
      setLoadError(err instanceof Error ? err.message : "Network error.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/coldchain/shipments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        min_temp_c: parseFloat(form.min_temp_c),
        max_temp_c: parseFloat(form.max_temp_c),
        warning_low_c: form.warning_low_c ? parseFloat(form.warning_low_c) : null,
        warning_high_c: form.warning_high_c ? parseFloat(form.warning_high_c) : null,
      }),
    });
    if (res.ok) { setCreating(false); load(); }
  }

  return (
    <main className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Cold-Chain Control Tower</h1>
          <p className="text-slate-400 text-sm mt-1">Temperature compliance â€” detect, act, close</p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="bg-orange-500 hover:bg-orange-400 text-white px-4 py-2 rounded font-medium text-sm"
        >
          + New Shipment
        </button>
      </div>

      {creating && (
        <form onSubmit={create} className="bg-slate-800 border border-slate-700 rounded-lg p-5 mb-6 grid grid-cols-2 gap-4">
          <h2 className="col-span-2 font-semibold text-white">New Cold-Chain Shipment</h2>
          {[
            ["shipment_ref","Shipment ref"],["carrier","Carrier"],
            ["origin","Origin"],["destination","Destination"],
            ["product_category","Product category"],["vehicle_ref","Vehicle ref"],
            ["device_ref","Device / sensor ref"],
          ].map(([k,label]) => (
            <div key={k}>
              <label className="block text-xs text-slate-400 mb-1">{label}</label>
              <input
                value={(form as any)[k]}
                onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))}
                className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-1.5 text-sm text-white"
              />
            </div>
          ))}
          <div className="col-span-2 border-t border-slate-700 pt-3">
            <p className="text-xs text-slate-400 mb-3">Temperature profile (Â°C)</p>
            <div className="grid grid-cols-4 gap-3">
              {[["min_temp_c","Min"],["max_temp_c","Max"],["warning_low_c","Warn low"],["warning_high_c","Warn high"]].map(([k,label]) => (
                <div key={k}>
                  <label className="block text-xs text-slate-400 mb-1">{label}</label>
                  <input type="number" step="0.5"
                    value={(form as any)[k]}
                    onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))}
                    className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-1.5 text-sm text-white"
                  />
                </div>
              ))}
            </div>
          </div>
          <div className="col-span-2 flex gap-3">
            <button type="submit" className="bg-orange-500 hover:bg-orange-400 text-white px-4 py-2 rounded text-sm font-medium">Create</button>
            <button type="button" onClick={() => setCreating(false)} className="bg-slate-700 text-slate-300 px-4 py-2 rounded text-sm">Cancel</button>
          </div>
        </form>
      )}

      {loadError && (
        <div className="bg-red-900/30 border border-red-700 text-red-300 rounded p-3 mb-4 text-sm">
          {loadError} <button onClick={load} className="underline ml-2">Retry</button>
        </div>
      )}

      {loading ? (
        <p className="text-slate-400">Loadingâ€¦</p>
      ) : rows.length === 0 ? (
        <p className="text-slate-400">{loadError ? "Could not load shipments." : "No shipments yet. Create one to start."}</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-400 border-b border-slate-700">
              <th className="pb-2 pr-4">Ref</th>
              <th className="pb-2 pr-4">Carrier</th>
              <th className="pb-2 pr-4">Route</th>
              <th className="pb-2 pr-4">Product</th>
              <th className="pb-2 pr-4">Status</th>
              <th className="pb-2 pr-4">Compliance</th>
              <th className="pb-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(s => (
              <tr key={s.id} className="border-b border-slate-800 hover:bg-slate-800/50">
                <td className="py-2.5 pr-4 font-mono text-white">{s.shipment_ref}</td>
                <td className="py-2.5 pr-4 text-slate-300">{s.carrier}</td>
                <td className="py-2.5 pr-4 text-slate-300">{s.origin} â†’ {s.destination}</td>
                <td className="py-2.5 pr-4 text-slate-300">{s.product_category}</td>
                <td className="py-2.5 pr-4">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_BADGE[s.status] ?? "bg-slate-700 text-slate-300"}`}>
                    {s.status}
                  </span>
                </td>
                <td className="py-2.5 pr-4">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${BADGE[s.complianceStatus]}`}>
                    {s.complianceStatus}
                    {s.openExcursions > 0 && ` (${s.openExcursions})`}
                  </span>
                </td>
                <td className="py-2.5">
                  <Link href={`/coldchain/${s.id}`} className="text-orange-400 hover:text-orange-300 text-xs font-medium">
                    Open â†’
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
