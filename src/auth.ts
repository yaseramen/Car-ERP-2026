import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db/client";

declare module "next-auth" {
  interface User {
    id: string;
    email: string;
    name: string;
    role: string;
    companyId?: string | null;
  }

  interface Session {
    user: User;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    role: string;
    companyId?: string | null;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
  trustHost: true,
  providers: [
    Credentials({
      credentials: {
        email: { label: "البريد الإلكتروني", type: "email" },
        password: { label: "كلمة المرور", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const result = await db.execute({
          sql: "SELECT id, email, name, password_hash, role, company_id, is_active, is_blocked FROM users WHERE email = ?",
          args: [String(credentials.email).toLowerCase().trim()],
        });

        const user = result.rows[0];
        if (!user || user.is_active !== 1 || user.is_blocked === 1) return null;

        const valid = await bcrypt.compare(
          String(credentials.password),
          String(user.password_hash)
        );
        if (!valid) return null;

        return {
          id: String(user.id),
          email: String(user.email),
          name: String(user.name),
          role: String(user.role),
          companyId: user.company_id ? String(user.company_id) : null,
        };
      },
    }),
  ],
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.companyId = user.companyId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.companyId = token.companyId ?? null;
      }
      return session;
    },
    redirect({ url, baseUrl }) {
      if (!url.startsWith(baseUrl)) return baseUrl;
      return url;
    },
  },
});
