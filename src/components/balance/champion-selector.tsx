"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";

import { cn } from "@/lib/utils";

export type ChampionSelection = {
  championId: number | null;
  championKey: string;
  championName: string;
  championImageUrl: string;
};

type ChampionSelectorProps = {
  value: ChampionSelection | null;
  placeholder?: string;
  disabled?: boolean;
  onChange: (champion: ChampionSelection | null) => void;
};

type ChampionApiResponse = {
  champions: ChampionSelection[];
};

let championCache: ChampionSelection[] | null = null;
let championPromise: Promise<ChampionSelection[]> | null = null;

async function loadChampions() {
  if (championCache) return championCache;

  if (!championPromise) {
    championPromise = fetch("/api/riot/champions")
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("No se pudieron cargar los campeones.");
        }

        const data = (await response.json()) as ChampionApiResponse;

        championCache = data.champions;

        return data.champions;
      })
      .finally(() => {
        championPromise = null;
      });
  }

  return championPromise;
}

export function ChampionSelector({
  value,
  placeholder = "Buscar campeón...",
  disabled = false,
  onChange,
}: ChampionSelectorProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  const [champions, setChampions] = useState<ChampionSelection[]>([]);
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const loadedChampions = await loadChampions();

        if (!cancelled) {
          setChampions(loadedChampions);
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "No se pudieron cargar los campeones.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current) return;

      if (!rootRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, []);

  const filteredChampions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return champions.slice(0, 12);
    }

    return champions
      .filter((champion) => {
        return (
          champion.championName.toLowerCase().includes(normalizedQuery) ||
          champion.championKey.toLowerCase().includes(normalizedQuery)
        );
      })
      .slice(0, 12);
  }, [champions, query]);

  if (value && !isOpen) {
    return (
      <div ref={rootRef} className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            setQuery(value.championName);
            setIsOpen(true);
          }}
          className="flex h-11 w-full items-center justify-between gap-3 rounded-[0.5rem] border border-[#2a2929] bg-[#151414] px-3 text-left text-sm text-[#f5f5f3] transition hover:border-[#f0ed7e]/35 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className="flex min-w-0 items-center gap-3">
            {value.championImageUrl ? (
              <Image
                src={value.championImageUrl}
                alt={value.championName}
                width={28}
                height={28}
                sizes="28px"
                className="size-7 rounded-[0.4rem] object-cover"
              />
            ) : null}

            <span className="min-w-0 truncate font-black">
              {value.championName}
            </span>
          </span>

          <span className="text-[0.62rem] font-black uppercase tracking-[0.12em] text-[#8a8a85]">
            Cambiar
          </span>
        </button>
      </div>
    );
  }

  return (
    <div ref={rootRef} className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8a8a85]" />

        <input
          type="text"
          value={query}
          disabled={disabled}
          onFocus={() => setIsOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value);
            setIsOpen(true);
          }}
          placeholder={placeholder}
          className="h-11 w-full rounded-[0.5rem] border border-[#2a2929] bg-[#151414] pl-10 pr-10 text-sm text-[#f5f5f3] outline-none placeholder:text-[#8a8a85] transition focus:border-[#75f0a0]"
        />

        {query || value ? (
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              setQuery("");
              onChange(null);
              setIsOpen(true);
            }}
            className="absolute right-3 top-1/2 grid size-5 -translate-y-1/2 place-items-center rounded-full text-[#8a8a85] transition hover:text-[#f0ed7e]"
            aria-label="Limpiar campeón"
          >
            <X className="size-3.5" />
          </button>
        ) : null}
      </div>

      {isOpen ? (
        <div className="custom-scrollbar absolute left-0 right-0 top-[calc(100%+0.4rem)] z-50 max-h-72 overflow-y-auto rounded-4xl border border-[#2a2929] bg-[#101010] p-2 pr-3 shadow-[0_1rem_3rem_rgba(0,0,0,0.45)]">
          {isLoading ? (
            <p className="px-3 py-3 text-sm text-[#8a8a85]">
              Cargando campeones...
            </p>
          ) : errorMessage ? (
            <p className="px-3 py-3 text-sm text-red-200">{errorMessage}</p>
          ) : filteredChampions.length > 0 ? (
            <div className="grid gap-1">
              {filteredChampions.map((champion) => (
                <button
                  key={champion.championKey}
                  type="button"
                  onClick={() => {
                    onChange(champion);
                    setQuery("");
                    setIsOpen(false);
                  }}
                  className={cn(
                    "flex items-center gap-3 rounded-[0.5rem] px-3 py-2 text-left transition hover:bg-[#151414]",
                    value?.championKey === champion.championKey
                      ? "bg-[#f0ed7e]/10 text-[#f0ed7e]"
                      : "text-[#f5f5f3]",
                  )}
                >
                  <Image
                    src={champion.championImageUrl}
                    alt={champion.championName}
                    width={32}
                    height={32}
                    sizes="32px"
                    className="size-8 rounded-2xl object-cover"
                  />

                  <span className="text-sm font-black">
                    {champion.championName}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p className="px-3 py-3 text-sm text-[#8a8a85]">
              No se encontraron campeones.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
