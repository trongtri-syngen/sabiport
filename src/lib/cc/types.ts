export type ShipmentStatus = "PLANNED" | "IN_TRANSIT" | "DELIVERED" | "HOLD";
export type ExcursionStatus = "OPEN" | "UNDER_REVIEW" | "CLOSED";
export type ExcursionType = "HIGH" | "LOW";
export type ActionType =
  | "REEFER_ADJUST"
  | "DRIVER_ALERT"
  | "STOP"
  | "ESCALATE"
  | "QUARANTINE";

export interface CcShipment {
  id: string;
  shipment_ref: string;
  carrier: string;
  product_category: string;
  vehicle_ref: string | null;
  device_ref: string | null;
  calibration_due: string | null;
  status: ShipmentStatus;
  origin: string;
  destination: string;
  planned_departure_ts: string | null;
  actual_departure_ts: string | null;
  planned_arrival_ts: string | null;
  actual_arrival_ts: string | null;
  created_at: string;
}

export interface CcTemperatureProfile {
  id: string;
  shipment_id: string;
  min_temp_c: number;
  max_temp_c: number;
  warning_low_c: number | null;
  warning_high_c: number | null;
  monitoring_interval_sec: number;
}

export interface CcTelemetry {
  id: string;
  shipment_id: string;
  device_ref: string | null;
  reading_ts: string;
  temperature_c: number;
  location_lat: number | null;
  location_lon: number | null;
  ingest_ts: string;
}

export interface CcExcursion {
  id: string;
  shipment_id: string;
  device_ref: string | null;
  excursion_type: ExcursionType;
  breach_start_ts: string;
  breach_end_ts: string | null;
  peak_temp_c: number | null;
  alert_sent: boolean;
  escalated: boolean;
  status: ExcursionStatus;
  root_cause: string | null;
}

export interface CcCorrectiveAction {
  id: string;
  excursion_id: string;
  action_ts: string;
  action_owner: string;
  action_type: ActionType;
  description: string;
  outcome: string | null;
  closure_ts: string | null;
}
