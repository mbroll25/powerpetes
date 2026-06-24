"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Clock3,
  Loader2,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { ClientPortal } from "@/components/ui/client-portal";
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
  primary_role: string | null;
  secondary_role: string | null;
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
  riot_payload: unknown | null;
  notes: string | null;
  screenshot_path: string | null;
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

const VALE_WINDOW_SECONDS = 60;

function getValeWindowDeadline({
  startedAt,
  endsAt,
}: {
  startedAt: string | null;
  endsAt: string | null;
}) {
  if (!startedAt && !endsAt) return null;

  const startedDeadline = startedAt
    ? new Date(new Date(startedAt).getTime() + VALE_WINDOW_SECONDS * 1000)
    : null;

  const storedDeadline = endsAt ? new Date(endsAt) : null;

  if (startedDeadline && storedDeadline) {
    return startedDeadline.getTime() <= storedDeadline.getTime()
      ? startedDeadline
      : storedDeadline;
  }

  return startedDeadline ?? storedDeadline;
}

function getValeSecondsRemaining({
  startedAt,
  endsAt,
  now,
}: {
  startedAt: string | null;
  endsAt: string | null;
  now: number;
}) {
  const deadline = getValeWindowDeadline({ startedAt, endsAt });

  if (!deadline) return 0;

  const remaining = Math.ceil((deadline.getTime() - now) / 1000);

  return Math.max(0, Math.min(VALE_WINDOW_SECONDS, remaining));
}

function formatValeCountdown(seconds: number) {
  const safeSeconds = Math.max(0, Math.min(VALE_WINDOW_SECONDS, seconds));

  return `${safeSeconds}s`;
}

function formatTeamName(team: "blue" | "red") {
  return team === "blue" ? "Equipo Azul" : "Equipo Rojo";
}

