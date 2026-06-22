import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  BarChart3,
  Crown,
  Gamepad2,
  Medal,
  ShieldCheck,
  Swords,
  Trophy,
  UserRound,
  Zap,
} from "lucide-react";

import DotField from "@/components/effects/dot-field";
import { PlayerProfileMotion } from "@/components/profile/player-profile-motion";
import { SyncRiotProfileButton } from "@/components/profile/sync-riot-profile-button";
import { SyncRiotMatchHistoryButton } from "@/components/profile/sync-riot-match-history-button";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type Role = "TOP" | "JUNGLE" | "MID" | "ADC" | "SUPPORT";

type ProfileRow = {
  id: string;
  profile_completed: boolean | null;
  first_name: string | null;
  last_name: string | null;
  lol_nick: string | null;
  lol_tagline: string | null;
  region: string | null;
  current_tier: string | null;
  current_division: string | null;
  current_lp: number | null;
  peak_tier: string | null;
  peak_division: string | null;
  primary_role: string | null;
  secondary_role: string | null;
  champion_pool: string | null;
  playstyle: string | null;
  riot_puuid: string | null;
  riot_profile_icon_id: number | null;
  riot_summoner_level: number | null;
  solo_queue_wins: number | null;
  solo_queue_losses: number | null;
  riot_verified_at: string | null;
  created_at: string;
  updated_at: string;
};

