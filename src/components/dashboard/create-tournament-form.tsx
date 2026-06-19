"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type CreateTournamentFormProps = {
  disabled?: boolean;
};

export function CreateTournamentForm({
  disabled = false,
}: CreateTournamentFormProps) {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [name, setName] = useState("Power Petes Season 1");
  const [durationDays, setDurationDays] = useState("14");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleCreateTournament(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setMessage("");

    const cleanName = name.trim();
    const duration = Number(durationDays);

    if (!cleanName) {
      setMessage("Ingresá un nombre para el torneo.");
      return;
    }

    if (!Number.isFinite(duration) || duration < 1 || duration > 365) {
      setMessage("La duración debe ser entre 1 y 365 días.");
      return;
    }

    setIsLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setIsLoading(false);
      setMessage("No se encontró la sesión del usuario.");
      return;
    }

    const { error } = await supabase.from("tournaments").insert({
      name: cleanName,
      duration_days: duration,
      created_by: user.id,
    });

    setIsLoading(false);

    if (error) {
      if (error.message.includes("only_one_active_tournament")) {
        setMessage(
          "Ya existe un torneo activo. Finalizalo antes de crear otro.",
        );
        return;
      }

      setMessage(error.message);
      return;
    }

    router.refresh();
  }

  return (
    <form
      onSubmit={handleCreateTournament}
      className="rounded-[0.75rem] border border-[#2a2929] bg-[#101010] p-5"
    >
      <div className="mb-5 flex items-center gap-2">
        <CalendarPlus className="size-4 text-[#f0ed7e]" />
        <p className="text-xs font-black uppercase tracking-[0.14em] text-[#f0ed7e]">
          Crear torneo
        </p>
      </div>

      <div className="grid gap-4">
        <div className="grid gap-2">
          <Label className="text-[#f5f5f3]">Nombre del torneo</Label>
          <Input
            value={name}
            disabled={disabled || isLoading}
            onChange={(event) => setName(event.target.value)}
            className="h-12 rounded-[0.5rem] border-[#2a2929] bg-[#151414] text-[#f5f5f3] placeholder:text-[#8a8a85] focus-visible:border-[#f0ed7e] focus-visible:ring-[#f0ed7e]/25"
          />
        </div>

        <div className="grid gap-2">
          <Label className="text-[#f5f5f3]">Duración en días</Label>
          <Input
            type="number"
            min={1}
            max={365}
            value={durationDays}
            disabled={disabled || isLoading}
            onChange={(event) => setDurationDays(event.target.value)}
            className="h-12 rounded-[0.5rem] border-[#2a2929] bg-[#151414] text-[#f5f5f3] placeholder:text-[#8a8a85] focus-visible:border-[#f0ed7e] focus-visible:ring-[#f0ed7e]/25"
          />
        </div>

        <Button
          type="submit"
          disabled={disabled || isLoading}
          className="h-12 rounded-[0.5rem] bg-[#f0ed7e] text-xs font-black uppercase tracking-[0.14em] text-[#151414] hover:bg-[#d8d46d]"
        >
          {isLoading ? "Creando torneo..." : "Crear torneo"}
        </Button>

        {disabled ? (
          <p className="text-sm leading-6 text-[#8a8a85]">
            Ya hay un torneo activo. Cuando finalice, vas a poder crear uno
            nuevo.
          </p>
        ) : null}

        {message ? (
          <p className="rounded-[0.5rem] border border-[#f0ed7e]/25 bg-[#f0ed7e]/10 px-4 py-3 text-sm leading-6 text-[#f5f5f3]">
            {message}
          </p>
        ) : null}
      </div>
    </form>
  );
}
