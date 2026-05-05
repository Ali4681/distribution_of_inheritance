"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { useApp } from "@/components/providers/AppProvider";

export default function Header() {
  const pathname = usePathname();
  const { t, theme, locale, toggleTheme, toggleLocale } = useApp();

  const title = (() => {
    if (pathname.startsWith("/cases/new")) return t.newCase;
    if (pathname.startsWith("/cases/")) return t.familyTree;
    if (pathname.startsWith("/cases")) return t.cases;
    if (pathname.startsWith("/admin/users")) return t.users;
    if (pathname.startsWith("/admin/cases")) return t.adminCases;
    return t.dashboard;
  })();

  return (
    <header className="app-header no-print">
      <div className="app-header-inner">
        <div className="app-header-title">
          <Link
            href="/home"
            className="app-header-mark"
            title={t.dashboard}
          >
            <Icon name="tree" />
          </Link>
          <div>
            <p className="app-header-kicker">
              {t.appName}
            </p>
            <h1 key={title} className="app-header-heading">
              {title}
            </h1>
          </div>
        </div>

        <div className="app-header-actions">
          <button
            type="button"
            onClick={toggleLocale}
            className="app-header-button"
            title={t.language}
          >
            <Icon name="globe" size={16} />
            <span>{locale === "en" ? "EN" : "AR"}</span>
          </button>
          <button
            type="button"
            onClick={toggleTheme}
            className="app-header-button"
            title={t.theme}
          >
            <Icon name={theme === "light" ? "sun" : "moon"} size={16} />
            <span>{theme === "light" ? t.light : t.dark}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
