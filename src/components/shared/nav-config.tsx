import { LayoutDashboard, Users, UsersRound, FileText, ClipboardList, BarChart3, ScrollText } from "lucide-react";
import type { NavItem } from "./sidebar-nav";

export const NAV_CONFIG = {
  admin: [
    { href: "/admin", label: "Дашборд", icon: LayoutDashboard },
    { href: "/admin/users", label: "Пользователи", icon: Users },
    { href: "/admin/groups", label: "Группы", icon: UsersRound },
    { href: "/admin/tests", label: "Тесты", icon: FileText },
    { href: "/admin/assignments", label: "Назначения", icon: ClipboardList },
    { href: "/admin/results", label: "Результаты", icon: BarChart3 },
    { href: "/admin/audit", label: "Журнал аудита", icon: ScrollText },
  ],
  teacher: [
    { href: "/teacher", label: "Дашборд", icon: LayoutDashboard },
    { href: "/teacher/tests", label: "Тесты", icon: FileText },
    { href: "/teacher/assignments", label: "Назначения", icon: ClipboardList },
    { href: "/teacher/results", label: "Результаты", icon: BarChart3 },
    { href: "/teacher/groups", label: "Группы", icon: UsersRound },
  ],
  student: [{ href: "/student", label: "Мои тесты", icon: LayoutDashboard }],
} satisfies Record<string, NavItem[]>;

export type WorkspaceVariant = keyof typeof NAV_CONFIG;
