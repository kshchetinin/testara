"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/lib/auth";

export interface LoginState {
  error: string | null;
}

export async function loginAction(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const login = formData.get("login");
  const password = formData.get("password");
  const callbackUrl = formData.get("callbackUrl");

  if (typeof login !== "string" || typeof password !== "string" || !login || !password) {
    return { error: "Введите логин и пароль" };
  }

  try {
    // redirectTo must always be a concrete path — leaving it undefined (e.g. when
    // a user opens /login directly, with no callbackUrl to redirect back to) makes
    // Auth.js try to build a fallback URL from the current request context, which
    // fails with "Invalid URL" inside a Server Action. proxy.ts sends an
    // authenticated visitor from "/" to their role's home page anyway.
    await signIn("credentials", {
      login,
      password,
      redirectTo: (typeof callbackUrl === "string" && callbackUrl) || "/",
    });
    return { error: null };
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Неверный логин или пароль" };
    }
    throw error;
  }
}
