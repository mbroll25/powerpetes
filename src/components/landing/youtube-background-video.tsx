"use client";

import { useEffect, useState } from "react";

type YoutubeBackgroundVideoProps = {
  videoId: string;
  className?: string;
};

export function YoutubeBackgroundVideo({
  videoId,
  className = "",
}: YoutubeBackgroundVideoProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setMounted(true);
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, []);

  if (!mounted) {
    return (
      <div
        className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
        aria-hidden="true"
      />
    );
  }

  const src = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&mute=1&controls=0&loop=1&playlist=${videoId}&playsinline=1&rel=0&modestbranding=1&showinfo=0&disablekb=1&fs=0&iv_load_policy=3&cc_load_policy=0&vq=hd1080&start=3`;

  return (
    <div
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
      aria-hidden="true"
      suppressHydrationWarning
    >
      <iframe
        src={src}
        title="Video de fondo"
        allow="autoplay; encrypted-media; picture-in-picture"
        referrerPolicy="strict-origin-when-cross-origin"
        tabIndex={-1}
        className="pointer-events-none absolute left-1/2 top-1/2 h-[64vw] min-h-[120%] w-[120vw] min-w-[205vh] -translate-x-1/2 -translate-y-1/2 scale-110 border-0"
      />
    </div>
  );
}
