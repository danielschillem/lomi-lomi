import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-7xl font-bold bg-linear-to-r from-violet-400 to-pink-500 bg-clip-text text-transparent mb-4">
          404
        </h1>
        <h2 className="text-xl font-semibold mb-2">Page introuvable</h2>
        <p className="text-zinc-400 text-sm mb-8 max-w-sm mx-auto">
          La page que vous recherchez n&apos;existe pas ou a été déplacée.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link
            href="/"
            className="bg-violet-600 hover:bg-violet-700 text-white font-semibold px-6 py-3 rounded-lg transition text-sm"
          >
            Retour à l&apos;accueil
          </Link>
          <Link
            href="/discover"
            className="border border-zinc-700 text-zinc-300 hover:text-white px-6 py-3 rounded-lg transition text-sm"
          >
            Découvrir
          </Link>
        </div>
      </div>
    </div>
  );
}
