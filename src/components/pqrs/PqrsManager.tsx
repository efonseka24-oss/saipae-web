"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, FileText, MessageSquareText, Download } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ETIQUETAS_TIPO_PETICION_PQRS } from "@/lib/pqrs";
import { PeticionFormulario } from "@/components/pqrs/PeticionFormulario";
import { RespuestaFormulario } from "@/components/pqrs/RespuestaFormulario";
import type { PeticionPqrs, UsuarioResponsable } from "@/components/pqrs/tipos";

// timeZone: "UTC" evita que la fecha de radicado (guardada como medianoche
// UTC) se corra un día al mostrarse en la zona horaria del servidor.
function formatearFecha(fecha: string | Date): string {
  return new Date(fecha).toLocaleDateString("es-CO", { dateStyle: "medium", timeZone: "UTC" });
}

type Modo = { tipo: "cerrado" } | { tipo: "crear" } | { tipo: "editar"; peticion: PeticionPqrs };

export function PqrsManager({ peticiones, usuarios }: { peticiones: PeticionPqrs[]; usuarios: UsuarioResponsable[] }) {
  const router = useRouter();
  const [modo, setModo] = useState<Modo>({ tipo: "cerrado" });
  const [respondiendoId, setRespondiendoId] = useState<string | null>(null);

  async function crear(formData: FormData): Promise<string | null> {
    const respuesta = await fetch("/api/pqrs/peticiones", { method: "POST", body: formData });
    if (!respuesta.ok) {
      const datos = await respuesta.json();
      return datos.error ?? "No se pudo crear la petición.";
    }
    setModo({ tipo: "cerrado" });
    router.refresh();
    return null;
  }

  async function editar(id: string, formData: FormData): Promise<string | null> {
    const respuesta = await fetch(`/api/pqrs/peticiones/${id}`, { method: "PATCH", body: formData });
    if (!respuesta.ok) {
      const datos = await respuesta.json();
      return datos.error ?? "No se pudo guardar.";
    }
    setModo({ tipo: "cerrado" });
    router.refresh();
    return null;
  }

  async function eliminar(peticion: PeticionPqrs) {
    if (!confirm(`¿Eliminar la petición ${peticion.radicadoEntrada} de "${peticion.peticionario}"?`)) return;
    const respuesta = await fetch(`/api/pqrs/peticiones/${peticion.id}`, { method: "DELETE" });
    if (!respuesta.ok) {
      const datos = await respuesta.json();
      alert(datos.error ?? "No se pudo eliminar.");
      return;
    }
    router.refresh();
  }

  async function guardarRespuesta(peticion: PeticionPqrs, texto: string): Promise<string | null> {
    const formData = new FormData();
    formData.append("texto", texto);
    const metodo = peticion.respuesta ? "PATCH" : "POST";
    const respuesta = await fetch(`/api/pqrs/peticiones/${peticion.id}/respuesta`, { method: metodo, body: formData });
    if (!respuesta.ok) {
      const datos = await respuesta.json();
      return datos.error ?? "No se pudo generar la respuesta.";
    }
    setRespondiendoId(null);
    router.refresh();
    return null;
  }

  if (usuarios.length === 0) {
    return (
      <Card>
        <p className="text-sm text-slate-500">
          Primero crea al menos un usuario activo (será el responsable de las respuestas) en{" "}
          <a href="/administrador" className="font-medium text-blue-600 hover:text-blue-700">
            Administrador
          </a>
          .
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {modo.tipo === "crear" && (
        <PeticionFormulario titulo="Nueva petición" usuarios={usuarios} onGuardar={crear} onCancelar={() => setModo({ tipo: "cerrado" })} />
      )}
      {modo.tipo === "editar" && (
        <PeticionFormulario
          titulo="Editar petición"
          usuarios={usuarios}
          valoresIniciales={modo.peticion}
          onGuardar={(formData) => editar(modo.peticion.id, formData)}
          onCancelar={() => setModo({ tipo: "cerrado" })}
        />
      )}
      {modo.tipo === "cerrado" && (
        <Button onClick={() => setModo({ tipo: "crear" })}>
          <Plus className="h-4 w-4" />
          Nueva petición
        </Button>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Peticiones registradas</CardTitle>
          <Badge variante="slate">{peticiones.length} registro(s)</Badge>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="py-2 pr-4">Radicado entrada</th>
                <th className="py-2 pr-4">Peticionario</th>
                <th className="py-2 pr-4">Tipo</th>
                <th className="py-2 pr-4">Asunto</th>
                <th className="py-2 pr-4">Responsable</th>
                <th className="py-2 pr-4">Soporte</th>
                <th className="py-2 pr-4">Respuesta</th>
                <th className="py-2 pr-4">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {peticiones.map((p) => (
                <tr key={p.id} className="border-b border-slate-100 last:border-0">
                  <td className="py-3 pr-4">
                    <p className="font-mono font-medium text-slate-900">{p.radicadoEntrada}</p>
                    <p className="text-xs text-slate-500">{formatearFecha(p.fechaRadicado)}</p>
                  </td>
                  <td className="py-3 pr-4 text-slate-600">{p.peticionario}</td>
                  <td className="py-3 pr-4">
                    <Badge variante="blue">{ETIQUETAS_TIPO_PETICION_PQRS[p.tipoPeticion as keyof typeof ETIQUETAS_TIPO_PETICION_PQRS] ?? p.tipoPeticion}</Badge>
                  </td>
                  <td className="py-3 pr-4 max-w-xs truncate text-slate-600" title={p.asunto}>
                    {p.asunto}
                  </td>
                  <td className="py-3 pr-4 text-slate-600">{p.responsable.nombre}</td>
                  <td className="py-3 pr-4">
                    <a
                      href={p.archivoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700"
                      title={p.archivoNombre}
                    >
                      <FileText className="h-4 w-4" /> Ver
                    </a>
                  </td>
                  <td className="py-3 pr-4">
                    {p.respuesta ? (
                      <div className="space-y-1">
                        <p className="font-mono text-xs font-medium text-slate-900">{p.respuesta.radicadoSalida}</p>
                        <p className="text-xs text-slate-500">{formatearFecha(p.respuesta.fechaRadicado)}</p>
                        <div className="flex items-center gap-2">
                          {p.respuesta.documentoUrl && (
                            <a
                              href={p.respuesta.documentoUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
                            >
                              <Download className="h-3.5 w-3.5" /> Word
                            </a>
                          )}
                          {p.respuesta.documentoPdfUrl && (
                            <a
                              href={p.respuesta.documentoPdfUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
                            >
                              <Download className="h-3.5 w-3.5" /> PDF
                            </a>
                          )}
                        </div>
                      </div>
                    ) : (
                      <Badge variante="amber">Sin responder</Badge>
                    )}
                  </td>
                  <td className="py-3 pr-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => setRespondiendoId(p.id)}
                        className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-blue-600"
                        title={p.respuesta ? "Editar respuesta" : "Generar respuesta"}
                      >
                        <MessageSquareText className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setModo({ tipo: "editar", peticion: p })}
                        className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-blue-600"
                        title="Editar petición"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => eliminar(p)}
                        className="rounded-md p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600"
                        title="Eliminar"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {peticiones.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-sm text-slate-400">
                    No hay peticiones registradas todavía.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {respondiendoId &&
        (() => {
          const peticion = peticiones.find((p) => p.id === respondiendoId);
          if (!peticion) return null;
          return (
            <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-6">
              <div className="mt-10 w-full max-w-2xl">
                <RespuestaFormulario
                  titulo={peticion.respuesta ? `Editar respuesta — ${peticion.respuesta.radicadoSalida}` : `Generar respuesta a ${peticion.radicadoEntrada}`}
                  valorInicial={peticion.respuesta?.texto}
                  onGuardar={(texto) => guardarRespuesta(peticion, texto)}
                  onCancelar={() => setRespondiendoId(null)}
                />
              </div>
            </div>
          );
        })()}
    </div>
  );
}
