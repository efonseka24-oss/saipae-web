"use client";

import { useEffect, useRef } from "react";
import { Bold, Italic, Underline, List, ListOrdered, AlignCenter, AlignLeft } from "lucide-react";
import { contenidoAHtml, htmlAContenido, type Parrafo } from "@/lib/contenidoEnriquecido";

function BotonBarra({
  onClick,
  titulo,
  children,
}: {
  onClick: () => void;
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={titulo}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
    >
      {children}
    </button>
  );
}

export function RichTextEditor({
  valorInicial,
  onCambiar,
}: {
  valorInicial: Parrafo[];
  onCambiar: (parrafos: Parrafo[]) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inicializado = useRef(false);

  useEffect(() => {
    if (inicializado.current || !ref.current) return;
    ref.current.innerHTML = contenidoAHtml(valorInicial);
    inicializado.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function notificarCambio() {
    if (!ref.current) return;
    onCambiar(htmlAContenido(ref.current));
  }

  function comando(nombre: string, valor?: string) {
    ref.current?.focus();
    document.execCommand(nombre, false, valor);
    notificarCambio();
  }

  return (
    <div className="rounded-lg border border-slate-300 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
      <div className="flex items-center gap-1 border-b border-slate-200 bg-slate-50 px-2 py-1.5">
        <BotonBarra titulo="Negrita" onClick={() => comando("bold")}>
          <Bold className="h-4 w-4" />
        </BotonBarra>
        <BotonBarra titulo="Cursiva" onClick={() => comando("italic")}>
          <Italic className="h-4 w-4" />
        </BotonBarra>
        <BotonBarra titulo="Subrayado" onClick={() => comando("underline")}>
          <Underline className="h-4 w-4" />
        </BotonBarra>
        <span className="mx-1 h-4 w-px bg-slate-300" />
        <BotonBarra titulo="Lista con viñetas" onClick={() => comando("insertUnorderedList")}>
          <List className="h-4 w-4" />
        </BotonBarra>
        <BotonBarra titulo="Lista numerada" onClick={() => comando("insertOrderedList")}>
          <ListOrdered className="h-4 w-4" />
        </BotonBarra>
        <span className="mx-1 h-4 w-px bg-slate-300" />
        <BotonBarra titulo="Alinear a la izquierda" onClick={() => comando("justifyLeft")}>
          <AlignLeft className="h-4 w-4" />
        </BotonBarra>
        <BotonBarra titulo="Centrar" onClick={() => comando("justifyCenter")}>
          <AlignCenter className="h-4 w-4" />
        </BotonBarra>
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={notificarCambio}
        onBlur={notificarCambio}
        className="min-h-[160px] px-3 py-2 text-sm text-slate-800 focus:outline-none [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
      />
    </div>
  );
}
