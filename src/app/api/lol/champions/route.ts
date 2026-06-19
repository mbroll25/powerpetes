import { NextResponse } from "next/server";

type DDragonChampion = {
  id: string;
  key: string;
  name: string;
  title: string;
  image: {
    full: string;
  };
};

type DDragonChampionResponse = {
  data: Record<string, DDragonChampion>;
};

export async function GET() {
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
      return NextResponse.json(
        { error: "No se pudo obtener la versión de Data Dragon." },
        { status: 500 },
      );
    }

    const versions = (await versionsResponse.json()) as string[];
    const latestVersion = versions[0];

    const championsResponse = await fetch(
      `https://ddragon.leagueoflegends.com/cdn/${latestVersion}/data/es_AR/champion.json`,
      {
        next: {
          revalidate: 60 * 60 * 12,
        },
      },
    );

    if (!championsResponse.ok) {
      return NextResponse.json(
        { error: "No se pudo obtener la lista de campeones." },
        { status: 500 },
      );
    }

    const championsData =
      (await championsResponse.json()) as DDragonChampionResponse;

    const champions = Object.values(championsData.data)
      .map((champion) => ({
        id: champion.id,
        key: champion.key,
        name: champion.name,
        title: champion.title,
        iconUrl: `https://ddragon.leagueoflegends.com/cdn/${latestVersion}/img/champion/${champion.image.full}`,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, "es-AR"));

    return NextResponse.json({
      version: latestVersion,
      champions,
    });
  } catch {
    return NextResponse.json(
      { error: "Error inesperado al cargar campeones." },
      { status: 500 },
    );
  }
}
