/**
 * Kërkim live në Google Places — VETËM për adminin, një rekord në herë.
 * ⚠️ Bulk import from Places is prohibited by Google Maps Platform ToS —
 * do not automate this flow. Rezultatet NUK ruhen — shfaqen vetëm në UI.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { ADMIN_COOKIE, verifySessionToken } from "@/lib/admin-session";
import {
  consumePlacesQuota,
  placesEnabled,
  placesQuotaRemaining,
  searchPlaces,
} from "@/lib/places";

const schema = z.object({
  type: z.enum(["doctor", "clinic"]),
  id: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const store = await cookies();
  const admin = await verifySessionToken(store.get(ADMIN_COOKIE)?.value);
  if (!admin) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  if (!placesEnabled()) {
    return NextResponse.json({ error: "PLACES_DISABLED" }, { status: 501 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });

  // Kufi i fortë ditor — i qëndrueshëm në DB
  if (!(await consumePlacesQuota())) {
    return NextResponse.json({ error: "QUOTA_EXCEEDED", remaining: 0 }, { status: 429 });
  }

  let query: string;
  if (parsed.data.type === "doctor") {
    const d = await prisma.doctor.findUnique({
      where: { id: parsed.data.id },
      include: { specialty: true, city: true },
    });
    if (!d) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    query = `Dr. ${d.firstName} ${d.lastName} ${d.subSpecialty ?? d.specialty.nameSq} ${d.city?.nameSq ?? "Shqipëri"}`;
  } else {
    const c = await prisma.clinic.findUnique({
      where: { id: parsed.data.id },
      include: { city: true },
    });
    if (!c) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    query = `${c.name} ${c.city.nameSq}`;
  }

  const candidates = await searchPlaces(query);
  const remaining = await placesQuotaRemaining();
  return NextResponse.json({ query, candidates, remaining });
}
