"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Trip } from "@/lib/tms/types";

interface TripForm {
  name: string;
  origin: string;
  destination: string;
  truck_cost: string;
}

const EMPTY_FORM: TripForm = { name: "", origin: "", destination: "", truck_cost: "" };

export default function TmsPage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<TripForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/tms/trips");
    const data = await res.json();
    if (Array.isArray(data)) setTrips(data);
  }

  useEffect(() => { load(); }, []);

  async function createTrip(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/tms/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          origin: form.origin || undefined,
          destination: form.destination || undefined,
          truck_cost: parseFloat(form.truck_cost),
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error?.formErrors?.join(", ") ?? "Error creating trip");
      } else {
        setForm(EMPTY_FORM);
        setShowForm(false);
        await load();
      }
    } finally {
      setSaving(false);
    }
  }

  async function deleteTrip(id: string) {
    if (!confirm("Delete this trip and all its shipments?")) return;
    await fetch(`/api/tms/trips/${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)" }}>Trips</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 13, marginTop: 2 }}>
            Freight cost allocation and margin analysis
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
          + New Trip
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>New Trip</h2>
          {error && (
            <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, padding: "8px 12px", color: "var(--danger)", fontSize: 13, marginBottom: 12 }}>
              {error}
            </div>
          )}
          <form onSubmit={createTrip}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div>
                <label className="label">Trip Name *</label>
                <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Madrid → Barcelona" required />
              </div>
              <div>
                <label className="label">Truck Cost (EUR) *</label>
                <input className="input" type="number" step="0.01" value={form.truck_cost} onChange={(e) => setForm({ ...form, truck_cost: e.target.value })} placeholder="975.00" required />
              </div>
              <div>
                <label className="label">Origin</label>
                <input className="input" value={form.origin} onChange={(e) => setForm({ ...form, origin: e.target.value })} placeholder="Madrid" />
              </div>
              <div>
                <label className="label">Destination</label>
                <input className="input" value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} placeholder="Barcelona" />
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? "Saving..." : "Create Trip"}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => { setShowForm(false); setError(null); }}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {trips.length === 0 && !showForm ? (
        <div className="card" style={{ textAlign: "center", padding: 48 }}>
          <p style={{ color: "var(--text-muted)", marginBottom: 16 }}>No trips yet.</p>
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>Create your first trip</button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {trips.map((trip) => (
            <div
              key={trip.id}
              className="card"
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px" }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{trip.name}</span>
                  {trip.origin && trip.destination && (
                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                      {trip.origin} → {trip.destination}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 2 }}>
                  Carrier cost:{" "}
                  <span className="number-orange">€{Number(trip.truck_cost).toFixed(2)}</span>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <Link href={`/tms/${trip.id}`} className="btn btn-ghost" style={{ textDecoration: "none", fontSize: 13 }}>
                  Open →
                </Link>
                <button className="btn btn-danger" style={{ fontSize: 13 }} onClick={() => deleteTrip(trip.id)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
