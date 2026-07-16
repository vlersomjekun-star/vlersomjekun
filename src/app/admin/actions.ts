"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import {
  AddressSource,
  ClaimStatus,
  CommentStatus,
  ContentStatus,
  MatchStatus,
  ReportStatus,
  ReviewStatus,
  SectorType,
  TargetType,
  UserStatus,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  ADMIN_COOKIE,
  createSessionToken,
  verifySessionToken,
} from "@/lib/admin-session";
import { recalcRating } from "@/lib/ratings";
import { uniqueClinicSlug, uniqueDoctorSlug, slugify } from "@/lib/slug";

async function requireAdmin(): Promise<void> {
  const store = await cookies();
  const email = await verifySessionToken(store.get(ADMIN_COOKIE)?.value);
  if (!email) redirect("/admin/login");
}

// ---------- Auth ----------

export async function login(
  _prev: { error?: string },
  formData: FormData
): Promise<{ error?: string }> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const admin = await prisma.adminUser.findUnique({ where: { email } });
  if (!admin || !(await bcrypt.compare(password, admin.passwordHash))) {
    return { error: "Email ose fjalëkalim i gabuar." };
  }
  const store = await cookies();
  store.set(ADMIN_COOKIE, await createSessionToken(email), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  redirect("/admin");
}

export async function logout(): Promise<void> {
  const store = await cookies();
  store.delete(ADMIN_COOKIE);
  redirect("/admin/login");
}

// ---------- Moderim: mjekë/klinika në pritje ----------

export async function approveDoctor(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id"));
  await prisma.doctor.update({
    where: { id },
    data: { status: ContentStatus.APPROVED },
  });
  revalidatePath("/admin/pending");
}

export async function rejectDoctor(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id"));
  await prisma.doctor.update({
    where: { id },
    data: { status: ContentStatus.REJECTED },
  });
  revalidatePath("/admin/pending");
}

export async function approveClinic(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id"));
  await prisma.clinic.update({
    where: { id },
    data: { status: ContentStatus.APPROVED },
  });
  revalidatePath("/admin/pending");
}

export async function rejectClinic(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id"));
  await prisma.clinic.update({
    where: { id },
    data: { status: ContentStatus.REJECTED },
  });
  revalidatePath("/admin/pending");
}

// ---------- Moderim: reviews ----------

async function setReviewStatus(
  id: string,
  status: ReviewStatus,
  removalReason?: string
): Promise<void> {
  const review = await prisma.review.findUniqueOrThrow({ where: { id } });
  await prisma.$transaction(async (tx) => {
    await tx.review.update({
      where: { id },
      data: { status, removalReason: removalReason ?? null, flagReason: null },
    });
    const targetId =
      review.targetType === TargetType.DOCTOR ? review.doctorId : review.clinicId;
    if (targetId) await recalcRating(tx, review.targetType, targetId);
  });
}

export async function publishReview(formData: FormData): Promise<void> {
  await requireAdmin();
  await setReviewStatus(String(formData.get("id")), ReviewStatus.PUBLISHED);
  revalidatePath("/admin/reviews");
}

export async function removeReview(formData: FormData): Promise<void> {
  await requireAdmin();
  const reason = String(formData.get("reason") || "other");
  await setReviewStatus(String(formData.get("id")), ReviewStatus.REMOVED, reason);
  revalidatePath("/admin/reviews");
  revalidatePath("/admin/reports");
}

// ---------- Raportime ----------

export async function resolveReportKeep(formData: FormData): Promise<void> {
  await requireAdmin();
  await prisma.report.update({
    where: { id: String(formData.get("id")) },
    data: { status: ReportStatus.RESOLVED },
  });
  revalidatePath("/admin/reports");
}

export async function resolveReportRemove(formData: FormData): Promise<void> {
  await requireAdmin();
  const report = await prisma.report.findUniqueOrThrow({
    where: { id: String(formData.get("id")) },
  });
  const reason = String(formData.get("reason") || "reported");
  if (report.reviewId) {
    await setReviewStatus(report.reviewId, ReviewStatus.REMOVED, reason);
  } else if (report.commentId) {
    await prisma.reviewComment.update({
      where: { id: report.commentId },
      data: { status: CommentStatus.REMOVED },
    });
  }
  await prisma.report.update({
    where: { id: report.id },
    data: { status: ReportStatus.RESOLVED },
  });
  revalidatePath("/admin/reports");
}

