"use client";

import { useEffect, useRef, useState } from "react";
import { CircleHelp } from "lucide-react";
import { gsap } from "gsap";

type InfoTooltipProps = {
  text: string;
};

export function InfoTooltip({ text }: InfoTooltipProps) {
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!tooltipRef.current) return;

    gsap.set(tooltipRef.current, {
      autoAlpha: 0,
      y: 8,
      scale: 0.96,
      xPercent: -50,
      transformOrigin: "50% 100%",
      pointerEvents: "none",
    });
  }, []);

  function showTooltip() {
    if (!tooltipRef.current) return;

    setIsOpen(true);

    gsap.to(tooltipRef.current, {
      autoAlpha: 1,
      y: 0,
      scale: 1,
      xPercent: -50,
      duration: 0.22,
      ease: "power3.out",
      pointerEvents: "auto",
    });
  }

  function hideTooltip() {
    if (!tooltipRef.current) return;

    setIsOpen(false);

    gsap.to(tooltipRef.current, {
      autoAlpha: 0,
      y: 8,
      scale: 0.96,
      xPercent: -50,
      duration: 0.18,
      ease: "power2.inOut",
      pointerEvents: "none",
    });
  }

  function toggleTooltip() {
    if (isOpen) {
      hideTooltip();
      return;
    }

    showTooltip();
  }

  return (
    <span className="relative inline-flex items-center">
      <button
        type="button"
        aria-label="Ver información"
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
        onClick={toggleTooltip}
        className="ml-2 grid size-5 place-items-center rounded-full border border-[#2a2929] bg-[#151414] text-[#8a8a85] transition hover:border-[#f0ed7e] hover:text-[#f0ed7e] focus-visible:border-[#f0ed7e] focus-visible:text-[#f0ed7e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f0ed7e]/20"
      >
        <CircleHelp className="size-3.5" />
      </button>

      <div
        ref={tooltipRef}
        className="absolute bottom-[calc(100%+0.65rem)] left-1/2 z-50 w-72 rounded-[0.5rem] border border-[#2a2929] bg-[#1d1c1c] px-4 py-3 text-left shadow-[0_1rem_3rem_rgba(0,0,0,0.45)]"
      >
        <p className="text-xs font-medium normal-case leading-5 tracking-normal text-[#c9c9c4]">
          {text}
        </p>

        <span className="absolute left-1/2 top-full size-3 -translate-x-1/2 -translate-y-1/2 rotate-45 border-b border-r border-[#2a2929] bg-[#1d1c1c]" />
      </div>
    </span>
  );
}
