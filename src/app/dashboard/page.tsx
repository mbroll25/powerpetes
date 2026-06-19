import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Activity,
  BarChart3,
  CalendarDays,
  History,
  ShieldCheck,
  Trophy,
  Users,
} from "lucide-react";

import { LogoutButton } from "@/components/auth/logout-button";
import { CreateTournamentForm } from "@/components/dashboard/create-tournament-form";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import DotField from "@/components/effects/dot-field";
import { DashboardMotion } from "@/components/dashboard/dashboard-motion";
import { MatchGeneratorPanel } from "@/components/balance/match-generator-panel";
import { PendingMatchesPanel } from "@/components/balance/pending-matches-panel";
import { CompletedMatchesPanel } from "@/components/balance/completed-matches-panel";
import { DashboardResponsiveShell } from "@/components/dashboard/dashboard-section-nav";

type ProfileRow = {
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
  initial_rating: number;
  current_rating: number;
  matches_played: number;
  wins: number;
  losses: number;
  upset_wins: number;
  upset_losses: number;
  profiles: ProfileRow | null;
};

type TournamentRow = {
  id: string;
  name: string;
  duration_days: number;
  starts_at: string;
  ends_at: string;
  status: string;
  tournament_players: TournamentPlayerRow[];
};

function getWinrate(wins: number, losses: number) {
  const total = wins + losses;
  if (total === 0) return 0;

  return Math.round((wins / total) * 100);
}

function getDaysRemaining(endsAt: string) {
  const now = new Date();
  const end = new Date(endsAt);
  const difference = end.getTime() - now.getTime();

  if (difference <= 0) return 0;

  return Math.ceil(difference / (1000 * 60 * 60 * 24));
}

