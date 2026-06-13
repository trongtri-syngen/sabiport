import {
  defineGroundskeeper,
  runHousekeeping,
  evaluateHousekeeping,
} from "@sys/groundskeeper";
import { agingDetector } from "@sys/groundskeeper/detectors";
import type { CcExcursion } from "./types";

export async function runEscalationCheck(openExcursions: CcExcursion[]) {
  const config = defineGroundskeeper({
    detectors: [
      agingDetector("excursion-escalation-1h", {
        rows: () => openExcursions.filter((e) => !e.escalated),
        nowMs: Date.now(),
        thresholdDays: 1 / 24,
        timestamp: (e: CcExcursion) => e.breach_start_ts,
        subject: (e: CcExcursion) => e.id,
        detail: (e: CcExcursion) =>
          `Shipment ${e.shipment_id} — ${e.excursion_type} excursion open > 1 h without corrective action`,
      }),
    ],
  });

  const report = await runHousekeeping(config, new Date().toISOString());
  const decision = evaluateHousekeeping(report);

  const toEscalate = report.findings
    .filter((f) => f.severity === "high")
    .map((f) => f.subject);

  return { decision, report, toEscalate };
}
