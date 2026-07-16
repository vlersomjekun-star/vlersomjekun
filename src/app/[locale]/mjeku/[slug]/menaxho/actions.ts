"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { AddressSource, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireActionUser } from "@/lib/user-guard";

export type ManageState = { status: "idle" | "ok" | "error"; error?: string };

// ─── Schema profilo ───────────────────────────────────────────────────────────

const URL_FIELD = z.string().trim().url().max(500).optional().or(z.literal(""));

const profileSchema = z.object({
  doctorId:     z.string().min(1),
  specialtyId:  z.string().min(1).optional(),
  photoUrl:     URL_FIELD,
  subSpecialty: z.string().trim().max(120).optional(),
  address:      z.string().trim().max(200).optional(),
  phone:        z.string().trim().max(30).optional(),
  clinicId:     z.string().optional(),
  bio:          z.string().trim().max(1000).optional(),
  yearsExp:     z.preprocess(
    (v) => (v === "" || v === undefined ? undefined : Number(v)),
    z.number().int().min(0).max(80).optional()
  ),
  languages:   z.string().trim().max(200).optional(),
  websiteUrl1: URL_FIELD,
  websiteUrl2: URL_FIELD,
});

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
type Day = (typeof DAYS)[number];
type DayEntry = { open: string; close: string } | null;

function parseSchedule(formData: FormData): Record<Day, DayEntry> | null {
  const result = {} as Record<Day, DayEntry>;
  let hasAny = false;
  for (const day of DAYS) {
    const on = formData.get(`sched_${day}_on`) === "1";
    const open = ((formData.get(`sched_${day}_open`) as string) ?? "").trim();
    const close = ((formData.get(`sched_${day}_close`) as string) ?? "").trim();
    if (on && open && close) {
      result[day] = { open, close };
      hasAny = true;
    } else {
      result[day] = null;
    }
  }
  return hasAny ? result : null;
}

// ─── updateOwnProfile ─────────────────────────────────────────────────────────

/**
 * Vetëm mjeku i verifikuar mund ta ekzekutojë.
 * Fushat e identitetit (emri, mbiemri, specialiteti, qyteti) nuk preken —
 * mbeten nën kontrollin e admini.
 * Çdo ndryshim fushash regjistrohet në DoctorProfileLog.
 */
export async function updateOwnProfile(
  _prev: ManageState,
  formData: FormData
): Promise<ManageState> {
  const guard = await requireActionUser();
  if ("error" in guard) return { status: "error", error: guard.error };

  const parsed = profileSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { status: "error", error: "INVALID_INPUT" };
  const d = parsed.data;

  const doctor = await prisma.doctor.findUnique({ where: { id: d.doctorId } });
  if (!doctor || doctor.claimedByUserId !== guard.user.id) {
    return { status: "error", error: "NOT_OWNER" };
  }

  if (d.specialtyId) {
    const specialty = await prisma.specialty.findUnique({ where: { id: d.specialtyId } });
    if (!specialty) return { status: "error", error: "INVALID_INPUT" };
  }

  if (d.clinicId) {
    const clinic = await prisma.clinic.findUnique({ where: { id: d.clinicId } });
    if (!clinic) return { status: "error", error: "INVALID_INPUT" };
  }

  const scheduleJson = parseSchedule(formData);

  // Vlerat e reja dhe të vjetra për audit log
  const newVals: Record<string, string | null> = {
    specialtyId:  d.specialtyId  || null,
    photoUrl:     d.photoUrl     || null,
    subSpecialty: d.subSpecialty || null,
    address:      d.address      || null,
    phone:        d.phone        || null,
    clinicId:     d.clinicId     || null,
    bio:          d.bio          || null,
    yearsExp:     d.yearsExp != null ? String(d.yearsExp) : null,
    languages:    d.languages    || null,
    websiteUrl1:  d.websiteUrl1  || null,
    websiteUrl2:  d.websiteUrl2  || null,
    scheduleJson: scheduleJson ? JSON.stringify(scheduleJson) : null,
  };
  const oldVals: Record<string, string | null> = {
    specialtyId:  doctor.specialtyId,
    photoUrl:     doctor.photoUrl,
    subSpecialty: doctor.subSpecialty,
    address:      doctor.address,
    phone:        doctor.phone,
    clinicId:     doctor.clinicId,
    bio:          doctor.bio,
    yearsExp:     doctor.yearsExp != null ? String(doctor.yearsExp) : null,
    languages:    doctor.languages,
    websiteUrl1:  doctor.websiteUrl1,
    websiteUrl2:  doctor.websiteUrl2,
    scheduleJson: doctor.scheduleJson ? JSON.stringify(doctor.scheduleJson) : null,
  };

  const logs = Object.entries(newVals)
    .filter(([field, nv]) => nv !== oldVals[field])
    .map(([field, nv]) => ({
      doctorId:    doctor.id,
      field,
      oldValue:    oldVals[field],
      newValue:    nv,
      changedById: guard.user.id,
    }));

  await prisma.$transaction([
    prisma.doctor.update({
      where: { id: doctor.id },
      data: {
        ...(d.specialtyId ? { specialtyId: d.specialtyId } : {}),
        photoUrl:     d.photoUrl     || null,
        subSpecialty: d.subSpecialty || null,
        address:      d.address      || null,
        phone:        d.phone        || null,
        clinicId:     d.clinicId     || null,
        bio:          d.bio          || null,
        yearsExp:     d.yearsExp     ?? null,
        languages:    d.languages    || null,
        websiteUrl1:  d.websiteUrl1  || null,
        websiteUrl2:  d.websiteUrl2  || null,
        scheduleJson: scheduleJson ?? Prisma.DbNull,
        addressSource: AddressSource.DOCTOR_VERIFIED,
        enrichedAt: new Date(),
      },
    }),
    ...(logs.length > 0 ? [prisma.doctorProfileLog.createMany({ data: logs })] : []),
  ]);

  revalidatePath(`/mjeku/${doctor.slug}`);
  revalidatePath(`/mjeku/${doctor.slug}/menaxho`);
  return { status: "ok" };
}

