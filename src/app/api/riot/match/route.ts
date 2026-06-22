import { NextResponse } from "next/server";

type RiotMatchParticipant = {
  puuid: string;
  riotIdGameName?: string;
  riotIdTagline?: string;
  summonerName?: string;
  championId: number;
  championName: string;
  teamId: number;
  kills: number;
  deaths: number;
  assists: number;
  totalDamageDealtToChampions: number;
  goldEarned: number;
  totalMinionsKilled: number;
  neutralMinionsKilled: number;
  visionScore: number;
  win: boolean;
  individualPosition: string;
  teamPosition: string;
};

type RiotTeamBan = {
  championId: number;
  pickTurn: number;
};

type RiotMatchTeam = {
  teamId: number;
  win: boolean;
  bans?: RiotTeamBan[];
};

type RiotMatchResponse = {
  metadata: {
    matchId: string;
    participants: string[];
  };
  info: {
    gameId: number;
    gameCreation: number;
    gameDuration: number;
    gameMode: string;
    gameType: string;
    queueId: number;
    platformId: string;
    participants: RiotMatchParticipant[];
    teams: RiotMatchTeam[];
  };
};

type DDragonChampion = {
  key: string;
  id: string;
  name: string;
  image: {
    full: string;
  };
};

type DDragonChampionResponse = {
  data: Record<string, DDragonChampion>;
};

type ChampionMeta = {
  championId: number | null;
  championKey: string;
  championName: string;
  championImageUrl: string;
};

function normalizeMatchIdentifier(identifier: string) {
  const platformRoute = process.env.RIOT_PLATFORM_ROUTE ?? "la2";
  const platformPrefix = platformRoute.toUpperCase();

  const cleanedIdentifier = identifier
    .trim()
    .toUpperCase()
    .replaceAll("-", "_");

  if (!cleanedIdentifier) {
    return null;
  }

  if (/^\d+$/.test(cleanedIdentifier)) {
    return {
      riotGameId: cleanedIdentifier,
      riotMatchId: `${platformPrefix}_${cleanedIdentifier}`,
    };
  }

  const matchIdParts = cleanedIdentifier.match(/^([A-Z0-9]+)_(\d+)$/);

  if (matchIdParts) {
    return {
      riotGameId: matchIdParts[2] ?? null,
      riotMatchId: cleanedIdentifier,
    };
  }

  return {
    riotGameId: null,
    riotMatchId: cleanedIdentifier,
  };
}

function getParticipantDisplayName(participant: RiotMatchParticipant) {
  if (participant.riotIdGameName) {
    return `${participant.riotIdGameName}#${participant.riotIdTagline ?? "-"}`;
  }

  return participant.summonerName ?? "Jugador";
}

function getTeamNameFromRiotTeamId(teamId: number) {
  if (teamId === 100) return "blue";
  if (teamId === 200) return "red";

  return null;
}

async function getLatestDDragonVersion() {
  const response = await fetch(
    "https://ddragon.leagueoflegends.com/api/versions.json",
    {
      next: {
        revalidate: 60 * 60 * 24,
      },
    },
  );

  if (!response.ok) return null;

  const versions = (await response.json()) as string[];

  return versions[0] ?? null;
}

async function getChampionMetaById() {
  const latestVersion = await getLatestDDragonVersion();

  if (!latestVersion) {
    return {
      version: null,
      championsById: new Map<number, ChampionMeta>(),
    };
  }

  const response = await fetch(
    `https://ddragon.leagueoflegends.com/cdn/${latestVersion}/data/es_AR/champion.json`,
    {
      next: {
        revalidate: 60 * 60 * 24,
      },
    },
  );

  if (!response.ok) {
    return {
      version: latestVersion,
      championsById: new Map<number, ChampionMeta>(),
    };
  }

  const championsJson = (await response.json()) as DDragonChampionResponse;
  const championsById = new Map<number, ChampionMeta>();

  Object.values(championsJson.data).forEach((champion) => {
    const championId = Number(champion.key);

    championsById.set(championId, {
      championId,
      championKey: champion.id,
      championName: champion.name,
      championImageUrl: `https://ddragon.leagueoflegends.com/cdn/${latestVersion}/img/champion/${champion.image.full}`,
    });
  });

  return {
    version: latestVersion,
    championsById,
  };
}

function getChampionMeta(
  championId: number,
  fallbackChampionName: string,
  championsById: Map<number, ChampionMeta>,
): ChampionMeta {
  const champion = championsById.get(championId);

  if (champion) return champion;

  return {
    championId,
    championKey: fallbackChampionName,
    championName: fallbackChampionName,
    championImageUrl: "",
  };
}

