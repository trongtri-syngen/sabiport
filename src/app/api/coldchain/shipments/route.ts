import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  const { data: shipments, error } = await supabase
    .from("cc_shipments")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Attach open excursion count for compliance badge
  const ids = (shipments ?? []).map((s: any) => s.id);
  const { data: excursions } = await supabase
    .from("cc_excursions")
    .select("shipment_id, escalated")
    .in("shipment_id", ids.length ? ids : ["none"])
    .eq("status", "OPEN");

  const openByShipment: Record<string, { count: number; escalated: boolean }> = {};
  for (const e of excursions ?? []) {
    if (!openByShipment[e.shipment_id]) {
      openByShipment[e.shipment_id] = { count: 0, escalated: false };
    }
    openByShipment[e.shipment_id].count += 1;
    if (e.escalated) openByShipment[e.shipment_id].escalated = true;
  }

  const result = (shipments ?? []).map((s: any) => {
    const ex = openByShipment[s.id];
    const complianceStatus = ex?.escalated
      ? "ESCALATED"
      : ex?.count
      ? "EXCURSION"
      : "IN_RANGE";
    return { ...s, complianceStatus, openExcursions: ex?.count ?? 0 };
  });

  return NextResponse.json(result);
}

export async function POST(req: Request) {
  const body = await req.json();
  const {
    shipment_ref, carrier, product_category = "PHARMA",
    vehicle_ref, device_ref, calibration_due,
    origin, destination,
    planned_departure_ts, planned_arrival_ts,
    min_temp_c, max_temp_c, warning_low_c, warning_high_c,
    monitoring_interval_sec = 300,
  } = body;

  if (!shipment_ref || !carrier || !origin || !destination || min_temp_c == null || max_temp_c == null) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const { data: shipment, error: sErr } = await supabase
    .from("cc_shipments")
    .insert({
      shipment_ref, carrier, product_category,
      vehicle_ref, device_ref, calibration_due,
      origin, destination,
      planned_departure_ts, planned_arrival_ts,
      status: "PLANNED",
    })
    .select()
    .single();

  if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 });

  const { error: pErr } = await supabase.from("cc_temperature_profiles").insert({
    shipment_id: shipment.id,
    min_temp_c, max_temp_c, warning_low_c, warning_high_c,
    monitoring_interval_sec,
  });

  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 });

  return NextResponse.json(shipment, { status: 201 });
}
