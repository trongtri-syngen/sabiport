/**
 * Seed script — loads sample data into Supabase.
 * Usage:  npm run seed
 */

import * as fs from "fs";
import * as path from "path";
import { createClient } from "@supabase/supabase-js";

// Load .env manually
const envPath = path.join(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
  }
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env");
  process.exit(1);
}
const sb = createClient(url, key);

// ── Articles ─────────────────────────────────────────────────────────
const articles = [
  { prtnum: "80825176", lngdsc: "LENOR COTTON FRESH 12X756ML EF3 PRA DACH", untqty: 72, uomcod: "PL" },
  { prtnum: "80826579", lngdsc: "ARIEL 3IN1 PODS REGULAR 28WL 4X28", untqty: 48, uomcod: "PL" },
  { prtnum: "80851410", lngdsc: "FAIRY ORIGINAL LEMON 6X900ML DE", untqty: 96, uomcod: "PL" },
  { prtnum: "80766342", lngdsc: "PANTENE PRO-V CLASSIC CLEAN 6X400ML", untqty: 60, uomcod: "PL" },
  { prtnum: "80835271", lngdsc: "HEAD SHOULDERS 2IN1 CLASSIC CLEAN 6X400ML", untqty: 36, uomcod: "PL" },
  { prtnum: "80752940", lngdsc: "PAMPERS BABY DRY SIZE 3 2X54", untqty: 108, uomcod: "PL" },
  { prtnum: "80801234", lngdsc: "ORAL-B PRO-EXPERT WHITENING 12X75ML", untqty: 48, uomcod: "PL" },
  { prtnum: "80809876", lngdsc: "GILETTE MACH3 TURBO 6X8PCS", untqty: 48, uomcod: "PL" },
  { prtnum: "80812345", lngdsc: "ALWAYS ULTRA NORMAL 8X20PCS", untqty: 80, uomcod: "PL" },
  { prtnum: "80876543", lngdsc: "TAMPAX COMPAK REGULAR 8X16PCS", untqty: 64, uomcod: "PL" },
];

// ── Locations ─────────────────────────────────────────────────────────
const locations = [
  { stoloc: "701001A", arecod: "DTLP2B1", locsts: "E", loccod: "P", pck_zone_cod: "PZ-CSPCK", sto_zone_cod: "SZ-DTLP2B1", is_ground_floor: true },
  { stoloc: "701002A", arecod: "DTLP2B1", locsts: "E", loccod: "P", pck_zone_cod: "PZ-CSPCK", sto_zone_cod: "SZ-DTLP2B1", is_ground_floor: true },
  { stoloc: "701003A", arecod: "DTLP2B1", locsts: "E", loccod: "P", pck_zone_cod: "PZ-CSPCK", sto_zone_cod: "SZ-DTLP2B1", is_ground_floor: true },
  { stoloc: "805019A", arecod: "PAPA12B1", locsts: "P", loccod: "P", pck_zone_cod: "PZ-COOP", sto_zone_cod: "SZ-PAPA12B1", is_ground_floor: false },
  { stoloc: "805017A", arecod: "PAPA12B1", locsts: "P", loccod: "P", pck_zone_cod: "PZ-COOP", sto_zone_cod: "SZ-PAPA12B1", is_ground_floor: false },
  { stoloc: "9ST03",   arecod: "ASRS1B1",  locsts: "P", loccod: "P", pck_zone_cod: "PZ-ASRS",  sto_zone_cod: "SZ-ASRS1B1",  is_ground_floor: false },
  { stoloc: "9ST11",   arecod: "ASRS1B1",  locsts: "P", loccod: "P", pck_zone_cod: "PZ-ASRS",  sto_zone_cod: "SZ-ASRS1B1",  is_ground_floor: false },
  { stoloc: "LH",      arecod: "ASRS1B1",  locsts: "P", loccod: "P", pck_zone_cod: "PZ-ASRS",  sto_zone_cod: "SZ-ASRS1B1",  is_ground_floor: false },
  { stoloc: "HRL",     arecod: "ASRSHRL",  locsts: "F", loccod: "P", pck_zone_cod: "PZ-ASRSHRL", sto_zone_cod: "SZ-ASRSHRL", is_ground_floor: false },
  { stoloc: "805062C", arecod: "PAPA12B1", locsts: "E", loccod: "P", pck_zone_cod: "PZ-COOP",  sto_zone_cod: "SZ-PAPA12B1", is_ground_floor: false },
];

