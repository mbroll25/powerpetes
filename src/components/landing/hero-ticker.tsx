"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";

const tickerItems = [
  "liga privada competitiva",
  "10 jugadores por lobby",
  "balance inteligente 5v5",
  "elo, roles y rendimiento real",
  "Riot ID verificado en LAS",
  "vales para salvar la derrota",
  "historial y estadísticas del torneo",
  "podio de Powers Petes",
  "algoritmo transparente",
  "rio gallego una pasión",
];

export function HeroTicker() {
  const trackRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const track = trackRef.current;

    if (!track) return;

    const ctx = gsap.context(() => {
      gsap.to(track, {
        xPercent: -50,
        duration: 28,
        ease: "none",
        repeat: -1,
      });
    }, track);

    return () => ctx.revert();
  }, []);

  return (
    <div
      data-anim="ticker"
      className="relative z-20 overflow-hidden border-y border-[#2a2929] bg-[#2b2b2b] py-2 sm:py-2.5"
    >
      <div
        ref={trackRef}
        className="flex w-max items-center gap-8 whitespace-nowrap px-4 text-xs font-black uppercase tracking-[0.12em] text-[#f5f5f3] sm:gap-10 sm:px-6 sm:text-sm sm:tracking-[0.14em]"
      >
        {[...tickerItems, ...tickerItems, ...tickerItems, ...tickerItems].map(
          (item, index) => (
            <span key={`${item}-${index}`} className="shrink-0">
              {item}
            </span>
          ),
        )}
      </div>
    </div>
  );
}