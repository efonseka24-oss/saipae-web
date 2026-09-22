"use client";

import { useState } from "react";
import { FileText, Users } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function CaesListadoToggle({
  vistaActas,
  vistaInstituciones,
}: {
  vistaActas: React.ReactNode;
  vistaInstituciones: React.ReactNode;
}) {
  const [vista, setVista] = useState<"actas" | "instituciones">("actas");

  return (
    <div>
      <div className="mb-6 flex gap-3">
        <Button variante={vista === "actas" ? "primary" : "outline"} onClick={() => setVista("actas")}>
          <FileText className="h-4 w-4" />
          Actas
        </Button>
        <Button variante={vista === "instituciones" ? "primary" : "outline"} onClick={() => setVista("instituciones")}>
          <Users className="h-4 w-4" />
          Instituciones
        </Button>
      </div>

      {vista === "actas" ? vistaActas : vistaInstituciones}
    </div>
  );
}
