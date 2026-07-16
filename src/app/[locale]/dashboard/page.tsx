import { notFound } from "next/navigation";
import { ContentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/user-guard";
import { redirect } from "@/i18n/navigation";

export const dynamic = "force-dynamic";

/**
 * Redirect intelligente: trova il profilo medico dell'utente loggato
 * e lo manda su /mjeku/[slug]/menaxho. Se non ha un profilo verificato,
 * mostra un messaggio esplicativo.
 */
export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const user = await getSessionUser();

  if (!user) {
    redirect({ href: "/identifikohu?callbackUrl=/dashboard", locale });
  }

  // Trova il medico associato a questo utente
  const doctor = await prisma.doctor.findFirst({
    where: {
      claimedByUserId: user!.id,
      status: ContentStatus.APPROVED,
    },
    select: { slug: true },
  });

  if (!doctor) {
    // Controlla se c'è un claim pendente
    const pendingClaim = await prisma.doctorClaim.findFirst({
      where: { userId: user!.id, status: "PENDING" },
      include: { doctor: { select: { firstName: true, lastName: true, slug: true } } },
    });

    if (pendingClaim) {
      redirect({
        href: `/mjeku/${pendingClaim.doctor.slug}`,
        locale,
      });
    }

    notFound();
  }

  redirect({ href: `/mjeku/${doctor.slug}/menaxho`, locale });
}
