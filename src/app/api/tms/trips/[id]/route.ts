import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { computeTripResults, computeSimulator } from "@/lib/tms/calculations";
import { CreateTripSchema, MechanismSchema } from "@/lib/tms/types";
import type { Trip, Shipment } from "@/lib/tms/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { data: trip, error: tripErr } = await supabase
    .from("trips")
    .select("*")
    .eq("id", params.id)
    .single();

  if (tripErr) return NextResponse.json({ error: tripErr.message }, { status: 404 });

  const { data: shipments, error: shipErr } = await supabase
    .from("shipments")
    .select("*")
    .eq("trip_id", params.id)
    .order("created_at");

  if (shipErr) return NextResponse.json({ error: shipErr.message }, { status: 500 });

  const result = computeTripResults(trip as Trip, (shipments ?? []) as Shipment[]);

  const simulatorParam = req.nextUrl.searchParams.get("simulate");
  if (simulatorParam) {
    const parsed = MechanismSchema.safeParse(simulatorParam.toUpperCase());
    if (parsed.success) {
      const simResults = computeSimulator(trip as Trip, (shipments ?? []) as Shipment[], parsed.data);
      return NextResponse.json({ ...result, simulation: simResults });
    }
  }

  return NextResponse.json(result);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const parsed = CreateTripSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("trips")
    .update(parsed.data)
    .eq("id", params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await supabase.from("trips").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}
