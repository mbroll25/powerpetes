"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type RegionCode = "LAS" | "LAN" | "BR" | "NA" | "EUW" | "EUNE" | "KR" | "JP";

type RiotAccountResponse = {
  puuid: string;
  gameName: string;
  tagLine: string;
};

type RiotSummonerResponse = {
  id: string;
  accountId: string;
  puuid: string;
  profileIconId: number;
  revisionDate: number;
  summonerLevel: number;
};

type RiotLeagueEntry = {
  leagueId: string;
  summonerId: string;
  queueType: string;
  tier: string;
  rank: string;
  leaguePoints: number;
  wins: number;
  losses: number;
  veteran: boolean;
  inactive: boolean;
  freshBlood: boolean;
  hotStreak: boolean;
};

type SyncRiotProfileResult = {
  success: boolean;
  message: string;
};

const FIXED_POWERPETES_REGION: RegionCode = "LAS";

const routeByRegion: Record<
  RegionCode,
  {
    regionalRoute: "americas" | "asia" | "europe";
    platformRoute: string;
  }
> = {
  LAS: {
    regionalRoute: "americas",
    platformRoute: "la2",
  },
  LAN: {
    regionalRoute: "americas",
    platformRoute: "la1",
  },
  BR: {
    regionalRoute: "americas",
    platformRoute: "br1",
  },
  NA: {
    regionalRoute: "americas",
    platformRoute: "na1",
  },
  EUW: {
    regionalRoute: "europe",
    platformRoute: "euw1",
  },
  EUNE: {
    regionalRoute: "europe",
    platformRoute: "eun1",
  },
  KR: {
    regionalRoute: "asia",
    platformRoute: "kr",
  },
  JP: {
    regionalRoute: "asia",
    platformRoute: "jp1",
  },
};

function isRegionCode(value: string): value is RegionCode {
  return value in routeByRegion;
}

async function riotFetch<T>(
  url: string,
  riotApiKey: string,
  stage: string,
): Promise<T> {
  const response = await fetch(url, {
    headers: {
      "X-Riot-Token": riotApiKey,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text();

    throw new Error(
      JSON.stringify({
        stage,
        status: response.status,
        body,
      }),
    );
  }

  return response.json() as Promise<T>;
}

export async function syncCurrentUserRiotProfile(): Promise<SyncRiotProfileResult> {
  const riotApiKey = process.env.RIOT_API_KEY;

  if (!riotApiKey) {
    return {
      success: false,
      message: "Falta configurar RIOT_API_KEY en las variables de entorno.",
    };
  }

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      message: "No se encontró una sesión activa.",
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select(
      `
      id,
      lol_nick,
      lol_tagline,
      region
    `,
    )
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return {
      success: false,
      message: "No se pudo leer el perfil del usuario.",
    };
  }

  const gameName = profile?.lol_nick?.trim();
  const tagLine = profile?.lol_tagline?.trim();
  const regionValue = FIXED_POWERPETES_REGION;

  if (!gameName || !tagLine) {
    return {
      success: false,
      message: "Primero cargá tu Riot ID y tagline en el perfil.",
    };
  }

  if (!isRegionCode(regionValue)) {
    return {
      success: false,
      message: "La región cargada no está soportada para sincronización Riot.",
    };
  }

  const { regionalRoute, platformRoute } = routeByRegion[regionValue];

  const encodedGameName = encodeURIComponent(gameName);
  const encodedTagLine = encodeURIComponent(tagLine);

  try {
    const account = await riotFetch<RiotAccountResponse>(
      `https://${regionalRoute}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodedGameName}/${encodedTagLine}`,
      riotApiKey,
      "account-v1",
    );

    const summoner = await riotFetch<RiotSummonerResponse>(
      `https://${platformRoute}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${account.puuid}`,
      riotApiKey,
      "summoner-v4",
    );

    const leagueEntries = await riotFetch<RiotLeagueEntry[]>(
      `https://${platformRoute}.api.riotgames.com/lol/league/v4/entries/by-puuid/${account.puuid}`,
      riotApiKey,
      "league-v4-by-puuid",
    );

    const rankedSolo =
      leagueEntries.find((entry) => entry.queueType === "RANKED_SOLO_5x5") ??
      null;

    const now = new Date().toISOString();

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        lol_nick: account.gameName,
        lol_tagline: account.tagLine,
        region: regionValue,
        riot_puuid: account.puuid,
        riot_profile_icon_id: summoner.profileIconId,
        riot_summoner_level: summoner.summonerLevel,
        current_tier: rankedSolo?.tier ?? "UNRANKED",
        current_division: rankedSolo?.rank ?? null,
        current_lp: rankedSolo?.leaguePoints ?? 0,
        solo_queue_wins: rankedSolo?.wins ?? 0,
        solo_queue_losses: rankedSolo?.losses ?? 0,
        riot_verified_at: now,
        updated_at: now,
      })
      .eq("id", user.id);

    if (updateError) {
      return {
        success: false,
        message:
          "Riot respondió correctamente, pero no se pudo actualizar el perfil.",
      };
    }

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/profile");

    return {
      success: true,
      message: "Perfil Riot sincronizado correctamente.",
    };
  } catch {
    return {
      success: false,
      message:
        "No se pudo sincronizar con Riot. Revisá tu Riot ID, tagline, región o la API Key.",
    };
  }
}