// ---------- Përdoruesit ----------

export async function banUser(formData: FormData): Promise<void> {
  await requireAdmin();
  await prisma.user.update({
    where: { id: String(formData.get("id")) },
    data: { status: UserStatus.BANNED },
  });
  revalidatePath("/admin/users");
}

export async function unbanUser(formData: FormData): Promise<void> {
  await requireAdmin();
  await prisma.user.update({
    where: { id: String(formData.get("id")) },
    data: { status: UserStatus.ACTIVE },
  });
  revalidatePath("/admin/users");
}

/** Heq (REMOVED) të gjitha vlerësimet e një përdoruesi dhe rillogarit ratings. */
export async function removeAllUserReviews(formData: FormData): Promise<void> {
  await requireAdmin();
  const userId = String(formData.get("id"));
  const reviews = await prisma.review.findMany({
    where: { userId, status: { not: ReviewStatus.REMOVED } },
  });
  await prisma.$transaction(async (tx) => {
    await tx.review.updateMany({
      where: { userId, status: { not: ReviewStatus.REMOVED } },
      data: { status: ReviewStatus.REMOVED, removalReason: "user-mass-removal" },
    });
    const targets = new Map<string, TargetType>();
    for (const r of reviews) {
      const targetId = r.targetType === TargetType.DOCTOR ? r.doctorId : r.clinicId;
      if (targetId) targets.set(targetId, r.targetType);
    }
    for (const [targetId, targetType] of targets) {
      await recalcRating(tx, targetType, targetId);
    }
  });
  revalidatePath("/admin/users");
}

// ---------- Përputhjet mjek→klinikë (Faza 2, scraper) ----------

/** Apliko pasurimin e një match-i te mjeku (pa mbishkruar të dhëna ekzistuese). */
async function applyMatchToDoctor(matchId: string): Promise<void> {
  const m = await prisma.doctorClinicMatch.findUniqueOrThrow({
    where: { id: matchId },
    include: { doctor: { include: { specialty: true } } },
  });
  if (!m.doctor || m.doctor.createdBy === "USER") return;
  const data: {
    clinicId?: string;
    subSpecialty?: string;
    photoSourceUrl?: string;
    enrichedAt?: Date;
  } = {};
  if (!m.doctor.clinicId) data.clinicId = m.clinicId;
  if (
    m.scrapedSpecialty &&
    !m.doctor.subSpecialty &&
    m.scrapedSpecialty.toLowerCase() !== m.doctor.specialty.nameSq.toLowerCase()
  ) {
    data.subSpecialty = m.scrapedSpecialty;
  }
  if (m.photoSourceUrl && !m.doctor.photoSourceUrl) data.photoSourceUrl = m.photoSourceUrl;
  if (Object.keys(data).length > 0) {
    data.enrichedAt = new Date();
    await prisma.doctor.update({ where: { id: m.doctor.id }, data });
  }
}

export async function confirmMatch(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id"));
  const match = await prisma.doctorClinicMatch.findUniqueOrThrow({ where: { id } });
  if (!match.doctorId) return; // s'ka kandidat — përdor "Krijo mjek të ri"
  await prisma.doctorClinicMatch.update({
    where: { id },
    data: { matchStatus: MatchStatus.CONFIRMED },
  });
  await applyMatchToDoctor(id);
  revalidatePath("/admin/matches");
}

export async function rejectMatch(formData: FormData): Promise<void> {
  await requireAdmin();
  await prisma.doctorClinicMatch.update({
    where: { id: String(formData.get("id")) },
    data: { matchStatus: MatchStatus.REJECTED },
  });
  revalidatePath("/admin/matches");
}

