import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json();
  const { shipment_id, temperature_c, device_ref, location_lat, location_lon } = body;

  if (!shipment_id || temperature_c == null) {
    return NextResponse.json({ error: "shipment_id and temperature_c required" }, { status: 400 });
  }

  // Insert reading
  const { data: reading, error: rErr } = await supabase
    .from("cc_telemetry")
    .insert({ shipment_id, temperature_c, device_ref, location_lat, location_lon })
    .select()
    .single();

  if (rErr) return NextResponse.json({ error: rErr.message }, { status: 500 });

  // Fetch temperature profile
  const { data: profile } = await supabase
    .from("cc_temperature_profiles")
    .select("*")
    .eq("shipment_id", shipment_id)
    .single();

  if (!profile) return NextResponse.json({ reading, excursion_opened: false, excursion_closed: false });

  const temp = Number(temperature_c);
  const isBreaching = temp < Number(profile.min_temp_c) || temp > Number(profile.max_temp_c);
  const excursionType = temp < Number(profile.min_temp_c) ? "LOW" : "HIGH";

  // Fetch existing OPEN excursion
  const { data: openExcursions } = await supabase
    .from("cc_excursions")
    .select("*")
    .eq("shipment_id", shipment_id)
    .eq("status", "OPEN")
    .limit(1);

  const openExcursion = openExcursions?.[0] ?? null;

  let excursion_opened = false;
  let excursion_closed = false;
  let excursion = null;

  if (isBreaching) {
    if (!openExcursion) {
      // Open new excursion
      const { data: ex } = await supabase
        .from("cc_excursions")
        .insert({
          shipment_id,
          device_ref,
          excursion_type: excursionType,
          breach_start_ts: reading.reading_ts,
          peak_temp_c: temp,
          alert_sent: true,
          status: "OPEN",
        })
        .select()
        .single();
      excursion = ex;
      excursion_opened = true;
    } else {
      // Update peak if worse
      const existingPeak = Number(openExcursion.peak_temp_c ?? temp);
      const newPeak =
        excursionType === "HIGH"
          ? Math.max(existingPeak, temp)
          : Math.min(existingPeak, temp);
      if (newPeak !== existingPeak) {
        await supabase
          .from("cc_excursions")
          .update({ peak_temp_c: newPeak })
          .eq("id", openExcursion.id);
      }
      excursion = openExcursion;
    }
  } else if (openExcursion) {
    // Back in range — close excursion
    await supabase
      .from("cc_excursions")
      .update({ breach_end_ts: reading.reading_ts, status: "UNDER_REVIEW" })
      .eq("id", openExcursion.id);
    excursion_closed = true;
    excursion = { ...openExcursion, status: "UNDER_REVIEW" };
  }

  return NextResponse.json({ reading, excursion_opened, excursion_closed, excursion });
}
