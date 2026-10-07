import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;
        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email.toLowerCase() },
        });
        if (!user || !user.active) return null;
        // Lockout: setelah 5x gagal, akun terkunci dengan durasi eksponensial
        // (15m → 30m → 1j → 2j → ... , maks 24 jam). Tidak menambah counter
        // selama masih terkunci agar masa kunci tidak diperpanjang.
        if (user.lockUntil && user.lockUntil > new Date()) return null;
        const valid = await bcrypt.compare(parsed.data.password, user.password);
        if (!valid) {
          const now = new Date();
          const attempts = user.failedLoginAttempts + 1;
          if (attempts >= 5) {
            const lockMs = Math.min(15 * 60_000 * Math.pow(2, attempts - 5), 24 * 3_600_000);
            await prisma.user.update({
              where: { id: user.id },
              data: { failedLoginAttempts: attempts, lockUntil: new Date(now.getTime() + lockMs) },
            });
          } else {
            await prisma.user.update({
              where: { id: user.id },
              data: { failedLoginAttempts: attempts },
            });
          }
          return null;
        }
        // Login sukses: reset counter & kunci.
        await prisma.user.update({
          where: { id: user.id },
          data: { failedLoginAttempts: 0, lockUntil: null },
        });
        return { id: String(user.id), email: user.email, name: user.name, role: user.role };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role: string }).role;
        token.id = user.id;
        token.name = user.name;
      }
      // Re-validasi ke DB setiap request: akun yang dinonaktifkan, dihapus,
      // atau role-nya berubah langsung kehilangan sesi (token lama tidak lagi
      // dipercaya; role/name di-stempel ulang dari sumber kebenaran).
      const id = Number(token.id ?? token.sub);
      if (!Number.isInteger(id)) return null;
      const dbUser = await prisma.user.findUnique({
        where: { id },
        select: { active: true, role: true, name: true },
      });
      if (!dbUser || !dbUser.active) return null;
      token.role = dbUser.role;
      token.name = dbUser.name;
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
});

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: string;
    };
  }
}