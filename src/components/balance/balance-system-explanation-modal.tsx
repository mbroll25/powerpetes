"use client";

import { useState, type ElementType, type ReactNode } from "react";
import {
  Activity,
  BrainCircuit,
  CheckCircle2,
  Info,
  Layers3,
  RefreshCw,
  Scale,
  ShieldCheck,
  Sparkles,
  Swords,
  Trophy,
  UserRound,
  X,
} from "lucide-react";

import { ClientPortal } from "@/components/ui/client-portal";
import { Button } from "@/components/ui/button";
import { POWERPETES_BALANCE_RULES } from "@/features/balance/balance-engine";
import { cn } from "@/lib/utils";

type BalanceSystemExplanationButtonProps = {
  className?: string;
};

export function BalanceSystemExplanationButton({
  className,
}: BalanceSystemExplanationButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        onClick={() => setIsOpen(true)}
        className={cn(
          "h-11 rounded-[0.5rem] border border-[#0ac8b9]/30 bg-[#0ac8b9]/10 px-4 text-xs font-black uppercase tracking-[0.13em] text-[#0ac8b9] transition hover:bg-[#0ac8b9]/15",
          className,
        )}
      >
        <Info className="mr-2 size-4" />
        Cómo funciona
      </Button>

      {isOpen ? (
        <BalanceSystemExplanationModal onClose={() => setIsOpen(false)} />
      ) : null}
    </>
  );
}

