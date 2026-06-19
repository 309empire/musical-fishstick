import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, Link as LinkIcon } from "lucide-react";
import { SiDiscord } from "react-icons/si";
import { PLATFORMS } from "@/components/dashboard/platforms";

interface Props {
  selectedPlatform: string | null;
  platformSearch: string;
  setPlatformSearch: (v: string) => void;
  setSelectedPlatform: (v: string | null) => void;
  setNewTitle: (v: string) => void;
  setNewUrl: (v: string) => void;
  setNewIcon: (v: string) => void;
}

export function PlatformPicker({ selectedPlatform, platformSearch, setPlatformSearch, setSelectedPlatform, setNewTitle, setNewUrl, setNewIcon }: Props) {
  const platform = PLATFORMS.find(p => p.id === selectedPlatform);
  const filtered = platformSearch.trim()
    ? PLATFORMS.filter(p => p.name.toLowerCase().includes(platformSearch.toLowerCase()))
    : PLATFORMS;

  if (selectedPlatform === "discord-embed") return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-[#5865F2]/30 bg-[#5865F2]/10">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-[#5865F2]/20">
        <SiDiscord className="w-5 h-5 text-[#5865F2]" />
      </div>
      <div className="flex-1"><p className="font-black text-sm">Discord Server Card</p><p className="text-[10px] text-gray-500">Shows server icon, name, members & join button</p></div>
      <button onClick={() => { setSelectedPlatform(null); setNewTitle(""); setNewUrl(""); }} className="text-gray-500 hover:text-white transition-colors"><X className="w-4 h-4" /></button>
    </div>
  );

  if (selectedPlatform && selectedPlatform !== "custom") return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-white/10 bg-black/40">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${platform?.color}22` }}>
        {platform && <platform.icon style={{ color: platform.color }} className="w-5 h-5" />}
      </div>
      <div className="flex-1"><p className="font-black text-sm">{platform?.name}</p><p className="text-[10px] text-gray-500">{platform?.domain}</p></div>
      <button onClick={() => { setSelectedPlatform(null); setNewTitle(""); setNewUrl(""); setNewIcon(""); }} className="text-gray-500 hover:text-white transition-colors"><X className="w-4 h-4" /></button>
    </div>
  );

  if (selectedPlatform === "custom") return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-white/10 bg-black/40">
      <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center"><LinkIcon className="w-4 h-4 text-gray-400" /></div>
      <p className="font-black text-sm flex-1">Custom Link</p>
      <button onClick={() => { setSelectedPlatform(null); setNewIcon(""); }} className="text-gray-500 hover:text-white transition-colors"><X className="w-4 h-4" /></button>
    </div>
  );

  return (
    <div className="space-y-2">
      <Label className="text-[10px] font-black uppercase text-gray-500">Platform (Optional)</Label>
      <Input value={platformSearch} onChange={e => setPlatformSearch(e.target.value)} placeholder="Search platforms or skip..." className="bg-black/60 border-white/5 h-8 text-xs" />
      <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 max-h-52 overflow-y-auto">
        {filtered.map(p => (
          <button key={p.id} onClick={() => { setSelectedPlatform(p.id); setNewTitle(p.name); setNewUrl(p.placeholder); setPlatformSearch(""); }}
            title={p.name} className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl border border-white/5 hover:border-orange-500/30 bg-black/30 hover:bg-black/50 transition-all group">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center transition-all group-hover:scale-110" style={{ backgroundColor: `${p.color}22` }}>
              <p.icon style={{ color: p.color }} className="w-4 h-4" />
            </div>
            <span className="text-[9px] font-bold text-gray-500 group-hover:text-white transition-colors truncate w-full text-center">{p.name.split("/")[0].trim()}</span>
          </button>
        ))}
        <button onClick={() => { setSelectedPlatform("discord-embed"); setPlatformSearch(""); setNewTitle("Discord Server"); }}
          className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl border border-white/5 hover:border-[#5865F2]/40 bg-black/30 hover:bg-black/50 transition-all group">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#5865F2]/10"><SiDiscord className="w-4 h-4 text-[#5865F2]" /></div>
          <span className="text-[9px] font-bold text-gray-500 group-hover:text-white transition-colors">Server Card</span>
        </button>
        <button onClick={() => { setSelectedPlatform("custom"); setPlatformSearch(""); }}
          className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl border border-white/5 hover:border-orange-500/30 bg-black/30 hover:bg-black/50 transition-all group">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/5"><LinkIcon className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors" /></div>
          <span className="text-[9px] font-bold text-gray-500 group-hover:text-white transition-colors">Custom</span>
        </button>
      </div>
    </div>
  );
}