function formatDate(value: string) {
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

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      `
    profile_completed,
    lol_nick,
    lol_tagline,
    current_tier,
    current_division,
    current_lp,
    primary_role,
    riot_profile_icon_id,
    riot_summoner_level,
    solo_queue_wins,
    solo_queue_losses,
    riot_verified_at
  `,
    )
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.profile_completed) {
    redirect("/onboarding");
  }

  const { data: isAdminResult } = await supabase.rpc("is_app_admin");

  const isAdmin = isAdminResult === true;

  const { data: tournamentData } = await supabase
    .from("tournaments")
    .select(
      `
      id,
      name,
      duration_days,
      starts_at,
      ends_at,
      status,
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
      )
    `,
    )
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const activeTournament = tournamentData as TournamentRow | null;

  const standings =
    activeTournament?.tournament_players?.slice().sort((a, b) => {
      const aWinrate = getWinrate(a.wins, a.losses);
      const bWinrate = getWinrate(b.wins, b.losses);

      return (
        b.wins - a.wins ||
        bWinrate - aWinrate ||
        Number(b.current_rating) - Number(a.current_rating)
      );
    }) ?? [];

  const daysRemaining = activeTournament
    ? getDaysRemaining(activeTournament.ends_at)
    : 0;

  const soloQueueWinrate =
    profile?.solo_queue_wins != null && profile?.solo_queue_losses != null
      ? getWinrate(profile.solo_queue_wins, profile.solo_queue_losses)
      : null;

  const riotVerified = Boolean(profile?.riot_verified_at);

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

      <DashboardMotion>
        <DashboardResponsiveShell>
          <section id="dashboard-overview" className="w-full scroll-mt-8">
            <header
              data-dashboard-anim="header"
              className="flex flex-col gap-6 border-b border-[#2a2929] pb-8 lg:flex-row lg:items-center lg:justify-between"
            >
              <div>
                <p className="text-xs font-black uppercase tracking-[0.32em] text-[#f0ed7e]">
                  RiftBalance Pro
                </p>

                <h1 className="mt-4 text-5xl font-black uppercase tracking-[-0.04em] sm:text-6xl">
                  Dashboard
                </h1>

                <p className="mt-4 max-w-3xl text-sm leading-6 text-[#c9c9c4]">
                  Gestioná el torneo activo, revisá la tabla de posiciones y
                  prepará las próximas partidas personalizadas balanceadas.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/dashboard/history"
                  className="inline-flex h-12 items-center justify-center rounded-[0.5rem] border border-[#f0ed7e]/25 bg-[#f0ed7e]/10 px-5 text-xs font-black uppercase tracking-[0.12em] text-[#f0ed7e] transition-colors hover:bg-[#f0ed7e]/15"
                >
                  <History className="mr-2 size-4" />
                  Ver historial
                </Link>

                <Link
                  href="/"
                  className="inline-flex h-12 items-center justify-center rounded-[0.5rem] border border-[#2a2929] bg-[#232121] px-5 text-xs font-black uppercase tracking-[0.12em] text-[#f5f5f3] transition-colors hover:bg-[#2b2b2b] hover:text-[#f0ed7e]"
                >
                  Volver al inicio
                </Link>

                <LogoutButton />
              </div>
            </header>

            <section className="mt-8 grid gap-4 lg:grid-cols-4">
              <DashboardMetric
                icon={Trophy}
                label="Torneo activo"
                value={activeTournament ? activeTournament.name : "Sin torneo"}
                description={
                  activeTournament
                    ? `${daysRemaining} días restantes`
                    : "Creá el primer torneo"
                }
              />

              <DashboardMetric
                icon={Users}
                label="Jugadores"
                value={activeTournament ? String(standings.length) : "0"}
                description="Perfiles incluidos automáticamente"
              />

              <DashboardMetric
                icon={BarChart3}
                label="Sistema"
                value="Rating global"
                description="El aprendizaje no se reinicia"
              />

              <DashboardMetric
                icon={ShieldCheck}
                label="Tu rol"
                value={isAdmin ? "Admin / Jugador" : "Jugador"}
                description={
                  isAdmin
                    ? "Podés crear torneos, jugar y cargar resultados"
                    : "Podés ver torneos y posiciones"
                }
              />
            </section>

            <section
              id="riot-profile"
              data-dashboard-anim="panel"
              className="mt-8 scroll-mt-8"
            >
              <div className="relative overflow-hidden rounded-[0.75rem] border border-[#2a2929] bg-[#101010]/92 p-5 shadow-[0_1rem_3rem_rgba(0,0,0,0.22)]">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(240,237,126,0.10),transparent_28%)]" />
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-[#75f0a0]/30 to-transparent" />

                <div className="relative z-10 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="mb-2 flex items-center gap-2">
                      <ShieldCheck className="size-4 text-[#75f0a0]" />
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-[#75f0a0]">
                        {riotVerified
                          ? "Cuenta Riot conectada"
                          : "Cuenta Riot pendiente"}
                      </p>
                    </div>

                    <h2 className="text-2xl font-black text-[#f5f5f3]">
                      {profile?.lol_nick ?? "Jugador"}
                      <span className="text-[#8a8a85]">
                        #{profile?.lol_tagline ?? "-"}
                      </span>
                    </h2>

                    <p className="mt-2 max-w-2xl text-sm leading-6 text-[#8a8a85]">
                      El sistema usará tus datos de Solo/Duo, perfil competitivo
                      y rendimiento histórico para calcular balances más justos
                      en cada torneo.
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-4">
                    <MiniStat
                      label="Nivel"
                      value={
                        profile?.riot_summoner_level
                          ? String(profile.riot_summoner_level)
                          : "-"
                      }
                    />

                    <MiniStat
                      label="Solo/Duo"
                      value={formatTier(
                        profile?.current_tier ?? null,
                        profile?.current_division ?? null,
                      )}
                    />

                    <MiniStat
                      label="LP"
                      value={
                        profile?.current_lp != null
                          ? String(profile.current_lp)
                          : "-"
                      }
                    />

                    <MiniStat
                      label="WR Solo/Duo"
                      value={
                        soloQueueWinrate != null ? `${soloQueueWinrate}%` : "-"
                      }
                    />
                  </div>
                </div>
              </div>
            </section>

            <div id="match-generator" className="scroll-mt-8">
              <MatchGeneratorPanel
                activeTournamentId={activeTournament?.id ?? null}
              />
            </div>

            <div id="pending-matches" className="scroll-mt-8">
              <PendingMatchesPanel
                activeTournamentId={activeTournament?.id ?? null}
                isAdmin={isAdmin}
              />
            </div>

            <div id="completed-matches" className="scroll-mt-8">
              <CompletedMatchesPanel
                activeTournamentId={activeTournament?.id ?? null}
              />
            </div>

            <section
              id="tournament-standings"
              className="mt-8 grid scroll-mt-8 gap-6 xl:grid-cols-[1fr_24rem]"
            >
              <div
                data-dashboard-anim="panel"
                className="relative overflow-hidden rounded-[0.75rem] border border-[#2a2929] bg-[#101010]/92 p-5 shadow-[0_1rem_3rem_rgba(0,0,0,0.22)] sm:p-6"
              >
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-[#f0ed7e]/30 to-transparent" />
                <div className="flex flex-col gap-4 border-b border-[#2a2929] pb-5 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="mb-2 flex items-center gap-2">
                      <Activity className="size-4 text-[#f0ed7e]" />
                      <p className="text-xs font-black uppercase tracking-[0.14em] text-[#f0ed7e]">
                        Tabla del torneo
                      </p>
                    </div>

                    <h2 className="text-2xl font-black text-[#f5f5f3]">
                      {activeTournament
                        ? activeTournament.name
                        : "Todavía no hay torneo activo"}
                    </h2>

                    {activeTournament ? (
                      <p className="mt-2 text-sm leading-6 text-[#8a8a85]">
                        Inicio: {formatDate(activeTournament.starts_at)} · Fin:{" "}
                        {formatDate(activeTournament.ends_at)} · Duración:{" "}
                        {activeTournament.duration_days} días
                      </p>
                    ) : (
                      <p className="mt-2 text-sm leading-6 text-[#8a8a85]">
                        Cuando crees un torneo, todos los perfiles completos se
                        agregarán automáticamente.
                      </p>
                    )}
                  </div>
                </div>

                {standings.length > 0 ? (
                  <div className="mt-5 overflow-x-auto">
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
                          <th className="px-3 py-2 text-right">Rating</th>
                        </tr>
                      </thead>

                      <tbody>
                        {standings.map((player, index) => {
                          const profile = player.profiles;
                          const winrate = getWinrate(
                            player.wins,
                            player.losses,
                          );

                          return (
                            <tr key={player.id} className="bg-[#151414]">
                              <td className="rounded-l-[0.5rem] px-3 py-4 text-sm font-black text-[#f0ed7e]">
                                {index + 1}
                              </td>

                              <td className="px-3 py-4">
                                <p className="text-sm font-black text-[#f5f5f3]">
                                  {profile?.lol_nick ?? "Jugador"}
                                  <span className="text-[#8a8a85]">
                                    #{profile?.lol_tagline ?? "-"}
                                  </span>
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
                  <div className="mt-5 rounded-[0.75rem] border border-[#2a2929] bg-[#151414] p-6">
                    <p className="text-sm leading-6 text-[#8a8a85]">
                      Todavía no hay jugadores en una tabla activa. Creá un
                      torneo para incluir automáticamente a todos los perfiles
                      completos.
                    </p>
                  </div>
                )}
              </div>

              <aside id="dashboard-admin" className="scroll-mt-8 space-y-6">
                {isAdmin ? (
                  <div data-dashboard-anim="panel">
                    <CreateTournamentForm
                      disabled={Boolean(activeTournament)}
                    />
                  </div>
                ) : (
                  <div
                    data-dashboard-anim="panel"
                    className="rounded-[0.75rem] border border-[#2a2929] bg-[#101010]/90 p-5 shadow-[0_1rem_3rem_rgba(0,0,0,0.18)]"
                  >
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-[#f0ed7e]">
                      Acceso jugador
                    </p>
                    <h3 className="mt-3 text-2xl font-black">
                      Esperando torneo
                    </h3>
                    <p className="mt-3 text-sm leading-6 text-[#8a8a85]">
                      Un admin puede crear el torneo activo y cargar resultados.
                    </p>
                  </div>
                )}

                <div
                  data-dashboard-anim="panel"
                  className="rounded-[0.75rem] border border-[#2a2929] bg-[#101010]/90 p-5 shadow-[0_1rem_3rem_rgba(0,0,0,0.18)]"
                >
                  <div className="mb-3 flex items-center gap-2">
                    <History className="size-4 text-[#f0ed7e]" />
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-[#f0ed7e]">
                      Historial
                    </p>
                  </div>

                  <h3 className="text-2xl font-black">Próxima etapa</h3>

                  <p className="mt-3 text-sm leading-6 text-[#8a8a85]">
                    Después vamos a mostrar torneos finalizados, ganadores y
                    estadísticas históricas del grupo.
                  </p>
                </div>

                <div
                  data-dashboard-anim="panel"
                  className="rounded-[0.75rem] border border-[#2a2929] bg-[#101010]/90 p-5 shadow-[0_1rem_3rem_rgba(0,0,0,0.18)]"
                >
                  <div className="mb-3 flex items-center gap-2">
                    <CalendarDays className="size-4 text-[#f0ed7e]" />
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-[#f0ed7e]">
                      Balance
                    </p>
                  </div>

                  <h3 className="text-2xl font-black">Motor v1</h3>

                  <p className="mt-3 text-sm leading-6 text-[#8a8a85]">
                    El siguiente módulo va a permitir seleccionar 10 jugadores y
                    generar equipos según rating, roles, elo y rendimiento
                    histórico.
                  </p>
                </div>
              </aside>
            </section>
          </section>
        </DashboardResponsiveShell>
      </DashboardMotion>
    </main>
  );
}

function DashboardMetric({
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
      data-dashboard-anim="metric"
      className="group relative overflow-hidden rounded-[0.75rem] border border-[#2a2929] bg-[#101010]/90 p-5 shadow-[0_1rem_3rem_rgba(0,0,0,0.18)] transition-colors hover:border-[#f0ed7e]/35"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-[#f0ed7e]/25 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
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

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-32 rounded-4xl border border-[#2a2929] bg-[#151414]/80 px-4 py-3">
      <p className="text-[0.68rem] font-black uppercase tracking-[0.13em] text-[#8a8a85]">
        {label}
      </p>

      <p className="mt-2 text-base font-black text-[#f5f5f3]">{value}</p>
    </div>
  );
}
