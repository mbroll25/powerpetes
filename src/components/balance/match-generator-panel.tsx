"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { getLolRoleIconSrc } from "@/lib/lol-assets";
import {
  Activity,
  Check,
  CheckCircle2,
  Crown,
  Loader2,
  Save,
  Search,
  Swords,
  Users,
  Zap,
} from "lucide-react";
import { gsap } from "gsap";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  generateBalancedTeams,
  type BalancePlayer,
  type BalanceResult,
  type ChampionPool,
  type Playstyle,
  type Role,
} from "@/features/balance/balance-engine";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type MatchGeneratorPanelProps = {
  activeTournamentId: string | null;
};

type PlayerProfileRecord = {
  first_name: string | null;
  last_name: string | null;
  lol_nick: string | null;
  lol_tagline: string | null;
  current_tier: string | null;
  current_division: string | null;
  current_lp: number | null;
  peak_tier: string | null;
  peak_division: string | null;
  primary_role: string | null;
  secondary_role: string | null;
  champion_pool: string | null;
  playstyle: string | null;
  solo_queue_wins: number | null;
  solo_queue_losses: number | null;
};

type TournamentPlayerRecord = {
  id: string;
  user_id: string;
  current_rating: number | string;
  matches_played: number;
  wins: number;
  losses: number;
  profiles: PlayerProfileRecord | null;
};

type PlayerBalanceStatsRecord = {
  user_id: string;
  global_rating: number | string;
  total_matches: number;
  total_wins: number;
  total_losses: number;
  top_rating: number | string;
  jungle_rating: number | string;
  mid_rating: number | string;
  adc_rating: number | string;
  support_rating: number | string;
};

const analysisSteps = [
  "Leyendo perfil competitivo...",
  "Evaluando roles principales y secundarios...",
  "Calculando rating histórico...",
  "Probando combinaciones posibles...",
  "Preparando enfrentamiento...",
];

function normalizeRole(value: string | null): Role | null {
  if (
    value === "TOP" ||
    value === "JUNGLE" ||
    value === "MID" ||
    value === "ADC" ||
    value === "SUPPORT"
  ) {
    return value;
  }

  return null;
}

function normalizeChampionPool(value: string | null): ChampionPool | null {
  if (value === "small" || value === "medium" || value === "large") {
    return value;
  }

  return null;
}

function normalizePlaystyle(value: string | null): Playstyle | null {
  if (value === "aggressive" || value === "balanced" || value === "defensive") {
    return value;
  }

  return null;
}

function formatRole(role: Role) {
  const labels: Record<Role, string> = {
    TOP: "Top",
    JUNGLE: "Jungla",
    MID: "Mid",
    ADC: "ADC",
    SUPPORT: "Soporte",
  };

  return labels[role];
}

