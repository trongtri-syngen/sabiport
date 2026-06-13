import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { CreateMoveSchema } from "@/lib/wms/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const { data, error } = await supabase
    .from("slotting_moves")
    .select("*, articles(lngdsc)")
    .order("recommended_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = CreateMoveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("slotting_moves")
    .insert({
      prtnum: parsed.data.prtnum,
      from_stoloc: parsed.data.from_stoloc ?? null,
      to_stoloc: parsed.data.to_stoloc,
      status: "RECOMMENDED",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
