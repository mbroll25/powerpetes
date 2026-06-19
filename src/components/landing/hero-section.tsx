"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";

import { AuthActions } from "@/components/auth/auth-actions";
import DotField from "@/components/effects/dot-field";
import { HeroTicker } from "@/components/landing/hero-ticker";
import { SiteHeader } from "@/components/landing/site-header";
import { YoutubeBackgroundVideo } from "@/components/landing/youtube-background-video";

export function HeroSection() {
  const rootRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        defaults: { ease: "power3.out" },
      });

      tl.from("[data-anim='nav']", {
        opacity: 0,
        y: -18,
        duration: 0.7,
      })
        .from(
          "[data-anim='ticker']",
          {
            opacity: 0,
            y: -10,
            duration: 0.55,
          },
          "-=0.3",
        )
        .from(
          "[data-anim='title']",
          {
            opacity: 0,
            y: 28,
            duration: 0.9,
          },
          "-=0.1",
        )
        .from(
          "[data-anim='description']",
          {
            opacity: 0,
            y: 18,
            duration: 0.7,
          },
          "-=0.45",
        )
        .from(
          "[data-anim='actions']",
          {
            opacity: 0,
            y: 18,
            duration: 0.7,
          },
          "-=0.4",
        );
    }, rootRef);

    return () => ctx.revert();
  }, []);

  return (
    <main
      ref={rootRef}
      className="relative flex h-dvh flex-col overflow-hidden bg-[#151414] text-[#f5f5f3]"
    >
      <YoutubeBackgroundVideo
        videoId="P--2--5gbcE"
        className="opacity-75 sm:opacity-85 lg:opacity-100"
      />

      <div className="absolute inset-0 bg-[#151414]/50 sm:bg-[#151414]/45" />
      <div className="absolute inset-0 bg-linear-to-r from-[#151414]/96 via-[#151414]/64 to-[#151414]/88" />

      <YoutubeBackgroundVideo
        videoId="P--2--5gbcE"
        className="opacity-75 sm:opacity-85 lg:opacity-100"
      />

      <div className="absolute inset-0 bg-[#151414]/50 sm:bg-[#151414]/45" />
      <div className="absolute inset-0 bg-linear-to-r from-[#151414]/96 via-[#151414]/64 to-[#151414]/88" />

      <DotField
        className="pointer-events-none absolute inset-0 z-2 opacity-45 sm:opacity-60 lg:opacity-100"
        dotRadius={1.65}
        dotSpacing={15}
        cursorRadius={420}
        cursorForce={0.1}
        bulgeOnly
        bulgeStrength={58}
        glowRadius={150}
        sparkle={false}
        waveAmplitude={0}
        gradientFrom="rgba(245,245,243,0.24)"
        gradientTo="rgba(240,237,126,0.18)"
        glowColor="rgba(21,20,20,0.65)"
      />

      <SiteHeader />
      <HeroTicker />

      <section className="relative z-10 mx-auto flex min-h-0 flex-1 w-full max-w-7xl items-center px-4 pb-6 pt-5 sm:px-6 sm:pb-8 sm:pt-6 lg:pb-12">
        <div className="w-full max-w-6xl">
          <h1
            data-anim="title"
            className="max-w-full text-[clamp(2.15rem,10vw,3.15rem)] font-black uppercase leading-[0.92] tracking-[-0.045em] text-[#f5f5f3] min-[390px]:text-[clamp(2.3rem,9.6vw,3.35rem)] sm:max-w-[18ch] sm:text-[clamp(3.4rem,10vw,6rem)] sm:tracking-[-0.055em] md:text-[clamp(4.2rem,8.4vw,7rem)] lg:max-w-6xl lg:text-[clamp(4.8rem,7.2vw,7.4rem)]"
          >
            Equipos justos para tus partidas personalizadas.
          </h1>

          <p
            data-anim="description"
            className="mt-6 max-w-xl text-base leading-7 text-[#c9c9c4] sm:mt-7 sm:text-lg sm:leading-8 md:max-w-2xl md:text-xl"
          >
            Organizá partidas de League of Legends entre amigos y generá equipos
            balanceados según elo, peak elo y roles preferidos.
          </p>

          <div data-anim="actions" className="mt-8 sm:mt-10">
            <AuthActions variant="hero" />
          </div>

          <p className="mt-5 max-w-sm text-sm leading-6 text-[#8a8a85] sm:mt-7 sm:max-w-none sm:text-base">
            Acceso rápido. Sin fricción. Hecho para organizar mejor cada lobby.
          </p>
        </div>
      </section>
    </main>
  );
}
