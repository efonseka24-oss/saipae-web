"use client";

// Avisa a la auditoría cada vez que el usuario abre una página del panel.
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

export function RegistroNavegacion() {
  const pathname = usePathname();
  // Evita registrar dos veces la misma página (React puede repetir el efecto).
  const ultima = useRef<string | null>(null);

  useEffect(() => {
    if (ultima.current === pathname) return;
    ultima.current = pathname;
    fetch("/api/auditoria/navegacion", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ruta: pathname }),
      keepalive: true,
    }).catch(() => {});
  }, [pathname]);

  return null;
}
