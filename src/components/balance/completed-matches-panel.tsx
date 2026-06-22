"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { History, Loader2, Trophy } from "lucide-react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type CompletedMatchesPanelProps = {
  activeTournamentId: string | null;
};

type CompletedMatchPlayerProfile = {
  lol_nick: string | null;
  lol_tagline: string | null;
};

type CompletedMatchPlayer = {
  id: string;
  user_id: string;
  team: "blue" | "red";
  assigned_role: string;
  rating_before: number | string;
  rating_after: number | string | null;
  rating_delta: number | string | null;
  vale_used: boolean;
  vale_visible_loss_protected: number | string;
  profiles: CompletedMatchPlayerProfile | null;
};

type CompletedMatchEvidence = {
  id: string;
  source: "manual" | "riot_api" | "tournament_code";
  riot_game_id: string | null;
  riot_match_id: string | null;
  suggested_winner: "blue" | "red" | null;
  notes: string | null;
  created_at: string;
};

type CompletedMatchRecord = {
  id: string;
  match_number: number;
  winner_team: "blue" | "red" | null;
  completed_at: string | null;
  balance_score: number | string | null;
  blue_win_probability: number | string | null;
  red_win_probability: number | string | null;
  match_players: CompletedMatchPlayer[];
  match_result_submissions: CompletedMatchEvidence[];
};

function formatTeamName(team: "blue" | "red" | null) {
  if (team === "blue") return "Equipo Azul";
  if (team === "red") return "Equipo Rojo";
  return "Sin ganador";
}

