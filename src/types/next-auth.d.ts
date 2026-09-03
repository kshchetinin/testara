import type { Role } from "@/generated/prisma/enums";

declare module "next-auth" {
  interface User {
    id: string;
    role: Role;
    login: string;
  }

  interface Session {
    user: {
      id: string;
      role: Role;
      login: string;
      name: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    login: string;
  }
}
