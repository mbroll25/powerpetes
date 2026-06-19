"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { Clock3, ShieldCheck, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DailyValeUsageRecord } from "@/components/balance/live-prematch-modal";

type LiveValeToastMatchPlayer = {
  id: string;
  user_id: string;
  team: "blue" | "red";
  assigned_role: string;
  vale_used: boolean;
};

type LiveValeToastMatch = {
  id: string;
  match_number: number;
  vale_window_ends_at: string | null;
  match_players: LiveValeToastMatchPlayer[];
};

type LiveValeToastProps = {
  match: LiveValeToastMatch;
  currentUserId: string;
  dailyValeUsage: DailyValeUsageRecord | null;
  now: number;
  isUsingVale: boolean;
  dismissed: boolean;
  onUseVale: (matchId: string) => void;
  onOpenPrematch: () => void;
  onDismiss: () => void;
};

function getSecondsRemaining(endsAt: string | null, now: number) {
  if (!endsAt) return 0;

  const remaining = Math.ceil((new Date(endsAt).getTime() - now) / 1000);

  return Math.max(0, remaining);
}

function formatCountdown(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(
    remainingSeconds,
  ).padStart(2, "0")}`;
}

function formatRole(role: string) {
  const labels: Record<string, string> = {
    TOP: "Top",
    JUNGLE: "Jungla",
    MID: "Mid",
    ADC: "ADC",
    SUPPORT: "Soporte",
  };

  return labels[role] ?? role;
}

function formatTeamName(team: "blue" | "red") {
  return team === "blue" ? "Equipo Azul" : "Equipo Rojo";
}

export function LiveValeToast({
  match,
  currentUserId,
  dailyValeUsage,
  now,
  isUsingVale,
  dismissed,
  onUseVale,
  onOpenPrematch,
  onDismiss,
}: LiveValeToastProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  const secondsRemaining = getSecondsRemaining(match.vale_window_ends_at, now);
  const valeWindowOpen = secondsRemaining > 0;

  const currentPlayer =
    match.match_players.find((player) => player.user_id === currentUserId) ??
    null;

  const currentPlayerValeUsed = Boolean(currentPlayer?.vale_used);

  const dailyValeUsedInAnotherMatch =
    Boolean(dailyValeUsage) &&
    dailyValeUsage?.match_id !== match.id &&
    !currentPlayerValeUsed;

  const buttonDisabled =
    !valeWindowOpen ||
    currentPlayerValeUsed ||
    dailyValeUsedInAnotherMatch ||
    isUsingVale;

  const buttonLabel = currentPlayerValeUsed
    ? "Vale activado"
    : dailyValeUsedInAnotherMatch
      ? "Vale usado hoy"
      : valeWindowOpen
        ? "Usar vale"
        : "Cerrado";

  useEffect(() => {
    const root = rootRef.current;

    if (!root) return;

    gsap.fromTo(
      root,
      {
        opacity: 0,
        y: -24,
        scale: 0.96,
      },
      {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.45,
        ease: "power3.out",
      },
    );
  }, [match.id]);

  if (!currentPlayer || dismissed || !valeWindowOpen) {
    return null;
  }

  return (
    <div
      ref={rootRef}
      className="fixed left-1/2 top-4 z-60 w-[calc(100%-1.5rem)] max-w-3xl -translate-x-1/2"
    >
      <div className="relative overflow-hidden rounded-[0.9rem] border border-[#f0ed7e]/35 bg-[#101010]/94 p-3 shadow-[0_1.25rem_4rem_rgba(0,0,0,0.48)] backdrop-blur-xl sm:p-4">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(240,237,126,0.16),transparent_36%),radial-gradient(circle_at_80%_20%,rgba(117,240,160,0.11),transparent_30%)]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-[#f0ed7e]/60 to-transparent" />

        <div className="relative z-10 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div
              className={cn(
                "grid size-12 shrink-0 place-items-center rounded-[0.7rem] border",
                secondsRemaining <= 10
                  ? "border-red-300/35 bg-red-400/15 text-red-200"
                  : "border-[#f0ed7e]/30 bg-[#f0ed7e]/10 text-[#f0ed7e]",
              )}
            >
              <Clock3 className="size-5" />
            </div>

            <div className="min-w-0">
              <p className="text-[0.68rem] font-black uppercase tracking-[0.16em] text-[#f0ed7e]">
                Ventana de vale · Partida #{match.match_number}
              </p>

              <div className="mt-1 flex flex-wrap items-end gap-3">
                <p
                  className={cn(
                    "text-3xl font-black leading-none tracking-[-0.04em]",
                    secondsRemaining <= 10 ? "text-red-200" : "text-[#f5f5f3]",
                  )}
                >
                  {formatCountdown(secondsRemaining)}
                </p>

                <p className="pb-1 text-xs font-bold text-[#8a8a85]">
                  {formatTeamName(currentPlayer.team)} ·{" "}
                  {formatRole(currentPlayer.assigned_role)}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button
              type="button"
              disabled={buttonDisabled}
              onClick={() => onUseVale(match.id)}
              className="h-11 rounded-3xl border border-[#75f0a0]/25 bg-[#75f0a0]/10 px-4 text-xs font-black uppercase tracking-[0.13em] text-[#75f0a0] hover:bg-[#75f0a0]/15 disabled:cursor-not-allowed disabled:opacity-45"
            >
              <ShieldCheck className="mr-2 size-4" />
              {isUsingVale ? "Activando..." : buttonLabel}
            </Button>

            <Button
              type="button"
              onClick={onOpenPrematch}
              className="h-11 rounded-3xl bg-[#f0ed7e] px-4 text-xs font-black uppercase tracking-[0.13em] text-[#151414] hover:bg-[#d8d46d]"
            >
              Ver sala
            </Button>

            <button
              type="button"
              onClick={onDismiss}
              className="grid size-11 place-items-center rounded-3xl border border-[#2a2929] bg-[#151414]/80 text-[#8a8a85] transition hover:border-[#f0ed7e]/35 hover:text-[#f0ed7e]"
              aria-label="Ocultar aviso de vale"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
