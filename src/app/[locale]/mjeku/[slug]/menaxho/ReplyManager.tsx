"use client";

import { useActionState } from "react";
import { CheckCircle2, Pencil, Trash2, Lock } from "lucide-react";
import { useTranslations } from "next-intl";
import { upsertDoctorReply, deleteDoctorReply, type ManageState } from "./actions";

const REPLY_LOCK_MS = 48 * 60 * 60 * 1000;

export default function ReplyManager({
  reviewId,
  doctorId,
  existingReply,
}: {
  reviewId: string;
  doctorId: string;
  existingReply: { id: string; text: string; createdAt: Date } | null;
}) {
  const t = useTranslations("profile");
  const [upsertState, upsertAction, upsertPending] = useActionState<ManageState, FormData>(
    upsertDoctorReply,
    { status: "idle" }
  );
  const [deleteState, deleteAction, deletePending] = useActionState<ManageState, FormData>(
    deleteDoctorReply,
    { status: "idle" }
  );

  const isLocked =
    existingReply != null &&
    Date.now() - new Date(existingReply.createdAt).getTime() > REPLY_LOCK_MS;
  const isDeleted = deleteState.status === "ok";

  const textareaClass =
    "w-full rounded-lg border border-gray-200 p-2.5 text-sm text-gray-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 resize-y";

  // Dopo l'upsert riuscito, mostra il testo salvato
  if (upsertState.status === "ok") {
    return (
      <div className="mt-3 flex items-center gap-2 rounded-lg bg-green-50 p-3 text-sm text-green-700">
        <CheckCircle2 size={16} aria-hidden />
        {t("manageSaved")}
      </div>
    );
  }

  // Risposta eliminata
  if (isDeleted) {
    return null;
  }

  // Risposta esistente: mostra testo + pulsanti modifica/elimina
  if (existingReply && !isDeleted) {
    return (
      <div className="mt-3 space-y-2">
        <p className="text-xs font-semibold text-gray-500">{t("replyDoctorLabel")}</p>
        <p className="rounded-lg bg-blue-50 p-3 text-sm text-gray-700">{existingReply.text}</p>

        {isLocked ? (
          <p className="flex items-center gap-1 text-xs text-gray-400">
            <Lock size={12} aria-hidden />
            {t("replyLocked")}
          </p>
        ) : (
          <div className="flex gap-2">
            {/* Modifica: mostra inline form */}
            <EditReplyForm
              reviewId={reviewId}
              doctorId={doctorId}
              initialText={existingReply.text}
              upsertAction={upsertAction}
              upsertPending={upsertPending}
              upsertError={upsertState.status === "error" ? upsertState.error : null}
              t={t}
            />
            {/* Elimina */}
            <form action={deleteAction}>
              <input type="hidden" name="reviewId" value={reviewId} />
              <button
                type="submit"
                disabled={deletePending}
                className="flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                <Trash2 size={12} aria-hidden />
                {t("replyDelete")}
              </button>
            </form>
          </div>
        )}
        {deleteState.status === "error" && (
          <p role="alert" className="text-xs text-red-600">{t("replyError")}</p>
        )}
      </div>
    );
  }

  // Nessuna risposta: mostra form per creare
  return (
    <div className="mt-3 space-y-2">
      <p className="text-xs font-semibold text-gray-600">{t("replyTitle")}</p>
      <form action={upsertAction} className="space-y-2">
        <input type="hidden" name="reviewId" value={reviewId} />
        <input type="hidden" name="doctorId" value={doctorId} />
        <textarea
          name="text"
          required
          maxLength={1000}
          rows={3}
          placeholder={t("replyPlaceholder")}
          className={textareaClass}
        />
        <p className="text-xs text-gray-400">{t("replyHint")}</p>
        {upsertState.status === "error" && (
          <p role="alert" className="text-xs text-red-600">{t("replyError")}</p>
        )}
        <button
          type="submit"
          disabled={upsertPending}
          className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-50"
        >
          {t("replySubmit")}
        </button>
      </form>
    </div>
  );
}

// Sotto-componente inline per la modifica
function EditReplyForm({
  reviewId,
  doctorId,
  initialText,
  upsertAction,
  upsertPending,
  upsertError,
  t,
}: {
  reviewId: string;
  doctorId: string;
  initialText: string;
  upsertAction: (payload: FormData) => void;
  upsertPending: boolean;
  upsertError: string | null | undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: (key: any) => string;
}) {
  const textareaClass =
    "w-full rounded-lg border border-gray-200 p-2.5 text-sm text-gray-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 resize-y";

  return (
    <details className="group flex-1">
      <summary className="flex cursor-pointer list-none items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50">
        <Pencil size={12} aria-hidden />
        {t("replyEdit")}
      </summary>
      <form action={upsertAction} className="mt-2 space-y-2">
        <input type="hidden" name="reviewId" value={reviewId} />
        <input type="hidden" name="doctorId" value={doctorId} />
        <textarea
          name="text"
          required
          maxLength={1000}
          rows={3}
          defaultValue={initialText}
          className={textareaClass}
        />
        {upsertError && (
          <p role="alert" className="text-xs text-red-600">{t("replyError")}</p>
        )}
        <button
          type="submit"
          disabled={upsertPending}
          className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-50"
        >
          {t("manageSave")}
        </button>
      </form>
    </details>
  );
}
