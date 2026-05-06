"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useRef } from "react";
import type { FocusEvent, KeyboardEvent } from "react";
import { Icon, IconName } from "@/components/ui/Icon";
import { useApp } from "@/components/providers/AppProvider";
import { useSignOut } from "@/hooks/use-auth";
import { useMe } from "@/hooks/use-users";
import { Role } from "@/types";

type NavItem = {
  href: string;
  label: string;
  icon: IconName;
  adminOnly?: boolean;
};

type SidebarProps = {
  isExpanded: boolean;
  onExpandedChange: (isExpanded: boolean) => void;
};

export default function Sidebar({
  isExpanded,
  onExpandedChange,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const signOut = useSignOut();
  const { t } = useApp();
  const { data: user } = useMe();
  const sidebarRef = useRef<HTMLElement>(null);

  const navItems: NavItem[] = [
    { href: "/home", label: t.dashboard, icon: "home" },
    { href: "/cases", label: t.cases, icon: "cases" },
    { href: "/cases/new", label: t.newCase, icon: "plus" },
    { href: "/admin/users", label: t.users, icon: "users", adminOnly: true },
    {
      href: "/admin/audit-logs",
      label: t.auditLogs,
      icon: "activity",
      adminOnly: true,
    },
    {
      href: "/admin/cases",
      label: t.adminCases,
      icon: "shield",
      adminOnly: true,
    },
  ];

  const visibleNavItems = navItems.filter(
    (item) => !item.adminOnly || user?.role === Role.ADMIN,
  );

  const activeHref = [...visibleNavItems]
    .sort((a, b) => b.href.length - a.href.length)
    .find((item) =>
      item.href === "/home"
        ? pathname === "/home"
        : pathname === item.href || pathname.startsWith(`${item.href}/`),
    )?.href;

  function closeSidebar() {
    onExpandedChange(false);

    const activeElement = document.activeElement;
    if (
      activeElement instanceof HTMLElement &&
      sidebarRef.current?.contains(activeElement)
    ) {
      activeElement.blur();
    }
  }

  function handleBlur(event: FocusEvent<HTMLElement>) {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      onExpandedChange(false);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Escape") {
      closeSidebar();
    }
  }

  function handleSignOut() {
    closeSidebar();
    signOut();
    router.push("/login");
  }

  return (
    <aside
      ref={sidebarRef}
      className={`app-sidebar desktop-sidebar no-print ${isExpanded ? "is-expanded" : ""}`}
      onPointerEnter={() => onExpandedChange(true)}
      onPointerLeave={() => onExpandedChange(false)}
      onFocus={() => onExpandedChange(true)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
    >
      <Link
        href="/home"
        className="sidebar-brand"
        title={t.appShortName}
        onClick={closeSidebar}
      >
        <div className="sidebar-brand-mark">
          <Icon name="tree" size={22} />
        </div>
        <div className="sidebar-copy">
          <p className="sidebar-brand-name">{t.appShortName}</p>
          <p className="sidebar-brand-tag">{t.brandTag}</p>
        </div>
      </Link>

      <nav className="sidebar-nav">
        {visibleNavItems.map((item) => {
            const isActive = item.href === activeHref;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`sidebar-link ${isActive ? "is-active" : ""}`}
                title={item.label}
                onClick={closeSidebar}
              >
                <Icon name={item.icon} size={18} />
                <span className="sidebar-link-label">{item.label}</span>
                <span className="sidebar-link-glow" aria-hidden="true" />
              </Link>
            );
          })}
      </nav>

      <div className="sidebar-user">
        <div className="sidebar-user-main">
          <div className="sidebar-avatar">
            {(user?.name ?? "U").slice(0, 1).toUpperCase()}
          </div>
          <div className="sidebar-copy sidebar-user-copy">
            <p className="sidebar-user-name">{user?.name ?? t.profile}</p>
            <p className="sidebar-user-email">{user?.email ?? ""}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleSignOut}
          className="sidebar-signout"
          title={t.logout}
        >
          <Icon name="logout" size={16} />
          <span className="sidebar-link-label">{t.logout}</span>
        </button>
      </div>
    </aside>
  );
}
