"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import { gsap } from "gsap";

type PlayerProfileMotionProps = {
  children: ReactNode;
};

export function PlayerProfileMotion({ children }: PlayerProfileMotionProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        defaults: {
          ease: "power3.out",
        },
      });

      tl.from("[data-profile-anim='hero']", {
        opacity: 0,
        y: 28,
        duration: 0.75,
      })
        .from(
          "[data-profile-anim='stat']",
          {
            opacity: 0,
            y: 18,
            duration: 0.55,
            stagger: 0.06,
          },
          "-=0.35",
        )
        .from(
          "[data-profile-anim='panel']",
          {
            opacity: 0,
            y: 24,
            duration: 0.6,
            stagger: 0.08,
          },
          "-=0.2",
        );
    }, rootRef);

    return () => ctx.revert();
  }, []);

  return <div ref={rootRef}>{children}</div>;
}
