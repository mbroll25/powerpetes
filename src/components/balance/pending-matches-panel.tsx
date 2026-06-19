"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FileSearch,
  Gamepad2,
  Loader2,
  ShieldCheck,
  Swords,
  Trash2,
  Trophy,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import {
  LivePrematchModal,
  type DailyValeUsageRecord,
} from "@/components/balance/live-prematch-modal";
import {
  MatchClosureModal,
  type MatchClosurePayload,
} from "@/components/balance/match-closure-modal";

type PendingMatchesPanelProps = {
  activeTournamentId: string | null;
  isAdmin: boolean;
};

type MatchPlayerProfile = {
  lol_nick: string | null;
  lol_tagline: string | null;
};

type MatchPlayerRecord = {
  id: string;
  user_id: string;
  team: "blue" | "red";
  assigned_role: string;
  rating_before: number | string;
  vale_used: boolean;
  vale_used_at: string | null;
  profiles: MatchPlayerProfile | null;
};

type MatchEvidenceRecord = {
  id: string;
  submitted_by: string;
  source: "manual" | "riot_api" | "tournament_code";
  status: "pending" | "confirmed" | "rejected";
  riot_game_id: string | null;
  riot_match_id: string | null;
  suggested_winner: "blue" | "red" | null;
  riot_payload: RiotValidatedMatch | null;
  notes: string | null;
  screenshot_url: string | null;
  screenshot_expires_at: string | null;
  created_at: string;
};

type PendingMatchRecord = {
  id: string;
  match_number: number;
  blue_team_rating: number | string;
  red_team_rating: number | string;
  blue_win_probability: number | string | null;
  red_win_probability: number | string | null;
  balance_score: number | string | null;
  vale_window_started_at: string | null;
  vale_window_ends_at: string | null;
  created_at: string;
  match_players: MatchPlayerRecord[];
  match_result_submissions: MatchEvidenceRecord[];
  match_finished_at: string | null;
  match_finished_by: string | null;
};

type EvidenceDraft = {
  identifier: string;
  notes: string;
};

type RiotValidatedMatch = {
  riotGameId: string;
  riotMatchId: string;
  gameMode: string;
  gameType: string;
  gameDuration: number;
  suggestedWinner: "blue" | "red" | null;
  teams: {
    blue: Array<{
      name: string;
      championName: string;
      kills: number;
      deaths: number;
      assists: number;
      damage: number;
      gold: number;
      cs: number;
      position: string;
      win: boolean;
    }>;
    red: Array<{
      name: string;
      championName: string;
      kills: number;
      deaths: number;
      assists: number;
      damage: number;
      gold: number;
      cs: number;
      position: string;
      win: boolean;
    }>;
  };
};

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

function getPlayerName(player: MatchPlayerRecord) {
  const profile = player.profiles;

  if (!profile?.lol_nick) return "Jugador";

  return `${profile.lol_nick}#${profile.lol_tagline ?? "-"}`;
}

function sortByRole(players: MatchPlayerRecord[]) {
  const roleOrder = ["TOP", "JUNGLE", "MID", "ADC", "SUPPORT"];

  return players.slice().sort((a, b) => {
    return (
      roleOrder.indexOf(a.assigned_role) - roleOrder.indexOf(b.assigned_role)
    );
  });
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
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

function formatTeamName(team: "blue" | "red") {
  return team === "blue" ? "Equipo Azul" : "Equipo Rojo";
}

function getArgentinaDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value ?? "0000";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";

  return `${year}-${month}-${day}`;
}

