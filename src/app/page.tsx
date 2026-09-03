import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { roleHome } from "@/lib/rbac";

export default async function Home() {
  const session = await auth();
  redirect(session?.user ? roleHome(session.user.role) : "/login");
}
