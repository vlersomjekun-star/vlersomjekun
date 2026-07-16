"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";

const NODES = [
  { cx: 50, cy: 10, label: "AH", color: "#1a7d5e" },
  { cx: 87, cy: 30, label: "MK", color: "#2A6496" },
  { cx: 75, cy: 82, label: "EB", color: "#2A6496" },
  { cx: 25, cy: 82, label: "RD", color: "#1a7d5e" },
  { cx: 13, cy: 30, label: "FH", color: "#E8A33D" },
];

export default function HeroVisual() {
  const [active, setActive] = useState(0);
  const t = useTranslations("home");

  useEffect(() => {
    const id = setInterval(() => setActive((n) => (n + 1) % NODES.length), 2200);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="relative aspect-square max-w-[440px] mx-auto select-none">
      <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full">
        {/* Outer rotating dashed circle */}
        <circle
          cx="50" cy="50" r="42"
          fill="none"
          stroke="#E8E4DA"
          strokeWidth="0.4"
          strokeDasharray="2 3"
          style={{ transformOrigin: "50px 50px", animation: "vm-dash-spin 48s linear infinite" }}
        />
        {/* Inner static ring */}
        <circle cx="50" cy="50" r="28" fill="none" stroke="#E8E4DA" strokeWidth="0.3" />

        {/* Spokes */}
        {NODES.map((n, i) => (
          <line
            key={i}
            x1="50" y1="50"
            x2={n.cx} y2={n.cy}
            stroke={i === active ? n.color : "#E8E4DA"}
            strokeWidth={i === active ? "1" : "0.5"}
            strokeOpacity={i === active ? 1 : 0.8}
            style={{ transition: "stroke 0.45s ease, stroke-width 0.45s ease" }}
          />
        ))}

        {/* Center hub */}
        <circle cx="50" cy="50" r="2.8" fill="#E8A33D" />

        {/* Node avatars */}
        {NODES.map((n, i) => {
          const isActive = i === active;
          const r = isActive ? 7 : 5.5;
          return (
            <g key={n.label} style={{ transition: "all 0.45s ease" }}>
              {isActive && (
                <circle
                  cx={n.cx} cy={n.cy}
                  r={r + 4}
                  fill="none"
                  stroke={n.color}
                  strokeWidth="0.5"
                  strokeOpacity="0.3"
                />
              )}
              <circle cx={n.cx} cy={n.cy} r={r + 1.5} fill="#FAFAF8" />
              <circle
                cx={n.cx} cy={n.cy} r={r}
                fill={n.color}
                opacity={isActive ? 1 : 0.65}
                style={{ transition: "r 0.45s ease, opacity 0.45s ease" }}
              />
              <text
                x={n.cx} y={n.cy + 1.5}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#fff"
                fontSize="3.2"
                fontWeight="bold"
                fontFamily="sans-serif"
              >
                {n.label}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Center rating badge */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-full border border-[#E8E4DA] shadow-[0_12px_28px_rgba(26,37,64,0.12)] w-20 h-20 flex flex-col items-center justify-center z-10 pointer-events-none">
        <span className="font-display font-extrabold text-[22px] text-primary leading-none">4.6</span>
        <span className="text-[10px] text-[#8A8471] font-bold">{t("heroRatingLabel")}</span>
      </div>
    </div>
  );
}