function RoleIcon({ role }: { role: Role }) {
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

function formatTier(tier: string | null, division: string | null) {
  if (!tier || tier === "UNRANKED") return "Sin rango";

  const labels: Record<string, string> = {
    IRON: "Hierro",
    BRONZE: "Bronce",
    SILVER: "Plata",
    GOLD: "Oro",
    PLATINUM: "Platino",
    EMERALD: "Esmeralda",
    DIAMOND: "Diamante",
    MASTER: "Maestro",
    GRANDMASTER: "Gran Maestro",
    CHALLENGER: "Retador",
  };

  return `${labels[tier] ?? tier} ${division ?? ""}`.trim();
}

function getDisplayName(profile: PlayerProfileRecord | null) {
  if (!profile?.lol_nick) return "Jugador";

  return `${profile.lol_nick}#${profile.lol_tagline ?? "-"}`;
}

function buildPlayerSignature(players: TournamentPlayerRecord[]) {
  return players
    .map((player) => player.user_id)
    .slice()
    .sort()
    .join("|");
}

function normalizeSearchText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function formatNullableRole(role: string | null) {
  const normalizedRole = normalizeRole(role);

  if (!normalizedRole) return "-";

  return formatRole(normalizedRole);
}

function playerMatchesSearch(
  player: TournamentPlayerRecord,
  normalizedSearch: string,
) {
  const profile = player.profiles;

  const searchableValues = [
    profile?.lol_nick,
    profile?.lol_tagline,
    `${profile?.lol_nick ?? ""}#${profile?.lol_tagline ?? ""}`,
    profile?.first_name,
    profile?.last_name,
    formatTier(
      profile?.current_tier ?? null,
      profile?.current_division ?? null,
    ),
    formatNullableRole(profile?.primary_role ?? null),
    String(Math.round(Number(player.current_rating))),
  ];

  return searchableValues.some((value) => {
    return normalizeSearchText(value ?? "").includes(normalizedSearch);
  });
}

function buildBalancePlayer(
  tournamentPlayer: TournamentPlayerRecord,
  stats: PlayerBalanceStatsRecord | undefined,
): BalancePlayer {
  const profile = tournamentPlayer.profiles;

  return {
    id: tournamentPlayer.user_id,
    displayName: getDisplayName(profile),

    currentTier: profile?.current_tier ?? null,
    currentDivision: profile?.current_division ?? null,
    currentLp: profile?.current_lp ?? null,

    peakTier: profile?.peak_tier ?? null,
    peakDivision: profile?.peak_division ?? null,

    primaryRole: normalizeRole(profile?.primary_role ?? null),
    secondaryRole: normalizeRole(profile?.secondary_role ?? null),

    championPool: normalizeChampionPool(profile?.champion_pool ?? null),
    playstyle: normalizePlaystyle(profile?.playstyle ?? null),

    soloQueueWins: profile?.solo_queue_wins ?? null,
    soloQueueLosses: profile?.solo_queue_losses ?? null,

    globalRating: stats ? Number(stats.global_rating) : null,
    tournamentRating: Number(tournamentPlayer.current_rating),

    totalMatches: stats?.total_matches ?? 0,
    totalWins: stats?.total_wins ?? 0,
    totalLosses: stats?.total_losses ?? 0,

    tournamentMatches: tournamentPlayer.matches_played,
    tournamentWins: tournamentPlayer.wins,
    tournamentLosses: tournamentPlayer.losses,

    roleRatings: stats
      ? {
          TOP: Number(stats.top_rating),
          JUNGLE: Number(stats.jungle_rating),
          MID: Number(stats.mid_rating),
          ADC: Number(stats.adc_rating),
          SUPPORT: Number(stats.support_rating),
        }
      : undefined,
  };
}

export function MatchGeneratorPanel({
  activeTournamentId,
}: MatchGeneratorPanelProps) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const [players, setPlayers] = useState<TournamentPlayerRecord[]>([]);
  const [statsByUserId, setStatsByUserId] = useState<
    Record<string, PlayerBalanceStatsRecord>
  >({});
  const [playerSearch, setPlayerSearch] = useState("");
  const [isPlayerSearchFocused, setIsPlayerSearchFocused] = useState(false);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [balanceResult, setBalanceResult] = useState<BalanceResult | null>(
    null,
  );
  const [isLoadingPlayers, setIsLoadingPlayers] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSavingMatch, setIsSavingMatch] = useState(false);
  const [savedMatchId, setSavedMatchId] = useState<string | null>(null);
  const [savedMatchNumber, setSavedMatchNumber] = useState<number | null>(null);
  const [analysisStep, setAnalysisStep] = useState(0);
  const [message, setMessage] = useState("");

  const selectedPlayers = players.filter((player) => {
    return selectedPlayerIds.includes(player.user_id);
  });

  const tournamentPlayerByUserId = useMemo(() => {
    return players.reduce(
      (map, player) => {
        map[player.user_id] = player;
        return map;
      },
      {} as Record<string, TournamentPlayerRecord>,
    );
  }, [players]);

  const normalizedPlayerSearch = normalizeSearchText(playerSearch);

  const filteredPlayers =
    normalizedPlayerSearch.length > 0
      ? players.filter((player) => {
          return playerMatchesSearch(player, normalizedPlayerSearch);
        })
      : selectedPlayers;

  useEffect(() => {
    async function loadPlayers() {
      setMessage("");
      setPlayers([]);
      setStatsByUserId({});
      setSelectedPlayerIds([]);
      setPlayerSearch("");
      setBalanceResult(null);
      setSavedMatchId(null);
      setSavedMatchNumber(null);

      if (!activeTournamentId) return;

      setIsLoadingPlayers(true);

      const { data: tournamentPlayersData, error: playersError } =
        await supabase
          .from("tournament_players")
          .select(
            `
            id,
            user_id,
            current_rating,
            matches_played,
            wins,
            losses,
            profiles (
              first_name,
              last_name,
              lol_nick,
              lol_tagline,
              current_tier,
              current_division,
              current_lp,
              peak_tier,
              peak_division,
              primary_role,
              secondary_role,
              champion_pool,
              playstyle,
              solo_queue_wins,
              solo_queue_losses
            )
          `,
          )
          .eq("tournament_id", activeTournamentId);

      if (playersError) {
        setIsLoadingPlayers(false);
        setMessage(playersError.message);
        return;
      }

      const tournamentRows = (tournamentPlayersData ??
        []) as unknown as TournamentPlayerRecord[];

      setPlayers(tournamentRows);

      const userIds = tournamentRows.map((player) => player.user_id);

      if (userIds.length > 0) {
        const { data: statsData, error: statsError } = await supabase
          .from("player_balance_stats")
          .select(
            `
            user_id,
            global_rating,
            total_matches,
            total_wins,
            total_losses,
            top_rating,
            jungle_rating,
            mid_rating,
            adc_rating,
            support_rating
          `,
          )
          .in("user_id", userIds);

        if (statsError) {
          setMessage(statsError.message);
        } else {
          const statsMap = (
            (statsData ?? []) as PlayerBalanceStatsRecord[]
          ).reduce(
            (map, stats) => {
              map[stats.user_id] = stats;
              return map;
            },
            {} as Record<string, PlayerBalanceStatsRecord>,
          );

          setStatsByUserId(statsMap);
        }
      }

      setIsLoadingPlayers(false);
    }

    loadPlayers();
  }, [activeTournamentId, supabase]);

  useLayoutEffect(() => {
    if (!balanceResult) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        defaults: {
          ease: "power3.out",
        },
      });

      tl.from("[data-balance-anim='versus']", {
        opacity: 0,
        scale: 0.7,
        duration: 0.5,
      })
        .from(
          "[data-balance-anim='team']",
          {
            opacity: 0,
            x: (index) => (index === 0 ? -48 : 48),
            duration: 0.75,
            stagger: 0.08,
          },
          "-=0.2",
        )
        .from(
          "[data-balance-anim='player']",
          {
            opacity: 0,
            y: 18,
            duration: 0.45,
            stagger: 0.045,
          },
          "-=0.3",
        )
        .from(
          "[data-balance-anim='summary']",
          {
            opacity: 0,
            y: 16,
            duration: 0.55,
          },
          "-=0.2",
        );
    }, rootRef);

    return () => ctx.revert();
  }, [balanceResult]);

  function togglePlayer(userId: string) {
    setBalanceResult(null);
    setMessage("");

    setSelectedPlayerIds((current) => {
      if (current.includes(userId)) {
        return current.filter((id) => id !== userId);
      }

      if (current.length >= 10) {
        setMessage("Ya seleccionaste 10 jugadores.");
        return current;
      }

      return [...current, userId];
    });
  }

  function handleGenerateTeams() {
    setMessage("");

    if (selectedPlayers.length !== 10) {
      setMessage("Seleccioná exactamente 10 jugadores para generar equipos.");
      return;
    }

    const balancePlayers = selectedPlayers.map((player) => {
      return buildBalancePlayer(player, statsByUserId[player.user_id]);
    });

    let result: BalanceResult;

    try {
      result = generateBalancedTeams(balancePlayers);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudieron generar los equipos.",
      );
      return;
    }

    setSavedMatchId(null);
    setSavedMatchNumber(null);
    setBalanceResult(null);
    setIsGenerating(true);
    setAnalysisStep(0);

    analysisSteps.forEach((_, index) => {
      window.setTimeout(() => {
        setAnalysisStep(index);
      }, index * 520);
    });

    window.setTimeout(
      () => {
        setBalanceResult(result);
        setIsGenerating(false);
      },
      analysisSteps.length * 520 + 350,
    );
  }

  async function handleSaveGeneratedMatch() {
    setMessage("");

    if (!activeTournamentId) {
      setMessage("No hay torneo activo.");
      return;
    }

    if (!balanceResult) {
      setMessage("Primero generá los equipos.");
      return;
    }

    if (savedMatchId) {
      setMessage("Esta partida ya fue guardada.");
      return;
    }

    setIsSavingMatch(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setIsSavingMatch(false);
      setMessage("No se encontró la sesión del usuario.");
      return;
    }

    const { count, error: countError } = await supabase
      .from("matches")
      .select("id", { count: "exact", head: true })
      .eq("tournament_id", activeTournamentId);

    if (countError) {
      setIsSavingMatch(false);
      setMessage(countError.message);
      return;
    }

    const nextMatchNumber = (count ?? 0) + 1;
    const playerSignature = buildPlayerSignature(selectedPlayers);

    const { data: matchData, error: matchError } = await supabase
      .from("matches")
      .insert({
        tournament_id: activeTournamentId,
        match_number: nextMatchNumber,
        status: "generated",
        player_signature: playerSignature,
        blue_team_rating: balanceResult.blueTeam.totalRating,
        red_team_rating: balanceResult.redTeam.totalRating,
        blue_win_probability: balanceResult.blueWinProbability,
        red_win_probability: balanceResult.redWinProbability,
        balance_score: balanceResult.balanceScore,
        created_by: user.id,
      })
      .select("id")
      .single();

    if (matchError || !matchData) {
      setIsSavingMatch(false);

      if (matchError?.code === "23505") {
        setMessage(
          "Ya existe una partida pendiente con estos mismos 10 jugadores. Completala o cancelala antes de guardar otra.",
        );
        return;
      }

      setMessage(matchError?.message ?? "No se pudo guardar la partida.");
      return;
    }

    const matchPlayerRows = [
      ...balanceResult.blueTeam.players.map((assignedPlayer) => {
        const tournamentPlayer =
          tournamentPlayerByUserId[assignedPlayer.player.id];

        if (!tournamentPlayer) {
          throw new Error(
            `No se encontró tournament_player para ${assignedPlayer.player.displayName}.`,
          );
        }

        return {
          match_id: matchData.id,
          tournament_player_id: tournamentPlayer.id,
          user_id: assignedPlayer.player.id,
          team: "blue",
          assigned_role: assignedPlayer.assignedRole,
          rating_before:
            assignedPlayer.player.tournamentRating ??
            assignedPlayer.effectiveRating,
          role_rating_before:
            assignedPlayer.player.roleRatings?.[assignedPlayer.assignedRole] ??
            null,
        };
      }),

      ...balanceResult.redTeam.players.map((assignedPlayer) => {
        const tournamentPlayer =
          tournamentPlayerByUserId[assignedPlayer.player.id];

        if (!tournamentPlayer) {
          throw new Error(
            `No se encontró tournament_player para ${assignedPlayer.player.displayName}.`,
          );
        }

        return {
          match_id: matchData.id,
          tournament_player_id: tournamentPlayer.id,
          user_id: assignedPlayer.player.id,
          team: "red",
          assigned_role: assignedPlayer.assignedRole,
          rating_before:
            assignedPlayer.player.tournamentRating ??
            assignedPlayer.effectiveRating,
          role_rating_before:
            assignedPlayer.player.roleRatings?.[assignedPlayer.assignedRole] ??
            null,
        };
      }),
    ];

    const { error: matchPlayersError } = await supabase
      .from("match_players")
      .insert(matchPlayerRows);

    setIsSavingMatch(false);

    if (matchPlayersError) {
      setMessage(matchPlayersError.message);
      return;
    }

    setSavedMatchId(matchData.id);
    setSavedMatchNumber(nextMatchNumber);
    setMessage(
      `Pre-partida #${nextMatchNumber} iniciada. La ventana de vale estará activa durante 60 segundos.`,
    );

    window.dispatchEvent(new Event("riftbalance:pending-matches-updated"));
  }

  if (!activeTournamentId) {
    return (
      <section
        data-dashboard-anim="panel"
        className="relative mt-8 overflow-hidden rounded-[0.75rem] border border-[#2a2929] bg-[#101010]/92 p-5 shadow-[0_1rem_3rem_rgba(0,0,0,0.22)]"
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(240,237,126,0.10),transparent_30%)]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-[#f0ed7e]/30 to-transparent" />

        <div className="relative z-10">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-[#f0ed7e]">
            Generador de partida
          </p>

          <h2 className="mt-3 text-2xl font-black text-[#f5f5f3]">
            Sin torneo activo
          </h2>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#8a8a85]">
            Creá un torneo para poder seleccionar jugadores y generar equipos
            balanceados. Cuando haya un torneo activo, este módulo se convertirá
            en el generador de enfrentamientos.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section
      ref={rootRef}
      data-dashboard-anim="panel"
      className="mt-8 overflow-hidden rounded-[0.75rem] border border-[#2a2929] bg-[#101010]/92 shadow-[0_1rem_3rem_rgba(0,0,0,0.22)]"
    >
      <div className="relative border-b border-[#2a2929] p-5 sm:p-6">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(240,237,126,0.10),transparent_30%)]" />
        <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Swords className="size-4 text-[#f0ed7e]" />
              <p className="text-xs font-black uppercase tracking-[0.14em] text-[#f0ed7e]">
                Generador de partida
              </p>
            </div>

            <h2 className="text-3xl font-black uppercase tracking-[-0.035em] text-[#f5f5f3]">
              Seleccioná 10 jugadores
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#8a8a85]">
              El sistema va a evaluar rating, roles, peak elo, rendimiento
              histórico y estadísticas del torneo para armar el enfrentamiento
              más equilibrado posible.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="rounded-4xl border border-[#2a2929] bg-[#151414]/80 px-4 py-3">
              <p className="text-[0.68rem] font-black uppercase tracking-[0.13em] text-[#8a8a85]">
                Seleccionados
              </p>
              <p className="mt-1 text-xl font-black text-[#f5f5f3]">
                {selectedPlayers.length}/10
              </p>
            </div>

            <Button
              type="button"
              disabled={isGenerating || selectedPlayers.length !== 10}
              onClick={handleGenerateTeams}
              className="h-14 rounded-[0.5rem] bg-[#f0ed7e] px-6 text-xs font-black uppercase tracking-[0.14em] text-[#151414] hover:bg-[#d8d46d]"
            >
              {isGenerating ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Zap className="mr-2 size-4" />
              )}
              {isGenerating ? "Calculando..." : "Generar equipos"}
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 p-5 sm:p-6 xl:grid-cols-[minmax(18rem,24rem)_1fr]">
        <div>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Users className="size-4 text-[#f0ed7e]" />
              <p className="text-xs font-black uppercase tracking-[0.14em] text-[#f0ed7e]">
                Jugadores del torneo
              </p>
            </div>

            <p className="text-xs font-black text-[#8a8a85]">
              {players.length} registrados
            </p>
          </div>

          <div className="relative mb-4">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#8a8a85]" />

            <Input
              value={playerSearch}
              disabled={isLoadingPlayers}
              onFocus={() => setIsPlayerSearchFocused(true)}
              onBlur={() => setIsPlayerSearchFocused(false)}
              onChange={(event) => setPlayerSearch(event.target.value)}
              placeholder="Buscá por nick, nombre, rango o rol..."
              className="h-12 rounded-[0.5rem] border-[#2a2929] bg-[#151414] pl-11 pr-11 text-sm text-[#f5f5f3] placeholder:text-[#8a8a85] focus-visible:border-[#75f0a0] focus-visible:ring-[#75f0a0]/20"
            />

            {isPlayerSearchFocused && !playerSearch ? (
              <div className="absolute left-0 top-[calc(100%+0.5rem)] z-20 rounded-[0.5rem] border border-[#75f0a0]/25 bg-[#101010] px-3 py-2 shadow-[0_1rem_2rem_rgba(0,0,0,0.28)]">
                <p className="text-xs font-medium text-[#c9c9c4]">
                  Escribí para buscar. Los seleccionados quedan fijados.
                </p>
              </div>
            ) : null}
          </div>

          {isLoadingPlayers ? (
            <div className="rounded-[0.75rem] border border-[#2a2929] bg-[#151414]/80 p-5 text-sm text-[#8a8a85]">
              Cargando jugadores...
            </div>
          ) : filteredPlayers.length > 0 ? (
            <div className="custom-scrollbar grid max-h-120 gap-2 overflow-y-auto pr-2">
              {filteredPlayers.map((player) => {
                const profile = player.profiles;
                const selected = selectedPlayerIds.includes(player.user_id);

                return (
                  <button
                    key={player.id}
                    type="button"
                    onClick={() => togglePlayer(player.user_id)}
                    className={cn(
                      "group flex w-full items-center gap-3 rounded-4xl border p-3 text-left transition",
                      selected
                        ? "border-[#f0ed7e]/60 bg-[#f0ed7e]/10"
                        : "border-[#2a2929] bg-[#151414]/80 hover:border-[#f0ed7e]/35 hover:bg-[#1d1c1c]",
                    )}
                  >
                    <div
                      className={cn(
                        "grid size-8 shrink-0 place-items-center rounded-[0.5rem] border",
                        selected
                          ? "border-[#f0ed7e]/50 bg-[#f0ed7e] text-[#151414]"
                          : "border-[#2a2929] bg-[#101010] text-[#8a8a85]",
                      )}
                    >
                      {selected ? <Check className="size-4" /> : null}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-black text-[#f5f5f3]">
                        {getDisplayName(profile)}
                      </p>

                      <p className="mt-1 text-xs text-[#8a8a85]">
                        {formatTier(
                          profile?.current_tier ?? null,
                          profile?.current_division ?? null,
                        )}{" "}
                        · {formatNullableRole(profile?.primary_role ?? null)}
                      </p>
                    </div>

                    <p className="text-xs font-black text-[#f0ed7e]">
                      {Math.round(Number(player.current_rating))}
                    </p>
                  </button>
                );
              })}
            </div>
          ) : normalizedPlayerSearch.length > 0 ? (
            <div className="rounded-[0.75rem] border border-[#2a2929] bg-[#151414]/80 p-5">
              <p className="text-sm leading-6 text-[#8a8a85]">
                No se encontraron jugadores para “{playerSearch}”.
              </p>
            </div>
          ) : (
            <div className="relative overflow-hidden rounded-[0.75rem] border border-[#75f0a0]/25 bg-linear-to-br from-[#75f0a0]/10 via-[#151414]/80 to-[#6c3ea1]/10 p-5">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-[#75f0a0]/50 to-transparent" />

              <div className="relative z-10">
                <div className="mb-4 grid size-10 place-items-center rounded-[0.6rem] border border-[#75f0a0]/25 bg-[#75f0a0]/10">
                  <Search className="size-5 text-[#75f0a0]" />
                </div>

                <p className="text-sm font-black uppercase tracking-[0.12em] text-[#75f0a0]">
                  Buscador inteligente
                </p>

                <p className="mt-3 text-sm leading-6 text-[#c9c9c4]">
                  Escribí una letra del nick, nombre, rango o rol para encontrar
                  jugadores. La lista aparece solo cuando hay búsqueda activa.
                </p>
              </div>
            </div>
          )}

          {message ? (
            <p className="mt-4 rounded-[0.5rem] border border-[#f0ed7e]/25 bg-[#f0ed7e]/10 px-4 py-3 text-sm leading-6 text-[#f5f5f3]">
              {message}
            </p>
          ) : null}
        </div>

        <div className="min-h-112 rounded-[0.75rem] border border-[#2a2929] bg-[#151414]/70 p-5">
          {isGenerating ? (
            <div className="grid min-h-96 place-items-center text-center">
              <div>
                <div className="mx-auto mb-5 grid size-16 place-items-center rounded-full border border-[#f0ed7e]/25 bg-[#f0ed7e]/10">
                  <Activity className="size-7 animate-pulse text-[#f0ed7e]" />
                </div>

                <p className="text-xs font-black uppercase tracking-[0.2em] text-[#f0ed7e]">
                  Calculando balance
                </p>

                <h3 className="mt-3 text-3xl font-black uppercase tracking-[-0.04em] text-[#f5f5f3]">
                  {analysisSteps[analysisStep]}
                </h3>

                <p className="mt-4 text-sm text-[#8a8a85]">
                  El sistema está buscando el enfrentamiento más justo.
                </p>
              </div>
            </div>
          ) : balanceResult ? (
            <div>
              <BalanceReveal result={balanceResult} />

              <div className="mt-5 flex flex-col gap-3 rounded-[0.75rem] border border-[#2a2929] bg-[#101010]/80 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-[#f0ed7e]">
                    Partida generada
                  </p>

                  <p className="mt-1 text-sm leading-6 text-[#8a8a85]">
                    Iniciá la pre-partida para que los 10 jugadores vean los
                    equipos en tiempo real y tengan 60 segundos para usar su
                    vale diario.
                  </p>
                </div>

                <Button
                  type="button"
                  disabled={isSavingMatch || Boolean(savedMatchId)}
                  onClick={handleSaveGeneratedMatch}
                  className="h-12 rounded-[0.5rem] bg-[#f0ed7e] px-5 text-xs font-black uppercase tracking-[0.14em] text-[#151414] hover:bg-[#d8d46d]"
                >
                  {savedMatchId ? (
                    <CheckCircle2 className="mr-2 size-4" />
                  ) : isSavingMatch ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 size-4" />
                  )}

                  {savedMatchId
                    ? `Pre-partida #${savedMatchNumber} iniciada`
                    : isSavingMatch
                      ? "Iniciando..."
                      : "Iniciar pre-partida"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid min-h-96 place-items-center text-center">
              <div>
                <div className="mx-auto mb-5 grid size-16 place-items-center rounded-full border border-[#2a2929] bg-[#101010]">
                  <Swords className="size-7 text-[#f0ed7e]" />
                </div>

                <p className="text-xs font-black uppercase tracking-[0.2em] text-[#f0ed7e]">
                  Esperando jugadores
                </p>

                <h3 className="mt-3 text-3xl font-black uppercase tracking-[-0.04em] text-[#f5f5f3]">
                  El versus aparecerá acá
                </h3>

                <p className="mt-4 max-w-md text-sm leading-6 text-[#8a8a85]">
                  Seleccioná 10 jugadores y generá los equipos. La presentación
                  mostrará rating, roles, probabilidad y explicación del
                  balance.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function BalanceReveal({ result }: { result: BalanceResult }) {
  return (
    <div>
      <div className="grid gap-5 xl:grid-cols-[1fr_auto_1fr] xl:items-center">
        <TeamRevealCard
          side="blue"
          title="Equipo Azul"
          rating={result.blueTeam.totalRating}
          probability={result.blueWinProbability}
          players={result.blueTeam.players}
        />

        <div
          data-balance-anim="versus"
          className="mx-auto grid size-20 place-items-center rounded-full border border-[#f0ed7e]/30 bg-[#f0ed7e]/10 shadow-[0_0_3rem_rgba(240,237,126,0.14)]"
        >
          <p className="text-2xl font-black text-[#f0ed7e]">VS</p>
        </div>

        <TeamRevealCard
          side="red"
          title="Equipo Rojo"
          rating={result.redTeam.totalRating}
          probability={result.redWinProbability}
          players={result.redTeam.players}
        />
      </div>

      <div
        data-balance-anim="summary"
        className="mt-6 rounded-[0.75rem] border border-[#2a2929] bg-[#101010]/80 p-5"
      >
        <div className="grid gap-4 md:grid-cols-3">
          <SummaryStat
            label="Balance"
            value={`${result.balanceScore}%`}
            description="Calidad estimada"
          />

          <SummaryStat
            label="Diferencia"
            value={String(Math.round(result.ratingDifference))}
            description="Rating entre equipos"
          />

          <SummaryStat
            label="Combinaciones"
            value={String(result.evaluatedCombinations)}
            description="Divisiones evaluadas"
          />
        </div>

        <div className="mt-5 border-t border-[#2a2929] pt-5">
          <p className="mb-3 text-xs font-black uppercase tracking-[0.14em] text-[#f0ed7e]">
            Explicación del balance
          </p>

          <div className="grid gap-2">
            {result.explanation.map((item) => (
              <p key={item} className="text-sm leading-6 text-[#c9c9c4]">
                {item}
              </p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function TeamRevealCard({
  side,
  title,
  rating,
  probability,
  players,
}: {
  side: "blue" | "red";
  title: string;
  rating: number;
  probability: number;
  players: BalanceResult["blueTeam"]["players"];
}) {
  const isBlue = side === "blue";

  return (
    <article
      data-balance-anim="team"
      className={cn(
        "relative overflow-hidden rounded-[0.75rem] border p-4",
        isBlue
          ? "border-blue-400/25 bg-blue-400/8"
          : "border-red-400/25 bg-red-400/8",
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent to-transparent",
          isBlue ? "via-blue-300/40" : "via-red-300/40",
        )}
      />

      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p
            className={cn(
              "text-xs font-black uppercase tracking-[0.16em]",
              isBlue ? "text-blue-200" : "text-red-200",
            )}
          >
            {title}
          </p>

          <h3 className="mt-1 text-2xl font-black text-[#f5f5f3]">
            {Math.round(rating)} pts
          </h3>
        </div>

        <div className="rounded-3xl border border-[#2a2929] bg-[#151414]/75 px-3 py-2 text-right">
          <p className="text-[0.65rem] font-black uppercase tracking-[0.13em] text-[#8a8a85]">
            Victoria
          </p>
          <p className="text-base font-black text-[#f5f5f3]">{probability}%</p>
        </div>
      </div>

      <div className="grid gap-2">
        {players.map((assignedPlayer) => {
          const offRole = assignedPlayer.rolePenalty >= 60;

          return (
            <div
              key={`${assignedPlayer.player.id}-${assignedPlayer.assignedRole}`}
              data-balance-anim="player"
              className="rounded-[0.6rem] border border-[#2a2929] bg-[#151414]/80 p-3"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="mb-1 flex items-center gap-2">
                    <RoleIcon role={assignedPlayer.assignedRole} />

                    <p className="text-[0.68rem] font-black uppercase tracking-[0.13em] text-[#f0ed7e]">
                      {formatRole(assignedPlayer.assignedRole)}
                    </p>

                    {offRole ? (
                      <span className="rounded-full border border-red-400/25 bg-red-400/10 px-2 py-0.5 text-[0.62rem] font-black uppercase tracking-widest text-red-200">
                        Fuera de rol
                      </span>
                    ) : null}
                  </div>

                  <p className="truncate text-sm font-black text-[#f5f5f3]">
                    {assignedPlayer.player.displayName}
                  </p>
                </div>

                <div className="shrink-0 text-right">
                  <p className="text-sm font-black text-[#f0ed7e]">
                    {Math.round(assignedPlayer.finalRating)}
                  </p>
                  <p className="text-[0.65rem] text-[#8a8a85]">rating</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </article>
  );
}

function SummaryStat({
  label,
  value,
  description,
}: {
  label: string;
  value: string;
  description: string;
}) {
  return (
    <div className="rounded-4xl border border-[#2a2929] bg-[#151414]/80 p-4">
      <div className="mb-2 flex items-center gap-2">
        <Crown className="size-4 text-[#f0ed7e]" />
        <p className="text-[0.68rem] font-black uppercase tracking-[0.13em] text-[#8a8a85]">
          {label}
        </p>
      </div>

      <p className="text-2xl font-black text-[#f5f5f3]">{value}</p>
      <p className="mt-1 text-xs text-[#8a8a85]">{description}</p>
    </div>
  );
}
