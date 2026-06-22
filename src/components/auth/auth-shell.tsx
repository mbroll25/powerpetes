import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, Swords, Users } from "lucide-react";
import { YoutubeBackgroundVideo } from "@/components/landing/youtube-background-video";

import DotField from "@/components/effects/dot-field";

type AuthShellProps = {
  title: string;
  description: string;
  children: React.ReactNode;
};

const highlights = [
  {
    icon: Users,
    label: "Lobby rápido",
  },
  {
    icon: ShieldCheck,
    label: "Balance justo",
  },
  {
    icon: Swords,
    label: "Partidas 5v5",
  },
];

export function AuthShell({ title, description, children }: AuthShellProps) {
  return (
    <main className="relative min-h-dvh overflow-x-hidden bg-[#151414] text-[#f5f5f3]">
      <YoutubeBackgroundVideo videoId="P--2--5gbcE" className="opacity-55" />

      <div className="absolute inset-0 bg-[#151414]/58" />
      <div className="absolute inset-0 bg-linear-to-r from-[#151414]/96 via-[#151414]/78 to-[#151414]/92" />

      <DotField
        className="pointer-events-none absolute inset-0 z-2 opacity-45"
        dotRadius={1.7}
        dotSpacing={15}
        cursorRadius={420}
        cursorForce={0.1}
        bulgeOnly
        bulgeStrength={58}
        glowRadius={150}
        sparkle={false}
        waveAmplitude={0}
        gradientFrom="rgba(245,245,243,0.22)"
        gradientTo="rgba(240,237,126,0.16)"
        glowColor="rgba(21,20,20,0.65)"
      />

      <div className="pointer-events-none absolute bottom-0 right-64 z-8 hidden h-[90vh] w-[48vw] max-w-200 lg:block xl:right-72 xl:h-[94vh] xl:w-[50vw] 2xl:right-96 min-[1900px]:right-120">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_55%_52%,rgba(240,237,126,0.14),transparent_44%)] blur-2xl" />

        <Image
          src="/danieldick.png"
          alt="Jugador profesional"
          fill
          priority
          sizes="(min-width: 1536px) 50vw, (min-width: 1024px) 48vw, 0vw"
          className="relative z-10 object-contain object-bottom"
        />
      </div>

      <section className="relative z-10 flex min-h-dvh flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_30rem]">
        <div className="flex px-4 pt-5 sm:px-6 sm:pt-7 lg:min-h-dvh lg:flex-col lg:justify-between lg:px-10 lg:py-9">
          <Link
            href="/"
            className="inline-flex w-fit items-center gap-3 text-xs font-black uppercase tracking-[0.14em] text-[#f5f5f3] transition hover:text-[#f0ed7e]"
          >
            <span className="grid size-10 place-items-center rounded-[0.5rem] bg-[#232121]">
              <ArrowLeft className="size-4" />
            </span>
            Volver al inicio
          </Link>

          <div className="hidden max-w-4xl lg:block">
            <p className="mb-6 text-xs font-black uppercase tracking-[0.28em] text-[#f0ed7e]">
              Power Petes
            </p>

            <MarketingTitle variant="desktop" />

            <div className="mt-10 flex flex-wrap gap-3">
              {highlights.map((item) => {
                const Icon = item.icon;

                return (
                  <div
                    key={item.label}
                    className="inline-flex items-center gap-3 rounded-[0.5rem] border border-[#2a2929] bg-[#151414]/55 px-4 py-3 backdrop-blur-md"
                  >
                    <Icon className="size-4 text-[#f0ed7e]" />
                    <span className="text-xs font-black uppercase tracking-[0.14em] text-[#f5f5f3]">
                      {item.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <p className="hidden max-w-xl text-sm leading-6 text-[#8a8a85] lg:block">
            Sistema privado para organizar partidas personalizadas de League of
            Legends entre amigos, reduciendo discusiones y mejorando el balance
            de equipos.
          </p>
        </div>

        <aside className="relative flex flex-1 items-start justify-center px-4 pb-8 pt-8 sm:px-6 lg:min-h-dvh lg:items-center lg:border-l lg:border-[#2a2929] lg:bg-[#151414]/92 lg:px-8 lg:py-8 lg:backdrop-blur-xl">
          <div className="w-full max-w-md">
            <div className="mb-7 lg:hidden">
              <div className="mb-6 flex items-center gap-4">
                <div className="relative grid size-12 place-items-center rounded-[0.5rem] bg-[#232121]">
                  <div className="relative size-[3.45rem]">
                    <Image
                      src="/powerlogo.svg"
                      alt="Power Petes"
                      fill
                      priority
                      sizes="3.45rem"
                      className="object-contain"
                    />
                  </div>
                </div>

                <div>
                  <p className="text-sm font-black uppercase tracking-[0.12em] text-[#f5f5f3]">
                    Power Petes
                  </p>
                  <p className="text-xs text-[#8a8a85]">Powers Petes</p>
                </div>
              </div>

              <MarketingTitle variant="mobile" />

              <p className="mt-4 max-w-sm text-sm leading-6 text-[#8a8a85]">
                Organizá partidas personalizadas, armá lobbies y generá equipos
                más justos con menos discusión.
              </p>
            </div>

            <div className="rounded-[0.75rem] border border-[#2a2929] bg-[#1d1c1c]/90 p-5 shadow-[0_1.5rem_5rem_rgba(0,0,0,0.35)] sm:p-7">
              <div className="mb-7">
                <h2 className="text-3xl font-black uppercase tracking-[-0.04em] text-[#f5f5f3] sm:text-4xl">
                  {title}
                </h2>

                <p className="mt-3 text-sm leading-6 text-[#c9c9c4]">
                  {description}
                </p>
              </div>

              {children}
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}

function MarketingTitle({ variant }: { variant: "desktop" | "mobile" }) {
  if (variant === "mobile") {
    return (
      <h1 className="max-w-[12ch] text-[clamp(2.55rem,11vw,3.4rem)] font-extrabold uppercase leading-[0.94] tracking-[-0.035em] text-[#f5f5f3]">
        <span className="block">Entrá al</span>
        <span className="block">
          <span className="text-[#f0ed7e]">lobby</span> y
        </span>
        <span className="block">
          <span className="text-[#f0ed7e]">balanceá</span>
        </span>
        <span className="block">la partida.</span>
      </h1>
    );
  }

  return (
    <h1 className="max-w-5xl text-[clamp(3.55rem,5.8vw,5.8rem)] font-extrabold uppercase leading-[0.92] tracking-[-0.035em] text-[#f5f5f3] xl:text-[clamp(3.75rem,5.6vw,6.1rem)] 2xl:text-[clamp(4rem,6.5vw,7rem)] min-[1900px]:text-[clamp(4.2rem,7.2vw,7.2rem)]">
      <span className="block">Entrá al</span>
      <span className="block">
        <span className="text-[#f0ed7e]">lobby</span> y
      </span>
      <span className="block">
        <span className="text-[#f0ed7e]">balanceá</span> la
      </span>
      <span className="block">partida.</span>
    </h1>
  );
}