function isComfortableAssignedRole(player: MatchPlayerRecord) {
  const profile = player.profiles;

  return (
    profile?.primary_role === player.assigned_role ||
    profile?.secondary_role === player.assigned_role
  );
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

function getEvidenceFileExtension(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase();

  if (extension && ["png", "jpg", "jpeg", "webp"].includes(extension)) {
    return extension;
  }

  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";

  return "jpg";
}

function createEvidenceStoragePath({
  tournamentId,
  matchId,
  userId,
  file,
}: {
  tournamentId: string;
  matchId: string;
  userId: string;
  file: File;
}) {
  const extension = getEvidenceFileExtension(file);
  const uniqueId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  return `${userId}/${tournamentId}/${matchId}/evidence-${uniqueId}.${extension}`;
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
  const [cancellingMatchId, setCancellingMatchId] = useState<string | null>(
    null,
  );
  const [now, setNow] = useState(() => Date.now());
  const [isLoading, setIsLoading] = useState(false);
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
  lol_tagline,
  primary_role,
  secondary_role
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
  screenshot_path,
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
    const timeoutId = window.setTimeout(() => {
      void loadDailyValeStatus();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadDailyValeStatus]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadPendingMatches();
    }, 0);

    function handlePendingMatchesUpdated() {
      void loadPendingMatches();
    }

    window.addEventListener(
      "riftbalance:pending-matches-updated",
      handlePendingMatchesUpdated,
    );

    if (!activeTournamentId) {
      return () => {
        window.clearTimeout(timeoutId);

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
          void loadPendingMatches();
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
          void loadPendingMatches();
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
          void loadDailyValeStatus();
        },
      )
      .subscribe((status, error) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.error("Error en realtime de partidas pendientes:", error);
        }
      });

    return () => {
      window.clearTimeout(timeoutId);

      window.removeEventListener(
        "riftbalance:pending-matches-updated",
        handlePendingMatchesUpdated,
      );

      void supabase.removeChannel(channel);
    };
  }, [activeTournamentId, loadPendingMatches, loadDailyValeStatus, supabase]);

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

  async function uploadMatchEvidenceScreenshot({
    matchId,
    screenshotFile,
    notes,
  }: {
    matchId: string;
    screenshotFile: File;
    notes: string;
  }) {
    if (!activeTournamentId) {
      throw new Error("No se encontró el torneo activo.");
    }

    let userId = currentUserId;

    if (!userId) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      userId = user?.id ?? null;
    }

    if (!userId) {
      throw new Error("No se pudo identificar tu usuario.");
    }

    const screenshotPath = createEvidenceStoragePath({
      tournamentId: activeTournamentId,
      matchId,
      userId,
      file: screenshotFile,
    });

    const { error: uploadError } = await supabase.storage
      .from("match-evidence")
      .upload(screenshotPath, screenshotFile, {
        cacheControl: "3600",
        contentType: screenshotFile.type || "image/jpeg",
        upsert: false,
      });

    if (uploadError) {
      throw uploadError;
    }

    const { error: evidenceError } = await supabase.rpc(
      "attach_match_evidence_screenshot",
      {
        p_match_id: matchId,
        p_screenshot_path: screenshotPath,
        p_notes:
          notes.trim() ||
          "Imagen adjuntada como comprobante durante el cierre manual.",
        p_screenshot_expires_at: null,
      },
    );

    if (evidenceError) {
      throw evidenceError;
    }
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

    if (error) {
      setClosingMatchId(null);
      setMessage(error.message);
      return;
    }

    let screenshotUploaded = false;
    let screenshotUploadFailed = false;

    if (payload.screenshotFile) {
      try {
        await uploadMatchEvidenceScreenshot({
          matchId: payload.matchId,
          screenshotFile: payload.screenshotFile,
          notes: payload.notes,
        });

        screenshotUploaded = true;
      } catch (uploadError) {
        screenshotUploadFailed = true;
        console.error("No se pudo adjuntar la prueba:", uploadError);
      }
    }

    setClosingMatchId(null);
    setClosingMatch(null);

    setMatches((current) => {
      return current.filter(
        (currentMatch) => currentMatch.id !== payload.matchId,
      );
    });

    const winnerLabel =
      payload.winnerTeam === "blue" ? "Equipo Azul" : "Equipo Rojo";

    if (screenshotUploadFailed) {
      setMessage(
        `Partida cerrada correctamente. Ganó ${winnerLabel}. La imagen no se pudo adjuntar, pero podrás agregarla después desde el historial de partidas.`,
      );
    } else if (screenshotUploaded) {
      setMessage(
        `Partida cerrada correctamente. Ganó ${winnerLabel}. La prueba quedó adjuntada.`,
      );
    } else {
      setMessage(`Partida cerrada correctamente. Ganó ${winnerLabel}.`);
    }

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

        const secondsRemaining = getValeSecondsRemaining({
          startedAt: match.vale_window_started_at,
          endsAt: match.vale_window_ends_at,
          now,
        });

        return isParticipant && secondsRemaining > 0;
      }) ?? null
    );
  }, [currentUserId, matches, now]);

  const showInitialLoading = isLoading && matches.length === 0;

  const activeFloatingMatch = matches[0] ?? null;

  const activeFloatingBluePlayers = activeFloatingMatch
    ? sortByRole(
        activeFloatingMatch.match_players.filter((player) => {
          return player.team === "blue";
        }),
      )
    : [];

  const activeFloatingRedPlayers = activeFloatingMatch
    ? sortByRole(
        activeFloatingMatch.match_players.filter((player) => {
          return player.team === "red";
        }),
      )
    : [];

  const activeFloatingCurrentPlayer =
    activeFloatingMatch && currentUserId
      ? (activeFloatingMatch.match_players.find((player) => {
          return player.user_id === currentUserId;
        }) ?? null)
      : null;

  const activeFloatingSecondsRemaining = getValeSecondsRemaining({
    startedAt: activeFloatingMatch?.vale_window_started_at ?? null,
    endsAt: activeFloatingMatch?.vale_window_ends_at ?? null,
    now,
  });

  const activeFloatingValeWindowOpen = activeFloatingSecondsRemaining > 0;

  const activeFloatingValeUsedCount =
    activeFloatingMatch?.match_players.filter((player) => {
      return player.vale_used;
    }).length ?? 0;

  if (!activeTournamentId) {
    return null;
  }

  return (
    <>
      {showInitialLoading ? (
        <ClientPortal>
          <div className="pointer-events-none fixed inset-x-0 top-4 z-50 flex justify-center px-4">
            <div className="pointer-events-auto rounded-4xl border border-[#2a2929] bg-[#101010]/92 px-4 py-3 text-sm font-black text-[#f5f5f3] shadow-[0_1rem_3rem_rgba(0,0,0,0.45)] backdrop-blur-xl">
              Cargando partida en curso...
            </div>
          </div>
        </ClientPortal>
      ) : null}

      {activeFloatingMatch ? (
        <FloatingCurrentMatchPanel
          match={activeFloatingMatch}
          bluePlayers={activeFloatingBluePlayers}
          redPlayers={activeFloatingRedPlayers}
          currentMatchPlayer={activeFloatingCurrentPlayer}
          dailyValeUsage={dailyValeUsage}
          isAdmin={isAdmin}
          valeWindowOpen={activeFloatingValeWindowOpen}
          secondsRemaining={activeFloatingSecondsRemaining}
          valeUsedCount={activeFloatingValeUsedCount}
          isUsingVale={usingValeMatchId === activeFloatingMatch.id}
          currentPlayerValeUsed={Boolean(
            activeFloatingCurrentPlayer?.vale_used,
          )}
          finishingMatchId={finishingMatchId}
          cancellingMatchId={cancellingMatchId}
          closingMatchId={closingMatchId}
          onUseVale={() => handleUseVale(activeFloatingMatch.id)}
          onMarkFinished={() => handleMarkMatchFinished(activeFloatingMatch)}
          onCancel={() => handleCancelPendingMatch(activeFloatingMatch)}
          onOpenClosure={() => setClosingMatch(activeFloatingMatch)}
        />
      ) : null}

      {message ? (
        <ClientPortal>
          <div className="pointer-events-none fixed inset-x-0 top-24 z-50 flex justify-center px-4">
            <p className="pointer-events-auto max-w-2xl rounded-[0.75rem] border border-[#f0ed7e]/25 bg-[#101010]/94 px-4 py-3 text-sm leading-6 text-[#f5f5f3] shadow-[0_1rem_3rem_rgba(0,0,0,0.45)] backdrop-blur-xl">
              {message}
            </p>
          </div>
        </ClientPortal>
      ) : null}

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
    </>
  );
}

