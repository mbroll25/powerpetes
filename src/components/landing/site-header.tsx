import Image from "next/image";
import Link from "next/link";

import { AuthActions } from "@/components/auth/auth-actions";

const brandName = "POWER PETES";

export function SiteHeader() {
  return (
    <header
      data-anim="nav"
      className="relative z-30 h-20 border-b border-[#2a2929] bg-[#151414] md:h-24"
    >
      <div className="mx-auto flex h-full w-full max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex min-w-0 items-center gap-3 md:gap-4">
          <div className="relative grid size-12 shrink-0 place-items-center rounded-[0.5rem] bg-[#232121] md:size-14">
            <div className="relative size-[3.45rem] md:size-17">
              <Image
                src="/powerlogo.svg"
                alt="Power Petes"
                fill
                priority
                sizes="(min-width: 768px) 4.25rem, 3.45rem"
                className="object-contain"
              />
            </div>
          </div>

          <p className="hidden truncate text-xs font-black uppercase tracking-[0.12em] text-[#f5f5f3] sm:block md:text-sm">
            {brandName}
          </p>
        </Link>

        <AuthActions variant="header" />
      </div>
    </header>
  );
}
