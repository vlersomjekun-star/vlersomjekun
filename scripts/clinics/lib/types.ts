export type ScrapedDoctor = {
  firstName: string;
  lastName: string;
  specialty?: string | null;
  title?: string | null; // "Dr.", "Prof. Dr.", etj.
  photoUrl?: string | null; // VETËM referencë e brendshme — nuk shkarkohet/ripublikohet
  profileUrl?: string | null;
  clinicSlug: string;
};

export type ClinicInfo = {
  slug: string; // slug në DB (përputhet me seed-in ku ekziston)
  name: string;
  citySlug: string;
  address?: string;
  phone?: string;
};

export type SiteScraper = {
  clinic: ClinicInfo;
  staffUrl: string;
  /** Nëse gjenden më pak mjekë se kaq → struktura e faqes ka ndryshuar → dështo loud. */
  minExpected: number;
  parse: (html: string) => ScrapedDoctor[];
};
