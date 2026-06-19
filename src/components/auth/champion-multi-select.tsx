"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Search, X } from "lucide-react";

type Champion = {
  id: string;
  name: string;
  title: string;
  iconUrl: string;
};

type ChampionMultiSelectProps = {
  label: string;
  description?: string;
  value: string[];
  onChange: (value: string[]) => void;
  placeholder: string;
};

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function ChampionMultiSelect({
  label,
  description,
  value,
  onChange,
  placeholder,
}: ChampionMultiSelectProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [champions, setChampions] = useState<Champion[]>([]);
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadChampions() {
      try {
        const response = await fetch("/api/lol/champions");
        const payload = (await response.json()) as {
          champions?: Champion[];
          error?: string;
        };

        if (!response.ok || !payload.champions) {
          setErrorMessage(payload.error ?? "No se pudieron cargar campeones.");
          return;
        }

        setChampions(payload.champions);
      } catch {
        setErrorMessage("No se pudieron cargar campeones.");
      } finally {
        setIsLoading(false);
      }
    }

    loadChampions();
  }, []);

  const selectedNames = useMemo(
    () => new Set(value.map((champion) => normalizeSearch(champion))),
    [value],
  );

  const filteredChampions = useMemo(() => {
    const normalizedQuery = normalizeSearch(query);

    if (!normalizedQuery) return [];

    return champions
      .filter((champion) => {
        const normalizedChampion = normalizeSearch(champion.name);

        return (
          normalizedChampion.includes(normalizedQuery) &&
          !selectedNames.has(normalizedChampion)
        );
      })
      .slice(0, 18);
  }, [champions, query, selectedNames]);

  function selectChampion(champion: Champion) {
    onChange([...value, champion.name]);
    setQuery("");
    inputRef.current?.focus();
  }

  function removeChampion(championName: string) {
    onChange(value.filter((selected) => selected !== championName));
  }

  const shouldShowResults = isFocused && query.trim().length > 0;

  return (
    <div className="space-y-2">
      <div>
        <label className="text-sm font-bold text-[#f5f5f3]">{label}</label>

        {description ? (
          <p className="mt-1 text-sm leading-5 text-[#8a8a85]">{description}</p>
        ) : null}
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#8a8a85]" />

        <input
          ref={inputRef}
          value={query}
          placeholder={placeholder}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            window.setTimeout(() => setIsFocused(false), 150);
          }}
          onChange={(event) => setQuery(event.target.value)}
          className="h-13! w-full rounded-[0.5rem] border border-[#2a2929] bg-[#101010] pl-11 pr-4 text-sm text-[#f5f5f3] outline-none placeholder:text-[#8a8a85] focus:border-[#f0ed7e] focus:ring-2 focus:ring-[#f0ed7e]/20"
        />

        {shouldShowResults ? (
          <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 overflow-hidden rounded-[0.5rem] border border-[#2a2929] bg-[#1d1c1c] shadow-[0_1rem_3rem_rgba(0,0,0,0.45)]">
            <div className="max-h-64 overflow-y-auto p-2">
              {isLoading ? (
                <div className="flex items-center gap-2 px-3 py-3 text-sm text-[#c9c9c4]">
                  <Loader2 className="size-4 animate-spin" />
                  Cargando campeones...
                </div>
              ) : null}

              {!isLoading && errorMessage ? (
                <p className="px-3 py-3 text-sm text-red-200">{errorMessage}</p>
              ) : null}

              {!isLoading && !errorMessage && filteredChampions.length === 0 ? (
                <p className="px-3 py-3 text-sm text-[#8a8a85]">
                  No se encontraron campeones.
                </p>
              ) : null}

              {!isLoading &&
                !errorMessage &&
                filteredChampions.map((champion) => (
                  <button
                    key={champion.id}
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => selectChampion(champion)}
                    className="flex w-full items-center gap-3 rounded-[0.5rem] px-3 py-2 text-left transition hover:bg-[#2b2b2b]"
                  >
                    <img
                      src={champion.iconUrl}
                      alt={champion.name}
                      className="size-8 rounded-xl object-cover"
                    />

                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-[#f5f5f3]">
                        {champion.name}
                      </p>
                      <p className="truncate text-xs text-[#8a8a85]">
                        {champion.title}
                      </p>
                    </div>
                  </button>
                ))}
            </div>
          </div>
        ) : null}
      </div>

      {value.length > 0 ? (
        <div className="flex flex-wrap gap-2 pt-2">
          {value.map((championName) => (
            <span
              key={championName}
              className="inline-flex items-center gap-2 rounded-[0.5rem] border border-[#2a2929] bg-[#232121] px-3 py-2 text-xs font-black uppercase tracking-widest text-[#f5f5f3]"
            >
              {championName}

              <button
                type="button"
                onClick={() => removeChampion(championName)}
                className="text-[#8a8a85] transition hover:text-[#f0ed7e]"
                aria-label={`Quitar ${championName}`}
              >
                <X className="size-3.5" />
              </button>
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
