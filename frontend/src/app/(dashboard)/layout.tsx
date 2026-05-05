"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";
import { AUTH_TOKEN_EVENT, authService } from "@/services";

function subscribeToAuth(callback: () => void) {
  if (typeof window === "undefined") return () => {};

  const handleStorage = (event: StorageEvent) => {
    if (event.key === "auth_token") callback();
  };
  const handleAuthChange = () => callback();

  window.addEventListener("storage", handleStorage);
  window.addEventListener(AUTH_TOKEN_EVENT, handleAuthChange);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(AUTH_TOKEN_EVENT, handleAuthChange);
  };
}

function getAuthSnapshot() {
  return authService.isAuthenticated();
}

function getAuthServerSnapshot() {
  return null as boolean | null;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const isAuthenticated = useSyncExternalStore(
    subscribeToAuth,
    getAuthSnapshot,
    getAuthServerSnapshot,
  );

  useEffect(() => {
    if (isAuthenticated === false) {
      router.replace("/login");
    }
  }, [isAuthenticated, router]);

  if (isAuthenticated !== true) {
    return <div className="min-h-screen bg-[var(--bg)]" />;
  }

  return (
    <div className={`app-shell ${isSidebarExpanded ? "sidebar-expanded" : ""}`}>
      <Sidebar
        isExpanded={isSidebarExpanded}
        onExpandedChange={setIsSidebarExpanded}
      />
      <div className="app-content">
        <Header />
        <main className="app-main px-4 py-5 lg:pe-6">{children}</main>
      </div>
    </div>
  );
}
