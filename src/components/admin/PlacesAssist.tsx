"use client";

/**
 * Assist-mode Google Places — vendim njerëzor një-nga-një nga admini.
 * ⚠️ Bulk import from Places is prohibited by Google Maps Platform ToS —
 * do not automate this flow.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Search } from "lucide-react";

type Candidate = {
  placeId: string;
  name: string;
  address: string;
  phone: string | null;
  latitude: number | null;
  longitude: number | null;
};

export default function PlacesAssist({
  type,
  id,
}: {
  type: "doctor" | "clinic";
  id: string;
}) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "searching" | "results" | "applying" | "done" | "error">("idle");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function search() {
    setState("searching");
    setError(null);
    try {
      const res = await fetch("/api/admin/places-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(
          data.error === "QUOTA_EXCEEDED"
            ? "Kufiri ditor i Places u arrit (100/ditë). Provo nesër."
            : data.error === "PLACES_DISABLED"
              ? "GOOGLE_PLACES_API_KEY nuk është konfiguruar."
              : "Kërkimi dështoi."
        );
        setState("error");
        return;
      }
      setCandidates(data.candidates);
      setRemaining(data.remaining);
      setState("results");
    } catch {
      setError("Kërkimi dështoi.");
      setState("error");
    }
  }

  async function accept(candidate: Candidate) {
    setState("applying");
    try {
      const res = await fetch("/api/admin/places-apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, id, candidate }),
      });
      if (!res.ok) throw new Error();
      setState("done");
      router.refresh();
    } catch {
      setError("Ruajtja dështoi.");
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <p className="rounded-lg bg-trust-light p-3 text-sm font-medium text-trust">
        ✓ U ruajt me burim PLACES_VERIFIED.
      </p>
    );
  }

  return (
    <div className="rounded-xl border border-dashed border-gray-300 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-gray-500">
          Verifikim i asistuar me Google Places — vendim manual, një-nga-një.
          {remaining != null && ` Kërkesa të mbetura sot: ${remaining}/100.`}
        </p>
        <button
          type="button"
          onClick={search}
          disabled={state === "searching"}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-primary px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary-light disabled:opacity-50"
        >
          <Search size={13} aria-hidden />
          {state === "searching" ? "Duke kërkuar..." : "Kërko në Places"}
        </button>
      </div>

      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}

      {state === "results" && (
        <div className="mt-3 space-y-2">
          {candidates.length === 0 && (
            <p className="text-xs text-gray-400">Asnjë rezultat në Places.</p>
          )}
          {candidates.map((c) => (
            <div
              key={c.placeId}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-gray-50 p-3 text-sm"
            >
              <div>
                <p className="font-semibold text-gray-800">{c.name}</p>
                <p className="flex items-center gap-1 text-xs text-gray-500">
                  <MapPin size={11} aria-hidden />
                  {c.address}
                  {c.phone && ` · ${c.phone}`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => accept(c)}
                className="rounded-lg bg-trust px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
              >
                Prano
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