type RiotMatchHistoryResult = {
  success: boolean;
  message: string;
  matchesSynced?: number;
};

type DDragonChampion = {
  id: string;
  key: string;
  name: string;
  image: {
    full: string;
  };
};

type DDragonChampionResponse = {
  data: Record<string, DDragonChampion>;
};

type RiotMatchParticipantForHistory = {
  puuid: string;
  participantId: number;
  teamId: number;

  championId: number;
  championName: string;

  individualPosition: string;
  teamPosition: string;
  lane: string;
  role: string;

  win: boolean;

  kills: number;
  deaths: number;
  assists: number;

  totalMinionsKilled: number;
  neutralMinionsKilled: number;

  goldEarned: number;

  totalDamageDealtToChampions: number;
  totalDamageTaken: number;
  damageDealtToObjectives: number;
  damageDealtToTurrets: number;

  visionScore: number;
  wardsPlaced: number;
  wardsKilled: number;

  turretKills: number;
  inhibitorKills: number;
  dragonKills?: number;
  baronKills?: number;

  summoner1Id: number;
  summoner2Id: number;

  item0: number;
  item1: number;
  item2: number;
  item3: number;
  item4: number;
  item5: number;
  item6: number;

  perks?: unknown;
  challenges?: unknown;
};

type RiotMatchHistoryResponse = {
  metadata: {
    matchId: string;
    participants: string[];
  };
  info: {
    gameCreation: number;
    gameDuration: number;
    gameStartTimestamp?: number;
    gameEndTimestamp?: number;
    gameMode: string;
    gameType: string;
    gameVersion: string;
    mapId: number;
    queueId: number;
    participants: RiotMatchParticipantForHistory[];
  };
};

type RiotProfileForHistorySync = {
  id: string;
  lol_nick: string | null;
  lol_tagline: string | null;
  region: string | null;
  riot_puuid: string | null;
};

const MATCH_HISTORY_SYNC_COUNT = 20;

async function getDDragonChampionMap() {
  try {
    const versionsResponse = await fetch(
      "https://ddragon.leagueoflegends.com/api/versions.json",
      {
        next: {
          revalidate: 60 * 60 * 12,
        },
      },
    );

    if (!versionsResponse.ok) {
      return {
        version: null,
        championsById: new Map<number, DDragonChampion>(),
      };
    }

    const versions = (await versionsResponse.json()) as string[];
    const latestVersion = versions[0] ?? null;

    if (!latestVersion) {
      return {
        version: null,
        championsById: new Map<number, DDragonChampion>(),
      };
    }

    const championsResponse = await fetch(
      `https://ddragon.leagueoflegends.com/cdn/${latestVersion}/data/es_AR/champion.json`,
      {
        next: {
          revalidate: 60 * 60 * 12,
        },
      },
    );

    if (!championsResponse.ok) {
      return {
        version: latestVersion,
        championsById: new Map<number, DDragonChampion>(),
      };
    }

    const championsData =
      (await championsResponse.json()) as DDragonChampionResponse;

    const championsById = new Map<number, DDragonChampion>();

    Object.values(championsData.data).forEach((champion) => {
      championsById.set(Number(champion.key), champion);
    });

    return {
      version: latestVersion,
      championsById,
    };
  } catch {
    return {
      version: null,
      championsById: new Map<number, DDragonChampion>(),
    };
  }
}

function getIsoDateFromTimestamp(value: number | undefined) {
  if (!value) return null;

  return new Date(value).toISOString();
}

