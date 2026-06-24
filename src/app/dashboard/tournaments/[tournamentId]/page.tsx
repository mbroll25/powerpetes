import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  Crown,
  History,
  Medal,
  Swords,
  Trophy,
  Users,
} from "lucide-react";

import DotField from "@/components/effects/dot-field";
import { FullMatchHistoryPanel } from "@/components/balance/full-match-history-panel";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type TournamentPlayerProfile = {
  first_name: string | null;
  last_name: string | null;
  lol_nick: string | null;
  lol_tagline: string | null;
  current_tier: string | null;
  current_division: string | null;
  primary_role: string | null;
};

type TournamentPlayerRow = {
  id: string;
  user_id: string;
  initial_rating: number | string;
  current_rating: number | string;
  matches_played: number;
  wins: number;
  losses: number;
  upset_wins: number;
  upset_losses: number;
  profiles: TournamentPlayerProfile | null;
};

type TournamentMatchRow = {
  id: string;
  status: string;
};

type TournamentRow = {
  id: string;
  name: string;
  status: string;
  duration_days: number;
  starts_at: string;
  ends_at: string;
  completed_at: string | null;
  completion_notes: string | null;
  tournament_players: TournamentPlayerRow[];
  matches: TournamentMatchRow[];
};

type TournamentDetailPageProps = {
  params: Promise<{
    tournamentId: string;
  }>;
};

function formatDate(value: string | null) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function formatRole(role: string | null) {
  switch (role) {
    case "TOP":
      return "Top";
    case "JUNGLE":
      return "Jungla";
    case "MID":
      return "Mid";
    case "ADC":
      return "ADC";
    case "SUPPORT":
      return "Soporte";
    default:
      return "-";
  }
}

