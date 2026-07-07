/* eslint-disable @next/next/no-img-element */
import { colorForSpecialty } from "@/lib/specialty-color";

export default function Avatar({
  name,
  photoUrl,
  size = 48,
  specialtySlug,
}: {
  name: string;
  photoUrl?: string | null;
  size?: number;
  specialtySlug?: string;
}) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={name}
        width={size}
        height={size}
        className="shrink-0 rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }

  const color = specialtySlug ? colorForSpecialty(specialtySlug) : { bg: "#EAF3EE", text: "#1a7d5e" };

  return (
    <span
      aria-hidden
      className="flex shrink-0 items-center justify-center rounded-full font-semibold"
      style={{
        width: size,
        height: size,
        fontSize: size / 2.6,
        background: color.bg,
        color: color.text,
      }}
    >
      {initials}
    </span>
  );
}
