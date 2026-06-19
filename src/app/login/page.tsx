import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <AuthShell
      title="Iniciar sesión"
      description="Ingresá a tu cuenta para crear lobbies, seleccionar jugadores y generar equipos balanceados."
    >
      <LoginForm />
    </AuthShell>
  );
}
