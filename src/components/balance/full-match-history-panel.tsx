"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileSearch,
  History,
  Loader2,
  Paperclip,
  Search,
  ShieldCheck,
  Trophy,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getLolRoleIconSrc } from "@/lib/lol-assets";
import { cn } from "@/lib/utils";

type FullMatchHistoryPanelProps = {
  activeTournamentId: string | null;
};

type MatchPlayerProfile = {
  lol_nick: string | null;
  lol_tagline: string | null;
};

type HistoryMatchPlayer = {
  id: string;
  user_id: string;
  team: "blue" | "red";
  assigned_role: string;
  rating_before: number | string;
  rating_after: number | string | null;
  rating_delta: number | string | null;
  vale_used: boolean;
  vale_visible_loss_protected: number | string;
  champion_name: string | null;
  champion_image_url: string | null;
  kills: number | string | null;
  deaths: number | string | null;
  assists: number | string | null;
  manual_stats_completed: boolean;
  stats_source: "manual" | "riot_api" | "tournament_code" | null;
  profiles: MatchPlayerProfile | null;
};

type HistoryEvidence = {
  id: string;
  source: "manual" | "riot_api" | "tournament_code";
  status: "pending" | "confirmed" | "rejected";
  riot_game_id: string | null;
  riot_match_id: string | null;
  suggested_winner: "blue" | "red" | null;
  notes: string | null;
  screenshot_url: string | null;
  screenshot_expires_at: string | null;
  created_at: string;
};

type HistoryMatchBan = {
  id: string;
  team: "blue" | "red";
  ban_order: number;
  champion_name: string | null;
  champion_image_url: string | null;
};

type HistoryMatchRecord = {
  id: string;
  match_number: number;
  winner_team: "blue" | "red" | null;
  completed_at: string | null;
  created_at: string;
  balance_score: number | string | null;
  blue_win_probability: number | string | null;
  red_win_probability: number | string | null;
  bans_status: "recorded" | "not_recorded" | "no_bans";
  closure_notes: string | null;
  match_players: HistoryMatchPlayer[];
  match_bans: HistoryMatchBan[];
  match_result_submissions: HistoryEvidence[];
};

const roleOrder = ["TOP", "JUNGLE", "MID", "ADC", "SUPPORT"] as const;

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

function formatTeamName(team: "blue" | "red" | null) {
  if (team === "blue") return "Equipo Azul";
  if (team === "red") return "Equipo Rojo";
  return "Sin ganador";
}

function getPlayerName(player: HistoryMatchPlayer) {
  if (!player.profiles?.lol_nick) return "Jugador";

  return `${player.profiles.lol_nick}#${player.profiles.lol_tagline ?? "-"}`;
}

function sortByRole(players: HistoryMatchPlayer[]) {
  return players.slice().sort((a, b) => {
    return (
      roleOrder.indexOf(a.assigned_role as (typeof roleOrder)[number]) -
      roleOrder.indexOf(b.assigned_role as (typeof roleOrder)[number])
    );
  });
}

