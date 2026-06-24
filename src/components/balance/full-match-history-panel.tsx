"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ChangeEvent, MouseEvent } from "react";
import Image from "next/image";
import { gsap } from "gsap";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Crown,
  FileSearch,
  History,
  Loader2,
  Medal,
  Paperclip,
  Pencil,
  Save,
  Search,
  ShieldCheck,
  Sparkles,
  Trophy,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getLolRoleIconSrc } from "@/lib/lol-assets";
import { cn } from "@/lib/utils";

type TournamentStandingProfile = {
  first_name: string | null;
  last_name: string | null;
  lol_nick: string | null;
  lol_tagline: string | null;
};

export type TournamentStandingPlayer = {
  id: string;
  user_id: string;
  initial_rating: number | string;
  current_rating: number | string;
  matches_played: number;
  wins: number;
  losses: number;
  profiles: TournamentStandingProfile | null;
};

type FullMatchHistoryPanelProps = {
  activeTournamentId: string | null;
  isAdmin?: boolean;
  officialStandings?: TournamentStandingPlayer[];
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
  riot_detected_game_name: string | null;
  riot_detected_tagline: string | null;
  riot_detected_summoner_name: string | null;
  riot_mapping_was_manual: boolean;
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
  screenshot_path: string | null;
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

const PODIUM_PARTICLES = [
  { left: "8%", top: "18%", size: 4, color: "#f0ed7e" },
  { left: "14%", top: "68%", size: 5, color: "#75f0a0" },
  { left: "22%", top: "32%", size: 3, color: "#60a5fa" },
  { left: "28%", top: "80%", size: 4, color: "#f0ed7e" },
  { left: "36%", top: "14%", size: 5, color: "#75f0a0" },
  { left: "43%", top: "58%", size: 3, color: "#f5f5f3" },
  { left: "49%", top: "24%", size: 6, color: "#f0ed7e" },
  { left: "57%", top: "72%", size: 4, color: "#60a5fa" },
  { left: "64%", top: "16%", size: 5, color: "#75f0a0" },
  { left: "72%", top: "48%", size: 3, color: "#f0ed7e" },
  { left: "79%", top: "26%", size: 6, color: "#f0ed7e" },
  { left: "84%", top: "74%", size: 4, color: "#75f0a0" },
  { left: "90%", top: "40%", size: 5, color: "#60a5fa" },
];

const KING_PARTICLES = [
  { left: "12%", top: "18%", size: 4 },
  { left: "22%", top: "8%", size: 3 },
  { left: "38%", top: "16%", size: 5 },
  { left: "64%", top: "10%", size: 4 },
  { left: "78%", top: "24%", size: 3 },
  { left: "88%", top: "14%", size: 5 },
  { left: "18%", top: "76%", size: 3 },
  { left: "72%", top: "72%", size: 4 },
];

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

function getPlayedAsName(player: HistoryMatchPlayer) {
  if (player.riot_detected_game_name) {
    return `${player.riot_detected_game_name}#${
      player.riot_detected_tagline ?? "-"
    }`;
  }

  return player.riot_detected_summoner_name ?? null;
}

function normalizeRiotName(value: string | null) {
  return value
    ?.trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace("#-", "")
    .replace(/#$/g, "");
}

function shouldShowPlayedAs(player: HistoryMatchPlayer) {
  const registeredName = getPlayerName(player);
  const playedAsName = getPlayedAsName(player);

  if (!playedAsName) return false;

  return normalizeRiotName(registeredName) !== normalizeRiotName(playedAsName);
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

function getTeamTotals(players: HistoryMatchPlayer[]) {
  return players.reduce(
    (totals, player) => {
      return {
        kills: totals.kills + Number(player.kills ?? 0),
        deaths: totals.deaths + Number(player.deaths ?? 0),
        assists: totals.assists + Number(player.assists ?? 0),
        vales: totals.vales + (player.vale_used ? 1 : 0),
      };
    },
    {
      kills: 0,
      deaths: 0,
      assists: 0,
      vales: 0,
    },
  );
}

function formatTeamKda(players: HistoryMatchPlayer[]) {
  const totals = getTeamTotals(players);

  return `${totals.kills} / ${totals.deaths} / ${totals.assists}`;
}

function getPlayerPerformanceScore(player: HistoryMatchPlayer) {
  const hasStats =
    player.kills != null || player.deaths != null || player.assists != null;

  if (!hasStats) return null;

  const kills = Number(player.kills ?? 0);
  const deaths = Number(player.deaths ?? 0);
  const assists = Number(player.assists ?? 0);
  const positiveDelta = Math.max(getPlayerDelta(player), 0);

  return kills * 3 + assists * 1.25 - deaths * 2 + positiveDelta * 0.05;
}

function getFeaturedPlayer(
  players: HistoryMatchPlayer[],
): HistoryMatchPlayer | null {
  let bestPlayer: HistoryMatchPlayer | null = null;
  let bestScore = Number.NEGATIVE_INFINITY;

  for (const player of players) {
    const score = getPlayerPerformanceScore(player);

    if (score == null) continue;

    if (score > bestScore) {
      bestScore = score;
      bestPlayer = player;
    }
  }

  return bestPlayer;
}

type ChampionCountStat = {
  championName: string;
  championImageUrl: string | null;
  count: number;
};

type TournamentPlayerStats = {
  userId: string;
  name: string;
  games: number;
  wins: number;
  losses: number;
  kills: number;
  deaths: number;
  assists: number;
  vales: number;
  ratingDelta: number;
  kdaRatio: number;
  score: number;
  favoriteChampionName: string | null;
  favoriteChampionImageUrl: string | null;
};

function formatKdaRatio(value: number) {
  return value.toFixed(2);
}

function getKdaRatioValue(kills: number, deaths: number, assists: number) {
  return (kills + assists) / Math.max(1, deaths);
}

function getMostPickedChampion(
  matches: HistoryMatchRecord[],
): ChampionCountStat | null {
  const championMap = new Map<string, ChampionCountStat>();

  matches.forEach((match) => {
    match.match_players.forEach((player) => {
      if (!player.champion_name) return;

      const current = championMap.get(player.champion_name) ?? {
        championName: player.champion_name,
        championImageUrl: player.champion_image_url,
        count: 0,
      };

      championMap.set(player.champion_name, {
        ...current,
        championImageUrl: current.championImageUrl ?? player.champion_image_url,
        count: current.count + 1,
      });
    });
  });

  return (
    Array.from(championMap.values()).sort((a, b) => b.count - a.count)[0] ??
    null
  );
}

function getMostBannedChampion(
  matches: HistoryMatchRecord[],
): ChampionCountStat | null {
  const championMap = new Map<string, ChampionCountStat>();

  matches.forEach((match) => {
    match.match_bans.forEach((ban) => {
      if (!ban.champion_name) return;

      const current = championMap.get(ban.champion_name) ?? {
        championName: ban.champion_name,
        championImageUrl: ban.champion_image_url,
        count: 0,
      };

      championMap.set(ban.champion_name, {
        ...current,
        championImageUrl: current.championImageUrl ?? ban.champion_image_url,
        count: current.count + 1,
      });
    });
  });

  return (
    Array.from(championMap.values()).sort((a, b) => b.count - a.count)[0] ??
    null
  );
}

function getTournamentPlayerStats(matches: HistoryMatchRecord[]) {
  const playerMap = new Map<
    string,
    Omit<
      TournamentPlayerStats,
      "score" | "kdaRatio" | "favoriteChampionName" | "favoriteChampionImageUrl"
    >
  >();

  const championCountsByUser = new Map<
    string,
    Map<string, ChampionCountStat>
  >();

  matches.forEach((match) => {
    match.match_players.forEach((player) => {
      const current = playerMap.get(player.user_id) ?? {
        userId: player.user_id,
        name: getPlayerName(player),
        games: 0,
        wins: 0,
        losses: 0,
        kills: 0,
        deaths: 0,
        assists: 0,
        vales: 0,
        ratingDelta: 0,
      };

      const isWinner =
        match.winner_team != null && player.team === match.winner_team;

      playerMap.set(player.user_id, {
        ...current,
        name: getPlayerName(player),
        games: current.games + 1,
        wins: current.wins + (isWinner ? 1 : 0),
        losses: current.losses + (!isWinner && match.winner_team ? 1 : 0),
        kills: current.kills + Number(player.kills ?? 0),
        deaths: current.deaths + Number(player.deaths ?? 0),
        assists: current.assists + Number(player.assists ?? 0),
        vales: current.vales + (player.vale_used ? 1 : 0),
        ratingDelta: current.ratingDelta + getPlayerDelta(player),
      });

      if (player.champion_name) {
        const championMap =
          championCountsByUser.get(player.user_id) ??
          new Map<string, ChampionCountStat>();

        const currentChampion = championMap.get(player.champion_name) ?? {
          championName: player.champion_name,
          championImageUrl: player.champion_image_url,
          count: 0,
        };

        championMap.set(player.champion_name, {
          ...currentChampion,
          championImageUrl:
            currentChampion.championImageUrl ?? player.champion_image_url,
          count: currentChampion.count + 1,
        });

        championCountsByUser.set(player.user_id, championMap);
      }
    });
  });

  return Array.from(playerMap.values())
    .map((player) => {
      const favoriteChampion =
        Array.from(
          championCountsByUser.get(player.userId)?.values() ?? [],
        ).sort((a, b) => b.count - a.count)[0] ?? null;

      const kdaRatio = getKdaRatioValue(
        player.kills,
        player.deaths,
        player.assists,
      );

      const score =
        player.wins * 10 +
        player.kills * 2 +
        player.assists * 0.8 -
        player.deaths * 1.6 +
        player.ratingDelta * 0.08 +
        player.vales * 0.25;

      return {
        ...player,
        kdaRatio,
        score,
        favoriteChampionName: favoriteChampion?.championName ?? null,
        favoriteChampionImageUrl: favoriteChampion?.championImageUrl ?? null,
      };
    })
    .sort((a, b) => b.score - a.score);
}

function getStandingPlayerName(player: TournamentStandingPlayer) {
  if (!player.profiles?.lol_nick) return "Jugador";

  return `${player.profiles.lol_nick}#${player.profiles.lol_tagline ?? "-"}`;
}

function getOfficialPodiumPlayers({
  officialStandings,
  playerStats,
}: {
  officialStandings: TournamentStandingPlayer[];
  playerStats: TournamentPlayerStats[];
}) {
  return officialStandings.slice(0, 3).map((standingPlayer) => {
    const performanceStats = playerStats.find((player) => {
      return player.userId === standingPlayer.user_id;
    });

    const ratingDelta =
      Number(standingPlayer.current_rating) -
      Number(standingPlayer.initial_rating);

    return {
      userId: standingPlayer.user_id,
      name: getStandingPlayerName(standingPlayer),
      games: Number(standingPlayer.matches_played ?? 0),
      wins: Number(standingPlayer.wins ?? 0),
      losses: Number(standingPlayer.losses ?? 0),
      kills: performanceStats?.kills ?? 0,
      deaths: performanceStats?.deaths ?? 0,
      assists: performanceStats?.assists ?? 0,
      vales: performanceStats?.vales ?? 0,
      ratingDelta,
      kdaRatio: performanceStats?.kdaRatio ?? 0,
      score: Number(standingPlayer.current_rating),
      favoriteChampionName: performanceStats?.favoriteChampionName ?? null,
      favoriteChampionImageUrl:
        performanceStats?.favoriteChampionImageUrl ?? null,
    };
  });
}

function getTournamentStatsSnapshot(
  matches: HistoryMatchRecord[],
  officialStandings: TournamentStandingPlayer[] = [],
) {
  const playerStats = getTournamentPlayerStats(matches);

  const bestKdaPlayer =
    playerStats
      .filter((player) => {
        return player.kills > 0 || player.assists > 0 || player.deaths > 0;
      })
      .sort((a, b) => b.kdaRatio - a.kdaRatio)[0] ?? null;

  const mostImpactfulPlayer = playerStats[0] ?? null;

  return {
    totalMatches: matches.length,
    topPlayers: getOfficialPodiumPlayers({
      officialStandings,
      playerStats,
    }),
    mostPickedChampion: getMostPickedChampion(matches),
    mostBannedChampion: getMostBannedChampion(matches),
    bestKdaPlayer,
    mostImpactfulPlayer,
  };
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

function ChampionMiniCard({
  championName,
  championImageUrl,
}: {
  championName: string | null;
  championImageUrl: string | null;
}) {
  if (!championName) return null;

  return (
    <div className="mt-2 inline-flex max-w-full items-center gap-2 rounded-[0.5rem] border border-[#2a2929] bg-[#151414]/80 px-2.5 py-2">
      {championImageUrl ? (
        <Image
          src={championImageUrl}
          alt={championName}
          width={28}
          height={28}
          sizes="1.75rem"
          className="size-7 shrink-0 rounded-[0.4rem] object-cover"
        />
      ) : null}

      <div className="min-w-0">
        <p className="text-[0.62rem] font-black uppercase tracking-[0.12em] text-[#8a8a85]">
          Campeón
        </p>
        <p className="truncate text-xs font-black text-[#f5f5f3]">
          {championName}
        </p>
      </div>
    </div>
  );
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

function matchHasScreenshot(match: HistoryMatchRecord) {
  return match.match_result_submissions.some((evidence) => {
    return Boolean(evidence.screenshot_path || evidence.screenshot_url);
  });
}

type KdaField = "kills" | "deaths" | "assists";

type KdaDraft = {
  kills: string;
  deaths: string;
  assists: string;
};

type KdaDraftByPlayerId = Record<string, KdaDraft>;

function getStatDraftValue(value: number | string | null) {
  if (value == null) return "";

  return String(value);
}

function createKdaDraftFromMatch(match: HistoryMatchRecord) {
  return match.match_players.reduce<KdaDraftByPlayerId>((drafts, player) => {
    drafts[player.id] = {
      kills: getStatDraftValue(player.kills),
      deaths: getStatDraftValue(player.deaths),
      assists: getStatDraftValue(player.assists),
    };

    return drafts;
  }, {});
}

function parseKdaDraftValue(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) return null;

  return Number(trimmedValue);
}

export function FullMatchHistoryPanel({
  activeTournamentId,
  isAdmin = false,
  officialStandings = [],
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

  const [openingScreenshotId, setOpeningScreenshotId] = useState<string | null>(
    null,
  );

  const [uploadingEvidenceMatchId, setUploadingEvidenceMatchId] = useState<
    string | null
  >(null);

  const [editingKdaMatchId, setEditingKdaMatchId] = useState<string | null>(
    null,
  );
  const [savingKdaMatchId, setSavingKdaMatchId] = useState<string | null>(null);
  const [kdaDraftByPlayerId, setKdaDraftByPlayerId] =
    useState<KdaDraftByPlayerId>({});

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
  riot_detected_game_name,
  riot_detected_tagline,
  riot_detected_summoner_name,
  riot_mapping_was_manual,
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
          screenshot_path,
          screenshot_url,
          screenshot_expires_at,
          created_at
        )
      `,
      )
      .eq("tournament_id", activeTournamentId)
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(300);

    setIsLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMatches((data ?? []) as unknown as HistoryMatchRecord[]);
  }, [activeTournamentId, supabase]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadMatches();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
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

  async function handleOpenScreenshot(evidence: HistoryEvidence) {
    if (evidence.screenshot_url) {
      setSelectedScreenshotUrl(evidence.screenshot_url);
      return;
    }

    if (!evidence.screenshot_path) return;

    setOpeningScreenshotId(evidence.id);

    const { data, error } = await supabase.storage
      .from("match-evidence")
      .createSignedUrl(evidence.screenshot_path, 60 * 60);

    setOpeningScreenshotId(null);

    if (error) {
      setMessage(error.message);
      return;
    }

    setSelectedScreenshotUrl(data.signedUrl);
  }

  async function handleAttachEvidenceScreenshot(
    match: HistoryMatchRecord,
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0] ?? null;

    event.target.value = "";

    if (!file) return;

    setMessage("");

    if (!file.type.startsWith("image/")) {
      setMessage("El comprobante debe ser una imagen.");
      return;
    }

    const maxSize = 8 * 1024 * 1024;

    if (file.size > maxSize) {
      setMessage("La imagen no puede superar los 8 MB.");
      return;
    }

    if (!activeTournamentId) {
      setMessage("No se encontró el torneo.");
      return;
    }

    setUploadingEvidenceMatchId(match.id);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setUploadingEvidenceMatchId(null);
      setMessage("No se pudo identificar tu usuario.");
      return;
    }

    const screenshotPath = createEvidenceStoragePath({
      tournamentId: activeTournamentId,
      matchId: match.id,
      userId: user.id,
      file,
    });

    const { error: uploadError } = await supabase.storage
      .from("match-evidence")
      .upload(screenshotPath, file, {
        cacheControl: "3600",
        contentType: file.type || "image/jpeg",
        upsert: false,
      });

    if (uploadError) {
      setUploadingEvidenceMatchId(null);
      setMessage(uploadError.message);
      return;
    }

    const { error: evidenceError } = await supabase.rpc(
      "attach_match_evidence_screenshot",
      {
        p_match_id: match.id,
        p_screenshot_path: screenshotPath,
        p_notes:
          "Imagen agregada como comprobante desde el historial de partidas.",
        p_screenshot_expires_at: null,
      },
    );

    setUploadingEvidenceMatchId(null);

    if (evidenceError) {
      setMessage(evidenceError.message);
      return;
    }

    setMessage(
      `Prueba agregada correctamente a la partida #${match.match_number}.`,
    );

    await loadMatches();
  }

  function handleStartKdaEdit(match: HistoryMatchRecord) {
    setMessage("");
    setEditingKdaMatchId(match.id);
    setKdaDraftByPlayerId(createKdaDraftFromMatch(match));
  }

  function handleCancelKdaEdit() {
    setEditingKdaMatchId(null);
    setKdaDraftByPlayerId({});
  }

  function handleKdaDraftChange(
    matchPlayerId: string,
    field: KdaField,
    value: string,
  ) {
    const sanitizedValue = value.replace(/[^\d]/g, "");

    setKdaDraftByPlayerId((current) => {
      const currentDraft = current[matchPlayerId] ?? {
        kills: "",
        deaths: "",
        assists: "",
      };

      return {
        ...current,
        [matchPlayerId]: {
          ...currentDraft,
          [field]: sanitizedValue,
        },
      };
    });
  }

  async function handleSaveKda(match: HistoryMatchRecord) {
    setMessage("");
    setSavingKdaMatchId(match.id);

    const playersPayload = match.match_players.map((player) => {
      const draft = kdaDraftByPlayerId[player.id] ?? {
        kills: "",
        deaths: "",
        assists: "",
      };

      return {
        match_player_id: player.id,
        kills: parseKdaDraftValue(draft.kills),
        deaths: parseKdaDraftValue(draft.deaths),
        assists: parseKdaDraftValue(draft.assists),
      };
    });

    const { error } = await supabase.rpc("update_match_manual_kda", {
      p_match_id: match.id,
      p_players: playersPayload,
    });

    setSavingKdaMatchId(null);

    if (error) {
      setMessage(error.message);
      return;
    }

    setEditingKdaMatchId(null);
    setKdaDraftByPlayerId({});

    setMessage(
      `KDA actualizado correctamente en la partida #${match.match_number}.`,
    );

    await loadMatches();
  }

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
    <>
      <TournamentStatsShowcase
        matches={matches}
        officialStandings={officialStandings}
      />

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
                Revisá resultados confirmados, evidencia, equipos, vales usados
                y variaciones de rating.
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
                  match.match_players.filter(
                    (player) => player.team === "blue",
                  ),
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
                        <MatchDetailSummary
                          match={match}
                          bluePlayers={bluePlayers}
                          redPlayers={redPlayers}
                          evidence={evidence}
                        />

                        <MatchFeaturedPlayerCard
                          players={[...bluePlayers, ...redPlayers]}
                        />

                        {isAdmin ? (
                          <KdaAdminEditor
                            match={match}
                            bluePlayers={bluePlayers}
                            redPlayers={redPlayers}
                            isEditing={editingKdaMatchId === match.id}
                            isSaving={savingKdaMatchId === match.id}
                            drafts={kdaDraftByPlayerId}
                            onStart={() => handleStartKdaEdit(match)}
                            onCancel={handleCancelKdaEdit}
                            onChange={handleKdaDraftChange}
                            onSave={() => handleSaveKda(match)}
                          />
                        ) : null}

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
                              {evidence.screenshot_url ||
                              evidence.screenshot_path ? (
                                <button
                                  type="button"
                                  disabled={openingScreenshotId === evidence.id}
                                  onClick={() => handleOpenScreenshot(evidence)}
                                  className="mt-3 inline-flex h-10 items-center justify-center rounded-[0.5rem] border border-[#f0ed7e]/25 bg-[#f0ed7e]/10 px-4 text-xs font-black uppercase tracking-[0.13em] text-[#f0ed7e] transition hover:bg-[#f0ed7e]/15 disabled:cursor-not-allowed disabled:opacity-45"
                                >
                                  {openingScreenshotId === evidence.id ? (
                                    <Loader2 className="mr-2 size-4 animate-spin" />
                                  ) : (
                                    <Paperclip className="mr-2 size-4" />
                                  )}
                                  Ver comprobante
                                </button>
                              ) : null}
                            </div>
                          </div>
                        ) : null}
                        <div className="mt-4 rounded-[0.75rem] border border-[#2a2929] bg-[#101010]/70 p-4">
                          <div className="mb-2 flex items-center gap-2">
                            <Paperclip className="size-4 text-[#f0ed7e]" />
                            <p className="text-xs font-black uppercase tracking-[0.14em] text-[#f0ed7e]">
                              Prueba del resultado
                            </p>
                          </div>

                          <p className="mb-4 text-sm leading-6 text-[#8a8a85]">
                            {matchHasScreenshot(match)
                              ? "Esta partida ya tiene una prueba adjunta. Podés agregar otra imagen si necesitás reforzar el comprobante."
                              : "Esta partida todavía no tiene imagen de prueba. Podés adjuntar una captura del resultado."}
                          </p>

                          <label className="inline-flex h-10 w-fit cursor-pointer items-center justify-center rounded-[0.5rem] border border-[#f0ed7e]/25 bg-[#f0ed7e]/10 px-4 text-xs font-black uppercase tracking-[0.13em] text-[#f0ed7e] transition hover:bg-[#f0ed7e]/15">
                            {uploadingEvidenceMatchId === match.id ? (
                              <Loader2 className="mr-2 size-4 animate-spin" />
                            ) : (
                              <Paperclip className="mr-2 size-4" />
                            )}

                            {uploadingEvidenceMatchId === match.id
                              ? "Subiendo..."
                              : matchHasScreenshot(match)
                                ? "Agregar otra prueba"
                                : "Agregar prueba"}

                            <input
                              type="file"
                              accept="image/png,image/jpeg,image/jpg,image/webp"
                              disabled={uploadingEvidenceMatchId === match.id}
                              onChange={(event) =>
                                handleAttachEvidenceScreenshot(match, event)
                              }
                              className="hidden"
                            />
                          </label>
                        </div>
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
                Todavía no hay partidas confirmadas que coincidan con los
                filtros.
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

              <div className="relative h-[84vh] w-full">
                <Image
                  src={selectedScreenshotUrl}
                  alt="Comprobante de partida"
                  fill
                  unoptimized
                  sizes="100vw"
                  className="rounded-[0.75rem] object-contain"
                />
              </div>
            </div>
          </div>
        ) : null}
      </section>
    </>
  );
}

