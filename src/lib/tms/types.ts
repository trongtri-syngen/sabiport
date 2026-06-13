import { z } from "zod";

export const MechanismSchema = z.enum(["PALLET", "WEIGHT", "LDM", "CBM"]);
export type Mechanism = z.infer<typeof MechanismSchema>;

export const CreateTripSchema = z.object({
  name: z.string().min(1),
  origin: z.string().optional(),
  destination: z.string().optional(),
  truck_cost: z.number().positive(),
});

export const CreateShipmentSchema = z.object({
  client_name: z.string().min(1),
  pallets: z.number().int().positive(),
  weight_kg: z.number().positive(),
  height_m: z.number().positive().default(1.8),
  charging_mechanism: MechanismSchema,
});

export interface Trip {
  id: string;
  name: string;
  origin: string | null;
  destination: string | null;
  truck_cost: number;
  created_at: string;
}

export interface Shipment {
  id: string;
  trip_id: string;
  client_name: string;
  pallets: number;
  weight_kg: number;
  height_m: number;
  charging_mechanism: Mechanism;
  created_at: string;
}

export interface ShipmentResult extends Shipment {
  ldm: number;
  cbm: number;
  cost_allocation: number;
  client_charge: number;
  margin: number;
  optimal_mechanism: Mechanism;
  optimal_charge: number;
  optimal_margin: number;
  delta_margin: number;
}

export interface TripResult extends Trip {
  shipments: ShipmentResult[];
  total_pallets: number;
  total_cost: number;
  total_charge: number;
  total_margin: number;
}
