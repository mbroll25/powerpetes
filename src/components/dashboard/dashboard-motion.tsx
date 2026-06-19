"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import { gsap } from "gsap";

type DashboardMotionProps = {
  children: ReactNode;
};

export function DashboardMotion({ children }: DashboardMotionProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    const root = rootRef.current;

    if (!root) return;

    const ctx = gsap.context(() => {
      const animatedElements = gsap.utils.toArray<HTMLElement>(
        "[data-dashboard-anim]",
      );

      gsap.set(animatedElements, {
        opacity: 0,
        y: 24,
      });

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;

            const element = entry.target as HTMLElement;
            const type = element.dataset.dashboardAnim;

            gsap.to(element, {
              opacity: 1,
              y: 0,
              duration: type === "header" ? 0.75 : 0.65,
              ease: "power3.out",
              delay: type === "metric" ? 0.06 : 0,
              overwrite: true,
            });

            observer.unobserve(element);
          });
        },
        {
          threshold: 0.16,
          rootMargin: "0px 0px -8% 0px",
        },
      );

      animatedElements.forEach((element) => {
        observer.observe(element);
      });

      return () => {
        observer.disconnect();
      };
    }, root);

    return () => ctx.revert();
  }, []);

  return <div ref={rootRef}>{children}</div>;
}
