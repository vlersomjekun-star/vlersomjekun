"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

function useCountUp(target: number, duration = 1500) {
  const [current, setCurrent] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        obs.disconnect();
        const start = performance.now();
        function tick(now: number) {
          const t = Math.min((now - start) / duration, 1);
          const eased = 1 - Math.pow(1 - t, 3);
          setCurrent(Math.round(eased * target));
          if (t < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
      },
      { threshold: 0.3 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [target, duration]);

  return { current, ref };
}

function Stat({
  value,
  suffix,
  label,
}: {
  value: number;
  suffix?: string;
  label: string;
}) {
  const { current, ref } = useCountUp(value);
  return (
    <div ref={ref}>
      <p className="font-display font-extrabold text-[28px] text-[#16213D] tabular-nums leading-none">
        {current.toLocaleString()}
        {suffix}
      </p>
      <p className="text-[13px] text-[#8A8471] font-semibold mt-0.5">{label}</p>
    </div>
  );
}

export default function CounterStrip({
  doctorCount,
  reviewCount,
  cityCount,
}: {
  doctorCount: number;
  reviewCount: number;
  cityCount: number;
}) {
  const t = useTranslations("home");
  return (
    <div className="flex gap-8 mt-8">
      <Stat value={doctorCount} suffix="+" label={t("counterDoctors")} />
      <Stat value={reviewCount} label={t("counterReviews")} />
      <Stat value={cityCount} label={t("counterCities")} />
    </div>
  );
}
