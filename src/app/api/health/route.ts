import { NextResponse } from "next/server";
import { runHealth, healthAlert } from "@sys/sentinel";
import { configProbe } from "@sys/sentinel/probes";

export const dynamic = "force-dynamic";

export async function GET() {
  const config = {
    probes: [
      configProbe("supabase", [
        "NEXT_PUBLIC_SUPABASE_URL",
        "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      ]),
    ],
    critical: ["supabase"],
  };

  const report = await runHealth(config);
  const { alert, summary } = healthAlert(report);
  const status = alert ? 503 : 200;

  return NextResponse.json({ healthy: !alert, summary, report }, { status });
}
