"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, LogIn, UserPlus } from "lucide-react";

import { LogoutButton } from "@/components/auth/logout-button";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type AuthActionsProps = {
  variant?: "header" | "hero";
};

export function AuthActions({ variant = "header" }: AuthActionsProps) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [status, setStatus] = useState<"loading" | "logged-out" | "logged-in">(
    "loading",
  );

  const isHero = variant === "hero";

  useEffect(() => {
    let isMounted = true;

    async function checkUser() {
      const { data } = await supabase.auth.getUser();

      if (!isMounted) return;

      setStatus(data.user ? "logged-in" : "logged-out");
    }

    checkUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setStatus(session?.user ? "logged-in" : "logged-out");
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  if (status === "loading") {
    return (
      <div
        className={cn(
          "h-12 animate-pulse rounded-[0.5rem] bg-white/5",
          isHero ? "w-full max-w-md" : "w-[18rem]",
        )}
      />
    );
  }

  if (status === "logged-in") {
    return (
      <div
        className={cn(
          "flex gap-3",
          isHero ? "w-full flex-col sm:w-auto sm:flex-row" : "items-center",
        )}
      >
        <Link
          href="/dashboard"
          className={cn(
            "inline-flex h-12 items-center justify-center rounded-[0.5rem] bg-[#f0ed7e] px-6 text-xs font-black uppercase tracking-[0.14em] text-[#151414] transition-colors hover:bg-[#d8d46d]",
            isHero && "sm:min-w-[16rem]",
          )}
        >
          Ir al dashboard
          <ArrowRight className="ml-3 size-4" />
        </Link>

        <LogoutButton
          className={cn(isHero && "sm:min-w-56", !isHero && "h-12 px-5")}
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex gap-3",
        isHero ? "w-full flex-col sm:w-auto sm:flex-row" : "items-center",
      )}
    >
      <Link
        href="/login"
        className="inline-flex h-12 items-center justify-center rounded-[0.5rem] border border-[#2a2929] bg-transparent px-5 text-xs font-black uppercase tracking-[0.14em] text-[#f5f5f3] transition-colors hover:bg-[#232121] hover:text-[#f0ed7e]"
      >
        <LogIn className="mr-2 size-4" />
        Iniciar sesión
      </Link>

      <Link
        href="/register"
        className={cn(
          "inline-flex h-12 items-center justify-center rounded-[0.5rem] bg-[#f5f5f3] px-6 text-xs font-black uppercase tracking-[0.14em] text-[#151414] transition-colors hover:bg-[#f0ed7e]",
          isHero && "bg-[#f0ed7e] hover:bg-[#d8d46d] sm:min-w-[16rem]",
        )}
      >
        <UserPlus className="mr-2 size-4" />
        Registrarse
      </Link>
    </div>
  );
}
