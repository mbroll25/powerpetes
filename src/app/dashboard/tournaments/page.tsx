import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  Crown,
  History,
  Swords,
  Trophy,
  Users,
} from "lucide-react";

import DotField from "@/components/effects/dot-field";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type TournamentPlayerProfile = {
  lol_nick: string | null;
  lol_tagline: string | null;
};

type TournamentPlayerRow = {
  id: string;
  user_id: string;
  current_rating: number | string;
  matches_played: number;
  wins: number;
  losses: number;
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
  created_at: string;
  tournament_players: TournamentPlayerRow[];
  matches: TournamentMatchRow[];
};

function formatDate(value: string | null) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function getWinrate(wins: number, losses: number) {
  const total = wins + losses;

  if (total === 0) return 0;

  return Math.round((wins / total) * 100);
}

function getPlayerName(player: TournamentPlayerRow | null) {
  if (!player?.profiles?.lol_nick) return "Sin campeón";

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

export default async function TournamentHistoryPage() {
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

  const { data, error } = await supabase
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
      created_at,
      tournament_players (
        id,
        user_id,
        current_rating,
        matches_played,
        wins,
        losses,
        profiles (
          lol_nick,
          lol_tagline
        )
      ),
      matches (
        id,
        status
      )
    `,
    )
    .eq("status", "finished")
    .order("completed_at", { ascending: false, nullsFirst: false });

  const tournaments = ((data ?? []) as unknown as TournamentRow[]).map(
    (tournament) => {
      return {
        ...tournament,
        tournament_players: tournament.tournament_players ?? [],
        matches: tournament.matches ?? [],
      };
    },
  );

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
            <div className="mb-3 flex items-center gap-2">
              <Trophy className="size-4 text-[#f0ed7e]" />
              <p className="text-xs font-black uppercase tracking-[0.32em] text-[#f0ed7e]">
                Powers Petes
              </p>
            </div>

            <h1 className="text-5xl font-black uppercase tracking-[-0.04em] sm:text-6xl">
              Torneos
            </h1>

            <p className="mt-4 max-w-3xl text-sm leading-6 text-[#c9c9c4]">
              Historial de torneos finalizados, tabla final, campeón, partidas
              jugadas y rendimiento general.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/dashboard/history"
              className="inline-flex h-12 items-center justify-center rounded-[0.5rem] border border-[#f0ed7e]/25 bg-[#f0ed7e]/10 px-5 text-xs font-black uppercase tracking-[0.12em] text-[#f0ed7e] transition-colors hover:bg-[#f0ed7e]/15"
            >
              <History className="mr-2 size-4" />
              Historial de partidas
            </Link>

            <Link
              href="/dashboard"
              className="inline-flex h-12 items-center justify-center rounded-[0.5rem] border border-[#2a2929] bg-[#232121] px-5 text-xs font-black uppercase tracking-[0.12em] text-[#f5f5f3] transition-colors hover:bg-[#2b2b2b] hover:text-[#f0ed7e]"
            >
              <ArrowLeft className="mr-2 size-4" />
              Dashboard
            </Link>
          </div>
        </header>

        {error ? (
          <div className="rounded-[0.75rem] border border-red-500/25 bg-red-500/10 p-5 text-sm leading-6 text-red-200">
            No se pudo cargar el historial de torneos: {error.message}
          </div>
        ) : tournaments.length > 0 ? (
          <div className="grid gap-5">
            {tournaments.map((tournament) => {
              const standings = getSortedStandings(
                tournament.tournament_players,
              );

              const champion = standings[0] ?? null;
              const completedMatches = tournament.matches.filter((match) => {
                return match.status === "completed";
              }).length;

              return (
                <article
                  key={tournament.id}
                  className="relative overflow-hidden rounded-[0.85rem] border border-[#2a2929] bg-[#101010]/92 p-5 shadow-[0_1rem_3rem_rgba(0,0,0,0.22)] sm:p-6"
                >
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(240,237,126,0.09),transparent_30%)]" />
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-[#f0ed7e]/35 to-transparent" />

                  <div className="relative z-10 flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
                    <div>
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center rounded-full border border-[#75f0a0]/25 bg-[#75f0a0]/10 px-3 py-1 text-[0.65rem] font-black uppercase tracking-[0.13em] text-[#75f0a0]">
                          Finalizado
                        </span>

                        <span className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-[#8a8a85]">
                          <CalendarDays className="size-3.5" />
                          {formatDate(tournament.starts_at)} ·{" "}
                          {formatDate(tournament.completed_at)}
                        </span>
                      </div>

                      <h2 className="text-3xl font-black uppercase tracking-[-0.035em] text-[#f5f5f3]">
                        {tournament.name}
                      </h2>

                      <p className="mt-3 max-w-3xl text-sm leading-6 text-[#8a8a85]">
                        Campeón:{" "}
                        <span className="font-black text-[#f0ed7e]">
                          {getPlayerName(champion)}
                        </span>
                      </p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3 xl:min-w-132">
                      <MiniTournamentStat
                        icon={Users}
                        label="Jugadores"
                        value={String(tournament.tournament_players.length)}
                      />

                      <MiniTournamentStat
                        icon={Swords}
                        label="Partidas"
                        value={String(completedMatches)}
                      />

                      <MiniTournamentStat
                        icon={Crown}
                        label="Rating campeón"
                        value={
                          champion
                            ? String(
                                Math.round(Number(champion.current_rating)),
                              )
                            : "-"
                        }
                      />
                    </div>
                  </div>

                  <div className="relative z-10 mt-5 flex flex-col gap-3 border-t border-[#2a2929] pt-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap gap-2">
                      {standings.slice(0, 3).map((player, index) => (
                        <div
                          key={player.id}
                          className="rounded-[0.5rem] border border-[#2a2929] bg-[#151414]/80 px-3 py-2"
                        >
                          <p className="text-[0.62rem] font-black uppercase tracking-[0.12em] text-[#8a8a85]">
                            #{index + 1}
                          </p>
                          <p className="mt-1 text-sm font-black text-[#f5f5f3]">
                            {getPlayerName(player)}
                          </p>
                        </div>
                      ))}
                    </div>

                    <Link
                      href={`/dashboard/tournaments/${tournament.id}`}
                      className="inline-flex h-12 items-center justify-center rounded-[0.5rem] bg-[#f0ed7e] px-5 text-xs font-black uppercase tracking-[0.13em] text-[#151414] transition hover:bg-[#d8d46d]"
                    >
                      Ver tabla final
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="rounded-[0.85rem] border border-[#2a2929] bg-[#101010]/92 p-6">
            <div className="mb-4 grid size-11 place-items-center rounded-4xl border border-[#f0ed7e]/25 bg-[#f0ed7e]/10">
              <Trophy className="size-5 text-[#f0ed7e]" />
            </div>

            <p className="text-sm font-black uppercase tracking-[0.14em] text-[#f0ed7e]">
              Sin torneos finalizados
            </p>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#8a8a85]">
              Cuando finalices el primer torneo, aparecerá acá con su ranking
              final, campeón, jugadores y partidas jugadas.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}

function MiniTournamentStat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[0.5rem] border border-[#2a2929] bg-[#151414]/80 px-4 py-3">
      <div className="mb-2 flex items-center gap-2">
        <Icon className="size-4 text-[#f0ed7e]" />
        <p className="text-[0.62rem] font-black uppercase tracking-[0.12em] text-[#8a8a85]">
          {label}
        </p>
      </div>

      <p className="text-xl font-black text-[#f5f5f3]">{value}</p>
    </div>
  );
}
