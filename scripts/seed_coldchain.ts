import * as fs from "fs";
import * as path from "path";
import { createClient } from "@supabase/supabase-js";

const envPath = path.join(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
  }
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const sb = createClient(url, key);

const now = new Date();
const h = (n: number) => new Date(now.getTime() - n * 3_600_000).toISOString();

async function seed() {
  console.log("Seeding cold-chain shipments…");

  // Shipment 1 — IN_TRANSIT, compliant
  const { data: s1 } = await sb.from("cc_shipments").insert({
    shipment_ref: "CC-2026-001",
    carrier: "FrigoCargo ES",
    product_category: "PHARMA",
    vehicle_ref: "TRK-REF-7821",
    device_ref: "DL-SN-44201",
    calibration_due: "2026-12-31",
    status: "IN_TRANSIT",
    origin: "Madrid",
    destination: "Barcelona",
    planned_departure_ts: h(6),
    actual_departure_ts: h(5.5),
    planned_arrival_ts: h(-2),
  }).select().single();

  await sb.from("cc_temperature_profiles").insert({
    shipment_id: s1.id, min_temp_c: 2, max_temp_c: 8,
    warning_low_c: 3, warning_high_c: 7, monitoring_interval_sec: 300,
  });

  // Telemetry — all in range
  const readings1 = [5.1, 4.8, 5.3, 5.0, 4.9, 5.2, 5.1, 4.7];
  for (let i = 0; i < readings1.length; i++) {
    await sb.from("cc_telemetry").insert({
      shipment_id: s1.id, device_ref: "DL-SN-44201",
      reading_ts: h(5 - i * 0.5), temperature_c: readings1[i],
    });
  }
  console.log("  CC-2026-001 OK (compliant)");

  // Shipment 2 — IN_TRANSIT, OPEN excursion
  const { data: s2 } = await sb.from("cc_shipments").insert({
    shipment_ref: "CC-2026-002",
    carrier: "IceLine GmbH",
    product_category: "VACCINE",
    vehicle_ref: "TRK-REF-0045",
    device_ref: "DL-SN-88312",
    calibration_due: "2026-09-15",
    status: "IN_TRANSIT",
    origin: "Frankfurt",
    destination: "Amsterdam",
    planned_departure_ts: h(8),
    actual_departure_ts: h(7.8),
    planned_arrival_ts: h(-1),
  }).select().single();

  await sb.from("cc_temperature_profiles").insert({
    shipment_id: s2.id, min_temp_c: -20, max_temp_c: -15,
    warning_low_c: -19, warning_high_c: -16, monitoring_interval_sec: 300,
  });

  // Telemetry — breach at reading 5
  const readings2 = [-17.5, -17.2, -17.8, -16.9, -12.3, -11.8, -12.1];
  for (let i = 0; i < readings2.length; i++) {
    await sb.from("cc_telemetry").insert({
      shipment_id: s2.id, device_ref: "DL-SN-88312",
      reading_ts: h(7 - i * 0.5), temperature_c: readings2[i],
    });
  }

  // Open excursion
  const { data: ex2 } = await sb.from("cc_excursions").insert({
    shipment_id: s2.id, device_ref: "DL-SN-88312",
    excursion_type: "HIGH",
    breach_start_ts: h(7 - 4 * 0.5),
    peak_temp_c: -11.8,
    alert_sent: true, escalated: false, status: "OPEN",
  }).select().single();

  // One corrective action logged
  await sb.from("cc_corrective_actions").insert({
    excursion_id: ex2.id,
    action_ts: h(7 - 4 * 0.5 - 0.1),
    action_owner: "Driver K. Müller",
    action_type: "REEFER_ADJUST",
    description: "Adjusted reefer set-point to -18°C and checked door seal",
  });
  console.log("  CC-2026-002 OK (open excursion + corrective action)");

  // Shipment 3 — HOLD, escalated
  const { data: s3 } = await sb.from("cc_shipments").insert({
    shipment_ref: "CC-2026-003",
    carrier: "ArcticLine FR",
    product_category: "BLOOD_PRODUCTS",
    vehicle_ref: "TRK-REF-2290",
    device_ref: "DL-SN-19920",
    calibration_due: "2026-11-01",
    status: "HOLD",
    origin: "Lyon",
    destination: "Paris",
    planned_departure_ts: h(10),
    actual_departure_ts: h(9.5),
    planned_arrival_ts: h(-0.5),
  }).select().single();

  await sb.from("cc_temperature_profiles").insert({
    shipment_id: s3.id, min_temp_c: 2, max_temp_c: 6,
    warning_low_c: 3, warning_high_c: 5, monitoring_interval_sec: 300,
  });

  const readings3 = [4.1, 4.5, 4.3, 9.8, 10.2, 11.1, 10.9];
  for (let i = 0; i < readings3.length; i++) {
    await sb.from("cc_telemetry").insert({
      shipment_id: s3.id, device_ref: "DL-SN-19920",
      reading_ts: h(9 - i * 0.5), temperature_c: readings3[i],
    });
  }

  const { data: ex3 } = await sb.from("cc_excursions").insert({
    shipment_id: s3.id, device_ref: "DL-SN-19920",
    excursion_type: "HIGH",
    breach_start_ts: h(9 - 3 * 0.5),
    peak_temp_c: 11.1,
    alert_sent: true, escalated: true, status: "OPEN",
  }).select().single();

  await sb.from("cc_corrective_actions").insert({
    excursion_id: ex3.id,
    action_ts: h(9 - 3 * 0.5 - 0.05),
    action_owner: "Dispatcher M. Dupont",
    action_type: "STOP",
    description: "Halted vehicle at Lyon service area. QA team notified. Product under quarantine hold pending inspection.",
  });
  console.log("  CC-2026-003 OK (escalated excursion, HOLD)");

  console.log("\nCold-chain seed complete.");
}

seed().catch((e) => { console.error(e); process.exit(1); });
