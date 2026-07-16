import Link from "next/link";
import { ClaimStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { approveClaim, rejectClaim, revokeClaim } from "../actions";

export const dynamic = "force-dynamic";

export default async function ClaimsPage() {
  const [pending, approved] = await Promise.all([
    prisma.doctorClaim.findMany({
      where: { status: ClaimStatus.PENDING },
      include: {
        doctor: { include: { specialty: true, city: true } },
        user: { select: { email: true, nickname: true, createdAt: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.doctor.findMany({
      where: { claimedByUserId: { not: null } },
      include: { claimedByUser: { select: { email: true, nickname: true } } },
      orderBy: { firstName: "asc" },
    }),
  ]);

  return (
    <div>
      <h1 className="mb-5 text-xl font-bold text-gray-900">Pretendime profili (&quot;Je ky mjek?&quot;)</h1>
      <p className="mb-5 text-xs text-gray-400">
        Miratimi është gjithmonë njerëzor — nuk ka verifikim automatik identiteti.
        Kontrollo mesazhin e kërkuesit (nr. licence, email pune, telefon) përpara aprovimit.
      </p>

      <h2 className="mb-3 font-semibold text-gray-800">Në pritje ({pending.length})</h2>
      {pending.length === 0 && <p className="mb-8 text-sm text-gray-400">Asnjë kërkesë në pritje.</p>}
      <div className="mb-8 space-y-3">
        {pending.map((c) => (
          <div key={c.id} className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="mb-2 flex flex-wrap items-center gap-2 text-sm">
              <Link href={`/mjeku/${c.doctor.slug}`} target="_blank" className="font-semibold text-primary hover:underline">
                Dr. {c.doctor.firstName} {c.doctor.lastName}
              </Link>
              <span className="text-gray-400">
                {c.doctor.specialty.nameSq} · {c.doctor.city?.nameSq ?? "(pa qytet)"}
              </span>
            </div>
            <p className="mb-2 text-xs text-gray-500">
              Kërkuesi: <b>{c.user.email}</b> ({c.user.nickname ?? "pa nofkë"}) · llogari krijuar{" "}
              {new Date(c.user.createdAt).toLocaleDateString("sq-AL")} · kërkesë{" "}
              {new Date(c.createdAt).toLocaleDateString("sq-AL")}
            </p>
            {c.message && (
              <p className="mb-3 whitespace-pre-line rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
                {c.message}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <form action={approveClaim}>
                <input type="hidden" name="id" value={c.id} />
                <button className="rounded-lg bg-trust px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90">
                  Aprovo
                </button>
              </form>
              <form action={rejectClaim} className="flex items-center gap-2">
                <input type="hidden" name="id" value={c.id} />
                <input
                  name="reviewNote"
                  placeholder="Arsyeja e refuzimit (opsionale)"
                  className="rounded-lg border border-gray-200 p-1.5 text-xs"
                />
                <button className="rounded-lg bg-red-500 px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90">
                  Refuzo
                </button>
              </form>
            </div>
          </div>
        ))}
      </div>

      <h2 className="mb-3 font-semibold text-gray-800">Profile të pretenduara ({approved.length})</h2>
      {approved.length === 0 && <p className="text-sm text-gray-400">Asnjë profil i pretenduar ende.</p>}
      <div className="space-y-2">
        {approved.map((d) => (
          <div key={d.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm">
            <span>
              <Link href={`/mjeku/${d.slug}`} target="_blank" className="font-semibold text-primary hover:underline">
                Dr. {d.firstName} {d.lastName}
              </Link>{" "}
              → {d.claimedByUser?.email} ({d.claimedByUser?.nickname ?? "pa nofkë"})
            </span>
            <div className="flex items-center gap-2">
              <Link
                href={`/admin/doctor-audit/${d.id}`}
                className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-500 hover:bg-gray-50"
              >
                Log auditimi
              </Link>
              <form action={revokeClaim}>
                <input type="hidden" name="doctorId" value={d.id} />
                <button className="rounded-lg border border-red-300 px-2.5 py-1 text-xs font-semibold text-red-500 hover:bg-red-50">
                  Hiq pronësinë
                </button>
              </form>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