type PlayerBalanceStatsRow = {
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

type MatchRow = {
  id: string;
  match_number: number;
  status: string;
  winner_team: string | null;
  completed_at: string | null;
  created_at: string;
  balance_score: number | string | null;
  tournaments: {
    name: string | null;
  } | null;
};

type MatchPlayerRow = {
  id: string;
  match_id: string;
  user_id: string;
  team: string;
  assigned_role: string;
  rating_before: number | string;
  rating_after: number | string | null;
  rating_delta: number | string | null;
  role_rating_before: number | string | null;
  role_rating_after: number | string | null;
  role_rating_delta: number | string | null;
  won: boolean | null;
  vale_used: boolean;
  champion_id: number | null;
  champion_key: string | null;
  champion_name: string | null;
  champion_image_url: string | null;
  kills: number | null;
  deaths: number | null;
  assists: number | null;
  cs: number | null;
  gold: number | null;
  damage_to_champions: number | null;
  vision_score: number | null;
  manual_stats_completed: boolean;
  stats_source: string | null;
  riot_detected_champion_key: string | null;
  riot_detected_champion_name: string | null;
  riot_detected_champion_image_url: string | null;
  riot_detected_kills: number | null;
  riot_detected_deaths: number | null;
  riot_detected_assists: number | null;
  riot_detected_cs: number | null;
  riot_detected_gold: number | null;
  riot_detected_damage_to_champions: number | null;
  riot_detected_vision_score: number | null;
  matches: MatchRow | null;
};

type ChampionSummary = {
  key: string;
  name: string;
  imageUrl: string | null;
  games: number;
  wins: number;
  kills: number;
  deaths: number;
  assists: number;
  cs: number;
  gold: number;
  damage: number;
  vision: number;
};

type RiotRoleStatsRow = {
  role: string;
  games: number;
  wins: number;
  losses: number;
  win_rate: number | string;
  kda: number | string;
  avg_deaths: number | string;
  avg_cs_per_min: number | string;
  avg_damage_per_min: number | string;
  avg_vision_score: number | string;
  avg_objective_score: number | string;
  role_confidence_score: number | string;
  role_matchmaking_score: number | string;
  last_played_at: string | null;
};

type RiotChampionStatsRow = {
  champion_id: number;
  champion_key: string | null;
  champion_name: string | null;
  champion_image_url: string | null;
  champion_splash_url: string | null;
  main_role: string | null;
  games: number;
  wins: number;
  losses: number;
  win_rate: number | string;
  kda: number | string;
  avg_cs_per_min: number | string;
  avg_damage_per_min: number | string;
  avg_vision_score: number | string;
  avg_objective_score: number | string;
  champion_confidence_score: number | string;
  champion_matchmaking_score: number | string;
  last_played_at: string | null;
};

type RiotRecentFormStatsRow = {
  sample_size: number;
  wins: number;
  losses: number;
  win_rate: number | string;
  kda: number | string;
  avg_deaths: number | string;
  avg_cs_per_min: number | string;
  avg_damage_per_min: number | string;
  avg_vision_score: number | string;
  avg_objective_score: number | string;
  dominant_role: string | null;
  role_distribution: Record<string, number> | null;
  recent_form_score: number | string;
  last_match_at: string | null;
};

const roleLabels: Record<Role, string> = {
  TOP: "Top",
  JUNGLE: "Jungla",
  MID: "Mid",
  ADC: "ADC",
  SUPPORT: "Soporte",
};

function getRoleLabel(role: string | null | undefined) {
  if (
    role === "TOP" ||
    role === "JUNGLE" ||
    role === "MID" ||
    role === "ADC" ||
    role === "SUPPORT"
  ) {
    return roleLabels[role];
  }

  return "-";
}

function getRoleStatValue(stats: PlayerBalanceStatsRow | null, role: Role) {
  if (!stats) return 1000;

  const map: Record<Role, number | string> = {
    TOP: stats.top_rating,
    JUNGLE: stats.jungle_rating,
    MID: stats.mid_rating,
    ADC: stats.adc_rating,
    SUPPORT: stats.support_rating,
  };

  return Math.round(Number(map[role] ?? 1000));
}

function getWinrate(wins: number, losses: number) {
  const total = wins + losses;

  if (total <= 0) return 0;

  return Math.round((wins / total) * 100);
}

function formatNumber(value: number | string | null | undefined) {
  const numericValue = Number(value ?? 0);

  return new Intl.NumberFormat("es-AR").format(Math.round(numericValue));
}

function formatDecimal(value: number) {
  return new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatSignedScore(value: number | string | null | undefined) {
  const numericValue = Number(value ?? 0);
  const rounded = Number(numericValue.toFixed(2));

  if (rounded > 0) return `+${rounded}`;
  return String(rounded);
}

function formatPercentValue(value: number | string | null | undefined) {
  return `${Math.round(Number(value ?? 0))}%`;
}

function getSignalLabel(value: number | string | null | undefined) {
  const numericValue = Number(value ?? 0);

  if (numericValue >= 15) return "Muy favorable";
  if (numericValue >= 6) return "Favorable";
  if (numericValue > -6) return "Neutral";
  if (numericValue > -15) return "Riesgo leve";

  return "Riesgo alto";
}

function getBestRoleByScore(rows: RiotRoleStatsRow[]) {
  return rows
    .filter((row) => row.role !== "UNKNOWN")
    .slice()
    .sort((a, b) => {
      return (
        Number(b.role_matchmaking_score) - Number(a.role_matchmaking_score) ||
        Number(b.games) - Number(a.games)
      );
    })[0];
}

function getMostReliableRole(rows: RiotRoleStatsRow[]) {
  return rows
    .filter((row) => row.role !== "UNKNOWN")
    .slice()
    .sort((a, b) => {
      return (
        Number(b.role_confidence_score) - Number(a.role_confidence_score) ||
        Number(b.games) - Number(a.games)
      );
    })[0];
}

function formatDate(value: string | null | undefined) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatTier(
  tier: string | null | undefined,
  division: string | null | undefined,
) {
  if (!tier || tier === "UNRANKED") return "Sin rango";

  const tierLabels: Record<string, string> = {
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

  return `${tierLabels[tier] ?? tier} ${division ?? ""}`.trim();
}

function getRankEmblemSrc(tier: string | null | undefined) {
  if (!tier || tier === "UNRANKED") return null;

  return `/lol/ranks/${tier.toLowerCase()}.png`;
}

function getProfileIconUrl(
  version: string | null | undefined,
  iconId: number | null | undefined,
) {
  if (!version || iconId == null) return null;

  return `https://ddragon.leagueoflegends.com/cdn/${version}/img/profileicon/${iconId}.png`;
}

function getChampionName(row: MatchPlayerRow) {
  return (
    row.champion_name ??
    row.riot_detected_champion_name ??
    "Campeón sin registrar"
  );
}

function getChampionKey(row: MatchPlayerRow) {
  return row.champion_key ?? row.riot_detected_champion_key ?? "unknown";
}

function getChampionImageUrl(row: MatchPlayerRow) {
  return row.champion_image_url ?? row.riot_detected_champion_image_url ?? null;
}

function getKills(row: MatchPlayerRow) {
  return row.kills ?? row.riot_detected_kills ?? 0;
}

function getDeaths(row: MatchPlayerRow) {
  return row.deaths ?? row.riot_detected_deaths ?? 0;
}

function getAssists(row: MatchPlayerRow) {
  return row.assists ?? row.riot_detected_assists ?? 0;
}

function getCs(row: MatchPlayerRow) {
  return row.cs ?? row.riot_detected_cs ?? 0;
}

function getGold(row: MatchPlayerRow) {
  return row.gold ?? row.riot_detected_gold ?? 0;
}

function getDamage(row: MatchPlayerRow) {
  return row.damage_to_champions ?? row.riot_detected_damage_to_champions ?? 0;
}

function getVision(row: MatchPlayerRow) {
  return row.vision_score ?? row.riot_detected_vision_score ?? 0;
}

function getKda(kills: number, deaths: number, assists: number) {
  if (deaths <= 0) return kills + assists;

  return (kills + assists) / deaths;
}

function getChampionSplashUrl(championKey: string | null | undefined) {
  if (!championKey || championKey === "unknown") return null;

  return `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${championKey}_0.jpg`;
}

function buildChampionSummaries(rows: MatchPlayerRow[]) {
  const map = new Map<string, ChampionSummary>();

  rows.forEach((row) => {
    const key = getChampionKey(row);
    const name = getChampionName(row);
    const current = map.get(key) ?? {
      key,
      name,
      imageUrl: getChampionImageUrl(row),
      games: 0,
      wins: 0,
      kills: 0,
      deaths: 0,
      assists: 0,
      cs: 0,
      gold: 0,
      damage: 0,
      vision: 0,
    };

    current.games += 1;
    current.wins += row.won ? 1 : 0;
    current.kills += getKills(row);
    current.deaths += getDeaths(row);
    current.assists += getAssists(row);
    current.cs += getCs(row);
    current.gold += getGold(row);
    current.damage += getDamage(row);
    current.vision += getVision(row);

    map.set(key, current);
  });

  return Array.from(map.values()).sort((a, b) => {
    return b.games - a.games || b.wins - a.wins || b.kills - a.kills;
  });
}

async function getLatestDDragonVersion() {
  try {
    const response = await fetch(
      "https://ddragon.leagueoflegends.com/api/versions.json",
      {
        next: {
          revalidate: 60 * 60 * 12,
        },
      },
    );

    if (!response.ok) return null;

    const versions = (await response.json()) as string[];

    return versions[0] ?? null;
  } catch {
    return null;
  }
}

export default async function PlayerProfilePage() {
  const supabase = await createSupabaseServerClient();

  const supabaseAdmin = createSupabaseAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profileData } = await supabase
    .from("profiles")
    .select(
      `
      id,
      profile_completed,
      first_name,
      last_name,
      lol_nick,
      lol_tagline,
      region,
      current_tier,
      current_division,
      current_lp,
      peak_tier,
      peak_division,
      primary_role,
      secondary_role,
      champion_pool,
      playstyle,
      riot_puuid,
      riot_profile_icon_id,
      riot_summoner_level,
      solo_queue_wins,
      solo_queue_losses,
      riot_verified_at,
      created_at,
      updated_at
    `,
    )
    .eq("id", user.id)
    .maybeSingle();

  const profile = profileData as ProfileRow | null;

  if (!profile?.profile_completed) {
    redirect("/onboarding");
  }

  const { data: balanceStatsData } = await supabase
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
    .eq("user_id", user.id)
    .maybeSingle();

  const balanceStats = balanceStatsData as PlayerBalanceStatsRow | null;

  const { data: riotRoleStatsData, error: riotRoleStatsError } =
    await supabaseAdmin
      .from("player_riot_role_stats")
      .select(
        `
    role,
    games,
    wins,
    losses,
    win_rate,
    kda,
    avg_deaths,
    avg_cs_per_min,
    avg_damage_per_min,
    avg_vision_score,
    avg_objective_score,
    role_confidence_score,
    role_matchmaking_score,
    last_played_at
  `,
      )
      .eq("user_id", profile.id)
      .order("games", { ascending: false });

  if (riotRoleStatsError) {
    console.error("riotRoleStatsError:", riotRoleStatsError.message);
  }

  const riotRoleStats = (riotRoleStatsData ?? []) as RiotRoleStatsRow[];

  const { data: riotChampionStatsData, error: riotChampionStatsError } =
    await supabaseAdmin
      .from("player_riot_champion_stats")
      .select(
        `
      champion_id,
      champion_key,
      champion_name,
      champion_image_url,
      champion_splash_url,
      main_role,
      games,
      wins,
      losses,
      win_rate,
      kda,
      avg_cs_per_min,
      avg_damage_per_min,
      avg_vision_score,
      avg_objective_score,
      champion_confidence_score,
      champion_matchmaking_score,
      last_played_at
    `,
      )
      .eq("user_id", profile.id)
      .order("games", { ascending: false })
      .limit(6);

  if (riotChampionStatsError) {
    console.error("riotChampionStatsError:", riotChampionStatsError.message);
  }

  const riotChampionStats = (riotChampionStatsData ??
    []) as RiotChampionStatsRow[];

  const { data: riotRecentFormData, error: riotRecentFormError } =
    await supabaseAdmin
      .from("player_riot_recent_form_stats")
      .select(
        `
    sample_size,
    wins,
    losses,
    win_rate,
    kda,
    avg_deaths,
    avg_cs_per_min,
    avg_damage_per_min,
    avg_vision_score,
    avg_objective_score,
    dominant_role,
    role_distribution,
    recent_form_score,
    last_match_at
  `,
      )
      .eq("user_id", profile.id)
      .maybeSingle();

  if (riotRecentFormError) {
    console.error("riotRecentFormError:", riotRecentFormError.message);
  }

  const riotRecentForm = riotRecentFormData as RiotRecentFormStatsRow | null;

  const { data: matchPlayersData } = await supabase
    .from("match_players")
    .select(
      `
      id,
      match_id,
      user_id,
      team,
      assigned_role,
      rating_before,
      rating_after,
      rating_delta,
      role_rating_before,
      role_rating_after,
      role_rating_delta,
      won,
      vale_used,
      champion_id,
      champion_key,
      champion_name,
      champion_image_url,
      kills,
      deaths,
      assists,
      cs,
      gold,
      damage_to_champions,
      vision_score,
      manual_stats_completed,
      stats_source,
      riot_detected_champion_key,
      riot_detected_champion_name,
      riot_detected_champion_image_url,
      riot_detected_kills,
      riot_detected_deaths,
      riot_detected_assists,
      riot_detected_cs,
      riot_detected_gold,
      riot_detected_damage_to_champions,
      riot_detected_vision_score,
      matches (
        id,
        match_number,
        status,
        winner_team,
        completed_at,
        created_at,
        balance_score,
        tournaments (
          name
        )
      )
    `,
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(40);

  const matchRows = (matchPlayersData ?? []) as unknown as MatchPlayerRow[];

  const completedRows = matchRows.filter((row) => {
    return row.won !== null || row.matches?.completed_at;
  });

  const totalGames = completedRows.length;
  const totalWins = completedRows.filter((row) => row.won === true).length;
  const totalLosses = completedRows.filter((row) => row.won === false).length;
  const valeUses = matchRows.filter((row) => row.vale_used).length;

  const totalKills = completedRows.reduce((sum, row) => sum + getKills(row), 0);
  const totalDeaths = completedRows.reduce(
    (sum, row) => sum + getDeaths(row),
    0,
  );
  const totalAssists = completedRows.reduce(
    (sum, row) => sum + getAssists(row),
    0,
  );
  const totalCs = completedRows.reduce((sum, row) => sum + getCs(row), 0);
  const totalDamage = completedRows.reduce(
    (sum, row) => sum + getDamage(row),
    0,
  );
  const totalVision = completedRows.reduce(
    (sum, row) => sum + getVision(row),
    0,
  );

  const championSummaries = buildChampionSummaries(completedRows);
  const mainChampion = championSummaries[0] ?? null;

  const ddragonVersion = await getLatestDDragonVersion();
  const profileIconUrl = getProfileIconUrl(
    ddragonVersion,
    profile.riot_profile_icon_id,
  );

  const rankEmblemSrc = getRankEmblemSrc(profile.current_tier);
  const heroSplashUrl = getChampionSplashUrl(mainChampion?.key ?? null);

  const soloQueueWins = profile.solo_queue_wins ?? 0;
  const soloQueueLosses = profile.solo_queue_losses ?? 0;
  const soloQueueWinrate = getWinrate(soloQueueWins, soloQueueLosses);

  const internalWinrate = getWinrate(totalWins, totalLosses);
  const averageKda = getKda(totalKills, totalDeaths, totalAssists);
  const averageCs = totalGames > 0 ? totalCs / totalGames : 0;
  const averageDamage = totalGames > 0 ? totalDamage / totalGames : 0;
  const averageVision = totalGames > 0 ? totalVision / totalGames : 0;

  const strongestRiotRole = getBestRoleByScore(riotRoleStats);
  const mostReliableRiotRole = getMostReliableRole(riotRoleStats);

  const displayName = `${profile.lol_nick ?? "Jugador"}#${
    profile.lol_tagline ?? "-"
  }`;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#151414] px-4 py-8 text-[#f5f5f3] sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(200,155,60,0.12),transparent_28%),radial-gradient(circle_at_80%_20%,rgba(10,200,185,0.07),transparent_24%),linear-gradient(180deg,rgba(21,20,20,0),#151414_72%)]" />

      {heroSplashUrl ? (
        <div className="pointer-events-none absolute inset-x-0 top-0 h-160 overflow-hidden opacity-28">
          <Image
            src={heroSplashUrl}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-linear-to-b from-[#151414]/15 via-[#151414]/70 to-[#151414]" />
          <div className="absolute inset-0 bg-linear-to-r from-[#151414] via-transparent to-[#151414]/80" />
        </div>
      ) : null}

      <DotField
        className="pointer-events-none absolute inset-0 z-0 opacity-20"
        dotRadius={1.2}
        dotSpacing={18}
        cursorRadius={340}
        cursorForce={0.08}
        bulgeOnly
        bulgeStrength={38}
        glowRadius={110}
        sparkle={false}
        waveAmplitude={0}
        gradientFrom="rgba(245,245,243,0.10)"
        gradientTo="rgba(200,155,60,0.12)"
        glowColor="rgba(21,20,20,0.55)"
      />

      <PlayerProfileMotion>
        <div className="relative z-10 mx-auto w-full max-w-352">
          <header className="mb-6 flex flex-col gap-4 border-b border-[#2a2929] pb-6 sm:flex-row sm:items-center sm:justify-between">
            <Link
              href="/dashboard"
              className="inline-flex h-11 w-fit items-center justify-center rounded-[0.5rem] border border-[#2a2929] bg-[#101010]/80 px-4 text-xs font-black uppercase tracking-[0.13em] text-[#c9c9c4] transition hover:border-[#f0ed7e]/35 hover:text-[#f0ed7e]"
            >
              <ArrowLeft className="mr-2 size-4" />
              Volver al dashboard
            </Link>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
              <SyncRiotProfileButton />
              <SyncRiotMatchHistoryButton />

              <Link
                href="/dashboard/history"
                className="inline-flex h-11 items-center justify-center rounded-[0.5rem] border border-[#f0ed7e]/25 bg-[#f0ed7e]/10 px-4 text-xs font-black uppercase tracking-[0.13em] text-[#f0ed7e] transition hover:bg-[#f0ed7e]/15"
              >
                <Trophy className="mr-2 size-4" />
                Historial
              </Link>
            </div>
          </header>

          <section
            data-profile-anim="hero"
            className="relative overflow-hidden rounded-[1rem] border border-[#463714] bg-[#080806]/88 shadow-[0_2rem_7rem_rgba(0,0,0,0.48)]"
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(200,155,60,0.18),transparent_34%),radial-gradient(circle_at_80%_20%,rgba(10,200,185,0.12),transparent_30%)]" />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-[#c89b3c] to-transparent" />

            <div className="relative z-10 grid gap-6 p-5 sm:p-7 xl:grid-cols-[1fr_23rem] xl:items-end">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-end">
                <div className="relative size-30 shrink-0 overflow-hidden rounded-[1rem] border border-[#c89b3c]/50 bg-[#151414] shadow-[0_0_3rem_rgba(200,155,60,0.18)]">
                  {profileIconUrl ? (
                    <Image
                      src={profileIconUrl}
                      alt={displayName}
                      fill
                      priority
                      sizes="7.5rem"
                      className="object-cover"
                    />
                  ) : (
                    <div className="grid size-full place-items-center">
                      <UserRound className="size-12 text-[#c89b3c]" />
                    </div>
                  )}

                  <div className="absolute inset-x-0 bottom-0 bg-black/55 px-2 py-1 text-center text-[0.62rem] font-black uppercase tracking-[0.12em] text-[#f0e6d2]">
                    Nv. {profile.riot_summoner_level ?? "-"}
                  </div>
                </div>

                <div className="min-w-0">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center rounded-full border border-[#c89b3c]/35 bg-[#c89b3c]/10 px-3 py-1 text-[0.68rem] font-black uppercase tracking-[0.14em] text-[#c89b3c]">
                      <Gamepad2 className="mr-1.5 size-3.5" />
                      Perfil competitivo
                    </span>

                    <span className="inline-flex items-center rounded-full border border-[#0ac8b9]/30 bg-[#0ac8b9]/10 px-3 py-1 text-[0.68rem] font-black uppercase tracking-[0.14em] text-[#0ac8b9]">
                      <ShieldCheck className="mr-1.5 size-3.5" />
                      {profile.riot_verified_at
                        ? "Riot verificado"
                        : "Riot pendiente"}
                    </span>
                  </div>

                  <h1 className="truncate text-5xl font-black uppercase tracking-[-0.055em] text-[#f0e6d2] sm:text-6xl">
                    {profile.lol_nick ?? "Jugador"}
                    <span className="text-[#8a8a85]">
                      #{profile.lol_tagline ?? "-"}
                    </span>
                  </h1>

                  <p className="mt-3 max-w-3xl text-sm leading-6 text-[#c9c9c4]">
                    {profile.first_name ?? ""} {profile.last_name ?? ""} ·{" "}
                    {profile.region ?? "Región sin cargar"} · actualizado el{" "}
                    {formatDate(profile.updated_at)}
                  </p>

                  <div className="mt-5 flex flex-wrap gap-3">
                    <ProfileBadge
                      label="Rol principal"
                      value={getRoleLabel(profile.primary_role)}
                    />
                    <ProfileBadge
                      label="Rol secundario"
                      value={getRoleLabel(profile.secondary_role)}
                    />
                    <ProfileBadge
                      label="Champion pool"
                      value={profile.champion_pool ?? "-"}
                    />
                    <ProfileBadge
                      label="Estilo"
                      value={profile.playstyle ?? "-"}
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-[0.85rem] border border-[#2a2929] bg-[#101010]/78 p-4">
                <div className="flex items-center gap-4">
                  {rankEmblemSrc ? (
                    <div className="grid size-32 shrink-0 place-items-center">
                      <Image
                        src={rankEmblemSrc}
                        alt={formatTier(
                          profile.current_tier,
                          profile.current_division,
                        )}
                        width={144}
                        height={144}
                        sizes="9rem"
                        className="size-36 scale-200 object-contain drop-shadow-[0_0_1.5rem_rgba(200,155,60,0.22)]"
                      />
                    </div>
                  ) : (
                    <div className="grid size-32 shrink-0 place-items-center rounded-[0.75rem] border border-[#2a2929] bg-[#151414]">
                      <Medal className="size-12 text-[#8a8a85]" />
                    </div>
                  )}

                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-[#c89b3c]">
                      Solo/Duo
                    </p>
                    <h2 className="mt-1 text-2xl font-black text-[#f0e6d2]">
                      {formatTier(
                        profile.current_tier,
                        profile.current_division,
                      )}
                    </h2>
                    <p className="mt-1 text-sm text-[#8a8a85]">
                      {profile.current_lp ?? 0} LP · WR {soloQueueWinrate}%
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 border-t border-[#2a2929] pt-4">
                  <MiniProfileStat
                    label="Peak"
                    value={formatTier(profile.peak_tier, profile.peak_division)}
                  />
                  <MiniProfileStat
                    label="Powers Rating"
                    value={formatNumber(balanceStats?.global_rating ?? 1000)}
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="mt-6 grid gap-4 lg:grid-cols-4">
            <ProfileMetric
              icon={Trophy}
              label="Partidas internas"
              value={String(totalGames)}
              description={`${totalWins} victorias / ${totalLosses} derrotas`}
            />

            <ProfileMetric
              icon={Zap}
              label="Win rate interno"
              value={`${internalWinrate}%`}
              description="Partidas confirmadas en Powers Petes"
            />

            <ProfileMetric
              icon={Swords}
              label="KDA promedio"
              value={formatDecimal(averageKda)}
              description={`${totalKills}/${totalDeaths}/${totalAssists} acumulado`}
            />

            <ProfileMetric
              icon={ShieldCheck}
              label="Vales usados"
              value={String(valeUses)}
              description="Protecciones activadas en pre-partida"
            />
          </section>

          <section className="mt-6 grid gap-6 xl:grid-cols-[1fr_25rem]">
            <div className="space-y-6">
              <section
                data-profile-anim="panel"
                className="rounded-[0.85rem] border border-[#2a2929] bg-[#101010]/90 p-5 shadow-[0_1.2rem_4rem_rgba(0,0,0,0.25)]"
              >
                <div className="mb-5 flex flex-col gap-3 border-b border-[#2a2929] pb-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-[#c89b3c]">
                      Campeones principales
                    </p>
                    <h2 className="mt-2 text-2xl font-black text-[#f0e6d2]">
                      Rendimiento por campeón
                    </h2>
                  </div>

                  <p className="text-sm text-[#8a8a85]">
                    Basado en partidas cerradas del sistema.
                  </p>
                </div>

                {championSummaries.length > 0 ? (
                  <div className="grid gap-3">
                    {championSummaries.slice(0, 6).map((champion) => {
                      const championWinrate = getWinrate(
                        champion.wins,
                        champion.games - champion.wins,
                      );
                      const championKda = getKda(
                        champion.kills,
                        champion.deaths,
                        champion.assists,
                      );

                      return (
                        <ChampionPerformanceCard
                          key={champion.key}
                          champion={champion}
                          winrate={championWinrate}
                          kda={championKda}
                        />
                      );
                    })}
                  </div>
                ) : (
                  <EmptyProfileState
                    title="Todavía no hay campeones cargados"
                    description="Cuando se cierren partidas con campeones y estadísticas, esta sección mostrará tus mejores picks."
                  />
                )}
              </section>

              <section
                data-profile-anim="panel"
                className="rounded-[0.85rem] border border-[#2a2929] bg-[#101010]/90 p-5 shadow-[0_1.2rem_4rem_rgba(0,0,0,0.25)]"
              >
                <div className="mb-5 flex flex-col gap-3 border-b border-[#2a2929] pb-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-[#c89b3c]">
                      Historial interno
                    </p>
                    <h2 className="mt-2 text-2xl font-black text-[#f0e6d2]">
                      Últimas partidas
                    </h2>
                  </div>

                  <Link
                    href="/dashboard/history"
                    className="inline-flex h-10 items-center justify-center rounded-[0.5rem] border border-[#c89b3c]/25 bg-[#c89b3c]/10 px-4 text-xs font-black uppercase tracking-[0.13em] text-[#c89b3c] transition hover:bg-[#c89b3c]/15"
                  >
                    Ver historial completo
                  </Link>
                </div>

                {completedRows.length > 0 ? (
                  <div className="custom-scrollbar max-h-160 space-y-3 overflow-y-auto pr-2">
                    {completedRows.slice(0, 10).map((row) => (
                      <RecentMatchCard key={row.id} row={row} />
                    ))}
                  </div>
                ) : (
                  <EmptyProfileState
                    title="Sin partidas cerradas todavía"
                    description="Cuando el admin cierre partidas, aparecerán tus resultados, campeones, KDA y cambios de rating."
                  />
                )}
              </section>
              <RiotMatchmakingSignalsCard
                roleStats={riotRoleStats}
                championStats={riotChampionStats}
                recentForm={riotRecentForm}
                strongestRole={strongestRiotRole}
                mostReliableRole={mostReliableRiotRole}
              />
            </div>

            <aside className="space-y-6">
              <section
                data-profile-anim="panel"
                className="rounded-[0.85rem] border border-[#2a2929] bg-[#101010]/90 p-5 shadow-[0_1.2rem_4rem_rgba(0,0,0,0.25)]"
              >
                <p className="text-xs font-black uppercase tracking-[0.14em] text-[#c89b3c]">
                  Rating por rol
                </p>

                <div className="mt-5 grid gap-3">
                  {(["TOP", "JUNGLE", "MID", "ADC", "SUPPORT"] as Role[]).map(
                    (role) => (
                      <RoleRatingBar
                        key={role}
                        role={role}
                        value={getRoleStatValue(balanceStats, role)}
                      />
                    ),
                  )}
                </div>
              </section>

              <section
                data-profile-anim="panel"
                className="rounded-[0.85rem] border border-[#2a2929] bg-[#101010]/90 p-5 shadow-[0_1.2rem_4rem_rgba(0,0,0,0.25)]"
              >
                <p className="text-xs font-black uppercase tracking-[0.14em] text-[#c89b3c]">
                  Estadísticas promedio
                </p>

                <div className="mt-5 grid gap-3">
                  <SideStat
                    label="CS promedio"
                    value={formatDecimal(averageCs)}
                  />
                  <SideStat
                    label="Daño promedio"
                    value={formatNumber(averageDamage)}
                  />
                  <SideStat
                    label="Visión promedio"
                    value={formatDecimal(averageVision)}
                  />
                  <SideStat
                    label="Forma Riot"
                    value={
                      riotRecentForm
                        ? `${formatSignedScore(riotRecentForm.recent_form_score)} pts`
                        : "-"
                    }
                  />
                </div>
              </section>
            </aside>
          </section>
        </div>
      </PlayerProfileMotion>
    </main>
  );
}

function ProfileBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-full border border-[#2a2929] bg-[#101010]/80 px-3 py-2">
      <span className="text-[0.62rem] font-black uppercase tracking-[0.12em] text-[#8a8a85]">
        {label}:{" "}
      </span>
      <span className="text-xs font-black text-[#f0e6d2]">{value}</span>
    </div>
  );
}

function MiniProfileStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[0.6rem] border border-[#2a2929] bg-[#151414]/80 px-3 py-3">
      <p className="text-[0.62rem] font-black uppercase tracking-[0.12em] text-[#8a8a85]">
        {label}
      </p>
      <p className="mt-1 text-sm font-black text-[#f0e6d2]">{value}</p>
    </div>
  );
}

function ProfileMetric({
  icon: Icon,
  label,
  value,
  description,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  description: string;
}) {
  return (
    <article
      data-profile-anim="stat"
      className="relative overflow-hidden rounded-[0.85rem] border border-[#2a2929] bg-[#101010]/90 p-5 shadow-[0_1.2rem_4rem_rgba(0,0,0,0.22)]"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-[#c89b3c]/35 to-transparent" />

      <div className="mb-4 flex items-center gap-2">
        <Icon className="size-4 text-[#c89b3c]" />
        <p className="text-xs font-black uppercase tracking-[0.14em] text-[#8a8a85]">
          {label}
        </p>
      </div>

      <h3 className="text-3xl font-black text-[#f0e6d2]">{value}</h3>

      <p className="mt-2 text-sm leading-6 text-[#8a8a85]">{description}</p>
    </article>
  );
}

function ChampionPerformanceCard({
  champion,
  winrate,
  kda,
}: {
  champion: ChampionSummary;
  winrate: number;
  kda: number;
}) {
  const losses = champion.games - champion.wins;

  return (
    <article className="group relative overflow-hidden rounded-[0.75rem] border border-[#2a2929] bg-[#151414]/82 p-4 transition hover:border-[#c89b3c]/35">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <div className="relative size-16 shrink-0 overflow-hidden rounded-[0.75rem] border border-[#c89b3c]/30 bg-[#101010]">
            {champion.imageUrl ? (
              <Image
                src={champion.imageUrl}
                alt={champion.name}
                fill
                sizes="4rem"
                className="object-cover"
              />
            ) : (
              <div className="grid size-full place-items-center">
                <Crown className="size-7 text-[#c89b3c]" />
              </div>
            )}
          </div>

          <div className="min-w-0">
            <h3 className="truncate text-lg font-black text-[#f0e6d2]">
              {champion.name}
            </h3>
            <p className="mt-1 text-sm text-[#8a8a85]">
              {champion.games} partidas · {champion.wins}V / {losses}D
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 md:min-w-96">
          <CompactStat label="WR" value={`${winrate}%`} />
          <CompactStat label="KDA" value={formatDecimal(kda)} />
          <CompactStat
            label="Daño prom."
            value={formatNumber(champion.damage / champion.games)}
          />
        </div>
      </div>
    </article>
  );
}

function RecentMatchCard({ row }: { row: MatchPlayerRow }) {
  const kills = getKills(row);
  const deaths = getDeaths(row);
  const assists = getAssists(row);
  const kda = getKda(kills, deaths, assists);

  return (
    <article
      className={[
        "rounded-[0.75rem] border bg-[#151414]/82 p-4",
        row.won
          ? "border-[#0ac8b9]/25"
          : row.won === false
            ? "border-red-400/25"
            : "border-[#2a2929]",
      ].join(" ")}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <div className="relative size-14 shrink-0 overflow-hidden rounded-4xl border border-[#2a2929] bg-[#101010]">
            {getChampionImageUrl(row) ? (
              <Image
                src={getChampionImageUrl(row) ?? ""}
                alt={getChampionName(row)}
                fill
                sizes="3.5rem"
                className="object-cover"
              />
            ) : (
              <div className="grid size-full place-items-center">
                <Swords className="size-6 text-[#c89b3c]" />
              </div>
            )}
          </div>

          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.13em] text-[#c89b3c]">
              Partida #{row.matches?.match_number ?? "-"} ·{" "}
              {getRoleLabel(row.assigned_role)}
            </p>

            <h3 className="mt-1 truncate text-base font-black text-[#f0e6d2]">
              {getChampionName(row)}
            </h3>

            <p className="mt-1 text-xs text-[#8a8a85]">
              {row.matches?.tournaments?.name ?? "Torneo"} ·{" "}
              {formatDate(row.matches?.completed_at ?? row.matches?.created_at)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2 lg:min-w-md">
          <CompactStat
            label="Resultado"
            value={row.won ? "Victoria" : row.won === false ? "Derrota" : "-"}
          />
          <CompactStat label="KDA" value={`${kills}/${deaths}/${assists}`} />
          <CompactStat label="Ratio" value={formatDecimal(kda)} />
          <CompactStat
            label="Rating"
            value={
              row.rating_delta != null
                ? `${Number(row.rating_delta) > 0 ? "+" : ""}${Math.round(
                    Number(row.rating_delta),
                  )}`
                : "-"
            }
          />
        </div>
      </div>
    </article>
  );
}

function RoleRatingBar({ role, value }: { role: Role; value: number }) {
  const percent = Math.min(100, Math.max(8, ((value - 800) / 700) * 100));

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-sm font-black text-[#f0e6d2]">{roleLabels[role]}</p>
        <p className="text-sm font-black text-[#c89b3c]">{value}</p>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-[#2a2929]">
        <div
          className="h-full rounded-full bg-linear-to-r from-[#c89b3c] to-[#f0e6d2]"
          style={{
            width: `${percent}%`,
          }}
        />
      </div>
    </div>
  );
}

function CompactStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-[#2a2929] bg-[#101010]/75 px-3 py-2">
      <p className="text-[0.58rem] font-black uppercase tracking-[0.11em] text-[#8a8a85]">
        {label}
      </p>
      <p className="mt-1 truncate text-xs font-black text-[#f0e6d2]">{value}</p>
    </div>
  );
}

function SideStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[0.6rem] border border-[#2a2929] bg-[#151414]/80 px-4 py-3">
      <p className="text-sm text-[#8a8a85]">{label}</p>
      <p className="text-sm font-black text-[#f0e6d2]">{value}</p>
    </div>
  );
}

function EmptyProfileState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[0.75rem] border border-[#2a2929] bg-[#151414]/80 p-6">
      <p className="text-sm font-black text-[#f0e6d2]">{title}</p>
      <p className="mt-2 text-sm leading-6 text-[#8a8a85]">{description}</p>
    </div>
  );
}

function RiotMatchmakingSignalsCard({
  roleStats,
  championStats,
  recentForm,
  strongestRole,
  mostReliableRole,
}: {
  roleStats: RiotRoleStatsRow[];
  championStats: RiotChampionStatsRow[];
  recentForm: RiotRecentFormStatsRow | null;
  strongestRole: RiotRoleStatsRow | undefined;
  mostReliableRole: RiotRoleStatsRow | undefined;
}) {
  const hasSignals =
    roleStats.length > 0 || championStats.length > 0 || recentForm !== null;

  return (
    <section
      data-profile-anim="panel"
      className="relative overflow-hidden rounded-[1rem] border border-[#0ac8b9]/25 bg-[#0ac8b9]/8 p-5 shadow-[0_1.2rem_4rem_rgba(0,0,0,0.25)] sm:p-6"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(10,200,185,0.14),transparent_34%),radial-gradient(circle_at_80%_20%,rgba(200,155,60,0.08),transparent_30%)]" />

      <div className="relative z-10">
        <div className="mb-4 flex items-center gap-2">
          <BadgeCheck className="size-4 text-[#0ac8b9]" />
          <p className="text-xs font-black uppercase tracking-[0.14em] text-[#0ac8b9]">
            Señales Riot
          </p>
        </div>

        <h3 className="text-xl font-black text-[#f0e6d2]">
          Matchmaking externo
        </h3>

        <p className="mt-3 max-w-3xl text-sm leading-6 text-[#8a8a85]">
          Datos procesados desde tus últimas partidas de Riot para mejorar el
          balance: rol fuerte, confianza por rol, champion pool real y forma
          reciente.
        </p>

        {!hasSignals ? (
          <div className="mt-5 rounded-[0.75rem] border border-[#2a2929] bg-[#151414]/80 p-4">
            <p className="text-sm font-black text-[#f0e6d2]">
              Sin señales calculadas todavía
            </p>
            <p className="mt-2 text-sm leading-6 text-[#8a8a85]">
              Tocá “Sincronizar historial” para analizar tus últimas partidas de
              Riot.
            </p>
          </div>
        ) : (
          <>
            <div className="mt-5 grid gap-3 lg:grid-cols-3">
              <SignalSummaryStat
                label="Rol más fuerte"
                value={strongestRole ? getRoleLabel(strongestRole.role) : "-"}
                detail={
                  strongestRole
                    ? `${formatSignedScore(
                        strongestRole.role_matchmaking_score,
                      )} · ${getSignalLabel(
                        strongestRole.role_matchmaking_score,
                      )}`
                    : "-"
                }
              />

              <SignalSummaryStat
                label="Rol más confiable"
                value={
                  mostReliableRole ? getRoleLabel(mostReliableRole.role) : "-"
                }
                detail={
                  mostReliableRole
                    ? `${mostReliableRole.games} partidas · confianza ${formatPercentValue(
                        mostReliableRole.role_confidence_score,
                      )}`
                    : "-"
                }
              />

              <SignalSummaryStat
                label="Forma reciente"
                value={
                  recentForm
                    ? formatSignedScore(recentForm.recent_form_score)
                    : "-"
                }
                detail={
                  recentForm
                    ? `${recentForm.sample_size} partidas · WR ${formatPercentValue(
                        recentForm.win_rate,
                      )} · rol ${getRoleLabel(recentForm.dominant_role)}`
                    : "-"
                }
              />
            </div>

            {roleStats.length > 0 ? (
              <div className="mt-5 border-t border-[#2a2929] pt-5">
                <div className="mb-3 flex items-center gap-2">
                  <BarChart3 className="size-4 text-[#c89b3c]" />
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-[#c89b3c]">
                    Por rol
                  </p>
                </div>

                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {roleStats
                    .filter((row) => row.role !== "UNKNOWN")
                    .slice(0, 5)
                    .map((row) => (
                      <RiotRoleSignalRow key={row.role} row={row} />
                    ))}
                </div>
              </div>
            ) : null}

            {championStats.length > 0 ? (
              <div className="mt-5 border-t border-[#2a2929] pt-5">
                <div className="mb-3 flex items-center gap-2">
                  <Crown className="size-4 text-[#c89b3c]" />
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-[#c89b3c]">
                    Champion pool real
                  </p>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  {championStats.slice(0, 4).map((champion) => (
                    <RiotChampionSignalRow
                      key={champion.champion_id}
                      champion={champion}
                    />
                  ))}
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}

function SignalSummaryStat({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-4xl border border-[#2a2929] bg-[#151414]/80 p-4">
      <p className="text-[0.62rem] font-black uppercase tracking-[0.12em] text-[#8a8a85]">
        {label}
      </p>
      <p className="mt-1 text-lg font-black text-[#f0e6d2]">{value}</p>
      <p className="mt-1 text-xs leading-5 text-[#8a8a85]">{detail}</p>
    </div>
  );
}

function RiotRoleSignalRow({ row }: { row: RiotRoleStatsRow }) {
  return (
    <div className="rounded-4xl border border-[#2a2929] bg-[#151414]/80 p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-sm font-black text-[#f0e6d2]">
          {getRoleLabel(row.role)}
        </p>
        <p className="text-sm font-black text-[#0ac8b9]">
          {formatSignedScore(row.role_matchmaking_score)}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <CompactStat label="Partidas" value={String(row.games)} />
        <CompactStat label="WR" value={formatPercentValue(row.win_rate)} />
        <CompactStat label="KDA" value={formatDecimal(Number(row.kda))} />
      </div>
    </div>
  );
}

function RiotChampionSignalRow({
  champion,
}: {
  champion: RiotChampionStatsRow;
}) {
  return (
    <div className="flex items-center gap-3 rounded-4xl border border-[#2a2929] bg-[#151414]/80 p-3">
      <div className="relative size-10 shrink-0 overflow-hidden rounded-3xl border border-[#c89b3c]/25 bg-[#101010]">
        {champion.champion_image_url ? (
          <Image
            src={champion.champion_image_url}
            alt={champion.champion_name ?? "Campeón"}
            fill
            sizes="2.5rem"
            className="object-cover"
          />
        ) : (
          <div className="grid size-full place-items-center">
            <Crown className="size-5 text-[#c89b3c]" />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-black text-[#f0e6d2]">
          {champion.champion_name ?? "Campeón"}
        </p>
        <p className="mt-0.5 text-xs text-[#8a8a85]">
          {champion.games} partidas · WR {formatPercentValue(champion.win_rate)}{" "}
          · {getRoleLabel(champion.main_role)}
        </p>
      </div>

      <p className="text-sm font-black text-[#c89b3c]">
        {formatSignedScore(champion.champion_matchmaking_score)}
      </p>
    </div>
  );
}
