import { NextResponse } from "next/server";

type RiotMatchParticipant = {
  puuid: string;
  riotIdGameName?: string;
  riotIdTagline?: string;
  summonerName?: string;
  championName: string;
  teamId: number;
  kills: number;
  deaths: number;
  assists: number;
  totalDamageDealtToChampions: number;
  goldEarned: number;
  totalMinionsKilled: number;
  neutralMinionsKilled: number;
  win: boolean;
  individualPosition: string;
  teamPosition: string;
};

type RiotMatchTeam = {
  teamId: number;
  win: boolean;
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

function getParticipantName(participant: RiotMatchParticipant) {
  if (participant.riotIdGameName) {
    return `${participant.riotIdGameName}#${participant.riotIdTagline ?? "-"}`;
  }

  return participant.summonerName ?? "Jugador";
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
          "Riot no encontró esa partida. Verificá el ID o cargá evidencia manual.",
        riotGameId: normalized.riotGameId,
        riotMatchId: normalized.riotMatchId,
      },
      { status: 404 },
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

  const winningTeam = match.info.teams.find((team) => team.win);
  const blueTeam = match.info.participants.filter((participant) => {
    return participant.teamId === 100;
  });
  const redTeam = match.info.participants.filter((participant) => {
    return participant.teamId === 200;
  });

  return NextResponse.json({
    riotGameId: String(match.info.gameId),
    riotMatchId: match.metadata.matchId,
    platformId: match.info.platformId,
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
    teams: {
      blue: blueTeam.map((participant) => ({
        puuid: participant.puuid,
        name: getParticipantName(participant),
        championName: participant.championName,
        kills: participant.kills,
        deaths: participant.deaths,
        assists: participant.assists,
        damage: participant.totalDamageDealtToChampions,
        gold: participant.goldEarned,
        cs: participant.totalMinionsKilled + participant.neutralMinionsKilled,
        position:
          participant.teamPosition ||
          participant.individualPosition ||
          "UNKNOWN",
        win: participant.win,
      })),
      red: redTeam.map((participant) => ({
        puuid: participant.puuid,
        name: getParticipantName(participant),
        championName: participant.championName,
        kills: participant.kills,
        deaths: participant.deaths,
        assists: participant.assists,
        damage: participant.totalDamageDealtToChampions,
        gold: participant.goldEarned,
        cs: participant.totalMinionsKilled + participant.neutralMinionsKilled,
        position:
          participant.teamPosition ||
          participant.individualPosition ||
          "UNKNOWN",
        win: participant.win,
      })),
    },
  });
}
