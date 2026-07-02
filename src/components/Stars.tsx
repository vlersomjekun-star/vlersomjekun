import { Star } from "lucide-react";

export default function Stars({
  rating,
  size = 16,
}: {
  rating: number;
  size?: number;
}) {
  const rounded = Math.round(rating);
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${rating}/5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={size}
          className={i <= rounded ? "fill-trust text-trust" : "fill-gray-200 text-gray-200"}
        />
      ))}
    </span>
  );
}