function formatTier(tier: string | null, division: string | null) {
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

function getWinrate(wins: number, losses: number) {
  const total = wins + losses;

  if (total === 0) return 0;

  return Math.round((wins / total) * 100);
}

function getPlayerName(player: TournamentPlayerRow | null) {
  if (!player?.profiles?.lol_nick) return "Jugador";

  return `${player.profiles.lol_nick}#${player.profiles.lol_tagline ?? "-"}`;
}

function getSortedStandings(players: TournamentPlayerRow[]) {
  return players.slice().sort((a, b) => {
    const aWinrate = getWinrate(a.wins, a.losses);
    const bWinrate = getWinrate(b.wins, b.losses);

    return (
      Number(b.current_rating) - Number(a.current_rating) ||
      b.wins - a.wins ||
      bWinrate - aWinrate ||
      b.matches_played - a.matches_played
    );
  });
}

export default async function TournamentDetailPage({
  params,
}: TournamentDetailPageProps) {
  const { tournamentId } = await params;

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("profile_completed")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.profile_completed) {
    redirect("/onboarding");
  }

  const { data: roleData } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  const isAdmin = roleData?.role === "owner" || roleData?.role === "admin";

  const { data } = await supabase
    .from("tournaments")
    .select(
      `
      id,
      name,
      status,
      duration_days,
      starts_at,
      ends_at,
      completed_at,
      completion_notes,
      tournament_players (
        id,
        user_id,
        initial_rating,
        current_rating,
        matches_played,
        wins,
        losses,
        upset_wins,
        upset_losses,
        profiles (
          first_name,
          last_name,
          lol_nick,
          lol_tagline,
          current_tier,
          current_division,
          primary_role
        )
      ),
      matches (
        id,
        status
      )
    `,
    )
    .eq("id", tournamentId)
    .maybeSingle();

  if (!data) {
    notFound();
  }

  const tournament = {
    ...(data as unknown as TournamentRow),
    tournament_players:
      (data as unknown as TournamentRow).tournament_players ?? [],
    matches: (data as unknown as TournamentRow).matches ?? [],
  };

  const standings = getSortedStandings(tournament.tournament_players);
  const champion = standings[0] ?? null;
  const completedMatches = tournament.matches.filter((match) => {
    return match.status === "completed";
  }).length;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#151414] px-4 py-8 text-[#f5f5f3] sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(240,237,126,0.08),transparent_28%),radial-gradient(circle_at_80%_20%,rgba(117,240,160,0.055),transparent_24%)]" />

      <DotField
        className="pointer-events-none absolute inset-0 z-0 opacity-25"
        dotRadius={1.25}
        dotSpacing={18}
        cursorRadius={360}
        cursorForce={0.08}
        bulgeOnly
        bulgeStrength={42}
        glowRadius={110}
        sparkle={false}
        waveAmplitude={0}
        gradientFrom="rgba(245,245,243,0.12)"
        gradientTo="rgba(240,237,126,0.10)"
        glowColor="rgba(21,20,20,0.55)"
      />

      <section className="relative z-10 mx-auto w-full max-w-352">
        <header className="mb-8 flex flex-col gap-5 border-b border-[#2a2929] pb-8 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Trophy className="size-4 text-[#f0ed7e]" />
              <p className="text-xs font-black uppercase tracking-[0.32em] text-[#f0ed7e]">
                Torneo finalizado
              </p>
            </div>

            <h1 className="text-5xl font-black uppercase tracking-[-0.04em] sm:text-6xl">
              {tournament.name}
            </h1>

            <p className="mt-4 max-w-3xl text-sm leading-6 text-[#c9c9c4]">
              Ranking final, puntos, partidas jugadas y resultados completos del
              torneo.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/dashboard/tournaments"
              className="inline-flex h-12 items-center justify-center rounded-[0.5rem] border border-[#f0ed7e]/25 bg-[#f0ed7e]/10 px-5 text-xs font-black uppercase tracking-[0.12em] text-[#f0ed7e] transition-colors hover:bg-[#f0ed7e]/15"
            >
              <History className="mr-2 size-4" />
              Torneos
            </Link>

            <Link
              href="/dashboard/history"
              className="inline-flex h-12 items-center justify-center rounded-[0.5rem] border border-[#2a2929] bg-[#232121] px-5 text-xs font-black uppercase tracking-[0.12em] text-[#f5f5f3] transition-colors hover:bg-[#2b2b2b] hover:text-[#f0ed7e]"
            >
              <ArrowLeft className="mr-2 size-4" />
              Partidas
            </Link>
          </div>
        </header>

        <section className="mb-8 grid gap-4 lg:grid-cols-4">
          <SummaryCard
            icon={Crown}
            label="Campeón"
            value={getPlayerName(champion)}
            description={
              champion
                ? `${Math.round(Number(champion.current_rating))} puntos`
                : "Sin jugadores"
            }
          />

          <SummaryCard
            icon={Users}
            label="Jugadores"
            value={String(tournament.tournament_players.length)}
            description="Participantes del torneo"
          />

          <SummaryCard
            icon={Swords}
            label="Partidas"
            value={String(completedMatches)}
            description="Resultados confirmados"
          />

          <SummaryCard
            icon={CalendarDays}
            label="Finalizado"
            value={formatDate(tournament.completed_at)}
            description={`Inicio: ${formatDate(tournament.starts_at)}`}
          />
        </section>

        <section className="mb-8 overflow-hidden rounded-[0.85rem] border border-[#2a2929] bg-[#101010]/92 shadow-[0_1rem_3rem_rgba(0,0,0,0.22)]">
          <div className="border-b border-[#2a2929] p-5 sm:p-6">
            <div className="mb-2 flex items-center gap-2">
              <Medal className="size-4 text-[#f0ed7e]" />
              <p className="text-xs font-black uppercase tracking-[0.14em] text-[#f0ed7e]">
                Tabla final
              </p>
            </div>

            <h2 className="text-3xl font-black uppercase tracking-[-0.035em] text-[#f5f5f3]">
              Ranking del torneo
            </h2>

            {tournament.completion_notes ? (
              <p className="mt-3 max-w-3xl text-sm leading-6 text-[#8a8a85]">
                {tournament.completion_notes}
              </p>
            ) : null}
          </div>

          {standings.length > 0 ? (
            <div className="overflow-x-auto p-5 sm:p-6">
              <table className="w-full min-w-208 border-separate border-spacing-y-2">
                <thead>
                  <tr className="text-left text-[0.7rem] font-black uppercase tracking-[0.14em] text-[#8a8a85]">
                    <th className="px-3 py-2">#</th>
                    <th className="px-3 py-2">Jugador</th>
                    <th className="px-3 py-2">Rango</th>
                    <th className="px-3 py-2">Rol</th>
                    <th className="px-3 py-2 text-center">PJ</th>
                    <th className="px-3 py-2 text-center">G</th>
                    <th className="px-3 py-2 text-center">P</th>
                    <th className="px-3 py-2 text-center">WR</th>
                    <th className="px-3 py-2 text-right">Rating inicial</th>
                    <th className="px-3 py-2 text-right">Rating final</th>
                  </tr>
                </thead>

                <tbody>
                  {standings.map((player, index) => {
                    const winrate = getWinrate(player.wins, player.losses);
                    const profile = player.profiles;

                    return (
                      <tr key={player.id} className="bg-[#151414]">
                        <td className="rounded-l-[0.5rem] px-3 py-4 text-sm font-black text-[#f0ed7e]">
                          {index + 1}
                        </td>

                        <td className="px-3 py-4">
                          <p className="text-sm font-black text-[#f5f5f3]">
                            {getPlayerName(player)}
                          </p>
                          <p className="mt-1 text-xs text-[#8a8a85]">
                            {profile?.first_name ?? ""}{" "}
                            {profile?.last_name ?? ""}
                          </p>
                        </td>

                        <td className="px-3 py-4 text-sm text-[#c9c9c4]">
                          {formatTier(
                            profile?.current_tier ?? null,
                            profile?.current_division ?? null,
                          )}
                        </td>

                        <td className="px-3 py-4 text-sm text-[#c9c9c4]">
                          {formatRole(profile?.primary_role ?? null)}
                        </td>

                        <td className="px-3 py-4 text-center text-sm font-black">
                          {player.matches_played}
                        </td>

                        <td className="px-3 py-4 text-center text-sm font-black text-[#75f0a0]">
                          {player.wins}
                        </td>

                        <td className="px-3 py-4 text-center text-sm font-black text-red-300">
                          {player.losses}
                        </td>

                        <td className="px-3 py-4 text-center text-sm font-black">
                          {winrate}%
                        </td>

                        <td className="px-3 py-4 text-right text-sm font-black text-[#c9c9c4]">
                          {Math.round(Number(player.initial_rating))}
                        </td>

                        <td className="rounded-r-[0.5rem] px-3 py-4 text-right text-sm font-black text-[#f0ed7e]">
                          {Math.round(Number(player.current_rating))}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-6">
              <p className="text-sm leading-6 text-[#8a8a85]">
                Este torneo no tiene jugadores registrados.
              </p>
            </div>
          )}
        </section>

        <FullMatchHistoryPanel
          activeTournamentId={tournament.id}
          isAdmin={isAdmin}
          officialStandings={standings}
        />
      </section>
    </main>
  );
}

function SummaryCard({
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
    <article className="relative overflow-hidden rounded-[0.75rem] border border-[#2a2929] bg-[#101010]/90 p-5 shadow-[0_1rem_3rem_rgba(0,0,0,0.18)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-[#f0ed7e]/25 to-transparent" />

      <div className="mb-4 flex items-center gap-2">
        <Icon className="size-4 text-[#f0ed7e]" />
        <p className="text-xs font-black uppercase tracking-[0.14em] text-[#8a8a85]">
          {label}
        </p>
      </div>

      <h2 className="truncate text-2xl font-black text-[#f5f5f3]">{value}</h2>

      <p className="mt-2 text-sm leading-6 text-[#8a8a85]">{description}</p>
    </article>
  );
}
