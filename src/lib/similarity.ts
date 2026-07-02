/**
 * Similarity trigram (Jaccard) mes dy teksteve, 0..1.
 * Përdoret për të kapur reviews "fotokopje" (≥0.8 → moderim).
 */
function trigrams(text: string): Set<string> {
  const normalized = text
    .toLowerCase()
    .replace(/[^a-zëç0-9\s]/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  const grams = new Set<string>();
  const padded = `  ${normalized} `;
  for (let i = 0; i < padded.length - 2; i++) {
    grams.add(padded.slice(i, i + 3));
  }
  return grams;
}

export function textSimilarity(a: string, b: string): number {
  const ta = trigrams(a);
  const tb = trigrams(b);
  if (ta.size === 0 || tb.size === 0) return 0;
  let intersection = 0;
  for (const g of ta) if (tb.has(g)) intersection++;
  return intersection / (ta.size + tb.size - intersection);
}
