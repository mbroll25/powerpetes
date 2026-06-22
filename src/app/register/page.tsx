import { AuthShell } from "@/components/auth/auth-shell";
import { RegisterForm } from "@/components/auth/register-form";

export default function RegisterPage() {
  return (
    <AuthShell
      title="Crear cuenta"
      description="Registrate para entrar a la liga privada de PowerPetes en LAS y guardar tu perfil competitivo."
    >
      <RegisterForm />
    </AuthShell>
  );
}
