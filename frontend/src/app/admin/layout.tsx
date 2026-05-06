"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

export default function AdminLayout() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Redirect /admin/* to /dashboard/*
    const newPath = pathname.replace(/^\/admin/, "/dashboard") || "/dashboard";
    router.replace(newPath);
  }, [pathname, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="animate-pulse text-muted">Redirection...</div>
    </div>
  );
}
