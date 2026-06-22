"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

type ClientPortalProps = {
  children: ReactNode;
};

export function ClientPortal({ children }: ClientPortalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setMounted(true);
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, []);

  if (!mounted) return null;

  return createPortal(children, document.body);
}
