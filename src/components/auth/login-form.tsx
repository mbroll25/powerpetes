"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, LockKeyhole, Mail } from "lucide-react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setErrorMessage("");

    if (!email.trim() || !password) {
      setErrorMessage("Ingresá email y contraseña.");
      return;
    }

    setIsLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error || !data.user) {
      setIsLoading(false);
      setErrorMessage(error?.message ?? "No se pudo iniciar sesión.");
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("profile_completed")
      .eq("id", data.user.id)
      .maybeSingle();

    setIsLoading(false);

    if (profileError) {
      setErrorMessage(profileError.message);
      return;
    }

    if (!profile?.profile_completed) {
      router.replace("/onboarding");
      return;
    }

    router.replace("/dashboard");
  }

  return (
    <form onSubmit={handleLogin} className="space-y-5">
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
            placeholder="••••••••"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="h-13 rounded-[0.5rem] border-[#2a2929] bg-[#151414] pl-11 text-[#f5f5f3] placeholder:text-[#8a8a85] focus-visible:border-[#f0ed7e] focus-visible:ring-[#f0ed7e]/25"
          />
        </div>
      </div>

      {errorMessage ? (
        <p className="rounded-[0.5rem] border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {errorMessage}
        </p>
      ) : null}

      <Button
        type="submit"
        disabled={isLoading}
        className="h-14 w-full rounded-[0.5rem] bg-[#f0ed7e] text-sm font-black uppercase tracking-[0.14em] text-[#151414] hover:bg-[#d8d46d]"
      >
        {isLoading ? "Ingresando..." : "Iniciar sesión"}
        <ArrowRight className="ml-3 size-4" />
      </Button>

      <div className="flex flex-col gap-3 border-t border-[#2a2929] pt-5 text-sm text-[#c9c9c4] sm:flex-row sm:items-center sm:justify-between">
        <span>¿Todavía no tenés cuenta?</span>

        <Link
          href="/register"
          className="font-black uppercase tracking-[0.12em] text-[#f0ed7e] hover:text-[#d8d46d]"
        >
          Registrarse
        </Link>
      </div>
    </form>
  );
}
