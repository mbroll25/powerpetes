"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { gsap } from "gsap";
import {
  Activity,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Clock3,
  ShieldCheck,
  Swords,
  UserCircle,
} from "lucide-react";

import { cn } from "@/lib/utils";

type DashboardNavItem = {
  id: string;
  label: string;
  icon: React.ElementType;
};

type DashboardResponsiveShellProps = {
  children: ReactNode;
};

const dashboardNavItems: DashboardNavItem[] = [
  {
    id: "dashboard-overview",
    label: "Resumen",
    icon: Activity,
  },
  {
    id: "match-generator",
    label: "Generador",
    icon: Swords,
  },
  {
    id: "pending-matches",
    label: "Activas",
    icon: Clock3,
  },
  {
    id: "tournament-standings",
    label: "Tabla",
    icon: BarChart3,
  },
];

function scrollToSection(sectionId: string) {
  const element = document.getElementById(sectionId);

  if (!element) return;

  const offset = 28;
  const targetY = element.getBoundingClientRect().top + window.scrollY - offset;

  const scrollState = {
    y: window.scrollY,
  };

  gsap.to(scrollState, {
    y: targetY,
    duration: 0.85,
    ease: "power3.inOut",
    onUpdate: () => {
      window.scrollTo(0, scrollState.y);
    },
  });
}

function useActiveDashboardSection() {
  const [activeSectionId, setActiveSectionId] = useState(
    dashboardNavItems[0]?.id ?? "",
  );

  const visibleItems = useMemo(() => {
    return dashboardNavItems;
  }, []);

  useEffect(() => {
    const sections = visibleItems
      .map((item) => document.getElementById(item.id))
      .filter(Boolean) as HTMLElement[];

    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntry = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => {
            return (
              Math.abs(a.boundingClientRect.top) -
              Math.abs(b.boundingClientRect.top)
            );
          })[0];

        if (visibleEntry?.target?.id) {
          setActiveSectionId(visibleEntry.target.id);
        }
      },
      {
        root: null,
        threshold: [0.12, 0.25, 0.4],
        rootMargin: "-24% 0px -58% 0px",
      },
    );

    sections.forEach((section) => observer.observe(section));

    return () => {
      observer.disconnect();
    };
  }, [visibleItems]);

  return {
    activeSectionId,
    visibleItems,
  };
}

