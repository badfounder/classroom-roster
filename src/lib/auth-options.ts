import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { getPool } from "@/lib/db";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const rawEmail = credentials?.email;
        const password = credentials?.password;
        if (!rawEmail || !password || typeof password !== "string") {
          return null;
        }
        const email = String(rawEmail).trim().toLowerCase();
        const pool = getPool();
        const { rows } = await pool.query<{
          id: string;
          email: string;
          password_hash: string;
          name: string | null;
        }>(
          `SELECT id, email, password_hash, name FROM teachers WHERE email = $1`,
          [email]
        );
        const row = rows[0];
        if (!row) return null;
        const ok = await bcrypt.compare(password, row.password_hash);
        if (!ok) return null;
        return {
          id: row.id,
          email: row.email,
          name: row.name ?? undefined,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.email = user.email;
        token.name = user.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string;
        if (token.email) session.user.email = token.email as string;
        session.user.name = token.name as string | null | undefined;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
