import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, History, Trophy } from "lucide-react";

import DotField from "@/components/effects/dot-field";
import { FullMatchHistoryPanel } from "@/components/balance/full-match-history-panel";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type TournamentRow = {
  id: string;
  name: string;
  status: string;
};

export default async function DashboardHistoryPage() {
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

  const { data: tournamentData } = await supabase
    .from("tournaments")
    .select("id, name, status")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const activeTournament = tournamentData as TournamentRow | null;

  const { data: roleData } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  const isAdmin = roleData?.role === "owner" || roleData?.role === "admin";

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
              <History className="size-4 text-[#f0ed7e]" />
              <p className="text-xs font-black uppercase tracking-[0.32em] text-[#f0ed7e]">
                Powers Petes
              </p>
            </div>

            <h1 className="text-5xl font-black uppercase tracking-[-0.04em] sm:text-6xl">
              Historial
            </h1>

            <p className="mt-4 max-w-3xl text-sm leading-6 text-[#c9c9c4]">
              {activeTournament
                ? `Historial completo del torneo activo: ${activeTournament.name}.`
                : "No hay torneo activo para mostrar historial."}
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/dashboard/tournaments"
              className="inline-flex h-12 items-center justify-center rounded-[0.5rem] border border-[#f0ed7e]/25 bg-[#f0ed7e]/10 px-5 text-xs font-black uppercase tracking-[0.12em] text-[#f0ed7e] transition-colors hover:bg-[#f0ed7e]/15"
            >
              <Trophy className="mr-2 size-4" />
              Historial de torneos
            </Link>

            <Link
              href="/dashboard"
              className="inline-flex h-12 items-center justify-center rounded-[0.5rem] border border-[#2a2929] bg-[#232121] px-5 text-xs font-black uppercase tracking-[0.12em] text-[#f5f5f3] transition-colors hover:bg-[#2b2b2b] hover:text-[#f0ed7e]"
            >
              <ArrowLeft className="mr-2 size-4" />
              Volver al dashboard
            </Link>
          </div>
        </header>

        <FullMatchHistoryPanel
          activeTournamentId={activeTournament?.id ?? null}
          isAdmin={isAdmin}
        />
      </section>
    </main>
  );
}
