import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json();
  const { action_owner, action_type, description, outcome, close } = body;

  if (!action_owner || !action_type || !description) {
    return NextResponse.json({ error: "action_owner, action_type, description required" }, { status: 400 });
  }

  const now = new Date().toISOString();

  const { data: action, error } = await supabase
    .from("cc_corrective_actions")
    .insert({
      excursion_id: params.id,
      action_ts: now,
      action_owner,
      action_type,
      description,
      outcome: outcome ?? null,
      closure_ts: close ? now : null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (close) {
    await supabase
      .from("cc_excursions")
      .update({ status: "CLOSED", breach_end_ts: now })
      .eq("id", params.id)
      .eq("status", "OPEN");
  }

  return NextResponse.json(action, { status: 201 });
}
