import type { Mechanism, Shipment, ShipmentResult, Trip, TripResult } from "./types";

// Fixed rate card (EUR)
const RATE: Record<Mechanism, number> = {
  PALLET: 45,
  WEIGHT: 0.20,
  LDM: 85,
  CBM: 35,
};

export function calcLdm(pallets: number): number {
  return pallets * 0.4;
}

export function calcCbm(pallets: number, heightM: number): number {
  return 1.2 * 0.8 * heightM * pallets;
}

export function calcCharge(pallets: number, weightKg: number, heightM: number, mechanism: Mechanism): number {
  switch (mechanism) {
    case "PALLET": return pallets * RATE.PALLET;
    case "WEIGHT": return weightKg * RATE.WEIGHT;
    case "LDM":   return calcLdm(pallets) * RATE.LDM;
    case "CBM":   return calcCbm(pallets, heightM) * RATE.CBM;
  }
}

function optimalMechanism(pallets: number, weightKg: number, heightM: number): Mechanism {
  const mechanisms: Mechanism[] = ["PALLET", "WEIGHT", "LDM", "CBM"];
  return mechanisms.reduce((best, m) =>
    calcCharge(pallets, weightKg, heightM, m) > calcCharge(pallets, weightKg, heightM, best) ? m : best
  );
}

export function computeTripResults(trip: Trip, shipments: Shipment[]): TripResult {
  const totalPallets = shipments.reduce((s, sh) => s + sh.pallets, 0);
  const costPerPallet = totalPallets > 0 ? trip.truck_cost / totalPallets : 0;

  const results: ShipmentResult[] = shipments.map((sh) => {
    const ldm = calcLdm(sh.pallets);
    const cbm = calcCbm(sh.pallets, sh.height_m);
    const costAlloc = sh.pallets * costPerPallet;
    const clientCharge = calcCharge(sh.pallets, sh.weight_kg, sh.height_m, sh.charging_mechanism);
    const margin = costAlloc > 0 ? (clientCharge / costAlloc) - 1 : 0;
    const optMech = optimalMechanism(sh.pallets, sh.weight_kg, sh.height_m);
    const optCharge = calcCharge(sh.pallets, sh.weight_kg, sh.height_m, optMech);
    const optMargin = costAlloc > 0 ? (optCharge / costAlloc) - 1 : 0;

    return {
      ...sh,
      ldm,
      cbm,
      cost_allocation: costAlloc,
      client_charge: clientCharge,
      margin,
      optimal_mechanism: optMech,
      optimal_charge: optCharge,
      optimal_margin: optMargin,
      delta_margin: optMargin - margin,
    };
  });

  const totalCharge = results.reduce((s, r) => s + r.client_charge, 0);

  return {
    ...trip,
    shipments: results,
    total_pallets: totalPallets,
    total_cost: trip.truck_cost,
    total_charge: totalCharge,
    total_margin: trip.truck_cost > 0 ? (totalCharge / trip.truck_cost) - 1 : 0,
  };
}

export function computeSimulator(trip: Trip, shipments: Shipment[], overrideMechanism: Mechanism): ShipmentResult[] {
  const totalPallets = shipments.reduce((s, sh) => s + sh.pallets, 0);
  const costPerPallet = totalPallets > 0 ? trip.truck_cost / totalPallets : 0;

  return shipments.map((sh) => {
    const ldm = calcLdm(sh.pallets);
    const cbm = calcCbm(sh.pallets, sh.height_m);
    const costAlloc = sh.pallets * costPerPallet;
    const simCharge = calcCharge(sh.pallets, sh.weight_kg, sh.height_m, overrideMechanism);
    const simMargin = costAlloc > 0 ? (simCharge / costAlloc) - 1 : 0;
    const origCharge = calcCharge(sh.pallets, sh.weight_kg, sh.height_m, sh.charging_mechanism);
    const origMargin = costAlloc > 0 ? (origCharge / costAlloc) - 1 : 0;

    return {
      ...sh,
      ldm,
      cbm,
      cost_allocation: costAlloc,
      client_charge: simCharge,
      margin: simMargin,
      optimal_mechanism: overrideMechanism,
      optimal_charge: simCharge,
      optimal_margin: simMargin,
      delta_margin: simMargin - origMargin,
    };
  });
}
