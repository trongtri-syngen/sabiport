# Sabiport — SPEC

**Author:** Trong Tri  
**Stack:** Next.js 14 (App Router) · TypeScript · Tailwind CSS · Supabase (Postgres) · Vercel  
**Sys packages:** `@sys/groundskeeper`, `@sys/warp`, `@sys/sentinel`

---

## Data model

### TMS

**`trips`**
| column | type | notes |
|---|---|---|
| id | uuid PK | gen_random_uuid() |
| name | text | e.g. "Madrid → Barcelona" |
| origin | text | |
| destination | text | |
| truck_cost | numeric(10,2) | total carrier cost, EUR |
| created_at | timestamptz | |

**`shipments`**
| column | type | notes |
|---|---|---|
| id | uuid PK | |
| trip_id | uuid FK → trips.id | CASCADE DELETE |
| client_name | text | |
| pallets | integer | |
| weight_kg | numeric(10,2) | |
| height_m | numeric(5,3) | pallet stack height, default 1.8 |
| charging_mechanism | text | PALLET \| WEIGHT \| LDM \| CBM |
| created_at | timestamptz | |

*Derived at query time (never stored):*
- `ldm = pallets × 0.4`
- `cbm = 1.2 × 0.8 × height_m × pallets`
- `cost_per_pallet = truck_cost / SUM(pallets)`
- `cost_allocation = pallets × cost_per_pallet`
- `client_charge` — applied from rate card by charging_mechanism
- `margin = (client_charge / cost_allocation) − 1`

**Rate card (fixed):** 45 EUR/pallet · 0.20 EUR/kg · 35 EUR/CBM · 85 EUR/LDM

### WMS

**`articles`** — from `Data file warehouse.xlsx` Sheet 1
| column | type |
|---|---|
| prtnum | text PK |
| lngdsc | text |
| untqty | integer |
| uomcod | text |

**`locations`** — from `Data file warehouse.xlsx` Sheet 2
| column | type |
|---|---|
| stoloc | text PK |
| arecod | text |
| locsts | text |
| loccod | text |
| pck_zone_cod | text |
| sto_zone_cod | text |
| is_ground_floor | boolean | derived: stoloc starts with '7' or pck_zone_cod = 'PZ-CSPCK' |

**`inventory`** — from `Data file warehouse.xlsx` Sheet 3 (subset)
| column | type |
|---|---|
| id | serial PK |
| dtlnum | text |
| stoloc | text FK → locations |
| prtnum | text FK → articles |
| untqty | integer |
| untcas | integer |

**`slotting_moves`**
| column | type | notes |
|---|---|---|
| id | uuid PK | |
| prtnum | text | |
| from_stoloc | text | current location |
| to_stoloc | text | target ground-floor location |
| status | text | RECOMMENDED \| CONFIRMED \| ACTIVE \| RETURNED |
| recommended_at | timestamptz | |
| confirmed_at | timestamptz | nullable |
| activated_at | timestamptz | nullable |
| last_pick_at | timestamptz | nullable — updated on each pick event |
| returned_at | timestamptz | nullable |
| expires_at | timestamptz | activated_at + 14 days |

---

## Screens

| Route | What |
|---|---|
| `/` | Dashboard: trip count, active moves, health status |
| `/tms` | Trip list + create trip |
| `/tms/[tripId]` | Shipment table, margin analysis, scenario simulator |
| `/wms` | Slotting candidates + move lifecycle |

---

## API routes

| Method + Path | Action |
|---|---|
| GET `/api/health` | Sentinel health probe (Supabase + config) |
| GET `/api/tms/trips` | List trips |
| POST `/api/tms/trips` | Create trip |
| GET `/api/tms/trips/[id]` | Trip + shipments + computed margins |
| PATCH `/api/tms/trips/[id]` | Update trip |
| DELETE `/api/tms/trips/[id]` | Delete trip |
| POST `/api/tms/trips/[id]/shipments` | Add shipment |
| DELETE `/api/tms/trips/[id]/shipments/[sid]` | Remove shipment |
| GET `/api/wms/candidates` | Articles in high-level locations (slotting candidates) |
| GET `/api/wms/moves` | All slotting moves |
| POST `/api/wms/moves` | Create RECOMMENDED move |
| PATCH `/api/wms/moves/[id]` | Advance lifecycle (CONFIRMED → ACTIVE → RETURNED) |
| POST `/api/wms/expiry` | Run groundskeeper expiry scan |

---

## Business rules

### TMS
1. Cost allocation is always pallet-proportional (total truck cost ÷ total pallets × client pallets)
2. Client charge is based on their chosen charging mechanism and the fixed rate card
3. Optimal mechanism = mechanism yielding highest charge for that client
4. Margin = (charge / cost_allocation) − 1
5. Simulator re-computes all margins with a uniform override mechanism

### WMS
1. Slotting candidate = article with inventory in a non-ground-floor location
2. Lifecycle: RECOMMENDED → CONFIRMED → ACTIVE → RETURNED
3. `expires_at = activated_at + 14 days` (set when status → ACTIVE)
4. `@sys/groundskeeper` expiryDetector fires when `now > expires_at` → status RETURNED
5. `@sys/warp` referentialCheck validates inventory.stoloc → locations and inventory.prtnum → articles
6. `@sys/sentinel` backs `/api/health` with Supabase env probe

---

## What works / what doesn't (to be filled in after build)

**Works:**
- TMS: full trip + shipment CRUD, correct cost/margin calc, scenario simulator
- WMS: slotting candidates, full RECOMMENDED→CONFIRMED→ACTIVE→RETURNED lifecycle, groundskeeper expiry
- `/api/health` with sentinel
- Dark Sabiport design system (tokens.css)
- Deployed to Vercel, reads/writes Supabase

**Not done / known gaps:**
- AI rationale layer (stretch goal — not reached)
- UBL XML order import (stretch goal)
- CSV/XLSX export
- Pick event history (last_pick_at is manual)
