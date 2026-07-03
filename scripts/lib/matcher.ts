/**
 * Përputhja e mjekëve të scraped me bazën UMSH.
 *
 * - exact match (emër+mbiemër të normalizuar, 1 kandidat i vetëm) → AUTO_MATCHED
 * - fuzzy (Levenshtein ≥0.85) OSE mbiemër identik + nistore e njëjtë → NEEDS_REVIEW
 * - 2+ kandidatë me të njëjtin emër → NEEDS_REVIEW gjithmonë (kurrë auto)
 * - asnjë kandidat → NEW_DOCTOR
 */

export type UmshDoctor = {
  id: string;
  firstName: string;
  lastName: string;
  specialtyName: string;
};

export type MatchResult = {
  status: "AUTO_MATCHED" | "NEEDS_REVIEW" | "NEW_DOCTOR";
  doctorId: string | null;
  score: number | null;
};

const TITLE_RE =
  /\b(dr\.?\s*shk\.?|prof\.?\s*(asoc\.?)?|dr\.?|doc\.?|msc\.?|phd\.?|as\.?|mjek(e|ja)?)\b/gi;

/** Nxjerr titullin akademik dhe emrin e pastër nga teksti i faqes. */
export function parseScrapedName(raw: string): {
  firstName: string;
  lastName: string;
  title: string | null;
} {
  const titles = raw.match(/^((\s*(Prof|Dr|Doc|Msc|PhD|As)\.?\s*(Shk\.?|Asoc\.?)?)+)/i)?.[0]?.trim() ?? null;
  const cleaned = raw
    .replace(TITLE_RE, " ")
    .replace(/\([^)]*\)/g, " ") // hiq mbiemrat në kllapa (p.sh. mbiemri i vajzërisë)
    .replace(/[^\p{L}\s'-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  const parts = cleaned.split(" ");
  const firstName = parts[0] ?? "";
  const lastName = parts.slice(1).join(" ");
  return { firstName, lastName, title: titles };
}

/** Normalizim për krahasim: lowercase, ç→c, ë→e (origjinali ruhet gjetkë). */
export function normalizeForCompare(s: string): string {
  return s
    .toLowerCase()
    .replace(/ç/g, "c")
    .replace(/ë/g, "e")
    .replace(/[^a-z\s'-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const curr = [i];
    for (let j = 1; j <= n; j++) {
      curr[j] = Math.min(
        prev[j] + 1,
        curr[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
    prev = curr;
  }
  return prev[n];
}

export function nameSimilarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 0;
  return 1 - levenshtein(a, b) / maxLen;
}

export class Matcher {
  private byExactKey = new Map<string, UmshDoctor[]>();
  private all: (UmshDoctor & { normFull: string; normFirst: string; normLast: string })[];

  constructor(umshDoctors: UmshDoctor[]) {
    this.all = umshDoctors.map((d) => ({
      ...d,
      normFirst: normalizeForCompare(d.firstName),
      normLast: normalizeForCompare(d.lastName),
      normFull: normalizeForCompare(`${d.firstName} ${d.lastName}`),
    }));
    for (const d of this.all) {
      const key = `${d.normFirst}|${d.normLast}`;
      const list = this.byExactKey.get(key) ?? [];
      list.push(d);
      this.byExactKey.set(key, list);
    }
  }

  match(firstName: string, lastName: string): MatchResult {
    const normFirst = normalizeForCompare(firstName);
    const normLast = normalizeForCompare(lastName);
    const normFull = `${normFirst} ${normLast}`.trim();

    // 1. Exact
    const exact = this.byExactKey.get(`${normFirst}|${normLast}`) ?? [];
    if (exact.length === 1) {
      return { status: "AUTO_MATCHED", doctorId: exact[0].id, score: 1.0 };
    }
    if (exact.length > 1) {
      // Disambiguim i pamundur pa kontekst → gjithmonë review
      return { status: "NEEDS_REVIEW", doctorId: exact[0].id, score: 1.0 };
    }

    // 2. Fuzzy
    let best: { d: UmshDoctor; score: number } | null = null;
    let bestCount = 0;
    for (const d of this.all) {
      let score = 0;
      const sim = nameSimilarity(normFull, d.normFull);
      if (sim >= 0.85) score = sim;
      else if (d.normLast === normLast && d.normFirst[0] === normFirst[0] && normLast.length >= 3) {
        score = 0.85; // mbiemër identik + nistore e njëjtë
      }
      if (score > 0) {
        if (!best || score > best.score) {
          best = { d, score };
          bestCount = 1;
        } else if (score === best.score) {
          bestCount++;
        }
      }
    }
    if (best) {
      return {
        status: "NEEDS_REVIEW",
        doctorId: bestCount === 1 ? best.d.id : null,
        score: Math.round(best.score * 100) / 100,
      };
    }

    // 3. Asgjë
    return { status: "NEW_DOCTOR", doctorId: null, score: null };
  }
}
