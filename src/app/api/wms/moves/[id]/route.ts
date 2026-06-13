import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { AdvanceMoveSchema } from "@/lib/wms/types";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const parsed = AdvanceMoveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const now = new Date().toISOString();
  let update: Record<string, string | null> = {};

  switch (parsed.data.action) {
    case "confirm":
      update = { status: "CONFIRMED", confirmed_at: now };
      break;
    case "activate": {
      const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
      update = { status: "ACTIVE", activated_at: now, expires_at: expiresAt };
      break;
    }
    case "record_pick":
      update = { last_pick_at: now };
      break;
    case "return":
      update = { status: "RETURNED", returned_at: now };
      break;
  }

  const { data, error } = await supabase
    .from("slotting_moves")
    .update(update)
    .eq("id", params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
