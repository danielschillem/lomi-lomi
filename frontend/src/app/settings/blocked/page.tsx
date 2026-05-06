"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, ShieldOff, UserX } from "lucide-react";
import { getBlockedUsers, unblockUser } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

interface BlockEntry {
  id: number;
  created_at: string;
  blocked: {
    id: number;
    username: string;
    avatar_url: string;
  };
}

export default function BlockedUsersPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [blocks, setBlocks] = useState<BlockEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [unblocking, setUnblocking] = useState<number | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }
    if (user) {
      getBlockedUsers()
        .then((data) => setBlocks(data as unknown as BlockEntry[]))
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [user, authLoading, router]);

  async function handleUnblock(blockId: number, blockedId: number) {
    setUnblocking(blockedId);
    try {
      await unblockUser(blockId);
      setBlocks((prev) => prev.filter((b) => b.id !== blockId));
    } catch {
      // silent
    } finally {
      setUnblocking(null);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-pink-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-30 bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <Link href="/settings" className="text-gray-600 hover:text-gray-900">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <ShieldOff className="w-5 h-5 text-pink-500" />
        <h1 className="text-lg font-semibold text-gray-900">
          Utilisateurs bloques
        </h1>
      </header>

      <main className="max-w-lg mx-auto p-4 space-y-3">
        {blocks.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <UserX className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>Aucun utilisateur bloque</p>
          </div>
        ) : (
          blocks.map((block) => (
            <div
              key={block.id}
              className="bg-white rounded-xl p-4 flex items-center gap-3 border border-gray-100"
            >
              <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden shrink-0">
                {block.blocked.avatar_url ? (
                  <Image
                    src={block.blocked.avatar_url}
                    alt={block.blocked.username}
                    width={40}
                    height={40}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm font-bold">
                    {block.blocked.username?.[0]?.toUpperCase() || "?"}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">
                  {block.blocked.username}
                </p>
                <p className="text-xs text-gray-400">
                  Bloque le{" "}
                  {new Date(block.created_at).toLocaleDateString("fr-FR")}
                </p>
              </div>
              <button
                onClick={() => handleUnblock(block.id, block.blocked.id)}
                disabled={unblocking === block.blocked.id}
                className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition disabled:opacity-50"
              >
                {unblocking === block.blocked.id ? "..." : "Debloquer"}
              </button>
            </div>
          ))
        )}
      </main>
    </div>
  );
}
