import { runHousekeeping, evaluateHousekeeping } from "@sys/groundskeeper";
import { expiryDetector } from "@sys/groundskeeper/detectors";
import type { SlottingMove } from "./types";

export async function runExpiryCheck(activeMoves: SlottingMove[]) {
  const config = {
    detectors: [
      expiryDetector("slotting-14d-inactivity", {
        rows: () => activeMoves,
        nowMs: Date.now(),
        expiresAt: (m: SlottingMove) => m.expires_at ?? undefined,
        subject: (m: SlottingMove) => m.id,
        expiredDetail: () => "14-day inactivity window exceeded — return to stock",
        expiringDetail: () => "expiring within 48 h",
      }),
    ],
  };

  const report = await runHousekeeping(config, new Date().toISOString());
  const decision = evaluateHousekeeping(report);

  const expiredIds = report.findings
    .filter((f) => f.severity === "high")
    .map((f) => f.subject);

  return { decision, report, expiredIds };
}
