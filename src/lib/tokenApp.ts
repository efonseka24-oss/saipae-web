import type { NextRequest } from "next/server";

// Las rutas /api/app/* las usa la app móvil, que no tiene sesión del panel:
// se autentica con el token fijo APP_API_TOKEN ("Authorization: Bearer <token>").
export function tokenAppValido(request: NextRequest): boolean {
  const esperado = process.env.APP_API_TOKEN;
  if (!esperado) return false;
  const recibido = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  return recibido === esperado;
}
