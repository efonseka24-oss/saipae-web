import { redirect } from "next/navigation";
import { obtenerSesion } from "@/lib/auth";
import { Sidebar } from "@/components/layout/Sidebar";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const sesion = await obtenerSesion();
  if (!sesion) {
    redirect("/login");
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-50">
      <Sidebar nombreUsuario={sesion.nombre} modulosPermitidos={sesion.modulosPermitidos} />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-8 py-8">{children}</div>
      </main>
    </div>
  );
}
