import { NextRequest, NextResponse } from "next/server";

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

export async function GET(request: NextRequest) {
  const riotApiKey = process.env.RIOT_API_KEY;

  if (!riotApiKey) {
    return NextResponse.json(
      { error: "Missing RIOT_API_KEY environment variable." },
      { status: 500 },
    );
  }

  const { searchParams } = new URL(request.url);

  const gameName = searchParams.get("gameName")?.trim();
  const tagLine = searchParams.get("tagLine")?.trim();
  const region = FIXED_POWERPETES_REGION;

  if (!gameName || !tagLine) {
    return NextResponse.json(
      { error: "Faltan gameName o tagLine." },
      { status: 400 },
    );
  }

  if (!isRegionCode(region)) {
    return NextResponse.json(
      { error: "PowerPetes funciona únicamente con región LAS." },
      { status: 400 },
    );
  }

  const { regionalRoute, platformRoute } = routeByRegion[region];

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

    let profileIconUrl: string | null = null;

    try {
      const versionsResponse = await fetch(
        "https://ddragon.leagueoflegends.com/api/versions.json",
        { cache: "no-store" },
      );

      if (versionsResponse.ok) {
        const versions = (await versionsResponse.json()) as string[];
        const latestVersion = versions[0];

        profileIconUrl = `https://ddragon.leagueoflegends.com/cdn/${latestVersion}/img/profileicon/${summoner.profileIconId}.png`;
      }
    } catch {
      profileIconUrl = null;
    }

    return NextResponse.json({
      account: {
        puuid: account.puuid,
        gameName: account.gameName,
        tagLine: account.tagLine,
      },
      summoner: {
        profileIconId: summoner.profileIconId,
        profileIconUrl,
        summonerLevel: summoner.summonerLevel,
      },
      rankedSolo: rankedSolo
        ? {
            tier: rankedSolo.tier,
            division: rankedSolo.rank,
            leaguePoints: rankedSolo.leaguePoints,
            wins: rankedSolo.wins,
            losses: rankedSolo.losses,
          }
        : null,
    });
  } catch (error) {
    let parsedError: unknown = null;

    if (error instanceof Error) {
      try {
        parsedError = JSON.parse(error.message);
      } catch {
        parsedError = error.message;
      }
    }

    return NextResponse.json(
      {
        error: "No se pudo consultar la cuenta en Riot.",
        details: parsedError,
      },
      { status: 500 },
    );
  }
}
