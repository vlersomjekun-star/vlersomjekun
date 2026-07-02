import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { updateClinic } from "../../../actions";

export const dynamic = "force-dynamic";

export default async function EditClinicPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [clinic, cities] = await Promise.all([
    prisma.clinic.findUnique({ where: { id } }),
    prisma.city.findMany({ orderBy: { nameSq: "asc" } }),
  ]);
  if (!clinic) notFound();

  const input = "w-full rounded-lg border border-gray-200 p-2 text-sm";
  const label = "mb-1 block text-xs font-semibold text-gray-500";

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-5 text-xl font-bold text-gray-900">Edito: {clinic.name}</h1>
      <form action={updateClinic} className="space-y-4 rounded-xl border border-gray-200 bg-white p-5">
        <input type="hidden" name="id" value={clinic.id} />
        <div>
          <label className={label}>Emri</label>
          <input name="name" defaultValue={clinic.name} required className={input} />
        </div>
        <div>
          <label className={label}>Qyteti</label>
          <select name="cityId" defaultValue={clinic.cityId} className={input}>
            {cities.map((c) => (
              <option key={c.id} value={c.id}>{c.nameSq}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={label}>Adresa</label>
          <input name="address" defaultValue={clinic.address ?? ""} className={input} />
        </div>
        <div>
          <label className={label}>Telefoni</label>
          <input name="phone" defaultValue={clinic.phone ?? ""} className={input} />
        </div>
        <div>
          <label className={label}>Statusi</label>
          <select name="status" defaultValue={clinic.status} className={input}>
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
