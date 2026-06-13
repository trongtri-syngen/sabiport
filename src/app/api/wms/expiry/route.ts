import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { runExpiryCheck } from "@/lib/wms/expiry";
import type { SlottingMove } from "@/lib/wms/types";

export const dynamic = "force-dynamic";

export async function POST() {
  const { data: activeMoves, error } = await supabase
    .from("slotting_moves")
    .select("*")
    .eq("status", "ACTIVE");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { decision, report, expiredIds } = await runExpiryCheck(
    (activeMoves ?? []) as SlottingMove[]
  );

  if (expiredIds.length > 0) {
    const now = new Date().toISOString();
    await supabase
      .from("slotting_moves")
      .update({ status: "RETURNED", returned_at: now })
      .in("id", expiredIds);
  }

  return NextResponse.json({
    expired_count: expiredIds.length,
    expired_ids: expiredIds,
    alert: decision.alert,
    summary: decision.summary,
    report,
  });
}
