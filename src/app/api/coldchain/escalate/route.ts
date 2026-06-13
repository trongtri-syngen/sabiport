import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { runEscalationCheck } from "@/lib/cc/escalation";
import type { CcExcursion } from "@/lib/cc/types";

export const dynamic = "force-dynamic";

export async function POST() {
  const { data: openExcursions, error } = await supabase
    .from("cc_excursions")
    .select("*")
    .eq("status", "OPEN");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { decision, report, toEscalate } = await runEscalationCheck(
    (openExcursions ?? []) as CcExcursion[]
  );

  if (toEscalate.length > 0) {
    await supabase
      .from("cc_excursions")
      .update({ escalated: true })
      .in("id", toEscalate);
  }

  return NextResponse.json({
    escalated_count: toEscalate.length,
    escalated_ids: toEscalate,
    alert: decision.alert,
    summary: decision.summary,
    report,
  });
}