function BalanceSystemExplanationModal({ onClose }: { onClose: () => void }) {
  return (
    <ClientPortal>
      <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/75 px-4 py-6 backdrop-blur-md">
        <div className="custom-scrollbar relative max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-[1rem] border border-[#0ac8b9]/30 bg-[#101010] p-5 pr-6 shadow-[0_2rem_6rem_rgba(0,0,0,0.65)] sm:p-6 sm:pr-7">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 grid size-9 place-items-center rounded-full border border-[#2a2929] bg-[#151414] text-[#8a8a85] transition hover:border-[#0ac8b9]/40 hover:text-[#0ac8b9]"
            aria-label="Cerrar"
          >
            <X className="size-4" />
          </button>

          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(10,200,185,0.13),transparent_34%),radial-gradient(circle_at_80%_20%,rgba(240,237,126,0.08),transparent_30%)]" />

          <div className="relative z-10">
            <header className="mb-6 border-b border-[#2a2929] pb-6 pr-12">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-full border border-[#0ac8b9]/35 bg-[#0ac8b9]/10 px-3 py-1 text-[0.68rem] font-black uppercase tracking-[0.14em] text-[#0ac8b9]">
                  <BrainCircuit className="mr-1.5 size-3.5" />
                  Motor de balance
                </span>

                <span className="inline-flex items-center rounded-full border border-[#f0ed7e]/30 bg-[#f0ed7e]/10 px-3 py-1 text-[0.68rem] font-black uppercase tracking-[0.14em] text-[#f0ed7e]">
                  <Sparkles className="mr-1.5 size-3.5" />
                  PowerPetes
                </span>
              </div>

              <h2 className="text-4xl font-black uppercase tracking-[-0.04em] text-[#f5f5f3] sm:text-5xl">
                Cómo funciona el balance
              </h2>

              <p className="mt-4 max-w-4xl text-sm leading-6 text-[#c9c9c4]">
                PowerPetes no arma equipos al azar ni se basa solamente en el
                elo de Riot. El sistema calcula una fuerza estimada para cada
                jugador, prueba muchas combinaciones posibles y elige la partida
                que mejor equilibra rating total, roles, líneas y probabilidad
                de victoria.
              </p>
            </header>

            <section className="grid gap-4 lg:grid-cols-3">
              <ExplanationCard
                icon={Swords}
                title="Objetivo principal"
                description="El objetivo no es que ambos equipos tengan exactamente el mismo número, sino que la partida se sienta competitiva. Para eso se evalúa el equipo completo y también cada enfrentamiento por línea."
              />

              <ExplanationCard
                icon={Scale}
                title="Score de balance"
                description="Cada partida generada recibe un score de 0 a 100. Cuanto más alto sea ese número, más pareja debería ser la partida. El score baja si hay mucha diferencia de rating, roles forzados o líneas demasiado desparejas."
              />

              <ExplanationCard
                icon={Activity}
                title="Probabilidad estimada"
                description="PowerPetes calcula una probabilidad aproximada de victoria para cada equipo. La meta ideal es acercarse al 50% / 50%, pero si el lobby no es perfecto, el sistema elige la mejor opción posible."
              />
            </section>

            <section className="mt-5 grid gap-4 lg:grid-cols-2">
              <DetailedSection
                icon={UserRound}
                eyebrow="Fuerza inicial"
                title="Cómo se calcula el nivel de un jugador"
              >
                <p>
                  Al principio, cuando un jugador todavía no tiene historial en
                  PowerPetes, el sistema usa datos iniciales para estimar su
                  fuerza: rango actual, peak elo, LP, winrate de SoloQ y tamaño
                  de champion pool.
                </p>

                <p>
                  Esto sirve para que los primeros equipos no se armen a ciegas.
                  Pero esos datos no son la verdad definitiva: son solo el punto
                  de partida.
                </p>
              </DetailedSection>

              <DetailedSection
                icon={Trophy}
                eyebrow="Historial interno"
                title="PowerPetes aprende con sus propias partidas"
              >
                <p>
                  A medida que se cierran partidas dentro de PowerPetes, el
                  sistema empieza a confiar más en los resultados reales del
                  grupo. Es decir: el historial interno pesa cada vez más.
                </p>

                <p>
                  Con pocas partidas, Riot ayuda bastante. Con muchas partidas,
                  PowerPetes prioriza lo que realmente pasó dentro del sistema.
                </p>
              </DetailedSection>

              <DetailedSection
                icon={ShieldCheck}
                eyebrow="Roles"
                title="No vale lo mismo jugar cómodo que jugar fuera de rol"
              >
                <p>
                  Si un jugador queda en su rol principal, no recibe
                  penalización. Si queda en su rol secundario, recibe una
                  penalización leve. Si queda fuera de rol, la penalización es
                  mayor.
                </p>

                <p>
                  Esto evita que el sistema sobrevalore a alguien fuerte cuando
                  queda en una posición donde probablemente rinde menos.
                </p>
              </DetailedSection>

              <DetailedSection
                icon={Layers3}
                eyebrow="Líneas"
                title="El sistema compara rol contra rol"
              >
                <p>
                  PowerPetes no mira solamente el total de cada equipo. También
                  compara Top contra Top, Jungla contra Jungla, Mid contra Mid,
                  ADC contra ADC y Soporte contra Soporte.
                </p>

                <p>
                  Esto es clave porque dos equipos pueden tener el mismo rating
                  total, pero estar rotos si una línea queda demasiado desigual.
                </p>
              </DetailedSection>

              <DetailedSection
                icon={RefreshCw}
                eyebrow="Después de jugar"
                title="Cómo se actualiza el rating"
              >
                <p>
                  Cuando se cierra una partida, el rating interno se actualiza
                  según el resultado. Si ganás una partida difícil, subís más.
                  Si perdés una partida donde tu equipo no era favorito, bajás
                  menos.
                </p>

                <p>
                  Con el tiempo, esto hace que PowerPetes refleje mejor el nivel
                  real de cada jugador dentro del grupo.
                </p>
              </DetailedSection>

              <DetailedSection
                icon={CheckCircle2}
                eyebrow="Importante"
                title="Riot no decide los resultados"
              >
                <p>
                  Riot se usa como ayuda inicial para conocer mejor a cada
                  jugador, pero los resultados oficiales de PowerPetes son los
                  que se cargan y se cierran dentro del sistema.
                </p>

                <p>
                  Por eso el cierre manual de partidas es importante: cada
                  resultado confirmado alimenta el rating interno real.
                </p>
              </DetailedSection>
            </section>

            <section className="mt-5 rounded-[0.85rem] border border-[#2a2929] bg-[#151414]/80 p-5">
              <div className="mb-4 flex items-center gap-2">
                <BrainCircuit className="size-4 text-[#f0ed7e]" />
                <p className="text-xs font-black uppercase tracking-[0.14em] text-[#f0ed7e]">
                  Reglas resumidas
                </p>
              </div>

              <div className="grid gap-3">
                {POWERPETES_BALANCE_RULES.map((rule, index) => (
                  <div
                    key={rule}
                    className="flex gap-3 rounded-[0.75rem] border border-[#2a2929] bg-[#101010]/80 p-4"
                  >
                    <div className="grid size-7 shrink-0 place-items-center rounded-full border border-[#0ac8b9]/30 bg-[#0ac8b9]/10 text-xs font-black text-[#0ac8b9]">
                      {index + 1}
                    </div>

                    <p className="text-sm leading-6 text-[#c9c9c4]">{rule}</p>
                  </div>
                ))}
              </div>
            </section>

            <footer className="mt-6 flex flex-col gap-3 border-t border-[#2a2929] pt-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="max-w-3xl text-sm leading-6 text-[#8a8a85]">
                La fórmula puede ajustarse con el tiempo. La idea es que
                PowerPetes aprenda del grupo y que cada nueva partida cerrada
                mejore la precisión del sistema.
              </p>

              <Button
                type="button"
                onClick={onClose}
                className="h-11 rounded-[0.5rem] bg-[#f0ed7e] px-5 text-xs font-black uppercase tracking-[0.14em] text-[#151414] hover:bg-[#d8d46d]"
              >
                Entendido
              </Button>
            </footer>
          </div>
        </div>
      </div>
    </ClientPortal>
  );
}

function ExplanationCard({
  icon: Icon,
  title,
  description,
}: {
  icon: ElementType;
  title: string;
  description: string;
}) {
  return (
    <article className="rounded-[0.85rem] border border-[#2a2929] bg-[#151414]/80 p-5">
      <Icon className="mb-4 size-5 text-[#0ac8b9]" />

      <h3 className="text-lg font-black text-[#f5f5f3]">{title}</h3>

      <p className="mt-3 text-sm leading-6 text-[#8a8a85]">{description}</p>
    </article>
  );
}

function DetailedSection({
  icon: Icon,
  eyebrow,
  title,
  children,
}: {
  icon: ElementType;
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <article className="rounded-[0.85rem] border border-[#2a2929] bg-[#151414]/80 p-5">
      <div className="mb-4 flex items-center gap-2">
        <Icon className="size-4 text-[#f0ed7e]" />
        <p className="text-xs font-black uppercase tracking-[0.14em] text-[#f0ed7e]">
          {eyebrow}
        </p>
      </div>

      <h3 className="text-xl font-black text-[#f5f5f3]">{title}</h3>

      <div className="mt-3 space-y-3 text-sm leading-6 text-[#8a8a85]">
        {children}
      </div>
    </article>
  );
}
