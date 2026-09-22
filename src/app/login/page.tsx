import { redirect } from "next/navigation";
import { obtenerSesion } from "@/lib/auth";
import { LoginForm } from "@/components/auth/LoginForm";

export default async function LoginPage() {
  const sesion = await obtenerSesion();
  if (sesion) {
    redirect("/dashboard");
  }

  return <LoginForm />;
}
