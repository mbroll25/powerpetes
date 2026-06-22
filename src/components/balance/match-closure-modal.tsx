"use client";

import { useMemo, useState } from "react";
import { ClipboardCheck, Loader2, X } from "lucide-react";

import {
  ChampionSelector,
  type ChampionSelection,
} from "@/components/balance/champion-selector";
import { Button } from "@/components/ui/button";
import { ClientPortal } from "@/components/ui/client-portal";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type ClosureTeam = "blue" | "red";
type BansStatus = "recorded" | "not_recorded" | "no_bans";

type ClosurePlayer = {
  id: string;
  user_id: string;
  team: ClosureTeam;
  assigned_role: string;
  rating_before: number | string;
  profiles: {
    lol_nick: string | null;
    lol_tagline: string | null;
  } | null;
};

type ClosureMatch = {
  id: string;
  match_number: number;
  match_players: ClosurePlayer[];
};

type ChampionDraft = ChampionSelection;

type PlayerDraft = ChampionDraft & {
  matchPlayerId: string;
  kills: string;
  deaths: string;
  assists: string;
};

export type MatchClosurePayload = {
  matchId: string;
  winnerTeam: ClosureTeam;
  bansStatus: BansStatus;
  blueBans: ChampionDraft[];
  redBans: ChampionDraft[];
  players: PlayerDraft[];
  notes: string;
};

type MatchClosureModalProps = {
  match: ClosureMatch;
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (payload: MatchClosurePayload) => void;
};

const roleOrder = ["TOP", "JUNGLE", "MID", "ADC", "SUPPORT"];

