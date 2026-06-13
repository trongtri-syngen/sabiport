"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Stats {
  trips: number;
  active_moves: number;
  recommended_moves: number;
  health: boolean | null;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({ trips: 0, active_moves: 0, recommended_moves: 0, health: null });

  useEffect(() => {
    async function load() {
      const [tripsRes, movesRes, healthRes] = await Promise.allSettled([
        fetch("/api/tms/trips").then((r) => r.json()),
        fetch("/api/wms/moves").then((r) => r.json()),
        fetch("/api/health").then((r) => r.json()),
      ]);

      const trips = tripsRes.status === "fulfilled" ? (tripsRes.value as unknown[]) : [];
      const moves = movesRes.status === "fulfilled" ? (movesRes.value as { status: string }[]) : [];
      const health = healthRes.status === "fulfilled" ? (healthRes.value as { healthy: boolean }) : null;

      setStats({
        trips: Array.isArray(trips) ? trips.length : 0,
        active_moves: Array.isArray(moves) ? moves.filter((m) => m.status === "ACTIVE").length : 0,
        recommended_moves: Array.isArray(moves) ? moves.filter((m) => m.status === "RECOMMENDED").length : 0,
        health: health?.healthy ?? null,
      });
    }
    load();
  }, []);

  const tiles = [
    { label: "Trips", value: stats.trips, href: "/tms", accent: true },
    { label: "Active Moves", value: stats.active_moves, href: "/wms", accent: false },
    { label: "Pending Recommendations", value: stats.recommended_moves, href: "/wms", accent: false },
    {
      label: "Health",
      value: stats.health === null ? "—" : stats.health ? "OK" : "DOWN",
      href: "/api/health",
      accent: false,
      healthStatus: stats.health,
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 700,
            color: "var(--brand-orange)",
            marginBottom: 6,
            letterSpacing: "-0.02em",
          }}
        >
          Sabiport
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: 15 }}>
          AI-assisted logistics analytics — TMS + WMS
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: 16,
          marginBottom: 40,
        }}
      >
        {tiles.map((t) => (
          <Link key={t.label} href={t.href} style={{ textDecoration: "none" }}>
            <div
              className="card"
              style={{ cursor: "pointer" }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,94,26,0.3)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = "";
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
                {t.label}
              </div>
              <div
                style={{
                  fontSize: 32,
                  fontWeight: 700,
                  color:
                    "healthStatus" in t
                      ? t.healthStatus === true
                        ? "var(--success)"
                        : t.healthStatus === false
                        ? "var(--danger)"
                        : "var(--text-muted)"
                      : t.accent
                      ? "var(--brand-orange)"
                      : "var(--text-primary)",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {t.value}
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        <Link href="/tms" style={{ textDecoration: "none" }}>
          <div className="card" style={{ cursor: "pointer" }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", marginBottom: 8 }}>
              Transport Management
            </div>
            <p style={{ color: "var(--text-secondary)", fontSize: 13, lineHeight: 1.6 }}>
              Build multi-client truck trips, allocate carrier cost by pallet/weight/LDM/CBM, analyse margin per client, and run the scenario simulator.
            </p>
          </div>
        </Link>
        <Link href="/wms" style={{ textDecoration: "none" }}>
          <div className="card" style={{ cursor: "pointer" }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", marginBottom: 8 }}>
              Warehouse Management
            </div>
            <p style={{ color: "var(--text-secondary)", fontSize: 13, lineHeight: 1.6 }}>
              Detect high-frequency articles in upper-level bins, recommend ground-floor moves, manage the RECOMMENDED → CONFIRMED → ACTIVE → RETURNED lifecycle with 14-day expiry.
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
}