function getPendingEvidence(match: PendingMatchRecord) {
  return (
    match.match_result_submissions
      ?.filter((evidence) => evidence.status === "pending")
      .sort((a, b) => {
        return (
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      })[0] ?? null
  );
}

function normalizeGameIdentifier(value: string) {
  const cleanedValue = value.trim().toUpperCase().replaceAll("-", "_");

  if (!cleanedValue) {
    return {
      riotGameId: null,
      riotMatchId: null,
    };
  }

  if (/^\d+$/.test(cleanedValue)) {
    return {
      riotGameId: cleanedValue,
      riotMatchId: `LA2_${cleanedValue}`,
    };
  }

  const matchIdParts = cleanedValue.match(/^([A-Z0-9]+)_(\d+)$/);

  if (matchIdParts) {
    return {
      riotGameId: matchIdParts[2] ?? null,
      riotMatchId: cleanedValue,
    };
  }

  return {
    riotGameId: null,
    riotMatchId: cleanedValue,
  };
}

export function PendingMatchesPanel({
  activeTournamentId,
  isAdmin,
}: PendingMatchesPanelProps) {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [matches, setMatches] = useState<PendingMatchRecord[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [usingValeMatchId, setUsingValeMatchId] = useState<string | null>(null);
  const [dailyValeUsage, setDailyValeUsage] =
    useState<DailyValeUsageRecord | null>(null);
  const [dismissedPrematchMatchId, setDismissedPrematchMatchId] = useState<
    string | null
  >(null);
  const [closingMatch, setClosingMatch] = useState<PendingMatchRecord | null>(
    null,
  );
  const [closingMatchId, setClosingMatchId] = useState<string | null>(null);
  const [finishingMatchId, setFinishingMatchId] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [draftsByMatchId, setDraftsByMatchId] = useState<
    Record<string, EvidenceDraft>
  >({});
  const [isLoading, setIsLoading] = useState(false);
  const [submittingMatchId, setSubmittingMatchId] = useState<string | null>(
    null,
  );
  const [completingMatchId, setCompletingMatchId] = useState<string | null>(
    null,
  );
  const [cancellingMatchId, setCancellingMatchId] = useState<string | null>(
    null,
  );
  const [validatingMatchId, setValidatingMatchId] = useState<string | null>(
    null,
  );
  const [validatedMatchesByMatchId, setValidatedMatchesByMatchId] = useState<
    Record<string, RiotValidatedMatch>
  >({});
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadCurrentUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setCurrentUserId(user?.id ?? null);
    }

    loadCurrentUser();
  }, [supabase]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  const loadPendingMatches = useCallback(async () => {
    setMessage("");

    if (!activeTournamentId) {
      setMatches([]);
      return;
    }

    setIsLoading(true);

    const { data, error } = await supabase
      .from("matches")
      .select(
        `
        id,
        match_number,
        match_finished_at,
        match_finished_by,
        blue_team_rating,
        red_team_rating,
        blue_win_probability,
        red_win_probability,
        balance_score,
        vale_window_started_at,
        vale_window_ends_at,
        created_at,
        match_players (
          id,
          user_id,
          team,
          assigned_role,
          rating_before,
          vale_used,
          vale_used_at,
        profiles (
          lol_nick,
          lol_tagline
  )
),
        match_result_submissions (
  id,
  submitted_by,
  source,
  status,
  riot_game_id,
  riot_match_id,
  suggested_winner,
  riot_payload,
  notes,
  screenshot_url,
  screenshot_expires_at,
  created_at
)
      `,
      )
      .eq("tournament_id", activeTournamentId)
      .eq("status", "generated")
      .order("match_number", { ascending: false });

    setIsLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMatches((data ?? []) as unknown as PendingMatchRecord[]);
  }, [activeTournamentId, supabase]);

  const loadDailyValeStatus = useCallback(async () => {
    if (!currentUserId) {
      setDailyValeUsage(null);
      return;
    }

    const today = getArgentinaDateKey();

    const { data, error } = await supabase
      .from("daily_vale_usages")
      .select("user_id, match_id, used_for_date, used_at")
      .eq("user_id", currentUserId)
      .eq("used_for_date", today)
      .maybeSingle();

    if (error) {
      console.error("No se pudo cargar el estado del vale diario:", error);
      return;
    }

    setDailyValeUsage((data ?? null) as DailyValeUsageRecord | null);
  }, [currentUserId, supabase]);

  useEffect(() => {
    loadDailyValeStatus();
  }, [loadDailyValeStatus]);

  useEffect(() => {
    loadPendingMatches();

    function handlePendingMatchesUpdated() {
      loadPendingMatches();
    }

    window.addEventListener(
      "riftbalance:pending-matches-updated",
      handlePendingMatchesUpdated,
    );

    if (!activeTournamentId) {
      return () => {
        window.removeEventListener(
          "riftbalance:pending-matches-updated",
          handlePendingMatchesUpdated,
        );
      };
    }

    const channel = supabase
      .channel(`pending-matches-${activeTournamentId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "matches",
          filter: `tournament_id=eq.${activeTournamentId}`,
        },
        () => {
          loadPendingMatches();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "match_players",
        },
        () => {
          loadPendingMatches();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "daily_vale_usages",
        },
        () => {
          loadDailyValeStatus();
        },
      )
      .subscribe((status, error) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.error("Error en realtime de partidas pendientes:", error);
        }
      });

    return () => {
      window.removeEventListener(
        "riftbalance:pending-matches-updated",
        handlePendingMatchesUpdated,
      );

      void supabase.removeChannel(channel);
    };
  }, [activeTournamentId, loadPendingMatches, loadDailyValeStatus, supabase]);

  function updateDraft(matchId: string, patch: Partial<EvidenceDraft>) {
    setDraftsByMatchId((current) => {
      const currentDraft = current[matchId] ?? {
        identifier: "",
        notes: "",
      };

      return {
        ...current,
        [matchId]: {
          ...currentDraft,
          ...patch,
        },
      };
    });
  }

  async function handleSubmitEvidence(matchId: string) {
    const draft = draftsByMatchId[matchId] ?? {
      identifier: "",
      notes: "",
    };

    const normalizedIds = normalizeGameIdentifier(draft.identifier);
    const notes = draft.notes.trim();

    const validatedMatch = validatedMatchesByMatchId[matchId] ?? null;

    if (!normalizedIds.riotGameId && !normalizedIds.riotMatchId && !notes) {
      setMessage("Cargá un ID del juego o una nota para enviar evidencia.");
      return;
    }

    setMessage("");
    setSubmittingMatchId(matchId);

    const source =
      normalizedIds.riotGameId || normalizedIds.riotMatchId
        ? "riot_api"
        : "manual";

    const { error } = await supabase.rpc("submit_match_evidence", {
      p_match_id: matchId,
      p_source: validatedMatch ? "riot_api" : source,
      p_riot_game_id: validatedMatch?.riotGameId ?? normalizedIds.riotGameId,
      p_riot_match_id: validatedMatch?.riotMatchId ?? normalizedIds.riotMatchId,
      p_notes:
        notes ||
        (validatedMatch
          ? `Validado con Riot. Ganador sugerido: ${
              validatedMatch.suggestedWinner === "blue"
                ? "Equipo Azul"
                : validatedMatch.suggestedWinner === "red"
                  ? "Equipo Rojo"
                  : "No detectado"
            }.`
          : null),
      p_suggested_winner: validatedMatch?.suggestedWinner ?? null,
      p_riot_payload: validatedMatch ?? null,
    });

    setSubmittingMatchId(null);

    if (error) {
      setMessage(error.message);
      return;
    }

    setDraftsByMatchId((current) => {
      const next = { ...current };
      delete next[matchId];
      return next;
    });

    await loadPendingMatches();
    setMessage("Evidencia enviada. Queda pendiente de revisión admin.");
  }

  async function handleUseVale(matchId: string) {
    setMessage("");

    if (!currentUserId) {
      setMessage("No se pudo identificar tu usuario.");
      return;
    }

    setUsingValeMatchId(matchId);

    const { error } = await supabase.rpc("use_daily_vale_for_match", {
      p_match_id: matchId,
    });

    const usedAt = new Date().toISOString();

    setUsingValeMatchId(null);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMatches((current) => {
      return current.map((match) => {
        if (match.id !== matchId) return match;

        return {
          ...match,
          match_players: match.match_players.map((player) => {
            if (player.user_id !== currentUserId) return player;

            return {
              ...player,
              vale_used: true,
              vale_used_at: usedAt,
            };
          }),
        };
      });
    });

    setDailyValeUsage({
      user_id: currentUserId,
      match_id: matchId,
      used_for_date: getArgentinaDateKey(),
      used_at: usedAt,
    });

    setMessage(
      "Vale diario activado. Si perdés esta partida, no perderás puntos visibles.",
    );
  }

  async function handleValidateWithRiot(matchId: string) {
    const draft = draftsByMatchId[matchId] ?? {
      identifier: "",
      notes: "",
    };

    if (!draft.identifier.trim()) {
      setMessage("Ingresá un ID del juego o matchId para validar con Riot.");
      return;
    }

    setMessage("");
    setValidatingMatchId(matchId);

    const response = await fetch("/api/riot/match", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        identifier: draft.identifier,
      }),
    });

    const data = await response.json();

    setValidatingMatchId(null);

    if (!response.ok) {
      setMessage(data.error ?? "No se pudo validar la partida con Riot.");
      return;
    }

    setValidatedMatchesByMatchId((current) => {
      return {
        ...current,
        [matchId]: data as RiotValidatedMatch,
      };
    });

    const winnerText =
      data.suggestedWinner === "blue"
        ? "Ganador detectado: Equipo Azul."
        : data.suggestedWinner === "red"
          ? "Ganador detectado: Equipo Rojo."
          : "No se pudo detectar ganador.";

    setMessage(`Partida validada con Riot. ${winnerText}`);
  }

  async function handleSubmitMatchClosure(payload: MatchClosurePayload) {
    setMessage("");
    setClosingMatchId(payload.matchId);

    const { error } = await supabase.rpc("close_match_with_manual_data", {
      p_match_id: payload.matchId,
      p_winner_team: payload.winnerTeam,
      p_bans_status: payload.bansStatus,
      p_blue_bans: payload.blueBans,
      p_red_bans: payload.redBans,
      p_players: payload.players,
      p_notes: payload.notes || null,
    });

    setClosingMatchId(null);

    if (error) {
      setMessage(error.message);
      return;
    }

    setClosingMatch(null);

    setMatches((current) => {
      return current.filter(
        (currentMatch) => currentMatch.id !== payload.matchId,
      );
    });

    setMessage(
      `Partida cerrada correctamente. Ganó ${
        payload.winnerTeam === "blue" ? "Equipo Azul" : "Equipo Rojo"
      }.`,
    );

    window.dispatchEvent(new Event("riftbalance:completed-matches-updated"));

    router.refresh();
  }

  async function handleMarkMatchFinished(match: PendingMatchRecord) {
    setMessage("");
    setFinishingMatchId(match.id);

    const { error } = await supabase.rpc("mark_match_as_finished", {
      p_match_id: match.id,
    });

    const finishedAt = new Date().toISOString();

    setFinishingMatchId(null);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMatches((current) => {
      return current.map((currentMatch) => {
        if (currentMatch.id !== match.id) return currentMatch;

        return {
          ...currentMatch,
          match_finished_at: finishedAt,
          match_finished_by: currentUserId,
        };
      });
    });

    setMessage(
      "Partida marcada como finalizada. Ya podés cargar evidencia y cerrar el resultado.",
    );
  }

  async function handleCancelPendingMatch(match: PendingMatchRecord) {
    const confirmed = window.confirm(
      `¿Cancelar la partida #${match.match_number}? Esta acción no modifica ratings ni estadísticas.`,
    );

    if (!confirmed) return;

    setMessage("");
    setCancellingMatchId(match.id);

    const { error } = await supabase.rpc("cancel_pending_match", {
      p_match_id: match.id,
      p_reason: "Cancelada manualmente desde el panel admin.",
    });

    setCancellingMatchId(null);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMatches((current) => {
      return current.filter((currentMatch) => currentMatch.id !== match.id);
    });

    router.refresh();
  }

  const livePrematchMatch = useMemo(() => {
    if (!currentUserId) return null;

    return (
      matches.find((match) => {
        const isParticipant = match.match_players.some((player) => {
          return player.user_id === currentUserId;
        });

        const secondsRemaining = getSecondsRemaining(
          match.vale_window_ends_at,
          now,
        );

        return isParticipant && secondsRemaining > 0;
      }) ?? null
    );
  }, [currentUserId, matches, now]);

  const showInitialLoading = isLoading && matches.length === 0;

  if (!activeTournamentId) {
    return null;
  }

  return (
    <section
      data-dashboard-anim="panel"
      className="mt-8 overflow-hidden rounded-[0.75rem] border border-[#2a2929] bg-[#101010]/92 shadow-[0_1rem_3rem_rgba(0,0,0,0.22)]"
    >
      <div className="relative border-b border-[#2a2929] p-5 sm:p-6">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(117,240,160,0.08),transparent_30%)]" />

        <div className="relative z-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Trophy className="size-4 text-[#f0ed7e]" />
              <p className="text-xs font-black uppercase tracking-[0.14em] text-[#f0ed7e]">
                Resultados pendientes
              </p>
            </div>

            <h2 className="text-2xl font-black text-[#f5f5f3]">
              Partidas generadas
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#8a8a85]">
              Los jugadores pueden cargar evidencia. El admin define quién ganó
              y recién ahí se actualizan la tabla y el rating.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <div
              className={cn(
                "rounded-4xl border px-4 py-3",
                dailyValeUsage
                  ? "border-[#2a2929] bg-[#151414]/80"
                  : "border-[#75f0a0]/25 bg-[#75f0a0]/10",
              )}
            >
              <p className="text-[0.68rem] font-black uppercase tracking-[0.13em] text-[#8a8a85]">
                Vale diario
              </p>
              <p
                className={cn(
                  "mt-1 text-xl font-black",
                  dailyValeUsage ? "text-[#f5f5f3]" : "text-[#75f0a0]",
                )}
              >
                {dailyValeUsage ? "Usado" : "Disponible"}
              </p>
            </div>

            <div className="rounded-4xl border border-[#2a2929] bg-[#151414]/80 px-4 py-3">
              <p className="text-[0.68rem] font-black uppercase tracking-[0.13em] text-[#8a8a85]">
                Pendientes
              </p>
              <p className="mt-1 text-xl font-black text-[#f5f5f3]">
                {matches.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-5 sm:p-6">
        {showInitialLoading ? (
          <p className="text-sm text-[#8a8a85]">Cargando partidas...</p>
        ) : matches.length > 0 ? (
          <div className="grid gap-4">
            {matches.map((match) => {
              const bluePlayers = sortByRole(
                match.match_players.filter((player) => player.team === "blue"),
              );

              const redPlayers = sortByRole(
                match.match_players.filter((player) => player.team === "red"),
              );

              const pendingEvidence = getPendingEvidence(match);
              const draft = draftsByMatchId[match.id] ?? {
                identifier: "",
                notes: "",
              };

              const validatedMatch =
                validatedMatchesByMatchId[match.id] ?? null;

              const currentMatchPlayer = currentUserId
                ? (match.match_players.find(
                    (player) => player.user_id === currentUserId,
                  ) ?? null)
                : null;

              const secondsRemaining = getSecondsRemaining(
                match.vale_window_ends_at,
                now,
              );

              const valeWindowOpen = secondsRemaining > 0;
              const currentPlayerValeUsed = Boolean(
                currentMatchPlayer?.vale_used,
              );
              const valeUsedCount = match.match_players.filter((player) => {
                return player.vale_used;
              }).length;

              return (
                <article
                  key={match.id}
                  className="rounded-[0.75rem] border border-[#2a2929] bg-[#151414]/80 p-4"
                >
                  <div className="mb-4 flex flex-col gap-3 border-b border-[#2a2929] pb-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.14em] text-[#f0ed7e]">
                        Partida #{match.match_number}
                      </p>

                      <h3 className="mt-1 text-xl font-black text-[#f5f5f3]">
                        Equipo Azul vs Equipo Rojo
                      </h3>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <MiniMatchStat
                        label="Balance"
                        value={`${Math.round(Number(match.balance_score ?? 0))}%`}
                      />
                      <MiniMatchStat
                        label="Azul"
                        value={`${Math.round(
                          Number(match.blue_win_probability ?? 50),
                        )}%`}
                      />
                      <MiniMatchStat
                        label="Rojo"
                        value={`${Math.round(
                          Number(match.red_win_probability ?? 50),
                        )}%`}
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 xl:grid-cols-2">
                    <PendingTeamCard
                      side="blue"
                      title="Equipo Azul"
                      players={bluePlayers}
                    />

                    <PendingTeamCard
                      side="red"
                      title="Equipo Rojo"
                      players={redPlayers}
                    />
                  </div>

                  <div className="mt-4 rounded-[0.75rem] border border-[#f0ed7e]/25 bg-[#f0ed7e]/8 p-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.14em] text-[#f0ed7e]">
                          Ventana de vale diario
                        </p>

                        <h4 className="mt-2 text-xl font-black text-[#f5f5f3]">
                          {valeWindowOpen
                            ? `Cierra en ${formatCountdown(secondsRemaining)}`
                            : "Ventana cerrada"}
                        </h4>

                        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#8a8a85]">
                          Cada jugador tiene 60 segundos para activar su vale.
                          Si pierde con vale activo, no pierde puntos visibles,
                          pero la partida sigue contando para estadísticas y
                          matchmaking.
                        </p>
                      </div>

                      <div className="rounded-[0.6rem] border border-[#2a2929] bg-[#101010]/80 px-4 py-3 text-right">
                        <p className="text-[0.68rem] font-black uppercase tracking-[0.13em] text-[#8a8a85]">
                          Vales usados
                        </p>
                        <p className="mt-1 text-xl font-black text-[#f5f5f3]">
                          {valeUsedCount}/10
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 border-t border-[#2a2929] pt-4">
                      {currentMatchPlayer ? (
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                          <div>
                            <p className="text-sm font-black text-[#f5f5f3]">
                              Tu equipo:{" "}
                              {formatTeamName(currentMatchPlayer.team)}
                            </p>

                            <p className="mt-1 text-xs text-[#8a8a85]">
                              Rol asignado:{" "}
                              {formatRole(currentMatchPlayer.assigned_role)}
                            </p>
                          </div>

                          <Button
                            type="button"
                            disabled={
                              !valeWindowOpen ||
                              currentPlayerValeUsed ||
                              usingValeMatchId === match.id
                            }
                            onClick={() => handleUseVale(match.id)}
                            className="h-11 rounded-[0.5rem] border border-[#75f0a0]/25 bg-[#75f0a0]/10 px-5 text-xs font-black uppercase tracking-[0.14em] text-[#75f0a0] hover:bg-[#75f0a0]/15 disabled:cursor-not-allowed disabled:opacity-45"
                          >
                            {usingValeMatchId === match.id ? (
                              <Loader2 className="mr-2 size-4 animate-spin" />
                            ) : (
                              <ShieldCheck className="mr-2 size-4" />
                            )}

                            {currentPlayerValeUsed
                              ? "Vale activado"
                              : valeWindowOpen
                                ? "Usar vale diario"
                                : "Ventana cerrada"}
                          </Button>
                        </div>
                      ) : (
                        <p className="text-sm leading-6 text-[#8a8a85]">
                          No participás en esta partida. Solo los 10 jugadores
                          asignados pueden usar vale.
                        </p>
                      )}
                    </div>
                  </div>

                  {!match.match_finished_at ? (
                    <div className="mt-4 rounded-[0.75rem] border border-[#f0ed7e]/25 bg-[#f0ed7e]/10 p-5">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <p className="text-xs font-black uppercase tracking-[0.14em] text-[#f0ed7e]">
                            Partida en curso
                          </p>

                          <h4 className="mt-2 text-2xl font-black text-[#f5f5f3]">
                            Esperando finalización
                          </h4>

                          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#8a8a85]">
                            Cuando la partida termine, el administrador debe
                            marcarla como finalizada. Recién después se
                            habilitará la carga de evidencia y el cierre
                            oficial.
                          </p>
                        </div>

                        {isAdmin ? (
                          <div className="grid gap-3 sm:min-w-64">
                            <Button
                              type="button"
                              disabled={
                                finishingMatchId === match.id ||
                                Boolean(cancellingMatchId) ||
                                Boolean(closingMatchId)
                              }
                              onClick={() => handleMarkMatchFinished(match)}
                              className="h-12 rounded-[0.5rem] bg-[#f0ed7e] px-5 text-xs font-black uppercase tracking-[0.14em] text-[#151414] hover:bg-[#d8d46d]"
                            >
                              {finishingMatchId === match.id ? (
                                <Loader2 className="mr-2 size-4 animate-spin" />
                              ) : (
                                <ShieldCheck className="mr-2 size-4" />
                              )}
                              Finalizó la partida
                            </Button>

                            <Button
                              type="button"
                              disabled={
                                finishingMatchId === match.id ||
                                Boolean(cancellingMatchId) ||
                                Boolean(closingMatchId)
                              }
                              onClick={() => handleCancelPendingMatch(match)}
                              className="h-12 rounded-[0.5rem] border border-red-400/25 bg-transparent px-5 text-xs font-black uppercase tracking-[0.14em] text-red-200 hover:bg-red-400/10"
                            >
                              {cancellingMatchId === match.id ? (
                                <Loader2 className="mr-2 size-4 animate-spin" />
                              ) : (
                                <Trash2 className="mr-2 size-4" />
                              )}
                              Cancelar pendiente
                            </Button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_22rem]">
                      <div className="rounded-4xl border border-[#2a2929] bg-[#101010]/70 p-4">
                        <div className="mb-3 flex items-center gap-2">
                          <FileSearch className="size-4 text-[#75f0a0]" />
                          <p className="text-xs font-black uppercase tracking-[0.14em] text-[#75f0a0]">
                            Evidencia
                          </p>
                        </div>

                        {pendingEvidence ? (
                          <div className="rounded-3xl border border-[#75f0a0]/25 bg-[#75f0a0]/10 p-4">
                            <p className="text-xs font-black uppercase tracking-[0.12em] text-[#75f0a0]">
                              Evidencia pendiente
                            </p>

                            <div className="mt-3 grid gap-2 text-sm leading-6 text-[#c9c9c4]">
                              {pendingEvidence.riot_game_id ? (
                                <p>
                                  ID del juego:{" "}
                                  <span className="font-black text-[#f5f5f3]">
                                    {pendingEvidence.riot_game_id}
                                  </span>
                                </p>
                              ) : null}

                              {pendingEvidence.riot_match_id ? (
                                <p>
                                  Match ID:{" "}
                                  <span className="font-black text-[#f5f5f3]">
                                    {pendingEvidence.riot_match_id}
                                  </span>
                                </p>
                              ) : null}

                              {pendingEvidence.suggested_winner ? (
                                <p>
                                  Ganador sugerido por Riot:{" "}
                                  <span className="font-black text-[#f5f5f3]">
                                    {pendingEvidence.suggested_winner === "blue"
                                      ? "Equipo Azul"
                                      : "Equipo Rojo"}
                                  </span>
                                </p>
                              ) : null}

                              {pendingEvidence.notes ? (
                                <p>{pendingEvidence.notes}</p>
                              ) : null}

                              <p className="text-xs text-[#8a8a85]">
                                Enviado:{" "}
                                {formatDateTime(pendingEvidence.created_at)}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="grid gap-3">
                            <Input
                              value={draft.identifier}
                              onChange={(event) =>
                                updateDraft(match.id, {
                                  identifier: event.target.value,
                                })
                              }
                              placeholder="ID del juego o matchId. Ej: 1602703298"
                              className="h-12 rounded-[0.5rem] border-[#2a2929] bg-[#151414] text-sm text-[#f5f5f3] placeholder:text-[#8a8a85] focus-visible:border-[#75f0a0] focus-visible:ring-[#75f0a0]/20"
                            />

                            <Button
                              type="button"
                              disabled={
                                validatingMatchId === match.id ||
                                !draft.identifier.trim()
                              }
                              onClick={() => handleValidateWithRiot(match.id)}
                              className="h-11 rounded-[0.5rem] border border-[#f0ed7e]/25 bg-[#f0ed7e]/10 text-xs font-black uppercase tracking-[0.14em] text-[#f0ed7e] hover:bg-[#f0ed7e]/15"
                            >
                              {validatingMatchId === match.id ? (
                                <Loader2 className="mr-2 size-4 animate-spin" />
                              ) : (
                                <Gamepad2 className="mr-2 size-4" />
                              )}
                              Validar con Riot
                            </Button>

                            {validatedMatch ? (
                              <div className="rounded-4xl border border-[#75f0a0]/25 bg-[#75f0a0]/10 p-4">
                                <p className="text-xs font-black uppercase tracking-[0.12em] text-[#75f0a0]">
                                  Riot encontró la partida
                                </p>

                                <p className="mt-2 text-sm leading-6 text-[#c9c9c4]">
                                  Match ID:{" "}
                                  <span className="font-black text-[#f5f5f3]">
                                    {validatedMatch.riotMatchId}
                                  </span>
                                </p>

                                <p className="text-sm leading-6 text-[#c9c9c4]">
                                  Duración:{" "}
                                  <span className="font-black text-[#f5f5f3]">
                                    {Math.floor(
                                      validatedMatch.gameDuration / 60,
                                    )}
                                    m {validatedMatch.gameDuration % 60}s
                                  </span>
                                </p>

                                <p className="text-sm leading-6 text-[#c9c9c4]">
                                  Ganador sugerido:{" "}
                                  <span className="font-black text-[#f5f5f3]">
                                    {validatedMatch.suggestedWinner === "blue"
                                      ? "Equipo Azul"
                                      : validatedMatch.suggestedWinner === "red"
                                        ? "Equipo Rojo"
                                        : "No detectado"}
                                  </span>
                                </p>

                                <div className="mt-3 grid gap-2">
                                  {[
                                    ...validatedMatch.teams.blue,
                                    ...validatedMatch.teams.red,
                                  ]
                                    .slice(0, 10)
                                    .map((player) => (
                                      <div
                                        key={`${player.name}-${player.championName}`}
                                        className="rounded-[0.5rem] border border-[#2a2929] bg-[#101010]/70 px-3 py-2"
                                      >
                                        <p className="text-sm font-black text-[#f5f5f3]">
                                          {player.name} · {player.championName}
                                        </p>
                                        <p className="mt-1 text-xs text-[#8a8a85]">
                                          {player.kills}/{player.deaths}/
                                          {player.assists} · CS {player.cs} ·
                                          Daño {player.damage}
                                        </p>
                                      </div>
                                    ))}
                                </div>
                              </div>
                            ) : null}

                            <Textarea
                              value={draft.notes}
                              onChange={(event) =>
                                updateDraft(match.id, {
                                  notes: event.target.value,
                                })
                              }
                              placeholder="Nota opcional para el admin..."
                              className="min-h-24 rounded-[0.5rem] border-[#2a2929] bg-[#151414] text-sm text-[#f5f5f3] placeholder:text-[#8a8a85] focus-visible:border-[#75f0a0] focus-visible:ring-[#75f0a0]/20"
                            />

                            <Button
                              type="button"
                              disabled={submittingMatchId === match.id}
                              onClick={() => handleSubmitEvidence(match.id)}
                              className="h-11 rounded-[0.5rem] border border-[#75f0a0]/25 bg-[#75f0a0]/10 text-xs font-black uppercase tracking-[0.14em] text-[#75f0a0] hover:bg-[#75f0a0]/15"
                            >
                              {submittingMatchId === match.id ? (
                                <Loader2 className="mr-2 size-4 animate-spin" />
                              ) : (
                                <Gamepad2 className="mr-2 size-4" />
                              )}
                              Enviar evidencia
                            </Button>

                            <p className="text-xs leading-5 text-[#8a8a85]">
                              Las capturas futuras serán temporales y se
                              borrarán automáticamente luego de 7 días.
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="rounded-4xl border border-[#2a2929] bg-[#101010]/70 p-4">
                        <div className="mb-3 flex items-center gap-2">
                          <ShieldCheck className="size-4 text-[#f0ed7e]" />
                          <p className="text-xs font-black uppercase tracking-[0.14em] text-[#f0ed7e]">
                            Decisión admin
                          </p>
                        </div>

                        {isAdmin ? (
                          <div>
                            <p className="mb-3 text-sm leading-6 text-[#8a8a85]">
                              Revisá la evidencia y elegí el ganador oficial.
                            </p>

                            <div className="grid gap-3">
                              <Button
                                type="button"
                                disabled={
                                  Boolean(cancellingMatchId) ||
                                  closingMatchId === match.id
                                }
                                onClick={() => setClosingMatch(match)}
                                className="h-12 rounded-[0.5rem] bg-[#f0ed7e] px-5 text-xs font-black uppercase tracking-[0.14em] text-[#151414] hover:bg-[#d8d46d]"
                              >
                                {closingMatchId === match.id ? (
                                  <Loader2 className="mr-2 size-4 animate-spin" />
                                ) : (
                                  <ShieldCheck className="mr-2 size-4" />
                                )}
                                Cargar cierre de partida
                              </Button>

                              <Button
                                type="button"
                                disabled={
                                  Boolean(completingMatchId) ||
                                  Boolean(cancellingMatchId) ||
                                  Boolean(closingMatchId)
                                }
                                onClick={() => handleCancelPendingMatch(match)}
                                className="h-12 rounded-[0.5rem] border border-red-400/25 bg-transparent px-5 text-xs font-black uppercase tracking-[0.14em] text-red-200 hover:bg-red-400/10"
                              >
                                {cancellingMatchId === match.id ? (
                                  <Loader2 className="mr-2 size-4 animate-spin" />
                                ) : (
                                  <Trash2 className="mr-2 size-4" />
                                )}
                                Cancelar pendiente
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm leading-6 text-[#8a8a85]">
                            El resultado queda pendiente hasta que un admin
                            revise la evidencia y confirme quién ganó.
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        ) : (
          <div className="rounded-[0.75rem] border border-[#2a2929] bg-[#151414]/70 p-5">
            <div className="mb-4 grid size-10 place-items-center rounded-[0.6rem] border border-[#f0ed7e]/25 bg-[#f0ed7e]/10">
              <Swords className="size-5 text-[#f0ed7e]" />
            </div>

            <p className="text-sm font-black uppercase tracking-[0.12em] text-[#f0ed7e]">
              Sin partidas pendientes
            </p>

            <p className="mt-3 text-sm leading-6 text-[#8a8a85]">
              Cuando se guarde una partida generada, aparecerá acá para cargar
              evidencia y confirmar resultado.
            </p>
          </div>
        )}

        {message ? (
          <p className="mt-4 rounded-[0.5rem] border border-[#f0ed7e]/25 bg-[#f0ed7e]/10 px-4 py-3 text-sm leading-6 text-[#f5f5f3]">
            {message}
          </p>
        ) : null}
      </div>

      {livePrematchMatch &&
      currentUserId &&
      dismissedPrematchMatchId !== livePrematchMatch.id ? (
        <LivePrematchModal
          match={livePrematchMatch}
          currentUserId={currentUserId}
          dailyValeUsage={dailyValeUsage}
          now={now}
          isUsingVale={usingValeMatchId === livePrematchMatch.id}
          onUseVale={handleUseVale}
          onClose={() => setDismissedPrematchMatchId(livePrematchMatch.id)}
        />
      ) : null}

      {closingMatch ? (
        <MatchClosureModal
          match={closingMatch}
          isSaving={closingMatchId === closingMatch.id}
          onClose={() => setClosingMatch(null)}
          onSubmit={handleSubmitMatchClosure}
        />
      ) : null}
    </section>
  );
}

function PendingTeamCard({
  side,
  title,
  players,
}: {
  side: "blue" | "red";
  title: string;
  players: MatchPlayerRecord[];
}) {
  const isBlue = side === "blue";

  return (
    <div
      className={cn(
        "rounded-4xl border p-4",
        isBlue
          ? "border-blue-400/20 bg-blue-400/8"
          : "border-red-400/20 bg-red-400/8",
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

      <div className="grid gap-2">
        {players.map((player) => (
          <div
            key={player.id}
            className="flex items-center justify-between gap-3 rounded-[0.5rem] border border-[#2a2929] bg-[#101010]/70 px-3 py-2"
          >
            <div>
              <p className="text-xs font-black uppercase tracking-[0.12em] text-[#f0ed7e]">
                {formatRole(player.assigned_role)}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <p className="text-sm font-black text-[#f5f5f3]">
                  {getPlayerName(player)}
                </p>

                {player.vale_used ? (
                  <span className="rounded-full border border-[#75f0a0]/25 bg-[#75f0a0]/10 px-2 py-0.5 text-[0.62rem] font-black uppercase tracking-widest text-[#75f0a0]">
                    Vale
                  </span>
                ) : null}
              </div>
            </div>

            <p className="text-xs font-black text-[#8a8a85]">
              {Math.round(Number(player.rating_before))}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function MiniMatchStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[0.5rem] border border-[#2a2929] bg-[#101010]/80 px-3 py-2">
      <p className="text-[0.62rem] font-black uppercase tracking-[0.12em] text-[#8a8a85]">
        {label}
      </p>
      <p className="mt-1 text-sm font-black text-[#f5f5f3]">{value}</p>
    </div>
  );
}