/** NEW_DOCTOR: krijon mjekun nga të dhënat e scraped (source CLINIC_SITE). */
export async function createDoctorFromMatch(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id"));
  const m = await prisma.doctorClinicMatch.findUniqueOrThrow({
    where: { id },
    include: { clinic: true },
  });

  // Specialiteti: përputhje me emrin e scraped, ndryshe Mjek i Përgjithshëm
  let specialty = m.scrapedSpecialty
    ? await prisma.specialty.findFirst({
        where: {
          OR: [
            { nameSq: { equals: m.scrapedSpecialty, mode: "insensitive" } },
            { nameSq: { contains: m.scrapedSpecialty, mode: "insensitive" } },
          ],
        },
      })
    : null;
  specialty ??= await prisma.specialty.findUniqueOrThrow({
    where: { slug: "mjek-i-pergjithshem" },
  });

  const doctor = await prisma.doctor.create({
    data: {
      firstName: m.scrapedFirstName,
      lastName: m.scrapedLastName,
      slug: await uniqueDoctorSlug(m.scrapedFirstName, m.scrapedLastName, specialty.slug),
      specialtyId: specialty.id,
      cityId: m.clinic.cityId,
      clinicId: m.clinicId,
      subSpecialty:
        m.scrapedSpecialty &&
        m.scrapedSpecialty.toLowerCase() !== specialty.nameSq.toLowerCase()
          ? m.scrapedSpecialty
          : null,
      photoSourceUrl: m.photoSourceUrl,
      source: "CLINIC_SITE",
      sourceUrl: m.profileUrl,
      enrichedAt: new Date(),
      status: ContentStatus.APPROVED,
      createdBy: "ADMIN",
    },
  });

  await prisma.doctorClinicMatch.update({
    where: { id },
    data: { matchStatus: MatchStatus.CONFIRMED, doctorId: doctor.id },
  });
  revalidatePath("/admin/matches");
}

// ---------- Vendndodhjet OSM (Faza 4) ----------

const PROTECTED_SOURCES: (AddressSource | null)[] = [
  AddressSource.USER,
  AddressSource.ADMIN,
  AddressSource.PLACES_VERIFIED,
  AddressSource.DOCTOR_VERIFIED,
];

/** Apliko pasurimin OSM te mjeku/klinika e match-uar (respekton prioritetin e burimeve). */
async function applyOsmToTarget(candidateId: string): Promise<void> {
  const m = await prisma.osmCandidate.findUniqueOrThrow({
    where: { id: candidateId },
    include: { matchedDoctor: true, matchedClinic: true },
  });
  const cities = new Map((await prisma.city.findMany()).map((c) => [c.slug, c.id]));

  if (m.matchedDoctor) {
    const d = m.matchedDoctor;
    if (d.createdBy === "USER" || PROTECTED_SOURCES.includes(d.addressSource)) return;
    await prisma.doctor.update({
      where: { id: d.id },
      data: {
        address: m.address ?? d.address,
        phone: m.phone ?? d.phone,
        latitude: m.latitude,
        longitude: m.longitude,
        ...(!d.cityId && m.cityGuess && cities.has(m.cityGuess)
          ? { cityId: cities.get(m.cityGuess) }
          : {}),
        addressSource: AddressSource.OSM,
        enrichedAt: new Date(),
      },
    });
  } else if (m.matchedClinic) {
    const c = m.matchedClinic;
    if (PROTECTED_SOURCES.includes(c.addressSource)) return;
    await prisma.clinic.update({
      where: { id: c.id },
      data: {
        address: c.address ?? m.address,
        phone: c.phone ?? m.phone,
        latitude: m.latitude,
        longitude: m.longitude,
        addressSource: AddressSource.OSM,
      },
    });
  }
}

export async function confirmOsmMatch(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id"));
  await prisma.osmCandidate.update({
    where: { id },
    data: { matchStatus: MatchStatus.CONFIRMED },
  });
  await applyOsmToTarget(id);
  revalidatePath("/admin/osm");
}

export async function rejectOsmCandidate(formData: FormData): Promise<void> {
  await requireAdmin();
  await prisma.osmCandidate.update({
    where: { id: String(formData.get("id")) },
    data: { matchStatus: MatchStatus.REJECTED },
  });
  revalidatePath("/admin/osm");
}

/** UNMATCHED → klinikë e re me source OSM. */
export async function createClinicFromOsm(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id"));
  const citySlug = String(formData.get("citySlug") || "");
  const m = await prisma.osmCandidate.findUniqueOrThrow({ where: { id } });
  const city = await prisma.city.findUnique({
    where: { slug: citySlug || m.cityGuess || "tirane" },
  });
  if (!city) return;

  const clinic = await prisma.clinic.create({
    data: {
      name: m.name,
      slug: await uniqueClinicSlug(m.name),
      cityId: city.id,
      address: m.address,
      phone: m.phone,
      latitude: m.latitude,
      longitude: m.longitude,
      addressSource: AddressSource.OSM,
      source: "OSM",
      status: ContentStatus.APPROVED,
      createdBy: "ADMIN",
    },
  });
  await prisma.osmCandidate.update({
    where: { id },
    data: { matchStatus: MatchStatus.CONFIRMED, matchedClinicId: clinic.id },
  });
  revalidatePath("/admin/osm");
}

