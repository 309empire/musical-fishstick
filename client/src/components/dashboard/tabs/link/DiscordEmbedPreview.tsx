import { useState, useEffect } from "react";
import { SiDiscord } from "react-icons/si";

export function DiscordEmbedPreview({ url }: { url: string }) {
  const [server, setServer] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const raw = (url || "").trim();
    const code = raw
      .replace(/https?:\/\/discord\.gg\//i, "")
      .replace(/https?:\/\/discord\.com\/invite\//i, "")
      .replace(/\?.*/, "")
      .trim();
    if (!code) { setLoading(false); return; }
    fetch(`/api/discord-invite/${code}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { setServer(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [url]);

  if (loading) return (
    <div className="mt-3 flex items-center gap-3 p-3 rounded-xl border border-[#5865F2]/20 bg-[#5865F2]/5 animate-pulse">
      <div className="w-10 h-10 rounded-full bg-white/10 shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3 bg-white/10 rounded w-28" />
        <div className="h-2.5 bg-white/5 rounded w-20" />
      </div>
      <div className="w-14 h-7 bg-white/10 rounded-lg" />
    </div>
  );

  if (!server?.name) return null;

  const joinUrl = `https://discord.gg/${server.code}`;
  return (
    <a href={joinUrl} target="_blank" rel="noreferrer"
      className="mt-3 flex items-center gap-3 p-3 rounded-xl border border-[#5865F2]/30 bg-[#5865F2]/8 hover:bg-[#5865F2]/12 transition-colors">
      {server.icon
        ? <img src={server.icon} alt="" className="w-10 h-10 rounded-full shrink-0" />
        : <div className="w-10 h-10 rounded-full bg-[#5865F2]/20 flex items-center justify-center shrink-0">
            <span className="text-[#5865F2] font-black text-base">{server.name[0]}</span>
          </div>
      }
      <div className="flex-1 min-w-0">
        <p className="font-black text-sm truncate">{server.name}</p>
        <p className="text-[11px] text-gray-500">
          <span className="text-green-400 font-bold">{server.onlineCount?.toLocaleString() ?? "?"}</span> online
          {" · "}
          <span className="font-bold text-gray-400">{server.memberCount?.toLocaleString() ?? "?"}</span> members
        </p>
      </div>
      <span className="px-3 py-1.5 bg-[#5865F2] hover:bg-[#4752c4] text-white font-black rounded-lg text-xs transition-colors shrink-0">
        Join
      </span>
    </a>
  );
}
