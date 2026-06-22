"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Clock3,
  ShieldCheck,
  Trash2,
} from "lucide-react";

import { ClientPortal } from "@/components/ui/client-portal";
import { Button } from "@/components/ui/button";

type FloatingMatch = {
  id: string;
  match_number: number;
};

type FloatingCurrentMatchPanelProps = {
  match: FloatingMatch | null;
  isAdmin: boolean;
  isParticipant: boolean;
  valeWindowOpen: boolean;
  currentPlayerValeUsed: boolean;
  usingValeMatchId: string | null;
  finishingMatchId: string | null;
  cancellingMatchId: string | null;
  onUseVale: (matchId: string) => void;
  onMarkFinished: () => void;
  onCancel: () => void;
};

export function FloatingCurrentMatchPanel({
  match,
  isAdmin,
  isParticipant,
  valeWindowOpen,
  currentPlayerValeUsed,
  usingValeMatchId,
  finishingMatchId,
  cancellingMatchId,
  onUseVale,
  onMarkFinished,
  onCancel,
}: FloatingCurrentMatchPanelProps) {
  const [open, setOpen] = useState(false);

  if (!match) return null;

  return (
    <ClientPortal>
      <div className="pointer-events-none fixed inset-x-0 top-4 z-80 flex justify-center px-4">
        <div className="pointer-events-auto w-full max-w-xl">
          <div className="overflow-hidden rounded-[0.9rem] border border-[#f0ed7e]/20 bg-[#101010]/92 shadow-[0_1.2rem_3rem_rgba(0,0,0,0.45)] backdrop-blur-xl">
            <div className="flex items-center justify-between gap-4 px-4 py-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-2 rounded-full border border-[#f0ed7e]/25 bg-[#f0ed7e]/10 px-3 py-1 text-[0.68rem] font-black uppercase tracking-[0.14em] text-[#f0ed7e]">
                    <Clock3 className="size-3.5" />
                    Partida en curso
                  </span>

                  <span className="rounded-full border border-[#2a2929] bg-[#151414]/80 px-2.5 py-1 text-[0.66rem] font-black uppercase tracking-[0.13em] text-[#8a8a85]">
                    #{match.match_number}
                  </span>
                </div>

                <p className="mt-2 truncate text-sm font-black text-[#f5f5f3] sm:text-base">
                  Equipo Azul vs Equipo Rojo
                </p>

                <p className="mt-1 text-xs text-[#8a8a85]">
                  Tocá para revisar detalle, vale y acciones.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setOpen((current) => !current)}
                className="inline-flex h-11 items-center gap-2 rounded-[0.6rem] border border-[#f0ed7e]/25 bg-[#f0ed7e]/10 px-4 text-xs font-black uppercase tracking-[0.14em] text-[#f0ed7e] transition hover:bg-[#f0ed7e]/15"
              >
                {open ? (
                  <ChevronUp className="size-4" />
                ) : (
                  <ChevronDown className="size-4" />
                )}
                {open ? "Ocultar" : "Ver detalle"}
              </button>
            </div>

            {open ? (
              <div className="border-t border-[#2a2929] px-4 pb-4 pt-4">
                <div className="rounded-[0.75rem] border border-[#2a2929] bg-[#151414]/70 p-4">
                  <p className="text-sm font-black text-[#f5f5f3]">
                    Acá va el detalle expandido de la partida
                  </p>

                  <p className="mt-2 text-sm leading-6 text-[#8a8a85]">
                    Equipos, contador, vale y acciones administrativas.
                  </p>

                  <div className="mt-4 flex flex-wrap gap-3">
                    {isParticipant ? (
                      <Button
                        type="button"
                        disabled={
                          !valeWindowOpen ||
                          currentPlayerValeUsed ||
                          usingValeMatchId === match.id
                        }
                        onClick={() => onUseVale(match.id)}
                        className="h-11 rounded-[0.5rem] border border-[#75f0a0]/25 bg-[#75f0a0]/10 px-5 text-xs font-black uppercase tracking-[0.14em] text-[#75f0a0] hover:bg-[#75f0a0]/15"
                      >
                        <ShieldCheck className="mr-2 size-4" />
                        Usar vale
                      </Button>
                    ) : null}

                    {isAdmin ? (
                      <>
                        <Button
                          type="button"
                          disabled={finishingMatchId === match.id}
                          onClick={onMarkFinished}
                          className="h-11 rounded-[0.5rem] bg-[#f0ed7e] px-5 text-xs font-black uppercase tracking-[0.14em] text-[#151414] hover:bg-[#d8d46d]"
                        >
                          Finalizó la partida
                        </Button>

                        <Button
                          type="button"
                          disabled={cancellingMatchId === match.id}
                          onClick={onCancel}
                          className="h-11 rounded-[0.5rem] border border-red-400/25 bg-transparent px-5 text-xs font-black uppercase tracking-[0.14em] text-red-200 hover:bg-red-400/10"
                        >
                          <Trash2 className="mr-2 size-4" />
                          Cancelar pendiente
                        </Button>
                      </>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </ClientPortal>
  );
}