function createEmptyChampion(): ChampionDraft {
  return {
    championId: null,
    championKey: "",
    championName: "",
    championImageUrl: "",
  };
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

function formatTeamName(team: ClosureTeam) {
  return team === "blue" ? "Equipo Azul" : "Equipo Rojo";
}

function getPlayerName(player: ClosurePlayer) {
  if (!player.profiles?.lol_nick) return "Jugador";

  return `${player.profiles.lol_nick}#${player.profiles.lol_tagline ?? "-"}`;
}

function sortByRole(players: ClosurePlayer[]) {
  return players.slice().sort((a, b) => {
    return (
      roleOrder.indexOf(a.assigned_role) - roleOrder.indexOf(b.assigned_role)
    );
  });
}

function createEmptyBans() {
  return Array.from({ length: 5 }, () => createEmptyChampion());
}

function hasChampionSelected(champion: ChampionDraft) {
  return champion.championName.trim().length > 0;
}

export function MatchClosureModal({
  match,
  isSaving,
  onClose,
  onSubmit,
}: MatchClosureModalProps) {
  const [winnerTeam, setWinnerTeam] = useState<ClosureTeam | null>(null);
  const [bansStatus, setBansStatus] = useState<BansStatus>("not_recorded");
  const [blueBans, setBlueBans] = useState(createEmptyBans);
  const [redBans, setRedBans] = useState(createEmptyBans);
  const [notes, setNotes] = useState("");

  const [players, setPlayers] = useState<PlayerDraft[]>(() => {
    return match.match_players.map((player) => ({
      matchPlayerId: player.id,
      ...createEmptyChampion(),
      kills: "",
      deaths: "",
      assists: "",
    }));
  });

  const bluePlayers = useMemo(() => {
    return sortByRole(
      match.match_players.filter((player) => player.team === "blue"),
    );
  }, [match.match_players]);

  const redPlayers = useMemo(() => {
    return sortByRole(
      match.match_players.filter((player) => player.team === "red"),
    );
  }, [match.match_players]);

  const allChampionPicksCompleted = players.every((player) => {
    return hasChampionSelected(player);
  });

  const recordedBansCompleted =
    bansStatus !== "recorded" ||
    (blueBans.every(hasChampionSelected) && redBans.every(hasChampionSelected));

  const canSubmit =
    Boolean(winnerTeam) &&
    allChampionPicksCompleted &&
    recordedBansCompleted &&
    !isSaving;

  function updatePlayerDraft(
    matchPlayerId: string,
    patch: Partial<PlayerDraft>,
  ) {
    setPlayers((current) => {
      return current.map((player) => {
        if (player.matchPlayerId !== matchPlayerId) return player;

        return {
          ...player,
          ...patch,
        };
      });
    });
  }

  function updatePlayerChampion(
    matchPlayerId: string,
    champion: ChampionSelection | null,
  ) {
    updatePlayerDraft(matchPlayerId, champion ?? createEmptyChampion());
  }

  function updateBan(
    team: ClosureTeam,
    index: number,
    champion: ChampionSelection | null,
  ) {
    const setter = team === "blue" ? setBlueBans : setRedBans;

    setter((current) => {
      return current.map((ban, currentIndex) => {
        if (currentIndex !== index) return ban;

        return champion ?? createEmptyChampion();
      });
    });
  }

  function handleSubmit() {
    if (!winnerTeam || !canSubmit) return;

    onSubmit({
      matchId: match.id,
      winnerTeam,
      bansStatus,
      blueBans,
      redBans,
      players,
      notes,
    });
  }

  return (
    <ClientPortal>
      <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/72 px-4 py-6 backdrop-blur-md">
        <div className="custom-scrollbar relative max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-[1rem] border border-[#f0ed7e]/30 bg-[#101010] p-5 pr-6 shadow-[0_2rem_6rem_rgba(0,0,0,0.55)] sm:p-6 sm:pr-7">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 grid size-9 place-items-center rounded-full border border-[#2a2929] bg-[#151414] text-[#8a8a85] transition hover:border-[#f0ed7e]/40 hover:text-[#f0ed7e]"
            aria-label="Cerrar"
          >
            <X className="size-4" />
          </button>

          <div className="mb-6 pr-12">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#f0ed7e]">
              Cierre de partida · Partida #{match.match_number}
            </p>

            <h2 className="mt-3 text-4xl font-black uppercase tracking-[-0.04em] text-[#f5f5f3]">
              Cargar datos finales
            </h2>

            <p className="mt-3 max-w-3xl text-sm leading-6 text-[#8a8a85]">
              Seleccioná campeones desde la base oficial para evitar errores de
              carga. KDA y notas son opcionales.
            </p>
          </div>

          <div className="mb-5 rounded-[0.75rem] border border-[#2a2929] bg-[#151414]/80 p-4">
            <p className="mb-3 text-xs font-black uppercase tracking-[0.14em] text-[#f0ed7e]">
              Ganador oficial
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              {(["blue", "red"] as ClosureTeam[]).map((team) => (
                <button
                  key={team}
                  type="button"
                  onClick={() => setWinnerTeam(team)}
                  className={cn(
                    "rounded-4xl border px-4 py-4 text-left transition",
                    winnerTeam === team
                      ? "border-[#f0ed7e]/55 bg-[#f0ed7e] text-[#151414]"
                      : "border-[#2a2929] bg-[#101010] text-[#f5f5f3] hover:border-[#f0ed7e]/35",
                  )}
                >
                  <p className="text-xs font-black uppercase tracking-[0.14em]">
                    {formatTeamName(team)}
                  </p>
                  <p className="mt-1 text-sm font-bold opacity-75">
                    Marcar como ganador
                  </p>
                </button>
              ))}
            </div>
          </div>

          <div className="mb-5 rounded-[0.75rem] border border-[#2a2929] bg-[#151414]/80 p-4">
            <p className="mb-3 text-xs font-black uppercase tracking-[0.14em] text-[#f0ed7e]">
              Baneos
            </p>

            <div className="mb-4 flex flex-wrap gap-2">
              {[
                { value: "recorded", label: "Cargar bans" },
                { value: "not_recorded", label: "No registrados" },
                { value: "no_bans", label: "Sin bans" },
              ].map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setBansStatus(item.value as BansStatus)}
                  className={cn(
                    "h-10 rounded-[0.5rem] border px-4 text-xs font-black uppercase tracking-[0.13em] transition",
                    bansStatus === item.value
                      ? "border-[#75f0a0]/45 bg-[#75f0a0] text-[#151414]"
                      : "border-[#2a2929] bg-[#101010] text-[#8a8a85] hover:border-[#75f0a0]/35 hover:text-[#75f0a0]",
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {bansStatus === "recorded" ? (
              <div className="grid gap-4 lg:grid-cols-2">
                <BanFields
                  title="Baneos Equipo Azul"
                  team="blue"
                  bans={blueBans}
                  onChange={updateBan}
                />

                <BanFields
                  title="Baneos Equipo Rojo"
                  team="red"
                  bans={redBans}
                  onChange={updateBan}
                />
              </div>
            ) : (
              <p className="text-sm leading-6 text-[#8a8a85]">
                El cierre quedará marcado como{" "}
                <span className="font-black text-[#f5f5f3]">
                  {bansStatus === "no_bans"
                    ? "sin bans"
                    : "bans no registrados"}
                </span>
                .
              </p>
            )}
          </div>

          <div className="mb-5 grid gap-4 xl:grid-cols-2">
            <PlayerTeamClosure
              title="Equipo Azul"
              team="blue"
              players={bluePlayers}
              drafts={players}
              onChampionChange={updatePlayerChampion}
              onChange={updatePlayerDraft}
            />

            <PlayerTeamClosure
              title="Equipo Rojo"
              team="red"
              players={redPlayers}
              drafts={players}
              onChampionChange={updatePlayerChampion}
              onChange={updatePlayerDraft}
            />
          </div>

          <div className="mb-5 rounded-[0.75rem] border border-[#2a2929] bg-[#151414]/80 p-4">
            <p className="mb-3 text-xs font-black uppercase tracking-[0.14em] text-[#f0ed7e]">
              Notas opcionales
            </p>

            <Textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Ej: Resultado cargado manualmente, hubo remake parcial, dudas, comentarios..."
              className="min-h-24 rounded-[0.5rem] border-[#2a2929] bg-[#101010] text-sm text-[#f5f5f3] placeholder:text-[#8a8a85] focus-visible:border-[#75f0a0] focus-visible:ring-[#75f0a0]/20"
            />
          </div>

          <div className="flex flex-col gap-3 border-t border-[#2a2929] pt-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm leading-6 text-[#8a8a85]">
              {!winnerTeam ? (
                <p>Seleccioná el ganador oficial.</p>
              ) : !allChampionPicksCompleted ? (
                <p>Seleccioná el campeón usado por los 10 jugadores.</p>
              ) : !recordedBansCompleted ? (
                <p>Cargá los 5 bans de cada equipo o marcá “No registrados”.</p>
              ) : (
                <p className="text-[#75f0a0]">
                  Datos mínimos completos. Ya podés cerrar la partida.
                </p>
              )}
            </div>

            <Button
              type="button"
              disabled={!canSubmit}
              onClick={handleSubmit}
              className="h-12 rounded-[0.5rem] bg-[#f0ed7e] px-5 text-xs font-black uppercase tracking-[0.14em] text-[#151414] hover:bg-[#d8d46d] disabled:cursor-not-allowed disabled:opacity-45"
            >
              {isSaving ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <ClipboardCheck className="mr-2 size-4" />
              )}
              {isSaving ? "Cerrando..." : "Confirmar y cerrar partida"}
            </Button>
          </div>
        </div>
      </div>
    </ClientPortal>
  );
}

function BanFields({
  title,
  team,
  bans,
  onChange,
}: {
  title: string;
  team: ClosureTeam;
  bans: ChampionDraft[];
  onChange: (
    team: ClosureTeam,
    index: number,
    champion: ChampionSelection | null,
  ) => void;
}) {
  return (
    <div className="rounded-[0.75rem] border border-[#2a2929] bg-[#101010]/70 p-4">
      <p className="mb-3 text-xs font-black uppercase tracking-[0.14em] text-[#f5f5f3]">
        {title}
      </p>

      <div className="grid gap-2">
        {bans.map((ban, index) => (
          <ChampionSelector
            key={`${team}-ban-${index}`}
            value={hasChampionSelected(ban) ? ban : null}
            placeholder={`Buscar ban ${index + 1}...`}
            onChange={(champion) => onChange(team, index, champion)}
          />
        ))}
      </div>
    </div>
  );
}

function PlayerTeamClosure({
  title,
  team,
  players,
  drafts,
  onChampionChange,
  onChange,
}: {
  title: string;
  team: ClosureTeam;
  players: ClosurePlayer[];
  drafts: PlayerDraft[];
  onChampionChange: (
    matchPlayerId: string,
    champion: ChampionSelection | null,
  ) => void;
  onChange: (matchPlayerId: string, patch: Partial<PlayerDraft>) => void;
}) {
  const isBlue = team === "blue";

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
        {title}
      </p>

      <div className="grid gap-3">
        {players.map((player) => {
          const draft = drafts.find((item) => {
            return item.matchPlayerId === player.id;
          });

          const selectedChampion =
            draft && hasChampionSelected(draft) ? draft : null;

          return (
            <div
              key={player.id}
              className="rounded-4xl border border-[#2a2929] bg-[#101010]/70 p-3"
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.12em] text-[#f0ed7e]">
                    {formatRole(player.assigned_role)}
                  </p>
                  <p className="mt-1 text-sm font-black text-[#f5f5f3]">
                    {getPlayerName(player)}
                  </p>
                </div>

                <p className="text-xs font-black text-[#8a8a85]">
                  {Math.round(Number(player.rating_before))}
                </p>
              </div>

              <div className="grid gap-2 sm:grid-cols-[1fr_4.5rem_4.5rem_4.5rem]">
                <ChampionSelector
                  value={selectedChampion}
                  placeholder="Buscar campeón..."
                  onChange={(champion) => onChampionChange(player.id, champion)}
                />

                <input
                  value={draft?.kills ?? ""}
                  onChange={(event) =>
                    onChange(player.id, {
                      kills: event.target.value,
                    })
                  }
                  placeholder="K"
                  inputMode="numeric"
                  className="h-11 rounded-[0.5rem] border border-[#2a2929] bg-[#151414] px-3 text-sm text-[#f5f5f3] outline-none placeholder:text-[#8a8a85] transition focus:border-[#75f0a0]"
                />

                <input
                  value={draft?.deaths ?? ""}
                  onChange={(event) =>
                    onChange(player.id, {
                      deaths: event.target.value,
                    })
                  }
                  placeholder="D"
                  inputMode="numeric"
                  className="h-11 rounded-[0.5rem] border border-[#2a2929] bg-[#151414] px-3 text-sm text-[#f5f5f3] outline-none placeholder:text-[#8a8a85] transition focus:border-[#75f0a0]"
                />

                <input
                  value={draft?.assists ?? ""}
                  onChange={(event) =>
                    onChange(player.id, {
                      assists: event.target.value,
                    })
                  }
                  placeholder="A"
                  inputMode="numeric"
                  className="h-11 rounded-[0.5rem] border border-[#2a2929] bg-[#151414] px-3 text-sm text-[#f5f5f3] outline-none placeholder:text-[#8a8a85] transition focus:border-[#75f0a0]"
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
