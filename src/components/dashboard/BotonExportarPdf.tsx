"use client";

import { useState } from "react";
import { FileDown } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function BotonExportarPdf() {
  const [generando, setGenerando] = useState(false);

  async function generar() {
    setGenerando(true);
    const respuesta = await fetch("/api/dashboard/pdf");
    if (!respuesta.ok) {
      alert("No se pudo generar el PDF.");
      setGenerando(false);
      return;
    }
    const blob = await respuesta.blob();
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement("a");
    enlace.href = url;
    enlace.download = "Informe_Estado_General.pdf";
    enlace.click();
    URL.revokeObjectURL(url);
    setGenerando(false);
  }

  return (
    <Button onClick={generar} disabled={generando} variante="outline">
      <FileDown className="h-4 w-4" />
      {generando ? "Generando..." : "Generar PDF"}
    </Button>
  );
}
