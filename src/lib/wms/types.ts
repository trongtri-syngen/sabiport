import { z } from "zod";

export type SlottingStatus = "RECOMMENDED" | "CONFIRMED" | "ACTIVE" | "RETURNED";

export interface SlottingMove {
  id: string;
  prtnum: string;
  from_stoloc: string | null;
  to_stoloc: string;
  status: SlottingStatus;
  recommended_at: string;
  confirmed_at: string | null;
  activated_at: string | null;
  last_pick_at: string | null;
  returned_at: string | null;
  expires_at: string | null;
}

export interface SlottingCandidate {
  prtnum: string;
  lngdsc: string | null;
  stoloc: string;
  arecod: string | null;
  untqty: number;
  has_open_move: boolean;
}

export const CreateMoveSchema = z.object({
  prtnum: z.string().min(1),
  from_stoloc: z.string().optional(),
  to_stoloc: z.string().min(1).default("701001A"),
});

export const AdvanceMoveSchema = z.object({
  action: z.enum(["confirm", "activate", "return", "record_pick"]),
});
