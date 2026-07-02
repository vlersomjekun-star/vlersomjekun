import { Link } from "@/i18n/navigation";
import Avatar from "./Avatar";
import Stars from "./Stars";

export default function ResultCard({
  href,
  name,
  subtitle,
  meta,
  avgRating,
  reviewCount,
  photoUrl,
}: {
  href: string;
  name: string;
  subtitle: string;
  meta?: string;
  avgRating: number;
  reviewCount: number;
  photoUrl?: string | null;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-4 rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition hover:border-primary/40 hover:shadow"
    >
      <Avatar name={name} photoUrl={photoUrl} size={52} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-gray-900">{name}</p>
        <p className="truncate text-sm text-gray-600">{subtitle}</p>
        {meta && <p className="truncate text-xs text-gray-400">{meta}</p>}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-0.5">
        {reviewCount > 0 ? (
          <>
            <span className="flex items-center gap-1.5">
              <Stars rating={avgRating} size={14} />
              <span className="text-sm font-semibold text-gray-800">{avgRating.toFixed(1)}</span>
            </span>
            <span className="text-xs text-gray-400">({reviewCount})</span>
          </>
        ) : (
          <Stars rating={0} size={14} />
        )}
      </div>
    </Link>
  );
}