function formatDateTime(value: string | null) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getMainEvidence(match: HistoryMatchRecord) {
  return (
    match.match_result_submissions?.slice().sort((a, b) => {
      return (
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    })[0] ?? null
  );
}

function getSourceLabel(source: HistoryEvidence["source"] | null | undefined) {
  if (source === "riot_api") return "Riot";
  if (source === "tournament_code") return "Código";
  return "Manual";
}

function getPlayerDelta(player: HistoryMatchPlayer) {
  if (player.rating_delta != null) {
    return Number(player.rating_delta);
  }

  if (player.rating_after != null) {
    return Number(player.rating_after) - Number(player.rating_before);
  }

  return 0;
}

function getPlayerKda(player: HistoryMatchPlayer) {
  const hasKills = player.kills != null;
  const hasDeaths = player.deaths != null;
  const hasAssists = player.assists != null;

  if (!hasKills && !hasDeaths && !hasAssists) return null;

  return `${player.kills ?? "-"} / ${player.deaths ?? "-"} / ${
    player.assists ?? "-"
  }`;
}

function getBansByTeam(match: HistoryMatchRecord, team: "blue" | "red") {
  return match.match_bans
    .filter((ban) => ban.team === team)
    .slice()
    .sort((a, b) => a.ban_order - b.ban_order);
}

function formatBansStatus(status: HistoryMatchRecord["bans_status"]) {
  if (status === "recorded") return "Baneos registrados";
  if (status === "no_bans") return "Sin baneos";
  return "Baneos no registrados";
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

export function FullMatchHistoryPanel({
  activeTournamentId,
}: FullMatchHistoryPanelProps) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [matches, setMatches] = useState<HistoryMatchRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [winnerFilter, setWinnerFilter] = useState<"all" | "blue" | "red">(
    "all",
  );
  const [sourceFilter, setSourceFilter] = useState<
    "all" | "manual" | "riot_api" | "tournament_code"
  >("all");
  const [expandedMatchId, setExpandedMatchId] = useState<string | null>(null);
  const [selectedScreenshotUrl, setSelectedScreenshotUrl] = useState<
    string | null
  >(null);

  const loadMatches = useCallback(async () => {
    setMessage("");
    setMatches([]);

    if (!activeTournamentId) return;

    setIsLoading(true);

    const { data, error } = await supabase
      .from("matches")
      .select(
        `
        id,
        match_number,
        winner_team,
        completed_at,
        created_at,
        balance_score,
        blue_win_probability,
        red_win_probability,
        bans_status,
        closure_notes,
        match_players (
  id,
  user_id,
  team,
  assigned_role,
  rating_before,
  rating_after,
  rating_delta,
  vale_used,
  vale_visible_loss_protected,
  champion_name,
  champion_image_url,
  kills,
  deaths,
  assists,
  manual_stats_completed,
  stats_source,
  profiles (
    lol_nick,
    lol_tagline
  )
),
match_bans (
  id,
  team,
  ban_order,
  champion_name,
  champion_image_url
),
        match_result_submissions (
          id,
          source,
          status,
          riot_game_id,
          riot_match_id,
          suggested_winner,
          notes,
          screenshot_url,
          screenshot_expires_at,
          created_at
        )
      `,
      )
      .eq("tournament_id", activeTournamentId)
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(80);

    setIsLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMatches((data ?? []) as unknown as HistoryMatchRecord[]);
  }, [activeTournamentId, supabase]);

  useEffect(() => {
    loadMatches();
  }, [loadMatches]);

  const filteredMatches = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return matches.filter((match) => {
      const evidence = getMainEvidence(match);

      const matchesWinner =
        winnerFilter === "all" || match.winner_team === winnerFilter;

      const matchesSource =
        sourceFilter === "all" || evidence?.source === sourceFilter;

      const searchableText = [
        `partida ${match.match_number}`,
        formatTeamName(match.winner_team),
        evidence?.source,
        evidence?.riot_match_id,
        evidence?.riot_game_id,
        evidence?.notes,
        ...match.match_players.map((player) => getPlayerName(player)),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !normalizedSearch || searchableText.includes(normalizedSearch);

      return matchesWinner && matchesSource && matchesSearch;
    });
  }, [matches, search, winnerFilter, sourceFilter]);

  if (!activeTournamentId) {
    return (
      <div className="rounded-[0.75rem] border border-[#2a2929] bg-[#101010]/92 p-6">
        <p className="text-sm leading-6 text-[#8a8a85]">
          No hay torneo activo para mostrar historial.
        </p>
      </div>
    );
  }

  return (
    <section className="overflow-hidden rounded-[0.75rem] border border-[#2a2929] bg-[#101010]/92 shadow-[0_1rem_3rem_rgba(0,0,0,0.22)]">
      <div className="relative border-b border-[#2a2929] p-5 sm:p-6">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(240,237,126,0.08),transparent_30%)]" />

        <div className="relative z-10 flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <History className="size-4 text-[#f0ed7e]" />
              <p className="text-xs font-black uppercase tracking-[0.14em] text-[#f0ed7e]">
                Historial completo
              </p>
            </div>

            <h1 className="text-4xl font-black uppercase tracking-[-0.04em] text-[#f5f5f3]">
              Partidas confirmadas
            </h1>

            <p className="mt-3 max-w-3xl text-sm leading-6 text-[#8a8a85]">
              Revisá resultados confirmados, evidencia, equipos, vales usados y
              variaciones de rating.
            </p>
          </div>

          <div className="rounded-[0.75rem] border border-[#2a2929] bg-[#151414]/80 px-5 py-4">
            <p className="text-[0.68rem] font-black uppercase tracking-[0.13em] text-[#8a8a85]">
              Resultados
            </p>
            <p className="mt-1 text-2xl font-black text-[#f5f5f3]">
              {filteredMatches.length}/{matches.length}
            </p>
          </div>
        </div>
      </div>

      <div className="border-b border-[#2a2929] p-5 sm:p-6">
        <div className="grid gap-3 xl:grid-cols-[1fr_auto_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#8a8a85]" />

            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por jugador, partida, matchId o nota..."
              className="h-12 rounded-[0.5rem] border-[#2a2929] bg-[#151414] pl-11 text-sm text-[#f5f5f3] placeholder:text-[#8a8a85] focus-visible:border-[#75f0a0] focus-visible:ring-[#75f0a0]/20"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              { value: "all", label: "Todos" },
              { value: "blue", label: "Azul" },
              { value: "red", label: "Rojo" },
            ].map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() =>
                  setWinnerFilter(item.value as "all" | "blue" | "red")
                }
                className={cn(
                  "h-12 rounded-[0.5rem] border px-4 text-xs font-black uppercase tracking-[0.13em] transition",
                  winnerFilter === item.value
                    ? "border-[#f0ed7e]/45 bg-[#f0ed7e] text-[#151414]"
                    : "border-[#2a2929] bg-[#151414] text-[#8a8a85] hover:border-[#f0ed7e]/35 hover:text-[#f0ed7e]",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              { value: "all", label: "Fuentes" },
              { value: "manual", label: "Manual" },
              { value: "riot_api", label: "Riot" },
            ].map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() =>
                  setSourceFilter(
                    item.value as
                      | "all"
                      | "manual"
                      | "riot_api"
                      | "tournament_code",
                  )
                }
                className={cn(
                  "h-12 rounded-[0.5rem] border px-4 text-xs font-black uppercase tracking-[0.13em] transition",
                  sourceFilter === item.value
                    ? "border-[#75f0a0]/45 bg-[#75f0a0] text-[#151414]"
                    : "border-[#2a2929] bg-[#151414] text-[#8a8a85] hover:border-[#75f0a0]/35 hover:text-[#75f0a0]",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="p-5 sm:p-6">
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-[#8a8a85]">
            <Loader2 className="size-4 animate-spin" />
            Cargando historial...
          </div>
        ) : filteredMatches.length > 0 ? (
          <div className="grid gap-4">
            {filteredMatches.map((match) => {
              const expanded = expandedMatchId === match.id;
              const evidence = getMainEvidence(match);

              const bluePlayers = sortByRole(
                match.match_players.filter((player) => player.team === "blue"),
              );

              const redPlayers = sortByRole(
                match.match_players.filter((player) => player.team === "red"),
              );

              const valeUsedCount = match.match_players.filter((player) => {
                return player.vale_used;
              }).length;

              return (
                <article
                  key={match.id}
                  className="rounded-[0.75rem] border border-[#2a2929] bg-[#151414]/80 p-4"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.14em] text-[#f0ed7e]">
                        Partida #{match.match_number}
                      </p>

                      <h2 className="mt-1 text-2xl font-black text-[#f5f5f3]">
                        Ganó {formatTeamName(match.winner_team)}
                      </h2>

                      <p className="mt-1 text-xs text-[#8a8a85]">
                        Confirmada: {formatDateTime(match.completed_at)}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <MiniHistoryStat
                        label="Balance"
                        value={`${Math.round(Number(match.balance_score ?? 0))}%`}
                      />

                      <MiniHistoryStat
                        label="Vales"
                        value={`${valeUsedCount}/10`}
                      />

                      <MiniHistoryStat
                        label="Fuente"
                        value={getSourceLabel(evidence?.source)}
                      />

                      <Button
                        type="button"
                        onClick={() =>
                          setExpandedMatchId(expanded ? null : match.id)
                        }
                        className="h-12 rounded-[0.5rem] border border-[#2a2929] bg-[#101010] px-4 text-xs font-black uppercase tracking-[0.13em] text-[#f5f5f3] hover:border-[#f0ed7e]/35 hover:bg-[#151414] hover:text-[#f0ed7e]"
                      >
                        {expanded ? (
                          <ChevronUp className="mr-2 size-4" />
                        ) : (
                          <ChevronDown className="mr-2 size-4" />
                        )}
                        {expanded ? "Ocultar" : "Ver detalle"}
                      </Button>
                    </div>
                  </div>

                  {expanded ? (
                    <div className="mt-5 border-t border-[#2a2929] pt-5">
                      <div className="grid gap-4 xl:grid-cols-2">
                        <HistoryTeamCard
                          side="blue"
                          winner={match.winner_team === "blue"}
                          players={bluePlayers}
                        />

                        <HistoryTeamCard
                          side="red"
                          winner={match.winner_team === "red"}
                          players={redPlayers}
                        />
                      </div>

                      <div className="mt-4 grid gap-4 xl:grid-cols-2">
                        <HistoryBansCard
                          title="Baneos Equipo Azul"
                          side="blue"
                          bansStatus={match.bans_status}
                          bans={getBansByTeam(match, "blue")}
                        />

                        <HistoryBansCard
                          title="Baneos Equipo Rojo"
                          side="red"
                          bansStatus={match.bans_status}
                          bans={getBansByTeam(match, "red")}
                        />
                      </div>

                      {match.closure_notes ? (
                        <div className="mt-4 rounded-[0.75rem] border border-[#2a2929] bg-[#101010]/70 p-4">
                          <p className="mb-2 text-xs font-black uppercase tracking-[0.14em] text-[#f0ed7e]">
                            Notas de cierre
                          </p>

                          <p className="text-sm leading-6 text-[#c9c9c4]">
                            {match.closure_notes}
                          </p>
                        </div>
                      ) : null}

                      {evidence ? (
                        <div className="mt-4 rounded-[0.75rem] border border-[#2a2929] bg-[#101010]/70 p-4">
                          <div className="mb-2 flex items-center gap-2">
                            <FileSearch className="size-4 text-[#75f0a0]" />
                            <p className="text-xs font-black uppercase tracking-[0.14em] text-[#75f0a0]">
                              Evidencia
                            </p>
                          </div>

                          <div className="grid gap-1 text-sm leading-6 text-[#c9c9c4]">
                            <p>
                              Fuente:{" "}
                              <span className="font-black text-[#f5f5f3]">
                                {getSourceLabel(evidence.source)}
                              </span>
                            </p>

                            {evidence.riot_match_id ? (
                              <p>
                                Match ID:{" "}
                                <span className="font-black text-[#f5f5f3]">
                                  {evidence.riot_match_id}
                                </span>
                              </p>
                            ) : null}

                            {evidence.riot_game_id ? (
                              <p>
                                Game ID:{" "}
                                <span className="font-black text-[#f5f5f3]">
                                  {evidence.riot_game_id}
                                </span>
                              </p>
                            ) : null}

                            {evidence.notes ? <p>{evidence.notes}</p> : null}
                            {evidence.screenshot_url ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setSelectedScreenshotUrl(
                                    evidence.screenshot_url,
                                  )
                                }
                                className="mt-3 inline-flex h-10 items-center justify-center rounded-[0.5rem] border border-[#f0ed7e]/25 bg-[#f0ed7e]/10 px-4 text-xs font-black uppercase tracking-[0.13em] text-[#f0ed7e] transition hover:bg-[#f0ed7e]/15"
                              >
                                <Paperclip className="mr-2 size-4" />
                                Ver comprobante
                              </button>
                            ) : null}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        ) : (
          <div className="rounded-[0.75rem] border border-[#2a2929] bg-[#151414]/70 p-5">
            <div className="mb-4 grid size-10 place-items-center rounded-[0.6rem] border border-[#f0ed7e]/25 bg-[#f0ed7e]/10">
              <Trophy className="size-5 text-[#f0ed7e]" />
            </div>

            <p className="text-sm font-black uppercase tracking-[0.12em] text-[#f0ed7e]">
              Sin resultados
            </p>

            <p className="mt-3 text-sm leading-6 text-[#8a8a85]">
              Todavía no hay partidas confirmadas que coincidan con los filtros.
            </p>
          </div>
        )}

        {message ? (
          <p className="mt-4 rounded-[0.5rem] border border-[#f0ed7e]/25 bg-[#f0ed7e]/10 px-4 py-3 text-sm leading-6 text-[#f5f5f3]">
            {message}
          </p>
        ) : null}
      </div>
      {selectedScreenshotUrl ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/78 px-4 py-6 backdrop-blur-md">
          <div className="relative max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-[1rem] border border-[#f0ed7e]/30 bg-[#101010] p-4 shadow-[0_2rem_6rem_rgba(0,0,0,0.55)]">
            <button
              type="button"
              onClick={() => setSelectedScreenshotUrl(null)}
              className="absolute right-4 top-4 z-10 grid size-9 place-items-center rounded-full border border-[#2a2929] bg-[#151414] text-[#8a8a85] transition hover:border-[#f0ed7e]/40 hover:text-[#f0ed7e]"
              aria-label="Cerrar comprobante"
            >
              <X className="size-4" />
            </button>

            <img
              src={selectedScreenshotUrl}
              alt="Comprobante de partida"
              className="max-h-[84vh] w-full rounded-[0.75rem] object-contain"
            />
          </div>
        </div>
      ) : null}
    </section>
  );
}

function HistoryTeamCard({
  side,
  winner,
  players,
}: {
  side: "blue" | "red";
  winner: boolean;
  players: HistoryMatchPlayer[];
}) {
  const isBlue = side === "blue";

  return (
    <div
      className={cn(
        "rounded-[0.75rem] border p-4",
        isBlue
          ? "border-blue-400/20 bg-blue-400/8"
          : "border-red-400/20 bg-red-400/8",
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <p
          className={cn(
            "text-xs font-black uppercase tracking-[0.14em]",
            isBlue ? "text-blue-200" : "text-red-200",
          )}
        >
          {formatTeamName(side)}
        </p>

        {winner ? (
          <span className="inline-flex items-center rounded-full border border-[#75f0a0]/25 bg-[#75f0a0]/10 px-2 py-1 text-[0.62rem] font-black uppercase tracking-widest text-[#75f0a0]">
            <CheckCircle2 className="mr-1 size-3" />
            Ganador
          </span>
        ) : null}
      </div>

      <div className="grid gap-2">
        {players.map((player) => {
          const delta = getPlayerDelta(player);
          const protectedLoss = Number(player.vale_visible_loss_protected ?? 0);

          return (
            <div
              key={player.id}
              className="flex items-center justify-between gap-3 rounded-[0.5rem] border border-[#2a2929] bg-[#101010]/70 px-3 py-2"
            >
              <div className="flex min-w-0 items-center gap-3">
                <RoleIcon role={player.assigned_role} />

                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-[0.12em] text-[#f0ed7e]">
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

                  {player.champion_name ? (
                    <p className="mt-1 text-xs text-[#c9c9c4]">
                      Campeón:{" "}
                      <span className="font-black text-[#f5f5f3]">
                        {player.champion_name}
                      </span>
                    </p>
                  ) : null}

                  {getPlayerKda(player) ? (
                    <p className="mt-1 text-xs text-[#8a8a85]">
                      KDA: {getPlayerKda(player)}
                    </p>
                  ) : null}

                  {protectedLoss > 0 ? (
                    <p className="mt-1 text-xs text-[#75f0a0]">
                      Pérdida protegida: {Math.round(protectedLoss)} pts
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="shrink-0 text-right">
                <p
                  className={cn(
                    "text-sm font-black",
                    delta > 0
                      ? "text-[#75f0a0]"
                      : delta < 0
                        ? "text-red-300"
                        : "text-[#8a8a85]",
                  )}
                >
                  {delta > 0 ? "+" : ""}
                  {Math.round(delta)}
                </p>

                <p className="text-[0.65rem] text-[#8a8a85]">
                  {Math.round(Number(player.rating_before))}
                  {player.rating_after != null
                    ? ` → ${Math.round(Number(player.rating_after))}`
                    : ""}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function HistoryBansCard({
  title,
  side,
  bansStatus,
  bans,
}: {
  title: string;
  side: "blue" | "red";
  bansStatus: HistoryMatchRecord["bans_status"];
  bans: HistoryMatchBan[];
}) {
  const isBlue = side === "blue";

  return (
    <div
      className={cn(
        "rounded-[0.75rem] border p-4",
        isBlue
          ? "border-blue-400/20 bg-blue-400/8"
          : "border-red-400/20 bg-red-400/8",
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <p
          className={cn(
            "text-xs font-black uppercase tracking-[0.14em]",
            isBlue ? "text-blue-200" : "text-red-200",
          )}
        >
          {title}
        </p>

        <span className="rounded-full border border-[#2a2929] bg-[#101010]/70 px-2 py-1 text-[0.62rem] font-black uppercase tracking-widest text-[#8a8a85]">
          {formatBansStatus(bansStatus)}
        </span>
      </div>

      {bansStatus === "recorded" && bans.length > 0 ? (
        <div className="grid gap-2 sm:grid-cols-5">
          {bans.map((ban) => (
            <div
              key={ban.id}
              className="rounded-3xl border border-[#2a2929] bg-[#101010]/70 px-3 py-2"
            >
              <p className="text-[0.62rem] font-black uppercase tracking-[0.12em] text-[#8a8a85]">
                Ban {ban.ban_order}
              </p>

              <p className="mt-1 truncate text-sm font-black text-[#f5f5f3]">
                {ban.champion_name ?? "-"}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm leading-6 text-[#8a8a85]">
          {bansStatus === "no_bans"
            ? "Esta partida fue marcada como partida sin baneos."
            : "Los baneos no fueron registrados para esta partida."}
        </p>
      )}
    </div>
  );
}

function MiniHistoryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[0.5rem] border border-[#2a2929] bg-[#101010]/80 px-3 py-2">
      <p className="text-[0.62rem] font-black uppercase tracking-[0.12em] text-[#8a8a85]">
        {label}
      </p>
      <p className="mt-1 text-sm font-black text-[#f5f5f3]">{value}</p>
    </div>
  );
}