function DesktopDashboardNav({
  expanded,
  onToggleExpanded,
}: {
  expanded: boolean;
  onToggleExpanded: () => void;
}) {
  const { activeSectionId, visibleItems } = useActiveDashboardSection();

  return (
    <nav
      className={cn(
        "fixed left-4 top-1/2 z-40 hidden -translate-y-1/2 transition-all duration-300 xl:flex 2xl:left-8",
        expanded ? "w-56" : "w-20",
      )}
    >
      <div className="relative w-full overflow-hidden rounded-[0.85rem] border border-[#2a2929] bg-[#101010]/88 p-2 shadow-[0_1rem_3rem_rgba(0,0,0,0.32)] backdrop-blur-xl">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-[#f0ed7e]/35 to-transparent" />

        <button
          type="button"
          onClick={onToggleExpanded}
          className="mb-2 flex w-full items-center justify-center gap-2 rounded-4xl border border-[#2a2929] bg-[#151414]/80 px-3 py-2 text-[#8a8a85] transition hover:border-[#f0ed7e]/35 hover:text-[#f0ed7e]"
        >
          {expanded ? (
            <ChevronLeft className="size-4" />
          ) : (
            <ChevronRight className="size-4" />
          )}

          {expanded ? (
            <span className="text-[0.65rem] font-black uppercase tracking-[0.13em]">
              Contraer
            </span>
          ) : null}
        </button>

        <div className="grid gap-1">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const active = activeSectionId === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => scrollToSection(item.id)}
                className={cn(
                  "group flex items-center rounded-4xl px-3 py-2.5 text-left transition",
                  expanded ? "gap-3" : "justify-center",
                  active
                    ? "bg-[#f0ed7e] text-[#151414]"
                    : "text-[#8a8a85] hover:bg-[#151414] hover:text-[#f0ed7e]",
                )}
              >
                <span
                  className={cn(
                    "grid size-8 shrink-0 place-items-center rounded-[0.5rem] border transition",
                    active
                      ? "border-[#151414]/15 bg-[#151414]/10"
                      : "border-[#2a2929] bg-[#151414]/80 group-hover:border-[#f0ed7e]/30",
                  )}
                >
                  <Icon className="size-4" />
                </span>

                {expanded ? (
                  <span className="min-w-0 truncate text-[0.68rem] font-black uppercase tracking-[0.13em]">
                    {item.label}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        <div className="mt-2 border-t border-[#2a2929] pt-2">
          <Link
            href="/dashboard/profile"
            className={cn(
              "group flex items-center rounded-4xl px-3 py-2.5 text-left text-[#8a8a85] transition hover:bg-[#151414] hover:text-[#f0ed7e]",
              expanded ? "gap-3" : "justify-center",
            )}
          >
            <span className="grid size-8 shrink-0 place-items-center rounded-[0.5rem] border border-[#2a2929] bg-[#151414]/80 transition group-hover:border-[#f0ed7e]/30">
              <UserCircle className="size-4" />
            </span>

            {expanded ? (
              <span className="min-w-0 truncate text-[0.68rem] font-black uppercase tracking-[0.13em]">
                Perfil
              </span>
            ) : null}
          </Link>

          <div
            className={cn(
              "mt-1 flex items-center justify-center gap-2 rounded-[0.6rem] bg-[#151414]/80 px-2 py-2",
              expanded ? "justify-start px-3" : "justify-center",
            )}
          >
            <ShieldCheck className="size-3.5 text-[#75f0a0]" />

            {expanded ? (
              <span className="text-[0.62rem] font-black uppercase tracking-[0.13em] text-[#75f0a0]">
                Live
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </nav>
  );
}

function MobileDashboardNav() {
  const { activeSectionId, visibleItems } = useActiveDashboardSection();

  return (
    <nav className="fixed inset-x-3 bottom-3 z-40 xl:hidden">
      <div className="overflow-x-auto rounded-[0.85rem] border border-[#2a2929] bg-[#101010]/92 p-2 shadow-[0_1rem_3rem_rgba(0,0,0,0.4)] backdrop-blur-xl">
        <div className="flex min-w-max gap-1">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const active = activeSectionId === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => scrollToSection(item.id)}
                className={cn(
                  "flex min-w-20 flex-col items-center justify-center gap-1 rounded-4xl px-3 py-2 transition",
                  active
                    ? "bg-[#f0ed7e] text-[#151414]"
                    : "text-[#8a8a85] hover:bg-[#151414] hover:text-[#f0ed7e]",
                )}
              >
                <Icon className="size-4" />

                <span className="text-[0.58rem] font-black uppercase tracking-[0.11em]">
                  {item.label}
                </span>
              </button>
            );
          })}
          <Link
            href="/dashboard/profile"
            className="flex min-w-20 flex-col items-center justify-center gap-1 rounded-4xl px-3 py-2 text-[#8a8a85] transition hover:bg-[#151414] hover:text-[#f0ed7e]"
          >
            <UserCircle className="size-4" />

            <span className="text-[0.58rem] font-black uppercase tracking-[0.11em]">
              Perfil
            </span>
          </Link>
        </div>
      </div>
    </nav>
  );
}

export function DashboardResponsiveShell({
  children,
}: DashboardResponsiveShellProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={cn(
        "relative z-10 w-full transition-[padding-left] duration-300",
        expanded ? "xl:pl-64" : "xl:pl-24",
      )}
    >
      <DesktopDashboardNav
        expanded={expanded}
        onToggleExpanded={() => setExpanded((current) => !current)}
      />

      <MobileDashboardNav />

      <div className="mx-auto w-full max-w-352 pb-24 xl:pb-0">{children}</div>
    </div>
  );
}
