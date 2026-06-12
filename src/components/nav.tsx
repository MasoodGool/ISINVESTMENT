"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Building2,
  LayoutDashboard,
  FileText,
  LogOut,
  Users,
  CalendarCheck,
  BarChart3,
  Settings,
  ScrollText,
} from "lucide-react";

const items = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/properties", label: "Properties", icon: Building2 },
  { href: "/tenants", label: "Tenants", icon: Users },
  { href: "/rent-roll", label: "Rent roll", icon: CalendarCheck },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/tax", label: "Tax report", icon: FileText },
];

const adminItems = [
  { href: "/settings/users", label: "Users", icon: Settings },
  { href: "/settings/audit", label: "Audit", icon: ScrollText },
];

export interface NavUser {
  name: string;
  email: string;
  role: string;
}

export function Nav({ user }: { user: NavUser }) {
  const pathname = usePathname();
  const navItems = user.role === "ADMIN" ? [...items, ...adminItems] : items;

  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto max-w-6xl px-6 py-3 flex items-center gap-6">
        <Link href="/" className="font-semibold tracking-tight text-zinc-900">
          ISINVESTMENT
        </Link>
        <nav className="flex flex-wrap items-center gap-1">
          {navItems.map((it) => {
            const active =
              it.href === "/"
                ? pathname === "/"
                : pathname === it.href || pathname.startsWith(`${it.href}/`);
            const Icon = it.icon;
            return (
              <Link
                key={it.href}
                href={it.href}
                className={cn(
                  "inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium",
                  active
                    ? "bg-zinc-100 text-zinc-900"
                    : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50",
                )}
              >
                <Icon className="h-4 w-4" />
                {it.label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <div className="hidden sm:block text-right leading-tight">
            <div className="text-sm font-medium text-zinc-900">{user.name}</div>
            <div className="text-xs text-zinc-500">
              {user.role === "ADMIN"
                ? "Administrator"
                : user.role === "VIEWER"
                  ? "Viewer"
                  : "Manager"}
            </div>
          </div>
          <form action="/api/logout" method="post">
            <button
              type="submit"
              title="Sign out"
              className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50"
            >
              <LogOut className="h-4 w-4" />
              <span className="sr-only sm:not-sr-only">Logout</span>
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
