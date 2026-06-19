"use client";

import Image from "next/image";
import { Clock3, ShieldCheck, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getLolRoleIconSrc } from "@/lib/lol-assets";
import { cn } from "@/lib/utils";

type LivePrematchPlayer = {
  id: string;
  user_id: string;
  team: "blue" | "red";
  assigned_role: string;
  rating_before: number | string;
  vale_used: boolean;
  vale_used_at: string | null;
  profiles: {
    lol_nick: string | null;
    lol_tagline: string | null;
  } | null;
};

type LivePrematchMatch = {
  id: string;
  match_number: number;
  vale_window_ends_at: string | null;
  match_players: LivePrematchPlayer[];
};

export type DailyValeUsageRecord = {
  user_id: string;
  match_id: string;
  used_for_date: string;
  used_at: string;
};

type LivePrematchModalProps = {
  match: LivePrematchMatch;
  currentUserId: string;
  dailyValeUsage: DailyValeUsageRecord | null;
  now: number;
  isUsingVale: boolean;
  onUseVale: (matchId: string) => void;
  onClose: () => void;
};

const roleOrder = ["TOP", "JUNGLE", "MID", "ADC", "SUPPORT"];

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

function getPlayerName(player: LivePrematchPlayer) {
  if (!player.profiles?.lol_nick) return "Jugador";

  return `${player.profiles.lol_nick}#${player.profiles.lol_tagline ?? "-"}`;
}

function sortByRole(players: LivePrematchPlayer[]) {
  return players.slice().sort((a, b) => {
    return (
      roleOrder.indexOf(a.assigned_role) - roleOrder.indexOf(b.assigned_role)
    );
  });
}

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

function RoleIcon({ role }: { role: string }) {
  const src = getLolRoleIconSrc(role);

  if (!src) return null;

  return (
    <span className="grid size-7 shrink-0 place-items-center rounded-2xl border border-[#f0ed7e]/25 bg-[#f0ed7e]/10">
      <Image
        src={src}
        alt={formatRole(role)}
        width={18}
        height={18}
        className="object-contain"
      />
    </span>
  );
}

