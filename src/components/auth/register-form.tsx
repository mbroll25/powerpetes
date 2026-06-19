"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, LockKeyhole, Mail } from "lucide-react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function RegisterForm() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordRepeat, setPasswordRepeat] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleRegister(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setErrorMessage("");
    setStatusMessage("");

    if (!email.trim()) {
      setErrorMessage("Ingresá un email válido.");
      return;
    }

    if (password.length < 6) {
      setErrorMessage("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    if (password !== passwordRepeat) {
      setErrorMessage("Las contraseñas no coinciden.");
      return;
    }

    setIsLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });

    setIsLoading(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    if (!data.session) {
      setStatusMessage(
        "Cuenta creada. Revisá tu email para confirmar el registro.",
      );
      return;
    }

    router.replace("/onboarding");
  }

  return (
    <form onSubmit={handleRegister} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="email" className="text-[#f5f5f3]">
          Email
        </Label>

        <div className="relative">
          <Mail className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#8a8a85]" />
          <Input
            id="email"
            type="email"
            placeholder="tu@email.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="h-13 rounded-[0.5rem] border-[#2a2929] bg-[#151414] pl-11 text-[#f5f5f3] placeholder:text-[#8a8a85] focus-visible:border-[#f0ed7e] focus-visible:ring-[#f0ed7e]/25"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="password" className="text-[#f5f5f3]">
          Contraseña
        </Label>

        <div className="relative">
          <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#8a8a85]" />
          <Input
            id="password"
            type="password"
            placeholder="Mínimo 6 caracteres"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="h-13 rounded-[0.5rem] border-[#2a2929] bg-[#151414] pl-11 text-[#f5f5f3] placeholder:text-[#8a8a85] focus-visible:border-[#f0ed7e] focus-visible:ring-[#f0ed7e]/25"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="passwordRepeat" className="text-[#f5f5f3]">
          Repetir contraseña
        </Label>

        <div className="relative">
          <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#8a8a85]" />
          <Input
            id="passwordRepeat"
            type="password"
            placeholder="Repetí tu contraseña"
            value={passwordRepeat}
            onChange={(event) => setPasswordRepeat(event.target.value)}
            className="h-13 rounded-[0.5rem] border-[#2a2929] bg-[#151414] pl-11 text-[#f5f5f3] placeholder:text-[#8a8a85] focus-visible:border-[#f0ed7e] focus-visible:ring-[#f0ed7e]/25"
          />
        </div>
      </div>

      {errorMessage ? (
        <p className="rounded-[0.5rem] border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {errorMessage}
        </p>
      ) : null}

      {statusMessage ? (
        <p className="rounded-[0.5rem] border border-[#f0ed7e]/30 bg-[#f0ed7e]/10 px-4 py-3 text-sm text-[#f0ed7e]">
          {statusMessage}
        </p>
      ) : null}

      <Button
        type="submit"
        disabled={isLoading}
        className="h-14 w-full rounded-[0.5rem] bg-[#f0ed7e] text-sm font-black uppercase tracking-[0.14em] text-[#151414] hover:bg-[#d8d46d]"
      >
        {isLoading ? "Creando cuenta..." : "Crear cuenta"}
        <ArrowRight className="ml-3 size-4" />
      </Button>

      <div className="flex flex-col gap-3 border-t border-[#2a2929] pt-5 text-sm text-[#c9c9c4] sm:flex-row sm:items-center sm:justify-between">
        <span>¿Ya tenés cuenta?</span>

        <Link
          href="/login"
          className="font-black uppercase tracking-[0.12em] text-[#f0ed7e] hover:text-[#d8d46d]"
        >
          Iniciar sesión
        </Link>
      </div>
    </form>
  );
}