// ---------- CRUD Mjekë ----------

export async function updateDoctor(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id"));
  const clinicId = String(formData.get("clinicId") || "");
  await prisma.doctor.update({
    where: { id },
    data: {
      firstName: String(formData.get("firstName")).trim(),
      lastName: String(formData.get("lastName")).trim(),
      specialtyId: String(formData.get("specialtyId")),
      cityId: String(formData.get("cityId") || "") || null,
      clinicId: clinicId || null,
      clinicFreeText: String(formData.get("clinicFreeText") || "").trim() || null,
      address: String(formData.get("address") || "").trim() || null,
      phone: String(formData.get("phone") || "").trim() || null,
      photoUrl: String(formData.get("photoUrl") || "").trim() || null,
      status: String(formData.get("status")) as ContentStatus,
    },
  });
  revalidatePath("/admin/manage");
  redirect("/admin/manage?section=doctors");
}

export async function createDoctor(formData: FormData): Promise<void> {
  await requireAdmin();
  const firstName = String(formData.get("firstName")).trim();
  const lastName = String(formData.get("lastName")).trim();
  const specialtyId = String(formData.get("specialtyId"));
  const specialty = await prisma.specialty.findUniqueOrThrow({ where: { id: specialtyId } });
  await prisma.doctor.create({
    data: {
      firstName,
      lastName,
      slug: await uniqueDoctorSlug(firstName, lastName, specialty.slug),
      specialtyId,
      cityId: String(formData.get("cityId")),
      status: ContentStatus.APPROVED,
      createdBy: "ADMIN",
    },
  });
  revalidatePath("/admin/manage");
}

export async function deleteDoctor(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id"));
  await prisma.$transaction([
    prisma.report.deleteMany({ where: { review: { doctorId: id } } }),
    prisma.review.deleteMany({ where: { doctorId: id } }),
    prisma.doctor.delete({ where: { id } }),
  ]);
  revalidatePath("/admin/manage");
}

// ---------- CRUD Klinika ----------

export async function updateClinic(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id"));
  await prisma.clinic.update({
    where: { id },
    data: {
      name: String(formData.get("name")).trim(),
      cityId: String(formData.get("cityId")),
      address: String(formData.get("address") || "").trim() || null,
      phone: String(formData.get("phone") || "").trim() || null,
      status: String(formData.get("status")) as ContentStatus,
      sectorType: (String(formData.get("sectorType") || "") || null) as SectorType | null,
    },
  });
  revalidatePath("/admin/manage");
  redirect("/admin/manage?section=clinics");
}

export async function createClinic(formData: FormData): Promise<void> {
  await requireAdmin();
  const name = String(formData.get("name")).trim();
  await prisma.clinic.create({
    data: {
      name,
      slug: await uniqueClinicSlug(name),
      cityId: String(formData.get("cityId")),
      status: ContentStatus.APPROVED,
      createdBy: "ADMIN",
    },
  });
  revalidatePath("/admin/manage");
}

export async function deleteClinic(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id"));
  await prisma.$transaction([
    prisma.doctor.updateMany({ where: { clinicId: id }, data: { clinicId: null } }),
    prisma.report.deleteMany({ where: { review: { clinicId: id } } }),
    prisma.review.deleteMany({ where: { clinicId: id } }),
    prisma.clinic.delete({ where: { id } }),
  ]);
  revalidatePath("/admin/manage");
}

// ---------- CRUD Specialitete & Qytete ----------

export async function createSpecialty(formData: FormData): Promise<void> {
  await requireAdmin();
  const nameSq = String(formData.get("nameSq")).trim();
  await prisma.specialty.create({
    data: {
      nameSq,
      nameEn: String(formData.get("nameEn")).trim() || nameSq,
      nameIt: String(formData.get("nameIt")).trim() || nameSq,
      slug: slugify(nameSq),
      icon: String(formData.get("icon") || "stethoscope").trim(),
    },
  });
  revalidatePath("/admin/manage");
}

export async function deleteSpecialty(formData: FormData): Promise<void> {
  await requireAdmin();
  try {
    await prisma.specialty.delete({ where: { id: String(formData.get("id")) } });
  } catch {
    // ka mjekë të lidhur — nuk fshihet
  }
  revalidatePath("/admin/manage");
}

