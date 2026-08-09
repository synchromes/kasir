import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import LoginForm from "@/components/login-form";

export const metadata = { title: "Login" };

export default async function LoginPage() {
  const session = await auth();
  if (session) redirect("/");
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-sm rounded-xl border bg-card p-8 shadow-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-accent text-2xl text-accent-foreground font-bold">
            K
          </div>
          <h1 className="font-display text-2xl font-bold">Aplikasi Kasir</h1>
          <p className="mt-1 text-sm text-muted-foreground">Masuk ke akun Anda</p>
        </div>
        <LoginForm />
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Demo: admin@kasir.com / admin123 · kasir@kasir.com / kasir123
        </p>
      </div>
    </div>
  );
}