// Sesión del usuario solo si tiene permitido el módulo Administrador (para
// las rutas de auditoría y copias de seguridad).
import { obtenerSesion, type SesionUsuario } from "@/lib/auth";
import { tieneAccesoModulo } from "@/lib/permisosModulos";

export async function sesionAdministrador(): Promise<SesionUsuario | null> {
  const sesion = await obtenerSesion();
  if (!sesion || !tieneAccesoModulo(sesion.modulosPermitidos, "administrador")) return null;
  return sesion;
}