function formatDateTime(value: string | null) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getMainEvidence(match: CompletedMatchRecord) {
  return (
    match.match_result_submissions?.slice().sort((a, b) => {
      return (
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    })[0] ?? null
  );
}

export function CompletedMatchesPanel({
  activeTournamentId,
}: CompletedMatchesPanelProps) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [matches, setMatches] = useState<CompletedMatchRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");

  const loadCompletedMatches = useCallback(async () => {
    setMessage("");
    setMatches([]);

    if (!activeTournamentId) return;

    setIsLoading(true);

    const { data, error } = await supabase
      .from("matches")
      .select(
        `
        id,
        match_number,
        winner_team,
        completed_at,
        balance_score,
        blue_win_probability,
        red_win_probability,
        match_players (
          id,
          user_id,
          team,
          assigned_role,
          rating_before,
          rating_after,
          rating_delta,
          vale_used,
          vale_visible_loss_protected,
          profiles (
            lol_nick,
            lol_tagline
          )
        ),
        match_result_submissions (
          id,
          source,
          riot_game_id,
          riot_match_id,
          suggested_winner,
          notes,
          created_at
        )
      `,
      )
      .eq("tournament_id", activeTournamentId)
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(3);

    setIsLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMatches((data ?? []) as unknown as CompletedMatchRecord[]);
  }, [activeTournamentId, supabase]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadCompletedMatches();
    }, 0);

    function handleCompletedMatchesUpdated() {
      void loadCompletedMatches();
    }

    window.addEventListener(
      "riftbalance:completed-matches-updated",
      handleCompletedMatchesUpdated,
    );

    if (!activeTournamentId) {
      return () => {
        window.clearTimeout(timeoutId);

        window.removeEventListener(
          "riftbalance:completed-matches-updated",
          handleCompletedMatchesUpdated,
        );
      };
    }

    const channel = supabase
      .channel(`completed-matches-${activeTournamentId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "matches",
          filter: `tournament_id=eq.${activeTournamentId}`,
        },
        () => {
          void loadCompletedMatches();
        },
      )
      .subscribe();

    return () => {
      window.clearTimeout(timeoutId);

      window.removeEventListener(
        "riftbalance:completed-matches-updated",
        handleCompletedMatchesUpdated,
      );

      void supabase.removeChannel(channel);
    };
  }, [activeTournamentId, loadCompletedMatches, supabase]);

  if (!activeTournamentId) {
    return null;
  }

  return (
    <section
      data-dashboard-anim="panel"
      className="mt-8 overflow-hidden rounded-[0.75rem] border border-[#2a2929] bg-[#101010]/92 shadow-[0_1rem_3rem_rgba(0,0,0,0.22)]"
    >
      <div className="relative border-b border-[#2a2929] p-5 sm:p-6">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(240,237,126,0.08),transparent_30%)]" />

        <div className="relative z-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <History className="size-4 text-[#f0ed7e]" />
              <p className="text-xs font-black uppercase tracking-[0.14em] text-[#f0ed7e]">
                Historial reciente
              </p>
            </div>

            <h2 className="text-2xl font-black text-[#f5f5f3]">
              Partidas confirmadas
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#8a8a85]">
              Últimos resultados confirmados por admin, con equipos, ganador,
              evidencia y vales usados.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard/history"
              className="inline-flex h-12 items-center justify-center rounded-[0.5rem] border border-[#f0ed7e]/25 bg-[#f0ed7e]/10 px-4 text-xs font-black uppercase tracking-[0.13em] text-[#f0ed7e] transition hover:bg-[#f0ed7e]/15"
            >
              Ver historial completo
            </Link>

            <div className="rounded-4xl border border-[#2a2929] bg-[#151414]/80 px-4 py-3">
              <p className="text-[0.68rem] font-black uppercase tracking-[0.13em] text-[#8a8a85]">
                Completadas
              </p>
              <p className="mt-1 text-xl font-black text-[#f5f5f3]">
                {matches.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-5 sm:p-6">
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-[#8a8a85]">
            <Loader2 className="size-4 animate-spin" />
            Cargando historial...
          </div>
        ) : matches.length > 0 ? (
          <div className="grid gap-4">
            {matches.map((match) => {
              const evidence = getMainEvidence(match);

              const valeUsedCount = match.match_players.filter((player) => {
                return player.vale_used;
              }).length;

              return (
                <article
                  key={match.id}
                  className="group rounded-[0.75rem] border border-[#2a2929] bg-[#151414]/80 p-4 transition-colors hover:border-[#f0ed7e]/35"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.14em] text-[#f0ed7e]">
                        Partida #{match.match_number}
                      </p>

                      <h3 className="mt-1 text-xl font-black text-[#f5f5f3]">
                        Ganó {formatTeamName(match.winner_team)}
                      </h3>

                      <p className="mt-1 text-xs text-[#8a8a85]">
                        Confirmada: {formatDateTime(match.completed_at)}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <MiniHistoryStat
                        label="Balance"
                        value={`${Math.round(Number(match.balance_score ?? 0))}%`}
                      />

                      <MiniHistoryStat
                        label="Vales"
                        value={`${valeUsedCount}/10`}
                      />

                      <MiniHistoryStat
                        label="Fuente"
                        value={
                          evidence?.source === "riot_api"
                            ? "Riot"
                            : evidence?.source === "tournament_code"
                              ? "Código"
                              : "Manual"
                        }
                      />
                    </div>
                  </div>

                  {evidence?.riot_match_id || evidence?.notes ? (
                    <div className="mt-4 rounded-[0.6rem] border border-[#2a2929] bg-[#101010]/70 px-4 py-3">
                      {evidence.riot_match_id ? (
                        <p className="text-sm leading-6 text-[#c9c9c4]">
                          Match ID:{" "}
                          <span className="font-black text-[#f5f5f3]">
                            {evidence.riot_match_id}
                          </span>
                        </p>
                      ) : null}

                      {evidence.notes ? (
                        <p className="text-sm leading-6 text-[#8a8a85]">
                          {evidence.notes}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        ) : (
          <div className="rounded-[0.75rem] border border-[#2a2929] bg-[#151414]/70 p-5">
            <div className="mb-4 grid size-10 place-items-center rounded-[0.6rem] border border-[#f0ed7e]/25 bg-[#f0ed7e]/10">
              <Trophy className="size-5 text-[#f0ed7e]" />
            </div>

            <p className="text-sm font-black uppercase tracking-[0.12em] text-[#f0ed7e]">
              Sin partidas confirmadas
            </p>

            <p className="mt-3 text-sm leading-6 text-[#8a8a85]">
              Cuando un admin confirme un resultado, aparecerá acá.
            </p>
          </div>
        )}

        {message ? (
          <p className="mt-4 rounded-[0.5rem] border border-[#f0ed7e]/25 bg-[#f0ed7e]/10 px-4 py-3 text-sm leading-6 text-[#f5f5f3]">
            {message}
          </p>
        ) : null}
      </div>
    </section>
  );
}

function MiniHistoryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[0.5rem] border border-[#2a2929] bg-[#101010]/80 px-3 py-2">
      <p className="text-[0.62rem] font-black uppercase tracking-[0.12em] text-[#8a8a85]">
        {label}
      </p>
      <p className="mt-1 text-sm font-black text-[#f5f5f3]">{value}</p>
    </div>
  );
}
