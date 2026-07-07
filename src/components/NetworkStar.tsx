const SPOKES: [number, number][] = [
  [12, 2],
  [21.51, 8.91],
  [17.88, 20.09],
  [6.12, 20.09],
  [2.49, 8.91],
];
const IS_TIP = [true, false, false, false, true];

export function NetworkStarIcon({
  id,
  fill = 1,
  size = 24,
  activeColor = "#1a7d5e",
  tipColor = "#E8A33D",
  inactiveColor = "#E8E4DA",
}: {
  id: string;
  fill?: number;
  size?: number;
  activeColor?: string;
  tipColor?: string;
  inactiveColor?: string;
}) {
  const clipId = `vm-ns-${id}`;
  const hasPartial = fill > 0 && fill < 1;

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      {hasPartial && (
        <defs>
          <clipPath id={clipId}>
            <rect x="0" y="0" width={fill * 24} height="24" />
          </clipPath>
        </defs>
      )}

      {/* Inactive layer */}
      <g stroke={inactiveColor} strokeWidth="1.6" strokeLinecap="round">
        {SPOKES.map(([x2, y2], i) => (
          <line key={i} x1="12" y1="12" x2={x2} y2={y2} />
        ))}
      </g>
      <circle cx="12" cy="12" r="2" fill={inactiveColor} />
      {SPOKES.map(([x2, y2], i) => (
        <circle key={i} cx={x2} cy={y2} r="1.5" fill={inactiveColor} />
      ))}

      {/* Active layer */}
      {fill > 0 && (
        <g clipPath={hasPartial ? `url(#${clipId})` : undefined}>
          <g stroke={activeColor} strokeWidth="1.6" strokeLinecap="round">
            {SPOKES.map(([x2, y2], i) => (
              <line key={i} x1="12" y1="12" x2={x2} y2={y2} />
            ))}
          </g>
          <circle cx="12" cy="12" r="2" fill={activeColor} />
          {SPOKES.map(([x2, y2], i) => (
            <circle key={i} cx={x2} cy={y2} r="1.5" fill={IS_TIP[i] ? tipColor : activeColor} />
          ))}
        </g>
      )}
    </svg>
  );
}

export function NetworkStarRating({
  rating,
  max = 5,
  size = 16,
  idPrefix = "r",
}: {
  rating: number;
  max?: number;
  size?: number;
  idPrefix?: string;
}) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${rating.toFixed(1)} / ${max}`}>
      {Array.from({ length: max }, (_, i) => {
        const fill = Math.max(0, Math.min(1, rating - i));
        return (
          <NetworkStarIcon key={i} id={`${idPrefix}-${i}`} fill={fill} size={size} />
        );
      })}
    </span>
  );
}
