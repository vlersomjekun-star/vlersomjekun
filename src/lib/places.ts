/**
 * Google Places — VETËM assist-mode manual nga admini.
 *
 * ⚠️ Bulk import from Places is prohibited by Google Maps Platform ToS —
 * do not automate this flow (no batch, no cron, no loops over doctors).
 * Rezultatet e kërkimit SHFAQEN vetëm në UI dhe nuk ruhen; ruhet vetëm
 * rezultati i pranuar në mënyrë eksplicite nga admini (addressSource
 * PLACES_VERIFIED + googlePlaceId, e vetmja vlerë që ToS lejon të ruhet).
 */
import { prisma } from "./prisma";

export const PLACES_DAILY_LIMIT = 100; // kufi i fortë në kod

export function placesEnabled(): boolean {
  return Boolean(process.env.GOOGLE_PLACES_API_KEY);
}

/** Kthen kërkesat e mbetura sot; kufiri është i qëndrueshëm në DB. */
export async function placesQuotaRemaining(): Promise<number> {
  const today = new Date().toISOString().slice(0, 10);
  const row = await prisma.placesQuota.findUnique({ where: { date: today } });
  return Math.max(0, PLACES_DAILY_LIMIT - (row?.count ?? 0));
}

/** Konsumon 1 kërkesë nga kuota ditore; false nëse kufiri është kapërcyer. */
export async function consumePlacesQuota(): Promise<boolean> {
  const today = new Date().toISOString().slice(0, 10);
  const row = await prisma.placesQuota.upsert({
    where: { date: today },
    update: { count: { increment: 1 } },
    create: { date: today, count: 1 },
  });
  return row.count <= PLACES_DAILY_LIMIT;
}

export type PlaceCandidate = {
  placeId: string;
  name: string;
  address: string;
  phone: string | null;
  latitude: number | null;
  longitude: number | null;
};

/** Text Search live (Places API v1) — max 3 kandidatë, asnjë ruajtje automatike. */
export async function searchPlaces(query: string): Promise<PlaceCandidate[]> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_PLACES_API_KEY mungon");

  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask":
        "places.id,places.displayName,places.formattedAddress,places.internationalPhoneNumber,places.location",
    },
    body: JSON.stringify({
      textQuery: query,
      regionCode: "AL",
      languageCode: "sq",
      maxResultCount: 3,
    }),
  });
  if (!res.ok) {
    throw new Error(`Places dështoi: ${res.status} ${await res.text().then((t) => t.slice(0, 200))}`);
  }
  const data = (await res.json()) as {
    places?: {
      id: string;
      displayName?: { text: string };
      formattedAddress?: string;
      internationalPhoneNumber?: string;
      location?: { latitude: number; longitude: number };
    }[];
  };
  return (data.places ?? []).slice(0, 3).map((p) => ({
    placeId: p.id,
    name: p.displayName?.text ?? "",
    address: p.formattedAddress ?? "",
    phone: p.internationalPhoneNumber ?? null,
    latitude: p.location?.latitude ?? null,
    longitude: p.location?.longitude ?? null,
  }));
}

/** Gjen slug-un e qytetit nga adresa e formatuar (heuristikë e thjeshtë). */
export function cityFromAddress(address: string): string | null {
  const CITY_NAMES: Record<string, string> = {
    tirana: "tirane", tiranë: "tirane", tirane: "tirane",
    durrës: "durres", durres: "durres",
    vlorë: "vlore", vlore: "vlore", vlora: "vlore",
    shkodër: "shkoder", shkoder: "shkoder", shkodra: "shkoder",
    elbasan: "elbasan",
    fier: "fier",
    korçë: "korce", korce: "korce", korça: "korce",
    berat: "berat",
    lushnjë: "lushnje", lushnje: "lushnje",
    pogradec: "pogradec",
    gjirokastër: "gjirokaster", gjirokaster: "gjirokaster",
    sarandë: "sarande", sarande: "sarande",
    lezhë: "lezhe", lezhe: "lezhe",
    kukës: "kukes", kukes: "kukes",
    peshkopi: "diber", dibër: "diber", diber: "diber",
  };
  const lower = address.toLowerCase();
  for (const [name, slug] of Object.entries(CITY_NAMES)) {
    if (lower.includes(name)) return slug;
  }
  return null;
}
