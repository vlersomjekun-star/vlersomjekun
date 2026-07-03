import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/user-guard";

const schema = z.object({
  doctorId: z.string().min(1),
  citySlug: z.string().min(1),
});

/**
 * Sugjerim vendndodhjeje për mjekët pa qytet (import USSH).
 * Kur 2+ përdorues të pavarur sugjerojnë të njëjtin qytet → cityId vendoset automatikisht.
 */
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  }

  const [doctor, city] = await Promise.all([
    prisma.doctor.findUnique({ where: { id: parsed.data.doctorId } }),
    prisma.city.findUnique({ where: { slug: parsed.data.citySlug } }),
  ]);
  if (!doctor || !city) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }
  if (doctor.cityId) {
    return NextResponse.json({ ok: true, alreadySet: true });
  }

  // 1 sugjerim për përdorues për mjek (upsert — mund ta korrigjojë)
  await prisma.locationSuggestion.upsert({
    where: { doctorId_userId: { doctorId: doctor.id, userId: user.id } },
    update: { cityId: city.id },
    create: { doctorId: doctor.id, cityId: city.id, userId: user.id },
  });

  // 2+ sugjerime të pavarura që përputhen → vendos qytetin automatikisht
  const agreement = await prisma.locationSuggestion.groupBy({
    by: ["cityId"],
    where: { doctorId: doctor.id },
    _count: { userId: true },
  });
  const winner = agreement.find((a) => a._count.userId >= 2);
  if (winner) {
    await prisma.doctor.update({
      where: { id: doctor.id },
      data: { cityId: winner.cityId },
    });
    console.log(
      `[LocationSuggestion] Qyteti u vendos automatikisht për ${doctor.firstName} ${doctor.lastName} (${doctor.slug}) → cityId=${winner.cityId} (${winner._count.userId} sugjerime të pavarura)`
    );
    return NextResponse.json({ ok: true, citySet: true });
  }

  return NextResponse.json({ ok: true });
}
