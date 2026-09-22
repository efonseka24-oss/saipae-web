import { redirect } from "next/navigation";
import { obtenerSesion } from "@/lib/auth";
import { RestablecerClaveForm } from "@/components/auth/RestablecerClaveForm";

export default async function RecuperarClavePage() {
  const sesion = await obtenerSesion();
  if (sesion) {
    redirect("/dashboard");
  }

  return <RestablecerClaveForm />;
}
