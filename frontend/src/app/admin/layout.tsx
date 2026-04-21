"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Redirect /admin/* to /dashboard/*
    const newPath = pathname.replace(/^\/admin/, "/dashboard") || "/dashboard";
    router.replace(newPath);
  }, [pathname, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950">
      <div className="animate-pulse text-zinc-400">Redirection...</div>
    </div>
  );
}
