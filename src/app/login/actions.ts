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
    await signIn("credentials", {
      login,
      password,
      redirectTo: typeof callbackUrl === "string" && callbackUrl ? callbackUrl : undefined,
    });
    return { error: null };
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Неверный логин или пароль" };
    }
    throw error;
  }
}
