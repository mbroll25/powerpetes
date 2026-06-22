"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw } from "lucide-react";

import { syncCurrentUserRiotProfile } from "@/app/actions/riot-profile";

export function SyncRiotProfileButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean | null>(null);

  function handleSync() {
    setMessage(null);
    setSuccess(null);

    startTransition(async () => {
      const result = await syncCurrentUserRiotProfile();

      setMessage(result.message);
      setSuccess(result.success);

      if (result.success) {
        router.refresh();
      }
    });
  }

  return (
    <div className="grid gap-2">
      <button
        type="button"
        onClick={handleSync}
        disabled={isPending}
        className="inline-flex h-11 items-center justify-center rounded-[0.5rem] border border-[#0ac8b9]/30 bg-[#0ac8b9]/10 px-4 text-xs font-black uppercase tracking-[0.13em] text-[#0ac8b9] transition hover:bg-[#0ac8b9]/15 disabled:cursor-not-allowed disabled:opacity-55"
      >
        {isPending ? (
          <Loader2 className="mr-2 size-4 animate-spin" />
        ) : (
          <RefreshCw className="mr-2 size-4" />
        )}

        {isPending ? "Sincronizando..." : "Sincronizar Riot"}
      </button>

      {message ? (
        <p
          className={[
            "max-w-72 text-xs leading-5",
            success ? "text-[#75f0a0]" : "text-red-300",
          ].join(" ")}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
