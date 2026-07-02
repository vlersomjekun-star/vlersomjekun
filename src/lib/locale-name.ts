type Named = { nameSq: string; nameEn: string; nameIt: string };

/** Emri i përkthyer i një City/Specialty sipas locale-it aktiv. */
export function localName(obj: Named, locale: string): string {
  if (locale === "en") return obj.nameEn;
  if (locale === "it") return obj.nameIt;
  return obj.nameSq;
}
