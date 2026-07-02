import { prisma } from "./prisma";

export function slugify(...parts: string[]): string {
  return parts
    .join(" ")
    .toLowerCase()
    .replace(/ë/g, "e")
    .replace(/ç/g, "c")
    .replace(/[àáâä]/g, "a")
    .replace(/[èéêë]/g, "e")
    .replace(/[ìíîï]/g, "i")
    .replace(/[òóôö]/g, "o")
    .replace(/[ùúûü]/g, "u")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

/** Slug unik për mjekun: emri-mbiemri-specialiteti, me suffiks numerik në kolizion. */
export async function uniqueDoctorSlug(firstName: string, lastName: string, specialtySlug: string): Promise<string> {
  const base = slugify(firstName, lastName, specialtySlug);
  let slug = base;
  let n = 2;
  while (await prisma.doctor.findUnique({ where: { slug }, select: { id: true } })) {
    slug = `${base}-${n++}`;
  }
  return slug;
}

export async function uniqueClinicSlug(name: string): Promise<string> {
  const base = slugify(name);
  let slug = base;
  let n = 2;
  while (await prisma.clinic.findUnique({ where: { slug }, select: { id: true } })) {
    slug = `${base}-${n++}`;
  }
  return slug;
}