export async function createCity(formData: FormData): Promise<void> {
  await requireAdmin();
  const nameSq = String(formData.get("nameSq")).trim();
  await prisma.city.create({
    data: {
      nameSq,
      nameEn: String(formData.get("nameEn")).trim() || nameSq,
      nameIt: String(formData.get("nameIt")).trim() || nameSq,
      slug: slugify(nameSq),
    },
  });
  revalidatePath("/admin/manage");
}

export async function deleteCity(formData: FormData): Promise<void> {
  await requireAdmin();
  try {
    await prisma.city.delete({ where: { id: String(formData.get("id")) } });
  } catch {
    // ka mjekë/klinika të lidhura — nuk fshihet
  }
  revalidatePath("/admin/manage");
}

// ---------- Faza 6: Mjekë Familjes — lidhja me QSH ----------

/**
 * Lidh një grup mjekësh familjes të zgjedhur (checkbox) me një QSH të vetme.
 * Vendim gjithmonë njerëzor — asnjë guess automatik mjek→QSH (shih koment
 * në scripts/family-doctors/mark-unlinked.ts).
 */
export async function bulkAssignQsh(formData: FormData): Promise<void> {
  await requireAdmin();
  const clinicId = String(formData.get("clinicId") || "");
  const doctorIds = formData.getAll("doctorIds").map(String);
  if (!clinicId || doctorIds.length === 0) return;

  await prisma.doctor.updateMany({
    where: { id: { in: doctorIds } },
    data: { clinicId, familyLinkStatus: "LINKED" },
  });
  revalidatePath("/admin/family-doctors");
}

export async function unlinkFamilyDoctor(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id"));
  await prisma.doctor.update({
    where: { id },
    data: { clinicId: null, familyLinkStatus: "UNLINKED_FAMILY_DOCTOR" },
  });
  revalidatePath("/admin/family-doctors");
}

// ---------- Pretendimet e profilit (Doctor Claim) ----------

/**
 * Aprovon një kërkesë "Je ky mjek?": lidh llogarinë me profilin dhe refuzon
 * automatikisht çdo kërkesë tjetër PENDING për të njëjtin mjek (1 pronar i vetëm).
 */
export async function approveClaim(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id"));
  const claim = await prisma.doctorClaim.findUniqueOrThrow({ where: { id } });

  await prisma.$transaction([
    prisma.doctor.update({
      where: { id: claim.doctorId },
      data: { claimedByUserId: claim.userId },
    }),
    prisma.doctorClaim.update({
      where: { id },
      data: { status: ClaimStatus.APPROVED, reviewedAt: new Date() },
    }),
    prisma.doctorClaim.updateMany({
      where: { doctorId: claim.doctorId, id: { not: id }, status: ClaimStatus.PENDING },
      data: {
        status: ClaimStatus.REJECTED,
        reviewNote: "Profili u caktua tashmë te një kërkesë tjetër",
        reviewedAt: new Date(),
      },
    }),
  ]);
  revalidatePath("/admin/claims");
}

export async function rejectClaim(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id"));
  const reviewNote = String(formData.get("reviewNote") || "").trim() || null;
  await prisma.doctorClaim.update({
    where: { id },
    data: { status: ClaimStatus.REJECTED, reviewNote, reviewedAt: new Date() },
  });
  revalidatePath("/admin/claims");
}

/** Hiq pronësinë e profilit (p.sh. me kërkesë të mjekut ose gabim admini). */
export async function revokeClaim(formData: FormData): Promise<void> {
  await requireAdmin();
  const doctorId = String(formData.get("doctorId"));
  await prisma.doctor.update({
    where: { id: doctorId },
    data: { claimedByUserId: null },
  });
  revalidatePath("/admin/claims");
}

// ---------- Kontestime (DoctorDispute) ----------

export async function dismissDispute(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id"));
  const adminNote = String(formData.get("adminNote") || "").trim() || null;
  await prisma.doctorDispute.update({
    where: { id },
    data: { status: "DISMISSED", adminNote },
  });
  revalidatePath("/admin/disputes");
}

export async function resolveDispute(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id"));
  const adminNote = String(formData.get("adminNote") || "").trim() || null;
  await prisma.doctorDispute.update({
    where: { id },
    data: { status: "RESOLVED", adminNote },
  });
  revalidatePath("/admin/disputes");
}
