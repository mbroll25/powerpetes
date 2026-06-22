"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type YoutubeBackgroundVideoProps = {
  videoId: string;
  className?: string;
  posterSrc?: string;
};

export function YoutubeBackgroundVideo({
  videoId,
  className = "",
  posterSrc,
}: YoutubeBackgroundVideoProps) {
  const [mounted, setMounted] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setMounted(true);
    }, 500);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, []);

  const src = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&mute=1&controls=0&loop=1&playlist=${videoId}&playsinline=1&rel=0&modestbranding=1&showinfo=0&disablekb=1&fs=0&iv_load_policy=3&cc_load_policy=0&vq=hd1080&start=3`;

  return (
    <div
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
      aria-hidden="true"
      suppressHydrationWarning
    >
      {posterSrc ? (
        <Image
          src={posterSrc}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
      ) : (
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(240,237,126,0.12),transparent_34%),linear-gradient(135deg,#151414,#101010_48%,#151414)]" />
      )}

      {mounted ? (
        <iframe
          src={src}
          title="Video de fondo"
          allow="autoplay; encrypted-media; picture-in-picture"
          referrerPolicy="strict-origin-when-cross-origin"
          tabIndex={-1}
          onLoad={() => setVideoLoaded(true)}
          className={`pointer-events-none absolute left-1/2 top-1/2 h-[64vw] min-h-[120%] w-[120vw] min-w-[205vh] -translate-x-1/2 -translate-y-1/2 scale-110 border-0 transition-opacity duration-1000 ${
            videoLoaded ? "opacity-100" : "opacity-0"
          }`}
        />
      ) : null}
    </div>
  );
}