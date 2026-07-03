import Link from "next/link";
import { ContentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { approveDoctor, rejectDoctor, approveClinic, rejectClinic } from "../actions";

export const dynamic = "force-dynamic";

export default async function PendingPage() {
  const [doctors, clinics] = await Promise.all([
    prisma.doctor.findMany({
      where: { status: ContentStatus.PENDING },
      include: { specialty: true, city: true, clinic: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.clinic.findMany({
      where: { status: ContentStatus.PENDING },
      include: { city: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const approveBtn =
    "rounded-lg bg-trust px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90";
  const rejectBtn =
    "rounded-lg bg-red-500 px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90";
  const editBtn =
    "rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:border-primary hover:text-primary";

  return (
    <div>
      <h1 className="mb-5 text-xl font-bold text-gray-900">Në pritje të aprovimit</h1>

      <h2 className="mb-3 font-semibold text-gray-800">Mjekë ({doctors.length})</h2>
      {doctors.length === 0 && <p className="mb-6 text-sm text-gray-400">Asnjë mjek në pritje.</p>}
      <div className="mb-8 space-y-3">
        {doctors.map((d) => (
          <div key={d.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4">
            <div className="text-sm">
              <p className="font-semibold text-gray-900">
                Dr. {d.firstName} {d.lastName}
              </p>
              <p className="text-gray-500">
                {d.specialty.nameSq} · {d.city?.nameSq ?? "(pa qytet)"}
                {(d.clinic?.name || d.clinicFreeText) && ` · ${d.clinic?.name ?? d.clinicFreeText}`}
              </p>
              <p className="text-xs text-gray-400">
                {d.address && `${d.address} · `}
                {d.phone && `${d.phone} · `}
                {new Date(d.createdAt).toLocaleDateString("sq-AL")}
              </p>
            </div>
            <div className="flex gap-2">
              <Link href={`/admin/manage/mjek/${d.id}`} className={editBtn}>
                Edito
              </Link>
              <form action={approveDoctor}>
                <input type="hidden" name="id" value={d.id} />
                <button className={approveBtn}>Aprovo</button>
              </form>
              <form action={rejectDoctor}>
                <input type="hidden" name="id" value={d.id} />
                <button className={rejectBtn}>Refuzo</button>
              </form>
            </div>
          </div>
        ))}
      </div>

      <h2 className="mb-3 font-semibold text-gray-800">Klinika ({clinics.length})</h2>
      {clinics.length === 0 && <p className="text-sm text-gray-400">Asnjë klinikë në pritje.</p>}
      <div className="space-y-3">
        {clinics.map((c) => (
          <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4">
            <div className="text-sm">
              <p className="font-semibold text-gray-900">{c.name}</p>
              <p className="text-gray-500">{c.city.nameSq}</p>
              <p className="text-xs text-gray-400">
                {c.address && `${c.address} · `}
                {c.phone && `${c.phone} · `}
                {new Date(c.createdAt).toLocaleDateString("sq-AL")}
              </p>
            </div>
            <div className="flex gap-2">
              <Link href={`/admin/manage/klinike/${c.id}`} className={editBtn}>
                Edito
              </Link>
              <form action={approveClinic}>
                <input type="hidden" name="id" value={c.id} />
                <button className={approveBtn}>Aprovo</button>
              </form>
              <form action={rejectClinic}>
                <input type="hidden" name="id" value={c.id} />
                <button className={rejectBtn}>Refuzo</button>
              </form>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
