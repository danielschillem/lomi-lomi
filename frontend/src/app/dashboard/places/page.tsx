"use client";

import { useAuth } from "@/lib/auth-context";
import AdminView from "./admin-view";
import OwnerView from "./owner-view";

export default function PlacesPage() {
  const { user } = useAuth();

  if (user?.role === "admin") return <AdminView />;
  return <OwnerView />;
}
