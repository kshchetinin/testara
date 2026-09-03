import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  // The app sits behind Nginx (reverse proxy) in production, so Auth.js sees
  // requests as coming from a proxy rather than the trusted NEXTAUTH_URL host
  // directly — without this it rejects every request with UntrustedHost.
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        login: { label: "Логин", type: "text" },
        password: { label: "Пароль", type: "password" },
      },
      authorize: async (credentials) => {
        const login = credentials?.login;
        const password = credentials?.password;
        if (typeof login !== "string" || typeof password !== "string" || !login || !password) {
          return null;
        }

        const user = await prisma.user.findUnique({ where: { login } });
        if (!user || user.status !== "ACTIVE") {
          return null;
        }

        const passwordValid = await bcrypt.compare(password, user.passwordHash);
        if (!passwordValid) {
          return null;
        }

        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        const fullName = [user.lastName, user.firstName, user.middleName].filter(Boolean).join(" ");

        return {
          id: user.id,
          name: fullName,
          role: user.role,
          login: user.login,
        };
      },
    }),
  ],
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.login = user.login;
      }
      return token;
    },
    session: async ({ session, token }) => {
      session.user.id = token.id;
      session.user.role = token.role;
      session.user.login = token.login;
      return session;
    },
  },
});