function getChampionAssets({
  championId,
  championName,
  ddragonVersion,
  championsById,
}: {
  championId: number;
  championName: string;
  ddragonVersion: string | null;
  championsById: Map<number, DDragonChampion>;
}) {
  const champion = championsById.get(championId);
  const championKey = champion?.id ?? championName;
  const resolvedChampionName = champion?.name ?? championName;

  const championImageUrl =
    ddragonVersion && champion?.image.full
      ? `https://ddragon.leagueoflegends.com/cdn/${ddragonVersion}/img/champion/${champion.image.full}`
      : null;

  const championSplashUrl =
    championKey && championKey !== "unknown"
      ? `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${championKey}_0.jpg`
      : null;

  return {
    championKey,
    championName: resolvedChampionName,
    championImageUrl,
    championSplashUrl,
  };
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;

  return "Error inesperado.";
}

export async function syncCurrentUserRiotMatchHistory(): Promise<RiotMatchHistoryResult> {
  const riotApiKey = process.env.RIOT_API_KEY;

  if (!riotApiKey) {
    return {
      success: false,
      message: "Falta configurar RIOT_API_KEY.",
    };
  }

  let admin;

  try {
    admin = createSupabaseAdminClient();
  } catch (error) {
    return {
      success: false,
      message: getErrorMessage(error),
    };
  }

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      message: "No se encontró una sesión activa.",
    };
  }

  const { data: profileData, error: profileError } = await supabase
    .from("profiles")
    .select(
      `
      id,
      lol_nick,
      lol_tagline,
      region,
      riot_puuid
    `,
    )
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return {
      success: false,
      message: "No se pudo leer el perfil del usuario.",
    };
  }

  const profile = profileData as RiotProfileForHistorySync | null;

  if (!profile) {
    return {
      success: false,
      message: "No se encontró el perfil del usuario.",
    };
  }

  const gameName = profile.lol_nick?.trim();
  const tagLine = profile.lol_tagline?.trim();
  const regionValue = FIXED_POWERPETES_REGION;

  if (!isRegionCode(regionValue)) {
    return {
      success: false,
      message: "La región cargada no está soportada para sincronización Riot.",
    };
  }

  const { regionalRoute, platformRoute } = routeByRegion[regionValue];

  let puuid = profile.riot_puuid;

  try {
    if (!puuid) {
      if (!gameName || !tagLine) {
        return {
          success: false,
          message: "Primero cargá tu Riot ID y tagline.",
        };
      }

      const account = await riotFetch<RiotAccountResponse>(
        `https://${regionalRoute}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(
          gameName,
        )}/${encodeURIComponent(tagLine)}`,
        riotApiKey,
        "account-v1",
      );

      puuid = account.puuid;

      await supabase
        .from("profiles")
        .update({
          riot_puuid: account.puuid,
          lol_nick: account.gameName,
          lol_tagline: account.tagLine,
          region: regionValue,
          riot_verified_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);
    }

    const { data: syncLog } = await admin
      .from("riot_profile_sync_logs")
      .insert({
        user_id: user.id,
        sync_type: "match_history",
        status: "running",
        message: "Sincronización de historial Riot iniciada.",
        matches_requested: MATCH_HISTORY_SYNC_COUNT,
      })
      .select("id")
      .maybeSingle();

    const matchIds = await riotFetch<string[]>(
      `https://${regionalRoute}.api.riotgames.com/lol/match/v5/matches/by-puuid/${encodeURIComponent(
        puuid,
      )}/ids?start=0&count=${MATCH_HISTORY_SYNC_COUNT}`,
      riotApiKey,
      "match-v5-ids",
    );

    const { version: ddragonVersion, championsById } =
      await getDDragonChampionMap();

    let matchesSynced = 0;

    for (const riotMatchId of matchIds) {
      const match = await riotFetch<RiotMatchHistoryResponse>(
        `https://${regionalRoute}.api.riotgames.com/lol/match/v5/matches/${encodeURIComponent(
          riotMatchId,
        )}`,
        riotApiKey,
        "match-v5-detail",
      );

      const participant = match.info.participants.find((currentParticipant) => {
        return currentParticipant.puuid === puuid;
      });

      if (!participant) continue;

      const { championKey, championName, championImageUrl, championSplashUrl } =
        getChampionAssets({
          championId: participant.championId,
          championName: participant.championName,
          ddragonVersion,
          championsById,
        });

      const totalMinionsKilled = participant.totalMinionsKilled ?? 0;
      const neutralMinionsKilled = participant.neutralMinionsKilled ?? 0;

      const { error: matchCacheUpsertError } = await admin
        .from("riot_match_cache")
        .upsert(
          {
            riot_match_id: match.metadata.matchId,
            regional_route: regionalRoute,
            platform_route: platformRoute,
            queue_id: match.info.queueId,
            map_id: match.info.mapId,
            game_mode: match.info.gameMode,
            game_type: match.info.gameType,
            game_version: match.info.gameVersion,
            game_creation: match.info.gameCreation,
            game_duration: match.info.gameDuration,
            game_start_at:
              getIsoDateFromTimestamp(match.info.gameStartTimestamp) ??
              getIsoDateFromTimestamp(match.info.gameCreation),
            game_end_at: getIsoDateFromTimestamp(match.info.gameEndTimestamp),
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "riot_match_id",
          },
        );

      if (matchCacheUpsertError) {
        throw new Error(
          `Error guardando riot_match_cache: ${matchCacheUpsertError.message}`,
        );
      }

      const { error: participantUpsertError } = await admin
        .from("riot_match_participants")
        .upsert(
          {
            riot_match_id: match.metadata.matchId,
            user_id: user.id,
            puuid,

            participant_id: participant.participantId,
            team_id: participant.teamId,

            champion_id: participant.championId,
            champion_key: championKey,
            champion_name: championName,
            champion_image_url: championImageUrl,
            champion_splash_url: championSplashUrl,

            individual_position: participant.individualPosition,
            team_position: participant.teamPosition,
            lane: participant.lane,
            role: participant.role,

            win: participant.win,

            kills: participant.kills ?? 0,
            deaths: participant.deaths ?? 0,
            assists: participant.assists ?? 0,

            total_minions_killed: totalMinionsKilled,
            neutral_minions_killed: neutralMinionsKilled,
            cs: totalMinionsKilled + neutralMinionsKilled,

            gold_earned: participant.goldEarned ?? 0,

            total_damage_dealt_to_champions:
              participant.totalDamageDealtToChampions ?? 0,
            total_damage_taken: participant.totalDamageTaken ?? 0,
            damage_dealt_to_objectives:
              participant.damageDealtToObjectives ?? 0,
            damage_dealt_to_turrets: participant.damageDealtToTurrets ?? 0,

            vision_score: participant.visionScore ?? 0,
            wards_placed: participant.wardsPlaced ?? 0,
            wards_killed: participant.wardsKilled ?? 0,

            turret_kills: participant.turretKills ?? 0,
            inhibitor_kills: participant.inhibitorKills ?? 0,
            dragon_kills: participant.dragonKills ?? 0,
            baron_kills: participant.baronKills ?? 0,

            summoner_spell_1_id: participant.summoner1Id,
            summoner_spell_2_id: participant.summoner2Id,

            item_0_id: participant.item0,
            item_1_id: participant.item1,
            item_2_id: participant.item2,
            item_3_id: participant.item3,
            item_4_id: participant.item4,
            item_5_id: participant.item5,
            item_6_id: participant.item6,

            perks: participant.perks ?? {},
            challenges: participant.challenges ?? {},

            synced_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "user_id,riot_match_id",
          },
        );

      if (participantUpsertError) {
        throw new Error(
          `Error guardando riot_match_participants: ${participantUpsertError.message}`,
        );
      }

      matchesSynced += 1;
    }

    const { error: refreshError } = await supabase.rpc(
      "refresh_player_riot_matchmaking_stats",
      {
        p_user_id: user.id,
      },
    );

    if (refreshError) {
      throw new Error(refreshError.message);
    }

    if (syncLog?.id) {
      await admin
        .from("riot_profile_sync_logs")
        .update({
          status: "success",
          message: "Historial Riot sincronizado correctamente.",
          matches_synced: matchesSynced,
          finished_at: new Date().toISOString(),
        })
        .eq("id", syncLog.id);
    }

    revalidatePath("/dashboard/profile");

    return {
      success: true,
      message: `Historial Riot sincronizado correctamente. Partidas procesadas: ${matchesSynced}.`,
      matchesSynced,
    };
  } catch (error) {
    await admin.from("riot_profile_sync_logs").insert({
      user_id: user.id,
      sync_type: "match_history",
      status: "error",
      message: getErrorMessage(error),
      matches_requested: MATCH_HISTORY_SYNC_COUNT,
      finished_at: new Date().toISOString(),
    });

    const errorMessage = getErrorMessage(error);

    console.error("syncCurrentUserRiotMatchHistory error:", errorMessage);

    return {
      success: false,
      message: `No se pudo sincronizar el historial Riot: ${errorMessage}`,
    };
  }
}
