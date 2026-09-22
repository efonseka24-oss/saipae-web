"use client";

import { useState } from "react";
import clsx from "clsx";
import {
  Map,
  Package,
  Globe2,
  Building,
  School,
  DoorOpen,
  Truck,
  Warehouse,
} from "lucide-react";
import type { Departamento, Lote, Zode, Municipio, Institucion, Sede, Operador, Bodega } from "@/components/registro/tipos";
import { DepartamentosTab } from "@/components/registro/DepartamentosTab";
import { LotesTab } from "@/components/registro/LotesTab";
import { ZodesTab } from "@/components/registro/ZodesTab";
import { MunicipiosTab } from "@/components/registro/MunicipiosTab";
import { InstitucionesTab } from "@/components/registro/InstitucionesTab";
import { SedesTab } from "@/components/registro/SedesTab";
import { OperadoresTab } from "@/components/registro/OperadoresTab";
import { BodegasTab } from "@/components/registro/BodegasTab";
import { CargaMasivaRegistro } from "@/components/registro/CargaMasivaRegistro";

const PESTANAS = [
  { id: "departamentos", etiqueta: "Departamentos", icono: Map },
  { id: "lotes", etiqueta: "Lotes", icono: Package },
  { id: "zodes", etiqueta: "Zodes", icono: Globe2 },
  { id: "municipios", etiqueta: "Municipios", icono: Building },
  { id: "instituciones", etiqueta: "Instituciones", icono: School },
  { id: "sedes", etiqueta: "Sedes", icono: DoorOpen },
  { id: "operadores", etiqueta: "Operadores", icono: Truck },
  { id: "bodegas", etiqueta: "Bodegas", icono: Warehouse },
] as const;

type PestanaId = (typeof PESTANAS)[number]["id"];

export function RegistroManager({
  departamentos,
  lotes,
  zodes,
  municipios,
  instituciones,
  sedes,
  operadores,
  bodegas,
}: {
  departamentos: Departamento[];
  lotes: Lote[];
  zodes: Zode[];
  municipios: Municipio[];
  instituciones: Institucion[];
  sedes: Sede[];
  operadores: Operador[];
  bodegas: Bodega[];
}) {
  const [activa, setActiva] = useState<PestanaId>("departamentos");

  return (
    <div>
      <div className="mb-6">
        <CargaMasivaRegistro />
      </div>

      <div className="mb-6 flex flex-wrap gap-1.5 border-b border-slate-200">
        {PESTANAS.map((p) => {
          const Icono = p.icono;
          return (
            <button
              key={p.id}
              onClick={() => setActiva(p.id)}
              className={clsx(
                "flex items-center gap-1.5 rounded-t-lg px-3 py-2 text-sm font-medium transition-colors",
                activa === p.id
                  ? "border-b-2 border-blue-600 text-blue-600"
                  : "text-slate-500 hover:text-slate-700"
              )}
            >
              <Icono className="h-4 w-4" />
              {p.etiqueta}
            </button>
          );
        })}
      </div>

      {activa === "departamentos" && <DepartamentosTab departamentos={departamentos} />}
      {activa === "lotes" && <LotesTab lotes={lotes} departamentos={departamentos} />}
      {activa === "zodes" && <ZodesTab zodes={zodes} lotes={lotes} />}
      {activa === "municipios" && <MunicipiosTab municipios={municipios} zodes={zodes} />}
      {activa === "instituciones" && (
        <InstitucionesTab instituciones={instituciones} municipios={municipios} lotes={lotes} zodes={zodes} />
      )}
      {activa === "sedes" && (
        <SedesTab sedes={sedes} instituciones={instituciones} lotes={lotes} zodes={zodes} municipios={municipios} />
      )}
      {activa === "operadores" && <OperadoresTab operadores={operadores} zodes={zodes} />}
      {activa === "bodegas" && <BodegasTab bodegas={bodegas} operadores={operadores} />}
    </div>
  );
}