function FloatingCurrentMatchPanel({
  match,
  bluePlayers,
  redPlayers,
  currentMatchPlayer,
  dailyValeUsage,
  isAdmin,
  valeWindowOpen,
  secondsRemaining,
  valeUsedCount,
  isUsingVale,
  currentPlayerValeUsed,
  finishingMatchId,
  cancellingMatchId,
  closingMatchId,
  onUseVale,
  onMarkFinished,
  onCancel,
  onOpenClosure,
}: {
  match: PendingMatchRecord;
  bluePlayers: MatchPlayerRecord[];
  redPlayers: MatchPlayerRecord[];
  currentMatchPlayer: MatchPlayerRecord | null;
  dailyValeUsage: DailyValeUsageRecord | null;
  isAdmin: boolean;
  valeWindowOpen: boolean;
  secondsRemaining: number;
  valeUsedCount: number;
  isUsingVale: boolean;
  currentPlayerValeUsed: boolean;
  finishingMatchId: string | null;
  cancellingMatchId: string | null;
  closingMatchId: string | null;
  onUseVale: () => void;
  onMarkFinished: () => void;
  onCancel: () => void;
  onOpenClosure: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [balanceReadingExpanded, setBalanceReadingExpanded] = useState(false);

  const matchFinished = Boolean(match.match_finished_at);

  const dailyValeUsedInAnotherMatch =
    Boolean(dailyValeUsage) &&
    dailyValeUsage?.match_id !== match.id &&
    !currentPlayerValeUsed;

  const valeButtonDisabled =
    !valeWindowOpen ||
    currentPlayerValeUsed ||
    dailyValeUsedInAnotherMatch ||
    isUsingVale;

  const valeButtonLabel = currentPlayerValeUsed
    ? "Vale activado"
    : dailyValeUsedInAnotherMatch
      ? "Vale usado hoy"
      : valeWindowOpen
        ? "Usar vale"
        : "Ventana cerrada";

  const statusLabel = matchFinished
    ? "Esperando cierre"
    : valeWindowOpen
      ? "Vale activo"
      : "Partida en curso";

  const statusValue = matchFinished
    ? "Resultado pendiente"
    : valeWindowOpen
      ? formatValeCountdown(secondsRemaining)
      : "En juego";

  const balanceScore = Math.round(Number(match.balance_score ?? 0));
  const blueWinProbability = Math.round(
    Number(match.blue_win_probability ?? 50),
  );
  const redWinProbability = Math.round(Number(match.red_win_probability ?? 50));

  const ratingDifference = Math.abs(
    Math.round(Number(match.blue_team_rating)) -
      Math.round(Number(match.red_team_rating)),
  );

  const probabilityGap = Math.abs(blueWinProbability - redWinProbability);

  const advantageLabel =
    probabilityGap <= 6
      ? "Partida muy pareja"
      : blueWinProbability > redWinProbability
        ? "Ventaja leve azul"
        : "Ventaja leve roja";

  const allMatchPlayers = [...bluePlayers, ...redPlayers];

  const comfortableRoleCount = allMatchPlayers.filter((player) => {
    return isComfortableAssignedRole(player);
  }).length;

  const offRoleCount = Math.max(
    0,
    allMatchPlayers.length - comfortableRoleCount,
  );

  const totalPlayersLabel = allMatchPlayers.length || 10;

  const balanceExplanation = [
    `Se armó la pre-partida con ${allMatchPlayers.length} jugadores y asignación de roles.`,
    `La diferencia estimada de rating entre equipos es de ${ratingDifference} puntos.`,
    offRoleCount === 0
      ? "Todos los jugadores quedaron ubicados en roles principales o secundarios."
      : `Hay ${offRoleCount} jugador/es fuera de rol cómodo para mantener el balance general.`,
    probabilityGap <= 6
      ? "La probabilidad estimada de victoria quedó bastante pareja entre ambos equipos."
      : "Existe una diferencia moderada de probabilidad entre los equipos.",
  ];

  const userContext = currentMatchPlayer
    ? `${formatTeamName(currentMatchPlayer.team)} · ${formatRole(
        currentMatchPlayer.assigned_role,
      )}`
    : isAdmin
      ? "Vista admin"
      : "Solo lectura";

  return (
    <ClientPortal>
      <div className="pointer-events-none fixed inset-x-0 top-3 z-50 flex justify-center px-3 sm:top-4 sm:px-4">
        <div
          className={cn(
            "pointer-events-auto w-full transition-all duration-300",
            expanded ? "max-w-5xl" : "max-w-2xl",
          )}
        >
          <div
            className={cn(
              "overflow-hidden rounded-[0.9rem] border border-[#f0ed7e]/20 bg-[#101010]/94 shadow-[0_1.2rem_3rem_rgba(0,0,0,0.48)] backdrop-blur-xl",
              expanded
                ? "custom-scrollbar max-h-[calc(100vh-1.5rem)] overflow-y-auto"
                : "",
            )}
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-[#f0ed7e]/45 to-transparent" />

            <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center rounded-full border border-[#f0ed7e]/25 bg-[#f0ed7e]/10 px-3 py-1 text-[0.66rem] font-black uppercase tracking-[0.14em] text-[#f0ed7e]">
                    <Clock3 className="mr-1.5 size-3.5" />
                    {statusLabel}
                  </span>

                  <span className="rounded-full border border-[#2a2929] bg-[#151414]/80 px-2.5 py-1 text-[0.64rem] font-black uppercase tracking-[0.13em] text-[#8a8a85]">
                    Partida #{match.match_number}
                  </span>

                  <span className="rounded-full border border-[#2a2929] bg-[#151414]/80 px-2.5 py-1 text-[0.64rem] font-black uppercase tracking-[0.13em] text-[#8a8a85]">
                    {statusValue}
                  </span>
                </div>

                <p className="mt-2 truncate text-sm font-black text-[#f5f5f3] sm:text-base">
                  Equipo Azul vs Equipo Rojo
                </p>

                <p className="mt-1 truncate text-xs text-[#8a8a85]">
                  {userContext} · Vales {valeUsedCount}/10
                </p>
              </div>

              <button
                type="button"
                onClick={() => setExpanded((current) => !current)}
                className="inline-flex h-11 shrink-0 items-center justify-center rounded-[0.5rem] border border-[#f0ed7e]/25 bg-[#f0ed7e]/10 px-4 text-xs font-black uppercase tracking-[0.13em] text-[#f0ed7e] transition hover:bg-[#f0ed7e]/15"
              >
                {expanded ? (
                  <ChevronUp className="mr-2 size-4" />
                ) : (
                  <ChevronDown className="mr-2 size-4" />
                )}
                {expanded ? "Ocultar" : "Ver detalle"}
              </button>
            </div>

            {expanded ? (
              <div className="border-t border-[#2a2929] px-4 pb-4 pt-4">
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
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.14em] text-[#f0ed7e]">
                        Estado de partida
                      </p>

                      <h4 className="mt-2 text-xl font-black text-[#f5f5f3]">
                        {matchFinished
                          ? "Partida finalizada"
                          : valeWindowOpen
                            ? `Vale cierra en ${formatValeCountdown(secondsRemaining)}`
                            : "Partida en curso"}
                      </h4>

                      <p className="mt-2 max-w-2xl text-sm leading-6 text-[#8a8a85]">
                        {matchFinished
                          ? "El admin puede cargar el cierre oficial con ganador, campeones, bans y estadísticas."
                          : "Los jugadores pueden activar su vale durante la ventana habilitada. Luego la partida queda en curso hasta que el admin marque que finalizó."}
                      </p>
                    </div>

                    <div className="grid shrink-0 gap-3 sm:min-w-64">
                      <div className="rounded-[0.6rem] border border-[#2a2929] bg-[#101010]/80 px-4 py-3 text-right">
                        <p className="text-[0.68rem] font-black uppercase tracking-[0.13em] text-[#8a8a85]">
                          Vales usados
                        </p>
                        <p className="mt-1 text-xl font-black text-[#f5f5f3]">
                          {valeUsedCount}/10
                        </p>
                      </div>

                      {currentMatchPlayer ? (
                        <Button
                          type="button"
                          disabled={valeButtonDisabled}
                          onClick={onUseVale}
                          className="h-11 rounded-[0.5rem] border border-[#75f0a0]/25 bg-[#75f0a0]/10 px-5 text-xs font-black uppercase tracking-[0.14em] text-[#75f0a0] hover:bg-[#75f0a0]/15 disabled:cursor-not-allowed disabled:opacity-45"
                        >
                          {isUsingVale ? (
                            <Loader2 className="mr-2 size-4 animate-spin" />
                          ) : (
                            <ShieldCheck className="mr-2 size-4" />
                          )}
                          {isUsingVale ? "Activando..." : valeButtonLabel}
                        </Button>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 border-t border-[#2a2929] pt-4 md:grid-cols-4">
                    <MiniMatchStat label="Balance" value={`${balanceScore}%`} />
                    <MiniMatchStat
                      label="Azul"
                      value={`${blueWinProbability}%`}
                    />
                    <MiniMatchStat
                      label="Rojo"
                      value={`${redWinProbability}%`}
                    />
                    <MiniMatchStat
                      label="Diferencia"
                      value={`${ratingDifference} pts`}
                    />
                  </div>

                  <div className="mt-4 overflow-hidden rounded-[0.7rem] border border-[#2a2929] bg-[#101010]/70">
                    <button
                      type="button"
                      onClick={() =>
                        setBalanceReadingExpanded((current) => !current)
                      }
                      className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left transition hover:bg-[#151414]/80"
                    >
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.14em] text-[#f0ed7e]">
                          Lectura del balance
                        </p>

                        <p className="mt-1 text-xs leading-5 text-[#8a8a85]">
                          {balanceReadingExpanded
                            ? "Ocultar explicación técnica del enfrentamiento."
                            : "Ver calidad, ventaja, roles cómodos y explicación del algoritmo."}
                        </p>
                      </div>

                      <div className="grid size-9 shrink-0 place-items-center rounded-full border border-[#f0ed7e]/25 bg-[#f0ed7e]/10 text-[#f0ed7e]">
                        {balanceReadingExpanded ? (
                          <ChevronUp className="size-4" />
                        ) : (
                          <ChevronDown className="size-4" />
                        )}
                      </div>
                    </button>

                    {balanceReadingExpanded ? (
                      <div className="border-t border-[#2a2929] p-4">
                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                          <MiniMatchStat
                            label="Calidad"
                            value={`${balanceScore}%`}
                          />
                          <MiniMatchStat
                            label="Ventaja"
                            value={`${probabilityGap}%`}
                          />
                          <MiniMatchStat
                            label="Diferencia"
                            value={`${ratingDifference} pts`}
                          />
                          <MiniMatchStat
                            label="Roles cómodos"
                            value={`${comfortableRoleCount}/${totalPlayersLabel}`}
                          />
                          <MiniMatchStat
                            label="Fuera de rol"
                            value={`${offRoleCount}/${totalPlayersLabel}`}
                          />
                        </div>

                        <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_0.85fr]">
                          <div className="rounded-[0.7rem] border border-[#2a2929] bg-[#151414]/70 p-4">
                            <p className="mb-3 text-xs font-black uppercase tracking-[0.14em] text-[#f0ed7e]">
                              Explicación del algoritmo
                            </p>

                            <div className="grid gap-2">
                              {balanceExplanation.map((item, index) => (
                                <div
                                  key={`${index}-${item}`}
                                  className="flex gap-3 rounded-[0.6rem] border border-[#2a2929] bg-[#101010]/70 px-3 py-3"
                                >
                                  <div className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border border-[#f0ed7e]/25 bg-[#f0ed7e]/10 text-[#f0ed7e]">
                                    <ShieldCheck className="size-3.5" />
                                  </div>

                                  <p className="text-sm leading-6 text-[#c9c9c4]">
                                    {item}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="rounded-[0.7rem] border border-[#2a2929] bg-[#151414]/70 p-4">
                            <p className="mb-3 text-xs font-black uppercase tracking-[0.14em] text-[#f0ed7e]">
                              Lectura rápida
                            </p>

                            <div className="grid gap-3">
                              <div className="rounded-[0.6rem] border border-[#2a2929] bg-[#101010]/70 px-3 py-3">
                                <p className="text-sm font-black text-[#f5f5f3]">
                                  {advantageLabel}
                                </p>
                                <p className="mt-1 text-xs leading-5 text-[#8a8a85]">
                                  La diferencia estimada de victoria es de{" "}
                                  {probabilityGap} puntos porcentuales.
                                </p>
                              </div>

                              <div className="rounded-[0.6rem] border border-[#2a2929] bg-[#101010]/70 px-3 py-3">
                                <p className="text-sm font-black text-[#f5f5f3]">
                                  {comfortableRoleCount} jugadores en roles
                                  cómodos
                                </p>
                                <p className="mt-1 text-xs leading-5 text-[#8a8a85]">
                                  Se toma como cómodo si el jugador quedó en su
                                  rol principal o secundario.
                                </p>
                              </div>

                              <div className="rounded-[0.6rem] border border-[#2a2929] bg-[#101010]/70 px-3 py-3">
                                <p className="text-sm font-black text-[#f5f5f3]">
                                  {offRoleCount} jugador/es fuera de rol
                                </p>
                                <p className="mt-1 text-xs leading-5 text-[#8a8a85]">
                                  Si hay jugadores fuera de rol, el sistema
                                  priorizó mantener la partida pareja.
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-4 flex flex-col gap-3 border-t border-[#2a2929] pt-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      {isAdmin && !matchFinished ? (
                        <>
                          <Button
                            type="button"
                            disabled={
                              finishingMatchId === match.id ||
                              Boolean(cancellingMatchId) ||
                              Boolean(closingMatchId)
                            }
                            onClick={onMarkFinished}
                            className="h-11 rounded-[0.5rem] bg-[#f0ed7e] px-5 text-xs font-black uppercase tracking-[0.14em] text-[#151414] hover:bg-[#d8d46d]"
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
                            onClick={onCancel}
                            className="h-11 rounded-[0.5rem] border border-red-400/25 bg-transparent px-5 text-xs font-black uppercase tracking-[0.14em] text-red-200 hover:bg-red-400/10"
                          >
                            {cancellingMatchId === match.id ? (
                              <Loader2 className="mr-2 size-4 animate-spin" />
                            ) : (
                              <Trash2 className="mr-2 size-4" />
                            )}
                            Cancelar pendiente
                          </Button>
                        </>
                      ) : null}

                      {isAdmin && matchFinished ? (
                        <>
                          <Button
                            type="button"
                            disabled={
                              closingMatchId === match.id ||
                              Boolean(cancellingMatchId)
                            }
                            onClick={onOpenClosure}
                            className="h-11 rounded-[0.5rem] bg-[#f0ed7e] px-5 text-xs font-black uppercase tracking-[0.14em] text-[#151414] hover:bg-[#d8d46d]"
                          >
                            {closingMatchId === match.id ? (
                              <Loader2 className="mr-2 size-4 animate-spin" />
                            ) : (
                              <ShieldCheck className="mr-2 size-4" />
                            )}
                            Cargar cierre
                          </Button>

                          <Button
                            type="button"
                            disabled={
                              Boolean(cancellingMatchId) ||
                              closingMatchId === match.id
                            }
                            onClick={onCancel}
                            className="h-11 rounded-[0.5rem] border border-red-400/25 bg-transparent px-5 text-xs font-black uppercase tracking-[0.14em] text-red-200 hover:bg-red-400/10"
                          >
                            <Trash2 className="mr-2 size-4" />
                            Cancelar pendiente
                          </Button>
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </ClientPortal>
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
