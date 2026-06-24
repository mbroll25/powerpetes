"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type RoleValue = "TOP" | "JUNGLE" | "MID" | "ADC" | "SUPPORT";

type ForbiddenRoleRequiredModalProps = {
  primaryRole: string | null;
  secondaryRole: string | null;
};

const roles: { value: RoleValue; label: string; description: string }[] = [
  {
    value: "TOP",
    label: "Top",
    description: "Línea superior",
  },
  {
    value: "JUNGLE",
    label: "Jungla",
    description: "Selva",
  },
  {
    value: "MID",
    label: "Mid",
    description: "Línea central",
  },
  {
    value: "ADC",
    label: "ADC",
    description: "Tirador",
  },
  {
    value: "SUPPORT",
    label: "Soporte",
    description: "Apoyo",
  },
];

function formatRole(role: string | null) {
  switch (role) {
    case "TOP":
      return "Top";
    case "JUNGLE":
      return "Jungla";
    case "MID":
      return "Mid";
    case "ADC":
      return "ADC";
    case "SUPPORT":
      return "Soporte";
    default:
      return "-";
  }
}

export function ForbiddenRoleRequiredModal({
  primaryRole,
  secondaryRole,
}: ForbiddenRoleRequiredModalProps) {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [selectedRole, setSelectedRole] = useState<RoleValue | "">("");
  const [isSaving, setIsSaving] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const availableRoles = useMemo(() => {
    return roles.filter((role) => {
      return role.value !== primaryRole && role.value !== secondaryRole;
    });
  }, [primaryRole, secondaryRole]);

  async function handleSave() {
    setErrorMessage("");

    if (!selectedRole) {
      setErrorMessage("Seleccioná una línea prohibida para continuar.");
      return;
    }

    if (selectedRole === primaryRole || selectedRole === secondaryRole) {
      setErrorMessage(
        "La línea prohibida no puede ser igual a tu rol principal ni a tu rol secundario.",
      );
      return;
    }

    setIsSaving(true);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setIsSaving(false);
      setErrorMessage("No se pudo identificar tu usuario.");
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        forbidden_role: selectedRole,
        forbidden_role_completed_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    setIsSaving(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setIsCompleted(true);
    router.refresh();
  }

  if (isCompleted) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-9999 flex items-center justify-center overflow-hidden bg-black/76 px-4 py-6 backdrop-blur-md">
      <div className="pointer-events-none absolute bottom-0 right-0 z-10 hidden h-88 w-88 select-none md:block lg:h-120 lg:w-120 xl:h-136 xl:w-136">
        <Image
          src="/baneodelineas.png"
          alt=""
          fill
          priority
          sizes="(min-width: 1280px) 34rem, (min-width: 1024px) 30rem, 22rem"
          className="object-contain object-bottom-right drop-shadow-[0_1.5rem_2.5rem_rgba(0,0,0,0.65)]"
        />
      </div>

      <section className="relative z-20 w-full max-w-3xl overflow-hidden rounded-[1rem] border border-[#f0ed7e]/30 bg-[#101010] p-5 shadow-[0_2rem_6rem_rgba(0,0,0,0.58)] sm:p-6">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(240,237,126,0.11),transparent_32%)]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-[#f0ed7e]/45 to-transparent" />

        <div className="relative z-10">
          <div className="mb-4 grid size-12 place-items-center rounded-[0.75rem] border border-[#f0ed7e]/25 bg-[#f0ed7e]/10">
            <AlertTriangle className="size-5 text-[#f0ed7e]" />
          </div>

          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#f0ed7e]">
            Configuración obligatoria
          </p>

          <h2 className="mt-3 text-3xl font-black uppercase tracking-[-0.04em] text-[#f5f5f3]">
            Elegí tu línea prohibida
          </h2>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#8a8a85]">
            Dado que hay players que lele cola, prefieren que se implemente la LINEA PROHIBIDA.
            Elegí una línea que no quieras jugar NUNCA. No prometo mejorar tu
            winrate, pero al menos tendrás una excusa menos cuando pierdas. TODO
            COGIDO!
          </p>

          <div className="mt-5 grid gap-3 rounded-[0.75rem] border border-[#2a2929] bg-[#151414]/80 p-4 sm:grid-cols-2">
            <div>
              <p className="text-[0.68rem] font-black uppercase tracking-[0.13em] text-[#8a8a85]">
                Tu rol principal
              </p>

              <p className="mt-1 text-base font-black text-[#f5f5f3]">
                {formatRole(primaryRole)}
              </p>
            </div>

            <div>
              <p className="text-[0.68rem] font-black uppercase tracking-[0.13em] text-[#8a8a85]">
                Tu rol secundario
              </p>

              <p className="mt-1 text-base font-black text-[#f5f5f3]">
                {formatRole(secondaryRole)}
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {availableRoles.map((role) => {
              const selected = selectedRole === role.value;

              return (
                <button
                  key={role.value}
                  type="button"
                  onClick={() => setSelectedRole(role.value)}
                  className={cn(
                    "rounded-[0.75rem] border p-4 text-left transition",
                    selected
                      ? "border-[#75f0a0]/45 bg-[#75f0a0]/12 text-[#75f0a0]"
                      : "border-[#2a2929] bg-[#151414]/80 text-[#f5f5f3] hover:border-[#f0ed7e]/35 hover:bg-[#1d1c1c]",
                  )}
                >
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-sm font-black uppercase tracking-[0.13em]">
                      {role.label}
                    </p>

                    {selected ? <ShieldCheck className="size-4" /> : null}
                  </div>

                  <p className="text-xs leading-5 text-[#8a8a85]">
                    {role.description}
                  </p>
                </button>
              );
            })}
          </div>

          <p className="mt-4 rounded-[0.6rem] border border-[#f0ed7e]/20 bg-[#f0ed7e]/8 px-4 py-3 text-xs leading-5 text-[#c9c9c4]">
            Esta elección es obligatoria. No puede coincidir con tu rol
            principal ni con tu rol secundario.
          </p>

          {errorMessage ? (
            <p className="mt-4 rounded-[0.5rem] border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {errorMessage}
            </p>
          ) : null}

          <Button
            type="button"
            disabled={isSaving || !selectedRole}
            onClick={handleSave}
            className="mt-5 h-13 w-full rounded-[0.5rem] bg-[#f0ed7e] text-sm font-black uppercase tracking-[0.14em] text-[#151414] hover:bg-[#d8d46d] disabled:cursor-not-allowed disabled:opacity-45"
          >
            {isSaving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            {isSaving ? "Guardando..." : "Guardar y continuar"}
          </Button>
        </div>
      </section>
    </div>
  );
}