// ─── upsertDoctorReply ────────────────────────────────────────────────────────

const replySchema = z.object({
  reviewId: z.string().min(1),
  doctorId: z.string().min(1),
  text:     z.string().trim().min(1).max(1000),
});

const REPLY_LOCK_MS = 48 * 60 * 60 * 1000;

export async function upsertDoctorReply(
  _prev: ManageState,
  formData: FormData
): Promise<ManageState> {
  const guard = await requireActionUser();
  if ("error" in guard) return { status: "error", error: guard.error };

  const parsed = replySchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { status: "error", error: "INVALID_INPUT" };
  const { reviewId, doctorId, text } = parsed.data;

  const doctor = await prisma.doctor.findUnique({ where: { id: doctorId } });
  if (!doctor || doctor.claimedByUserId !== guard.user.id) {
    return { status: "error", error: "NOT_OWNER" };
  }

  const review = await prisma.review.findUnique({ where: { id: reviewId } });
  if (!review || review.doctorId !== doctorId) {
    return { status: "error", error: "INVALID_INPUT" };
  }

  const existing = await prisma.doctorReply.findUnique({ where: { reviewId } });
  if (existing && Date.now() - existing.createdAt.getTime() > REPLY_LOCK_MS) {
    return { status: "error", error: "REPLY_LOCKED" };
  }

  if (existing) {
    await prisma.doctorReply.update({ where: { reviewId }, data: { text } });
  } else {
    await prisma.doctorReply.create({ data: { reviewId, doctorId, text } });
  }

  revalidatePath(`/mjeku/${doctor.slug}`);
  revalidatePath(`/mjeku/${doctor.slug}/menaxho`);
  return { status: "ok" };
}

// ─── deleteDoctorReply ────────────────────────────────────────────────────────

export async function deleteDoctorReply(
  _prev: ManageState,
  formData: FormData
): Promise<ManageState> {
  const guard = await requireActionUser();
  if ("error" in guard) return { status: "error", error: guard.error };

  const reviewId = (formData.get("reviewId") as string) ?? "";
  if (!reviewId) return { status: "error", error: "INVALID_INPUT" };

  const reply = await prisma.doctorReply.findUnique({
    where: { reviewId },
    include: { doctor: true },
  });
  if (!reply || reply.doctor.claimedByUserId !== guard.user.id) {
    return { status: "error", error: "NOT_OWNER" };
  }
  if (Date.now() - reply.createdAt.getTime() > REPLY_LOCK_MS) {
    return { status: "error", error: "REPLY_LOCKED" };
  }

  await prisma.doctorReply.delete({ where: { reviewId } });
  revalidatePath(`/mjeku/${reply.doctor.slug}`);
  revalidatePath(`/mjeku/${reply.doctor.slug}/menaxho`);
  return { status: "ok" };
}

// ─── createDoctorDispute ──────────────────────────────────────────────────────

const disputeSchema = z.object({
  reviewId: z.string().min(1),
  doctorId: z.string().min(1),
  reason:   z.string().trim().min(10).max(500),
});

export async function createDoctorDispute(
  _prev: ManageState,
  formData: FormData
): Promise<ManageState> {
  const guard = await requireActionUser();
  if ("error" in guard) return { status: "error", error: guard.error };

  const parsed = disputeSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { status: "error", error: "INVALID_INPUT" };
  const { reviewId, doctorId, reason } = parsed.data;

  const doctor = await prisma.doctor.findUnique({ where: { id: doctorId } });
  if (!doctor || doctor.claimedByUserId !== guard.user.id) {
    return { status: "error", error: "NOT_OWNER" };
  }

  const review = await prisma.review.findUnique({ where: { id: reviewId } });
  if (!review || review.doctorId !== doctorId) {
    return { status: "error", error: "INVALID_INPUT" };
  }

  const existing = await prisma.doctorDispute.findUnique({
    where: { reviewId_doctorId: { reviewId, doctorId } },
  });
  if (existing) return { status: "error", error: "ALREADY_DISPUTED" };

  await prisma.doctorDispute.create({ data: { reviewId, doctorId, reason } });
  return { status: "ok" };
}
