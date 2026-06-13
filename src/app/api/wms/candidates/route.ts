import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  // Articles in non-ground-floor locations with inventory
  const { data: inv, error: invErr } = await supabase
    .from("inventory")
    .select("prtnum, stoloc, untqty, locations!inner(arecod, is_ground_floor)")
    .eq("locations.is_ground_floor", false)
    .order("untqty", { ascending: false })
    .limit(100);

  if (invErr) return NextResponse.json({ error: invErr.message }, { status: 500 });

  // Collect unique prtnums
  const prtnums = Array.from(new Set((inv ?? []).map((r: Record<string, unknown>) => r.prtnum as string)));

  // Get article descriptions
  const { data: arts } = await supabase
    .from("articles")
    .select("prtnum, lngdsc")
    .in("prtnum", prtnums);

  const artMap = new Map((arts ?? []).map((a: { prtnum: string; lngdsc: string }) => [a.prtnum, a.lngdsc]));

  // Get open moves (not RETURNED)
  const { data: moves } = await supabase
    .from("slotting_moves")
    .select("prtnum, status")
    .in("status", ["RECOMMENDED", "CONFIRMED", "ACTIVE"]);

  const openMovePrtnums = new Set((moves ?? []).map((m: { prtnum: string }) => m.prtnum));

  const candidates = (inv ?? []).map((r: Record<string, unknown>) => {
    const loc = r.locations as { arecod: string; is_ground_floor: boolean } | null;
    return {
      prtnum: r.prtnum as string,
      lngdsc: artMap.get(r.prtnum as string) ?? null,
      stoloc: r.stoloc as string,
      arecod: loc?.arecod ?? null,
      untqty: r.untqty as number,
      has_open_move: openMovePrtnums.has(r.prtnum as string),
    };
  });

  return NextResponse.json(candidates);
}
