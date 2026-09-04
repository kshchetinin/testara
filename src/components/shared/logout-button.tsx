import { LogOut } from "lucide-react";
import { signOutAction } from "@/lib/actions/sign-out";

export function LogoutButton() {
  return (
    <form action={signOutAction}>
      <button
        type="submit"
        className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <LogOut className="h-4 w-4" />
        Выйти
      </button>
    </form>
  );
}
