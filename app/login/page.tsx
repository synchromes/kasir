import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import LoginForm from "@/components/login-form";
import Image from "next/image";

export const metadata = { title: "Login" };

export default async function LoginPage() {
  const session = await auth();
  if (session) redirect("/");
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-sm rounded-xl border bg-card p-8 shadow-sm">
        <div className="mb-6 text-center">
          <Image src="/logo-kasirku.png" alt="" width={72} height={72} className="mx-auto mb-3 rounded-2xl" />
          <h1 className="font-display text-2xl font-bold">Kasirku</h1>
          <p className="mt-1 text-sm text-muted-foreground">Masuk ke akun Anda</p>
        </div>
        <LoginForm />
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Demo: admin@kasir.com / admin123 · kasir@kasir.com / kasir123
        </p>
      </div>
    </main>
  );
}
