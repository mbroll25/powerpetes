import Link from "next/link";
import { ArrowLeft, BadgeCheck, Gamepad2, ShieldCheck } from "lucide-react";

import { OnboardingForm } from "@/components/auth/onboarding-form";

const steps = [
  {
    icon: Gamepad2,
    title: "Riot ID",
    description: "Nick, tagline y servidor.",
  },
  {
    icon: ShieldCheck,
    title: "Nivel competitivo",
    description: "Elo actual y mejor elo Solo/Duo.",
  },
  {
    icon: BadgeCheck,
    title: "Perfil de juego",
    description: "Roles, mains y estilo.",
  },
];

export default function OnboardingPage() {
  return (
    <main className="min-h-dvh overflow-x-hidden bg-[#151414] text-[#f5f5f3]">
      <header className="border-b border-[#2a2929] bg-[#151414]">
        <div className="mx-auto flex h-20 w-full max-w-368 items-center justify-between px-4 sm:px-6">
          <Link
            href="/"
            className="inline-flex items-center gap-3 text-xs font-black uppercase tracking-[0.14em] text-[#f5f5f3] transition hover:text-[#f0ed7e]"
          >
            <span className="grid size-10 place-items-center rounded-[0.5rem] bg-[#232121]">
              <ArrowLeft className="size-4" />
            </span>
            Volver al inicio
          </Link>

          <div className="hidden items-center gap-3 sm:flex">
            <div className="relative grid size-11 place-items-center rounded-[0.5rem] bg-[#232121]">
              <img
                src="/powerlogo.svg"
                alt="Power Petes"
                className="absolute left-1/2 top-1/2 size-[3.2rem] -translate-x-1/2 -translate-y-1/2 object-contain"
              />
            </div>

            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em]">
                Power Petes
              </p>
              <p className="text-xs text-[#8a8a85]">Powers Petes</p>
            </div>
          </div>
        </div>
      </header>

      <section className="mx-auto grid w-full max-w-368 gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(17rem,21rem)_minmax(0,1fr)] lg:gap-8 lg:py-10 xl:grid-cols-[minmax(20rem,24rem)_minmax(0,1fr)] xl:gap-10">
        <aside className="lg:sticky lg:top-8 lg:h-fit">
          <div className="rounded-[0.75rem] border border-[#2a2929] bg-[#1d1c1c] p-5 @container sm:p-6">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-[#f0ed7e]">
              Perfil obligatorio
            </p>

            <h1 className="mt-4 text-[clamp(2rem,12cqi,3.45rem)] font-black uppercase leading-[0.9] tracking-[-0.04em] text-[#f5f5f3]">
              <span className="block">Perfil</span>
              <span className="block">competitivo</span>
            </h1>

            <p className="mt-5 text-sm leading-6 text-[#c9c9c4]">
              Esta información se usa para generar equipos más justos,
              equilibrados y competitivos.
            </p>

            <div className="mt-7 space-y-3">
              {steps.map((step) => {
                const Icon = step.icon;

                return (
                  <div
                    key={step.title}
                    className="rounded-[0.5rem] border border-[#2a2929] bg-[#151414] p-4"
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="size-4 text-[#f0ed7e]" />
                      <p className="text-xs font-black uppercase tracking-[0.14em] text-[#f5f5f3]">
                        {step.title}
                      </p>
                    </div>

                    <p className="mt-2 text-sm leading-5 text-[#8a8a85]">
                      {step.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </aside>

        <section className="min-w-0 rounded-[0.75rem] border border-[#2a2929] bg-[#1d1c1c] p-5 shadow-[0_1.5rem_5rem_rgba(0,0,0,0.3)] sm:p-7 lg:p-8">
          <div className="mb-8 border-b border-[#2a2929] pb-6">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#f0ed7e]">
              Completar datos
            </p>

            <h2 className="mt-3 text-[clamp(2rem,4vw,3rem)] font-black uppercase leading-[0.92] tracking-[-0.04em] text-[#f5f5f3]">
              Configurá tu jugador
            </h2>

            <p className="mt-3 max-w-3xl text-sm leading-6 text-[#c9c9c4]">
              Usá datos reales de Solo/Duo. No se tiene en cuenta Flex Queue
              para calcular el nivel competitivo base.
            </p>
          </div>

          <OnboardingForm />
        </section>
      </section>
    </main>
  );
}
