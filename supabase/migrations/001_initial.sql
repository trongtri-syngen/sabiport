-- ============================================================
-- Sabiport — initial schema
-- ============================================================

-- TMS: trips ------------------------------------------------
CREATE TABLE IF NOT EXISTS trips (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text        NOT NULL,
  origin      text,
  destination text,
  truck_cost  numeric(10,2) NOT NULL CHECK (truck_cost > 0),
  created_at  timestamptz DEFAULT now()
);

-- TMS: shipments --------------------------------------------
CREATE TABLE IF NOT EXISTS shipments (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id             uuid        NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  client_name         text        NOT NULL,
  pallets             integer     NOT NULL CHECK (pallets > 0),
  weight_kg           numeric(10,2) NOT NULL CHECK (weight_kg > 0),
  height_m            numeric(5,3) NOT NULL DEFAULT 1.8 CHECK (height_m > 0),
  charging_mechanism  text        NOT NULL CHECK (charging_mechanism IN ('PALLET','WEIGHT','LDM','CBM')),
  created_at          timestamptz DEFAULT now()
);

-- WMS: articles ---------------------------------------------
CREATE TABLE IF NOT EXISTS articles (
  prtnum  text    PRIMARY KEY,
  lngdsc  text,
  untqty  integer,
  uomcod  text
);

-- WMS: locations --------------------------------------------
CREATE TABLE IF NOT EXISTS locations (
  stoloc        text    PRIMARY KEY,
  arecod        text,
  locsts        text,
  loccod        text,
  pck_zone_cod  text,
  sto_zone_cod  text,
  is_ground_floor boolean NOT NULL DEFAULT false
);

-- WMS: inventory --------------------------------------------
CREATE TABLE IF NOT EXISTS inventory (
  id      serial  PRIMARY KEY,
  dtlnum  text,
  stoloc  text    REFERENCES locations(stoloc),
  prtnum  text    REFERENCES articles(prtnum),
  untqty  integer,
  untcas  integer
);

-- WMS: slotting_moves ---------------------------------------
CREATE TABLE IF NOT EXISTS slotting_moves (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  prtnum          text        NOT NULL,
  from_stoloc     text,
  to_stoloc       text        NOT NULL,
  status          text        NOT NULL DEFAULT 'RECOMMENDED'
                              CHECK (status IN ('RECOMMENDED','CONFIRMED','ACTIVE','RETURNED')),
  recommended_at  timestamptz NOT NULL DEFAULT now(),
  confirmed_at    timestamptz,
  activated_at    timestamptz,
  last_pick_at    timestamptz,
  returned_at     timestamptz,
  expires_at      timestamptz
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_shipments_trip ON shipments(trip_id);
CREATE INDEX IF NOT EXISTS idx_inventory_stoloc ON inventory(stoloc);
CREATE INDEX IF NOT EXISTS idx_inventory_prtnum ON inventory(prtnum);
CREATE INDEX IF NOT EXISTS idx_moves_status ON slotting_moves(status);
CREATE INDEX IF NOT EXISTS idx_moves_prtnum ON slotting_moves(prtnum);
