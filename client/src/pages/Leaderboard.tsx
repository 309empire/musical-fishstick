import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, Crown, Trophy, Zap } from "lucide-react";

const TABS = [
  { key: "global", label: "Global", desc: "All-time views", icon: Crown, queryKey: "/api/leaderboard" },
  { key: "weekly", label: "Week", desc: "Last 7 days", icon: Trophy, queryKey: "/api/leaderboard/weekly" },
  { key: "daily", label: "Daily", desc: "Today", icon: Zap, queryKey: "/api/leaderboard/daily" },
];

const RANK_COLORS = ["#f97316", "#a855f7", "#3b82f6"];
const RANK_LABELS = ["1st", "2nd", "3rd"];

function resolveAvatar(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  return url;
}

function RoleTag({ role }: { role: string }) {
  if (role === "owner") return <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-red-500/20 text-red-400">Owner</span>;
  if (role === "admin") return <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-orange-500/20 text-orange-400">Admin</span>;
  return null;
}

interface LeaderboardEntry {
  id: number;
  username: string;
  role: string;
  views: number;
  displayName: string;
  avatarUrl: string | null;
}

export default function Leaderboard() {
  const [activeTab, setActiveTab] = useState("global");
  const tab = TABS.find(t => t.key === activeTab)!;

  const { data: entries, isLoading } = useQuery<LeaderboardEntry[]>({
    queryKey: [tab.queryKey],
  });

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <header className="border-b border-white/[0.04] bg-[#050505]/90 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <a href="/" className="text-xl font-black text-orange-500 tracking-tighter">Hexed</a>
          <div className="flex items-center gap-4">
            <a href="/changes" className="text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-gray-300 transition-colors">Changes</a>
            <a href="/login" className="text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-orange-500 transition-colors">Login</a>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-12">
        <div className="mb-10 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-orange-500/70 mb-2">Rankings</p>
          <h1 className="text-4xl font-black tracking-tight">Leaderboard</h1>
          <p className="text-gray-500 text-sm mt-2">Top profiles by views</p>
        </div>

        <div className="flex justify-center mb-8">
          <div className="flex gap-1 p-1 bg-[#0e0e0e] border border-white/[0.06] rounded-2xl">
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`relative px-5 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === t.key ? "bg-orange-500 text-black" : "text-gray-500 hover:text-white"}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.18 }}
          >
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-16 bg-[#0e0e0e] border border-white/[0.04] rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : !entries || entries.length === 0 ? (
              <div className="text-center py-24">
                <p className="text-5xl mb-4">🏆</p>
                <p className="text-gray-500 font-bold">Seems empty here...</p>
                <p className="text-gray-600 text-sm mt-1">Be the first to get views!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {entries.map((entry, index) => {
                  const rankColor = RANK_COLORS[index] ?? "#555";
                  const isTop3 = index < 3;
                  const avatar = resolveAvatar(entry.avatarUrl);

                  return (
                    <motion.a
                      key={entry.id}
                      href={`/${entry.username}`}
                      target="_blank"
                      rel="noreferrer"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.04, duration: 0.18 }}
                      className={`flex items-center gap-4 p-4 rounded-2xl border transition-all group ${isTop3 ? "bg-[#0e0e0e] border-white/[0.06] hover:border-orange-500/20" : "bg-[#080808] border-white/[0.04] hover:bg-[#0e0e0e]"}`}
                      style={isTop3 ? { boxShadow: `inset 0 0 40px ${rankColor}08` } : {}}
                    >
                      <div className="w-9 flex items-center justify-center shrink-0">
                        {isTop3 ? (
                          <span className="text-sm font-black" style={{ color: rankColor }}>{RANK_LABELS[index]}</span>
                        ) : (
                          <span className="text-[12px] font-black text-gray-600">#{index + 1}</span>
                        )}
                      </div>

                      <div className="w-10 h-10 rounded-full border border-white/10 overflow-hidden shrink-0 flex items-center justify-center bg-orange-500/10">
                        {avatar ? (
                          <img src={avatar} alt={entry.displayName} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-orange-500 font-black text-sm">{(entry.displayName || entry.username)[0].toUpperCase()}</span>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-black text-sm truncate">{entry.displayName || entry.username}</span>
                          <RoleTag role={entry.role} />
                        </div>
                        <span className="text-[10px] text-gray-600">@{entry.username}</span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <Eye className="w-3 h-3 text-gray-600" />
                        <span className="text-sm font-black" style={{ color: isTop3 ? rankColor : "#888" }}>
                          {entry.views.toLocaleString()}
                        </span>
                      </div>
                    </motion.a>
                  );
                })}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {entries && entries.length > 0 && (
          <p className="text-center text-[10px] text-gray-700 mt-8 uppercase font-bold tracking-widest">{tab.desc} · Top {entries.length}</p>
        )}
      </main>
    </div>
  );
}