function TeamList({
  side,
  players,
}: {
  side: "blue" | "red";
  players: LivePrematchPlayer[];
}) {
  const isBlue = side === "blue";

  return (
    <div
      className={cn(
        "rounded-[0.75rem] border p-4",
        isBlue
          ? "border-blue-400/25 bg-blue-400/8"
          : "border-red-400/25 bg-red-400/8",
      )}
    >
      <p
        className={cn(
          "mb-3 text-xs font-black uppercase tracking-[0.14em]",
          isBlue ? "text-blue-200" : "text-red-200",
        )}
      >
        {formatTeamName(side)}
      </p>

      <div className="grid gap-2">
        {sortByRole(players).map((player) => (
          <div
            key={player.id}
            className="flex items-center justify-between gap-3 rounded-[0.6rem] border border-[#2a2929] bg-[#101010]/75 px-3 py-3"
          >
            <div className="flex min-w-0 items-center gap-3">
              <RoleIcon role={player.assigned_role} />

              <div className="min-w-0">
                <p className="text-[0.68rem] font-black uppercase tracking-[0.13em] text-[#f0ed7e]">
                  {formatRole(player.assigned_role)}
                </p>

                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-black text-[#f5f5f3]">
                    {getPlayerName(player)}
                  </p>

                  {player.vale_used ? (
                    <span className="rounded-full border border-[#75f0a0]/25 bg-[#75f0a0]/10 px-2 py-0.5 text-[0.62rem] font-black uppercase tracking-widest text-[#75f0a0]">
                      Vale
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            <p className="shrink-0 text-xs font-black text-[#8a8a85]">
              {Math.round(Number(player.rating_before))}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function LivePrematchModal({
  match,
  currentUserId,
  dailyValeUsage,
  now,
  isUsingVale,
  onUseVale,
  onClose,
}: LivePrematchModalProps) {
  const secondsRemaining = getSecondsRemaining(match.vale_window_ends_at, now);
  const valeWindowOpen = secondsRemaining > 0;

  const currentPlayer =
    match.match_players.find((player) => player.user_id === currentUserId) ??
    null;

  const bluePlayers = match.match_players.filter((player) => {
    return player.team === "blue";
  });

  const redPlayers = match.match_players.filter((player) => {
    return player.team === "red";
  });

  const valeUsedCount = match.match_players.filter((player) => {
    return player.vale_used;
  }).length;

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
        ? "Usar vale diario"
        : "Ventana cerrada";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/72 px-4 py-6 backdrop-blur-md">
      <div className="relative max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-[1rem] border border-[#f0ed7e]/30 bg-[#101010] p-5 shadow-[0_2rem_6rem_rgba(0,0,0,0.55)] sm:p-6">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 grid size-9 place-items-center rounded-full border border-[#2a2929] bg-[#151414] text-[#8a8a85] transition hover:border-[#f0ed7e]/40 hover:text-[#f0ed7e]"
          aria-label="Cerrar pre-partida"
        >
          <X className="size-4" />
        </button>

        <div className="mb-5 pr-12">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#f0ed7e]">
            Pre-partida en vivo · Partida #{match.match_number}
          </p>

          <h2 className="mt-3 text-4xl font-black uppercase tracking-[-0.04em] text-[#f5f5f3]">
            Equipo Azul vs Equipo Rojo
          </h2>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#8a8a85]">
            Revisá tu equipo y decidí si querés usar tu vale diario. Si perdés
            con vale activo, no perdés puntos visibles, pero la partida sigue
            contando para estadísticas y matchmaking.
          </p>
        </div>

        <div className="mb-5 grid gap-3 md:grid-cols-3">
          <div className="rounded-[0.75rem] border border-[#f0ed7e]/25 bg-[#f0ed7e]/10 p-4">
            <div className="mb-2 flex items-center gap-2">
              <Clock3 className="size-4 text-[#f0ed7e]" />
              <p className="text-[0.68rem] font-black uppercase tracking-[0.13em] text-[#f0ed7e]">
                Ventana de vale
              </p>
            </div>

            <p className="text-3xl font-black text-[#f5f5f3]">
              {valeWindowOpen ? formatCountdown(secondsRemaining) : "00:00"}
            </p>

            <p className="mt-1 text-xs text-[#8a8a85]">
              {valeWindowOpen ? "Tiempo restante" : "Ventana cerrada"}
            </p>
          </div>

          <div className="rounded-[0.75rem] border border-[#2a2929] bg-[#151414]/80 p-4">
            <p className="text-[0.68rem] font-black uppercase tracking-[0.13em] text-[#8a8a85]">
              Tu equipo
            </p>

            <p className="mt-2 text-xl font-black text-[#f5f5f3]">
              {currentPlayer ? formatTeamName(currentPlayer.team) : "-"}
            </p>

            <p className="mt-1 text-xs text-[#8a8a85]">
              Rol asignado:{" "}
              {currentPlayer ? formatRole(currentPlayer.assigned_role) : "-"}
            </p>
          </div>

          <div className="rounded-[0.75rem] border border-[#2a2929] bg-[#151414]/80 p-4">
            <p className="text-[0.68rem] font-black uppercase tracking-[0.13em] text-[#8a8a85]">
              Vales usados
            </p>

            <p className="mt-2 text-xl font-black text-[#f5f5f3]">
              {valeUsedCount}/10
            </p>

            <p className="mt-1 text-xs text-[#8a8a85]">
              Tu vale:{" "}
              {currentPlayerValeUsed
                ? "activado"
                : dailyValeUsedInAnotherMatch
                  ? "usado hoy"
                  : "disponible"}
            </p>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <TeamList side="blue" players={bluePlayers} />
          <TeamList side="red" players={redPlayers} />
        </div>

        <div className="mt-5 flex flex-col gap-3 rounded-[0.75rem] border border-[#2a2929] bg-[#151414]/80 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-black text-[#f5f5f3]">
              Decisión de vale diario
            </p>

            <p className="mt-1 text-xs leading-5 text-[#8a8a85]">
              El vale se consume si lo activás en esta pre-partida. Si la
              partida se cancela, el admin la cancela y el vale se devuelve.
            </p>
          </div>

          <Button
            type="button"
            disabled={buttonDisabled}
            onClick={() => onUseVale(match.id)}
            className="h-12 rounded-[0.5rem] border border-[#75f0a0]/25 bg-[#75f0a0]/10 px-5 text-xs font-black uppercase tracking-[0.14em] text-[#75f0a0] hover:bg-[#75f0a0]/15 disabled:cursor-not-allowed disabled:opacity-45"
          >
            <ShieldCheck className="mr-2 size-4" />
            {isUsingVale ? "Activando..." : buttonLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
