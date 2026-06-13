import { NextResponse } from "next/server";
import { runWarp, isClean } from "@sys/warp";
import { referentialCheck } from "@sys/warp/checks";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: inv }: { data: any[] | null } = await supabase.from("inventory").select("stoloc, prtnum");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: locs }: { data: any[] | null } = await supabase.from("locations").select("stoloc");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: arts }: { data: any[] | null } = await supabase.from("articles").select("prtnum");

  const invRows: { stoloc: string; prtnum: string }[] = inv ?? [];
  const locSet = new Set<string>((locs ?? []).map((l: { stoloc: string }) => l.stoloc));
  const artSet = new Set<string>((arts ?? []).map((a: { prtnum: string }) => a.prtnum));

  const config = {
    checks: [
      referentialCheck("inventory.stoloc → locations", {
        from: () => invRows.map((r) => r.stoloc).filter(Boolean),
        to: () => Array.from(locSet),
        message: (v: string) => `unknown location: ${v}`,
      }),
      referentialCheck("inventory.prtnum → articles", {
        from: () => invRows.map((r) => r.prtnum).filter(Boolean),
        to: () => Array.from(artSet),
        message: (v: string) => `unknown article: ${v}`,
      }),
    ],
  };

  const report = await runWarp(config);
  return NextResponse.json({ clean: isClean(report), report });
}
