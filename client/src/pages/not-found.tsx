import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-black p-4">
      <div className="flex flex-col items-center gap-6 text-center max-w-md">
        <div className="text-7xl select-none">🤔</div>
        <div className="space-y-2">
          <h1 className="text-2xl font-black text-white">Hmm, we could not find this page</h1>
          <p className="text-gray-500 text-sm">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>
        <Link href="/">
          <button
            className="px-6 py-2.5 rounded-xl border border-white/30 bg-transparent text-white font-bold text-sm transition-all duration-200 hover:bg-white hover:text-black hover:border-white"
            style={{ opacity: 1 }}
          >
            Return Home
          </button>
        </Link>
      </div>
    </div>
  );
}
