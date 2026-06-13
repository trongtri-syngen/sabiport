-- Part 2: Cold-chain compliance tables

CREATE TABLE cc_shipments (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_ref         text NOT NULL UNIQUE,
  carrier              text NOT NULL,
  product_category     text NOT NULL DEFAULT 'PHARMA',
  vehicle_ref          text,
  device_ref           text,
  calibration_due      date,
  status               text NOT NULL DEFAULT 'PLANNED',
  origin               text NOT NULL,
  destination          text NOT NULL,
  planned_departure_ts timestamptz,
  actual_departure_ts  timestamptz,
  planned_arrival_ts   timestamptz,
  actual_arrival_ts    timestamptz,
  created_at           timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE cc_temperature_profiles (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id             uuid NOT NULL REFERENCES cc_shipments(id) ON DELETE CASCADE,
  min_temp_c              numeric(5,2) NOT NULL,
  max_temp_c              numeric(5,2) NOT NULL,
  warning_low_c           numeric(5,2),
  warning_high_c          numeric(5,2),
  monitoring_interval_sec integer NOT NULL DEFAULT 300
);

CREATE TABLE cc_telemetry (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id    uuid NOT NULL REFERENCES cc_shipments(id),
  device_ref     text,
  reading_ts     timestamptz NOT NULL DEFAULT now(),
  temperature_c  numeric(5,2) NOT NULL,
  location_lat   numeric(9,6),
  location_lon   numeric(9,6),
  ingest_ts      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE cc_excursions (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id      uuid NOT NULL REFERENCES cc_shipments(id),
  device_ref       text,
  excursion_type   text NOT NULL,
  breach_start_ts  timestamptz NOT NULL DEFAULT now(),
  breach_end_ts    timestamptz,
  peak_temp_c      numeric(5,2),
  alert_sent       boolean NOT NULL DEFAULT false,
  escalated        boolean NOT NULL DEFAULT false,
  status           text NOT NULL DEFAULT 'OPEN',
  root_cause       text
);

CREATE TABLE cc_corrective_actions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  excursion_id uuid NOT NULL REFERENCES cc_excursions(id),
  action_ts    timestamptz NOT NULL DEFAULT now(),
  action_owner text NOT NULL,
  action_type  text NOT NULL,
  description  text NOT NULL,
  outcome      text,
  closure_ts   timestamptz
);

CREATE INDEX ON cc_telemetry (shipment_id, reading_ts DESC);
CREATE INDEX ON cc_excursions (shipment_id, status);

ALTER TABLE cc_shipments           DISABLE ROW LEVEL SECURITY;
ALTER TABLE cc_temperature_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE cc_telemetry           DISABLE ROW LEVEL SECURITY;
ALTER TABLE cc_excursions          DISABLE ROW LEVEL SECURITY;
ALTER TABLE cc_corrective_actions  DISABLE ROW LEVEL SECURITY;
