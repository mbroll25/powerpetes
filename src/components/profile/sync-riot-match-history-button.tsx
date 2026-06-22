"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { DatabaseZap, Loader2 } from "lucide-react";

import { syncCurrentUserRiotMatchHistory } from "@/app/actions/riot-profile";

export function SyncRiotMatchHistoryButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean | null>(null);

  function handleSync() {
    setMessage(null);
    setSuccess(null);

    startTransition(async () => {
      const result = await syncCurrentUserRiotMatchHistory();

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
        className="inline-flex h-11 items-center justify-center rounded-[0.5rem] border border-[#c89b3c]/30 bg-[#c89b3c]/10 px-4 text-xs font-black uppercase tracking-[0.13em] text-[#c89b3c] transition hover:bg-[#c89b3c]/15 disabled:cursor-not-allowed disabled:opacity-55"
      >
        {isPending ? (
          <Loader2 className="mr-2 size-4 animate-spin" />
        ) : (
          <DatabaseZap className="mr-2 size-4" />
        )}

        {isPending ? "Analizando partidas..." : "Sincronizar historial"}
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