function mapParticipant(
  participant: RiotMatchParticipant,
  championsById: Map<number, ChampionMeta>,
) {
  const champion = getChampionMeta(
    participant.championId,
    participant.championName,
    championsById,
  );

  const cs = participant.totalMinionsKilled + participant.neutralMinionsKilled;

  return {
    puuid: participant.puuid,

    name: getParticipantDisplayName(participant),
    riotIdGameName: participant.riotIdGameName ?? null,
    riotIdTagline: participant.riotIdTagline ?? null,
    summonerName: participant.summonerName ?? null,

    teamId: participant.teamId,
    team: getTeamNameFromRiotTeamId(participant.teamId),

    championId: champion.championId,
    championKey: champion.championKey,
    championName: champion.championName,
    championImageUrl: champion.championImageUrl,

    kills: participant.kills,
    deaths: participant.deaths,
    assists: participant.assists,
    damage: participant.totalDamageDealtToChampions,
    gold: participant.goldEarned,
    cs,
    visionScore: participant.visionScore,

    position:
      participant.teamPosition || participant.individualPosition || "UNKNOWN",

    win: participant.win,
  };
}

function mapTeamBans(
  team: RiotMatchTeam | undefined,
  championsById: Map<number, ChampionMeta>,
) {
  return (team?.bans ?? [])
    .filter((ban) => ban.championId > 0)
    .slice()
    .sort((a, b) => a.pickTurn - b.pickTurn)
    .map((ban) => {
      const champion = getChampionMeta(
        ban.championId,
        `Champion ${ban.championId}`,
        championsById,
      );

      return {
        championId: champion.championId,
        championKey: champion.championKey,
        championName: champion.championName,
        championImageUrl: champion.championImageUrl,
        banOrder: ban.pickTurn,
      };
    });
}

export async function POST(request: Request) {
  const riotApiKey = process.env.RIOT_API_KEY;
  const regionalRoute = process.env.RIOT_REGIONAL_ROUTE ?? "americas";

  if (!riotApiKey) {
    return NextResponse.json(
      {
        error: "Missing RIOT_API_KEY environment variable.",
      },
      { status: 500 },
    );
  }

  const body = (await request.json().catch(() => null)) as {
    identifier?: string;
  } | null;

  const normalized = normalizeMatchIdentifier(body?.identifier ?? "");

  if (!normalized?.riotMatchId) {
    return NextResponse.json(
      {
        error: "Ingresá un ID del juego o matchId válido.",
      },
      { status: 400 },
    );
  }

  const riotResponse = await fetch(
    `https://${regionalRoute}.api.riotgames.com/lol/match/v5/matches/${normalized.riotMatchId}`,
    {
      headers: {
        "X-Riot-Token": riotApiKey,
      },
      cache: "no-store",
    },
  );

  if (riotResponse.status === 404) {
    return NextResponse.json(
      {
        error:
          "Riot no encontró esa partida en Match-V5. Si es una partida personalizada, puede existir en el cliente de League pero no estar disponible por la API pública. Cargá captura o evidencia manual.",
        riotGameId: normalized.riotGameId,
        riotMatchId: normalized.riotMatchId,
      },
      { status: 404 },
    );
  }

  if (riotResponse.status === 401) {
    return NextResponse.json(
      {
        error:
          "Riot no autorizó la consulta. Revisá si la RIOT_API_KEY está vencida, mal copiada o si falta reiniciar el servidor.",
      },
      { status: 401 },
    );
  }

  if (riotResponse.status === 403) {
    return NextResponse.json(
      {
        error:
          "Riot rechazó la API key. Revisá si la key está vencida o mal configurada.",
      },
      { status: 403 },
    );
  }

  if (riotResponse.status === 429) {
    return NextResponse.json(
      {
        error:
          "Riot limitó temporalmente las consultas. Probá de nuevo en unos minutos.",
      },
      { status: 429 },
    );
  }

  if (!riotResponse.ok) {
    return NextResponse.json(
      {
        error: "No se pudo consultar la partida en Riot.",
        status: riotResponse.status,
      },
      { status: riotResponse.status },
    );
  }

  const match = (await riotResponse.json()) as RiotMatchResponse;
  const { version, championsById } = await getChampionMetaById();

  const winningTeam = match.info.teams.find((team) => team.win);
  const blueTeamData = match.info.teams.find((team) => team.teamId === 100);
  const redTeamData = match.info.teams.find((team) => team.teamId === 200);

  const blueParticipants = match.info.participants.filter((participant) => {
    return participant.teamId === 100;
  });

  const redParticipants = match.info.participants.filter((participant) => {
    return participant.teamId === 200;
  });

  return NextResponse.json({
    riotGameId: String(match.info.gameId),
    riotMatchId: match.metadata.matchId,
    platformId: match.info.platformId,
    ddragonVersion: version,

    gameMode: match.info.gameMode,
    gameType: match.info.gameType,
    queueId: match.info.queueId,
    gameDuration: match.info.gameDuration,
    gameCreation: match.info.gameCreation,

    winnerTeamId: winningTeam?.teamId ?? null,
    suggestedWinner:
      winningTeam?.teamId === 100
        ? "blue"
        : winningTeam?.teamId === 200
          ? "red"
          : null,

    participants: match.info.participants.map((participant) => {
      return mapParticipant(participant, championsById);
    }),

    bans: {
      blue: mapTeamBans(blueTeamData, championsById),
      red: mapTeamBans(redTeamData, championsById),
    },

    teams: {
      blue: blueParticipants.map((participant) => {
        return mapParticipant(participant, championsById);
      }),
      red: redParticipants.map((participant) => {
        return mapParticipant(participant, championsById);
      }),
    },
  });
}
