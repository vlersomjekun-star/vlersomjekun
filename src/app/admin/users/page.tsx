import { UserStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { banUser, unbanUser, removeAllUserReviews } from "../actions";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const users = await prisma.user.findMany({
    where: q ? { email: { contains: q, mode: "insensitive" } } : undefined,
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { _count: { select: { reviews: true, comments: true } } },
  });

  return (
    <div>
      <h1 className="mb-5 text-xl font-bold text-gray-900">Përdoruesit</h1>

      <form method="GET" className="mb-5 flex gap-2">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Kërko me email..."
          className="w-full max-w-sm rounded-lg border border-gray-200 p-2 text-sm outline-none focus:border-primary"
        />
        <button className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark">
          Kërko
        </button>
      </form>

      {users.length === 0 && <p className="text-sm text-gray-400">Asnjë përdorues.</p>}
      <div className="space-y-2">
        {users.map((u) => (
          <div
            key={u.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm"
          >
            <div>
              <p className="font-semibold text-gray-900">
                {u.email}{" "}
                <span
                  className={`ml-1 rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                    u.status === UserStatus.BANNED
                      ? "bg-red-100 text-red-600"
                      : "bg-trust-light text-trust"
                  }`}
                >
                  {u.status}
                </span>
                {!u.emailVerified && (
                  <span className="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                    PA VERIFIKUAR
                  </span>
                )}
              </p>
              <p className="text-xs text-gray-500">
                {u.nickname ?? "(pa nofkë)"} · {u.provider} · {u._count.reviews} vlerësime ·{" "}
                {u._count.comments} komente · regjistruar{" "}
                {new Date(u.createdAt).toLocaleDateString("sq-AL")}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {u.status === UserStatus.ACTIVE ? (
                <form action={banUser}>
                  <input type="hidden" name="id" value={u.id} />
                  <button className="rounded-lg bg-red-500 px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90">
                    Ban
                  </button>
                </form>
              ) : (
                <form action={unbanUser}>
                  <input type="hidden" name="id" value={u.id} />
                  <button className="rounded-lg bg-trust px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90">
                    Unban
                  </button>
                </form>
              )}
              {u._count.reviews > 0 && (
                <form action={removeAllUserReviews}>
                  <input type="hidden" name="id" value={u.id} />
                  <button className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-500 hover:bg-red-50">
                    Hiq të gjitha vlerësimet
                  </button>
                </form>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
