# Sabiport Part 2 — Cold-Chain Compliance Spec

## What this builds

A cold-chain control tower bolted on to the existing TMS. Core loop: ingest temperature telemetry → detect a breach → open an excursion event → log corrective action. `@sys/groundskeeper` drives the escalation pass (open excursions aging > 1 h without a corrective action → escalated).

---

## Data model (5 new tables, `cc_` prefix)

| Table | Purpose |
|---|---|
| `cc_shipments` | One record per cold-chain load — carrier, vehicle, device, lifecycle status |
| `cc_temperature_profiles` | Required range + warning thresholds for the load |
| `cc_telemetry` | Continuous time-stamped sensor readings |
| `cc_excursions` | Deviation records — start/end, peak temp, alert flag, escalation flag |
| `cc_corrective_actions` | What was done, by whom, when, and what happened |

---

## Excursion loop (the core requirement)

```
POST /api/coldchain/telemetry
  → insert reading
  → fetch temperature_profile
  → if temp outside [min, max]:
      if no OPEN excursion exists → create excursion (alert_sent=true)
      if OPEN excursion exists  → update peak_temp_c if worse
  → if temp back in range and OPEN excursion exists:
      close excursion (breach_end_ts=now, status=UNDER_REVIEW)
  → return { reading, excursion_opened, excursion_closed }
```

---

## Groundskeeper usage

`POST /api/coldchain/escalate` runs the housekeeping pass:

```ts
agingDetector("excursion-escalation-1h", {
  rows: () => openExcursions.filter(e => !e.escalated),
  nowMs: Date.now(),
  thresholdDays: 1 / 24,          // 1 hour
  timestamp: (e) => e.breach_start_ts,
  subject: (e) => e.id,
  detail:  (e) => `shipment ${e.shipment_id} — open excursion > 1 h`,
})
```

Findings with `severity === "high"` → `UPDATE cc_excursions SET escalated = true`.

---

## API surface

| Method | Path | Description |
|---|---|---|
| GET | `/api/coldchain/shipments` | List with compliance status |
| POST | `/api/coldchain/shipments` | Create shipment + temperature profile |
| GET | `/api/coldchain/shipments/[id]` | Detail: profile + last 20 readings + open excursions |
| POST | `/api/coldchain/telemetry` | Ingest reading, auto-open/close excursion |
| POST | `/api/coldchain/excursions/[id]/actions` | Log corrective action, optionally close excursion |
| POST | `/api/coldchain/escalate` | Groundskeeper escalation pass |

---

## UI

- `/coldchain` — shipment list, compliance badge per row (IN_RANGE / EXCURSION / ESCALATED)
- `/coldchain/[id]` — control-tower detail:
  - Compliance card: required range vs current reading vs status
  - Telemetry feed: last 20 readings, colour-coded in/out of range
  - Excursion workbench: open events, corrective action form
  - Simulate panel: POST a temperature reading directly from the UI

---

## What's not in scope

- Real-time WebSocket push (polling on page load is fine)
- Map / GPS visualisation
- Full `Monitoring_Device` + `Vehicle_Equipment` master tables (fields inlined on `cc_shipments`)
- Auth / multi-tenant isolation
