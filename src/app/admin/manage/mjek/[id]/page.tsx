import { notFound } from "next/navigation";
import { ContentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { updateDoctor } from "../../../actions";

export const dynamic = "force-dynamic";

export default async function EditDoctorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [doctor, specialties, cities, clinics] = await Promise.all([
    prisma.doctor.findUnique({ where: { id } }),
    prisma.specialty.findMany({ orderBy: { nameSq: "asc" } }),
    prisma.city.findMany({ orderBy: { nameSq: "asc" } }),
    prisma.clinic.findMany({ where: { status: ContentStatus.APPROVED }, orderBy: { name: "asc" } }),
  ]);
  if (!doctor) notFound();

  const input = "w-full rounded-lg border border-gray-200 p-2 text-sm";
  const label = "mb-1 block text-xs font-semibold text-gray-500";

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-5 text-xl font-bold text-gray-900">
        Edito: Dr. {doctor.firstName} {doctor.lastName}
      </h1>
      <form action={updateDoctor} className="space-y-4 rounded-xl border border-gray-200 bg-white p-5">
        <input type="hidden" name="id" value={doctor.id} />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label}>Emri</label>
            <input name="firstName" defaultValue={doctor.firstName} required className={input} />
          </div>
          <div>
            <label className={label}>Mbiemri</label>
            <input name="lastName" defaultValue={doctor.lastName} required className={input} />
          </div>
        </div>
        <div>
          <label className={label}>Specialiteti</label>
          <select name="specialtyId" defaultValue={doctor.specialtyId} className={input}>
            {specialties.map((s) => (
              <option key={s.id} value={s.id}>{s.nameSq}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={label}>Klinika (FK)</label>
          <select name="clinicId" defaultValue={doctor.clinicId ?? ""} className={input}>
            <option value="">— asnjë —</option>
            {clinics.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={label}>Klinika (tekst i lirë)</label>
          <input name="clinicFreeText" defaultValue={doctor.clinicFreeText ?? ""} className={input} />
        </div>
        <div>
          <label className={label}>Qyteti</label>
          <select name="cityId" defaultValue={doctor.cityId ?? ""} className={input}>
            <option value="">— pa qytet (në përditësim) —</option>
            {cities.map((c) => (
              <option key={c.id} value={c.id}>{c.nameSq}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={label}>Adresa</label>
          <input name="address" defaultValue={doctor.address ?? ""} className={input} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label}>Telefoni</label>
            <input name="phone" defaultValue={doctor.phone ?? ""} className={input} />
          </div>
          <div>
            <label className={label}>Foto URL</label>
            <input name="photoUrl" defaultValue={doctor.photoUrl ?? ""} className={input} />
          </div>
        </div>
        <div>
          <label className={label}>Statusi</label>
          <select name="status" defaultValue={doctor.status} className={input}>
            <option value="APPROVED">APPROVED</option>
            <option value="PENDING">PENDING</option>
            <option value="REJECTED">REJECTED</option>
          </select>
        </div>
        <button className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-white hover:bg-primary-dark">
          Ruaj ndryshimet
        </button>
      </form>
    </div>
  );
}
