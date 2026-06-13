import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { CreateShipmentSchema } from "@/lib/tms/types";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const parsed = CreateShipmentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("shipments")
    .insert({ ...parsed.data, trip_id: params.id })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const sid = req.nextUrl.searchParams.get("shipment_id");
  if (!sid) return NextResponse.json({ error: "shipment_id required" }, { status: 400 });

  const { error } = await supabase
    .from("shipments")
    .delete()
    .eq("id", sid)
    .eq("trip_id", params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}
