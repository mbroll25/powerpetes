import { AuthShell } from "@/components/auth/auth-shell";
import { RegisterForm } from "@/components/auth/register-form";

export default function RegisterPage() {
  return (
    <AuthShell
      title="Crear cuenta"
      description="Registrate para guardar tu perfil, rol principal, rol secundario y nivel competitivo."
    >
      <RegisterForm />
    </AuthShell>
  );
}
