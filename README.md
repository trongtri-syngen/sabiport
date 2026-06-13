# Sabiport — Trong Tri

**Live URL:** https://trong-tri.vercel.app  
**GitHub repo:** https://github.com/trongtri-syngen/sabiport

---

## What it does

A full-stack logistics analytics app with two modules:

### TMS — Freight Cost Allocation & Margin
- Create truck trips with a carrier cost
- Add client shipments (pallets, weight, height, charging mechanism: PALLET / WEIGHT / LDM / CBM)
- Cost is allocated proportionally by pallet count; client is charged by their chosen mechanism at a fixed rate card (€45/plt · €0.20/kg · €85/LDM · €35/CBM)
- Margin table shows cost allocation, client charge, margin, and the optimal mechanism + delta
- **Scenario simulator** — re-run all margins with a uniform mechanism to compare

### WMS — Autonomous Bin Slotting
- Shows articles with inventory in non-ground-floor locations (slotting candidates)
- One-click to create a `RECOMMENDED` move to 701001A
- Full lifecycle: `RECOMMENDED → CONFIRMED → ACTIVE → RETURNED`
- **14-day inactivity expiry** powered by `@sys/groundskeeper` — run the expiry check to auto-return stale ACTIVE moves

### Health
- `GET /api/health` — `@sys/sentinel` probes Supabase env vars; returns `{ healthy, report }`
- `GET /api/warp` — `@sys/warp` referential checks on inventory→locations and inventory→articles

---

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS + Sabiport `tokens.css` (dark navy, orange accents) |
| Database | Supabase (PostgreSQL) |
| Deploy | Vercel |
| Sys packages | `@sys/groundskeeper`, `@sys/warp`, `@sys/sentinel` (vendored) |

---

## Sys packages used

| Package | Vendored tarball | Used for |
|---|---|---|
| `@sys/groundskeeper` | `vendor/sys-groundskeeper-0.0.1.tgz` | WMS 14-day inactivity expiry — `expiryDetector` in `/api/wms/expiry` |
| `@sys/warp` | `vendor/sys-warp-0.0.1.tgz` | Schema cross-check — `referentialCheck` validates inventory FK integrity at `/api/warp` |
| `@sys/sentinel` | `vendor/sys-sentinel-0.0.1.tgz` | Health probe — `configProbe` checks Supabase env vars at `/api/health` |

---

## How to run locally

```bash
# 1. Install
npm install

# 2. Create .env from example and fill in Supabase credentials
cp .env.example .env

# 3. Apply migration to your Supabase project (via Supabase dashboard SQL editor or CLI)
#    File: supabase/migrations/001_initial.sql

# 4. Seed sample data
npm run seed

# 5. Start dev server
npm run dev
# → http://localhost:3000
```

---

## What works / what doesn't

**Works:**
- [x] TMS: full trip + shipment CRUD, correct cost/margin calculations verified against requirements data
- [x] TMS: scenario simulator (uniform mechanism override)
- [x] WMS: slotting candidates from non-ground-floor inventory
- [x] WMS: full lifecycle RECOMMENDED → CONFIRMED → ACTIVE → RETURNED
- [x] WMS: 14-day inactivity expiry via `@sys/groundskeeper`
- [x] `/api/health` backed by `@sys/sentinel`
- [x] `/api/warp` referential integrity check via `@sys/warp`
- [x] Sabiport design system (dark navy, orange accents, Inter)
- [x] Deployed to Vercel against Supabase

**Not done / known gaps:**
- [ ] AI rationale layer (stretch — not reached in time)
- [ ] UBL 2.0 XML order import
- [ ] CSV/XLSX data export
- [ ] Full warehouse data loaded (seed loads 10 articles + locations; full 33k article import not implemented)

---

## Numbers I verified

From the requirements (`Transport data.xlsx`):

| Client | Pallets | Truck cost share | My app output |
|---|---|---|---|
| Acer   | 6/31 | €188.71 | ✓ |
| Samsung| 8/31 | €251.61 | ✓ |
| Panasonic | 3/31 | €94.35 | ✓ |
| HP     | 7/31 | €220.16 | ✓ |
| Sony   | 4/31 | €125.81 | ✓ |
| LG     | 3/31 | €94.35  | ✓ |

CBM for Acer (6 pallets, 1.8m height): 1.2 × 0.8 × 1.8 × 6 = **10.368 m³** ✓

---

## Lessons

_(Fill in after Monday demo)_
