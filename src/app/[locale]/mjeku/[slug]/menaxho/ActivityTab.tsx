import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";

const DAY_LABELS: Record<string, string> = {
  Mon: "E hënë", Tue: "E martë", Wed: "E mërkurë", Thu: "E enjte",
  Fri: "E premte", Sat: "E shtunë", Sun: "E diel",
};

function formatLogValue(field: string, raw: string | null): string {
  if (!raw) return "—";
  if (field === "scheduleJson") {
    try {
      const parsed = JSON.parse(raw) as Record<string, { open: string; close: string } | null>;
      const lines = Object.entries(parsed)
        .filter(([, v]) => v !== null)
        .map(([k, v]) => `${DAY_LABELS[k] ?? k}: ${v!.open}–${v!.close}`);
      return lines.length > 0 ? lines.join(", ") : "—";
    } catch {
      return raw;
    }
  }
  return raw;
}

const FIELD_LABELS: Record<string, string> = {
  photoUrl:     "Foto",
  subSpecialty: "Nën-specialiteti",
  address:      "Adresa",
  phone:        "Telefoni",
  clinicId:     "Klinika",
  bio:          "Bio",
  yearsExp:     "Vitet e eksperiencës",
  languages:    "Gjuhët",
  websiteUrl1:  "Faqja web 1",
  websiteUrl2:  "Faqja web 2",
  scheduleJson: "Orari",
};

export default async function ActivityTab({ doctorId }: { doctorId: string }) {
  const t = await getTranslations("profile");

  const logs = await prisma.doctorProfileLog.findMany({
    where: { doctorId },
    orderBy: { changedAt: "desc" },
    take: 200,
  });

  if (logs.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-gray-200 py-10 text-center text-sm text-gray-400">
        {t("activityEmpty")}
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-sm">
      <table className="w-full text-sm">
        <thead className="border-b border-gray-100 bg-gray-50 text-xs font-semibold text-gray-500">
          <tr>
            <th className="px-4 py-3 text-left">{t("activityFieldLabel")}</th>
            <th className="px-4 py-3 text-left">{t("activityOldLabel")}</th>
            <th className="px-4 py-3 text-left">{t("activityNewLabel")}</th>
            <th className="px-4 py-3 text-left whitespace-nowrap">{t("activityDateLabel")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {logs.map((log) => (
            <tr key={log.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 font-medium text-gray-700">
                {FIELD_LABELS[log.field] ?? log.field}
              </td>
              <td className="max-w-[180px] truncate px-4 py-3 text-gray-400">
                {formatLogValue(log.field, log.oldValue)}
              </td>
              <td className="max-w-[180px] truncate px-4 py-3 text-gray-700">
                {formatLogValue(log.field, log.newValue)}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-gray-400">
                {log.changedAt.toLocaleDateString("sq-AL", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
