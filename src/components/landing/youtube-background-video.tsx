"use client";

type YoutubeBackgroundVideoProps = {
  videoId: string;
  className?: string;
};

export function YoutubeBackgroundVideo({
  videoId,
  className = "",
}: YoutubeBackgroundVideoProps) {
  const src = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&mute=1&controls=0&loop=1&playlist=${videoId}&playsinline=1&rel=0&modestbranding=1&showinfo=0&disablekb=1&fs=0&iv_load_policy=3&vq=hd1080`;

  return (
    <div
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
    >
      <iframe
        src={src}
        title="Background video"
        allow="autoplay; encrypted-media; picture-in-picture"
        className="absolute left-1/2 top-1/2 h-[56.25vw] min-h-full w-screen min-w-[177.77vh] -translate-x-1/2 -translate-y-1/2 border-0"
        aria-hidden="true"
        tabIndex={-1}
      />
    </div>
  );
}
