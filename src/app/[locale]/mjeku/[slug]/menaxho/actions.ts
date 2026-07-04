"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { AddressSource } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireActionUser } from "@/lib/user-guard";

export type ManageState = { status: "idle" | "ok" | "error"; error?: string };

const schema = z.object({
  doctorId: z.string().min(1),
  photoUrl: z.string().trim().url().max(500).optional().or(z.literal("")),
  subSpecialty: z.string().trim().max(120).optional(),
  address: z.string().trim().max(200).optional(),
  phone: z.string().trim().max(30).optional(),
  clinicId: z.string().optional(),
});

/**
 * Vetëm mjeku i verifikuar (claimedByUserId === user.id) mund ta ekzekutojë.
 * Fushat e identitetit (emri, mbiemri, specialiteti, qyteti) NUK preken —
 * mbeten të kontrolluara nga admini për të parandaluar keqpërdorim.
 */
export async function updateOwnProfile(
  _prev: ManageState,
  formData: FormData
): Promise<ManageState> {
  const guard = await requireActionUser();
  if ("error" in guard) return { status: "error", error: guard.error };

  const parsed = schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { status: "error", error: "INVALID_INPUT" };
  const data = parsed.data;

  const doctor = await prisma.doctor.findUnique({ where: { id: data.doctorId } });
  if (!doctor || doctor.claimedByUserId !== guard.user.id) {
    return { status: "error", error: "NOT_OWNER" };
  }

  if (data.clinicId) {
    const clinic = await prisma.clinic.findUnique({ where: { id: data.clinicId } });
    if (!clinic) return { status: "error", error: "INVALID_INPUT" };
  }

  await prisma.doctor.update({
    where: { id: doctor.id },
    data: {
      photoUrl: data.photoUrl || null,
      subSpecialty: data.subSpecialty || null,
      address: data.address || null,
      phone: data.phone || null,
      clinicId: data.clinicId || null,
      addressSource: AddressSource.DOCTOR_VERIFIED,
      enrichedAt: new Date(),
    },
  });

  revalidatePath(`/mjeku/${doctor.slug}`);
  revalidatePath(`/mjeku/${doctor.slug}/menaxho`);
  return { status: "ok" };
}
