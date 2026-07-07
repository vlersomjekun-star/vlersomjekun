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
  publicBadge,
  specialtySlug,
}: {
  href: string;
  name: string;
  subtitle: string;
  meta?: string;
  avgRating: number;
  reviewCount: number;
  photoUrl?: string | null;
  publicBadge?: string;
  specialtySlug?: string;
}) {
  const safeId = href.replace(/[^a-z0-9]/gi, "-");
  return (
    <Link
      href={href}
      className="flex items-center gap-5 bg-white border-[1.5px] border-[#E8E4DA] rounded-2xl p-5 sm:p-6 transition hover:shadow-[0_12px_28px_rgba(26,37,64,0.09)] hover:border-[#D8D2C0]"
    >
      <Avatar name={name} photoUrl={photoUrl} size={56} specialtySlug={specialtySlug} />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2.5 mb-1">
          <p className="font-display font-bold text-[17px] text-[#16213D] truncate">{name}</p>
          {publicBadge && (
            <span className="shrink-0 bg-amber-light text-[#9A6B14] px-2 py-0.5 rounded-full text-[11px] font-bold">
              {publicBadge}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mb-2">
          <span className="bg-primary-light text-primary text-[12.5px] font-bold px-2.5 py-0.5 rounded-full">
            {subtitle}
          </span>
          {meta && <span className="text-[13.5px] text-[#8A8471] truncate">{meta}</span>}
        </div>
      </div>

      <div className="flex flex-col items-end gap-1 shrink-0 min-w-[90px]">
        {reviewCount > 0 ? (
          <>
            <div className="flex items-center gap-1.5">
              <span className="font-display font-extrabold text-[22px] text-primary tabular-nums">
                {avgRating.toFixed(1)}
              </span>
              <Stars rating={avgRating} size={13} idPrefix={`rc-${safeId}`} />
            </div>
            <span className="text-[12.5px] text-[#8A8471]">({reviewCount})</span>
          </>
        ) : (
          <Stars rating={0} size={13} idPrefix={`rc-${safeId}`} />
        )}
      </div>
    </Link>
  );
}
