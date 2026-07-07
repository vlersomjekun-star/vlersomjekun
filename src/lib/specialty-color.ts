export type SpecialtyColor = { bg: string; text: string; border: string };

const MAP: Record<string, SpecialtyColor> = {
  dentist:       { bg: "#EAF3EE", text: "#1a7d5e", border: "#B6D9C9" },
  kardiolog:     { bg: "#FEE2E2", text: "#B91C1C", border: "#FECACA" },
  gjinekolog:    { bg: "#FEF9C3", text: "#854D0E", border: "#FDE047" },
  pediater:      { bg: "#DBEAFE", text: "#1E40AF", border: "#BFDBFE" },
  dermatolog:    { bg: "#FCE7F3", text: "#9D174D", border: "#FBCFE8" },
  psikolog:      { bg: "#EDE9FE", text: "#5B21B6", border: "#DDD6FE" },
  okulista:      { bg: "#DCFCE7", text: "#14532D", border: "#BBF7D0" },
  ortoped:       { bg: "#FCF1DD", text: "#9A6B14", border: "#FCD34D" },
  neurologjist:  { bg: "#E0E7FF", text: "#3730A3", border: "#C7D2FE" },
  endokrinolog:  { bg: "#FFF7ED", text: "#9A3412", border: "#FED7AA" },
  urolog:        { bg: "#F0FDF4", text: "#166534", border: "#BBF7D0" },
  kirurg:        { bg: "#FDF4FF", text: "#7E22CE", border: "#E9D5FF" },
  onkolog:       { bg: "#FFF1F2", text: "#9F1239", border: "#FFE4E6" },
  nefrolog:      { bg: "#F0F9FF", text: "#0369A1", border: "#BAE6FD" },
  reumatolog:    { bg: "#FDF2F8", text: "#86198F", border: "#F5D0FE" },
  pulmonolog:    { bg: "#ECFDF5", text: "#065F46", border: "#A7F3D0" },
  gastroenterolog: { bg: "#FFFBEB", text: "#78350F", border: "#FDE68A" },
  infeksionist:  { bg: "#F0FDF4", text: "#14532D", border: "#86EFAC" },
};

const PALETTE: SpecialtyColor[] = [
  { bg: "#EAF3EE", text: "#1a7d5e", border: "#B6D9C9" },
  { bg: "#DBEAFE", text: "#1E40AF", border: "#BFDBFE" },
  { bg: "#FDE68A", text: "#92400E", border: "#FCD34D" },
  { bg: "#EDE9FE", text: "#5B21B6", border: "#DDD6FE" },
  { bg: "#FCF1DD", text: "#9A6B14", border: "#FCD34D" },
  { bg: "#DCFCE7", text: "#14532D", border: "#BBF7D0" },
  { bg: "#FEE2E2", text: "#B91C1C", border: "#FECACA" },
  { bg: "#F0E7FF", text: "#6D28D9", border: "#DDD6FE" },
];

function hashSlug(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h;
}

export function colorForSpecialty(slug: string): SpecialtyColor {
  return MAP[slug] ?? PALETTE[hashSlug(slug) % PALETTE.length];
}
