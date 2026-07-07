import { NetworkStarIcon } from "./NetworkStar";

export default function Stars({
  rating,
  size = 16,
  idPrefix = "s",
}: {
  rating: number;
  size?: number;
  idPrefix?: string;
}) {
  const rounded = Math.round(rating);
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${rating} / 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <NetworkStarIcon key={i} id={`${idPrefix}-${i}`} fill={i <= rounded ? 1 : 0} size={size} />
      ))}
    </span>
  );
}
