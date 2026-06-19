"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type LogoutButtonProps = {
  className?: string;
  label?: string;
};

export function LogoutButton({
  className,
  label = "Cerrar sesión",
}: LogoutButtonProps) {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [isLoading, setIsLoading] = useState(false);

  async function handleLogout() {
    setIsLoading(true);

    await supabase.auth.signOut();

    router.replace("/");
    router.refresh();
  }

  return (
    <Button
      type="button"
      disabled={isLoading}
      onClick={handleLogout}
      className={cn(
        "h-12 rounded-[0.5rem] border border-[#2a2929] bg-[#232121] px-5 text-xs font-black uppercase tracking-[0.12em] text-[#f5f5f3] hover:bg-[#2b2b2b] hover:text-[#f0ed7e]",
        className,
      )}
    >
      <LogOut className="mr-2 size-4" />
      {isLoading ? "Saliendo..." : label}
    </Button>
  );
}
