import { NextResponse } from "next/server";

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

export const revalidate = 3600;

export async function GET() {
  try {
    const versionsResponse = await fetch(
      "https://ddragon.leagueoflegends.com/api/versions.json",
      {
        next: {
          revalidate: 60 * 60 * 24,
        },
      },
    );

    if (!versionsResponse.ok) {
      return NextResponse.json(
        {
          error: "No se pudo obtener la versión de Data Dragon.",
        },
        {
          status: 500,
        },
      );
    }

    const versions = (await versionsResponse.json()) as string[];
    const latestVersion = versions[0];

    if (!latestVersion) {
      return NextResponse.json(
        {
          error: "No se encontró una versión válida de Data Dragon.",
        },
        {
          status: 500,
        },
      );
    }

    const championsResponse = await fetch(
      `https://ddragon.leagueoflegends.com/cdn/${latestVersion}/data/es_AR/champion.json`,
      {
        next: {
          revalidate: 60 * 60 * 24,
        },
      },
    );

    if (!championsResponse.ok) {
      return NextResponse.json(
        {
          error: "No se pudo obtener la lista de campeones.",
        },
        {
          status: 500,
        },
      );
    }

    const championsJson =
      (await championsResponse.json()) as DDragonChampionResponse;

    const champions = Object.values(championsJson.data)
      .map((champion) => {
        return {
          championId: Number(champion.key),
          championKey: champion.id,
          championName: champion.name,
          championImageUrl: `https://ddragon.leagueoflegends.com/cdn/${latestVersion}/img/champion/${champion.image.full}`,
        };
      })
      .sort((a, b) => {
        return a.championName.localeCompare(b.championName, "es");
      });

    return NextResponse.json({
      version: latestVersion,
      champions,
    });
  } catch {
    return NextResponse.json(
      {
        error: "Error inesperado al cargar campeones.",
      },
      {
        status: 500,
      },
    );
  }
}