// ── Inventory ─────────────────────────────────────────────────────────
const inventory = [
  { dtlnum: "D00000082UBW", stoloc: "805019A", prtnum: "80851410", untqty: 480, untcas: 6 },
  { dtlnum: "D00000075T04", stoloc: "805017A", prtnum: "80826579", untqty: 19,  untcas: 1 },
  { dtlnum: "D00000082U2T", stoloc: "9ST03",   prtnum: "80766342", untqty: 144, untcas: 6 },
  { dtlnum: "D0000007ZS2D", stoloc: "9ST11",   prtnum: "80835271", untqty: 24,  untcas: 3 },
  { dtlnum: "D00000082TSI", stoloc: "9ST11",   prtnum: "80752940", untqty: 516, untcas: 12 },
  { dtlnum: "D00000082VAA", stoloc: "LH",      prtnum: "80825176", untqty: 72,  untcas: 1 },
  { dtlnum: "D00000082VBB", stoloc: "HRL",     prtnum: "80801234", untqty: 96,  untcas: 12 },
  { dtlnum: "D00000082VCC", stoloc: "805062C", prtnum: "80809876", untqty: 48,  untcas: 6 },
  { dtlnum: "D00000082VDD", stoloc: "9ST03",   prtnum: "80812345", untqty: 320, untcas: 20 },
  { dtlnum: "D00000082VEE", stoloc: "805017A", prtnum: "80876543", untqty: 192, untcas: 8 },
];

async function seed() {
  console.log("Seeding articles…");
  const { error: artErr } = await sb.from("articles").upsert(articles, { onConflict: "prtnum" });
  if (artErr) { console.error(artErr); process.exit(1); }
  console.log(`  ${articles.length} articles OK`);

  console.log("Seeding locations…");
  const { error: locErr } = await sb.from("locations").upsert(locations, { onConflict: "stoloc" });
  if (locErr) { console.error(locErr); process.exit(1); }
  console.log(`  ${locations.length} locations OK`);

  console.log("Seeding inventory…");
  // Delete existing inventory rows first to avoid duplicates on re-seed
  await sb.from("inventory").delete().neq("id", 0);
  const { error: invErr } = await sb.from("inventory").insert(inventory);
  if (invErr) { console.error(invErr); process.exit(1); }
  console.log(`  ${inventory.length} inventory rows OK`);

  console.log("Seeding sample TMS trip (Madrid → Barcelona, EUR 975)…");
  const { data: trip, error: tripErr } = await sb
    .from("trips")
    .insert({ name: "Madrid → Barcelona", origin: "Madrid", destination: "Barcelona", truck_cost: 975 })
    .select()
    .single();
  if (tripErr) { console.error(tripErr); process.exit(1); }

  const shipments = [
    { trip_id: trip.id, client_name: "Acer",      pallets: 6, weight_kg: 2400, height_m: 1.8, charging_mechanism: "WEIGHT" },
    { trip_id: trip.id, client_name: "Samsung",   pallets: 8, weight_kg: 2400, height_m: 1.2, charging_mechanism: "PALLET" },
    { trip_id: trip.id, client_name: "Panasonic", pallets: 3, weight_kg: 900,  height_m: 1.5, charging_mechanism: "LDM"    },
    { trip_id: trip.id, client_name: "HP",        pallets: 7, weight_kg: 1400, height_m: 1.0, charging_mechanism: "CBM"    },
    { trip_id: trip.id, client_name: "Sony",      pallets: 4, weight_kg: 2000, height_m: 1.5, charging_mechanism: "PALLET" },
    { trip_id: trip.id, client_name: "LG",        pallets: 3, weight_kg: 300,  height_m: 1.6, charging_mechanism: "CBM"    },
  ];
  const { error: shipErr } = await sb.from("shipments").insert(shipments);
  if (shipErr) { console.error(shipErr); process.exit(1); }
  console.log(`  Trip ${trip.id} with ${shipments.length} shipments OK`);

  console.log("\nSeed complete.");
}

seed().catch((err) => { console.error(err); process.exit(1); });
