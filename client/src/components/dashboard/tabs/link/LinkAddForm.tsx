import { motion } from "framer-motion";
import { Loader2, Upload, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUpload } from "@/hooks/use-upload";
import { PLATFORMS } from "@/components/dashboard/platforms";
import { resolveUrl } from "@/components/dashboard/helpers";
import { PlatformPicker } from "./PlatformPicker";

const LINK_STYLES = [
  { value: "default", label: "Default", desc: "Row with icon and text" },
  { value: "card", label: "Card", desc: "Large card with platform color" },
  { value: "icon", label: "Icon Only", desc: "Small icon button, grouped" },
];

interface Props {
  selectedPlatform: string | null;
  platformSearch: string;
  newTitle: string; newUrl: string; newDesc: string; newStyle: string; newIcon: string;
  isPending: boolean;
  setSelectedPlatform: (v: string | null) => void;
  setPlatformSearch: (v: string) => void;
  setNewTitle: (v: string) => void;
  setNewUrl: (v: string) => void;
  setNewDesc: (v: string) => void;
  setNewStyle: (v: string) => void;
  setNewIcon: (v: string) => void;
  onAdd: () => void;
  onCancel: () => void;
}

export function LinkAddForm(p: Props) {
  const { uploadFile, isUploading } = useUpload();
  const platform = PLATFORMS.find(pl => pl.id === p.selectedPlatform);

  const handleIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const result = await uploadFile(file);
    if (result) p.setNewIcon(result.publicUrl || `${window.location.origin}${result.objectPath}`);
    e.target.value = "";
  };

  return (
    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
      className="bg-[#0e0e0e] border border-orange-500/30 rounded-2xl p-5 space-y-4 overflow-hidden">
      <h3 className="text-[11px] font-black uppercase tracking-widest text-orange-500">New Link</h3>
      <PlatformPicker selectedPlatform={p.selectedPlatform} platformSearch={p.platformSearch} setPlatformSearch={p.setPlatformSearch}
        setSelectedPlatform={p.setSelectedPlatform} setNewTitle={p.setNewTitle} setNewUrl={p.setNewUrl} setNewIcon={p.setNewIcon} />
      {p.selectedPlatform === "discord-embed" ? (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-[10px] font-black uppercase text-gray-500">Label (Optional)</Label>
            <Input value={p.newTitle} onChange={e => p.setNewTitle(e.target.value)} placeholder="Discord Server" className="bg-black/60 border-white/5 focus:border-[#5865F2]/50" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] font-black uppercase text-gray-500">Server Invite URL *</Label>
            <Input value={p.newUrl} onChange={e => p.setNewUrl(e.target.value)} placeholder="https://discord.gg/invite123" className="bg-black/60 border-[#5865F2]/20 focus:border-[#5865F2]/50" />
            <p className="text-[9px] text-gray-600">Server info is fetched automatically from the invite</p>
          </div>
        </div>
      ) : (
        <>
          <div className="grid md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase text-gray-500">Title *</Label>
              <Input value={p.newTitle} onChange={e => p.setNewTitle(e.target.value)} placeholder="My Website" className="bg-black/60 border-white/5 focus:border-orange-500/50" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase text-gray-500">URL *</Label>
              <Input value={p.newUrl} onChange={e => p.setNewUrl(e.target.value)} placeholder={platform?.placeholder || "https://..."} className="bg-black/60 border-white/5 focus:border-orange-500/50" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] font-black uppercase text-gray-500">Description</Label>
            <Input value={p.newDesc} onChange={e => p.setNewDesc(e.target.value)} placeholder="Short description..." className="bg-black/60 border-white/5 focus:border-orange-500/50" />
          </div>
          {p.selectedPlatform === "custom" && (
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase text-gray-500">Custom Icon (Optional)</Label>
              <div className="flex gap-2">
                <Input value={p.newIcon} onChange={e => p.setNewIcon(e.target.value)} placeholder="Paste image URL..." className="bg-black/60 border-white/5 focus:border-orange-500/50 h-9 text-sm flex-1" />
                <label className={`flex items-center justify-center w-9 h-9 rounded-lg border border-white/10 bg-white/5 hover:bg-orange-500/10 cursor-pointer transition-all ${isUploading ? "opacity-50 pointer-events-none" : ""}`}>
                  {isUploading ? <Loader2 className="w-4 h-4 animate-spin text-orange-500" /> : <Upload className="w-4 h-4 text-gray-400" />}
                  <input type="file" accept="image/*" className="hidden" onChange={handleIconUpload} />
                </label>
              </div>
              {p.newIcon && <img src={resolveUrl(p.newIcon)} alt="" className="w-10 h-10 object-contain rounded-lg border border-white/10" />}
            </div>
          )}
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-gray-500">Display Style</Label>
            <div className="grid grid-cols-3 gap-2">
              {LINK_STYLES.map(s => (
                <button key={s.value} onClick={() => p.setNewStyle(s.value)}
                  className={`p-2.5 rounded-xl border text-left transition-all ${p.newStyle === s.value ? "border-orange-500 bg-orange-500/10" : "border-white/10 bg-black/30 hover:border-white/20"}`}>
                  <p className={`text-xs font-black ${p.newStyle === s.value ? "text-orange-500" : "text-gray-300"}`}>{s.label}</p>
                  <p className="text-[9px] text-gray-600 mt-0.5">{s.desc}</p>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
      <div className="flex gap-2 pt-1">
        <button onClick={p.onAdd} disabled={!p.newUrl || (!p.newTitle && p.selectedPlatform !== "discord-embed") || p.isPending}
          className="flex-1 h-9 bg-orange-500 hover:bg-orange-400 text-black font-black rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2">
          {p.isPending ? <Loader2 className="animate-spin w-4 h-4" /> : "Add Link"}
        </button>
        <button onClick={p.onCancel} className="px-4 h-9 border border-white/10 hover:border-white/30 text-gray-400 hover:text-white font-black rounded-xl transition-all text-sm">Cancel</button>
      </div>
    </motion.div>
  );
}
