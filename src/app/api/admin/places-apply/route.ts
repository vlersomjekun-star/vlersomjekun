/**
 * Pranimi manual i një kandidati Places nga admini (një rekord, një vendim njerëzor).
 * Ruhen: adresa, telefoni, koordinatat, qyteti + googlePlaceId (e vetmja vlerë
 * që Google ToS lejon të ruhet në mënyrë të përhershme), addressSource PLACES_VERIFIED.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import { AddressSource } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ADMIN_COOKIE, verifySessionToken } from "@/lib/admin-session";
import { cityFromAddress } from "@/lib/places";

const schema = z.object({
  type: z.enum(["doctor", "clinic"]),
  id: z.string().min(1),
  candidate: z.object({
    placeId: z.string().min(1),
    address: z.string().min(1),
    phone: z.string().nullable(),
    latitude: z.number().nullable(),
    longitude: z.number().nullable(),
  }),
});

export async function POST(req: NextRequest) {
  const store = await cookies();
  const admin = await verifySessionToken(store.get(ADMIN_COOKIE)?.value);
  if (!admin) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });

  const { type, id, candidate } = parsed.data;
  const citySlug = cityFromAddress(candidate.address);
  const city = citySlug ? await prisma.city.findUnique({ where: { slug: citySlug } }) : null;

  const data = {
    address: candidate.address,
    phone: candidate.phone,
    latitude: candidate.latitude,
    longitude: candidate.longitude,
    googlePlaceId: candidate.placeId,
    addressSource: AddressSource.PLACES_VERIFIED,
  };

  if (type === "doctor") {
    await prisma.doctor.update({
      where: { id },
      data: { ...data, ...(city && { cityId: city.id }), enrichedAt: new Date() },
    });
  } else {
    await prisma.clinic.update({
      where: { id },
      data: { ...data, ...(city && { cityId: city.id }) },
    });
  }

  return NextResponse.json({ ok: true, citySet: Boolean(city) });
}
