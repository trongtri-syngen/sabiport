import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const { id } = params;

  const [{ data: shipment, error: sErr }, { data: profile }, { data: telemetry }, { data: excursions }] =
    await Promise.all([
      supabase.from("cc_shipments").select("*").eq("id", id).single(),
      supabase.from("cc_temperature_profiles").select("*").eq("shipment_id", id).single(),
      supabase
        .from("cc_telemetry")
        .select("*")
        .eq("shipment_id", id)
        .order("reading_ts", { ascending: false })
        .limit(20),
      supabase
        .from("cc_excursions")
        .select("*, cc_corrective_actions(*)")
        .eq("shipment_id", id)
        .order("breach_start_ts", { ascending: false }),
    ]);

  if (sErr) return NextResponse.json({ error: sErr.message }, { status: 404 });

  const latest = telemetry?.[0] ?? null;
  const openExcursion = (excursions ?? []).find((e: any) => e.status === "OPEN") ?? null;
  const complianceStatus = openExcursion?.escalated
    ? "ESCALATED"
    : openExcursion
    ? "EXCURSION"
    : "IN_RANGE";

  return NextResponse.json({
    shipment,
    profile,
    telemetry: telemetry ?? [],
    excursions: excursions ?? [],
    latest,
    complianceStatus,
  });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json();
  const { data, error } = await supabase
    .from("cc_shipments")
    .update(body)
    .eq("id", params.id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
