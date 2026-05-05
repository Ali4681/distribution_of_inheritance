"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { authService } from "@/services";

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace(authService.isAuthenticated() ? "/home" : "/login");
  }, [router]);

  return <div className="min-h-screen bg-[var(--bg)]" />;
}
