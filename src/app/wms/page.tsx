"use client";

import { useEffect, useState } from "react";
import type { SlottingCandidate, SlottingMove } from "@/lib/wms/types";

function StatusBadge({ status }: { status: string }) {
  const cls = {
    RECOMMENDED: "badge-recommended",
    CONFIRMED: "badge-confirmed",
    ACTIVE: "badge-active",
    RETURNED: "badge-returned",
  }[status] ?? "badge-recommended";
  return <span className={`badge ${cls}`}>{status}</span>;
}

export default function WmsPage() {
  const [candidates, setCandidates] = useState<SlottingCandidate[]>([]);
  const [moves, setMoves] = useState<(SlottingMove & { articles?: { lngdsc: string } })[]>([]);
  const [expiryResult, setExpiryResult] = useState<{ expired_count: number; alert: boolean } | null>(null);
  const [runningExpiry, setRunningExpiry] = useState(false);
  const [recommendingId, setRecommendingId] = useState<string | null>(null);

  async function loadCandidates() {
    const res = await fetch("/api/wms/candidates");
    const data = await res.json();
    if (Array.isArray(data)) setCandidates(data);
  }

  async function loadMoves() {
    const res = await fetch("/api/wms/moves");
    const data = await res.json();
    if (Array.isArray(data)) setMoves(data);
  }

  useEffect(() => {
    loadCandidates();
    loadMoves();
  }, []);

  async function recommendMove(candidate: SlottingCandidate) {
    setRecommendingId(candidate.prtnum);
    try {
      await fetch("/api/wms/moves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prtnum: candidate.prtnum,
          from_stoloc: candidate.stoloc,
          to_stoloc: "701001A",
        }),
      });
      await Promise.all([loadCandidates(), loadMoves()]);
    } finally {
      setRecommendingId(null);
    }
  }

  async function advanceMove(id: string, action: string) {
    await fetch(`/api/wms/moves/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    await loadMoves();
  }

  async function runExpiry() {
    setRunningExpiry(true);
    try {
      const res = await fetch("/api/wms/expiry", { method: "POST" });
      const data = await res.json();
      setExpiryResult(data);
      await loadMoves();
    } finally {
      setRunningExpiry(false);
    }
  }

  const openMoves = moves.filter((m) => m.status !== "RETURNED");
  const returnedMoves = moves.filter((m) => m.status === "RETURNED");

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)" }}>
            Warehouse — Bin Slotting
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 13, marginTop: 2 }}>
            Autonomous ground-floor slotting with 14-day inactivity expiry
          </p>
        </div>
        <button
          className="btn btn-ghost"
          onClick={runExpiry}
          disabled={runningExpiry}
        >
          {runningExpiry ? "Running…" : "Run Expiry Check"}
        </button>
      </div>

      {expiryResult && (
        <div style={{
          background: expiryResult.expired_count > 0 ? "rgba(245,158,11,0.1)" : "rgba(34,197,94,0.1)",
          border: `1px solid ${expiryResult.expired_count > 0 ? "rgba(245,158,11,0.3)" : "rgba(34,197,94,0.3)"}`,
          borderRadius: 8,
          padding: "10px 14px",
          fontSize: 13,
          color: expiryResult.expired_count > 0 ? "var(--warning)" : "var(--success)",
          marginBottom: 20,
        }}>
          Expiry check: {expiryResult.expired_count === 0
            ? "No expired moves."
            : `${expiryResult.expired_count} move(s) returned to stock.`}
        </div>
      )}

      {/* Slotting candidates */}
      <div className="card" style={{ padding: 0, marginBottom: 24 }}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)" }}>
          <h2 style={{ fontSize: 15, fontWeight: 600 }}>Slotting Candidates</h2>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
            Articles in non-ground-floor locations eligible for a move to 701001A
          </p>
        </div>
        {candidates.length === 0 ? (
          <div style={{ padding: 32, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
            No candidates. Run the seed script to load warehouse data.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="table-base">
              <thead>
                <tr>
                  <th>Part No.</th>
                  <th>Description</th>
                  <th>Location</th>
                  <th>Area</th>
                  <th style={{ textAlign: "right" }}>Qty on Hand</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {candidates.slice(0, 50).map((c) => (
                  <tr key={`${c.prtnum}-${c.stoloc}`}>
                    <td style={{ fontFamily: "monospace", color: "var(--brand-orange)", fontSize: 12 }}>{c.prtnum}</td>
                    <td style={{ maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {c.lngdsc ?? "—"}
                    </td>
                    <td style={{ fontFamily: "monospace", fontSize: 12 }}>{c.stoloc}</td>
                    <td style={{ fontSize: 12, color: "var(--text-muted)" }}>{c.arecod ?? "—"}</td>
                    <td style={{ textAlign: "right" }} className="number">{c.untqty.toLocaleString()}</td>
                    <td>
                      {c.has_open_move ? (
                        <span style={{ fontSize: 11, color: "var(--warning)", fontWeight: 600 }}>MOVE OPEN</span>
                      ) : (
                        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>—</span>
                      )}
                    </td>
                    <td>
                      {!c.has_open_move && (
                        <button
                          className="btn btn-primary"
                          style={{ fontSize: 11, padding: "4px 10px" }}
                          disabled={recommendingId === c.prtnum}
                          onClick={() => recommendMove(c)}
                        >
                          {recommendingId === c.prtnum ? "…" : "Recommend"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Active moves */}
      <div className="card" style={{ padding: 0, marginBottom: 24 }}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)" }}>
          <h2 style={{ fontSize: 15, fontWeight: 600 }}>Active Moves</h2>
        </div>
        {openMoves.length === 0 ? (
          <div style={{ padding: 24, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
            No open moves.
          </div>
        ) : (
          <table className="table-base">
            <thead>
              <tr>
                <th>Part No.</th>
                <th>Description</th>
                <th>From → To</th>
                <th>Status</th>
                <th>Expires</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {openMoves.map((m) => (
                <tr key={m.id}>
                  <td style={{ fontFamily: "monospace", color: "var(--brand-orange)", fontSize: 12 }}>{m.prtnum}</td>
                  <td style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 12 }}>
                    {m.articles?.lngdsc ?? "—"}
                  </td>
                  <td style={{ fontFamily: "monospace", fontSize: 12, color: "var(--text-muted)" }}>
                    {m.from_stoloc ?? "?"} → {m.to_stoloc}
                  </td>
                  <td><StatusBadge status={m.status} /></td>
                  <td style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    {m.expires_at ? new Date(m.expires_at).toLocaleDateString() : "—"}
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 6 }}>
                      {m.status === "RECOMMENDED" && (
                        <button
                          className="btn btn-ghost"
                          style={{ fontSize: 11, padding: "3px 8px" }}
                          onClick={() => advanceMove(m.id, "confirm")}
                        >
                          Confirm
                        </button>
                      )}
                      {m.status === "CONFIRMED" && (
                        <button
                          className="btn btn-primary"
                          style={{ fontSize: 11, padding: "3px 8px" }}
                          onClick={() => advanceMove(m.id, "activate")}
                        >
                          Activate
                        </button>
                      )}
                      {m.status === "ACTIVE" && (
                        <>
                          <button
                            className="btn btn-ghost"
                            style={{ fontSize: 11, padding: "3px 8px" }}
                            onClick={() => advanceMove(m.id, "record_pick")}
                          >
                            Record Pick
                          </button>
                          <button
                            className="btn btn-danger"
                            style={{ fontSize: 11, padding: "3px 8px" }}
                            onClick={() => advanceMove(m.id, "return")}
                          >
                            Return
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Returned moves */}
      {returnedMoves.length > 0 && (
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)" }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: "var(--text-muted)" }}>Returned</h2>
          </div>
          <table className="table-base">
            <thead>
              <tr>
                <th>Part No.</th>
                <th>Description</th>
                <th>From → To</th>
                <th>Returned</th>
              </tr>
            </thead>
            <tbody>
              {returnedMoves.map((m) => (
                <tr key={m.id} style={{ opacity: 0.6 }}>
                  <td style={{ fontFamily: "monospace", fontSize: 12 }}>{m.prtnum}</td>
                  <td style={{ fontSize: 12 }}>{m.articles?.lngdsc ?? "—"}</td>
                  <td style={{ fontFamily: "monospace", fontSize: 12, color: "var(--text-muted)" }}>
                    {m.from_stoloc ?? "?"} → {m.to_stoloc}
                  </td>
                  <td style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    {m.returned_at ? new Date(m.returned_at).toLocaleDateString() : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
