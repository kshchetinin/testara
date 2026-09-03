"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_CONFIG, type WorkspaceVariant } from "./nav-config";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export function SidebarNav({ variant }: { variant: WorkspaceVariant }) {
  const pathname = usePathname();
  const items = NAV_CONFIG[variant];

  return (
    <nav className="flex flex-col gap-1">
      {items.map((item) => {
        const isActive = item.href === pathname || (item.href !== "/admin" && item.href !== "/teacher" && item.href !== "/student" && pathname.startsWith(item.href));
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