function PodiumEpicBackground() {
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden rounded-[1.25rem]"
      aria-hidden="true"
    >
      <div className="absolute inset-0 bg-[#0f0f10]" />

      <div
        data-podium="orb-gold"
        className="absolute left-1/2 top-22 h-96 w-[24rem] -translate-x-1/2 rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(circle, rgba(240,237,126,0.26) 0%, rgba(240,237,126,0.11) 38%, rgba(240,237,126,0.03) 64%, transparent 78%)",
        }}
      />

      <div
        data-podium="orb-green"
        className="absolute -right-16 top-8 h-80 w-[20rem] rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(circle, rgba(117,240,160,0.2) 0%, rgba(117,240,160,0.08) 40%, transparent 74%)",
        }}
      />

      <div
        data-podium="orb-blue"
        className="absolute -left-20 bottom-6 h-80 w-[20rem] rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(circle, rgba(96,165,250,0.16) 0%, rgba(96,165,250,0.06) 38%, transparent 74%)",
        }}
      />

      <div
        className="absolute inset-0 opacity-[0.11]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(240,237,126,0.08) 1px, transparent 1px),
            linear-gradient(90deg, rgba(240,237,126,0.08) 1px, transparent 1px)
          `,
          backgroundSize: "38px 38px",
          maskImage:
            "radial-gradient(circle at center, black 36%, rgba(0,0,0,0.65) 70%, transparent 100%)",
          WebkitMaskImage:
            "radial-gradient(circle at center, black 36%, rgba(0,0,0,0.65) 70%, transparent 100%)",
        }}
      />

      <div
        data-podium="rift-line-left"
        className="absolute left-[-14%] top-[28%] h-px w-[56%] rotate-12 opacity-40"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(117,240,160,0.7), rgba(240,237,126,0.24), transparent)",
          boxShadow: "0 0 18px rgba(117,240,160,0.18)",
        }}
      />

      <div
        data-podium="rift-line-right"
        className="absolute right-[-14%] top-[35%] h-px w-[56%] rotate-[-10deg] opacity-35"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(96,165,250,0.48), rgba(240,237,126,0.18), transparent)",
          boxShadow: "0 0 18px rgba(96,165,250,0.16)",
        }}
      />

      <div
        className="absolute left-[12%] bottom-[23%] h-px w-[36%] rotate-6 opacity-25"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(240,237,126,0.45), transparent)",
        }}
      />

      <div
        className="absolute right-[12%] bottom-[19%] h-px w-[34%] rotate-[-7deg] opacity-22"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(117,240,160,0.34), transparent)",
        }}
      />

      <div
        data-podium="rune-ring"
        className="absolute left-1/2 top-74 h-64 w-64 -translate-x-1/2 rounded-full border border-[#f0ed7e]/14 opacity-60"
      />

      <div className="absolute left-1/2 top-71 h-76 w-76 -translate-x-1/2 rounded-full border border-[#f0ed7e]/8 opacity-40" />

      <div className="absolute left-[9%] top-[14%] text-[1.1rem] font-black text-[#f0ed7e]/22">
        ✦
      </div>
      <div className="absolute right-[12%] top-[18%] text-[0.95rem] font-black text-[#75f0a0]/22">
        ✧
      </div>
      <div className="absolute left-[18%] bottom-[18%] text-[1rem] font-black text-[#60a5fa]/20">
        ✦
      </div>
      <div className="absolute right-[18%] bottom-[16%] text-[1.1rem] font-black text-[#f0ed7e]/18">
        ✧
      </div>

      <div
        data-podium="shine"
        className="absolute inset-y-0 left-[-40%] z-20 w-[28%] rotate-12 bg-linear-to-r from-transparent via-[#f5f5f3]/14 to-transparent blur-sm"
      />

      {PODIUM_PARTICLES.map((particle, index) => (
        <span
          key={`podium-particle-${index}`}
          data-podium="spark"
          className="absolute z-10 rounded-full opacity-80"
          style={{
            left: particle.left,
            top: particle.top,
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            background: particle.color,
            boxShadow: `0 0 12px ${particle.color}, 0 0 24px ${particle.color}`,
            filter: "blur(0.4px)",
          }}
        />
      ))}

      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at center, transparent 42%, rgba(0,0,0,0.18) 68%, rgba(0,0,0,0.44) 100%)",
        }}
      />

      <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-[#f0ed7e]/40 to-transparent" />
    </div>
  );
}

function TournamentStatsShowcase({
  matches,
  officialStandings,
}: {
  matches: HistoryMatchRecord[];
  officialStandings: TournamentStandingPlayer[];
}) {
  const podiumRef = useRef<HTMLDivElement | null>(null);

  const snapshot = useMemo(() => {
    return getTournamentStatsSnapshot(matches, officialStandings);
  }, [matches, officialStandings]);

  useLayoutEffect(() => {
    if (!podiumRef.current || snapshot.totalMatches === 0) return;

    const ctx = gsap.context(() => {
      gsap.set("[data-podium='card']", {
        autoAlpha: 0,
        y: 34,
        force3D: true,
        willChange: "transform, opacity",
      });

      gsap.to("[data-podium='card']", {
        autoAlpha: 1,
        y: 0,
        duration: 0.58,
        ease: "power2.out",
        stagger: {
          each: 0.09,
          from: "center",
        },
        overwrite: "auto",
      });

      gsap.fromTo(
        "[data-podium='title']",
        {
          opacity: 0,
          y: 18,
          letterSpacing: "0.22em",
        },
        {
          opacity: 1,
          y: 0,
          letterSpacing: "-0.04em",
          duration: 0.9,
          ease: "power3.out",
        },
      );

      gsap.to("[data-podium='crown']", {
        y: -5,
        rotate: -3,
        duration: 1.4,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });

      gsap.to("[data-podium='orb-gold']", {
        scale: 1.08,
        opacity: 0.95,
        duration: 4.6,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });

      gsap.to("[data-podium='orb-green']", {
        x: 10,
        y: -8,
        opacity: 0.72,
        duration: 5.5,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });

      gsap.to("[data-podium='orb-blue']", {
        x: -8,
        y: 12,
        opacity: 0.65,
        duration: 5.2,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });

      gsap.to("[data-podium='rune-ring']", {
        rotate: 360,
        duration: 26,
        repeat: -1,
        ease: "none",
      });

      gsap.to("[data-podium='rift-line-left']", {
        xPercent: -4,
        opacity: 0.5,
        duration: 5,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });

      gsap.to("[data-podium='rift-line-right']", {
        xPercent: 4,
        opacity: 0.42,
        duration: 5.6,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });

      gsap.fromTo(
        "[data-podium='shine']",
        {
          xPercent: -120,
          opacity: 0,
        },
        {
          xPercent: 620,
          opacity: 1,
          duration: 3.4,
          repeat: -1,
          repeatDelay: 2.2,
          ease: "power2.inOut",
        },
      );

      gsap.fromTo(
        "[data-podium='spark']",
        {
          opacity: 0.25,
          y: 0,
          scale: 0.85,
        },
        {
          opacity: 1,
          y: -18,
          x: (index) => (index % 2 === 0 ? 8 : -8),
          scale: (index) => (index % 3 === 0 ? 1.35 : 1.05),
          duration: (index) => 1.8 + (index % 4) * 0.25,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
          stagger: 0.08,
        },
      );

      gsap.fromTo(
        "[data-podium='king-spark']",
        {
          opacity: 0.25,
          scale: 0.7,
          y: 8,
        },
        {
          opacity: 1,
          scale: (index) => (index % 2 === 0 ? 1.4 : 1.1),
          y: -14,
          x: (index) => (index % 2 === 0 ? -10 : 10),
          duration: (index) => 1.4 + (index % 3) * 0.3,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
          stagger: 0.1,
        },
      );
    }, podiumRef);

    return () => {
      ctx.revert();
    };
  }, [snapshot.totalMatches, snapshot.topPlayers.length]);

  if (snapshot.totalMatches === 0) return null;

  return (
    <div ref={podiumRef} className="relative mb-8 overflow-visible">
      <div className="pointer-events-none absolute -right-4 -top-18 z-30 hidden h-44 w-44 select-none md:block lg:right-50 lg:-top-43 lg:h-64 lg:w-64">
        <Image
          src="/bocha-bocheando.png"
          alt=""
          fill
          priority
          sizes="(min-width: 1024px) 16rem, 11rem"
          className="object-contain drop-shadow-[0_1.2rem_2rem_rgba(0,0,0,0.55)]"
        />
      </div>

      <div className="relative z-10 overflow-hidden rounded-[1.25rem] border border-[#f0ed7e]/30 bg-[#101010] shadow-[0_2rem_5rem_rgba(0,0,0,0.42)]">
        <PodiumEpicBackground />

        <div className="relative z-10 border-b border-[#2a2929] p-5 sm:p-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <Sparkles className="size-4 text-[#f0ed7e]" />
                <p className="text-xs font-black uppercase tracking-[0.16em] text-[#f0ed7e]">
                  Resumen del torneo
                </p>
              </div>

              <h2
                data-podium="title"
                className="text-4xl font-black uppercase tracking-[-0.04em] text-[#f5f5f3] sm:text-5xl"
              >
                Podio de Powers Petes
              </h2>

              <p className="mt-3 max-w-3xl text-sm leading-6 text-[#8a8a85]">
                Los 3 jugadores mejor posicionados según la tabla oficial del
                torneo: victorias, winrate y rating actual.
              </p>
            </div>

            <div className="rounded-[0.75rem] border border-[#f0ed7e]/25 bg-[#f0ed7e]/10 px-4 py-3">
              <p className="text-[0.65rem] font-black uppercase tracking-[0.14em] text-[#f0ed7e]">
                Partidas cerradas
              </p>
              <p className="mt-1 text-3xl font-black text-[#f5f5f3]">
                {snapshot.totalMatches}
              </p>
            </div>
          </div>
        </div>

        {snapshot.topPlayers.length > 0 ? (
          <div
            className="relative z-10 grid gap-4 p-5 sm:p-6 xl:grid-cols-3 xl:items-end"
            style={{
              perspective: "1200px",
            }}
          >
            {snapshot.topPlayers.map((player, index) => (
              <TournamentPodiumCard
                key={player.userId}
                player={player}
                rank={(index + 1) as 1 | 2 | 3}
              />
            ))}
          </div>
        ) : null}

        <div className="relative z-10 grid gap-3 border-t border-[#2a2929] p-5 sm:p-6 md:grid-cols-2 xl:grid-cols-4">
          <TournamentCompactStat
            label="Mayor impacto"
            value={
              snapshot.mostImpactfulPlayer
                ? `${snapshot.mostImpactfulPlayer.name} · ${Math.round(
                    snapshot.mostImpactfulPlayer.score,
                  )}`
                : "-"
            }
            imageUrl={
              snapshot.mostImpactfulPlayer?.favoriteChampionImageUrl ?? null
            }
          />

          <TournamentCompactStat
            label="Campeón más baneado"
            value={
              snapshot.mostBannedChampion
                ? `${snapshot.mostBannedChampion.championName} · ${snapshot.mostBannedChampion.count}`
                : "-"
            }
            imageUrl={snapshot.mostBannedChampion?.championImageUrl ?? null}
          />

          <TournamentCompactStat
            label="Mejor KDA"
            value={
              snapshot.bestKdaPlayer
                ? `${snapshot.bestKdaPlayer.name} · ${formatKdaRatio(
                    snapshot.bestKdaPlayer.kdaRatio,
                  )}`
                : "-"
            }
            imageUrl={snapshot.bestKdaPlayer?.favoriteChampionImageUrl ?? null}
          />

          <TournamentCompactStat
            label="Mayor impacto"
            value={
              snapshot.topPlayers[0]
                ? `${snapshot.topPlayers[0].name} · ${Math.round(
                    snapshot.topPlayers[0].score,
                  )}`
                : "-"
            }
            imageUrl={snapshot.topPlayers[0]?.favoriteChampionImageUrl ?? null}
          />
        </div>
      </div>
    </div>
  );
}

function TournamentPodiumCard({
  player,
  rank,
}: {
  player: TournamentPlayerStats;
  rank: 1 | 2 | 3;
}) {
  const cardRef = useRef<HTMLElement | null>(null);
  const glowRef = useRef<HTMLDivElement | null>(null);

  const tiltStateRef = useRef({
    rx: 0,
    ry: 0,
    zoom: 1,
    glowX: 0,
    glowY: 0,
    glowOpacity: 0,
  });

  const Icon = rank === 1 ? Crown : Medal;

  const rankLabel =
    rank === 1
      ? "Rey del torneo"
      : rank === 2
        ? "Segundo puesto"
        : "Tercer puesto";

  const rankClasses = {
    1: "xl:order-2 xl:-translate-y-5 border-[#f0ed7e]/60 bg-[radial-gradient(circle_at_top,rgba(240,237,126,0.24),transparent_44%),linear-gradient(180deg,rgba(240,237,126,0.14),rgba(21,20,20,0.9))] shadow-[0_0_4rem_rgba(240,237,126,0.18)]",
    2: "xl:order-1 xl:mt-10 border-[#c9c9c4]/28 bg-[linear-gradient(180deg,rgba(201,201,196,0.11),rgba(21,20,20,0.9))]",
    3: "xl:order-3 xl:mt-10 border-orange-300/28 bg-[linear-gradient(180deg,rgba(251,146,60,0.11),rgba(21,20,20,0.9))]",
  }[rank];

  const rankBadgeClasses = {
    1: "border-[#f0ed7e]/40 bg-[#f0ed7e] text-[#151414]",
    2: "border-[#c9c9c4]/30 bg-[#c9c9c4]/12 text-[#f5f5f3]",
    3: "border-orange-300/30 bg-orange-300/12 text-orange-200",
  }[rank];

  function renderCardTilt() {
    const card = cardRef.current;
    const glow = glowRef.current;
    const state = tiltStateRef.current;

    if (card) {
      card.style.transform = `perspective(1200px) rotateX(${state.rx}deg) rotateY(${state.ry}deg) scale(${state.zoom})`;
    }

    if (glow) {
      glow.style.opacity = String(state.glowOpacity);
      glow.style.transform = `translate(calc(-50% + ${state.glowX}px), calc(-50% + ${state.glowY}px))`;
    }
  }

  useEffect(() => {
    const card = cardRef.current;
    const glow = glowRef.current;
    const tiltState = tiltStateRef.current;

    if (!card) return;

    card.style.transformStyle = "preserve-3d";
    card.style.transformOrigin = "center";
    card.style.willChange = "transform";

    return () => {
      gsap.killTweensOf(tiltState);

      card.style.transform = "";
      card.style.transformStyle = "";
      card.style.transformOrigin = "";
      card.style.willChange = "";

      if (glow) {
        glow.style.opacity = "";
        glow.style.transform = "";
      }
    };
  }, []);

  function handleCardMove(event: MouseEvent<HTMLElement>) {
    const card = cardRef.current;

    if (!card) return;

    const rect = card.getBoundingClientRect();

    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const ry = ((x - centerX) / centerX) * 22;
    const rx = -((y - centerY) / centerY) * 18;

    gsap.to(tiltStateRef.current, {
      rx,
      ry,
      zoom: rank === 1 ? 1.065 : 1.048,
      glowOpacity: rank === 1 ? 0.68 : 0.48,
      glowX: x - centerX,
      glowY: y - centerY,
      duration: 0.28,
      ease: "power3.out",
      overwrite: true,
      onUpdate: renderCardTilt,
    });
  }

  function handleCardLeave() {
    gsap.to(tiltStateRef.current, {
      rx: 0,
      ry: 0,
      zoom: 1,
      glowOpacity: 0,
      glowX: 0,
      glowY: 0,
      duration: 0.42,
      ease: "power3.out",
      overwrite: true,
      onUpdate: renderCardTilt,
    });
  }

  return (
    <article
      ref={cardRef}
      data-podium="card"
      onMouseMove={handleCardMove}
      onMouseLeave={handleCardLeave}
      className={cn(
        "group relative overflow-hidden rounded-[1.1rem] border p-5 will-change-transform",
        rankClasses,
      )}
      style={{
        transformStyle: "preserve-3d",
      }}
    >
      <div
        ref={glowRef}
        className="pointer-events-none absolute left-1/2 top-1/2 z-0 size-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#f0ed7e]/45 opacity-0 blur-3xl"
      />

      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-[#f0ed7e]/70 to-transparent" />

      {rank === 1 ? (
        <>
          <div className="pointer-events-none absolute -right-10 -top-10 size-36 rounded-full bg-[#f0ed7e]/16 blur-3xl" />
          <div className="pointer-events-none absolute -left-10 bottom-0 size-32 rounded-full bg-[#75f0a0]/8 blur-3xl" />

          {KING_PARTICLES.map((particle, index) => (
            <span
              key={index}
              data-podium="king-spark"
              className="pointer-events-none absolute z-10 rounded-full bg-[#f0ed7e]"
              style={{
                left: particle.left,
                top: particle.top,
                width: `${particle.size}px`,
                height: `${particle.size}px`,
                boxShadow: "0 0 12px #f0ed7e, 0 0 26px rgba(240,237,126,0.75)",
              }}
            />
          ))}

          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(240,237,126,0.14),transparent_42%)]" />
        </>
      ) : null}

      <div
        className="relative z-10 mb-4 flex items-center justify-between gap-3"
        style={{
          transform: "translateZ(28px)",
        }}
      >
        <span
          className={cn(
            "inline-flex items-center rounded-full border px-3 py-1 text-[0.65rem] font-black uppercase tracking-[0.14em]",
            rankBadgeClasses,
          )}
        >
          <Icon
            data-podium={rank === 1 ? "crown" : undefined}
            className="mr-1.5 size-3.5"
          />
          Top {rank}
        </span>

        <span className="text-[0.65rem] font-black uppercase tracking-[0.16em] text-[#8a8a85]">
          {rankLabel}
        </span>
      </div>

      <div
        className="relative z-10 flex items-center gap-4"
        style={{
          transform: "translateZ(36px)",
        }}
      >
        <div
          className={cn(
            "relative shrink-0 rounded-[1rem]",
            rank === 1 ? "size-24" : "size-18",
          )}
        >
          <div className="absolute inset-0 rounded-[1rem] bg-[#f0ed7e]/20 blur-xl transition group-hover:bg-[#f0ed7e]/30" />

          {player.favoriteChampionImageUrl ? (
            <Image
              src={player.favoriteChampionImageUrl}
              alt={player.favoriteChampionName ?? player.name}
              fill
              sizes={rank === 1 ? "6rem" : "4.5rem"}
              className={cn(
                "relative z-10 rounded-[1rem] border object-cover",
                rank === 1 ? "border-[#f0ed7e]/50" : "border-[#2a2929]",
              )}
            />
          ) : (
            <div className="relative z-10 grid h-full w-full place-items-center rounded-[1rem] border border-[#2a2929] bg-[#151414]">
              <Trophy className="size-7 text-[#f0ed7e]" />
            </div>
          )}
        </div>

        <div className="min-w-0">
          <h3
            className={cn(
              "truncate font-black text-[#f5f5f3]",
              rank === 1 ? "text-2xl" : "text-xl",
            )}
          >
            {player.name}
          </h3>

          <p className="mt-1 truncate text-sm text-[#c9c9c4]">
            {player.favoriteChampionName
              ? `Main destacado: ${player.favoriteChampionName}`
              : "Sin campeón destacado"}
          </p>
        </div>
      </div>

      <div
        className="relative z-10 mt-5 grid grid-cols-2 gap-2"
        style={{
          transform: "translateZ(22px)",
        }}
      >
        <MiniHistoryStat
          label="Récord"
          value={`${player.wins}/${player.games}`}
        />

        <MiniHistoryStat label="KDA" value={formatKdaRatio(player.kdaRatio)} />

        <MiniHistoryStat
          label="Variación"
          value={`${player.ratingDelta > 0 ? "+" : ""}${Math.round(
            player.ratingDelta,
          )}`}
        />

        <MiniHistoryStat label="Rating" value={`${Math.round(player.score)}`} />

        <MiniHistoryStat
          label="Impacto"
          value={`${Math.round(player.score)}`}
        />
      </div>
    </article>
  );
}

function TournamentCompactStat({
  label,
  value,
  imageUrl,
}: {
  label: string;
  value: string;
  imageUrl: string | null;
}) {
  return (
    <div className="flex items-center gap-3 rounded-[0.75rem] border border-[#2a2929] bg-[#151414]/80 p-3">
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt={value}
          width={44}
          height={44}
          sizes="2.75rem"
          className="size-11 shrink-0 rounded-4xl border border-[#2a2929] object-cover"
        />
      ) : (
        <div className="grid size-11 shrink-0 place-items-center rounded-4xl border border-[#2a2929] bg-[#101010]">
          <ShieldCheck className="size-5 text-[#f0ed7e]" />
        </div>
      )}

      <div className="min-w-0">
        <p className="text-[0.62rem] font-black uppercase tracking-[0.13em] text-[#8a8a85]">
          {label}
        </p>
        <p className="mt-1 truncate text-sm font-black text-[#f5f5f3]">
          {value}
        </p>
      </div>
    </div>
  );
}

function MatchFeaturedPlayerCard({
  players,
}: {
  players: HistoryMatchPlayer[];
}) {
  const player = getFeaturedPlayer(players);

  if (!player) return null;

  const delta = getPlayerDelta(player);
  const kda = getPlayerKda(player);

  return (
    <div className="mb-4 rounded-[0.75rem] border border-[#f0ed7e]/25 bg-[#f0ed7e]/8 p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          {player.champion_image_url ? (
            <Image
              src={player.champion_image_url}
              alt={player.champion_name ?? "Campeón"}
              width={56}
              height={56}
              sizes="3.5rem"
              className="size-14 shrink-0 rounded-[0.75rem] border border-[#f0ed7e]/25 object-cover"
            />
          ) : (
            <div className="grid size-14 shrink-0 place-items-center rounded-[0.75rem] border border-[#f0ed7e]/25 bg-[#151414]">
              <Trophy className="size-6 text-[#f0ed7e]" />
            </div>
          )}

          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[#f0ed7e]">
              Jugador destacado
            </p>

            <h3 className="mt-1 truncate text-xl font-black text-[#f5f5f3]">
              {getPlayerName(player)}
            </h3>

            <p className="mt-1 text-sm leading-6 text-[#c9c9c4]">
              {formatTeamName(player.team)} · {formatRole(player.assigned_role)}
              {player.champion_name ? ` · ${player.champion_name}` : ""}
            </p>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:min-w-72">
          <MiniHistoryStat label="KDA" value={kda ?? "-"} />

          <MiniHistoryStat
            label="Rating"
            value={`${delta > 0 ? "+" : ""}${Math.round(delta)}`}
          />
        </div>
      </div>
    </div>
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

          const playerUsedVale = Boolean(player.vale_used);

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

                    {playerUsedVale ? (
                      <span className="rounded-full border border-[#75f0a0]/25 bg-[#75f0a0]/10 px-2 py-0.5 text-[0.6rem] font-black uppercase tracking-widest text-[#75f0a0]">
                        Vale usado
                      </span>
                    ) : null}

                    {playerUsedVale && protectedLoss > 0 ? (
                      <span className="rounded-full border border-[#f0ed7e]/25 bg-[#f0ed7e]/10 px-2 py-0.5 text-[0.6rem] font-black uppercase tracking-widest text-[#f0ed7e]">
                        Protegió {Math.round(protectedLoss)} pts
                      </span>
                    ) : null}

                    {playerUsedVale && protectedLoss === 0 && winner ? (
                      <span className="rounded-full border border-[#2a2929] bg-[#151414] px-2 py-0.5 text-[0.6rem] font-black uppercase tracking-widest text-[#8a8a85]">
                        Ganó con vale
                      </span>
                    ) : null}

                    {playerUsedVale && protectedLoss === 0 && !winner ? (
                      <span className="rounded-full border border-red-400/25 bg-red-400/10 px-2 py-0.5 text-[0.6rem] font-black uppercase tracking-widest text-red-200">
                        Revisar vale
                      </span>
                    ) : null}

                    {shouldShowPlayedAs(player) ? (
                      <span className="rounded-full border border-[#f0ed7e]/25 bg-[#f0ed7e]/10 px-2 py-0.5 text-[0.62rem] font-black uppercase tracking-widest text-[#f0ed7e]">
                        Cuenta secundaria
                      </span>
                    ) : null}
                  </div>

                  {shouldShowPlayedAs(player) ? (
                    <p className="mt-2 rounded-[0.5rem] border border-[#f0ed7e]/20 bg-[#f0ed7e]/8 px-2.5 py-2 text-xs leading-5 text-[#c9c9c4]">
                      Jugó como:{" "}
                      <span className="font-black text-[#f0ed7e]">
                        {getPlayedAsName(player)}
                      </span>
                    </p>
                  ) : null}

                  <ChampionMiniCard
                    championName={player.champion_name}
                    championImageUrl={player.champion_image_url}
                  />

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

function MatchDetailSummary({
  match,
  bluePlayers,
  redPlayers,
  evidence,
}: {
  match: HistoryMatchRecord;
  bluePlayers: HistoryMatchPlayer[];
  redPlayers: HistoryMatchPlayer[];
  evidence: HistoryEvidence | null;
}) {
  const blueTotals = getTeamTotals(bluePlayers);
  const redTotals = getTeamTotals(redPlayers);

  return (
    <div className="mb-4 grid gap-3 xl:grid-cols-5">
      <MiniHistoryStat
        label="Ganador"
        value={formatTeamName(match.winner_team)}
      />

      <MiniHistoryStat label="KDA Azul" value={formatTeamKda(bluePlayers)} />

      <MiniHistoryStat label="KDA Rojo" value={formatTeamKda(redPlayers)} />

      <MiniHistoryStat
        label="Vales"
        value={`${blueTotals.vales + redTotals.vales}/10`}
      />

      <MiniHistoryStat
        label="Evidencia"
        value={getSourceLabel(evidence?.source)}
      />
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
              className="rounded-3xl border border-[#2a2929] bg-[#101010]/70 px-3 py-3"
            >
              <p className="text-[0.62rem] font-black uppercase tracking-[0.12em] text-[#8a8a85]">
                Ban {ban.ban_order}
              </p>

              <div className="mt-2 flex min-w-0 items-center gap-2">
                {ban.champion_image_url ? (
                  <Image
                    src={ban.champion_image_url}
                    alt={ban.champion_name ?? "Campeón baneado"}
                    width={40}
                    height={40}
                    sizes="2.5rem"
                    className="size-10 shrink-0 rounded-[0.6rem] border border-[#2a2929] object-cover"
                  />
                ) : null}

                <p className="truncate text-sm font-black text-[#f5f5f3]">
                  {ban.champion_name ?? "-"}
                </p>
              </div>
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

function KdaAdminEditor({
  match,
  bluePlayers,
  redPlayers,
  isEditing,
  isSaving,
  drafts,
  onStart,
  onCancel,
  onChange,
  onSave,
}: {
  match: HistoryMatchRecord;
  bluePlayers: HistoryMatchPlayer[];
  redPlayers: HistoryMatchPlayer[];
  isEditing: boolean;
  isSaving: boolean;
  drafts: KdaDraftByPlayerId;
  onStart: () => void;
  onCancel: () => void;
  onChange: (matchPlayerId: string, field: KdaField, value: string) => void;
  onSave: () => void;
}) {
  if (!isEditing) {
    return (
      <div className="mb-4 rounded-[0.75rem] border border-[#f0ed7e]/25 bg-[#f0ed7e]/8 p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Pencil className="size-4 text-[#f0ed7e]" />
              <p className="text-xs font-black uppercase tracking-[0.14em] text-[#f0ed7e]">
                Edición admin
              </p>
            </div>

            <p className="max-w-3xl text-sm leading-6 text-[#c9c9c4]">
              Como admin podés corregir o cargar el KDA manual de los jugadores
              sin modificar el ganador, los puntos ni el resultado de la
              partida.
            </p>
          </div>

          <Button
            type="button"
            onClick={onStart}
            className="h-11 rounded-[0.5rem] bg-[#f0ed7e] px-5 text-xs font-black uppercase tracking-[0.14em] text-[#151414] hover:bg-[#d8d46d]"
          >
            <Pencil className="mr-2 size-4" />
            Editar KDA
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-4 rounded-[0.75rem] border border-[#f0ed7e]/30 bg-[#101010]/80 p-4">
      <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Pencil className="size-4 text-[#f0ed7e]" />
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[#f0ed7e]">
              Editando KDA · Partida #{match.match_number}
            </p>
          </div>

          <p className="max-w-3xl text-sm leading-6 text-[#8a8a85]">
            Cargá kills, deaths y assists de cada jugador. Los campos vacíos se
            guardan como sin dato.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            disabled={isSaving}
            onClick={onCancel}
            className="h-11 rounded-[0.5rem] border border-[#2a2929] bg-[#151414] px-5 text-xs font-black uppercase tracking-[0.14em] text-[#f5f5f3] hover:border-red-400/35 hover:bg-red-400/10 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X className="mr-2 size-4" />
            Cancelar
          </Button>

          <Button
            type="button"
            disabled={isSaving}
            onClick={onSave}
            className="h-11 rounded-[0.5rem] bg-[#75f0a0] px-5 text-xs font-black uppercase tracking-[0.14em] text-[#151414] hover:bg-[#63d98a] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Save className="mr-2 size-4" />
            )}
            {isSaving ? "Guardando..." : "Guardar KDA"}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <KdaTeamEditor
          title="Equipo Azul"
          side="blue"
          players={bluePlayers}
          drafts={drafts}
          onChange={onChange}
        />

        <KdaTeamEditor
          title="Equipo Rojo"
          side="red"
          players={redPlayers}
          drafts={drafts}
          onChange={onChange}
        />
      </div>
    </div>
  );
}

function KdaTeamEditor({
  title,
  side,
  players,
  drafts,
  onChange,
}: {
  title: string;
  side: "blue" | "red";
  players: HistoryMatchPlayer[];
  drafts: KdaDraftByPlayerId;
  onChange: (matchPlayerId: string, field: KdaField, value: string) => void;
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
          const draft = drafts[player.id] ?? {
            kills: "",
            deaths: "",
            assists: "",
          };

          return (
            <div
              key={player.id}
              className="rounded-4xl border border-[#2a2929] bg-[#101010]/75 p-3"
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-[0.12em] text-[#f0ed7e]">
                    {formatRole(player.assigned_role)}
                  </p>

                  <p className="mt-1 truncate text-sm font-black text-[#f5f5f3]">
                    {getPlayerName(player)}
                  </p>
                </div>

                <ChampionMiniCard
                  championName={player.champion_name}
                  championImageUrl={player.champion_image_url}
                />
              </div>

              <div className="grid min-w-0 gap-2 sm:grid-cols-3">
                <KdaInput
                  label="Kills"
                  value={draft.kills}
                  onChange={(value) => onChange(player.id, "kills", value)}
                />

                <KdaInput
                  label="Deaths"
                  value={draft.deaths}
                  onChange={(value) => onChange(player.id, "deaths", value)}
                />

                <KdaInput
                  label="Assists"
                  value={draft.assists}
                  onChange={(value) => onChange(player.id, "assists", value)}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function KdaInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid min-w-0 gap-1.5">
      <span className="truncate text-[0.62rem] font-black uppercase tracking-[0.12em] text-[#8a8a85]">
        {label}
      </span>

      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        inputMode="numeric"
        placeholder="0"
        className="h-11 w-full min-w-0 rounded-[0.5rem] border border-[#2a2929] bg-[#151414] px-3 text-sm font-black text-[#f5f5f3] outline-none transition placeholder:text-[#555] focus:border-[#75f0a0]"
      />
    </label>
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
