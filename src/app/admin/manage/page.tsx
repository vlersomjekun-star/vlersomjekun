import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  createDoctor,
  deleteDoctor,
  createClinic,
  deleteClinic,
  createSpecialty,
  deleteSpecialty,
  createCity,
  deleteCity,
} from "../actions";

export const dynamic = "force-dynamic";

const SECTIONS = [
  ["doctors", "Mjekë"],
  ["clinics", "Klinika"],
  ["specialties", "Specialitete"],
  ["cities", "Qytete"],
] as const;

const input = "rounded-lg border border-gray-200 p-2 text-sm";
const deleteBtn = "rounded-lg bg-red-500 px-2.5 py-1 text-xs font-semibold text-white hover:opacity-90";
const createBtn = "rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white hover:bg-primary-dark";

export default async function ManagePage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string }>;
}) {
  const { section = "doctors" } = await searchParams;

  const [specialties, cities] = await Promise.all([
    prisma.specialty.findMany({ orderBy: { nameSq: "asc" } }),
    prisma.city.findMany({ orderBy: { nameSq: "asc" } }),
  ]);

  return (
    <div>
      <h1 className="mb-5 text-xl font-bold text-gray-900">Menaxho të dhënat</h1>
      <div className="mb-5 flex gap-2 border-b border-gray-200">
        {SECTIONS.map(([key, label]) => (
          <Link
            key={key}
            href={`/admin/manage?section=${key}`}
            className={`border-b-2 px-4 py-2 text-sm font-semibold ${
              section === key
                ? "border-primary text-primary"
                : "border-transparent text-gray-400 hover:text-gray-600"
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      {section === "doctors" && (
        <>
          <form action={createDoctor} className="mb-5 flex flex-wrap items-end gap-2 rounded-xl border border-gray-200 bg-white p-4">
            <input name="firstName" required placeholder="Emri" className={input} />
            <input name="lastName" required placeholder="Mbiemri" className={input} />
            <select name="specialtyId" required defaultValue="" className={input}>
              <option value="" disabled>Specialiteti</option>
              {specialties.map((s) => (
                <option key={s.id} value={s.id}>{s.nameSq}</option>
              ))}
            </select>
            <select name="cityId" required defaultValue="" className={input}>
              <option value="" disabled>Qyteti</option>
              {cities.map((c) => (
                <option key={c.id} value={c.id}>{c.nameSq}</option>
              ))}
            </select>
            <button className={createBtn}>+ Shto mjek</button>
          </form>
          <DoctorList />
        </>
      )}

      {section === "clinics" && (
        <>
          <form action={createClinic} className="mb-5 flex flex-wrap items-end gap-2 rounded-xl border border-gray-200 bg-white p-4">
            <input name="name" required placeholder="Emri i klinikës" className={input} />
            <select name="cityId" required defaultValue="" className={input}>
              <option value="" disabled>Qyteti</option>
              {cities.map((c) => (
                <option key={c.id} value={c.id}>{c.nameSq}</option>
              ))}
            </select>
            <button className={createBtn}>+ Shto klinikë</button>
          </form>
          <ClinicList />
        </>
      )}

      {section === "specialties" && (
        <>
          <form action={createSpecialty} className="mb-5 flex flex-wrap items-end gap-2 rounded-xl border border-gray-200 bg-white p-4">
            <input name="nameSq" required placeholder="Emri shqip" className={input} />
            <input name="nameEn" placeholder="English" className={input} />
            <input name="nameIt" placeholder="Italiano" className={input} />
            <input name="icon" placeholder="ikonë lucide (p.sh. brain)" className={input} />
            <button className={createBtn}>+ Shto</button>
          </form>
          <div className="grid gap-2 sm:grid-cols-2">
            {specialties.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm">
                <span>
                  <b>{s.nameSq}</b> · {s.nameEn} · {s.nameIt}{" "}
                  <span className="text-xs text-gray-400">({s.icon})</span>
                </span>
                <form action={deleteSpecialty}>
                  <input type="hidden" name="id" value={s.id} />
                  <button className={deleteBtn}>Fshi</button>
                </form>
              </div>
            ))}
          </div>
        </>
      )}

      {section === "cities" && (
        <>
          <form action={createCity} className="mb-5 flex flex-wrap items-end gap-2 rounded-xl border border-gray-200 bg-white p-4">
            <input name="nameSq" required placeholder="Emri shqip" className={input} />
            <input name="nameEn" placeholder="English" className={input} />
            <input name="nameIt" placeholder="Italiano" className={input} />
            <button className={createBtn}>+ Shto</button>
          </form>
          <div className="grid gap-2 sm:grid-cols-2">
            {cities.map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm">
                <span>
                  <b>{c.nameSq}</b> · {c.nameEn} · {c.nameIt}
                </span>
                <form action={deleteCity}>
                  <input type="hidden" name="id" value={c.id} />
                  <button className={deleteBtn}>Fshi</button>
                </form>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

async function DoctorList() {
  const doctors = await prisma.doctor.findMany({
    include: { specialty: true, city: true, clinic: true },
    orderBy: [{ status: "asc" }, { lastName: "asc" }],
  });
  return (
    <div className="space-y-2">
      {doctors.map((d) => (
        <div key={d.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm">
          <span>
            <b>Dr. {d.firstName} {d.lastName}</b> · {d.specialty.nameSq} · {d.city?.nameSq ?? "(pa qytet)"}
            {d.clinic && ` · ${d.clinic.name}`}{" "}
            <StatusBadge status={d.status} />
            <span className="ml-1 text-xs text-gray-400">
              ★{d.avgRating.toFixed(1)} ({d.reviewCount})
            </span>
          </span>
          <span className="flex gap-2">
            <Link
              href={`/admin/manage/mjek/${d.id}`}
              className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-semibold text-gray-600 hover:border-primary hover:text-primary"
            >
              Edito
            </Link>
            <form action={deleteDoctor}>
              <input type="hidden" name="id" value={d.id} />
              <button className={deleteBtn}>Fshi</button>
            </form>
          </span>
        </div>
      ))}
    </div>
  );
}

async function ClinicList() {
  const clinics = await prisma.clinic.findMany({
    include: { city: true, _count: { select: { doctors: true } } },
    orderBy: [{ status: "asc" }, { name: "asc" }],
  });
  return (
    <div className="space-y-2">
      {clinics.map((c) => (
        <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm">
          <span>
            <b>{c.name}</b> · {c.city.nameSq} · {c._count.doctors} mjekë{" "}
            <StatusBadge status={c.status} />
            <span className="ml-1 text-xs text-gray-400">
              ★{c.avgRating.toFixed(1)} ({c.reviewCount})
            </span>
          </span>
          <span className="flex gap-2">
            <Link
              href={`/admin/manage/klinike/${c.id}`}
              className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-semibold text-gray-600 hover:border-primary hover:text-primary"
            >
              Edito
            </Link>
            <form action={deleteClinic}>
              <input type="hidden" name="id" value={c.id} />
              <button className={deleteBtn}>Fshi</button>
            </form>
          </span>
        </div>
      ))}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    APPROVED: "bg-trust-light text-trust",
    PENDING: "bg-amber-100 text-amber-700",
    REJECTED: "bg-red-100 text-red-600",
  };
  return (
    <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${styles[status] ?? ""}`}>
      {status}
    </span>
  );
}
