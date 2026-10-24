"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Download, Search } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { FiltroUbicacion, type ValorFiltroUbicacion } from "@/components/shared/FiltroUbicacion";
import { EstudianteSimatFormulario, type DatosFormularioSimat } from "@/components/simat/EstudianteSimatFormulario";
import { CargaMasivaSimat } from "@/components/simat/CargaMasivaSimat";
import { CargaPae } from "@/components/simat/CargaPae";
import type { Lote, Zode, Municipio, Institucion, Sede, EstudianteSimat } from "@/components/simat/tipos";
import type { FiltrosSimat } from "@/lib/simat";

type Modo = { tipo: "cerrado" } | { tipo: "crear" } | { tipo: "editar"; estudiante: EstudianteSimat };

const CLASE_CAMPO =
  "rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";

// Arma la URL de la pantalla con los filtros dados (los vacíos no se incluyen).
function consulta(filtros: FiltrosSimat & { pagina?: number }): string {
  const busqueda = new URLSearchParams();
  for (const [clave, valor] of Object.entries(filtros)) {
    if (valor !== undefined && valor !== "" && !(clave === "pagina" && valor === 1)) busqueda.set(clave, String(valor));
  }
  const texto = busqueda.toString();
  return texto ? `?${texto}` : "";
}

export function SimatManager({
  estudiantes,
  total,
  totalGeneral,
  pagina,
  paginas,
  filtros,
  lotes,
  zodes,
  municipios,
  instituciones,
  sedes,
}: {
  estudiantes: EstudianteSimat[];
  total: number;
  totalGeneral: number;
  pagina: number;
  paginas: number;
  filtros: FiltrosSimat;
  lotes: Lote[];
  zodes: Zode[];
  municipios: Municipio[];
  instituciones: Institucion[];
  sedes: Sede[];
}) {
  const router = useRouter();
  const [modo, setModo] = useState<Modo>({ tipo: "cerrado" });
  const [texto, setTexto] = useState(filtros.q ?? "");

  const ubicacion: ValorFiltroUbicacion = {
    loteId: filtros.loteId ?? "",
    zodeId: filtros.zodeId ?? "",
    municipioId: filtros.municipioId ?? "",
    institucionId: filtros.institucionId ?? "",
  };

  function aplicarFiltros(nuevos: FiltrosSimat) {
    router.push(`/simat${consulta({ ...nuevos })}`);
  }

  async function guardar(url: string, metodo: "POST" | "PATCH", datos: DatosFormularioSimat): Promise<string | null> {
    const respuesta = await fetch(url, {
      method: metodo,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(datos),
    });
    if (!respuesta.ok) {
      const cuerpo = await respuesta.json();
      return cuerpo.error ?? "No se pudo guardar.";
    }
    setModo({ tipo: "cerrado" });
    router.refresh();
    return null;
  }

  async function eliminar(estudiante: EstudianteSimat) {
    if (!confirm(`¿Eliminar a "${estudiante.nombre}" del SIMAT?`)) return;
    const respuesta = await fetch(`/api/simat/${estudiante.id}`, { method: "DELETE" });
    if (!respuesta.ok) {
      const cuerpo = await respuesta.json();
      alert(cuerpo.error ?? "No se pudo eliminar.");
      return;
    }
    router.refresh();
  }

  if (sedes.length === 0) {
    return (
      <Card>
        <p className="text-sm text-slate-500">
          Primero completa el catálogo (zode, municipio, institución y sede) en{" "}
          <a href="/registro" className="font-medium text-blue-600 hover:text-blue-700">
            Registro
          </a>
          .
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {modo.tipo === "crear" && (
        <EstudianteSimatFormulario
          titulo="Nuevo estudiante"
          lotes={lotes}
          zodes={zodes}
          municipios={municipios}
          instituciones={instituciones}
          sedes={sedes}
          onGuardar={(datos) => guardar("/api/simat", "POST", datos)}
          onCancelar={() => setModo({ tipo: "cerrado" })}
        />
      )}
      {modo.tipo === "editar" && (
        <EstudianteSimatFormulario
          key={modo.estudiante.id}
          titulo="Editar estudiante"
          lotes={lotes}
          zodes={zodes}
          municipios={municipios}
          instituciones={instituciones}
          sedes={sedes}
          valoresIniciales={modo.estudiante}
          onGuardar={(datos) => guardar(`/api/simat/${modo.estudiante.id}`, "PATCH", datos)}
          onCancelar={() => setModo({ tipo: "cerrado" })}
        />
      )}
      {modo.tipo === "cerrado" && (
        <div className="flex flex-wrap items-start gap-3">
          <Button onClick={() => setModo({ tipo: "crear" })}>
            <Plus className="h-4 w-4" />
            Nuevo estudiante
          </Button>
          <CargaMasivaSimat />
          <CargaPae tipo="beneficiarios" />
          <CargaPae tipo="entregas" />
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Estudiantes</CardTitle>
          <div className="flex items-center gap-3">
            <Badge variante="slate">
              {total.toLocaleString("es-CO")} de {totalGeneral.toLocaleString("es-CO")} estudiante(s)
            </Badge>
            <a
              href={`/api/simat/csv${consulta(filtros)}`}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              <Download className="h-4 w-4" /> Exportar CSV
            </a>
          </div>
        </CardHeader>

        <FiltroUbicacion
          lotes={lotes}
          zodes={zodes}
          municipios={municipios}
          instituciones={instituciones}
          value={ubicacion}
          onChange={(valor) => aplicarFiltros({ ...valor, q: filtros.q, pae: filtros.pae })}
        />
        <form
          onSubmit={(e) => {
            e.preventDefault();
            aplicarFiltros({ ...filtros, q: texto.trim() || undefined });
          }}
          className="mb-4 flex gap-2"
        >
          <input
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Buscar por ID, documento o nombre"
            className={`${CLASE_CAMPO} w-full max-w-sm`}
          />
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={Boolean(filtros.pae)} onChange={(e) => aplicarFiltros({ ...filtros, pae: e.target.checked ? "1" : undefined })} />
            Solo beneficiarios PAE
          </label>
          <Button type="submit" variante="outline">
            <Search className="h-4 w-4" /> Buscar
          </Button>
        </form>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="py-2 pr-4">ID</th>
                <th className="py-2 pr-4">Documento</th>
                <th className="py-2 pr-4">Nombre</th>
                <th className="py-2 pr-4">Sede / Institución</th>
                <th className="py-2 pr-4">Municipio</th>
                <th className="py-2 pr-4">Zode / Lote</th>
                <th className="py-2 pr-4">PAE</th>
                <th className="py-2 pr-4">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {estudiantes.map((e) => (
                <tr key={e.id} className="border-b border-slate-100 last:border-0">
                  <td className="py-3 pr-4 font-mono text-xs text-slate-600">{e.idSimat}</td>
                  <td className="py-3 pr-4 text-slate-600">{e.numeroDocumento}</td>
                  <td className="py-3 pr-4 font-medium text-slate-900">{e.nombre}</td>
                  <td className="py-3 pr-4">
                    <p className="text-slate-700">{e.sede.nombre}</p>
                    <p className="text-xs text-slate-500">{e.institucion.nombre}</p>
                  </td>
                  <td className="py-3 pr-4 text-slate-600">{e.municipio.nombre}</td>
                  <td className="py-3 pr-4 text-slate-600">
                    {e.municipio.zode.nombre}
                    <br />
                    <span className="text-xs text-slate-400">{e.municipio.zode.lote.nombre}</span>
                  </td>
                  <td className="py-3 pr-4">
                    {e.beneficiarioPae ? (
                      <>
                        <Badge variante="green">Beneficiario</Badge>
                        <p className="mt-1 text-xs text-slate-500">{e._count.entregas.toLocaleString("es-CO")} entrega(s)</p>
                      </>
                    ) : (
                      <span className="text-xs text-slate-400">No</span>
                    )}
                  </td>
                  <td className="py-3 pr-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => setModo({ tipo: "editar", estudiante: e })}
                        className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-blue-600"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button onClick={() => eliminar(e)} className="rounded-md p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {estudiantes.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-sm text-slate-400">
                    {totalGeneral === 0 ? "No hay estudiantes registrados todavía." : "Ningún estudiante coincide con el filtro."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {paginas > 1 && (
          <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
            <span>
              Página {pagina} de {paginas}
            </span>
            <div className="flex gap-2">
              {pagina > 1 && (
                <Link href={`/simat${consulta({ ...filtros, pagina: pagina - 1 })}`} className="rounded-lg border border-slate-300 px-3 py-1.5 hover:bg-slate-50">
                  Anterior
                </Link>
              )}
              {pagina < paginas && (
                <Link href={`/simat${consulta({ ...filtros, pagina: pagina + 1 })}`} className="rounded-lg border border-slate-300 px-3 py-1.5 hover:bg-slate-50">
                  Siguiente
                </Link>
              )}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
