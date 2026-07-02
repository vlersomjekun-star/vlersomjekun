"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { ContentStatus, CreatedBy } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hashIp, clientIp } from "@/lib/hash";
import { rateLimit } from "@/lib/rate-limit";
import { uniqueDoctorSlug, uniqueClinicSlug } from "@/lib/slug";

export type SubmitState = { status: "idle" | "ok" | "error"; error?: string };

const doctorSchema = z.object({
  type: z.literal("doctor"),
  firstName: z.string().trim().min(2).max(60),
  lastName: z.string().trim().min(2).max(60),
  specialtyId: z.string().min(1),
  clinicName: z.string().trim().max(120).optional(),
  cityId: z.string().min(1),
  address: z.string().trim().max(200).optional(),
  phone: z.string().trim().max(30).optional(),
  confirmPublic: z.literal("on"),
});

const clinicSchema = z.object({
  type: z.literal("clinic"),
  clinicName: z.string().trim().min(2).max(120),
  cityId: z.string().min(1),
  address: z.string().trim().max(200).optional(),
  phone: z.string().trim().max(30).optional(),
  confirmPublic: z.literal("on"),
});

export async function submitEntry(
  _prev: SubmitState,
  formData: FormData
): Promise<SubmitState> {
  const raw = Object.fromEntries(formData.entries());

  const ipHash = hashIp(clientIp(await headers()));
  // Max 3 propozime për IP në 24h
  if (!rateLimit(`submit:${ipHash}`, 3, 24 * 60 * 60 * 1000)) {
    return { status: "error", error: "RATE_LIMITED" };
  }

  if (raw.type === "doctor") {
    const parsed = doctorSchema.safeParse(raw);
    if (!parsed.success) return { status: "error", error: "REQUIRED" };
    const d = parsed.data;

    const specialty = await prisma.specialty.findUnique({ where: { id: d.specialtyId } });
    const city = await prisma.city.findUnique({ where: { id: d.cityId } });
    if (!specialty || !city) return { status: "error", error: "REQUIRED" };

    // Nëse emri i klinikës përputhet ekzaktësisht me një klinikë APPROVED → lidhe me FK
    let clinicId: string | undefined;
    let clinicFreeText: string | undefined;
    if (d.clinicName) {
      const match = await prisma.clinic.findFirst({
        where: {
          name: { equals: d.clinicName, mode: "insensitive" },
          status: ContentStatus.APPROVED,
        },
      });
      if (match) clinicId = match.id;
      else clinicFreeText = d.clinicName;
    }

    await prisma.doctor.create({
      data: {
        firstName: d.firstName,
        lastName: d.lastName,
        slug: await uniqueDoctorSlug(d.firstName, d.lastName, specialty.slug),
        specialtyId: specialty.id,
        clinicId,
        clinicFreeText,
        cityId: city.id,
        address: d.address || null,
        phone: d.phone || null,
        status: ContentStatus.PENDING,
        createdBy: CreatedBy.USER,
      },
    });
    return { status: "ok" };
  }

  const parsed = clinicSchema.safeParse(raw);
  if (!parsed.success) return { status: "error", error: "REQUIRED" };
  const c = parsed.data;

  const city = await prisma.city.findUnique({ where: { id: c.cityId } });
  if (!city) return { status: "error", error: "REQUIRED" };

  await prisma.clinic.create({
    data: {
      name: c.clinicName,
      slug: await uniqueClinicSlug(c.clinicName),
      cityId: city.id,
      address: c.address || null,
      phone: c.phone || null,
      status: ContentStatus.PENDING,
      createdBy: CreatedBy.USER,
    },
  });
  return { status: "ok" };
}
