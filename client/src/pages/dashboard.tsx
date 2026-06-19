import { useAuth } from "@/hooks/use-auth";
import { LanguageSwitcherEdge, useI18n } from "@/lib/i18n";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2, User as UserIcon, Shield, Settings, Grid, Database, Award,
  Ban, Upload, Music, Video, X, Check, Trash2, Plus, Eye, Heart, Hash,
  Calendar, ChevronRight, ChevronLeft, Unlock, Link as LinkIcon, Sparkles,
  MousePointer, Palette, LayoutTemplate, Type, Image as ImageIcon,
  ChevronUp, ChevronDown, GripVertical, Sliders, MonitorPlay,
  Tag, ExternalLink, Zap, Star, Monitor, AlignCenter, AlignLeft, AlignRight,
  Layers, Globe, Film, Cpu, Headphones, MessageSquare, Send, Key, Save, RefreshCw,
  Inbox, Lock, Users, Crown, UserCheck, EyeOff, EyeIcon, AlertCircle, CheckCircle2,
  ShieldCheck, Info, MoreHorizontal, Download, FileCode, Edit2, Volume2,
  Play, Pause,
} from "lucide-react";
import { isStaff, canManageBadges as canManageBadgesPerm, canGiveBadges as canGiveBadgesPerm, canAccessBotSettings, canManageTeam, canManageWebsite, canManageChangelogs, canManageOurTeam, ROLE_HIERARCHY } from "@shared/schema";
import { ChangeLogsTab } from "@/components/dashboard/tabs/ChangeLogsTab";
import { DiscordProfileWidget } from "@/components/DiscordWidget";
import {
  SiDiscord, SiX, SiInstagram, SiYoutube, SiTiktok, SiTwitch,
  SiGithub, SiLinkedin, SiSpotify, SiPaypal, SiCashapp, SiLinktree,
  SiSteam, SiReddit, SiSnapchat, SiTelegram, SiKofi, SiPatreon,
  SiKick, SiPinterest,
} from "react-icons/si";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useUpload } from "@/hooks/use-upload";
import { VoidMark } from "@/lib/voidmark";
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import BorderGlow from "@/components/BorderGlow";
import OnboardingStepper from "@/components/OnboardingStepper";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function resolveUrl(url: string | null | undefined): string {
  if (!url) return "";
  if (url.startsWith("/objects/")) return `${window.location.origin}${url}`;
  return url;
}

function isUploadedFile(url: string | null | undefined) {
  if (!url) return false;
  return url.includes("/objects/uploads/") || url.startsWith("/objects/");
}

function renderDiscordMarkdown(text: string): JSX.Element {
  const lines = text.split("\n");
  return (
    <>
      {lines.map((line, li) => {
        const isQuote = line.startsWith("> ");
        const content = isQuote ? line.slice(2) : line;
        const tokens = content.split(/(\*\*[^*]+\*\*|\*[^*]+\*|__[^_]+__|_[^_]+_|~~[^~]+~~|`[^`]+`)/);
        const rendered = tokens.map((tok, i) => {
          if (tok.startsWith("**") && tok.endsWith("**")) return <strong key={i} className="font-bold text-white">{tok.slice(2, -2)}</strong>;
          if (tok.startsWith("~~") && tok.endsWith("~~")) return <s key={i} className="opacity-60">{tok.slice(2, -2)}</s>;
          if ((tok.startsWith("*") && tok.endsWith("*")) || (tok.startsWith("_") && tok.endsWith("_"))) return <em key={i} className="italic">{tok.slice(1, -1)}</em>;
          if (tok.startsWith("`") && tok.endsWith("`")) return <code key={i} className="bg-black/40 px-1 rounded font-mono text-[9px]">{tok.slice(1, -1)}</code>;
          return <span key={i}>{tok}</span>;
        });
        if (isQuote) return (
          <div key={li} className="flex gap-1.5 my-0.5">
            <div className="w-0.5 bg-[#4e5058] rounded-full shrink-0" />
            <span className="text-[#949ba4] italic">{rendered}</span>
          </div>
        );
        return <span key={li}>{rendered}{li < lines.length - 1 ? <br /> : null}</span>;
      })}
    </>
  );
}

function getYouTubeVideoId(url: string): string | null {
  if (!url) return null;
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

function isYouTubeUrl(url: string): boolean {
  return /(?:youtube\.com|youtu\.be)/.test(url);
}

function getEmbedType(url: string): "youtube" | "soundcloud" | "spotify" | "audio" | null {
  if (!url) return null;
  if (/(?:youtube\.com|youtu\.be)/.test(url)) return "youtube";
  if (/soundcloud\.com/.test(url)) return "soundcloud";
  if (/open\.spotify\.com/.test(url)) return "spotify";
  if (url.startsWith("http")) return "audio";
  return null;
}

function getEmbedServiceLabel(url: string): string {
  const t = getEmbedType(url);
  if (t === "youtube") return "YouTube";
  if (t === "soundcloud") return "SoundCloud";
  if (t === "spotify") return "Spotify";
  return "";
}

// ─── Platform Definitions ─────────────────────────────────────────────────────

export const PLATFORMS: { id: string; name: string; icon: any; color: string; domain: string; placeholder: string }[] = [
  { id: "discord",   name: "Discord",    icon: SiDiscord,   color: "#5865F2", domain: "discord.gg",              placeholder: "https://discord.gg/..." },
  { id: "x",         name: "X / Twitter",icon: SiX,         color: "#e7e7e7", domain: "x.com",                   placeholder: "https://x.com/username" },
  { id: "instagram", name: "Instagram",  icon: SiInstagram, color: "#E1306C", domain: "instagram.com",           placeholder: "https://instagram.com/username" },
  { id: "youtube",   name: "YouTube",    icon: SiYoutube,   color: "#FF0000", domain: "youtube.com",             placeholder: "https://youtube.com/@channel" },
  { id: "tiktok",    name: "TikTok",     icon: SiTiktok,    color: "#69C9D0", domain: "tiktok.com",              placeholder: "https://tiktok.com/@username" },
  { id: "twitch",    name: "Twitch",     icon: SiTwitch,    color: "#9146FF", domain: "twitch.tv",               placeholder: "https://twitch.tv/username" },
  { id: "github",    name: "GitHub",     icon: SiGithub,    color: "#e7e7e7", domain: "github.com",              placeholder: "https://github.com/username" },
  { id: "linkedin",  name: "LinkedIn",   icon: SiLinkedin,  color: "#0077B5", domain: "linkedin.com",            placeholder: "https://linkedin.com/in/username" },
  { id: "spotify",   name: "Spotify",    icon: SiSpotify,   color: "#1DB954", domain: "spotify.com",             placeholder: "https://open.spotify.com/..." },
  { id: "paypal",    name: "PayPal",     icon: SiPaypal,    color: "#003087", domain: "paypal.com",              placeholder: "https://paypal.me/username" },
  { id: "cashapp",   name: "Cash App",   icon: SiCashapp,   color: "#00D64F", domain: "cash.app",                placeholder: "https://cash.app/$username" },
  { id: "linktree",  name: "Linktree",   icon: SiLinktree,  color: "#39E09B", domain: "linktr.ee",               placeholder: "https://linktr.ee/username" },
  { id: "steam",     name: "Steam",      icon: SiSteam,     color: "#c6d4df", domain: "store.steampowered.com",  placeholder: "https://steamcommunity.com/id/..." },
  { id: "reddit",    name: "Reddit",     icon: SiReddit,    color: "#FF4500", domain: "reddit.com",              placeholder: "https://reddit.com/u/username" },
  { id: "snapchat",  name: "Snapchat",   icon: SiSnapchat,  color: "#FFFC00", domain: "snapchat.com",            placeholder: "https://snapchat.com/add/username" },
  { id: "telegram",  name: "Telegram",   icon: SiTelegram,  color: "#2CA5E0", domain: "t.me",                    placeholder: "https://t.me/username" },
  { id: "kofi",      name: "Ko-fi",      icon: SiKofi,      color: "#FF5E5B", domain: "ko-fi.com",               placeholder: "https://ko-fi.com/username" },
  { id: "patreon",   name: "Patreon",    icon: SiPatreon,   color: "#FF424D", domain: "patreon.com",             placeholder: "https://patreon.com/username" },
  { id: "kick",      name: "Kick",       icon: SiKick,      color: "#53FC18", domain: "kick.com",                placeholder: "https://kick.com/username" },
  { id: "pinterest", name: "Pinterest",  icon: SiPinterest, color: "#E60023", domain: "pinterest.com",           placeholder: "https://pinterest.com/username" },
];

export function getPlatform(id: string | undefined) {
  return PLATFORMS.find(p => p.id === id) ?? null;
}

// ─── UI Helpers ───────────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-3 flex items-center gap-1.5">{children}</h3>;
}

function FaviconUploadField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { uploadFile, isUploading } = useUpload();
  const { toast } = useToast();
  const inputId = "favicon-upload-" + Math.random().toString(36).slice(2, 7);
  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const result = await uploadFile(file);
    if (result) {
      onChange(result.publicUrl || result.objectPath);
      toast({ title: "Favicon uploaded!" });
    } else {
      toast({ title: "Upload failed", variant: "destructive" });
    }
    e.target.value = "";
  };
  return (
    <div className="space-y-1.5">
      <Label className="text-[11px] font-black uppercase text-gray-500">Favicon</Label>
      <p className="text-[10px] text-gray-600">Upload an image or paste a URL to use as your tab icon.</p>
      <div className="flex gap-2 items-center">
        <Input value={value} onChange={e => onChange(e.target.value)} placeholder="https://... or upload below" className="bg-black/60 border-white/5 h-9 text-sm flex-1" />
        <label htmlFor={inputId}
          className={`flex items-center gap-1.5 px-3 h-9 rounded-md border border-white/10 bg-white/5 hover:bg-orange-500/10 hover:border-orange-500/30 cursor-pointer transition-colors text-[11px] font-black uppercase tracking-widest text-gray-400 hover:text-orange-400 shrink-0 ${isUploading ? "opacity-50 pointer-events-none" : ""}`}
        >
          {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
          {isUploading ? "Uploading..." : "Upload"}
          <input id={inputId} type="file" accept="image/*" className="hidden" onChange={handleFile} />
        </label>
        {value && (
          <div className="w-9 h-9 rounded-md border border-white/10 bg-black/30 flex items-center justify-center shrink-0 overflow-hidden">
            <img src={resolveUrl(value)} alt="favicon" className="w-6 h-6 object-contain" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
          </div>
        )}
      </div>
    </div>
  );
}

function SettingRow({ label, desc, children }: { label: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-white/[0.03] last:border-0">
      <div className="min-w-0">
        <p className="text-sm font-bold leading-tight">{label}</p>
        {desc && <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">{desc}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function ColorPicker({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative w-8 h-8 rounded-lg border border-white/10 overflow-hidden cursor-pointer shrink-0" style={{ backgroundColor: value }}>
        <input type="color" value={value} onChange={e => onChange(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
      </div>
      <span className="text-xs font-mono text-gray-400">{value}</span>
    </div>
  );
}

function NumSlider({ value, onChange, min, max, step = 1, unit = "" }: {
  value: number; onChange: (v: number) => void; min: number; max: number; step?: number; unit?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <Slider value={[value]} onValueChange={([v]) => onChange(v)} min={min} max={max} step={step} className="flex-1 w-32" />
      <span className="text-xs font-mono text-gray-400 w-12 text-right">{value}{unit}</span>
    </div>
  );
}

// ─── Smart Media Field ────────────────────────────────────────────────────────

function MediaField({
  label, value, onChange, accept, uploadId, mediaType, icon, maxSizeMB, isPremium
}: {
  label: string; value: string; onChange: (v: string) => void;
  accept: string; uploadId: string; mediaType: "image" | "video" | "audio";
  icon?: React.ReactNode; maxSizeMB?: number; isPremium?: boolean;
}) {
  const { toast } = useToast();
  const { uploadFile, isUploading } = useUpload();
  const hasValue = !!value;
  const resolved = resolveUrl(value);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (maxSizeMB && !isPremium && file.size > maxSizeMB * 1024 * 1024) {
      toast({ title: `This file is too big. ${maxSizeMB} MB is the limit.`, description: "Upgrade to Premium for unlimited uploads.", variant: "destructive" });
      e.target.value = "";
      return;
    }
    const result = await uploadFile(file);
    if (result) {
      onChange(result.publicUrl || `${window.location.origin}${result.objectPath}`);
      toast({ title: `${label || "File"} uploaded` });
    } else {
      toast({ title: "Upload failed", variant: "destructive" });
    }
    e.target.value = "";
  };

  const uploaded = isUploadedFile(value);

  return (
    <div className="space-y-2">
      {label && (
        <Label className="text-[11px] font-black uppercase tracking-widest text-gray-500 flex items-center gap-1.5">
          {icon}{label}
        </Label>
      )}
      <AnimatePresence>
        {hasValue && (
          <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }}
            className="relative rounded-xl overflow-hidden border border-white/5 bg-black/40 group">
            {mediaType === "image" && <img src={resolved} alt={label} className="w-full h-32 object-cover" onError={e => e.currentTarget.classList.add("opacity-20")} />}
            {mediaType === "video" && <video src={resolved} className="w-full h-32 object-cover" muted playsInline />}
            {mediaType === "audio" && (
              <div className="p-3 flex items-center gap-3">
                <Music className="w-5 h-5 text-orange-500 shrink-0" />
                <audio controls className="flex-1 h-8" src={resolved} />
              </div>
            )}
            {uploaded && mediaType !== "audio" && (
              <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/80 rounded-full text-[9px] font-black uppercase tracking-widest text-green-400 flex items-center gap-1">
                <Check className="w-2.5 h-2.5" /> Uploaded
              </div>
            )}
            <button type="button"
              className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/70 hover:bg-red-500 border border-white/10 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
              onClick={() => onChange("")}><X className="w-3 h-3 text-white" /></button>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="flex gap-2">
        {!uploaded ? (
          <Input value={value} onChange={e => onChange(e.target.value)} placeholder="Paste URL or upload..."
            className="bg-black/60 border-white/5 focus:border-orange-500/50 text-xs h-9" />
        ) : (
          <div className="flex-1 flex items-center gap-2 px-3 h-9 bg-black/40 border border-white/5 rounded-md">
            <Check className="w-3 h-3 text-green-500 shrink-0" />
            <span className="text-xs text-gray-400 truncate flex-1">File saved</span>
            <button type="button" onClick={() => onChange("")} className="text-gray-600 hover:text-red-400 transition-colors"><X className="w-3 h-3" /></button>
          </div>
        )}
        <label htmlFor={uploadId}
          className={`flex items-center justify-center w-9 h-9 rounded-md border border-white/10 bg-white/5 hover:bg-orange-500/10 hover:border-orange-500/30 cursor-pointer transition-colors shrink-0 ${isUploading ? "opacity-50 pointer-events-none" : ""}`}>
          {isUploading ? <Loader2 className="w-4 h-4 animate-spin text-orange-500" /> : <Upload className="w-4 h-4 text-gray-400" />}
          <input id={uploadId} type="file" accept={accept} className="hidden" onChange={handleUpload} />
        </label>
      </div>
    </div>
  );
}

// ─── Badge Editor ─────────────────────────────────────────────────────────────

function BadgeEditor({ badge, onDone }: { badge?: any; onDone?: () => void }) {
  const { toast } = useToast();
  const [name, setName] = useState(badge?.name || "");
  const [icon, setIcon] = useState(badge?.icon || "");
  const [description, setDescription] = useState(badge?.description || "");
  const [howToGet, setHowToGet] = useState(badge?.howToGet || "");
  const [visibleTo, setVisibleTo] = useState(badge?.visibleTo || "all");
  const [available, setAvailable] = useState(badge?.available !== false);
  const [roleId, setRoleId] = useState(badge?.roleId || "");
  const [activeEditorTab, setActiveEditorTab] = useState<"general" | "roleId">("general");
  const [visibleSearch, setVisibleSearch] = useState("");
  const [showVisiblePicker, setShowVisiblePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [discordRoles, setDiscordRoles] = useState<any[]>([]);
  const [fetchingRoles, setFetchingRoles] = useState(false);
  const { uploadFile, isUploading } = useUpload();
  const { data: allUsers } = useQuery<any>({ queryKey: ["/api/admin/users"] });

  const fetchRoles = async () => {
    setFetchingRoles(true);
    try {
      const res = await fetch("/api/admin/discord-roles", { credentials: "include" });
      const data = await res.json();
      if (data.roles) setDiscordRoles(data.roles);
      else toast({ title: data.message || "Could not fetch roles", variant: "destructive" });
    } catch {
      toast({ title: "Error fetching roles", variant: "destructive" });
    }
    setFetchingRoles(false);
  };

  const visibleUsers: string[] = visibleTo !== "all" ? visibleTo.split(",").filter(Boolean) : [];
  const filteredUsers = useMemo(() => (allUsers || []).filter((u: any) => {
    if (!visibleSearch.trim()) return true;
    const q = visibleSearch.toLowerCase();
    return (
      u.username?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.discordId?.toLowerCase().includes(q) ||
      u.discordUsername?.toLowerCase().includes(q) ||
      u.alias?.toLowerCase().includes(q) ||
      (u.aliases || []).some((a: string) => a.toLowerCase().includes(q))
    );
  }), [allUsers, visibleSearch]);

  const toggleUserVisible = (username: string) => {
    const curr = visibleTo !== "all" ? visibleTo.split(",").filter(Boolean) : [];
    const next = curr.includes(username) ? curr.filter((u: string) => u !== username) : [...curr, username];
    setVisibleTo(next.length === 0 ? "all" : next.join(","));
  };

  const save = async () => {
    if (!name.trim()) return toast({ title: "Badge name required", variant: "destructive" });
    setLoading(true);
    try {
      const payload = { name, icon, description, howToGet, visibleTo, available, roleId };
      if (badge) await apiRequest("PATCH", `/api/admin/badges/${badge.id}`, payload);
      else await apiRequest("POST", "/api/admin/badges", payload);
      queryClient.invalidateQueries({ queryKey: ["/api/badges"] });
      toast({ title: badge ? "Badge updated" : "Badge created" });
      onDone?.();
    } catch { toast({ title: "Error saving badge", variant: "destructive" }); }
    finally { setLoading(false); }
  };

  const deleteBadge = async () => {
    if (!badge || !confirm(`Delete badge "${badge.name}"? This removes it from all users.`)) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/badges/${badge.id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast({ title: data.message || "Delete failed", variant: "destructive" });
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["/api/badges"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "Badge deleted" });
      onDone?.();
    } catch { toast({ title: "Delete failed", variant: "destructive" }); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-4 py-2">
      <div className="space-y-2">
        <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Name</Label>
        <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Verified" className="bg-black border-white/5 focus:border-orange-500/50" />
      </div>
      <div className="space-y-2">
        <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Icon (Emoji or Upload)</Label>
        <div className="flex gap-2">
          <Input value={icon} onChange={e => setIcon(e.target.value)} placeholder="✔️ or paste URL..." className="bg-black border-white/5 focus:border-orange-500/50" />
          <label className={`flex items-center justify-center w-9 h-9 rounded-md border border-white/10 bg-white/5 hover:bg-white/10 cursor-pointer shrink-0 ${isUploading ? "opacity-50 pointer-events-none" : ""}`}>
            {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4 text-gray-400" />}
            <input type="file" accept="image/*,video/*,audio/*" className="hidden" onChange={async e => {
              const file = e.target.files?.[0];
              if (file) { const r = await uploadFile(file); if (r) setIcon(r.publicUrl || r.objectPath); }
              e.target.value = "";
            }} />
          </label>
        </div>
        {icon && (
          <div className="flex items-center gap-2 mt-1 p-2 bg-black/40 rounded-lg border border-white/5">
            <span className="text-[10px] text-gray-500 uppercase font-black">Preview:</span>
            {icon.startsWith("http") || icon.includes("/objects/") ? <img src={resolveUrl(icon)} alt="preview" className="w-6 h-6 object-contain rounded" /> : <span className="text-lg">{icon}</span>}
          </div>
        )}
      </div>
      <div className="space-y-2">
        <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Description</Label>
        <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="What this badge represents..." className="bg-black border-white/5 focus:border-orange-500/50 text-sm min-h-[60px] resize-none" />
      </div>
      <div className="space-y-2">
        <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500">How to Get</Label>
        <Textarea value={howToGet} onChange={e => setHowToGet(e.target.value)} placeholder="How users can earn this badge..." className="bg-black border-white/5 focus:border-orange-500/50 text-sm min-h-[60px] resize-none" />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Visible To</Label>
          <span className="text-[10px] text-gray-500 font-mono">
            {visibleTo === "all" ? "All members" : `${visibleUsers.length} member(s)`}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setShowVisiblePicker(!showVisiblePicker)}
          className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg border text-sm font-bold transition-all ${showVisiblePicker ? "border-orange-500/50 bg-orange-500/5" : "border-white/10 bg-black hover:border-white/20"}`}
        >
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-orange-400" />
            <span className="text-white">{visibleTo === "all" ? "Visible to All" : `Custom: ${visibleUsers.slice(0,3).join(", ")}${visibleUsers.length > 3 ? "..." : ""}`}</span>
          </div>
          <ChevronDown className={`w-3.5 h-3.5 text-gray-500 transition-transform ${showVisiblePicker ? "rotate-180" : ""}`} />
        </button>
        {showVisiblePicker && (
          <div className="border border-white/10 rounded-xl bg-black/80 p-3 space-y-2 max-h-48 overflow-y-auto">
            <button
              onClick={() => { setVisibleTo("all"); setVisibleSearch(""); }}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold transition-all ${visibleTo === "all" ? "bg-orange-500/15 border border-orange-500/40 text-orange-400" : "border border-white/5 hover:bg-white/5 text-gray-300"}`}
            >
              <Globe className="w-4 h-4" /> Visible to All Members
            </button>
            <div className="h-px bg-white/5 my-1" />
            <Input
              value={visibleSearch}
              onChange={e => setVisibleSearch(e.target.value)}
              placeholder="Search by name, email, Discord ID/user, link..."
              className="bg-black/60 border-white/5 h-8 text-sm"
            />
            {filteredUsers.map((u: any) => {
              const sel = visibleUsers.includes(u.username);
              return (
                <button key={u.id} onClick={() => toggleUserVisible(u.username)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold transition-all ${sel ? "bg-orange-500/15 border border-orange-500/40 text-orange-400" : "border border-white/5 hover:bg-white/5 text-gray-400"}`}>
                  {sel ? <Check className="w-4 h-4 shrink-0" /> : <div className="w-4 h-4 shrink-0" />}
                  @{u.username}
                </button>
              );
            })}
          </div>
        )}
      </div>
      {/* Available toggle */}
      <div className="flex items-center justify-between p-3 rounded-xl border border-white/5 bg-black/40">
        <div>
          <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Available</Label>
          <p className="text-[10px] text-gray-600 mt-0.5">If disabled, badge shows as "Unavailable" to all users</p>
        </div>
        <button
          type="button"
          onClick={() => setAvailable(!available)}
          className={`w-11 h-6 rounded-full transition-all relative ${available ? "bg-orange-500" : "bg-gray-700"}`}
        >
          <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${available ? "left-[calc(100%-1.375rem)]" : "left-0.5"}`} />
        </button>
      </div>

      {/* Discord Role ID */}
      <div className="space-y-2">
        <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Discord Role ID</Label>
        <p className="text-[10px] text-gray-600">Users with this Discord role will automatically receive this badge</p>
        <div className="flex gap-2">
          <Input value={roleId} onChange={e => setRoleId(e.target.value)} placeholder="e.g. 123456789012345678" className="bg-black border-white/5 focus:border-orange-500/50 font-mono text-sm" />
          <Button type="button" onClick={fetchRoles} disabled={fetchingRoles} variant="outline" className="shrink-0 border-white/10 text-gray-400 hover:text-white text-xs px-3">
            {fetchingRoles ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
          </Button>
        </div>
        {discordRoles.length > 0 && (
          <div className="border border-white/10 rounded-xl bg-black/80 p-2 space-y-1 max-h-36 overflow-y-auto">
            <p className="text-[9px] font-black uppercase text-gray-600 px-2 mb-1">Select a role</p>
            {discordRoles.map((r: any) => (
              <button key={r.id} type="button" onClick={() => { setRoleId(r.id); setDiscordRoles([]); }}
                className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold text-left transition-all ${roleId === r.id ? "bg-orange-500/15 text-orange-400 border border-orange-500/30" : "hover:bg-white/5 text-gray-300 border border-transparent"}`}>
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: r.color ? `#${r.color.toString(16).padStart(6,"0")}` : "#555" }} />
                {r.name}
                <span className="ml-auto font-mono text-[10px] text-gray-600">{r.id}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-2 pt-2">
        <Button onClick={save} disabled={loading} className="flex-1 bg-orange-500 hover:bg-orange-400 text-black font-black border-0">
          {loading ? <Loader2 className="animate-spin w-4 h-4" /> : badge ? "Update" : "Create Badge"}
        </Button>
        {badge && <Button onClick={deleteBadge} disabled={loading} variant="destructive" size="icon"><Trash2 className="w-4 h-4" /></Button>}
      </div>
    </div>
  );
}

// ─── Admin Change Password Button ────────────────────────────────────────────
function AdminChangePasswordButton({ userId }: { userId: number }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");

  const handleChange = async () => {
    setError("");
    if (newPassword.length < 7) { setError("Password must be at least 7 characters"); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) { setError(json.message || "Failed"); return; }
      toast({ title: "Password changed successfully" });
      setOpen(false);
      setNewPassword("");
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <>
      <button onClick={() => setOpen(true)} className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 border border-orange-500/20 transition-all">
        Change Password
      </button>
      <Dialog open={open} onOpenChange={v => { if (!v) { setOpen(false); setNewPassword(""); setError(""); } }}>
        <DialogContent className="bg-[#0d0d0d] border border-white/[0.08] max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-white font-black text-sm">Change User Password</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="New password (min. 7 chars)"
                className="w-full bg-white/[0.04] border border-white/[0.08] focus:border-orange-500/60 rounded-xl h-10 px-3 pr-10 text-white placeholder:text-gray-600 text-sm outline-none"
              />
              <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors">
                {showPw ? <EyeOff className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
              </button>
            </div>
            {error && <p className="text-xs text-red-400">{error}</p>}
            <button onClick={handleChange} disabled={loading || !newPassword}
              className="w-full py-2.5 rounded-xl bg-orange-500 text-black text-xs font-black uppercase tracking-widest disabled:opacity-50 transition-all">
              {loading ? "Changing..." : "Update Password"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Manage User Dialog ───────────────────────────────────────────────────────

function ManageUserDialog({ u, badges, isOwner, isAdmin, isSuperOwner }: { u: any; badges: any[]; isOwner: boolean; isAdmin: boolean; isSuperOwner?: boolean }) {
  const { toast } = useToast();
  const [localUser, setLocalUser] = useState({ ...u });
  const isBanned = localUser.role === "banned";
  const targetIsOwner = u.role === "owner";
  const [customBadgeName, setCustomBadgeName] = useState("");
  const [customBadgeIcon, setCustomBadgeIcon] = useState("");
  const [activeSection, setActiveSection] = useState<"badges"|"limits"|"custom"|"views"|"likes"|"data">("badges");
  const [badgeSearch, setBadgeSearch] = useState("");
  const [viewDelta, setViewDelta] = useState("");
  const [likeDelta, setLikeDelta] = useState("");
  const [userData, setUserData] = useState<any>(null);
  const [userDataLoading, setUserDataLoading] = useState(false);
  const [disconnectingDiscord, setDisconnectingDiscord] = useState(false);
  const [admin2faNewCode, setAdmin2faNewCode] = useState("");
  const [admin2faLoading, setAdmin2faLoading] = useState(false);
  const { uploadFile, isUploading } = useUpload();

  const loadUserData = async () => {
    if (userData) return;
    setUserDataLoading(true);
    try {
      const res = await apiRequest("GET", `/api/admin/users/${u.id}/data`);
      const data = await res.json();
      setUserData(data);
    } catch {
      toast({ title: "Failed to load user data", variant: "destructive" });
    } finally {
      setUserDataLoading(false);
    }
  };

  const handleAdmin2faUpdate = async () => {
    if (!admin2faNewCode.trim()) return;
    setAdmin2faLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${u.id}/update-2fa`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newCode: admin2faNewCode }),
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) { toast({ title: json.message || "Failed", variant: "destructive" }); return; }
      setUserData((d: any) => d ? { ...d, twoFactorCode: admin2faNewCode } : d);
      setAdmin2faNewCode("");
      toast({ title: "2FA code updated" });
    } catch { toast({ title: "Failed to update 2FA", variant: "destructive" }); }
    finally { setAdmin2faLoading(false); }
  };

  const handleAdmin2faDisable = async () => {
    if (!confirm(`Disable 2FA for ${u.username}?`)) return;
    setAdmin2faLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${u.id}/update-2fa`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "disable" }),
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) { toast({ title: json.message || "Failed", variant: "destructive" }); return; }
      setUserData((d: any) => d ? { ...d, twoFactorEnabled: false, twoFactorCode: null } : d);
      toast({ title: "2FA disabled for user" });
    } catch { toast({ title: "Failed to disable 2FA", variant: "destructive" }); }
    finally { setAdmin2faLoading(false); }
  };

  const handleDisconnectDiscord = async () => {
    setDisconnectingDiscord(true);
    try {
      await apiRequest("POST", `/api/admin/users/${u.id}/disconnect-discord`, {});
      setLocalUser((p: any) => ({ ...p, discordId: null, discordUsername: null, discordAvatar: null }));
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "Discord disconnected", description: "User has been logged out and their Discord account unlinked." });
    } catch {
      toast({ title: "Failed to disconnect Discord", variant: "destructive" });
    } finally {
      setDisconnectingDiscord(false);
    }
  };

  const save = async (updates: any) => {
    try {
      await apiRequest("PATCH", `/api/admin/users/${u.id}`, updates);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setLocalUser((p: any) => ({ ...p, ...updates }));
      toast({ title: "User updated" });
    } catch {
      toast({ title: "Action not allowed", variant: "destructive" });
    }
  };

  const toggleBadge = (badgeName: string, checked: boolean) => {
    const curr = localUser.badges || [];
    const next = checked ? [...curr, badgeName] : curr.filter((b: string) => b !== badgeName);
    setLocalUser((p: any) => ({ ...p, badges: next }));
    save({ badges: next });
  };

  const handleCustomBadgeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const result = await uploadFile(file);
    if (result) setCustomBadgeIcon(result.publicUrl || `${window.location.origin}${result.objectPath}`);
    e.target.value = "";
  };

  const grantCustomBadge = () => {
    if (!customBadgeName.trim()) return;
    const badgeName = `custom:${customBadgeName.trim()}`;
    const curr = localUser.badges || [];
    if (curr.includes(badgeName)) return;
    const next = [...curr, badgeName];
    setLocalUser((p: any) => ({ ...p, badges: next }));
    save({ badges: next });
    setCustomBadgeName("");
    setCustomBadgeIcon("");
  };

  const roleOptions = isSuperOwner ? ["user", "admin", "owner", "developer", "moderator", "support", "banned"] : isOwner ? ["user", "admin"] : ["user"];

  return (
    <div className="space-y-4 py-2 max-h-[80vh] overflow-y-auto pr-1">
      <div className="flex items-center gap-3 p-3 bg-black/40 rounded-xl border border-white/5">
        <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500 font-black text-lg border border-orange-500/20">
          {u.username[0].toUpperCase()}
        </div>
        <div>
          <p className="font-black">{u.username}</p>
          <p className="text-[10px] text-gray-500 uppercase font-bold">UID #{u.id} · {u.views || 0} views</p>
        </div>
        <span className={`ml-auto px-2 py-0.5 rounded text-[10px] font-black uppercase ${localUser.role === "owner" ? "bg-red-500/20 text-red-500" : localUser.role === "admin" ? "bg-orange-500/20 text-orange-500" : localUser.role === "banned" ? "bg-red-900/40 text-red-400" : "bg-white/10 text-gray-400"}`}>
          {localUser.role}
        </span>
      </div>

      {targetIsOwner && !isSuperOwner && (
        <div className="p-3 bg-red-500/5 border border-red-500/20 rounded-xl">
          <p className="text-[11px] font-black text-red-400 uppercase tracking-widest">Owner Account — Role Protected</p>
          <p className="text-[10px] text-gray-500 mt-1">Owner role cannot be changed. Badges and limits can still be updated.</p>
        </div>
      )}

      {isSuperOwner && targetIsOwner && (
        <div className="p-3 bg-orange-500/5 border border-orange-500/20 rounded-xl">
          <p className="text-[11px] font-black text-orange-400 uppercase tracking-widest">Owner Account — Super Owner Override</p>
          <p className="text-[10px] text-gray-500 mt-1">You have super owner authority. You can modify this owner's role and settings.</p>
        </div>
      )}

      {((!targetIsOwner && (isOwner || isAdmin)) || isSuperOwner) && (
        <div className="space-y-2">
          <Label className="text-[10px] font-black uppercase tracking-widest text-orange-500/60">Role</Label>
          <div className="flex flex-wrap gap-1.5">
            {roleOptions.map(role => (
              <Button key={role} size="sm" onClick={() => save({ role })}
                className={`text-[10px] font-black uppercase ${localUser.role === role ? "bg-orange-500 text-black" : "bg-transparent border border-white/20 text-gray-400 hover:text-white hover:border-white/50"}`}>
                {role}
              </Button>
            ))}
          </div>
          {!isOwner && !isSuperOwner && <p className="text-[10px] text-gray-600">Admins can demote users. Only owners can promote to admin.</p>}
        </div>
      )}

      <div className="flex gap-1 p-1 bg-black/40 rounded-xl border border-white/5 flex-wrap">
        {(["badges","limits","custom", ...(isOwner || isSuperOwner ? ["views","likes"] : []), ...(isOwner || isSuperOwner ? ["data"] : [])] as const).map((s: any) => (
          <button key={s} onClick={() => { setActiveSection(s); if (s === "data") loadUserData(); }}
            className={`flex-1 text-[10px] font-black uppercase tracking-widest py-1.5 rounded-lg transition-all min-w-[60px] ${activeSection === s ? "bg-orange-500 text-black" : "text-gray-500 hover:text-white"}`}>
            {s === "badges" ? "Badges" : s === "limits" ? "Limits" : s === "custom" ? "Custom" : s === "views" ? "Views" : s === "likes" ? "Likes" : "Data"}
          </button>
        ))}
      </div>

      {activeSection === "badges" && (
        <div className="space-y-2">
          {badges?.length === 0 ? <p className="text-xs text-gray-600 text-center py-3">No badges created yet.</p> : (
            <>
              <Input
                value={badgeSearch}
                onChange={e => setBadgeSearch(e.target.value)}
                placeholder="Search badges..."
                className="bg-black/60 border-white/5 h-8 text-sm"
              />
              <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                {badges?.filter((badge: any) => !badgeSearch.trim() || badge.name.toLowerCase().includes(badgeSearch.toLowerCase())).map((badge: any) => {
                  const owned = (localUser.badges || []).includes(badge.name);
                  return (
                    <div key={badge.id} className={`flex items-center gap-3 p-2.5 rounded-xl border transition-colors cursor-pointer ${owned ? "border-orange-500/30 bg-orange-500/5" : "border-white/5 bg-black/30"}`} onClick={() => toggleBadge(badge.name, !owned)}>
                      <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors shrink-0 ${owned ? "bg-orange-500 border-orange-500" : "border-white/20 bg-transparent"}`}>
                        {owned && <Check className="w-3 h-3 text-black" />}
                      </div>
                      <div className="w-7 h-7 flex items-center justify-center shrink-0">
                        {badge.icon?.startsWith("http") || badge.icon?.includes("/objects/") ? <img src={resolveUrl(badge.icon)} alt={badge.name} className="w-6 h-6 object-contain" /> : <span className="text-xl">{badge.icon}</span>}
                      </div>
                      <span className="text-sm font-bold truncate">{badge.name}</span>
                      {owned && <span className="ml-auto text-[9px] font-black uppercase text-orange-500 shrink-0">Active</span>}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {activeSection === "limits" && (
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Max Tracks</Label>
              <span className="text-xs font-mono text-orange-500">{localUser.maxTracks ?? 3}</span>
            </div>
            <input type="range" min={0} max={20} value={localUser.maxTracks ?? 3}
              onChange={e => setLocalUser((p: any) => ({ ...p, maxTracks: parseInt(e.target.value) }))}
              className="w-full accent-orange-500" />
            <Button size="sm" onClick={() => save({ maxTracks: localUser.maxTracks ?? 3 })} className="bg-orange-500 hover:bg-orange-400 text-black font-black w-full border-0">Save Track Limit</Button>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Max Tags</Label>
              <span className="text-xs font-mono text-orange-500">{localUser.maxTags ?? 5}</span>
            </div>
            <input type="range" min={0} max={20} value={localUser.maxTags ?? 5}
              onChange={e => setLocalUser((p: any) => ({ ...p, maxTags: parseInt(e.target.value) }))}
              className="w-full accent-orange-500" />
            <Button size="sm" onClick={() => save({ maxTags: localUser.maxTags ?? 5 })} className="bg-orange-500 hover:bg-orange-400 text-black font-black w-full border-0">Save Tag Limit</Button>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Max Aliases</Label>
              <span className="text-xs font-mono text-orange-500">{(localUser.maxAliases ?? 1) === -1 ? "Unlimited" : (localUser.maxAliases ?? 1)}</span>
            </div>
            <div className="flex items-center gap-2 mb-1">
              <input type="checkbox" id={`unlimited-alias-${u.id}`}
                checked={(localUser.maxAliases ?? 1) === -1}
                onChange={e => setLocalUser((p: any) => ({ ...p, maxAliases: e.target.checked ? -1 : 1 }))}
                className="accent-orange-500" />
              <label htmlFor={`unlimited-alias-${u.id}`} className="text-[10px] text-gray-400 font-bold">Unlimited</label>
            </div>
            {(localUser.maxAliases ?? 1) !== -1 && (
              <input type="range" min={0} max={10} value={localUser.maxAliases ?? 1}
                onChange={e => setLocalUser((p: any) => ({ ...p, maxAliases: parseInt(e.target.value) }))}
                className="w-full accent-orange-500" />
            )}
            <Button size="sm" onClick={() => save({ maxAliases: localUser.maxAliases ?? 1 })} className="bg-orange-500 hover:bg-orange-400 text-black font-black w-full border-0">Save Alias Limit</Button>
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500">User Alias</Label>
            <div className="flex gap-2">
              <Input
                defaultValue={localUser.alias || ""}
                placeholder="Set alias (e.g. xos)..."
                className="bg-black/60 border-white/5 h-8 text-sm"
                id={`alias-input-${u.id}`}
              />
              <Button size="sm" onClick={() => {
                const val = (document.getElementById(`alias-input-${u.id}`) as HTMLInputElement)?.value || "";
                save({ alias: val || null });
              }} className="bg-orange-500 hover:bg-orange-400 text-black font-black border-0 shrink-0">Set</Button>
            </div>
            <p className="text-[10px] text-gray-600">Leave empty to clear alias. Current: {localUser.alias ? `/${localUser.alias}` : "none"}</p>
          </div>
        </div>
      )}

      {activeSection === "custom" && (
        <div className="space-y-3">
          <p className="text-[11px] text-gray-500">Grant this user a special custom badge only they have.</p>
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-gray-500">Badge Name</Label>
            <Input value={customBadgeName} onChange={e => setCustomBadgeName(e.target.value)} placeholder="e.g. Early Supporter" className="bg-black/60 border-white/5 h-9 text-sm" />
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-gray-500">Badge Icon</Label>
            <div className="flex gap-2">
              <Input value={customBadgeIcon} onChange={e => setCustomBadgeIcon(e.target.value)} placeholder="Emoji or URL..." className="bg-black/60 border-white/5 h-9 text-sm flex-1" />
              <label className={`flex items-center justify-center w-9 h-9 rounded border border-white/10 bg-white/5 hover:bg-orange-500/10 cursor-pointer ${isUploading ? "opacity-50 pointer-events-none" : ""}`}>
                {isUploading ? <Loader2 className="w-4 h-4 animate-spin text-orange-500" /> : <Upload className="w-4 h-4 text-gray-400" />}
                <input type="file" accept="image/*" className="hidden" onChange={handleCustomBadgeUpload} />
              </label>
            </div>
          </div>
          <Button onClick={grantCustomBadge} disabled={!customBadgeName.trim()} className="bg-orange-500 hover:bg-orange-400 text-black font-black w-full flex items-center gap-2 border-0">
            <Star className="w-4 h-4" /> Grant Custom Badge
          </Button>
          {(localUser.badges || []).filter((b: string) => b.startsWith("custom:")).length > 0 && (
            <div className="mt-2 space-y-1">
              <Label className="text-[10px] font-black uppercase text-gray-600">Current Custom Badges</Label>
              {(localUser.badges || []).filter((b: string) => b.startsWith("custom:")).map((b: string) => (
                <div key={b} className="flex items-center gap-2 p-2 bg-orange-500/5 border border-orange-500/20 rounded-lg">
                  <Star className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                  <span className="text-xs font-bold flex-1">{b.replace("custom:", "")}</span>
                  <button onClick={() => toggleBadge(b, false)} className="text-gray-600 hover:text-red-400 transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeSection === "views" && isOwner && (
        <div className="space-y-4">
          <div className="p-4 bg-black/40 rounded-xl border border-white/5 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 flex items-center gap-1.5"><Eye className="w-3 h-3" /> Current Views</p>
              <p className="text-2xl font-black text-orange-500 mt-1">{localUser.views ?? 0}</p>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Adjust Views</Label>
            <Input
              type="number"
              value={viewDelta}
              onChange={e => setViewDelta(e.target.value)}
              placeholder="Enter amount (use - to remove)"
              className="bg-black/60 border-white/5 h-9 text-sm"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                disabled={!viewDelta || isNaN(Number(viewDelta))}
                onClick={async () => {
                  const delta = parseInt(viewDelta);
                  if (isNaN(delta) || delta === 0) return;
                  try {
                    const res = await apiRequest("PATCH", `/api/admin/users/${u.id}/views`, { delta });
                    const data = await res.json();
                    setLocalUser((p: any) => ({ ...p, views: data.views }));
                    queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
                    toast({ title: `Views updated to ${data.views}` });
                    setViewDelta("");
                  } catch {
                    toast({ title: "Failed to update views", variant: "destructive" });
                  }
                }}
                className="flex-1 bg-orange-500 hover:bg-orange-400 text-black font-black border-0"
              >
                Apply Change
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  try {
                    const current = localUser.views ?? 0;
                    const res = await apiRequest("PATCH", `/api/admin/users/${u.id}/views`, { delta: -current });
                    const data = await res.json();
                    setLocalUser((p: any) => ({ ...p, views: data.views }));
                    queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
                    toast({ title: "Views reset to 0" });
                    setViewDelta("");
                  } catch {
                    toast({ title: "Failed to reset views", variant: "destructive" });
                  }
                }}
                className="border-red-500/30 text-red-400 hover:bg-red-500/10 font-black"
              >
                Reset to 0
              </Button>
            </div>
            <p className="text-[10px] text-gray-600">Positive numbers add views, negative numbers remove them.</p>
          </div>
        </div>
      )}

      {activeSection === "likes" && isOwner && (
        <div className="space-y-4">
          <div className="p-4 bg-black/40 rounded-xl border border-white/5 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 flex items-center gap-1.5">❤️ Bonus Likes (Admin)</p>
              <p className="text-2xl font-black text-pink-500 mt-1">{(localUser as any).bonusLikes ?? 0}</p>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Adjust Likes</Label>
            <Input
              type="number"
              value={likeDelta}
              onChange={e => setLikeDelta(e.target.value)}
              placeholder="Enter amount (use - to remove)"
              className="bg-black/60 border-white/5 h-9 text-sm"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                disabled={!likeDelta || isNaN(Number(likeDelta))}
                onClick={async () => {
                  const delta = parseInt(likeDelta);
                  if (isNaN(delta) || delta === 0) return;
                  try {
                    const res = await apiRequest("PATCH", `/api/admin/users/${u.id}/likes`, { delta });
                    const data = await res.json();
                    setLocalUser((p: any) => ({ ...p, bonusLikes: data.bonusLikes }));
                    queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
                    toast({ title: `Likes updated — total now ${data.totalLikes}` });
                    setLikeDelta("");
                  } catch {
                    toast({ title: "Failed to update likes", variant: "destructive" });
                  }
                }}
                className="flex-1 bg-pink-500 hover:bg-pink-400 text-white font-black border-0"
              >
                Apply Change
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  try {
                    const current = (localUser as any).bonusLikes ?? 0;
                    const res = await apiRequest("PATCH", `/api/admin/users/${u.id}/likes`, { delta: -current });
                    const data = await res.json();
                    setLocalUser((p: any) => ({ ...p, bonusLikes: data.bonusLikes }));
                    queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
                    toast({ title: "Bonus likes reset to 0" });
                    setLikeDelta("");
                  } catch {
                    toast({ title: "Failed to reset likes", variant: "destructive" });
                  }
                }}
                className="border-red-500/30 text-red-400 hover:bg-red-500/10 font-black"
              >
                Reset to 0
              </Button>
            </div>
            <p className="text-[10px] text-gray-600">Adds bonus likes on top of real profile likes. Positive numbers add, negative numbers remove.</p>
          </div>
        </div>
      )}

      <div className="pt-2 border-t border-white/5 space-y-2">
        <Label className="text-[10px] font-black uppercase tracking-widest text-purple-500/60">Premium Status</Label>
        <div className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${localUser.isPremium ? "border-purple-500/30 bg-purple-500/5" : "border-white/5 bg-black/20"}`}>
          <div>
            <p className="text-sm font-bold flex items-center gap-2">💎 Premium{localUser.isPremium && <span className="text-[9px] bg-purple-500/20 text-purple-400 border border-purple-500/30 px-1.5 py-0.5 rounded font-black uppercase">Active</span>}</p>
            <p className="text-[10px] text-gray-500 mt-0.5">{localUser.isPremium ? "User has premium. Revoke to remove badge." : "Grant premium access and Premium badge."}</p>
          </div>
          <Switch checked={!!localUser.isPremium} onCheckedChange={v => { setLocalUser((p: any) => ({ ...p, isPremium: v })); save({ isPremium: v }); }} />
        </div>
      </div>

      {activeSection === "data" && (isOwner || isSuperOwner) && (
        <div className="space-y-3">
          {userDataLoading ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="animate-spin w-6 h-6 text-orange-500" /></div>
          ) : userData ? (
            <div className="space-y-2">
              <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-2">
                <p className="text-[9px] font-black uppercase tracking-widest text-orange-500/60">Account Info</p>
                <div className="space-y-1.5 text-[12px]">
                  <div className="flex justify-between items-center"><span className="text-gray-500 font-semibold">Email</span><span className="text-white font-mono">{userData.email}</span></div>
                  <div className="flex justify-between items-center"><span className="text-gray-500 font-semibold">UID</span><span className="text-white font-mono">#{userData.id}</span></div>
                  <div className="flex justify-between items-center"><span className="text-gray-500 font-semibold">Role</span><span className="text-orange-400 font-bold uppercase">{userData.role}</span></div>
                  <div className="flex justify-between items-center"><span className="text-gray-500 font-semibold">Premium</span><span className={userData.isPremium ? "text-purple-400 font-bold" : "text-gray-600"}>{userData.isPremium ? "✓ Active" : "—"}</span></div>
                  <div className="flex justify-between items-center"><span className="text-gray-500 font-semibold">Views</span><span className="text-white font-mono">{userData.views ?? 0}</span></div>
                  <div className="flex justify-between items-center"><span className="text-gray-500 font-semibold">Joined</span><span className="text-white font-mono text-[10px]">{userData.joinDate ? new Date(userData.joinDate).toLocaleDateString() : "—"}</span></div>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-2">
                <p className="text-[9px] font-black uppercase tracking-widest text-[#5865F2]/60">Discord Profile</p>
                {userData.discordId ? (
                  <div className="space-y-1.5 text-[12px]">
                    {userData.discordAvatar && (
                      <div className="flex items-center gap-2 mb-2">
                        <img src={`https://cdn.discordapp.com/avatars/${userData.discordId}/${userData.discordAvatar}.png`} alt="" className="w-8 h-8 rounded-full" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                        <span className="font-bold text-white">{userData.discordUsername}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center"><span className="text-gray-500 font-semibold">Username</span><span className="text-[#7289da] font-mono">{userData.discordUsername || "—"}</span></div>
                    <div className="flex justify-between items-center"><span className="text-gray-500 font-semibold">Discord ID</span><span className="text-white font-mono text-[10px]">{userData.discordId}</span></div>
                  </div>
                ) : (
                  <p className="text-[11px] text-gray-600">No Discord account linked.</p>
                )}
              </div>
              <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[9px] font-black uppercase tracking-widest text-red-500/60">Password Hash (bcrypt)</p>
                  <AdminChangePasswordButton userId={u.id} />
                </div>
                <p className="text-[10px] font-mono text-gray-600 break-all select-all">{userData.passwordHash}</p>
              </div>
              <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-2">
                <p className="text-[9px] font-black uppercase tracking-widest text-orange-500/60">2FA Security</p>
                <div className="flex justify-between items-center text-[12px]">
                  <span className="text-gray-500 font-semibold">2FA Enabled</span>
                  <span className={userData.twoFactorEnabled ? "text-green-400 font-bold" : "text-gray-600"}>{userData.twoFactorEnabled ? "✓ Active" : "—"}</span>
                </div>
                {userData.twoFactorEnabled && userData.twoFactorCode && (
                  <div className="flex justify-between items-center text-[12px]">
                    <span className="text-gray-500 font-semibold">2FA Code</span>
                    <span className="text-orange-400 font-mono font-bold select-all">{userData.twoFactorCode}</span>
                  </div>
                )}
                {userData.twoFactorEnabled && (
                  <div className="space-y-2 pt-1 border-t border-white/5">
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Change 2FA Code</p>
                    <div className="flex gap-2">
                      <input
                        value={admin2faNewCode}
                        onChange={e => setAdmin2faNewCode(e.target.value.slice(0, 6))}
                        placeholder="New code (max 6 chars)"
                        maxLength={6}
                        className="flex-1 bg-black/60 border border-white/10 rounded-lg h-8 px-3 text-xs text-white placeholder:text-gray-600 outline-none focus:border-orange-500/50"
                      />
                      <button
                        onClick={handleAdmin2faUpdate}
                        disabled={admin2faLoading || !admin2faNewCode.trim()}
                        className="px-3 h-8 bg-orange-500 hover:bg-orange-400 text-black font-black rounded-lg text-xs transition-all disabled:opacity-50 flex items-center gap-1"
                      >
                        {admin2faLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Key className="w-3 h-3" />}
                        Set
                      </button>
                    </div>
                    <button
                      onClick={handleAdmin2faDisable}
                      disabled={admin2faLoading}
                      className="w-full py-1.5 rounded-lg border border-red-500/30 text-red-400 text-[10px] font-black uppercase tracking-widest hover:bg-red-500/10 transition-all disabled:opacity-50"
                    >
                      Disable 2FA
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <button onClick={loadUserData} className="w-full py-3 rounded-xl border border-white/10 text-gray-400 hover:text-white text-sm font-bold transition-colors">Load User Data</button>
          )}
        </div>
      )}

      {(!targetIsOwner || isSuperOwner) && (
        <div className="pt-2 border-t border-white/5 space-y-2">
          <Label className="text-[10px] font-black uppercase tracking-widest text-red-500/50">Account Control</Label>
          {(isOwner || isSuperOwner) && localUser.discordId && (
            <Button
              disabled={disconnectingDiscord}
              onClick={handleDisconnectDiscord}
              className="w-full bg-transparent border border-[#5865F2]/50 text-[#7289da] hover:bg-[#5865F2]/10 font-black flex items-center gap-2 transition-all"
            >
              {disconnectingDiscord ? <Loader2 className="w-4 h-4 animate-spin" /> : <SiDiscord className="w-4 h-4" />}
              {disconnectingDiscord ? "Disconnecting..." : "Disconnect Discord Account"}
            </Button>
          )}
          {isBanned ? (
            <Button className="w-full bg-transparent border border-green-500 text-green-500 hover:bg-green-500 hover:text-black font-black flex items-center gap-2 transition-all" onClick={() => save({ role: "user" })}>
              <Unlock className="w-4 h-4" /> Unban User
            </Button>
          ) : (
            <Button className="w-full bg-transparent border border-red-500/60 text-red-400 hover:bg-red-500 hover:text-white font-black flex items-center gap-2 transition-all" onClick={() => save({ role: "banned" })}>
              <Ban className="w-4 h-4" /> Ban User
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Super Owner ──────────────────────────────────────────────────────────────
const SUPER_OWNER_DISCORD_ID = "1243269414900596787";
const checkIsSuperOwner = (user: any) => user?.discordId === SUPER_OWNER_DISCORD_ID;

// ─── Dashboard Tabs ────────────────────────────────────────────────────────────

const TABS = [
  { value: "home",          label: "Home",             icon: Grid },
  { value: "profile",       label: "Bio",              icon: UserIcon },
  { value: "links",         label: "Links",            icon: LinkIcon },
  { value: "extras",        label: "Extras",           icon: Sparkles },
  { value: "miscellaneous", label: "Profile",          icon: Sliders },
  { value: "options",       label: "Options",          icon: Settings },
  { value: "badges",        label: "Badges",           icon: Award },
  { value: "markdowns",     label: "Markdowns",        icon: FileCode },
  { value: "settings",      label: "Settings",         icon: ShieldCheck },
];

export default function Dashboard({ activeTab: initialTab = "home", extrasSection: initialExtrasSection }: { activeTab?: string; extrasSection?: string }) {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState(initialTab);
  const [localProfile, setLocalProfile] = useState<any>(null);
  const [profileSettingsOpen, setProfileSettingsOpen] = useState(false);
  const [onboardingDone, setOnboardingDone] = useState(false);

  const { data: adminUsers } = useQuery<any>({ queryKey: ["/api/admin/users"], enabled: user?.role === "admin" || user?.role === "owner" });
  const { data: profile, isLoading: profileLoading } = useQuery<any>({ queryKey: ["/api/profile"] });
  const { data: badges } = useQuery<any>({ queryKey: ["/api/badges"] });
  const { data: userLinks, isLoading: linksLoading } = useQuery<any>({ queryKey: ["/api/links"] });
  const { data: userTracks } = useQuery<any>({ queryKey: ["/api/tracks"] });
  const { data: viewsHistory } = useQuery<any>({ queryKey: ["/api/user/views-history"] });
  const { data: userLikes } = useQuery<{ likes: number }>({ queryKey: ["/api/user/likes"] });
  const { data: dailyRewardData } = useQuery<any>({ queryKey: ["/api/daily-reward"] });

  useEffect(() => {
    if (!localProfile && profile !== undefined) setLocalProfile(profile || {});
  }, [profile]);

  // Auto-sync Discord badges on dashboard mount
  const badgeAutoSyncedRef = useRef(false);
  useEffect(() => {
    if (!user || badgeAutoSyncedRef.current) return;
    if ((user as any).discordId) {
      badgeAutoSyncedRef.current = true;
      apiRequest("POST", "/api/user/sync-discord-badges", {}).then(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/user"] });
        queryClient.invalidateQueries({ queryKey: ["/api/badges"] });
      }).catch(() => {});
    }
  }, [user]);

  // Show toast for Discord link result from redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const discordParam = params.get("discord");
    const errorParam = params.get("error");
    if (discordParam === "linked") {
      toast({ title: "Discord connected!", description: "Your Discord account is now linked to your profile.", duration: 4000 });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      window.history.replaceState({}, "", window.location.pathname);
    } else if (errorParam === "discord_already_linked") {
      toast({ title: "Already linked", description: "This Discord account is already connected to another Hexed profile.", variant: "destructive", duration: 5000 });
      window.history.replaceState({}, "", window.location.pathname);
    } else if (errorParam === "discord_link_failed") {
      toast({ title: "Link failed", description: "Could not connect your Discord account. Please try again.", variant: "destructive", duration: 5000 });
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const profileMutation = useMutation({
    mutationFn: (updates: any) => apiRequest("PATCH", "/api/profile", updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      toast({ title: "✓ Profile saved", description: "Your changes are now live on your public page.", duration: 3000 });
    },
  });

  const claimDailyMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/daily-reward/claim"),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/daily-reward"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/alias"] });
      const reward = data?.reward || "Daily reward claimed!";
      toast({ title: `🔥 Day ${data?.streak} claimed!`, description: reward, duration: 4000 });
    },
    onError: (err: any) => {
      const msg = (err?.message || "").replace(/^\d+:\s*/, "");
      toast({ title: msg || "Already claimed today", variant: "destructive" });
    },
  });

  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const resetProfileMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/profile/reset"),
    onSuccess: (data: any) => {
      setLocalProfile(data);
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tracks"] });
      setShowResetConfirm(false);
      toast({ title: "Profile reset", description: "All settings have been restored to defaults." });
    },
    onError: () => {
      toast({ title: "Reset failed", variant: "destructive" });
    },
  });

  const upd = (field: string, val: any) => setLocalProfile((p: any) => ({ ...p, [field]: val }));
  const updS = (key: string, val: any) => setLocalProfile((p: any) => ({
    ...p,
    settings: { ...(p?.settings || {}), [key]: val }
  }));
  const getS = (key: string, def: any) => localProfile?.settings?.[key] !== undefined ? localProfile.settings[key] : def;

  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!user || profileLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <span className="text-xs font-black italic tracking-widest text-white/60">HEXED.AT</span>
      </div>
    );
  }

  const isAdmin = isStaff(user.role);
  const isOwner = user.role === "owner";
  const isDev = user.role === "developer" || user.role === "owner";
  const isSuperOwner = checkIsSuperOwner(user);
  const canCreateBadge = canManageBadgesPerm(user.role);
  const canGiveBadge = canGiveBadgesPerm(user.role);
  const allTabs = isAdmin ? [...TABS, { value: "admin", label: "Admin", icon: Shield }] : TABS;

  // Discord gate — staff (not owners) must connect Discord
  if (isAdmin && !isOwner && !(user as any).discordId) {
    return (
      <div className="h-screen bg-[#050505] text-white flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-sm w-full text-center space-y-6"
        >
          <div className="w-20 h-20 rounded-2xl bg-[#5865F2]/10 border border-[#5865F2]/30 flex items-center justify-center mx-auto">
            <SiDiscord className="w-10 h-10 text-[#7289da]" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-[10px] font-black uppercase tracking-widest mb-3">
              Staff Requirement
            </div>
            <h1 className="text-2xl font-black mb-2">Connect your Discord</h1>
            <p className="text-gray-500 text-sm leading-relaxed">Staff accounts must have a Discord account connected to access the dashboard. This is required for security and team coordination.</p>
          </div>
          <a
            href="/auth/discord/link"
            className="flex items-center justify-center gap-2.5 w-full px-6 py-3.5 rounded-2xl bg-[#5865F2] hover:bg-[#4752C4] text-white font-black text-sm transition-colors"
          >
            <SiDiscord className="w-5 h-5" /> Connect Discord
          </a>
          <button onClick={() => logout()} className="text-xs text-gray-600 hover:text-gray-400 transition-colors">Log out instead</button>
        </motion.div>
      </div>
    );
  }

  const showOnboarding = !onboardingDone && !(user as any)?.profileSetupDone && profile !== undefined;

  return (
    <div className="h-screen bg-[#050505] text-white flex overflow-hidden">

      {/* ── Onboarding Stepper ── */}
      {showOnboarding && (
        <OnboardingStepper
          initialThemeColor={localProfile?.themeColor || "#F97316"}
          onDone={(changes) => {
            if (changes.themeColor) setLocalProfile((p: any) => ({ ...p, ...changes }));
            setOnboardingDone(true);
          }}
        />
      )}

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-30 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── LEFT SIDEBAR ── */}
      <aside className={`fixed md:relative z-40 h-screen md:h-screen md:flex flex-col bg-[#070707] border-r border-white/[0.05] w-56 shrink-0 transition-transform duration-300 ${sidebarOpen ? "translate-x-0 flex" : "-translate-x-full md:translate-x-0 hidden md:flex"}`}>

        {/* Logo */}
        <div className="px-5 pt-6 pb-4 border-b border-white/[0.05]">
          <a href="/" className="text-2xl font-black text-orange-500 tracking-tighter block">Hexed</a>
          <p className="text-[10px] text-gray-600 mt-0.5 font-semibold uppercase tracking-widest">Dashboard</p>
        </div>

        {/* User info */}
        <div className="px-4 py-4 border-b border-white/[0.05]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0 overflow-hidden">
              {(localProfile as any)?.avatarUrl ? (
                <img src={(localProfile as any).avatarUrl.startsWith("/objects/") ? `${window.location.origin}${(localProfile as any).avatarUrl}` : (localProfile as any).avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-orange-500 font-black text-sm">{user.username[0]?.toUpperCase()}</span>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-black truncate">{user.username}</p>
              <p className="text-[9px] text-orange-500 uppercase tracking-widest font-bold">{user.role}</p>
            </div>
          </div>
          {(user as any).isPremium && (
            <div className="mt-2 flex items-center gap-1.5 px-2 py-1 rounded-lg bg-purple-500/10 border border-purple-500/20">
              <span className="text-[10px]">💎</span>
              <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest">Premium</span>
            </div>
          )}
        </div>

        {/* Nav tabs */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {allTabs.map(tab => {
            const Icon = (tab as any).icon || Grid;
            const isActive = activeTab === tab.value;
            const tabLabelKey: Record<string, string> = {
              home: "nav.dashboard", profile: "nav.profile", links: "nav.links",
              badges: "nav.badges", extras: "nav.extras", admin: "Admin",
              markdowns: "Markdowns", options: "nav.options",
            };
            return (
              <button
                key={tab.value}
                onClick={() => { setActiveTab(tab.value); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all group relative ${
                  isActive
                    ? "bg-orange-500 text-black"
                    : "text-gray-500 hover:text-white hover:bg-white/[0.05]"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="font-black text-sm tracking-wide">{t(tabLabelKey[tab.value] || "", tab.label)}</span>
                {isActive && <motion.div layoutId="sidebar-active" className="absolute inset-0 rounded-xl bg-orange-500" style={{ zIndex: -1 }} />}
              </button>
            );
          })}
        </nav>

        {/* Bottom actions */}
        <div className="px-3 py-4 border-t border-white/[0.05] space-y-1">
          <a href={`/${user.username}`} target="_blank" rel="noreferrer"
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-gray-500 hover:text-white hover:bg-white/[0.05] transition-all">
            <Eye className="w-4 h-4 shrink-0" />
            <span className="font-bold text-sm">{t("nav.viewProfile", "View Profile")}</span>
          </a>
          <a href="/shop"
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-gray-500 hover:text-orange-500 hover:bg-orange-500/[0.05] transition-all">
            <Star className="w-4 h-4 shrink-0" />
            <span className="font-bold text-sm">{t("nav.shop", "Shop")}</span>
          </a>
          <button onClick={() => logout()}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-gray-600 hover:text-red-400 hover:bg-red-500/[0.05] transition-all">
            <X className="w-4 h-4 shrink-0" />
            <span className="font-bold text-sm">{t("nav.logout", "Log Out")}</span>
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8">
        {/* Top bar with hamburger and language switcher */}
        <div className="flex justify-between items-center mb-4">
          <button
            onClick={() => setSidebarOpen(v => !v)}
            className="md:hidden flex items-center justify-center w-9 h-9 rounded-xl border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 transition-all"
            data-testid="button-mobile-menu"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="1" y="3" width="14" height="1.5" rx="0.75" fill="currentColor"/>
              <rect x="1" y="7.25" width="14" height="1.5" rx="0.75" fill="currentColor"/>
              <rect x="1" y="11.5" width="14" height="1.5" rx="0.75" fill="currentColor"/>
            </svg>
          </button>
          <div className="flex-1 flex justify-end">
            <LanguageSwitcherEdge />
          </div>
        </div>
        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}>

            {/* HOME */}
            {activeTab === "home" && (
              <div className="space-y-6">
                <div>
                  <h1 className="text-2xl font-black">{t("dashboard.title", "Dashboard")}</h1>
                  <p className="text-gray-500 text-sm mt-1">{t("dashboard.subtitle", "Manage your Hexed profile")}</p>
                </div>
                <AnnouncementsBanner />
                <div className="grid gap-4 md:grid-cols-4">
                  <BorderGlow className="md:col-span-2 rounded-2xl" backgroundColor="#0e0e0e" borderRadius={16} colors={["#F97316", "#fb923c", "#ea580c"]}>
                    <div className="p-6 flex items-center gap-4">
                      <Avatar className="w-14 h-14 border border-white/10">
                        <AvatarImage src={resolveUrl(profile?.avatarUrl)} />
                        <AvatarFallback className="bg-orange-500/10 text-orange-500 font-black text-xl">{user.username[0].toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-black text-lg leading-tight">{profile?.displayName || user.username}</p>
                        <p className="text-[10px] text-gray-500 uppercase font-bold mt-0.5">@{user.username}</p>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${user.role === "owner" ? "bg-red-500/20 text-red-400" : user.role === "admin" ? "bg-orange-500/20 text-orange-400" : "bg-white/10 text-gray-400"}`}>{user.role}</span>
                          {(user as any).isPremium && <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-purple-500/20 text-purple-400 border border-purple-500/20">💎 Premium</span>}
                          {(user as any).discordId && <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-[#5865F2]/20 text-[#7289da] border border-[#5865F2]/20 flex items-center gap-1"><SiDiscord className="w-2.5 h-2.5" />Discord</span>}
                        </div>
                      </div>
                    </div>
                  </BorderGlow>
                  <BorderGlow className="rounded-2xl" backgroundColor="#0e0e0e" borderRadius={16} colors={["#F97316", "#fb923c", "#ea580c"]}>
                    <div className="p-6">
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-600 flex items-center gap-1.5"><Eye className="w-3 h-3" /> Views</p>
                      <p className="text-4xl font-black text-orange-500 mt-2">{user.views || 0}</p>
                      <p className="text-[10px] text-gray-600 mt-1">Profile views</p>
                    </div>
                  </BorderGlow>
                  <BorderGlow className="rounded-2xl" backgroundColor="#0e0e0e" borderRadius={16} colors={["#ec4899", "#f43f5e", "#fb7185"]}>
                    <div className="p-6">
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-600 flex items-center gap-1.5">❤ Likes</p>
                      <p className="text-4xl font-black text-pink-500 mt-2">{userLikes?.likes ?? 0}</p>
                      <p className="text-[10px] text-gray-600 mt-1">Profile likes</p>
                    </div>
                  </BorderGlow>
                </div>

                {/* Connect Discord Banner */}
                {!(user as any).discordId && (
                  <div className="flex items-center justify-between gap-4 p-5 rounded-2xl border border-[#5865F2]/30 bg-gradient-to-r from-[#5865F2]/10 to-[#5865F2]/5">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-[#5865F2]/20 border border-[#5865F2]/30 flex items-center justify-center shrink-0">
                        <SiDiscord className="w-5 h-5 text-[#7289da]" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-black text-sm text-white">Haven't connected your Discord yet?</p>
                        <p className="text-[11px] text-gray-400 mt-0.5 leading-snug">Link your Discord to get role linked badges automatically, use Discord Preference, and more.</p>
                      </div>
                    </div>
                    <a
                      href="/auth/discord/link"
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] text-white font-black text-xs transition-colors shrink-0"
                      data-testid="button-connect-discord"
                    >
                      <SiDiscord className="w-3.5 h-3.5" />
                      Connect
                    </a>
                  </div>
                )}

                {/* Daily Reward */}
                {dailyRewardData && (
                  <BorderGlow className="rounded-2xl" backgroundColor="#0e0e0e" borderRadius={16} colors={["#F97316", "#fb923c", "#fbbf24"]}>
                  <div className="p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-600 flex items-center gap-1.5">🔥 Daily Reward</p>
                        <p className="text-sm font-black mt-1">
                          {dailyRewardData.canClaim ? "Claim your daily reward!" : "Come back tomorrow for your next reward"}
                        </p>
                        <p className="text-[11px] text-gray-500 mt-0.5">Streak: Day {dailyRewardData.streak || 0} / 7</p>
                      </div>
                      <button
                        onClick={() => claimDailyMutation.mutate()}
                        disabled={!dailyRewardData.canClaim || claimDailyMutation.isPending}
                        className="px-4 py-2 rounded-xl font-black text-sm transition-all border shrink-0 disabled:opacity-40
                          bg-orange-500 hover:bg-orange-400 text-black border-orange-500 disabled:cursor-not-allowed">
                        {claimDailyMutation.isPending ? <Loader2 className="animate-spin w-4 h-4" /> : dailyRewardData.canClaim ? "Claim" : "Claimed"}
                      </button>
                    </div>
                    <div className="grid grid-cols-7 gap-1.5">
                      {(dailyRewardData.rewards || []).map((r: any) => {
                        const isCompleted = (dailyRewardData.streak ?? 0) >= r.day && !dailyRewardData.canClaim;
                        const isCurrent = r.day === ((dailyRewardData.streak ?? 0) + (dailyRewardData.canClaim ? 1 : 0));
                        const isActive = dailyRewardData.canClaim && isCurrent;
                        return (
                          <div key={r.day} className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition-all ${isCompleted ? "border-orange-500/40 bg-orange-500/10" : isActive ? "border-orange-500 bg-orange-500/20 shadow-lg shadow-orange-500/20" : "border-white/5 bg-black/20"}`}>
                            <span className="text-[9px] font-black uppercase text-gray-600">{r.label}</span>
                            <span className="text-base">{r.day === 7 ? "🔥" : r.day === 3 ? "🔗" : "⭐"}</span>
                            <span className={`text-[8px] font-bold text-center leading-tight ${isCompleted ? "text-orange-400" : isActive ? "text-orange-300" : "text-gray-600"}`}>{r.reward}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  </BorderGlow>
                )}

                {/* Daily Views Chart */}
                {viewsHistory && viewsHistory.length > 0 && (
                  <BorderGlow className="rounded-2xl" backgroundColor="#0e0e0e" borderRadius={16} colors={["#F97316", "#fb923c", "#ea580c"]}>
                  <div className="p-5">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-4 flex items-center gap-1.5"><Eye className="w-3 h-3" /> Views Last 30 Days</p>
                    <ResponsiveContainer width="100%" height={90}>
                      <BarChart data={viewsHistory} margin={{ top: 0, right: 0, left: -32, bottom: 0 }}>
                        <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#555" }} axisLine={false} tickLine={false}
                          tickFormatter={(v: string) => { const d = new Date(v); return `${d.getDate()}/${d.getMonth()+1}`; }}
                          interval={Math.max(0, Math.floor((viewsHistory.length - 1) / 6))}
                        />
                        <Tooltip
                          contentStyle={{ background: "#111", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 8, fontSize: 11 }}
                          labelFormatter={(v: string) => new Date(v).toLocaleDateString()}
                          formatter={(v: number) => [v, "views"]}
                        />
                        <Bar dataKey="count" radius={[3,3,0,0]} maxBarSize={18}>
                          {viewsHistory.map((_: any, i: number) => (
                            <Cell key={i} fill={i === viewsHistory.length - 1 ? "#f97316" : "#f9731655"} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  </BorderGlow>
                )}

                {/* Premium Advanced Analytics */}
                {(user as any).isPremium && userLinks && userLinks.length > 0 && (
                  <BorderGlow className="rounded-2xl" backgroundColor="#0e0e0e" borderRadius={16} colors={["#a855f7", "#c084fc", "#7c3aed"]}>
                  <div className="p-5 border border-purple-500/20 rounded-2xl">
                    <p className="text-[10px] font-black uppercase tracking-widest text-purple-400/70 mb-4 flex items-center gap-1.5">
                      <Zap className="w-3 h-3" /> Advanced Analytics <span className="ml-1 text-[8px] bg-purple-500/20 border border-purple-500/30 px-1.5 py-0.5 rounded">Premium</span>
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                      <div className="bg-black/30 rounded-xl p-3 border border-white/5">
                        <p className="text-[9px] uppercase font-black tracking-widest text-gray-600 mb-1">Total Clicks</p>
                        <p className="text-xl font-black text-white">{userLinks.reduce((s: number, l: any) => s + (l.clicks || 0), 0)}</p>
                      </div>
                      <div className="bg-black/30 rounded-xl p-3 border border-white/5">
                        <p className="text-[9px] uppercase font-black tracking-widest text-gray-600 mb-1">Active Links</p>
                        <p className="text-xl font-black text-white">{userLinks.filter((l: any) => l.enabled).length}</p>
                      </div>
                      <div className="bg-black/30 rounded-xl p-3 border border-white/5">
                        <p className="text-[9px] uppercase font-black tracking-widest text-gray-600 mb-1">Profile Likes</p>
                        <p className="text-xl font-black text-pink-400">{userLikes?.likes ?? 0}</p>
                      </div>
                      <div className="bg-black/30 rounded-xl p-3 border border-white/5">
                        <p className="text-[9px] uppercase font-black tracking-widest text-gray-600 mb-1">Click Rate</p>
                        <p className="text-xl font-black text-orange-400">
                          {user.views > 0 ? ((userLinks.reduce((s: number, l: any) => s + (l.clicks || 0), 0) / user.views) * 100).toFixed(1) : "0.0"}%
                        </p>
                      </div>
                    </div>
                    {userLinks.filter((l: any) => l.clicks > 0).length > 0 && (
                      <div>
                        <p className="text-[9px] uppercase font-black tracking-widest text-gray-600 mb-2">Top Links by Clicks</p>
                        <div className="space-y-1.5">
                          {[...userLinks].filter((l: any) => l.clicks > 0).sort((a: any, b: any) => (b.clicks || 0) - (a.clicks || 0)).slice(0, 5).map((l: any) => {
                            const maxClicks = Math.max(...userLinks.map((x: any) => x.clicks || 0));
                            const pct = maxClicks > 0 ? ((l.clicks || 0) / maxClicks) * 100 : 0;
                            return (
                              <div key={l.id} className="flex items-center gap-2">
                                <p className="text-[10px] text-gray-400 truncate w-28 shrink-0">{l.title}</p>
                                <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                  <div className="h-full rounded-full bg-purple-500/70 transition-all" style={{ width: `${pct}%` }} />
                                </div>
                                <p className="text-[10px] font-black text-gray-500 w-8 text-right">{l.clicks}</p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                  </BorderGlow>
                )}

                {!(user as any).isPremium && (
                  <a href="/shop/premium" className="flex items-center gap-4 p-5 bg-[#1a0f30] border border-purple-500/20 rounded-2xl hover:border-purple-500/40 transition-all group">
                    <span className="text-3xl">💎</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-sm text-purple-300 group-hover:text-purple-200 transition-colors">Go Premium — €4.99</p>
                      <p className="text-[11px] text-purple-500/70 mt-0.5">Remove watermark, unlock effects, 20 tracks, and more</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-purple-600 group-hover:text-purple-400 shrink-0 transition-colors" />
                  </a>
                )}

                <div className="grid md:grid-cols-2 gap-3">
                  {[
                    { label: "Bio & Info", desc: "Avatar, bio, banner, location", tab: "profile" },
                    { label: "Manage Links", desc: "Add and reorder your links", tab: "links" },
                    { label: "Profile Settings", desc: "Effects, colors, animations and more", tab: "miscellaneous" },
                    { label: "Options", desc: "Visibility settings", tab: "options" },
                    { label: "View Badges", desc: "See your earned badges", tab: "badges" },
                    { label: "Extras", desc: "Tags, custom badges, and more", tab: "extras" },
                    ...(isAdmin ? [{ label: "User Databank", desc: "Manage all users", tab: "databank" }] : []),
                  ].map(item => (
                    <button key={item.tab} onClick={() => setActiveTab(item.tab)}
                      className="flex items-center justify-between p-4 bg-[#0e0e0e] border border-white/[0.06] rounded-2xl hover:border-orange-500/30 hover:bg-white/[0.02] transition-all group text-left">
                      <div>
                        <p className="font-black text-sm group-hover:text-orange-500 transition-colors">{item.label}</p>
                        <p className="text-[11px] text-gray-600 mt-0.5">{item.desc}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-orange-500 transition-colors" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* PROFILE */}
            {activeTab === "profile" && (
              <div className="space-y-6 max-w-2xl">
                <div>
                  <h1 className="text-2xl font-black">Profile Editor</h1>
                  <p className="text-gray-500 text-sm mt-1">Customize how your page looks</p>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-[#0e0e0e] border border-white/[0.06] rounded-2xl p-5 space-y-4">
                    <h3 className="text-[11px] font-black uppercase tracking-widest text-gray-500">Avatar</h3>
                    <MediaField label="Avatar Image" value={localProfile?.avatarUrl || ""} onChange={v => upd("avatarUrl", v)}
                      accept="image/*,video/*" uploadId="avatar-upload" mediaType="image" icon={<UserIcon className="w-3 h-3" />} />
                  </div>
                  <div className="bg-[#0e0e0e] border border-white/[0.06] rounded-2xl p-5 space-y-4">
                    <h3 className="text-[11px] font-black uppercase tracking-widest text-gray-500">Banner</h3>
                    <MediaField label="Banner Image" value={localProfile?.bannerUrl || ""} onChange={v => upd("bannerUrl", v)}
                      accept="image/*,video/*" uploadId="banner-upload" mediaType="image" icon={<ImageIcon className="w-3 h-3" />} maxSizeMB={25} isPremium={!!(user as any)?.isPremium} />
                  </div>
                </div>

                <div className="bg-[#0e0e0e] border border-white/[0.06] rounded-2xl p-5 space-y-4">
                  <h3 className="text-[11px] font-black uppercase tracking-widest text-gray-500">Info</h3>
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-black uppercase text-gray-500">Display Name</Label>
                      <Input value={localProfile?.displayName || ""} onChange={e => upd("displayName", e.target.value)}
                        placeholder={user.username} className="bg-black/60 border-white/5 focus:border-orange-500/50" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-black uppercase text-gray-500">Bio</Label>
                      <Textarea value={localProfile?.bio || ""} onChange={e => upd("bio", e.target.value)}
                        placeholder="Write your bio... Supports Voidmark tags" rows={3}
                        className="bg-black/60 border-white/5 focus:border-orange-500/50 resize-none" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-black uppercase text-gray-500">Location</Label>
                      <Input value={localProfile?.location || ""} onChange={e => upd("location", e.target.value)}
                        placeholder="City, Country" className="bg-black/60 border-white/5 focus:border-orange-500/50" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-black uppercase text-gray-500">Content Direction</Label>
                      <div className="flex gap-2">
                        {([["left", AlignLeft], ["center", AlignCenter], ["right", AlignRight]] as const).map(([v, Icon]) => (
                          <button key={v} onClick={() => updS("contentAlign", v)}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border text-[11px] font-black uppercase transition-all ${getS("contentAlign","center") === v ? "border-orange-500 bg-orange-500/10 text-orange-500" : "border-white/10 text-gray-500 hover:border-white/30 hover:text-white"}`}>
                            <Icon className="w-4 h-4" />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-[#0e0e0e] border border-white/[0.06] rounded-2xl p-5 space-y-4">
                  <h3 className="text-[11px] font-black uppercase tracking-widest text-gray-500">Background Media</h3>
                  <MediaField label="Background Image" value={localProfile?.backgroundUrl || ""} onChange={v => upd("backgroundUrl", v)}
                    accept="image/*" uploadId="bg-img-upload" mediaType="image" icon={<ImageIcon className="w-3 h-3" />} maxSizeMB={50} isPremium={!!(user as any)?.isPremium} />
                  <MediaField label="Background Video" value={localProfile?.backgroundVideoUrl || ""} onChange={v => upd("backgroundVideoUrl", v)}
                    accept="video/*" uploadId="bg-vid-upload" mediaType="video" icon={<Video className="w-3 h-3" />} maxSizeMB={50} isPremium={!!(user as any)?.isPremium} />
                </div>

                <div className="bg-[#0e0e0e] border border-white/[0.06] rounded-2xl p-5 space-y-4">
                  <h3 className="text-[11px] font-black uppercase tracking-widest text-gray-500">Reveal Screen</h3>
                  <SettingRow label="Enable Reveal Screen" desc="Show a gated screen before profile loads">
                    <Switch checked={!!localProfile?.revealEnabled} onCheckedChange={v => upd("revealEnabled", v)} />
                  </SettingRow>
                  {localProfile?.revealEnabled && (
                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-black uppercase text-gray-500">Reveal Text</Label>
                      <Input value={localProfile?.revealText || ""} onChange={e => upd("revealText", e.target.value)}
                        placeholder="Click to reveal" className="bg-black/60 border-white/5 focus:border-orange-500/50" />
                    </div>
                  )}
                </div>

                <UsernameChangeSection user={user} />

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowResetConfirm(true)}
                    className="px-4 h-10 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 font-black text-sm transition-all"
                    data-testid="button-reset-profile"
                  >
                    Reset All
                  </button>
                  <Button onClick={() => profileMutation.mutate(localProfile)} disabled={profileMutation.isPending}
                    className="bg-orange-500 hover:bg-orange-400 text-black font-black px-8 border-0">
                    {profileMutation.isPending ? <Loader2 className="animate-spin w-4 h-4" /> : "Save Profile"}
                  </Button>
                </div>

                {showResetConfirm && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
                    <div className="bg-[#0e0e0e] border border-red-500/30 rounded-2xl p-6 w-full max-w-sm mx-4 space-y-4">
                      <div>
                        <h3 className="font-black text-lg text-white">Reset all settings?</h3>
                        <p className="text-[13px] text-gray-400 mt-1">This will clear your bio, banner, background, tracks and all visual settings. This cannot be undone.</p>
                      </div>
                      <div className="flex gap-3">
                        <button onClick={() => setShowResetConfirm(false)} className="flex-1 h-10 rounded-xl border border-white/10 text-gray-400 hover:border-white/30 hover:text-white font-black text-sm transition-all">
                          Cancel
                        </button>
                        <button
                          onClick={() => resetProfileMutation.mutate()}
                          disabled={resetProfileMutation.isPending}
                          className="flex-1 h-10 rounded-xl bg-red-500 hover:bg-red-400 text-white font-black text-sm transition-all flex items-center justify-center gap-2"
                          data-testid="button-confirm-reset"
                        >
                          {resetProfileMutation.isPending ? <Loader2 className="animate-spin w-4 h-4" /> : "Yes, Reset All"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* LINKS */}
            {activeTab === "links" && (
              <LinksTab userLinks={userLinks} linksLoading={linksLoading} />
            )}

            {/* MISCELLANEOUS */}
            {activeTab === "miscellaneous" && (
              localProfile
                ? <MiscTab
                    localProfile={localProfile}
                    upd={upd}
                    updS={updS}
                    getS={getS}
                    userTracks={userTracks}
                    profileMutation={profileMutation}
                    user={user}
                  />
                : <div className="flex items-center justify-center py-24"><Loader2 className="animate-spin text-orange-500 w-6 h-6" /></div>
            )}

            {/* OPTIONS */}
            {activeTab === "options" && (
              <div className="space-y-6 max-w-2xl">
                <div>
                  <h1 className="text-2xl font-black">Options</h1>
                  <p className="text-gray-500 text-sm mt-1">Visibility and layout settings</p>
                </div>
                <div className="bg-[#0e0e0e] border border-white/[0.06] rounded-2xl divide-y divide-white/[0.04]">
                  {[
                    { label: "Show View Count", field: "showViews", desc: "Display total profile views publicly", locked: false },
                    { label: "Show User ID", field: "showUid", desc: "Show your UID on your profile", locked: false },
                    { label: "Show Join Date", field: "showJoinDate", desc: "Display when you joined", locked: false },
                    { label: "Hide Watermark", field: "showWatermark", desc: (user as any).isPremium ? "Hide the Hexed corner watermark" : "Requires Premium to hide watermark", locked: !(user as any).isPremium, invert: true },
                  ].map(({ label, field, desc, locked, invert }) => (
                    <div key={field} className="flex items-center justify-between px-5 py-4">
                      <div>
                        <p className={`text-sm font-bold flex items-center gap-2 ${locked ? "text-gray-500" : ""}`}>
                          {label}
                          {locked && <a href="/shop/premium" className="text-[9px] bg-purple-500/20 text-purple-400 border border-purple-500/30 px-1.5 py-0.5 rounded font-black uppercase tracking-wider hover:bg-purple-500/30 transition-colors">Premium</a>}
                        </p>
                        <p className="text-[11px] text-gray-500 mt-0.5">{desc}</p>
                      </div>
                      <Switch
                        disabled={locked}
                        checked={invert ? !localProfile?.[field] : !!localProfile?.[field]}
                        onCheckedChange={v => upd(field, invert ? !v : v)}
                      />
                    </div>
                  ))}
                  <div className="flex items-center justify-between px-5 py-4">
                    <div>
                      <p className="text-sm font-bold">Show Like Counter</p>
                      <p className="text-[11px] text-gray-500 mt-0.5">Display the like count badge on your profile (top left)</p>
                    </div>
                    <Switch
                      checked={getS("showLikeCounter", true)}
                      onCheckedChange={v => updS("showLikeCounter", v)}
                    />
                  </div>
                </div>

                {/* Meta Info Position */}
                <div className="bg-[#0e0e0e] border border-white/[0.06] rounded-2xl p-5 space-y-4">
                  <div>
                    <h3 className="font-black text-sm">Meta Info Position</h3>
                    <p className="text-[11px] text-gray-500 mt-0.5">Where to display UID, views, and join date on your profile</p>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {[
                      { val: "default",   label: "Below Bio" },
                      { val: "top-right", label: "Top Right" },
                      { val: "center",    label: "Center" },
                    ].map(({ val, label }) => (
                      <button key={val}
                        onClick={() => updS("metaInfoPos", val)}
                        className={`px-4 py-2 rounded-xl font-black text-xs border transition-all duration-200 ${getS("metaInfoPos", "default") === val ? "bg-orange-500 border-orange-500 text-black" : "border-white/10 text-gray-400 hover:border-orange-500/40 hover:text-white"}`}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <Button onClick={() => profileMutation.mutate(localProfile)} disabled={profileMutation.isPending}
                  className="bg-orange-500 hover:bg-white hover:text-black text-black font-black px-8 border border-orange-500 hover:border-white transition-all">
                  {profileMutation.isPending ? <Loader2 className="animate-spin w-4 h-4" /> : "Save Options"}
                </Button>
              </div>
            )}

            {/* BADGES */}
            {activeTab === "badges" && (
              <BadgesTab user={user} badges={badges} localProfile={localProfile} profileMutation={profileMutation} getS={getS} updS={updS} />
            )}

            {/* EXTRAS */}
            {activeTab === "extras" && localProfile && (
              <ExtrasTab user={user} localProfile={localProfile} upd={upd} updS={updS} getS={getS} profileMutation={profileMutation} userTracks={userTracks} defaultSection={initialExtrasSection} />
            )}

            {activeTab === "markdowns" && <MarkdownsTab />}

            {/* SETTINGS */}
            {activeTab === "settings" && <ProfileSettingsTab />}

            {/* ADMIN (consolidated) */}
            {activeTab === "admin" && isAdmin && (
              <AdminTab adminUsers={adminUsers} badges={badges} isOwner={isOwner} isAdmin={isAdmin} user={user} canCreateBadge={canCreateBadge} canGiveBadge={canGiveBadge} isSuperOwner={isSuperOwner} />
            )}

          </motion.div>
        </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

// ─── Announcements Banner ─────────────────────────────────────────────────────

function AnnouncementsBanner() {
  const { data: annos = [] } = useQuery<any[]>({ queryKey: ["/api/announcements"] });
  const [dismissed, setDismissed] = useState<number[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("hexed_dismissed_announcements") || "[]");
    } catch { return []; }
  });

  const dismiss = (id: number) => {
    const next = [...dismissed, id];
    setDismissed(next);
    localStorage.setItem("hexed_dismissed_announcements", JSON.stringify(next));
  };

  const visible = (annos || []).filter((a: any) => !dismissed.includes(a.id));
  if (visible.length === 0) return null;

  const typeStyles: Record<string, string> = {
    info: "border-blue-500/30 bg-blue-500/5 text-blue-300",
    warning: "border-yellow-500/30 bg-yellow-500/5 text-yellow-300",
    success: "border-green-500/30 bg-green-500/5 text-green-300",
    error: "border-red-500/30 bg-red-500/5 text-red-300",
  };

  return (
    <div className="space-y-2">
      {visible.map((a: any) => (
        <motion.div
          key={a.id}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className={`flex items-start gap-3 p-4 rounded-2xl border ${typeStyles[a.type] || typeStyles.info}`}
        >
          <div className="flex-1 min-w-0">
            <p className="font-black text-sm">{a.title}</p>
            {a.content && <p className="text-[12px] mt-0.5 opacity-80">{a.content}</p>}
          </div>
          <button
            onClick={() => dismiss(a.id)}
            className="shrink-0 opacity-60 hover:opacity-100 transition-opacity mt-0.5"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      ))}
    </div>
  );
}

// ─── Badges Tab ───────────────────────────────────────────────────────────────

function BadgesTab({ user, badges }: { user: any; badges: any[]; localProfile?: any; profileMutation?: any; getS?: any; updS?: any }) {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const hasDiscord = !!(user as any).discordId;

  useEffect(() => {
    if (!hasDiscord) return;
    apiRequest("POST", "/api/user/sync-discord-badges", {}).then(() => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/badges"] });
    }).catch(() => {});
  }, [hasDiscord]);

  const userBadgeNames: string[] = user.badges || [];
  const hiddenBadges: string[] = (user as any).hiddenBadges || [];

  // Show ALL badges visible to all (or to this user)
  const visibleBadges = (badges || [])
    .filter((b: any) => {
      if (!b.visibleTo || b.visibleTo === "all") return true;
      const specific = b.visibleTo.split(",").filter(Boolean);
      return specific.includes(user.username);
    })
    .sort((a: any, b: any) => (a.badgeOrder ?? a.id) - (b.badgeOrder ?? b.id));

  const filtered = visibleBadges.filter((b: any) =>
    !search || b.name.toLowerCase().includes(search.toLowerCase())
  );

  const toggleVisibility = async (badgeName: string, currentlyHidden: boolean) => {
    setTogglingId(badgeName);
    try {
      const res = await fetch("/api/user/badge-visibility", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ badgeName, hidden: !currentlyHidden }),
      });
      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ["/api/badges"] });
        // Force user refresh
        window.location.reload();
      }
    } catch {
      toast({ title: "Failed to update", variant: "destructive" });
    }
    setTogglingId(null);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black">Badges</h1>
          <p className="text-gray-500 text-sm mt-1">
            {userBadgeNames.length} earned · {visibleBadges.length} total visible
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search badges..."
              className="h-9 w-44 bg-black/60 border border-white/5 focus:border-orange-500/50 rounded-lg px-3 text-xs text-white placeholder-gray-600 outline-none transition-colors"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-600 hover:text-white transition-colors">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Discord hint for non-discord users */}
      {!hasDiscord && (
        <div className="flex items-center justify-between gap-3 p-4 rounded-2xl border border-[#5865F2]/20 bg-[#5865F2]/5">
          <div className="flex items-start gap-3 min-w-0">
            <SiDiscord className="w-4 h-4 text-[#7289da] shrink-0 mt-0.5" />
            <p className="text-[12px] text-gray-400 leading-relaxed">
              <span className="font-black text-white">Tip:</span> Connect Discord to automatically receive role-linked badges and sync your profile.
            </p>
          </div>
          <a href="/auth/discord/link"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#5865F2] hover:bg-[#4752C4] text-white font-black text-[10px] transition-colors shrink-0">
            <SiDiscord className="w-3 h-3" /> Connect
          </a>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-[#0e0e0e] border border-white/[0.06] rounded-2xl">
          <Award className="w-10 h-10 mx-auto mb-3 text-gray-700" />
          <p className="font-black text-gray-500">No badges found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((badge: any) => {
            const isOwned = userBadgeNames.includes(badge.name);
            const isHidden = hiddenBadges.includes(badge.name);
            const isUnavailable = badge.available === false;
            const badgeColor = badge.color || "#F97316";

            return (
              <motion.div
                key={badge.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${
                  isUnavailable
                    ? "bg-[#0a0a0a] border-white/[0.03] opacity-50"
                    : isOwned
                    ? "bg-[#0e0e0e] hover:bg-[#111]"
                    : "bg-[#0e0e0e] border-white/[0.06] hover:border-white/10"
                }`}
                style={isOwned && !isUnavailable ? {
                  borderColor: badgeColor + "30",
                  boxShadow: `0 0 0 1px ${badgeColor}10`,
                } : undefined}
              >
                {/* Icon */}
                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${isUnavailable ? "grayscale" : ""}`}
                  style={{
                    background: isUnavailable ? "#111" : `linear-gradient(135deg, ${badgeColor}20 0%, ${badgeColor}08 100%)`,
                    border: `1.5px solid ${isUnavailable ? "#222" : badgeColor + "30"}`,
                    boxShadow: isOwned && !isUnavailable ? `0 0 14px ${badgeColor}20` : undefined,
                  }}
                >
                  {badge.icon?.startsWith("http") || badge.icon?.includes("/objects/")
                    ? <img src={resolveUrl(badge.icon)} alt={badge.name} className="w-9 h-9 object-contain" />
                    : <span className="text-2xl">{badge.icon}</span>
                  }
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-sm font-black ${isUnavailable ? "text-gray-600" : isOwned ? "text-white" : "text-gray-300"}`}>
                      {badge.name}
                    </span>
                    {isUnavailable && (
                      <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-gray-800 text-gray-600 border border-gray-700">
                        Unavailable
                      </span>
                    )}
                    {isOwned && !isUnavailable && (
                      <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full border" style={{ background: badgeColor + "15", color: badgeColor, borderColor: badgeColor + "35" }}>
                        ✓ Earned
                      </span>
                    )}
                  </div>
                  {badge.description && (
                    <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">{badge.description}</p>
                  )}
                  {badge.howToGet && !isUnavailable && (
                    <p className="text-[10px] text-gray-600 mt-1 flex items-start gap-1">
                      <span className="font-black shrink-0" style={{ color: badgeColor + "70" }}>HOW TO GET:</span>
                      <span className="leading-snug">{badge.howToGet}</span>
                    </p>
                  )}
                </div>

                {/* SHOW/HIDE button for owned badges */}
                {isOwned && !isUnavailable && (
                  <button
                    onClick={() => toggleVisibility(badge.name, isHidden)}
                    disabled={togglingId === badge.name}
                    className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase border transition-all ${
                      isHidden
                        ? "border-gray-600 text-gray-500 hover:border-orange-500/40 hover:text-orange-400 bg-white/[0.02]"
                        : "border-orange-500/30 text-orange-400 hover:border-orange-500/60 bg-orange-500/5"
                    }`}
                  >
                    {togglingId === badge.name ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : isHidden ? (
                      <><EyeOff className="w-3 h-3" />Show</>
                    ) : (
                      <><Eye className="w-3 h-3" />Hide</>
                    )}
                  </button>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Manage Badges Tab (Admin) ─────────────────────────────────────────────────

function ManageBadgesTab({ badges, adminUsers }: { badges: any[]; adminUsers: any[] }) {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [orderedBadges, setOrderedBadges] = useState<any[]>([]);
  const [dragId, setDragId] = useState<number | null>(null);
  const [savingOrder, setSavingOrder] = useState(false);
  const [togglingAvail, setTogglingAvail] = useState<number | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [envEditorOpen, setEnvEditorOpen] = useState(false);
  const [envText, setEnvText] = useState("");
  const [envSaving, setEnvSaving] = useState(false);

  const badgesToEnv = (list: any[]) =>
    list.map(b =>
      `[${b.name}]\nimage = ${b.icon || ""}\navailable = ${b.available !== false ? "true" : "false"}\ndiscordRoleID = ${b.roleId || ""}`
    ).join("\n\n");

  const downloadEnv = () => {
    const content = badgesToEnv(orderedBadges);
    const blob = new Blob([content], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "badges.env";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const openEnvEditor = () => {
    setEnvText(badgesToEnv(orderedBadges));
    setEnvEditorOpen(true);
    setMoreOpen(false);
  };

  const saveEnv = async () => {
    setEnvSaving(true);
    try {
      const sections = envText.split(/\n\n+/);
      for (const section of sections) {
        const lines = section.split("\n").map(l => l.trim()).filter(Boolean);
        const nameMatch = lines[0]?.match(/^\[(.+)\]$/);
        if (!nameMatch) continue;
        const name = nameMatch[1];
        const get = (key: string) => {
          const l = lines.find(l => l.toLowerCase().startsWith(key.toLowerCase() + " ="));
          return l ? l.slice(l.indexOf("=") + 1).trim() : undefined;
        };
        const image = get("image");
        const available = get("available");
        const discordRoleID = get("discordRoleID");
        const existing = orderedBadges.find(b => b.name.toLowerCase() === name.toLowerCase());
        if (existing) {
          const payload: any = {};
          if (image !== undefined) payload.icon = image;
          if (available !== undefined) payload.available = available === "true";
          if (discordRoleID !== undefined) payload.roleId = discordRoleID;
          await apiRequest("PATCH", `/api/admin/badges/${existing.id}`, payload);
        } else {
          await apiRequest("POST", "/api/admin/badges", { name, icon: image || "", available: available !== "false", roleId: discordRoleID || "" });
        }
      }
      queryClient.invalidateQueries({ queryKey: ["/api/badges"] });
      toast({ title: "Badges updated from .env!" });
      setEnvEditorOpen(false);
    } catch {
      toast({ title: "Failed to save", variant: "destructive" });
    }
    setEnvSaving(false);
  };

  useEffect(() => {
    const sorted = [...(badges || [])].sort((a, b) => (a.badgeOrder ?? a.id) - (b.badgeOrder ?? b.id));
    setOrderedBadges(sorted);
  }, [badges]);

  const filteredBadges = orderedBadges.filter((b: any) =>
    !search.trim() || b.name.toLowerCase().includes(search.toLowerCase())
  );

  const syncWithDiscord = async () => {
    setSyncing(true);
    try {
      await apiRequest("POST", "/api/admin/badges/sync-discord", {});
      queryClient.invalidateQueries({ queryKey: ["/api/badges"] });
      toast({ title: "Badges synced with Discord!" });
    } catch {
      toast({ title: "Sync failed", variant: "destructive" });
    } finally { setSyncing(false); }
  };

  const saveOrder = async (newOrder: any[]) => {
    setSavingOrder(true);
    try {
      await apiRequest("POST", "/api/admin/badges/reorder", {
        order: newOrder.map((b: any, i: number) => ({ id: b.id, badgeOrder: i })),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/badges"] });
      toast({ title: "Order saved" });
    } catch {
      toast({ title: "Failed to save order", variant: "destructive" });
    }
    setSavingOrder(false);
  };

  const handleDragStart = (id: number) => setDragId(id);
  const handleDragOver = (e: React.DragEvent, targetId: number) => {
    e.preventDefault();
    if (dragId === null || dragId === targetId) return;
    const newOrder = [...orderedBadges];
    const fromIdx = newOrder.findIndex(b => b.id === dragId);
    const toIdx = newOrder.findIndex(b => b.id === targetId);
    if (fromIdx === -1 || toIdx === -1) return;
    const [item] = newOrder.splice(fromIdx, 1);
    newOrder.splice(toIdx, 0, item);
    setOrderedBadges(newOrder);
  };
  const handleDrop = () => {
    saveOrder(orderedBadges);
    setDragId(null);
  };

  const toggleAvailability = async (badge: any) => {
    setTogglingAvail(badge.id);
    try {
      await apiRequest("PATCH", `/api/admin/badges/${badge.id}`, { available: !badge.available });
      queryClient.invalidateQueries({ queryKey: ["/api/badges"] });
    } catch {
      toast({ title: "Failed to update", variant: "destructive" });
    }
    setTogglingAvail(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black">Manage Badges</h1>
          <p className="text-gray-500 text-sm mt-1">Drag to reorder · Toggle availability · Edit badge details</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search badges..."
              className="h-9 w-44 bg-black/60 border border-white/5 focus:border-orange-500/50 rounded-lg px-3 text-xs text-white placeholder-gray-600 outline-none transition-colors"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-600 hover:text-white transition-colors">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
          {/* More... dropdown */}
          <div className="relative">
            <button
              onClick={() => setMoreOpen(o => !o)}
              className="flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 border border-white/[0.06] font-black rounded-xl transition-all text-sm"
            >
              <MoreHorizontal className="w-4 h-4" /> More..
            </button>
            {moreOpen && (
              <div className="absolute right-0 top-full mt-1 z-50 w-48 bg-[#1a1a1a] border border-white/[0.08] rounded-xl shadow-xl overflow-hidden">
                <button onClick={() => { downloadEnv(); setMoreOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[12px] font-black text-gray-300 hover:bg-white/5 transition-colors text-left">
                  <Download className="w-3.5 h-3.5" /> Download as .env
                </button>
                <button onClick={openEnvEditor}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[12px] font-black text-gray-300 hover:bg-white/5 transition-colors text-left">
                  <FileCode className="w-3.5 h-3.5" /> Edit as .env
                </button>
              </div>
            )}
          </div>
          <button
            onClick={syncWithDiscord}
            disabled={syncing}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#5865F2]/20 hover:bg-[#5865F2]/30 text-[#7289da] border border-[#5865F2]/30 font-black rounded-xl transition-all text-sm disabled:opacity-50"
          >
            {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <SiDiscord className="w-4 h-4" />}
            Sync Roles
          </button>
          <Dialog>
            <DialogTrigger asChild>
              <button className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-400 text-black font-black rounded-xl transition-all text-sm">
                <Plus className="w-4 h-4" /> New Badge
              </button>
            </DialogTrigger>
            <DialogContent className="bg-[#0e0e0e] border-white/5 text-white max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle className="font-black">Create Badge</DialogTitle></DialogHeader>
              <BadgeEditor />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* .env Editor Dialog */}
      {envEditorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={() => setEnvEditorOpen(false)}>
          <div className="bg-[#0e0e0e] border border-white/[0.08] rounded-2xl p-5 w-full max-w-lg mx-4 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-black flex items-center gap-2"><FileCode className="w-4 h-4 text-orange-500" /> Edit Badges as .env</h3>
                <p className="text-[10px] text-gray-500 mt-0.5">Edit badge properties. Each badge section: [Name], image, available, discordRoleID.</p>
              </div>
              <button onClick={() => setEnvEditorOpen(false)} className="text-gray-600 hover:text-white transition-colors"><X className="w-4 h-4" /></button>
            </div>
            <textarea
              value={envText}
              onChange={e => setEnvText(e.target.value)}
              rows={16}
              className="w-full bg-black border border-white/5 rounded-xl p-3 text-xs font-mono text-gray-300 focus:border-orange-500/40 outline-none resize-none leading-relaxed"
              spellCheck={false}
            />
            <div className="flex gap-2">
              <button onClick={saveEnv} disabled={envSaving}
                className="flex-1 h-9 bg-orange-500 hover:bg-orange-400 text-black font-black rounded-xl transition-all flex items-center justify-center gap-2 text-sm">
                {envSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-3.5 h-3.5" /> Save</>}
              </button>
              <button onClick={() => setEnvEditorOpen(false)}
                className="flex-1 h-9 bg-white/5 hover:bg-white/10 text-gray-300 font-black rounded-xl transition-all text-sm">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {savingOrder && (
        <div className="flex items-center gap-2 text-xs text-orange-400 bg-orange-500/5 border border-orange-500/20 rounded-xl px-4 py-2">
          <Loader2 className="w-3 h-3 animate-spin" /> Saving order...
        </div>
      )}

      <div className="space-y-2">
        {filteredBadges.length === 0 && (
          <div className="text-center py-12 text-gray-600 bg-[#0e0e0e] border border-white/[0.06] rounded-2xl">
            <Award className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">{search ? "No badges match your search" : "No badges yet"}</p>
          </div>
        )}
        {filteredBadges.map((badge: any) => {
          const userCount = (adminUsers || []).filter((u: any) => (u.badges || []).includes(badge.name)).length;
          const visibleLabel = !badge.visibleTo || badge.visibleTo === "all" ? "All" : `${badge.visibleTo.split(",").filter(Boolean).length} user(s)`;
          const isUnavailable = badge.available === false;
          return (
            <div
              key={badge.id}
              draggable
              onDragStart={() => handleDragStart(badge.id)}
              onDragOver={e => handleDragOver(e, badge.id)}
              onDrop={handleDrop}
              className={`flex items-center gap-3 px-4 py-3 bg-[#0e0e0e] border rounded-2xl transition-all cursor-grab active:cursor-grabbing ${
                dragId === badge.id ? "opacity-40 border-orange-500/40 scale-[0.98]" : "border-white/[0.06] hover:border-white/10"
              }`}
            >
              {/* Drag handle */}
              <GripVertical className="w-4 h-4 text-gray-700 shrink-0" />

              {/* Icon */}
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isUnavailable ? "grayscale opacity-50" : ""}`}
                style={{ backgroundColor: "#F97316" + "18", border: "1px solid #F97316" + "25" }}>
                {badge.icon?.startsWith("http") || badge.icon?.includes("/objects/")
                  ? <img src={resolveUrl(badge.icon)} alt={badge.name} className="w-7 h-7 object-contain" />
                  : <span className="text-xl">{badge.icon}</span>
                }
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className={`font-black text-sm truncate ${isUnavailable ? "text-gray-600" : "text-white"}`}>{badge.name}</p>
                  {isUnavailable && <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-gray-800 text-gray-600">UNAVAILABLE</span>}
                  {badge.roleId && <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-[#5865F2]/10 text-[#7289da]"><SiDiscord className="inline w-2.5 h-2.5 mr-0.5" />Role linked</span>}
                  <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${badge.visibleTo === "all" || !badge.visibleTo ? "bg-green-500/10 text-green-400" : "bg-orange-500/10 text-orange-400"}`}>{visibleLabel}</span>
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                  {badge.description && <p className="text-[10px] text-gray-600 truncate">{badge.description}</p>}
                  <span className="text-[10px] text-gray-700 shrink-0">{userCount} user{userCount !== 1 ? "s" : ""}</span>
                </div>
              </div>

              {/* Available toggle */}
              <button
                onClick={() => toggleAvailability(badge)}
                disabled={togglingAvail === badge.id}
                title={isUnavailable ? "Mark as available" : "Mark as unavailable"}
                className={`shrink-0 w-10 h-6 rounded-full transition-all relative ${isUnavailable ? "bg-gray-700" : "bg-orange-500"} ${togglingAvail === badge.id ? "opacity-50" : ""}`}
              >
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${isUnavailable ? "left-0.5" : "left-[calc(100%-1.375rem)]"}`} />
              </button>

              {/* Edit */}
              <Dialog>
                <DialogTrigger asChild>
                  <button className="shrink-0 h-8 w-8 flex items-center justify-center text-gray-600 hover:text-white transition-colors rounded-lg hover:bg-white/5">
                    <Settings className="w-3.5 h-3.5" />
                  </button>
                </DialogTrigger>
                <DialogContent className="bg-[#0e0e0e] border-white/5 text-white max-h-[90vh] overflow-y-auto">
                  <DialogHeader><DialogTitle className="font-black">Edit Badge</DialogTitle></DialogHeader>
                  <BadgeEditor badge={badge} />
                </DialogContent>
              </Dialog>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Admin Tab (consolidated sub-tabs) ────────────────────────────────────────

function AdminTab({ adminUsers, badges, isOwner, isAdmin, user, canCreateBadge, canGiveBadge, isSuperOwner }: { adminUsers: any[]; badges: any[]; isOwner: boolean; isAdmin: boolean; user: any; canCreateBadge: boolean; canGiveBadge: boolean; isSuperOwner?: boolean }) {
  const userRole = user.role;
  const canManageBadgesLocal = canManageBadgesPerm(userRole);
  const canAccessBot = canAccessBotSettings(userRole);
  const canManageTeamLocal = canManageTeam(userRole);

  const canWebsite = canManageWebsite(userRole);
  const canChangelogs = canManageChangelogs(userRole);

  const canOurTeam = canManageOurTeam(userRole);

  const [sub, setSub] = useState("databank");

  // Role badge styling
  const roleMeta: Record<string, { color: string; label: string; icon: any }> = {
    support: { color: "bg-blue-500/15 text-blue-400 border-blue-500/30", label: "Support", icon: Headphones },
    moderator: { color: "bg-purple-500/15 text-purple-400 border-purple-500/30", label: "Moderator", icon: Shield },
    administrator: { color: "bg-orange-500/15 text-orange-400 border-orange-500/30", label: "Administrator", icon: ShieldCheck },
    admin: { color: "bg-orange-500/15 text-orange-400 border-orange-500/30", label: "Admin", icon: ShieldCheck },
    developer: { color: "bg-green-500/15 text-green-400 border-green-500/30", label: "Developer", icon: Cpu },
    owner: { color: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30", label: "Owner", icon: Crown },
    user: { color: "bg-gray-500/15 text-gray-400 border-gray-500/30", label: "User", icon: UserIcon },
    banned: { color: "bg-red-500/15 text-red-400 border-red-500/30", label: "Banned", icon: Ban },
  };

  const navGroups = [
    {
      label: "General",
      items: [
        { value: "stats", label: "Stats", icon: Zap, show: true },
        { value: "website-management", label: "Website Settings", icon: Globe, show: canWebsite },
      ],
    },
    {
      label: "Users",
      items: [
        { value: "databank", label: "Databank", icon: Users, show: true },
        { value: "manage-badges", label: "Badges", icon: Award, show: canManageBadgesLocal || canGiveBadge },
      ],
    },
    {
      label: "Team",
      items: [
        { value: "team", label: "Team", icon: UserCheck, show: true },
        { value: "our-team", label: "Our Team", icon: Star, show: canOurTeam },
      ],
    },
    {
      label: "Community",
      items: [
        { value: "tickets", label: "Tickets", icon: Inbox, show: true },
        { value: "discord-bot", label: "Discord Bot", icon: MessageSquare, show: canAccessBot },
      ],
    },
    {
      label: "Content",
      items: [
        { value: "changelogs", label: "Change Logs", icon: FileCode, show: canChangelogs },
        { value: "uploads", label: "Uploads", icon: Upload, show: true },
      ],
    },
    {
      label: "System",
      items: [
        { value: "database", label: "Database", icon: Database, show: isOwner },
      ],
    },
  ];

  const visibleGroups = navGroups
    .map(g => ({ ...g, items: g.items.filter(i => i.show) }))
    .filter(g => g.items.length > 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black">Admin Panel</h1>
          <p className="text-gray-500 text-sm mt-1">Platform management</p>
        </div>
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black border ${roleMeta[userRole]?.color || roleMeta.user.color}`}>
          {(() => { const M = roleMeta[userRole]?.icon || UserIcon; return <M className="w-3 h-3" />; })()}
          {roleMeta[userRole]?.label || userRole}
        </div>
      </div>

      <div className="flex gap-5 items-start">
        {/* Sidebar nav */}
        <div className="w-44 shrink-0 bg-[#0e0e0e] border border-white/[0.06] rounded-2xl p-3 space-y-4">
          {visibleGroups.map(group => (
            <div key={group.label}>
              <p className="text-[9px] font-black uppercase tracking-widest text-gray-600 px-2 mb-1.5">{group.label}</p>
              <div className="space-y-0.5">
                {group.items.map(item => {
                  const Icon = item.icon;
                  const active = sub === item.value;
                  return (
                    <button
                      key={item.value}
                      onClick={() => setSub(item.value)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all text-left ${active ? "bg-orange-500 text-black" : "text-gray-400 hover:text-gray-200 hover:bg-white/[0.04]"}`}
                    >
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            <motion.div key={sub} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.12 }}>
              {sub === "stats" && <StatsAdminTab adminUsers={adminUsers} />}
              {sub === "databank" && <DatabankTab adminUsers={adminUsers} badges={badges} isOwner={isOwner} isAdmin={isAdmin} isSuperOwner={isSuperOwner} />}
              {sub === "manage-badges" && <ManageBadgesTab badges={badges} adminUsers={adminUsers} />}
              {sub === "team" && <TeamTab currentUser={user} adminUsers={adminUsers} roleMeta={roleMeta} canManageTeam={canManageTeamLocal} />}
              {sub === "our-team" && canOurTeam && <OurTeamAdminTab />}
              {sub === "discord-bot" && <DiscordBotTab />}
              {sub === "tickets" && <TicketsTab user={user} />}
              {sub === "website-management" && canWebsite && <WebsiteManagementTab adminUsers={adminUsers} currentUser={user} />}
              {sub === "changelogs" && canChangelogs && <ChangeLogsTab />}
              {sub === "uploads" && <UploadsAdminTab />}
              {sub === "database" && isOwner && <DatabaseManagementTab />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// ─── Databank Tab ─────────────────────────────────────────────────────────────

function UsernameChangeSection({ user }: { user: any }) {
  const { toast } = useToast();
  const [newUsername, setNewUsername] = useState("");
  const [editing, setEditing] = useState(false);
  const [checkResult, setCheckResult] = useState<{ available: boolean; reason?: string } | null>(null);
  const [checking, setChecking] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const domain = window.location.hostname;

  const validate = (val: string) => {
    if (!val) return null;
    if (val.length < 1 || val.length > 20) return "Must be 1-20 characters";
    if (!/^[a-zA-Z0-9_]+$/.test(val)) return "Only letters, numbers and underscores";
    return null;
  };

  useEffect(() => {
    if (!editing) return;
    const err = validate(newUsername);
    if (err || !newUsername || newUsername === user.username) { setCheckResult(null); setChecking(false); return; }
    setChecking(true);
    setCheckResult(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/check-username?username=${encodeURIComponent(newUsername)}`);
        const data = await res.json();
        setCheckResult(data);
      } catch { setCheckResult(null); }
      setChecking(false);
    }, 500);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [newUsername, editing, user.username]);

  const mutation = useMutation({
    mutationFn: (username: string) => apiRequest("PATCH", "/api/user/username", { username }),
    onSuccess: () => {
      toast({ title: "Username updated! Reloading..." });
      setTimeout(() => window.location.reload(), 1200);
    },
    onError: (err: any) => {
      const msg = (err?.message || "Failed").replace(/^\d+:\s*/, "");
      toast({ title: msg, variant: "destructive" });
    },
  });

  const validationError = validate(newUsername);
  const canSave = !validationError && newUsername && newUsername !== user.username && (checkResult?.available || newUsername.toLowerCase() === user.username.toLowerCase()) && !checking && !mutation.isPending;

  return (
    <div className="bg-[#0e0e0e] border border-white/[0.06] rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[11px] font-black uppercase tracking-widest text-gray-500 flex items-center gap-1.5">
            <Globe className="w-3 h-3" /> Profile URL
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            <span className="text-gray-600 font-mono">{domain}/</span>
            <span className="text-orange-400 font-mono font-bold">{user.username}</span>
          </p>
        </div>
        {!editing && (
          <button data-testid="button-change-username" onClick={() => { setEditing(true); setNewUsername(user.username); setCheckResult(null); }}
            className="text-[10px] font-black uppercase text-orange-500 hover:text-orange-400 border border-orange-500/30 hover:border-orange-400 px-3 py-1.5 rounded-lg transition-all">
            Change
          </button>
        )}
      </div>
      {editing && (
        <div className="space-y-3">
          <div
            className="flex items-center rounded-xl overflow-hidden border"
            style={{ borderColor: checkResult?.available ? "rgba(34,197,94,0.4)" : checkResult && !checkResult.available ? "rgba(239,68,68,0.4)" : "rgba(255,255,255,0.08)", background: "rgba(0,0,0,0.4)" }}
          >
            <span className="px-3 py-2.5 text-xs text-gray-600 border-r border-white/[0.06] whitespace-nowrap font-mono shrink-0">{domain}/</span>
            <input
              data-testid="input-new-username"
              value={newUsername}
              onChange={e => { setNewUsername(e.target.value); setCheckResult(null); }}
              placeholder="yourname"
              maxLength={20}
              className="flex-1 bg-transparent px-3 py-2.5 text-sm font-mono text-white outline-none placeholder-gray-600"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
            />
            <div className="px-3">
              {checking ? <Loader2 className="w-3.5 h-3.5 text-gray-500 animate-spin" />
                : checkResult?.available ? <Check className="w-3.5 h-3.5 text-green-500" />
                : checkResult && !checkResult.available ? <X className="w-3.5 h-3.5 text-red-400" />
                : null}
            </div>
          </div>
          <div className="min-h-[16px] px-0.5">
            {validationError && newUsername ? (
              <p className="text-[10px] text-red-400">{validationError}</p>
            ) : checkResult && !checkResult.available ? (
              <p className="text-[10px] text-red-400">{checkResult.reason}</p>
            ) : checkResult?.available ? (
              <p className="text-[10px] text-green-500">✓ Available — <span className="font-mono">{domain}/{newUsername}</span></p>
            ) : (
              <p className="text-[10px] text-gray-600">1-20 characters. Letters, numbers and underscores only.</p>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              data-testid="button-save-username"
              onClick={() => mutation.mutate(newUsername)}
              disabled={!canSave}
              className="bg-orange-500 hover:bg-orange-400 text-black font-black text-xs px-4 border-0"
            >
              {mutation.isPending ? <Loader2 className="animate-spin w-3 h-3" /> : "Save URL"}
            </Button>
            <Button variant="outline" onClick={() => { setEditing(false); setNewUsername(""); setCheckResult(null); }} className="text-xs font-black border-white/10 hover:bg-white/5">
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

const DATABANK_PAGE_SIZE = 25;

function DatabankTab({ adminUsers, badges, isOwner, isAdmin, isSuperOwner }: { adminUsers: any[]; badges: any[]; isOwner: boolean; isAdmin: boolean; isSuperOwner?: boolean }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const { data: discordLogs } = useQuery<any[]>({ queryKey: ["/api/admin/discord-events"] });

  const filtered = useMemo(() => (adminUsers || []).filter((u: any) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      u.username?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      String(u.id).includes(q) ||
      u.role?.toLowerCase().includes(q) ||
      u.discordId?.toLowerCase().includes(q) ||
      u.discordUsername?.toLowerCase().includes(q) ||
      u.alias?.toLowerCase().includes(q) ||
      (u.aliases || []).some((a: string) => a.toLowerCase().includes(q))
    );
  }), [adminUsers, search]);

  const totalPages = Math.ceil(filtered.length / DATABANK_PAGE_SIZE);
  const paginated = filtered.slice(page * DATABANK_PAGE_SIZE, (page + 1) * DATABANK_PAGE_SIZE);

  const handleSearch = (val: string) => { setSearch(val); setPage(0); };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black">User Databank</h1>
        <p className="text-gray-500 text-sm mt-1">{(adminUsers || []).length} registered users</p>
      </div>
      <Input value={search} onChange={e => handleSearch(e.target.value)} placeholder="Search by username, email, ID, Discord ID/user, link, alias..."
        className="bg-[#0e0e0e] border-white/10 max-w-sm" />
      <div className="bg-[#0e0e0e] border border-white/[0.06] rounded-2xl overflow-hidden">
        <div className="grid grid-cols-[auto_1fr_1fr_auto_auto] text-[10px] font-black uppercase tracking-widest text-gray-600 px-5 py-3 border-b border-white/[0.04] gap-4">
          <span className="w-8">ID</span><span>User</span><span>Email</span><span className="w-16 text-center">Role</span><span className="w-10 text-right">Manage</span>
        </div>
        {filtered.length === 0 && <div className="text-center py-8 text-gray-600 text-sm">No users found</div>}
        {paginated.map((u: any) => (
          <div key={u.id} className="grid grid-cols-[auto_1fr_1fr_auto_auto] items-center gap-4 px-5 py-3 border-b border-white/[0.03] hover:bg-white/[0.015] text-sm">
            <span className="w-8 text-[10px] font-mono text-gray-600">#{u.id}</span>
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500 font-black text-xs shrink-0 border border-orange-500/20">{u.username[0].toUpperCase()}</div>
              <div className="min-w-0">
                <span className="font-bold truncate block">{u.username}</span>
                {u.discordId && <span className="text-[9px] text-[#7289da] flex items-center gap-0.5"><SiDiscord className="w-2.5 h-2.5" /> {u.discordUsername || u.discordId}</span>}
              </div>
            </div>
            <span className="text-[11px] text-gray-500 truncate">{u.email}</span>
            <span className={`w-16 text-center text-[10px] font-black uppercase px-2 py-0.5 rounded ${u.role === "owner" ? "bg-red-500/20 text-red-400" : u.role === "admin" ? "bg-orange-500/20 text-orange-400" : u.role === "banned" ? "bg-red-900/30 text-red-500" : "bg-white/5 text-gray-500"}`}>{u.role}</span>
            <div className="w-10 flex justify-end">
              <Dialog>
                <DialogTrigger asChild>
                  <button className="w-8 h-8 flex items-center justify-center text-gray-600 hover:text-white hover:bg-white/5 rounded-lg transition-all"><Settings className="w-3.5 h-3.5" /></button>
                </DialogTrigger>
                <DialogContent className="bg-[#0e0e0e] border-white/5 text-white">
                  <DialogHeader><DialogTitle className="font-black">Manage {u.username}</DialogTitle></DialogHeader>
                  <ManageUserDialog u={u} badges={badges || []} isOwner={isOwner} isAdmin={isAdmin} isSuperOwner={isSuperOwner} />
                </DialogContent>
              </Dialog>
            </div>
          </div>
        ))}
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-gray-500 pt-1">
          <span className="font-mono">{filtered.length} results · page {page + 1} of {totalPages}</span>
          <div className="flex gap-1">
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
              className="px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/5 disabled:opacity-30 transition-all font-bold">
              ← Prev
            </button>
            <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
              className="px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/5 disabled:opacity-30 transition-all font-bold">
              Next →
            </button>
          </div>
        </div>
      )}

      {/* Discord Login Events */}
      <div>
        <h2 className="text-lg font-black flex items-center gap-2 mb-4">
          <SiDiscord className="w-4 h-4 text-[#5865F2]" /> Discord Login Events
        </h2>
        <div className="bg-[#0e0e0e] border border-white/[0.06] rounded-2xl overflow-hidden">
          <div className="grid grid-cols-[1fr_1fr_auto_auto] text-[10px] font-black uppercase tracking-widest text-gray-600 px-5 py-3 border-b border-white/[0.04] gap-4">
            <span>Discord User</span><span>Email</span><span className="w-20 text-center">Action</span><span className="w-32 text-right">Time</span>
          </div>
          {(!discordLogs || discordLogs.length === 0) && (
            <div className="text-center py-8 text-gray-600 text-sm">No Discord logins yet</div>
          )}
          {(discordLogs || []).map((e: any) => (
            <div key={e.id} className="grid grid-cols-[1fr_1fr_auto_auto] items-center gap-4 px-5 py-3 border-b border-white/[0.03] hover:bg-white/[0.015] text-sm">
              <div className="flex items-center gap-2 min-w-0">
                <SiDiscord className="w-3 h-3 text-[#5865F2] shrink-0" />
                <div className="min-w-0">
                  <span className="font-bold truncate block text-[13px]">{e.discordGlobalName || e.discordUsername}</span>
                  <span className="text-[10px] text-gray-600 font-mono">@{e.discordUsername} · {e.discordId}</span>
                </div>
              </div>
              <span className="text-[11px] text-gray-500 truncate">{e.email || "—"}</span>
              <span className={`w-20 text-center text-[10px] font-black uppercase px-2 py-0.5 rounded ${e.action === "register" ? "bg-green-500/20 text-green-400" : "bg-[#5865F2]/20 text-[#7289da]"}`}>
                {e.isNewUser ? "New" : e.action}
              </span>
              <span className="w-32 text-right text-[10px] text-gray-600 font-mono">
                {new Date(e.createdAt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Alias Section ─────────────────────────────────────────────────────────────

function AliasSection({ user }: { user: any }) {
  const { toast } = useToast();
  const [aliasInput, setAliasInput] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: aliasData, isLoading: aliasLoading } = useQuery<any>({
    queryKey: ["/api/user/alias"],
  });

  const addAliasMutation = useMutation({
    mutationFn: (alias: string) => apiRequest("POST", "/api/user/aliases", { alias }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/alias"] });
      setAliasInput("");
      setDialogOpen(false);
      toast({ title: "Alias added" });
    },
    onError: (err: any) => {
      const raw = err?.message || "Failed to add alias";
      const msg = raw.replace(/^\d+:\s*/, "");
      toast({ title: msg, variant: "destructive" });
    },
  });

  const removeAliasMutation = useMutation({
    mutationFn: (alias: string) => apiRequest("DELETE", `/api/user/aliases/${alias}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/alias"] });
      toast({ title: "Alias removed" });
    },
    onError: (err: any) => {
      const raw = err?.message || "Failed to remove alias";
      toast({ title: raw.replace(/^\d+:\s*/, ""), variant: "destructive" });
    },
  });

  const aliases: string[] = aliasData?.aliases || (aliasData?.alias ? [aliasData.alias] : []);
  const maxAliases = aliasData?.maxAliases ?? 1;
  const isUnlimitedAliases = maxAliases === -1;
  const origin = window.location.origin;
  const atMax = !isUnlimitedAliases && aliases.length >= maxAliases;

  return (
    <div className="bg-[#0e0e0e] border border-white/[0.06] rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-black flex items-center gap-2"><Globe className="w-4 h-4 text-orange-500" /> Profile Aliases</h3>
          <p className="text-[11px] text-gray-500 mt-0.5">Custom URLs to find your profile.{isUnlimitedAliases ? " Unlimited." : ` Max ${maxAliases}.`}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono px-2 py-1 bg-white/5 rounded-lg text-gray-400">{aliases.length}{isUnlimitedAliases ? "" : `/${maxAliases}`}</span>
          {!atMax && (isUnlimitedAliases || maxAliases >= 1) && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <button className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 hover:bg-orange-400 text-black font-black rounded-lg text-xs transition-all">
                  <Plus className="w-3 h-3" /> Add Alias
                </button>
              </DialogTrigger>
              <DialogContent className="bg-[#0e0e0e] border-white/10 text-white max-w-sm">
                <DialogHeader>
                  <DialogTitle className="font-black flex items-center gap-2">
                    <Globe className="w-4 h-4 text-orange-500" /> Add Alias
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <p className="text-[11px] text-gray-500">Choose a custom short URL for your profile (e.g. <span className="text-orange-400 font-bold">/xos</span>).</p>
                  <div className="flex items-center bg-black/60 border border-white/10 rounded-lg overflow-hidden focus-within:border-orange-500/50 transition-colors">
                    <span className="text-gray-500 text-sm px-3 shrink-0 border-r border-white/10 py-2">{origin}/</span>
                    <input
                      value={aliasInput}
                      onChange={e => setAliasInput(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
                      onKeyDown={e => e.key === "Enter" && aliasInput.trim().length >= 1 && addAliasMutation.mutate(aliasInput)}
                      placeholder="yourname"
                      maxLength={30}
                      autoFocus
                      className="flex-1 bg-transparent h-10 text-sm text-white outline-none px-3"
                    />
                  </div>
                  <p className="text-[10px] text-gray-600">1–30 characters, letters / numbers / dash / underscore only.</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => aliasInput.trim().length >= 1 && addAliasMutation.mutate(aliasInput)}
                      disabled={!aliasInput.trim() || aliasInput.length < 1 || addAliasMutation.isPending}
                      className="flex-1 h-9 bg-orange-500 hover:bg-orange-400 text-black font-black rounded-lg text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-1.5">
                      {addAliasMutation.isPending ? <Loader2 className="animate-spin w-4 h-4" /> : <Check className="w-4 h-4" />}
                      Confirm
                    </button>
                    <button onClick={() => { setDialogOpen(false); setAliasInput(""); }}
                      className="px-4 h-9 border border-white/10 hover:border-white/30 text-gray-400 hover:text-white font-black rounded-lg text-sm transition-all">
                      Cancel
                    </button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {aliasLoading ? (
        <div className="flex items-center justify-center py-4"><Loader2 className="animate-spin w-4 h-4 text-orange-500" /></div>
      ) : (
        <div className="space-y-3">
          {aliases.length === 0 && (
            <p className="text-[11px] text-gray-600 py-1">No aliases yet — click "Add Alias" to create one.</p>
          )}
          {aliases.map((alias: string) => (
            <div key={alias} className="flex items-center gap-3 p-3 bg-orange-500/5 border border-orange-500/20 rounded-xl">
              <Globe className="w-4 h-4 text-orange-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-black text-sm text-orange-400">/{alias}</p>
                <p className="text-[10px] text-gray-500 truncate">{origin}/{alias}</p>
              </div>
              <button onClick={() => removeAliasMutation.mutate(alias)} disabled={removeAliasMutation.isPending}
                className="w-7 h-7 flex items-center justify-center text-gray-500 hover:text-red-400 transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}

          {atMax && maxAliases >= 1 && (
            <div className="flex items-center gap-2 p-3 bg-white/[0.03] border border-white/[0.06] rounded-xl">
              <CheckCircle2 className="w-4 h-4 text-orange-500 shrink-0" />
              <p className="text-[11px] text-gray-400 font-bold">You have reached the maximum number of aliases ({maxAliases}).</p>
            </div>
          )}

          {maxAliases < 1 && (
            <p className="text-[11px] text-gray-600 text-center py-2">You have no alias slots. Purchase one in the <a href="/shop" className="text-orange-500 hover:underline">Shop</a>.</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Extras Tab ───────────────────────────────────────────────────────────────

// ─── Template Card ─────────────────────────────────────────────────────────────

function TemplateCard({ template, user, onFavorite, onUse, onPreview, onDelete }: any) {
  const tags: string[] = template.tags || [];
  const isOwner = user?.id === template.user_id;

  return (
    <div className="bg-[#0e0e0e] border border-white/[0.06] rounded-2xl overflow-hidden flex flex-col">
      <div className="relative aspect-video bg-black/40">
        {template.preview_image_url ? (
          <img src={template.preview_image_url} alt={template.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-700 text-3xl">🎨</div>
        )}
        <button
          onClick={() => onFavorite(template)}
          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center hover:bg-black/80 transition-all"
          data-testid={`button-fav-template-${template.id}`}
        >
          <Star className={`w-3.5 h-3.5 ${template.is_favorited ? "fill-yellow-400 text-yellow-400" : "text-gray-400"}`} />
        </button>
      </div>
      <div className="p-3 flex flex-col gap-2 flex-1">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-orange-500/20 flex items-center justify-center text-[10px] font-black text-orange-400 shrink-0">
            {template.username?.[0]?.toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-black truncate text-white">{template.name}</p>
            <p className="text-[10px] text-gray-500">@{template.username}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-gray-500">
          <span>🔄 {template.uses || 0} uses</span>
          <span>⭐ {template.favorites || 0}</span>
          {(template.uses || 0) > 10 && <span className="text-orange-400 font-bold">↗ Trending</span>}
        </div>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {tags.slice(0, 4).map((tag: string) => (
              <span key={tag} className="px-1.5 py-0.5 rounded text-[9px] bg-white/5 text-gray-400 border border-white/5">{tag}</span>
            ))}
          </div>
        )}
        <div className="flex gap-2 mt-auto pt-1">
          <button
            onClick={() => onUse(template)}
            className="flex-1 h-8 bg-orange-500 hover:bg-orange-400 text-black font-black text-xs rounded-lg transition-all"
            data-testid={`button-use-template-${template.id}`}
          >
            Use Template
          </button>
          <button
            onClick={() => onPreview(template)}
            className="w-8 h-8 border border-white/10 rounded-lg flex items-center justify-center hover:border-white/30 transition-all"
            data-testid={`button-preview-template-${template.id}`}
          >
            <Eye className="w-3.5 h-3.5 text-gray-400" />
          </button>
          {isOwner && (
            <button
              onClick={() => onDelete(template)}
              className="w-8 h-8 border border-red-500/20 rounded-lg flex items-center justify-center hover:bg-red-500/10 transition-all"
              data-testid={`button-delete-template-${template.id}`}
            >
              <Trash2 className="w-3.5 h-3.5 text-red-400" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function TemplatesPanel({ user, localProfile, userTracks }: any) {
  const { toast } = useToast();
  const [view, setView] = useState<"library" | "favorites" | "last-used" | "uploads">("library");
  const [sort, setSort] = useState("trending");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<any>(null);
  const [confirmUse, setConfirmUse] = useState<any>(null);

  const { data: libraryTemplates = [], refetch: refetchLibrary } = useQuery<any[]>({
    queryKey: ["/api/templates", sort],
    queryFn: () => fetch(`/api/templates?sort=${sort}`).then(r => r.json()),
  });
  const { data: favoriteTemplates = [], refetch: refetchFavorites } = useQuery<any[]>({ queryKey: ["/api/templates/my-favorites"] });
  const { data: lastUsedTemplates = [], refetch: refetchLastUsed } = useQuery<any[]>({ queryKey: ["/api/templates/my-last-used"] });
  const { data: myUploads = [], refetch: refetchUploads } = useQuery<any[]>({ queryKey: ["/api/templates/my-uploads"] });

  const allLists: Record<string, any[]> = { library: libraryTemplates, favorites: favoriteTemplates, "last-used": lastUsedTemplates, uploads: myUploads };
  const currentList = allLists[view] || [];
  const filtered = currentList.filter((t: any) => !search || t.name?.toLowerCase().includes(search.toLowerCase()) || t.username?.toLowerCase().includes(search.toLowerCase()));

  const useMut = useMutation({
    mutationFn: (id: number) => apiRequest("POST", `/api/templates/${id}/use`),
    onSuccess: () => {
      setConfirmUse(null);
      toast({ title: "Template applied!", description: "Refreshing your dashboard…" });
      setTimeout(() => window.location.reload(), 900);
    },
    onError: () => toast({ title: "Failed to apply template", variant: "destructive" }),
  });

  const favMut = useMutation({
    mutationFn: (id: number) => apiRequest("POST", `/api/templates/${id}/favorite`),
    onSuccess: () => {
      refetchLibrary();
      refetchFavorites();
      refetchUploads();
      refetchLastUsed();
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/templates/${id}`),
    onSuccess: () => {
      refetchUploads();
      refetchLibrary();
      toast({ title: "Template deleted" });
    },
  });

  const SUB_TABS = [
    { id: "library", label: "Template Library" },
    { id: "favorites", label: "Favorite Templates" },
    { id: "last-used", label: "Last Used Templates" },
    { id: "uploads", label: "My Uploads" },
  ] as const;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-black flex items-center gap-2"><LayoutTemplate className="w-4 h-4 text-orange-500" /> Templates</h3>
          <p className="text-[11px] text-gray-500 mt-0.5">Browse, use, and upload profile templates from the community.</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-3 py-2 bg-orange-500 hover:bg-orange-400 text-black font-black text-xs rounded-xl transition-all"
          data-testid="button-create-template"
        >
          <Plus className="w-3.5 h-3.5" /> Create Template
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {SUB_TABS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setView(id)}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-black transition-all border ${view === id ? "bg-orange-500 border-orange-500 text-black" : "border-white/10 text-gray-400 hover:border-white/30 hover:text-white"}`}
            data-testid={`button-tab-template-${id}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <div className="flex-1 relative">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Explore community-created templates"
            className="w-full bg-[#0e0e0e] border border-white/[0.06] rounded-xl px-4 py-2 text-sm text-white placeholder-gray-600 outline-none focus:border-orange-500/30"
            data-testid="input-template-search"
          />
        </div>
        {view === "library" && (
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="w-36 bg-[#0e0e0e] border-white/[0.06] text-xs h-9"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-[#0e0e0e] border-white/10">
              <SelectItem value="trending" className="text-xs">Trending</SelectItem>
              <SelectItem value="new" className="text-xs">Newest</SelectItem>
              <SelectItem value="favorites" className="text-xs">Most Favorited</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-gray-600">
          <LayoutTemplate className="w-10 h-10 mb-3 opacity-30" />
          <p className="text-sm font-black">No templates found</p>
          <p className="text-[11px] mt-1">{view === "uploads" ? "Create your first template!" : "Try a different search or tab."}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {filtered.map((tmpl: any) => (
            <TemplateCard
              key={tmpl.id}
              template={tmpl}
              user={user}
              onFavorite={(t: any) => favMut.mutate(t.id)}
              onUse={(t: any) => setConfirmUse(t)}
              onPreview={(t: any) => setPreviewTemplate(t)}
              onDelete={(t: any) => deleteMut.mutate(t.id)}
            />
          ))}
        </div>
      )}

      {confirmUse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-[#0e0e0e] border border-white/10 rounded-2xl p-6 w-full max-w-sm mx-4 space-y-4">
            <div>
              <h3 className="font-black text-lg text-white">Use this template?</h3>
              <p className="text-[13px] text-gray-400 mt-1">This will apply <b className="text-white">{confirmUse.name}</b>'s banner, background, tracks and tags to your profile. Your bio, avatar and display name stay the same.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setConfirmUse(null)} className="flex-1 h-10 rounded-xl border border-white/10 text-gray-400 hover:border-white/30 font-black text-sm transition-all">Cancel</button>
              <button
                onClick={() => useMut.mutate(confirmUse.id)}
                disabled={useMut.isPending}
                className="flex-1 h-10 rounded-xl bg-orange-500 hover:bg-orange-400 text-black font-black text-sm transition-all flex items-center justify-center gap-2"
                data-testid="button-confirm-use-template"
              >
                {useMut.isPending ? <Loader2 className="animate-spin w-4 h-4" /> : "Apply Template"}
              </button>
            </div>
          </div>
        </div>
      )}

      {previewTemplate && (() => {
        const snap = previewTemplate.profile_snapshot || {};
        const snapTags: string[] = snap.settings?.tags || [];
        const snapTracks: any[] = snap.tracks || [];
        const accentColor = snap.themeColor || "#F97316";
        const myAvatar = localProfile?.avatarUrl;
        const myDisplayName = localProfile?.displayName || user?.username || "You";
        const myUsername = user?.username || "";
        const myBio = localProfile?.bio || "";

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
              {/* Modal header */}
              <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-white/[0.06] shrink-0">
                <div>
                  <h3 className="font-black text-white text-sm">{previewTemplate.name}</h3>
                  <p className="text-[10px] text-gray-600">by @{previewTemplate.username} · 🔄 {previewTemplate.uses || 0} uses · ⭐ {previewTemplate.favorites || 0}</p>
                </div>
                <button onClick={() => setPreviewTemplate(null)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5 text-gray-400 transition-all" data-testid="button-close-preview">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="overflow-y-auto flex-1">
                {/* Profile preview card */}
                <div className="relative">
                  {/* Background layer */}
                  <div className="relative h-52 overflow-hidden">
                    {snap.backgroundUrl ? (
                      <img src={snap.backgroundUrl} alt="background" className="absolute inset-0 w-full h-full object-cover" />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-b from-black/80 to-black" />
                    )}
                    <div className="absolute inset-0 bg-black/40" />

                    {/* Banner inside the background */}
                    {snap.bannerUrl && (
                      <div className="absolute inset-x-0 top-0 h-28 overflow-hidden">
                        <img src={snap.bannerUrl} alt="banner" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/60" />
                      </div>
                    )}

                    {/* Avatar + name overlay */}
                    <div className="absolute bottom-0 inset-x-0 p-4 flex flex-col items-center text-center">
                      <div className="w-14 h-14 rounded-full border-2 overflow-hidden mb-2 shrink-0" style={{ borderColor: accentColor }}>
                        {myAvatar ? (
                          <img src={myAvatar} alt="avatar" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xl font-black" style={{ background: accentColor + "33", color: accentColor }}>
                            {myDisplayName[0]?.toUpperCase()}
                          </div>
                        )}
                      </div>
                      <p className="font-black text-white text-sm leading-tight">{myDisplayName}</p>
                      <p className="text-[10px] text-gray-400">@{myUsername}</p>
                      {myBio && <p className="text-[11px] text-gray-400 mt-1 max-w-[200px] line-clamp-2">{myBio}</p>}
                    </div>
                  </div>

                  {/* Tags */}
                  {snapTags.length > 0 && (
                    <div className="flex flex-wrap justify-center gap-1.5 px-4 py-3 border-t border-white/[0.04]">
                      {snapTags.map((tag: string) => (
                        <span key={tag} className="px-2.5 py-0.5 rounded-full text-[11px] font-bold border" style={{ color: accentColor, borderColor: accentColor + "44", background: accentColor + "15" }}>{tag}</span>
                      ))}
                    </div>
                  )}

                  {/* Tracks */}
                  {snapTracks.length > 0 && (
                    <div className="px-4 pb-3 border-t border-white/[0.04] pt-3">
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-600 mb-2">🎵 Tracks in this template</p>
                      <div className="space-y-1.5">
                        {snapTracks.slice(0, 4).map((t: any, i: number) => (
                          <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-white/[0.04] bg-white/[0.02]">
                            <Music className="w-3 h-3 shrink-0" style={{ color: accentColor }} />
                            <span className="text-xs text-gray-300 truncate">{t.title}</span>
                          </div>
                        ))}
                        {snapTracks.length > 4 && <p className="text-[10px] text-gray-600 text-center">+{snapTracks.length - 4} more tracks</p>}
                      </div>
                    </div>
                  )}

                  {/* Description */}
                  {previewTemplate.description && (
                    <div className="px-4 pb-3 border-t border-white/[0.04] pt-3">
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-600 mb-1.5">About this template</p>
                      <p className="text-xs text-gray-400">{previewTemplate.description}</p>
                    </div>
                  )}

                  <p className="text-[10px] text-gray-700 text-center pb-2 px-4">Preview uses your bio, avatar & name. Template applies banner, background, tracks & tags.</p>
                </div>
              </div>

              {/* Footer actions */}
              <div className="px-4 pb-4 pt-3 border-t border-white/[0.06] flex gap-3 shrink-0">
                <button
                  onClick={() => setPreviewTemplate(null)}
                  className="flex-1 h-10 rounded-xl border border-white/10 text-gray-400 hover:border-white/30 font-black text-sm transition-all"
                >
                  Close
                </button>
                <button
                  onClick={() => { setPreviewTemplate(null); setConfirmUse(previewTemplate); }}
                  className="flex-1 h-10 rounded-xl font-black text-sm transition-all text-black flex items-center justify-center gap-2"
                  style={{ background: accentColor }}
                  data-testid="button-preview-use-template"
                >
                  Use Template
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {showCreate && (
        <CreateTemplateModal
          localProfile={localProfile}
          userTracks={userTracks}
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); refetchUploads(); refetchLibrary(); }}
        />
      )}
    </div>
  );
}

function CreateTemplateModal({ localProfile, userTracks, onClose, onCreated }: any) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [previewImageUrl, setPreviewImageUrl] = useState("");

  const createMut = useMutation({
    mutationFn: () => {
      const profileTags: string[] = localProfile?.settings?.tags || [];
      const snapshot = {
        bannerUrl: localProfile?.bannerUrl || null,
        backgroundUrl: localProfile?.backgroundUrl || null,
        backgroundVideoUrl: localProfile?.backgroundVideoUrl || null,
        themeColor: localProfile?.themeColor || "#F97316",
        backgroundEffect: localProfile?.backgroundEffect || "none",
        settings: localProfile?.settings || {},
        tracks: (userTracks || []).map((t: any) => ({ title: t.title, url: t.url, artistProfile: t.artistProfile })),
      };
      const finalPreviewUrl = previewImageUrl.trim() || localProfile?.bannerUrl || null;
      return apiRequest("POST", "/api/templates", {
        name: name.trim(),
        description: description.trim(),
        previewImageUrl: finalPreviewUrl,
        tags,
        profileSnapshot: snapshot,
      });
    },
    onSuccess: () => {
      toast({ title: "Template created!", description: "Your template is now available in the library." });
      onCreated();
    },
    onError: (e: any) => toast({ title: e?.message || "Failed to create template", variant: "destructive" }),
  });

  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (!t || tags.includes(t) || tags.length >= 5) return;
    setTags(prev => [...prev, t]);
    setTagInput("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-[#0e0e0e] border border-white/10 rounded-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-white/[0.06]">
          <h3 className="font-black text-white">Create Template</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5 text-gray-400"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          <p className="text-[11px] text-gray-500">This will upload your current banner, background, tracks, and tags as a template. Your bio and avatar are not shared.</p>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Template Name *</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Dark minimal bio"
              maxLength={50}
              className="w-full bg-black/60 border border-white/5 rounded-xl px-3 py-2 text-sm text-white focus:border-orange-500/50 outline-none"
              data-testid="input-template-name"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Describe your template..."
              maxLength={200}
              rows={2}
              className="w-full bg-black/60 border border-white/5 rounded-xl px-3 py-2 text-sm text-white focus:border-orange-500/50 outline-none resize-none"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Preview Image URL (optional — uses your banner if empty)</label>
            <input
              value={previewImageUrl}
              onChange={e => setPreviewImageUrl(e.target.value)}
              placeholder="Leave empty to use your banner image..."
              className="w-full bg-black/60 border border-white/5 rounded-xl px-3 py-2 text-sm text-white focus:border-orange-500/50 outline-none"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Tags (up to 5)</label>
            <div className="flex gap-2">
              <input
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addTag()}
                placeholder="Add tag..."
                maxLength={20}
                className="flex-1 bg-black/60 border border-white/5 rounded-xl px-3 py-2 text-sm text-white focus:border-orange-500/50 outline-none"
              />
              <button onClick={addTag} disabled={tags.length >= 5} className="px-3 h-9 bg-orange-500 text-black font-black rounded-lg text-xs disabled:opacity-50">Add</button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {tags.map(tag => (
                  <span key={tag} className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-orange-500/10 text-orange-400 border border-orange-500/20">
                    {tag}
                    <button onClick={() => setTags(t => t.filter(x => x !== tag))}><X className="w-3 h-3" /></button>
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="bg-white/5 rounded-xl p-3 space-y-1 text-[11px] text-gray-400">
            <p className="font-black text-gray-300">Will be included in this template:</p>
            <p>• Banner: {localProfile?.bannerUrl ? "✓ Yes" : "None"}</p>
            <p>• Background: {localProfile?.backgroundUrl || localProfile?.backgroundVideoUrl ? "✓ Yes" : "None"}</p>
            <p>• Tracks: {(userTracks || []).length} track(s)</p>
            <p>• Tags: {(localProfile?.settings?.tags || []).length} tag(s)</p>
          </div>
        </div>
        <div className="px-5 pb-5 flex gap-3">
          <button onClick={onClose} className="flex-1 h-10 rounded-xl border border-white/10 text-gray-400 hover:border-white/30 font-black text-sm transition-all">Cancel</button>
          <button
            onClick={() => createMut.mutate()}
            disabled={!name.trim() || createMut.isPending}
            className="flex-1 h-10 rounded-xl bg-orange-500 hover:bg-orange-400 text-black font-black text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            data-testid="button-submit-create-template"
          >
            {createMut.isPending ? <Loader2 className="animate-spin w-4 h-4" /> : "Publish Template"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ChallengesPanel() {
  const { data: challengeData, isLoading } = useQuery<any>({ queryKey: ["/api/user/challenges"] });

  if (isLoading) return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="animate-spin w-5 h-5 text-orange-500" />
    </div>
  );

  const challenges = challengeData?.challenges || [];
  const completedCount = challengeData?.completedCount || 0;
  const totalCount = challengeData?.totalCount || challenges.length;
  const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const questorUnlocked = completedCount >= 5;

  const getTypeLabel = (type: string) => type === "views" ? "views" : "likes";
  const getTypeColor = (type: string) => type === "views" ? "text-blue-400" : "text-pink-400";
  const getTypeBg = (type: string) => type === "views" ? "bg-blue-500/10 border-blue-500/20" : "bg-pink-500/10 border-pink-500/20";
  const TypeIcon = ({ type, className }: { type: string; className?: string }) =>
    type === "views" ? <Eye className={className} /> : <Heart className={className} />;

  return (
    <div className="space-y-4">
      {/* Header card */}
      <div className="bg-[#0e0e0e] border border-white/[0.06] rounded-2xl p-5 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-black flex items-center gap-2 text-base">⚔️ Profile Challenges</h3>
            <p className="text-[11px] text-gray-500 mt-0.5">Complete 5 challenges to auto-earn the <span className="text-purple-400 font-bold">Questor</span> badge.</p>
          </div>
          <div className="text-right">
            <span className="text-xl font-black text-white">{completedCount}</span>
            <span className="text-sm text-gray-600">/{totalCount}</span>
            <p className="text-[10px] text-gray-600 mt-0.5">completed</p>
          </div>
        </div>

        {/* Overall progress bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[10px] text-gray-500">
            <span>Overall Progress</span>
            <span className="font-mono">{pct}%</span>
          </div>
          <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
            <motion.div
              className="h-2 rounded-full bg-gradient-to-r from-orange-600 to-orange-400"
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] text-gray-600">
            <span>0</span>
            <span className="text-purple-400 font-bold">5 = Questor ⚔️</span>
            <span>{totalCount}</span>
          </div>
        </div>
      </div>

      {/* Questor badge earned banner */}
      {questorUnlocked && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-3 p-4 rounded-2xl border border-purple-500/40 bg-gradient-to-r from-purple-900/30 to-purple-800/20"
        >
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center text-xl shrink-0">⚔️</div>
          <div className="flex-1">
            <p className="text-sm font-black text-purple-300">Questor Badge Unlocked!</p>
            <p className="text-[11px] text-gray-500 mt-0.5">You've completed {completedCount} challenges. Check your Badges tab.</p>
          </div>
          <span className="text-purple-400 font-black text-sm">✓</span>
        </motion.div>
      )}

      {/* Challenge list */}
      <div className="space-y-2.5">
        {challenges.map((ch: any, idx: number) => {
          const progressPct = ch.target > 0 ? Math.min((ch.progress / ch.target) * 100, 100) : 0;
          const typeLabel = getTypeLabel(ch.type);
          const typeColor = getTypeColor(ch.type);
          const typeBg = getTypeBg(ch.type);

          return (
            <div
              key={ch.id}
              className={`rounded-2xl border p-4 transition-all ${ch.completed ? "border-orange-500/25 bg-orange-500/5" : "border-white/[0.06] bg-[#0e0e0e]"}`}
            >
              <div className="flex items-start gap-3">
                {/* Status circle */}
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${ch.completed ? "border-orange-500 bg-orange-500" : "border-gray-700"}`}>
                  {ch.completed ? <Check className="w-3 h-3 text-black" /> : <span className="text-[9px] font-black text-gray-600">{idx + 1}</span>}
                </div>

                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-sm font-black ${ch.completed ? "text-orange-400" : "text-gray-200"}`}>{ch.label}</p>
                    <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${typeBg} ${typeColor} shrink-0`}>
                      <TypeIcon type={ch.type} className="w-3 h-3" /> {typeLabel}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-1">
                    <div className="w-full bg-white/[0.06] rounded-full h-1.5 overflow-hidden">
                      <motion.div
                        className={`h-1.5 rounded-full ${ch.completed ? "bg-orange-500" : ch.type === "views" ? "bg-blue-500/70" : "bg-pink-500/70"}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${progressPct}%` }}
                        transition={{ duration: 0.6, ease: "easeOut", delay: idx * 0.05 }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px]">
                      <span className={ch.completed ? "text-orange-400/70" : "text-gray-600"}>
                        {ch.progress.toLocaleString()} / {ch.target.toLocaleString()} {typeLabel}
                      </span>
                      {ch.completed ? (
                        <span className="text-orange-500 font-black uppercase tracking-wide">Done ✓</span>
                      ) : (
                        <span className="text-gray-700">{Math.round(progressPct)}%</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Teaser if not yet unlocked */}
      {!questorUnlocked && completedCount > 0 && (
        <div className="flex items-center gap-3 p-3 rounded-xl border border-white/[0.04] bg-white/[0.02]">
          <span className="text-base opacity-50">⚔️</span>
          <div>
            <p className="text-[11px] font-black text-gray-500">Questor badge — {5 - completedCount} more to unlock</p>
            <p className="text-[10px] text-gray-700">Complete {5 - completedCount} more challenge{5 - completedCount === 1 ? "" : "s"} to earn it automatically.</p>
          </div>
        </div>
      )}
    </div>
  );
}

function ExtrasTab({ user, localProfile, upd, updS, getS, profileMutation, userTracks, defaultSection }: any) {
  const [extrasSection, setExtrasSection] = useState<"tags" | "tracks" | "alias" | "visual" | "embed" | "challenges" | "templates" | null>(defaultSection || null);
  const maxTags = user?.maxTags ?? 5;
  const tags: string[] = localProfile?.settings?.tags || [];
  const [newTag, setNewTag] = useState("");

  const addTag = () => {
    const t = newTag.trim();
    if (!t || tags.includes(t) || tags.length >= maxTags) return;
    updS("tags", [...tags, t]);
    setNewTag("");
  };
  const removeTag = (tag: string) => updS("tags", tags.filter((t: string) => t !== tag));

  const EXTRA_SECTIONS = [
    { id: "tags", label: "Tags", desc: "Profile tags, status & pronouns", icon: Tag, url: "/dashboard/tags" },
    { id: "visual", label: "Visual", desc: "Theme link/badge options", icon: Eye, url: "/dashboard/visual" },
    { id: "tracks", label: "Tracks", desc: "Manage your custom music tracks", icon: Music, url: "/dashboard/tracks" },
    { id: "alias", label: "Alias", desc: "Create shareable profile aliases", icon: Globe, url: "/dashboard/alias" },
    { id: "challenges", label: "Challenges", desc: "Complete profile challenges", icon: Zap, url: "/dashboard/challenges" },
    { id: "embed", label: "Discord Embed", desc: "Customise your Discord OG embed", icon: SiDiscord, url: "/dashboard/embed" },
    { id: "templates", label: "Templates", desc: "Browse & apply profile templates", icon: LayoutTemplate, url: "/dashboard/templates" },
  ] as const;

  const goBack = () => { setExtrasSection(null); window.history.pushState({}, "", "/extras"); };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        {extrasSection && (
          <motion.button
            onClick={goBack}
            initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors text-sm font-black"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </motion.button>
        )}
        <div>
          <h1 className="text-2xl font-black">
            {extrasSection ? EXTRA_SECTIONS.find(s => s.id === extrasSection)?.label : "Extras"}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {extrasSection ? EXTRA_SECTIONS.find(s => s.id === extrasSection)?.desc : "Tags, tracks, visual tweaks, and more"}
          </p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {!extrasSection && (
          <motion.div key="list" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }}
            className="space-y-2">
            {EXTRA_SECTIONS.map(({ id, label, desc, icon: Icon, url }) => (
              <motion.button
                key={id}
                onClick={() => { setExtrasSection(id as any); window.history.pushState({}, "", url); }}
                whileHover={{ x: 3 }}
                whileTap={{ scale: 0.99 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className="w-full flex items-center gap-4 p-4 rounded-2xl border border-white/[0.06] bg-[#0e0e0e] hover:border-white/[0.12] hover:bg-[#111] transition-colors text-left group"
              >
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0 group-hover:bg-orange-500/10 transition-colors">
                  <Icon className="w-5 h-5 text-gray-400 group-hover:text-orange-400 transition-colors" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-sm text-white">{label}</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">{desc}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-colors shrink-0" />
              </motion.button>
            ))}
          </motion.div>
        )}

        {extrasSection === "tags" && (
          <motion.div key="tags" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }}
            className="space-y-4">
            <div className="bg-[#0e0e0e] border border-white/[0.06] rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-black flex items-center gap-2"><Tag className="w-4 h-4 text-orange-500" /> Profile Tags</h3>
                  <p className="text-[11px] text-gray-500 mt-0.5">Shown as chips on your profile. Max {maxTags}.</p>
                </div>
                <span className="text-[10px] font-mono px-2 py-1 bg-white/5 rounded-lg text-gray-400">{tags.length}/{maxTags}</span>
              </div>
              <div className="flex flex-wrap gap-2 min-h-[36px]">
                {tags.length === 0 && <p className="text-[11px] text-gray-600 py-1">No tags yet — add one below</p>}
                {tags.map((tag: string) => (
                  <motion.span key={tag} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-orange-500/30 bg-orange-500/10 text-orange-400 text-xs font-bold">
                    {tag}
                    <button onClick={() => removeTag(tag)} className="hover:text-red-400 transition-colors"><X className="w-3 h-3" /></button>
                  </motion.span>
                ))}
              </div>
              {tags.length < maxTags && (
                <div className="flex gap-2">
                  <Input value={newTag} onChange={e => setNewTag(e.target.value)} onKeyDown={e => e.key === "Enter" && addTag()}
                    placeholder="Add a tag... (press Enter)" maxLength={20}
                    className="bg-black/60 border-white/5 focus:border-orange-500/50 h-9 text-sm" />
                  <button onClick={addTag} disabled={!newTag.trim() || tags.length >= maxTags}
                    className="px-4 h-9 bg-orange-500 hover:bg-orange-400 text-black font-black rounded-lg transition-all disabled:opacity-50">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              )}
              <SettingRow label="Tags Position" desc="Where tags appear on your profile">
                <Select value={getS("tagsPosition", "default")} onValueChange={v => updS("tagsPosition", v)}>
                  <SelectTrigger className="w-36 bg-black/60 border-white/10 text-xs h-8"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[#0e0e0e] border-white/10">
                    <SelectItem value="default" className="text-xs">Below bio</SelectItem>
                    <SelectItem value="above-links" className="text-xs">Above links</SelectItem>
                  </SelectContent>
                </Select>
              </SettingRow>
              <button onClick={() => profileMutation.mutate(localProfile)} disabled={profileMutation.isPending}
                className="w-full h-9 bg-orange-500 hover:bg-orange-400 text-black font-black rounded-xl transition-all flex items-center justify-center gap-2">
                {profileMutation.isPending ? <Loader2 className="animate-spin w-4 h-4" /> : "Save Tags"}
              </button>
            </div>
            {/* Profile Bubbles */}
            <div className="bg-[#0e0e0e] border border-white/[0.06] rounded-2xl p-5 space-y-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Profile Bubbles</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Status</label>
                  <div className="flex gap-2">
                    <Input value={getS("statusEmoji", "")} onChange={e => updS("statusEmoji", e.target.value)}
                      placeholder="🔥" maxLength={4} className="bg-black/60 border-white/5 h-8 w-14 text-center text-sm shrink-0" />
                    <Input value={getS("statusMessage", "")} onChange={e => updS("statusMessage", e.target.value)}
                      placeholder="What's your status?" maxLength={80} className="bg-black/60 border-white/5 h-8 text-sm" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Pronouns</label>
                  <Input value={getS("pronouns", "")} onChange={e => updS("pronouns", e.target.value)}
                    placeholder="e.g. he/him" maxLength={30} className="bg-black/60 border-white/5 h-8 text-sm" />
                </div>
              </div>
              <button onClick={() => profileMutation.mutate(localProfile)} disabled={profileMutation.isPending}
                className="w-full h-8 bg-orange-500 hover:bg-orange-400 text-black font-black rounded-xl transition-all text-sm flex items-center justify-center gap-2">
                {profileMutation.isPending ? <Loader2 className="animate-spin w-4 h-4" /> : "Save Bubbles"}
              </button>
            </div>
          </motion.div>
        )}
        {extrasSection === "visual" && (
          <motion.div key="visual" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }}
            className="bg-[#0e0e0e] border border-white/[0.06] rounded-2xl p-5 space-y-4">
            <SectionTitle>Visual Extras</SectionTitle>

            <SettingRow label="Match Links to Theme" desc="Link icons use your theme color (white icon on theme bg)">
              <Switch checked={getS("matchLinksToTheme", false)} onCheckedChange={v => updS("matchLinksToTheme", v)} />
            </SettingRow>

            <SettingRow label="Theme Colour Link Icons" desc="When on, all link icons use your theme colour instead of the platform colours">
              <Switch checked={getS("themeColorIcons", false)} onCheckedChange={v => updS("themeColorIcons", v)} />
            </SettingRow>

            <SettingRow label="Links Glow to Theme Colour" desc="Links get a clean outer glow in your theme colour">
              <Switch checked={getS("linksGlow", false)} onCheckedChange={v => updS("linksGlow", v)} />
            </SettingRow>

            <SettingRow label="Links Layout" desc="How regular links are arranged on your profile">
              <Select value={getS("linksLayout", "stacked")} onValueChange={v => updS("linksLayout", v)}>
                <SelectTrigger className="w-28 bg-black/60 border-white/10 text-xs h-8"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-[#0e0e0e] border-white/10">
                  <SelectItem value="stacked" className="text-xs">Stacked</SelectItem>
                  <SelectItem value="split" className="text-xs">Split (2 col)</SelectItem>
                </SelectContent>
              </Select>
            </SettingRow>

            <div className="h-px bg-white/5" />

            <SettingRow label="Match Badges to Theme" desc="Badge icons tinted to match your theme color">
              <Switch checked={getS("matchBadgesToTheme", false)} onCheckedChange={v => updS("matchBadgesToTheme", v)} />
            </SettingRow>

            <SettingRow label="Badges Glow" desc="Badges glow with your theme color">
              <Switch checked={getS("badgesGlow", false)} onCheckedChange={v => updS("badgesGlow", v)} />
            </SettingRow>

            <button onClick={() => profileMutation.mutate(localProfile)} disabled={profileMutation.isPending}
              className="w-full h-9 bg-orange-500 hover:bg-orange-400 text-black font-black rounded-xl transition-all flex items-center justify-center gap-2">
              {profileMutation.isPending ? <Loader2 className="animate-spin w-4 h-4" /> : "Save"}
            </button>
          </motion.div>
        )}
        {extrasSection === "tracks" && (
          <motion.div key="tracks" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }}>
            <TrackTab userTracks={userTracks} user={user} getS={getS} updS={updS} profileMutation={profileMutation} localProfile={localProfile} />
          </motion.div>
        )}
        {extrasSection === "alias" && (
          <motion.div key="alias" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }}>
            <AliasSection user={user} />
          </motion.div>
        )}
        {extrasSection === "challenges" && (
          <motion.div key="challenges" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }}>
            <ChallengesPanel />
          </motion.div>
        )}
        {extrasSection === "embed" && (
          <motion.div key="embed" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }}
            className="space-y-4">
            <EmbedCustomizerSection
              localProfile={localProfile}
              user={user}
              getS={getS}
              updS={updS}
              profileMutation={profileMutation}
            />
          </motion.div>
        )}
        {extrasSection === "templates" && (
          <motion.div key="templates" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }}>
            <TemplatesPanel user={user} localProfile={localProfile} userTracks={userTracks} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Embed Customizer Section ────────────────────────────────────────────────

function EmbedCustomizerSection({ localProfile, user, getS, updS, profileMutation }: { localProfile: any; user: any; getS: (k: string, d: any) => any; updS: (k: string, v: any) => void; profileMutation: any }) {
  const { uploadFile, isUploading } = useUpload();
  const customImgRef = useRef<HTMLInputElement>(null);

  const isPremium = user?.isPremium;
  const showWatermark = localProfile?.showWatermark !== false;
  const defaultTitle = (isPremium && !showWatermark)
    ? (localProfile?.displayName || user?.username || "Your Name")
    : `${localProfile?.displayName || user?.username || "Your Name"} — Hexed`;

  const imageSize: "small" | "large" = getS("discordEmbedImageSize", "small");
  const customImage: string = getS("discordEmbedCustomImage", "");
  const showAvatar: boolean = getS("discordEmbedShowAvatar", true);

  const previewImage = (() => {
    if (customImage) return customImage;
    if (showAvatar && localProfile?.avatarUrl) return resolveUrl(localProfile.avatarUrl);
    return "";
  })();

  const descText = getS("discordEmbedDescription", "") || localProfile?.bio || "";

  return (
    <div className="bg-[#0e0e0e] border border-white/[0.06] rounded-2xl p-5 space-y-4">
      <div>
        <h3 className="font-black flex items-center gap-2 text-[#5865F2]"><SiDiscord className="w-4 h-4" /> Discord Embed</h3>
        <p className="text-[11px] text-gray-500 mt-0.5">Customize how your profile looks when shared in Discord or other platforms.</p>
      </div>

      <div className="space-y-3">
        {/* Title */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Embed Title</label>
          <Input
            value={getS("discordEmbedTitle", "")}
            onChange={e => updS("discordEmbedTitle", e.target.value)}
            placeholder={defaultTitle}
            maxLength={100}
            className="bg-black/60 border-white/5 focus:border-[#5865F2]/50 h-9 text-sm"
          />
          <p className="text-[10px] text-gray-600">
            Leave blank to use your display name{isPremium && !showWatermark ? "" : " — Hexed"} automatically.
            {!isPremium && <span className="text-[#9333ea] ml-1">Premium removes the "— Hexed" suffix.</span>}
          </p>
        </div>

        {/* Description with markdown hint */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Embed Description</label>
          <Textarea
            value={getS("discordEmbedDescription", "")}
            onChange={(e: any) => updS("discordEmbedDescription", e.target.value)}
            placeholder={localProfile?.bio || "Write something about yourself..."}
            rows={3}
            maxLength={300}
            className="bg-black/60 border-white/5 focus:border-[#5865F2]/50 text-sm resize-none font-mono"
          />
          <p className="text-[10px] text-gray-600">Supports Discord markdown: <code className="bg-white/5 px-1 rounded">**bold**</code> <code className="bg-white/5 px-1 rounded">*italic*</code> <code className="bg-white/5 px-1 rounded">~~strike~~</code> <code className="bg-white/5 px-1 rounded">`code`</code> <code className="bg-white/5 px-1 rounded">{"> quote"}</code></p>
        </div>

        {/* Image section */}
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Embed Image</label>
          <div className="flex gap-2">
            <button
              onClick={() => updS("discordEmbedShowAvatar", !showAvatar)}
              className={`flex-1 h-8 rounded-lg text-[11px] font-black border transition-all ${showAvatar && !customImage ? "bg-[#5865F2]/15 border-[#5865F2]/40 text-[#7289da]" : "bg-white/5 border-white/5 text-gray-500 hover:text-gray-300"}`}
            >
              Use Avatar
            </button>
            <button
              onClick={() => { updS("discordEmbedCustomImage", ""); if (customImgRef.current) customImgRef.current.value = ""; }}
              className={`flex-1 h-8 rounded-lg text-[11px] font-black border transition-all ${!customImage && !showAvatar ? "bg-[#5865F2]/15 border-[#5865F2]/40 text-[#7289da]" : "bg-white/5 border-white/5 text-gray-500 hover:text-gray-300"}`}
            >
              No Image
            </button>
          </div>
          <div className="flex gap-2 items-center">
            <Input
              value={customImage}
              onChange={e => updS("discordEmbedCustomImage", e.target.value)}
              placeholder="Or paste an image URL / GIF link..."
              className="bg-black/60 border-white/5 focus:border-[#5865F2]/50 h-9 text-sm flex-1"
            />
            <button
              onClick={() => customImgRef.current?.click()}
              disabled={isUploading}
              className="h-9 px-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg text-xs font-black text-gray-400 hover:text-white transition-all flex items-center gap-1.5 shrink-0"
            >
              {isUploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />} Upload
            </button>
            <input ref={customImgRef} type="file" accept="image/*,image/gif" className="hidden" onChange={async e => {
              const file = e.target.files?.[0]; if (!file) return;
              const url = await uploadFile(file);
              if (url) updS("discordEmbedCustomImage", url);
            }} />
          </div>
        </div>

        {/* Image size */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Image Layout</label>
          <div className="flex gap-2">
            {(["small", "large"] as const).map(size => (
              <button key={size} onClick={() => updS("discordEmbedImageSize", size)}
                className={`flex-1 h-8 rounded-lg text-[11px] font-black border transition-all capitalize ${imageSize === size ? "bg-[#5865F2]/15 border-[#5865F2]/40 text-[#7289da]" : "bg-white/5 border-white/5 text-gray-500 hover:text-gray-300"}`}>
                {size === "small" ? "Small Thumbnail" : "Large Image"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Live preview */}
      <div className="mt-2">
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-3">Preview</p>
        <div className="rounded-xl overflow-hidden border border-white/[0.06] bg-[#313338] p-3 max-w-sm">
          <div className="flex gap-3 items-start">
            <div className="w-8 h-8 rounded-full bg-[#5865F2]/30 flex items-center justify-center shrink-0">
              <SiDiscord className="w-4 h-4 text-[#5865F2]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[12px] font-bold text-[#5865F2]">Hexed</span>
                <span className="text-[9px] bg-[#5865F2] text-white font-bold px-1 py-0.5 rounded">BOT</span>
                <span className="text-[10px] text-[#949ba4]">Today</span>
              </div>
              <div className="rounded-lg overflow-hidden border-l-4 bg-[#2b2d31]" style={{ borderLeftColor: localProfile?.themeColor || "#F97316" }}>
                {imageSize === "large" ? (
                  <div className="p-3 space-y-1">
                    <p className="text-[11px] font-bold text-white truncate">
                      {getS("discordEmbedTitle", "") || defaultTitle}
                    </p>
                    <p className="text-[10px] text-[#b5bac1] leading-relaxed line-clamp-4">
                      {descText ? renderDiscordMarkdown(descText) : "No description set."}
                    </p>
                    <p className="text-[9px] text-[#949ba4] pt-0.5">hexed.at/{user?.username || "username"}</p>
                    {previewImage && (
                      <img src={previewImage} alt="" className="w-full rounded-lg object-cover mt-2 max-h-40" />
                    )}
                  </div>
                ) : (
                  <div className="flex items-start gap-3 p-3">
                    <div className="flex-1 min-w-0 space-y-1">
                      <p className="text-[11px] font-bold text-white truncate">
                        {getS("discordEmbedTitle", "") || defaultTitle}
                      </p>
                      <p className="text-[10px] text-[#b5bac1] leading-relaxed line-clamp-3">
                        {descText ? renderDiscordMarkdown(descText) : "No description set."}
                      </p>
                      <p className="text-[9px] text-[#949ba4] pt-1">hexed.at/{user?.username || "username"}</p>
                    </div>
                    {previewImage && (
                      <div className="w-20 h-20 rounded-lg overflow-hidden shrink-0 bg-[#313338] border border-white/10">
                        <img src={previewImage} alt="" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <button onClick={() => profileMutation.mutate(localProfile)} disabled={profileMutation.isPending}
        className="w-full h-9 bg-[#5865F2] hover:bg-[#4752c4] text-white font-black rounded-xl transition-all flex items-center justify-center gap-2">
        {profileMutation.isPending ? <Loader2 className="animate-spin w-4 h-4" /> : "Save Embed Settings"}
      </button>
    </div>
  );
}

// ─── Links Tab ────────────────────────────────────────────────────────────────

function DiscordEmbedPreview({ url }: { url: string }) {
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
    <a
      href={joinUrl}
      target="_blank"
      rel="noreferrer"
      className="mt-3 flex items-center gap-3 p-3 rounded-xl border border-[#5865F2]/30 bg-[#5865F2]/8 hover:bg-[#5865F2]/12 transition-colors"
    >
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

function LinksTab({ userLinks, linksLoading }: { userLinks: any[]; linksLoading: boolean }) {
  const { toast } = useToast();
  const { uploadFile, isUploading } = useUpload();
  const [adding, setAdding] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newStyle, setNewStyle] = useState("default");
  const [newIcon, setNewIcon] = useState("");
  const [platformSearch, setPlatformSearch] = useState("");

  const platform = PLATFORMS.find(p => p.id === selectedPlatform);

  const resetForm = () => {
    setNewTitle(""); setNewUrl(""); setNewDesc(""); setNewStyle("default"); setNewIcon("");
    setSelectedPlatform(null); setPlatformSearch(""); setAdding(false);
  };

  const addMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/links", {
      title: newTitle || (selectedPlatform === "discord-embed" ? "Discord Server" : ""),
      url: newUrl,
      description: selectedPlatform === "discord-embed" ? "" : newDesc,
      platform: selectedPlatform || "",
      style: selectedPlatform === "discord-embed" ? "card" : newStyle,
      icon: newIcon,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/links"] });
      resetForm();
      toast({ title: "Link added" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/links/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/links"] }); toast({ title: "Link deleted" }); },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, enabled }: any) => apiRequest("PATCH", `/api/links/${id}`, { enabled }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/links"] }),
  });

  const styleMutation = useMutation({
    mutationFn: ({ id, style }: any) => apiRequest("PATCH", `/api/links/${id}`, { style }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/links"] }),
  });

  const moveMutation = useMutation({
    mutationFn: ({ id, order }: any) => apiRequest("PATCH", `/api/links/${id}`, { order }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/links"] }),
  });

  const moveLink = (link: any, dir: -1 | 1) => {
    const sorted = [...(userLinks || [])].sort((a, b) => (a.order || 0) - (b.order || 0));
    const idx = sorted.findIndex((l: any) => l.id === link.id);
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const swap = sorted[swapIdx];
    moveMutation.mutate({ id: link.id, order: swap.order ?? swapIdx });
    moveMutation.mutate({ id: swap.id, order: link.order ?? idx });
  };

  const handleIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const result = await uploadFile(file);
    if (result) setNewIcon(result.publicUrl || `${window.location.origin}${result.objectPath}`);
    e.target.value = "";
  };

  const sorted = [...(userLinks || [])].sort((a, b) => (a.order || 0) - (b.order || 0));
  const filteredPlatforms = platformSearch.trim()
    ? PLATFORMS.filter(p => p.name.toLowerCase().includes(platformSearch.toLowerCase()))
    : PLATFORMS;

  const LINK_STYLES = [
    { value: "default", label: "Default", desc: "Row with icon and text" },
    { value: "card", label: "Card", desc: "Large card with platform color" },
    { value: "icon", label: "Icon Only", desc: "Small icon button, grouped" },
  ];

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-black">Links</h1>
          <p className="text-gray-500 text-sm mt-1">Add social platforms and custom links</p>
        </div>
        <button onClick={() => setAdding(a => !a)}
          className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-400 text-black font-black rounded-xl transition-all text-sm">
          <Plus className="w-4 h-4" /> Add Link
        </button>
      </div>

      <AnimatePresence>
        {adding && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            className="bg-[#0e0e0e] border border-orange-500/30 rounded-2xl p-5 space-y-4 overflow-hidden">
            <h3 className="text-[11px] font-black uppercase tracking-widest text-orange-500">New Link</h3>

            {/* Platform picker */}
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-gray-500">Platform (Optional)</Label>
              {selectedPlatform === "discord-embed" ? (
                <div className="flex items-center gap-3 p-3 rounded-xl border border-[#5865F2]/30 bg-[#5865F2]/10">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-[#5865F2]/20">
                    <SiDiscord className="w-5 h-5 text-[#5865F2]" />
                  </div>
                  <div className="flex-1">
                    <p className="font-black text-sm">Discord Server Card</p>
                    <p className="text-[10px] text-gray-500">Shows server icon, name, members & join button</p>
                  </div>
                  <button onClick={() => { setSelectedPlatform(null); setNewTitle(""); setNewUrl(""); }} className="text-gray-500 hover:text-white transition-colors"><X className="w-4 h-4" /></button>
                </div>
              ) : selectedPlatform && selectedPlatform !== "custom" ? (
                <div className="flex items-center gap-3 p-3 rounded-xl border border-white/10 bg-black/40">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${platform?.color}22` }}>
                    {platform && <platform.icon style={{ color: platform.color }} className="w-5 h-5" />}
                  </div>
                  <div className="flex-1">
                    <p className="font-black text-sm">{platform?.name}</p>
                    <p className="text-[10px] text-gray-500">{platform?.domain}</p>
                  </div>
                  <button onClick={() => { setSelectedPlatform(null); setNewTitle(""); setNewUrl(""); setNewIcon(""); }}
                    className="text-gray-500 hover:text-white transition-colors"><X className="w-4 h-4" /></button>
                </div>
              ) : selectedPlatform === "custom" ? (
                <div className="flex items-center gap-3 p-3 rounded-xl border border-white/10 bg-black/40">
                  <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center">
                    <LinkIcon className="w-4 h-4 text-gray-400" />
                  </div>
                  <p className="font-black text-sm flex-1">Custom Link</p>
                  <button onClick={() => { setSelectedPlatform(null); setNewIcon(""); }} className="text-gray-500 hover:text-white transition-colors"><X className="w-4 h-4" /></button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Input value={platformSearch} onChange={e => setPlatformSearch(e.target.value)}
                    placeholder="Search platforms or skip..." className="bg-black/60 border-white/5 h-8 text-xs" />
                  <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 max-h-52 overflow-y-auto">
                    {filteredPlatforms.map(p => (
                      <button key={p.id} onClick={() => {
                        setSelectedPlatform(p.id);
                        if (!newTitle) setNewTitle(p.name);
                        setNewUrl(p.placeholder);
                        setPlatformSearch("");
                      }}
                        title={p.name}
                        className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl border border-white/5 hover:border-orange-500/30 bg-black/30 hover:bg-black/50 transition-all group">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center transition-all group-hover:scale-110" style={{ backgroundColor: `${p.color}22` }}>
                          <p.icon style={{ color: p.color }} className="w-4 h-4" />
                        </div>
                        <span className="text-[9px] font-bold text-gray-500 group-hover:text-white transition-colors truncate w-full text-center">{p.name.split("/")[0].trim()}</span>
                      </button>
                    ))}
                    <button onClick={() => { setSelectedPlatform("discord-embed"); setPlatformSearch(""); setNewTitle("Discord Server"); }}
                      className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl border border-white/5 hover:border-[#5865F2]/40 bg-black/30 hover:bg-black/50 transition-all group">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#5865F2]/10">
                        <SiDiscord className="w-4 h-4 text-[#5865F2]" />
                      </div>
                      <span className="text-[9px] font-bold text-gray-500 group-hover:text-white transition-colors">Server Card</span>
                    </button>
                    <button onClick={() => { setSelectedPlatform("custom"); setPlatformSearch(""); }}
                      className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl border border-white/5 hover:border-orange-500/30 bg-black/30 hover:bg-black/50 transition-all group">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/5">
                        <LinkIcon className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors" />
                      </div>
                      <span className="text-[9px] font-bold text-gray-500 group-hover:text-white transition-colors">Custom</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {selectedPlatform === "discord-embed" ? (
              /* Discord Embed: only needs invite URL */
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase text-gray-500">Label (Optional)</Label>
                  <Input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Discord Server"
                    className="bg-black/60 border-white/5 focus:border-[#5865F2]/50" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase text-gray-500">Server Invite URL *</Label>
                  <Input value={newUrl} onChange={e => setNewUrl(e.target.value)}
                    placeholder="https://discord.gg/invite123"
                    className="bg-black/60 border-[#5865F2]/20 focus:border-[#5865F2]/50" />
                  <p className="text-[9px] text-gray-600">Server info (icon, name, members) is fetched automatically from the invite</p>
                </div>
              </div>
            ) : (
              <>
                <div className="grid md:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase text-gray-500">Title *</Label>
                    <Input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="My Website"
                      className="bg-black/60 border-white/5 focus:border-orange-500/50" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase text-gray-500">URL *</Label>
                    <Input value={newUrl} onChange={e => setNewUrl(e.target.value)}
                      placeholder={platform?.placeholder || "https://..."}
                      className="bg-black/60 border-white/5 focus:border-orange-500/50" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase text-gray-500">Description</Label>
                  <Input value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Short description..."
                    className="bg-black/60 border-white/5 focus:border-orange-500/50" />
                </div>

                {/* Custom icon (for custom links) */}
                {selectedPlatform === "custom" && (
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase text-gray-500">Custom Icon (Optional)</Label>
                    <div className="flex gap-2">
                      <Input value={newIcon} onChange={e => setNewIcon(e.target.value)} placeholder="Paste image URL..."
                        className="bg-black/60 border-white/5 focus:border-orange-500/50 h-9 text-sm flex-1" />
                      <label className={`flex items-center justify-center w-9 h-9 rounded-lg border border-white/10 bg-white/5 hover:bg-orange-500/10 cursor-pointer transition-all ${isUploading ? "opacity-50 pointer-events-none" : ""}`}>
                        {isUploading ? <Loader2 className="w-4 h-4 animate-spin text-orange-500" /> : <Upload className="w-4 h-4 text-gray-400" />}
                        <input type="file" accept="image/*" className="hidden" onChange={handleIconUpload} />
                      </label>
                    </div>
                    {newIcon && <img src={resolveUrl(newIcon)} alt="" className="w-10 h-10 object-contain rounded-lg border border-white/10" />}
                  </div>
                )}

                {/* Display style */}
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-gray-500">Display Style</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {LINK_STYLES.map(s => (
                      <button key={s.value} onClick={() => setNewStyle(s.value)}
                        className={`p-2.5 rounded-xl border text-left transition-all ${newStyle === s.value ? "border-orange-500 bg-orange-500/10" : "border-white/10 bg-black/30 hover:border-white/20"}`}>
                        <p className={`text-xs font-black ${newStyle === s.value ? "text-orange-500" : "text-gray-300"}`}>{s.label}</p>
                        <p className="text-[9px] text-gray-600 mt-0.5">{s.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => addMutation.mutate()}
                disabled={!newUrl || (!newTitle && selectedPlatform !== "discord-embed") || addMutation.isPending}
                className="flex-1 h-9 bg-orange-500 hover:bg-orange-400 text-black font-black rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                {addMutation.isPending ? <Loader2 className="animate-spin w-4 h-4" /> : "Add Link"}
              </button>
              <button onClick={resetForm} className="px-4 h-9 border border-white/10 hover:border-white/30 text-gray-400 hover:text-white font-black rounded-xl transition-all text-sm">Cancel</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {linksLoading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="animate-spin text-orange-500 w-6 h-6" /></div>
      ) : sorted.length === 0 ? (
        <div className="text-center py-16 bg-[#0e0e0e] border border-white/[0.06] rounded-2xl">
          <LinkIcon className="w-10 h-10 mx-auto mb-3 text-gray-700" />
          <p className="font-black text-gray-500">No links yet</p>
          <p className="text-[11px] text-gray-700 mt-1">Add your social platforms and websites above</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map((link: any, idx: number) => {
            const lp = getPlatform(link.platform);
            return (
              <motion.div key={link.id} layout className={`p-4 bg-[#0e0e0e] border border-white/[0.06] rounded-2xl group hover:border-white/10 transition-colors ${link.platform === "discord-embed" ? "border-[#5865F2]/20 hover:border-[#5865F2]/30" : ""}`}>
                <div className="flex items-center gap-3">
                  <div className="flex flex-col gap-0.5 shrink-0">
                    <button onClick={() => moveLink(link, -1)} disabled={idx === 0} className="text-gray-600 hover:text-white disabled:opacity-20 transition-colors"><ChevronUp className="w-3.5 h-3.5" /></button>
                    <button onClick={() => moveLink(link, 1)} disabled={idx === sorted.length - 1} className="text-gray-600 hover:text-white disabled:opacity-20 transition-colors"><ChevronDown className="w-3.5 h-3.5" /></button>
                  </div>
                  {link.platform === "discord-embed" ? (
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-[#5865F2]/20">
                      <SiDiscord className="w-5 h-5 text-[#5865F2]" />
                    </div>
                  ) : lp ? (
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${lp.color}22` }}>
                      <lp.icon style={{ color: lp.color }} className="w-5 h-5" />
                    </div>
                  ) : link.icon ? (
                    <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                      <img src={resolveUrl(link.icon)} alt="" className="w-6 h-6 object-contain" />
                    </div>
                  ) : (
                    <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                      <ExternalLink className="w-4 h-4 text-gray-500" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-sm truncate">{link.title}</p>
                    <p className="text-[11px] text-gray-500 truncate">{link.url}</p>
                  </div>
                  {link.platform !== "discord-embed" && (
                    <Select value={link.style || "default"} onValueChange={style => styleMutation.mutate({ id: link.id, style })}>
                      <SelectTrigger className="w-24 bg-black/40 border-white/10 text-[10px] h-7 font-bold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0e0e0e] border-white/10">
                        <SelectItem value="default" className="text-xs">Default</SelectItem>
                        <SelectItem value="card" className="text-xs">Card</SelectItem>
                        <SelectItem value="icon" className="text-xs">Icon</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                  {link.platform === "discord-embed" && (
                    <span className="text-[9px] font-black uppercase tracking-wider text-[#5865F2] bg-[#5865F2]/10 px-2 py-1 rounded-lg shrink-0">Embed</span>
                  )}
                  <Switch checked={link.enabled !== false} onCheckedChange={enabled => toggleMutation.mutate({ id: link.id, enabled })} />
                  <button onClick={() => { if (confirm("Delete this link?")) deleteMutation.mutate(link.id); }}
                    className="w-7 h-7 flex items-center justify-center text-gray-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 shrink-0">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                {link.platform === "discord-embed" && link.url && (
                  <DiscordEmbedPreview url={link.url} />
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Track Tab ────────────────────────────────────────────────────────────────

function TrackTab({ userTracks, user, getS, updS, profileMutation, localProfile }: { userTracks: any[]; user: any; getS?: any; updS?: any; profileMutation?: any; localProfile?: any }) {
  const { toast } = useToast();
  const { t } = useI18n();
  const { uploadFile, isUploading } = useUpload();
  const [activeTab, setActiveTab] = useState<"songs" | "spotify">("songs");
  const [adding, setAdding] = useState(false);
  const [trackTitle, setTrackTitle] = useState("");
  const [trackUrl, setTrackUrl] = useState("");
  const [artistProfile, setArtistProfile] = useState("");
  const [spotifySearch, setSpotifySearch] = useState("");
  const [spotifyResults, setSpotifyResults] = useState<any[]>([]);
  const [spotifyLoading, setSpotifyLoading] = useState(false);
  const [selectedSpotify, setSelectedSpotify] = useState<any>(null);
  const [volume, setVolume] = useState(() => (getS ? getS("trackVolume", 80) : 80));
  const searchTimerRef = useRef<any>(null);
  const [playingPreviewId, setPlayingPreviewId] = useState<string | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  const isPremium = user?.isPremium;

  useEffect(() => {
    if (activeTab !== "spotify") {
      previewAudioRef.current?.pause();
      previewAudioRef.current = null;
      setPlayingPreviewId(null);
    }
  }, [activeTab]);

  useEffect(() => {
    return () => {
      previewAudioRef.current?.pause();
    };
  }, []);

  const togglePreview = (track: any) => {
    const isSame = playingPreviewId === track.id;
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
    }
    if (isSame) {
      setPlayingPreviewId(null);
      return;
    }
    if (!track.preview) return;
    const audio = new Audio(track.preview);
    audio.volume = 0.7;
    audio.play().catch(() => {});
    audio.onended = () => setPlayingPreviewId(null);
    previewAudioRef.current = audio;
    setPlayingPreviewId(track.id);
  };

  const addTrackMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/tracks", { title: trackTitle, url: trackUrl, artistProfile }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tracks"] });
      setTrackTitle(""); setTrackUrl(""); setArtistProfile(""); setAdding(false);
      toast({ title: "Track added" });
    },
  });

  const deleteTrackMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/tracks/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/tracks"] }),
  });

  const useSpotifyTrack = useMutation({
    mutationFn: async (track: any) => {
      const ytRes = await fetch(
        `/api/youtube/search?q=${encodeURIComponent(track.title + " " + track.artist)}`,
        { credentials: "include" }
      );
      const ytData = await ytRes.json();
      const url = ytData.url || track.url;
      return apiRequest("POST", "/api/tracks", { title: track.title, url, artistProfile: track.artist });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tracks"] });
      setSelectedSpotify(null);
      toast({ title: "Track added!" });
    },
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const result = await uploadFile(file);
    if (result) setTrackUrl(result.publicUrl || `${window.location.origin}${result.objectPath}`);
    e.target.value = "";
  };

  const handleVolumeChange = (v: number) => {
    setVolume(v);
    if (updS) updS("trackVolume", v);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      if (profileMutation && localProfile) profileMutation.mutate({ ...localProfile, settings: { ...(localProfile.settings || {}), trackVolume: v } });
    }, 800);
  };

  const searchSpotify = async (q: string) => {
    if (!q.trim()) { setSpotifyResults([]); return; }
    setSpotifyLoading(true);
    try {
      const res = await fetch(`/api/spotify/search?q=${encodeURIComponent(q)}`, { credentials: "include" });
      if (res.ok) { setSpotifyResults(await res.json()); }
      else { setSpotifyResults([]); }
    } catch { setSpotifyResults([]); }
    setSpotifyLoading(false);
  };

  const onSpotifyInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setSpotifySearch(v);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => searchSpotify(v), 500);
  };

  const formatDuration = (ms: number) => {
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  };

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-black">{t("tracks.title", "Tracks")}</h1>
          <p className="text-gray-500 text-sm mt-1">{t("tracks.desc", "Manage music tracks for your profile player")}</p>
        </div>
        {activeTab === "songs" && (
          <button onClick={() => setAdding(a => !a)}
            className="px-5 h-9 bg-orange-500 hover:bg-orange-400 text-black font-black rounded-xl transition-all flex items-center gap-2">
            <Plus className="w-4 h-4" /> {t("tracks.add", "Add Track")}
          </button>
        )}
      </div>

      {/* Volume Slider */}
      {getS && updS && (
        <div className="bg-[#0e0e0e] border border-white/[0.06] rounded-2xl px-5 py-4 space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-[10px] font-black uppercase text-gray-500 flex items-center gap-1.5">
              <Volume2 className="w-3.5 h-3.5" /> {t("tracks.volume", "Player Volume")}
            </Label>
            <span className="text-[11px] font-black text-orange-500">{volume}%</span>
          </div>
          <Slider
            value={[volume]}
            onValueChange={([v]) => handleVolumeChange(v)}
            min={0} max={100} step={1}
            className="w-full"
          />
        </div>
      )}

      {/* Sub-tabs */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setActiveTab("songs")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black text-sm border transition-colors ${activeTab === "songs" ? "bg-orange-500 border-orange-500 text-black" : "border-white/10 text-gray-400 hover:text-white bg-[#0e0e0e]"}`}
        >
          <Music className="w-4 h-4" /> Songs
        </button>
        <button
          onClick={() => setActiveTab("spotify")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black text-sm border transition-colors ${activeTab === "spotify" ? "bg-orange-500 border-orange-500 text-black" : "border-white/10 text-gray-400 hover:text-white bg-[#0e0e0e]"}`}
        >
          <Headphones className="w-4 h-4" /> Search Songs
        </button>
      </div>

      {/* Songs tab */}
      {activeTab === "songs" && (
        <>
          <AnimatePresence>
            {adding && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                className="border border-orange-500/20 rounded-2xl p-4 space-y-3 bg-orange-500/5">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase text-gray-500">Track Title</Label>
                  <Input value={trackTitle} onChange={e => setTrackTitle(e.target.value)} placeholder="Song name..." className="bg-black/60 border-white/5 h-9 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase text-gray-500">Artist / Profile <span className="text-gray-600 normal-case font-normal">(optional)</span></Label>
                  <Input value={artistProfile} onChange={e => setArtistProfile(e.target.value)} placeholder="Artist name or profile link..." className="bg-black/60 border-white/5 h-9 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase text-gray-500">Audio URL or Upload</Label>
                  <div className="flex gap-2">
                    <Input value={trackUrl} onChange={e => setTrackUrl(e.target.value)} placeholder="YouTube, Spotify, SoundCloud URL or upload audio" className="bg-black/60 border-white/5 h-9 text-sm flex-1" />
                    <label className={`flex items-center justify-center w-9 h-9 rounded-xl border border-white/10 bg-white/5 cursor-pointer ${isUploading ? "opacity-50" : "hover:border-orange-500/40"}`}>
                      {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin text-orange-500" /> : <Upload className="w-3.5 h-3.5 text-gray-400" />}
                      <input type="file" accept="audio/*,video/*" className="hidden" onChange={handleUpload} />
                    </label>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => addTrackMutation.mutate()} disabled={!trackTitle || !trackUrl || addTrackMutation.isPending}
                    className="flex-1 h-9 bg-orange-500 hover:bg-orange-400 text-black font-black rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm">
                    {addTrackMutation.isPending ? <Loader2 className="animate-spin w-3.5 h-3.5" /> : "Add Track"}
                  </button>
                  <button onClick={() => setAdding(false)} className="px-4 h-9 text-gray-500 hover:text-white font-black rounded-xl border border-white/10 text-sm transition-all">Cancel</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="bg-[#0e0e0e] border border-white/[0.06] rounded-2xl overflow-hidden">
            {(userTracks || []).length === 0 && !adding ? (
              <div className="py-12 text-center">
                <Music className="w-8 h-8 text-gray-700 mx-auto mb-3" />
                <p className="text-sm text-gray-600 font-bold">No tracks yet</p>
                <p className="text-[11px] text-gray-700 mt-1">Add your first track above</p>
              </div>
            ) : (
              <div className="divide-y divide-white/[0.04]">
                {(userTracks || []).map((t: any, i: number) => (
                  <div key={t.id} className="flex items-center gap-4 px-5 py-3.5 group hover:bg-white/[0.02] transition-colors">
                    <span className="text-[10px] font-black text-gray-700 w-4 text-center">{i + 1}</span>
                    <Music className="w-4 h-4 text-orange-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate">{t.title}</p>
                      {t.artistProfile && <p className="text-[11px] text-gray-500 truncate mt-0.5">{t.artistProfile}</p>}
                    </div>
                    <button onClick={() => deleteTrackMutation.mutate(t.id)} className="text-gray-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Search Songs tab */}
      {activeTab === "spotify" && (
        <div className="space-y-3">
          <div className="relative">
            <Input
              value={spotifySearch}
              onChange={onSpotifyInput}
              placeholder="Search any song or artist..."
              className="bg-black/60 border-orange-500/30 focus:border-orange-500/60 h-10 text-sm pl-10"
            />
            <Headphones className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-500" />
            {spotifyLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-orange-400" />}
          </div>

          {spotifyResults.length > 0 && (
            <div className="bg-[#0e0e0e] border border-white/[0.06] rounded-2xl overflow-hidden divide-y divide-white/[0.04]">
              {spotifyResults.map((track: any) => {
                const isPlaying = playingPreviewId === track.id;
                return (
                  <div key={track.id} className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors">
                    <div className="relative shrink-0 group">
                      {track.image ? (
                        <img src={track.image} alt="" className="w-10 h-10 rounded-lg object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center">
                          <Music className="w-4 h-4 text-gray-600" />
                        </div>
                      )}
                      {track.preview && (
                        <button
                          onClick={() => togglePreview(track)}
                          className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity"
                          data-testid={`button-preview-${track.id}`}
                        >
                          {isPlaying ? <Pause className="w-4 h-4 text-white" /> : <Play className="w-4 h-4 text-white" />}
                        </button>
                      )}
                      {isPlaying && (
                        <div className="absolute inset-0 rounded-lg ring-2 ring-orange-500 pointer-events-none" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-bold truncate ${isPlaying ? "text-orange-400" : ""}`}>{track.title}</p>
                      <p className="text-[11px] text-gray-500 truncate">{track.artist}{track.album ? ` · ${track.album}` : ""}</p>
                    </div>
                    <span className="text-[10px] text-gray-600 shrink-0">{formatDuration(track.duration)}</span>
                    <button
                      onClick={() => useSpotifyTrack.mutate(track)}
                      disabled={useSpotifyTrack.isPending}
                      className="px-3 h-7 bg-orange-500 hover:bg-orange-400 text-black font-black rounded-lg text-xs flex items-center gap-1 shrink-0 transition-all disabled:opacity-50"
                    >
                      {useSpotifyTrack.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Plus className="w-3 h-3" /> Add</>}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {spotifySearch && !spotifyLoading && spotifyResults.length === 0 && (
            <div className="text-center py-10 text-gray-600 text-sm font-bold">No results found</div>
          )}

          {!spotifySearch && (
            <div className="text-center py-10">
              <Headphones className="w-8 h-8 text-orange-500/30 mx-auto mb-3" />
              <p className="text-sm text-gray-600 font-bold">Search any song or artist</p>
              <p className="text-[11px] text-gray-700 mt-1">Adds the full song via YouTube to your profile player</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Cursor Premium Panel ─────────────────────────────────────────────────────

function CursorPremiumPanel({ getS, updS }: { getS: (k: string, d: any) => any; updS: (k: string, v: any) => void }) {
  const { uploadFile, isUploading } = useUpload();

  const handleCursorImageUpload = async (file: File) => {
    const url = await uploadFile(file, "image");
    if (url) updS("cursorImageUrl", url);
  };

  return (
    <div className="space-y-4">
      <SettingRow label="Cursor Style" desc="CSS cursor style (overridden by custom image if set)">
        <Select value={getS("cursor", "default")} onValueChange={v => updS("cursor", v)}>
          <SelectTrigger className="w-32 bg-black/60 border-white/10 text-xs h-8"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-[#0e0e0e] border-white/10">
            {["default","none","crosshair","pointer","cell","zoom-in"].map(v => <SelectItem key={v} value={v} className="text-xs">{v}</SelectItem>)}
          </SelectContent>
        </Select>
      </SettingRow>
      <div className="space-y-1.5">
        <Label className="text-[11px] font-black uppercase text-gray-500">Custom Cursor Image</Label>
        <p className="text-[10px] text-gray-600">Upload an image (32×32 or smaller recommended) or paste a URL.</p>
        <div className="flex gap-2">
          <Input value={getS("cursorImageUrl", "")} onChange={e => updS("cursorImageUrl", e.target.value)}
            placeholder="https://... or upload below" className="bg-black/60 border-white/5 focus:border-orange-500/50 h-9 text-sm flex-1" />
          <label className={`flex items-center justify-center w-9 h-9 rounded-lg border border-white/10 bg-white/5 hover:bg-orange-500/10 cursor-pointer transition-all ${isUploading ? "opacity-50 pointer-events-none" : ""}`}>
            {isUploading ? <Loader2 className="animate-spin w-4 h-4 text-orange-500" /> : <ImageIcon className="w-4 h-4 text-gray-400" />}
            <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleCursorImageUpload(e.target.files[0])} />
          </label>
          {getS("cursorImageUrl", "") && (
            <button onClick={() => updS("cursorImageUrl", "")} className="w-9 h-9 flex items-center justify-center text-gray-500 hover:text-red-400 transition-colors border border-white/10 rounded-lg bg-white/5">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        {getS("cursorImageUrl", "") && (
          <div className="flex items-center gap-2 mt-1">
            <img src={getS("cursorImageUrl", "")} alt="cursor preview" className="w-8 h-8 object-contain bg-white/5 rounded border border-white/10" />
            <span className="text-[10px] text-gray-500">Preview (actual size on profile)</span>
          </div>
        )}
      </div>
      <SettingRow label="Cursor Color" desc="Color of the cursor arrow (when no custom image is set)">
        <div className="flex items-center gap-2">
          <ColorPicker value={getS("cursorColor", "#ffffff")} onChange={v => updS("cursorColor", v)} label="Color" />
          {getS("cursorColor", "") && (
            <button onClick={() => updS("cursorColor", "")} className="text-[10px] text-gray-500 hover:text-red-400 transition-colors font-black uppercase">Reset</button>
          )}
        </div>
      </SettingRow>
      <SettingRow label="Cursor Trail" desc="Glowing trail that follows the cursor">
        <Switch checked={getS("cursorTrail", false)} onCheckedChange={v => updS("cursorTrail", v)} />
      </SettingRow>
      {getS("cursorTrail", false) && (
        <SettingRow label="Trail Color">
          <ColorPicker value={getS("cursorTrailColor", "#F97316")} onChange={v => updS("cursorTrailColor", v)} label="Trail" />
        </SettingRow>
      )}
    </div>
  );
}

// ─── Miscellaneous Tab ────────────────────────────────────────────────────────

function MiscTab({ localProfile, upd, updS, getS, userTracks, profileMutation, user }: any) {
  const { toast } = useToast();
  const { uploadFile, isUploading } = useUpload();
  const [miscSection, setMiscSection] = useState("tracks");
  const { data: dbDecorations = [] } = useQuery<any[]>({ queryKey: ["/api/decorations"] });
  const [addingTrack, setAddingTrack] = useState(false);
  const [trackTitle, setTrackTitle] = useState("");
  const [trackUrl, setTrackUrl] = useState("");
  const [boxTab, setBoxTab] = useState<"general" | "blur" | "stroke">("general");
  const [colorsTab, setColorsTab] = useState<"solid" | "gradients">("solid");

  const addTrackMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/tracks", { title: trackTitle, url: trackUrl }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tracks"] });
      setTrackTitle(""); setTrackUrl(""); setAddingTrack(false);
      toast({ title: "Track added" });
    },
  });

  const deleteTrackMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/tracks/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/tracks"] }),
  });

  const toggleTrackMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: number; enabled: boolean }) => apiRequest("PATCH", `/api/tracks/${id}`, { enabled }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/tracks"] }),
  });

  const handleTrackUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const result = await uploadFile(file);
    if (result) setTrackUrl(result.publicUrl || `${window.location.origin}${result.objectPath}`);
    e.target.value = "";
  };

  const SECTIONS = [
    { id: "tracks",     label: "Track Player",  icon: Music },
    { id: "effects",    label: "Effects",        icon: Sparkles },
    { id: "page",       label: "Page",           icon: Settings },
    { id: "colors",     label: "Colors",         icon: Palette },
    { id: "banner",     label: "Banner",         icon: ImageIcon },
    { id: "background", label: "Background",     icon: MonitorPlay },
    { id: "box",        label: "Profile Box",    icon: LayoutTemplate },
    { id: "username",   label: "Username",       icon: Type },
    { id: "avatar",     label: "Avatar",         icon: UserIcon },
    { id: "cursor",     label: "Cursor",         icon: MousePointer },
    { id: "alignment",  label: "Alignment",      icon: AlignCenter },
    { id: "reveal",     label: "Reveal Screen",  icon: Eye },
  ];

  const MiscCard = ({ title, icon: Icon, children, wide }: { title: string; icon: any; children: React.ReactNode; wide?: boolean }) => (
    <div className={`bg-[#0e0e0e] border border-white/[0.06] rounded-2xl p-5 space-y-4${wide ? " lg:col-span-2" : ""}`}>
      <div className="flex items-center gap-2 pb-1 border-b border-white/[0.05]">
        <Icon className="w-3.5 h-3.5 text-orange-500 shrink-0" />
        <h3 className="text-[11px] font-black uppercase tracking-widest text-gray-400">{title}</h3>
      </div>
      {children}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-black">Profile Settings</h1>
          <p className="text-gray-500 text-sm mt-1">Advanced visual effects and page settings</p>
        </div>
        <button onClick={() => profileMutation.mutate(localProfile)} disabled={profileMutation.isPending}
          className="px-5 h-9 bg-orange-500 hover:bg-orange-400 text-black font-black rounded-xl transition-all flex items-center gap-2 disabled:opacity-50">
          {profileMutation.isPending ? <Loader2 className="animate-spin w-4 h-4" /> : "Save"}
        </button>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">

        {/* TRACK PLAYER */}
        <MiscCard title="Track Player" icon={Music}>
            <div className="space-y-4">
              <SectionTitle>Track Player</SectionTitle>
              <SettingRow label="Enable Track Player" desc="Show the music player on your profile">
                <Switch checked={getS("trackPlayerEnabled", true)} onCheckedChange={v => updS("trackPlayerEnabled", v)} />
              </SettingRow>
              <SettingRow label="Position" desc="Where to show the player widget">
                <Select value={getS("trackPlayerPos", "bottom-right")} onValueChange={v => updS("trackPlayerPos", v)}>
                  <SelectTrigger className="w-36 bg-black/60 border-white/10 text-xs h-8"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[#0e0e0e] border-white/10">
                    {["top-left","top-right","bottom-left","bottom-right"].map(v => <SelectItem key={v} value={v} className="text-xs">{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </SettingRow>
              <SettingRow label="Autoplay" desc="Start playing music automatically when profile loads">
                <Switch checked={getS("trackPlayerAutoplay", true)} onCheckedChange={v => updS("trackPlayerAutoplay", v)} />
              </SettingRow>
              <SettingRow label="Random Start" desc="Begin on a random track each time the profile loads">
                <Switch checked={getS("trackRandomStart", false)} onCheckedChange={v => updS("trackRandomStart", v)} />
              </SettingRow>
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-black uppercase text-gray-600">Tracks ({(userTracks || []).length})</span>
                  <button onClick={() => setAddingTrack(a => !a)} className="text-[10px] font-black uppercase text-orange-500 hover:text-orange-400 flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Add Track
                  </button>
                </div>
                <AnimatePresence>
                  {addingTrack && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                      className="border border-orange-500/20 rounded-xl p-3 space-y-2 bg-orange-500/5">
                      <Input value={trackTitle} onChange={e => setTrackTitle(e.target.value)} placeholder="Track title..." className="bg-black/60 border-white/5 h-8 text-sm" />
                      <div className="flex gap-2">
                        <Input value={trackUrl} onChange={e => setTrackUrl(e.target.value)} placeholder="https://... or upload" className="bg-black/60 border-white/5 h-8 text-sm flex-1" />
                        <label className={`flex items-center justify-center w-8 h-8 rounded border border-white/10 bg-white/5 cursor-pointer ${isUploading ? "opacity-50" : ""}`}>
                          {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin text-orange-500" /> : <Upload className="w-3.5 h-3.5 text-gray-400" />}
                          <input type="file" accept="audio/*,video/*" className="hidden" onChange={handleTrackUpload} />
                        </label>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => addTrackMutation.mutate()} disabled={!trackTitle || !trackUrl || addTrackMutation.isPending}
                          className="flex-1 h-8 bg-orange-500 hover:bg-orange-400 text-black font-black rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm">
                          {addTrackMutation.isPending ? <Loader2 className="animate-spin w-3 h-3" /> : "Add"}
                        </button>
                        <button onClick={() => setAddingTrack(false)} className="px-3 h-8 text-gray-500 hover:text-white font-black rounded-lg border border-white/10 text-sm transition-all">Cancel</button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                {(userTracks || []).length === 0 && !addingTrack && (
                  <p className="text-[11px] text-gray-600 text-center py-2">No tracks yet — add one above</p>
                )}
                {(userTracks || []).map((t: any) => (
                  <div key={t.id} className="flex items-center gap-3 p-2.5 bg-black/30 border border-white/5 rounded-xl group">
                    <Music className={`w-3.5 h-3.5 shrink-0 ${t.enabled !== 0 ? "text-orange-500" : "text-gray-700"}`} />
                    <span className={`text-sm font-bold flex-1 truncate ${t.enabled !== 0 ? "" : "opacity-40 line-through"}`}>{t.title}</span>
                    <Switch
                      checked={t.enabled !== 0}
                      onCheckedChange={v => toggleTrackMutation.mutate({ id: t.id, enabled: v })}
                      className="shrink-0 scale-75"
                    />
                    <button onClick={() => deleteTrackMutation.mutate(t.id)} className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
        </MiscCard>

        <div>
          {/* EFFECTS */}
          {miscSection === "effects" && (
            <div className="space-y-6">
              <div className="space-y-4">
                <SectionTitle>Visual Effects</SectionTitle>
                <SettingRow label="Profile Effect" desc="Color grading and film effects over your entire profile">
                  <Select value={getS("profileEffect", "none")} onValueChange={v => updS("profileEffect", v)}>
                    <SelectTrigger className="w-40 bg-black/60 border-white/10 text-xs h-8"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-[#0e0e0e] border-white/10">
                      <SelectItem value="none" className="text-xs">None</SelectItem>
                      <SelectItem value="retro" className="text-xs">Retro</SelectItem>
                      <SelectItem value="oldtv" className="text-xs">Old TV</SelectItem>
                      <SelectItem value="oldtv2" className="text-xs">Old TV 2</SelectItem>
                      <SelectItem value="night" className="text-xs">Night</SelectItem>
                      <SelectItem value="vhs" className="text-xs">VHS</SelectItem>
                      <SelectItem value="glitch" className="text-xs">Glitch</SelectItem>
                      <SelectItem value="shine" className="text-xs">Shine</SelectItem>
                      <SelectItem value="liquid" className="text-xs">Liquid</SelectItem>
                    </SelectContent>
                  </Select>
                </SettingRow>
                <SettingRow label="Background Particles" desc="Animated particles over the background">
                  <Select value={getS("bgParticles", "none")} onValueChange={v => updS("bgParticles", v)}>
                    <SelectTrigger className="w-36 bg-black/60 border-white/10 text-xs h-8"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-[#0e0e0e] border-white/10">
                      <SelectItem value="none" className="text-xs">None</SelectItem>
                      <SelectItem value="particles" className="text-xs">Particles</SelectItem>
                      <SelectItem value="snow" className="text-xs">Snow</SelectItem>
                      <SelectItem value="rain" className="text-xs">Rain</SelectItem>
                      <SelectItem value="fireflies" className="text-xs">Fireflies</SelectItem>
                      <SelectItem value="coins" className="text-xs">Coins</SelectItem>
                      <SelectItem value="cash" className="text-xs">Cash</SelectItem>
                    </SelectContent>
                  </Select>
                </SettingRow>
                <SettingRow label="Page Overlay" desc="Decorative overlay over the background">
                  <Select value={getS("pageOverlay", "none")} onValueChange={v => updS("pageOverlay", v)}>
                    <SelectTrigger className="w-28 bg-black/60 border-white/10 text-xs h-8"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-[#0e0e0e] border-white/10">
                      {["none","dark","dots","scanlines","vignette"].map(v => <SelectItem key={v} value={v} className="text-xs">{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </SettingRow>
              </div>

              {/* Profile Theme */}
              <div className="space-y-3">
                <SectionTitle>Profile Theme</SectionTitle>
                <p className="text-[11px] text-gray-500 -mt-1">Change the visual material of your profile box. Glass is free — others require Premium.</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "none", label: "None", desc: "Default style", premium: false, preview: { background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.08)" } },
                    { id: "glass", label: "Glass", desc: "Frosted glass", premium: false, preview: { background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.25)", backdropFilter: "blur(8px)" } },
                    { id: "dark", label: "Dark", desc: "Pure dark background", premium: false, preview: { background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.12)" } },
                    { id: "white", label: "White", desc: "Clean white background", premium: false, preview: { background: "#ffffff", border: "1px solid rgba(0,0,0,0.12)" } },
                    { id: "metallic", label: "Metallic", desc: "Brushed metal", premium: true, preview: { background: "linear-gradient(135deg, #4a4a4a 0%, #8a8a8a 40%, #5a5a5a 60%, #9a9a9a 100%)", border: "1px solid rgba(255,255,255,0.2)" } },
                    { id: "chrome", label: "Chrome", desc: "Shiny chrome", premium: true, preview: { background: "linear-gradient(135deg, #c0c0c0 0%, #e8e8e8 25%, #909090 50%, #d8d8d8 75%, #a0a0a0 100%)", border: "1px solid rgba(255,255,255,0.3)" } },
                    { id: "cardboard", label: "Cardboard", desc: "Matte cardboard", premium: true, preview: { background: "linear-gradient(135deg, #b5935a 0%, #c9a96e 40%, #a07840 60%, #c2a060 100%)", border: "1px solid rgba(139,90,43,0.4)" } },
                  ].map(theme => {
                    const locked = theme.premium && !(user as any)?.isPremium;
                    const active = getS("profileTheme", "none") === theme.id;
                    return (
                      <button
                        key={theme.id}
                        onClick={() => { if (!locked) updS("profileTheme", theme.id); }}
                        className={`relative flex flex-col items-start gap-2 p-3 rounded-xl border transition-all text-left ${
                          active ? "border-orange-500/60 bg-orange-500/10"
                          : locked ? "border-white/5 bg-white/[0.02] opacity-60 cursor-not-allowed"
                          : "border-white/[0.08] bg-[#0e0e0e] hover:border-white/20"
                        }`}
                      >
                        {theme.premium && (
                          <div className="absolute top-2 right-2 flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-yellow-500/10 border border-yellow-500/20">
                            <Crown className="w-2.5 h-2.5 text-yellow-400" />
                            <span className="text-[8px] font-black text-yellow-400 uppercase tracking-wider">2.49€</span>
                          </div>
                        )}
                        <div className="w-full h-7 rounded-lg" style={theme.preview} />
                        <div>
                          <p className="text-xs font-black text-white">{theme.label}</p>
                          <p className="text-[10px] text-gray-500">{theme.desc}</p>
                        </div>
                        {active && <div className="absolute bottom-2 right-2 w-2 h-2 rounded-full bg-orange-500" />}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => updS("matchMaterialToTheme", !getS("matchMaterialToTheme", false))}
                  className={`w-full flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl border transition-all text-left ${
                    getS("matchMaterialToTheme", false)
                      ? "border-orange-500/50 bg-orange-500/10 text-orange-400"
                      : "border-white/10 bg-white/[0.02] text-gray-400 hover:border-white/20 hover:text-white"
                  }`}
                >
                  <div>
                    <p className="text-xs font-black">Match Material to Theme Colour</p>
                    <p className="text-[10px] opacity-70 mt-0.5">Tint the selected material with your accent colour</p>
                  </div>
                  <div className={`w-3 h-3 rounded-full border-2 shrink-0 ${getS("matchMaterialToTheme", false) ? "bg-orange-500 border-orange-500" : "border-gray-600"}`} />
                </button>
                {!(user as any)?.isPremium && (
                  <p className="text-[10px] text-gray-600">
                    Unlock Metallic, Chrome & Cardboard with <a href="/shop" className="text-orange-500 hover:underline font-bold">Premium — 2.49€</a>
                  </p>
                )}
              </div>
            </div>
          )}

          {/* PAGE */}
          {miscSection === "page" && (
            <div className="space-y-4">
              <SectionTitle>Page Settings</SectionTitle>
              <FaviconUploadField value={getS("faviconUrl", "")} onChange={v => updS("faviconUrl", v)} />
              <div className="space-y-1.5">
                <Label className="text-[11px] font-black uppercase text-gray-500">Page Title</Label>
                <Input value={getS("pageTitle", "")} onChange={e => updS("pageTitle", e.target.value)} placeholder="Custom browser tab title..." className="bg-black/60 border-white/5 h-9 text-sm" />
              </div>
              <SettingRow label="Title Animation" desc="How the page title animates in the browser tab">
                <Select value={getS("pageTitleAnim", "none")} onValueChange={v => updS("pageTitleAnim", v)}>
                  <SelectTrigger className="w-28 bg-black/60 border-white/10 text-xs h-8"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[#0e0e0e] border-white/10">
                    <SelectItem value="none" className="text-xs">None</SelectItem>
                    <SelectItem value="scroll" className="text-xs">Scroll</SelectItem>
                    <SelectItem value="blink" className="text-xs">Blink</SelectItem>
                  </SelectContent>
                </Select>
              </SettingRow>
              {getS("pageTitleAnim", "none") !== "none" && (
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-black uppercase text-gray-500">Animation Speed</Label>
                  <NumSlider value={getS("pageTitleAnimSpeed", 3)} onChange={v => updS("pageTitleAnimSpeed", v)} min={1} max={10} />
                </div>
              )}
              <SettingRow label="Enter Animation">
                <Select value={getS("pageEnterAnim", "fade")} onValueChange={v => updS("pageEnterAnim", v)}>
                  <SelectTrigger className="w-28 bg-black/60 border-white/10 text-xs h-8"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[#0e0e0e] border-white/10">
                    {["fade","slide-up","scale","blur"].map(v => <SelectItem key={v} value={v} className="text-xs">{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </SettingRow>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-black uppercase text-gray-500">Enter Animation Speed</Label>
                <NumSlider value={getS("pageEnterSpeed", 0.4)} onChange={v => updS("pageEnterSpeed", v)} min={0.1} max={2} step={0.1} unit="s" />
              </div>
            </div>
          )}

          {/* COLORS */}
          {miscSection === "colors" && (
            <div className="space-y-4">
              <SectionTitle>Colors</SectionTitle>
              {/* Sub-tabs */}
              <div className="flex gap-2">
                {(["solid", "gradients"] as const).map(tab => (
                  <button key={tab} onClick={() => setColorsTab(tab)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all border ${colorsTab === tab ? "bg-orange-500 border-orange-500 text-black" : "border-white/10 text-gray-500 hover:text-white bg-transparent"}`}>
                    {tab}{tab === "gradients" && " ✦"}
                  </button>
                ))}
              </div>

              {colorsTab === "solid" && (
                <div className="space-y-4">
                  <SettingRow label="Theme / Accent Color">
                    <ColorPicker value={localProfile?.themeColor || "#F97316"} onChange={v => upd("themeColor", v)} label="Theme" />
                  </SettingRow>
                  <SettingRow label="Primary Text Color">
                    <ColorPicker value={getS("primaryTextColor", "#ffffff")} onChange={v => updS("primaryTextColor", v)} label="Primary" />
                  </SettingRow>
                  <SettingRow label="Secondary Text Color">
                    <ColorPicker value={getS("secondaryTextColor", "#9ca3af")} onChange={v => updS("secondaryTextColor", v)} label="Secondary" />
                  </SettingRow>
                  <SettingRow label="Box Border Color">
                    <ColorPicker value={getS("boxBorderColor", "#ffffff")} onChange={v => updS("boxBorderColor", v)} label="Border" />
                  </SettingRow>
                </div>
              )}

              {colorsTab === "gradients" && (
                <div className="space-y-5">
                  {!(user as any)?.isPremium ? (
                    <div className="flex items-center gap-3 p-4 rounded-2xl border border-purple-500/40 bg-gradient-to-r from-purple-900/30 to-purple-800/20">
                      <span className="text-2xl">✦</span>
                      <div>
                        <p className="text-sm font-black text-purple-300">Premium Only</p>
                        <p className="text-[11px] text-gray-500">Gradients let you blend two colours for each element. Upgrade to unlock.</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Theme / Accent Gradient */}
                      <div className="space-y-3 p-3 rounded-xl border border-white/8 bg-white/3">
                        <div className="flex items-center justify-between">
                          <Label className="text-[11px] font-black uppercase text-gray-400">Theme / Accent Color</Label>
                          <Switch checked={getS("themeGradientEnabled", false)} onCheckedChange={v => updS("themeGradientEnabled", v)} />
                        </div>
                        {getS("themeGradientEnabled", false) && (
                          <div className="space-y-3">
                            <div className="flex gap-3">
                              <div className="flex-1 space-y-1">
                                <Label className="text-[10px] text-gray-500 font-bold">From</Label>
                                <ColorPicker value={getS("themeGradientFrom", localProfile?.themeColor || "#F97316")} onChange={v => updS("themeGradientFrom", v)} label="From" />
                              </div>
                              <div className="flex-1 space-y-1">
                                <Label className="text-[10px] text-gray-500 font-bold">To</Label>
                                <ColorPicker value={getS("themeGradientTo", "#FF6B6B")} onChange={v => updS("themeGradientTo", v)} label="To" />
                              </div>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[10px] text-gray-500 font-bold">Angle: {getS("themeGradientAngle", 135)}°</Label>
                              <NumSlider value={getS("themeGradientAngle", 135)} onChange={v => updS("themeGradientAngle", v)} min={0} max={360} unit="°" />
                            </div>
                            <div className="h-5 rounded-lg" style={{ background: `linear-gradient(${getS("themeGradientAngle", 135)}deg, ${getS("themeGradientFrom", localProfile?.themeColor || "#F97316")}, ${getS("themeGradientTo", "#FF6B6B")})` }} />
                          </div>
                        )}
                      </div>

                      {/* Primary Text Gradient */}
                      <div className="space-y-3 p-3 rounded-xl border border-white/8 bg-white/3">
                        <div className="flex items-center justify-between">
                          <Label className="text-[11px] font-black uppercase text-gray-400">Primary Text Color</Label>
                          <Switch checked={getS("primaryTextGradientEnabled", false)} onCheckedChange={v => updS("primaryTextGradientEnabled", v)} />
                        </div>
                        {getS("primaryTextGradientEnabled", false) && (
                          <div className="space-y-3">
                            <div className="flex gap-3">
                              <div className="flex-1 space-y-1">
                                <Label className="text-[10px] text-gray-500 font-bold">From</Label>
                                <ColorPicker value={getS("primaryTextGradientFrom", "#ffffff")} onChange={v => updS("primaryTextGradientFrom", v)} label="From" />
                              </div>
                              <div className="flex-1 space-y-1">
                                <Label className="text-[10px] text-gray-500 font-bold">To</Label>
                                <ColorPicker value={getS("primaryTextGradientTo", "#aaaaaa")} onChange={v => updS("primaryTextGradientTo", v)} label="To" />
                              </div>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[10px] text-gray-500 font-bold">Angle: {getS("primaryTextGradientAngle", 135)}°</Label>
                              <NumSlider value={getS("primaryTextGradientAngle", 135)} onChange={v => updS("primaryTextGradientAngle", v)} min={0} max={360} unit="°" />
                            </div>
                            <div className="h-5 rounded-lg" style={{ background: `linear-gradient(${getS("primaryTextGradientAngle", 135)}deg, ${getS("primaryTextGradientFrom", "#ffffff")}, ${getS("primaryTextGradientTo", "#aaaaaa")})` }} />
                          </div>
                        )}
                      </div>

                      {/* Secondary Text Gradient */}
                      <div className="space-y-3 p-3 rounded-xl border border-white/8 bg-white/3">
                        <div className="flex items-center justify-between">
                          <Label className="text-[11px] font-black uppercase text-gray-400">Secondary Text Color</Label>
                          <Switch checked={getS("secondaryTextGradientEnabled", false)} onCheckedChange={v => updS("secondaryTextGradientEnabled", v)} />
                        </div>
                        {getS("secondaryTextGradientEnabled", false) && (
                          <div className="space-y-3">
                            <div className="flex gap-3">
                              <div className="flex-1 space-y-1">
                                <Label className="text-[10px] text-gray-500 font-bold">From</Label>
                                <ColorPicker value={getS("secondaryTextGradientFrom", "#9ca3af")} onChange={v => updS("secondaryTextGradientFrom", v)} label="From" />
                              </div>
                              <div className="flex-1 space-y-1">
                                <Label className="text-[10px] text-gray-500 font-bold">To</Label>
                                <ColorPicker value={getS("secondaryTextGradientTo", "#6b7280")} onChange={v => updS("secondaryTextGradientTo", v)} label="To" />
                              </div>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[10px] text-gray-500 font-bold">Angle: {getS("secondaryTextGradientAngle", 135)}°</Label>
                              <NumSlider value={getS("secondaryTextGradientAngle", 135)} onChange={v => updS("secondaryTextGradientAngle", v)} min={0} max={360} unit="°" />
                            </div>
                            <div className="h-5 rounded-lg" style={{ background: `linear-gradient(${getS("secondaryTextGradientAngle", 135)}deg, ${getS("secondaryTextGradientFrom", "#9ca3af")}, ${getS("secondaryTextGradientTo", "#6b7280")})` }} />
                          </div>
                        )}
                      </div>

                      {/* Box Border Gradient */}
                      <div className="space-y-3 p-3 rounded-xl border border-white/8 bg-white/3">
                        <div className="flex items-center justify-between">
                          <Label className="text-[11px] font-black uppercase text-gray-400">Box Border Color</Label>
                          <Switch checked={getS("boxBorderGradientEnabled", false)} onCheckedChange={v => updS("boxBorderGradientEnabled", v)} />
                        </div>
                        {getS("boxBorderGradientEnabled", false) && (
                          <div className="space-y-3">
                            <div className="flex gap-3">
                              <div className="flex-1 space-y-1">
                                <Label className="text-[10px] text-gray-500 font-bold">From</Label>
                                <ColorPicker value={getS("boxBorderGradientFrom", "#ffffff")} onChange={v => updS("boxBorderGradientFrom", v)} label="From" />
                              </div>
                              <div className="flex-1 space-y-1">
                                <Label className="text-[10px] text-gray-500 font-bold">To</Label>
                                <ColorPicker value={getS("boxBorderGradientTo", "#888888")} onChange={v => updS("boxBorderGradientTo", v)} label="To" />
                              </div>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[10px] text-gray-500 font-bold">Angle: {getS("boxBorderGradientAngle", 135)}°</Label>
                              <NumSlider value={getS("boxBorderGradientAngle", 135)} onChange={v => updS("boxBorderGradientAngle", v)} min={0} max={360} unit="°" />
                            </div>
                            <div className="h-5 rounded-lg border-2 border-transparent" style={{ background: `linear-gradient(#000,#000) padding-box, linear-gradient(${getS("boxBorderGradientAngle", 135)}deg, ${getS("boxBorderGradientFrom", "#ffffff")}, ${getS("boxBorderGradientTo", "#888888")}) border-box` }} />
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* BANNER */}
          {miscSection === "banner" && (
            <div className="space-y-4">
              <SectionTitle>Banner Settings</SectionTitle>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-black uppercase text-gray-500">Banner Opacity</Label>
                <NumSlider value={getS("bannerOpacity", 1)} onChange={v => updS("bannerOpacity", v)} min={0} max={1} step={0.05} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-black uppercase text-gray-500">Banner Blur</Label>
                <NumSlider value={getS("bannerBlur", 0)} onChange={v => updS("bannerBlur", v)} min={0} max={20} unit="px" />
              </div>
              <SettingRow label="Banner Height" desc="Height of the banner area">
                <Select value={getS("bannerHeight", "160")} onValueChange={v => updS("bannerHeight", v)}>
                  <SelectTrigger className="w-24 bg-black/60 border-white/10 text-xs h-8"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[#0e0e0e] border-white/10">
                    <SelectItem value="100" className="text-xs">Small</SelectItem>
                    <SelectItem value="160" className="text-xs">Medium</SelectItem>
                    <SelectItem value="220" className="text-xs">Large</SelectItem>
                  </SelectContent>
                </Select>
              </SettingRow>
            </div>
          )}

          {/* BACKGROUND */}
          {miscSection === "background" && (
            <div className="space-y-4">
              <SectionTitle>Background</SectionTitle>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-black uppercase text-gray-500">YouTube Background Video URL</Label>
                <p className="text-[10px] text-gray-600">Paste a YouTube URL to use a video as your profile background.</p>
                <Input value={localProfile?.backgroundVideoUrl || ""} onChange={e => upd("backgroundVideoUrl", e.target.value)}
                  placeholder="https://youtube.com/watch?v=..." className="bg-black/60 border-white/5 focus:border-orange-500/50 h-9 text-sm" />
              </div>
              <SettingRow label="Background Size">
                <Select value={getS("bgSize", "cover")} onValueChange={v => updS("bgSize", v)}>
                  <SelectTrigger className="w-28 bg-black/60 border-white/10 text-xs h-8"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[#0e0e0e] border-white/10">
                    <SelectItem value="cover" className="text-xs">Cover</SelectItem>
                    <SelectItem value="contain" className="text-xs">Contain</SelectItem>
                    <SelectItem value="100% 100%" className="text-xs">Stretch</SelectItem>
                  </SelectContent>
                </Select>
              </SettingRow>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-black uppercase text-gray-500">Background Opacity</Label>
                <NumSlider value={getS("bgOpacity", 0.4)} onChange={v => updS("bgOpacity", v)} min={0} max={1} step={0.05} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-black uppercase text-gray-500">Background Blur</Label>
                <NumSlider value={getS("bgBlur", 0)} onChange={v => updS("bgBlur", v)} min={0} max={30} unit="px" />
              </div>
            </div>
          )}

          {/* PROFILE BOX */}
          {miscSection === "box" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                {(["general", "blur", "stroke"] as const).map(tab => (
                  <button key={tab} onClick={() => setBoxTab(tab)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all border ${boxTab === tab ? "bg-orange-500 border-orange-500 text-black" : "border-white/10 text-gray-500 hover:text-white bg-transparent"}`}>
                    {tab}
                  </button>
                ))}
              </div>

              {boxTab === "general" && (
                <div className="space-y-4">
                  <SettingRow label="3D Tilt on Hover" desc="Box tilts when you hover with the mouse">
                    <Switch checked={getS("boxTilt", false)} onCheckedChange={v => updS("boxTilt", v)} />
                  </SettingRow>
                  {getS("boxTilt", false) && <>
                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-black uppercase text-gray-500">Tilt Intensity</Label>
                      <NumSlider value={getS("boxTiltIntensity", 12)} onChange={v => updS("boxTiltIntensity", v)} min={1} max={30} unit="°" />
                    </div>
                    <SettingRow label="Auto Tilt" desc="Tilt animates automatically on a timer">
                      <Switch checked={getS("autoTilt", false)} onCheckedChange={v => updS("autoTilt", v)} />
                    </SettingRow>
                    {getS("autoTilt", false) && (
                      <div className="space-y-1.5">
                        <Label className="text-[11px] font-black uppercase text-gray-500">Auto Tilt Interval</Label>
                        <NumSlider value={getS("autoTiltInterval", 4)} onChange={v => updS("autoTiltInterval", v)} min={1} max={15} unit="s" />
                      </div>
                    )}
                  </>}
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-black uppercase text-gray-500">Box Width</Label>
                    <NumSlider value={getS("boxWidth", 520)} onChange={v => updS("boxWidth", v)} min={320} max={800} unit="px" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-black uppercase text-gray-500">Inner Spacing</Label>
                    <NumSlider value={getS("boxPadding", 28)} onChange={v => updS("boxPadding", v)} min={8} max={60} unit="px" />
                  </div>
                  <SettingRow label="Box Color">
                    <ColorPicker value={getS("boxColor", "#000000")} onChange={v => updS("boxColor", v)} label="Box" />
                  </SettingRow>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-black uppercase text-gray-500">Box Opacity</Label>
                    <NumSlider value={getS("boxOpacity", 0.45)} onChange={v => updS("boxOpacity", v)} min={0} max={1} step={0.05} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-black uppercase text-gray-500">Corner Radius</Label>
                    <NumSlider value={getS("boxRadius", 24)} onChange={v => updS("boxRadius", v)} min={0} max={60} unit="px" />
                  </div>
                </div>
              )}

              {boxTab === "blur" && (
                <div className="space-y-5">
                  <div className="relative">
                    <SettingRow label="Blur Spotlight" desc="Enable the blur spotlight overlay inside the box">
                      <Switch checked={getS("boxBlurEnabled", false)} onCheckedChange={v => { if (user?.isPremium) updS("boxBlurEnabled", v); }} disabled={!user?.isPremium} />
                    </SettingRow>
                    {!user?.isPremium && (
                      <div className="absolute inset-0 rounded-xl bg-black/60 flex items-center justify-end pr-4 gap-2 pointer-events-none">
                        <span className="px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-400 border border-purple-500/30 text-[10px] font-black uppercase tracking-widest">Premium</span>
                      </div>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-black uppercase text-gray-500">Backdrop Blur</Label>
                    <NumSlider value={getS("boxBlurAmount", 20)} onChange={v => updS("boxBlurAmount", v)} min={0} max={60} unit="px" />
                    <p className="text-[10px] text-gray-600">Blurs the background behind the box (best with transparent backgrounds).</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-black uppercase text-gray-500">Blur Spotlight Opacity</Label>
                    <NumSlider value={getS("boxBlurOpacity", 0.4)} onChange={v => updS("boxBlurOpacity", v)} min={0} max={1} step={0.05} />
                  </div>
                  <div className="space-y-3">
                    <Label className="text-[11px] font-black uppercase text-gray-500">Blur Spotlight Position</Label>
                    <p className="text-[10px] text-gray-600 -mt-1">Click or drag in the area below to set where the blur spotlight effect is centered.</p>
                    <div
                      className="relative w-full rounded-xl border border-white/10 bg-black/40 cursor-crosshair overflow-hidden"
                      style={{ height: 120 }}
                      onMouseDown={e => {
                        const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                        const setPos = (ev: MouseEvent) => {
                          const x = Math.round(Math.max(0, Math.min(100, ((ev.clientX - rect.left) / rect.width) * 100)));
                          const y = Math.round(Math.max(0, Math.min(100, ((ev.clientY - rect.top) / rect.height) * 100)));
                          updS("boxBlurX", x);
                          updS("boxBlurY", y);
                        };
                        setPos(e.nativeEvent as MouseEvent);
                        const onMove = (ev: MouseEvent) => setPos(ev);
                        const onUp = () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
                        window.addEventListener("mousemove", onMove);
                        window.addEventListener("mouseup", onUp);
                      }}
                    >
                      <div className="absolute inset-0 opacity-20" style={{ background: "radial-gradient(circle at center, white 0%, transparent 70%)" }} />
                      <div
                        className="absolute w-4 h-4 rounded-full bg-orange-500 border-2 border-white shadow-lg -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                        style={{ left: `${getS("boxBlurX", 50)}%`, top: `${getS("boxBlurY", 50)}%` }}
                      />
                    </div>
                    <div className="flex gap-3">
                      <div className="flex-1 space-y-1">
                        <Label className="text-[10px] font-black uppercase text-gray-600">X: {getS("boxBlurX", 50)}%</Label>
                        <NumSlider value={getS("boxBlurX", 50)} onChange={v => updS("boxBlurX", v)} min={0} max={100} unit="%" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <Label className="text-[10px] font-black uppercase text-gray-600">Y: {getS("boxBlurY", 50)}%</Label>
                        <NumSlider value={getS("boxBlurY", 50)} onChange={v => updS("boxBlurY", v)} min={0} max={100} unit="%" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {boxTab === "stroke" && (
                <div className="space-y-4">
                  <SettingRow label="Enable Stroke" desc="Show a border stroke inside your profile box">
                    <Switch checked={!!getS("strokeEnabled", false)} onCheckedChange={v => updS("strokeEnabled", v)} />
                  </SettingRow>
                  {getS("strokeEnabled", false) && (
                    <div className="space-y-4 pt-1">
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase text-gray-500">Colour</Label>
                        <ColorPicker value={getS("strokeColor", "#ffffff")} onChange={v => updS("strokeColor", v)} label="Colour" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase text-gray-500">Opacity — {Math.round(getS("strokeOpacity", 1) * 100)}%</Label>
                        <NumSlider value={getS("strokeOpacity", 1)} onChange={v => updS("strokeOpacity", v)} min={0} max={1} step={0.01} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase text-gray-500">Thickness — {getS("strokeWidth", 1)}px</Label>
                        <NumSlider value={getS("strokeWidth", 1)} onChange={v => updS("strokeWidth", v)} min={1} max={8} step={1} unit="px" />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* USERNAME */}
          {miscSection === "username" && (
            <div className="space-y-4">
              <SectionTitle>Username Style</SectionTitle>
              <SettingRow label="Sparkle Effect" desc="Animated sparkles around the username">
                <Switch checked={getS("usernameSparkles", false)} onCheckedChange={v => updS("usernameSparkles", v)} />
              </SettingRow>
              {getS("usernameSparkles", false) && (
                <SettingRow label="Sparkle Color">
                  <Select value={getS("sparkleColor", "theme")} onValueChange={v => updS("sparkleColor", v)}>
                    <SelectTrigger className="w-36 bg-black/60 border-white/10 text-xs h-8"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-[#0e0e0e] border-white/10">
                      <SelectItem value="theme" className="text-xs">Theme Color</SelectItem>
                      <SelectItem value="rainbow" className="text-xs">Rainbow</SelectItem>
                      <SelectItem value="red" className="text-xs">Red</SelectItem>
                      <SelectItem value="blue" className="text-xs">Blue</SelectItem>
                      <SelectItem value="green" className="text-xs">Green</SelectItem>
                      <SelectItem value="purple" className="text-xs">Purple</SelectItem>
                      <SelectItem value="white" className="text-xs">White</SelectItem>
                      <SelectItem value="gold" className="text-xs">Gold</SelectItem>
                      <SelectItem value="glitch" className="text-xs">Glitch</SelectItem>
                    </SelectContent>
                  </Select>
                </SettingRow>
              )}
              {(user as any)?.isPremium ? (
                <SettingRow label="Typewriter" desc="Animate the username typing in and out">
                  <Switch checked={getS("usernameTypewriter", false)} onCheckedChange={v => updS("usernameTypewriter", v)} />
                </SettingRow>
              ) : (
                <SettingRow label="Typewriter" desc="Animate the username typing in and out">
                  <a
                    href="/shop/premium"
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-400 text-[11px] font-black hover:bg-purple-500/20 transition-colors"
                  >
                    💎 Premium
                  </a>
                </SettingRow>
              )}
              <SettingRow label="Font">
                <Select value={getS("usernameFont", "inherit")} onValueChange={v => updS("usernameFont", v)}>
                  <SelectTrigger className="w-44 bg-black/60 border-white/10 text-xs h-8"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[#0e0e0e] border-white/10 max-h-72">
                    <SelectItem value="inherit" className="text-xs">Default</SelectItem>
                    <SelectItem value="'Poppins'" className="text-xs" style={{ fontFamily: "Poppins" }}>Poppins</SelectItem>
                    <SelectItem value="'Montserrat'" className="text-xs" style={{ fontFamily: "Montserrat" }}>Montserrat</SelectItem>
                    <SelectItem value="'Raleway'" className="text-xs" style={{ fontFamily: "Raleway" }}>Raleway</SelectItem>
                    <SelectItem value="'Outfit'" className="text-xs" style={{ fontFamily: "Outfit" }}>Outfit</SelectItem>
                    <SelectItem value="'Sora'" className="text-xs" style={{ fontFamily: "Sora" }}>Sora</SelectItem>
                    <SelectItem value="'Nunito'" className="text-xs" style={{ fontFamily: "Nunito" }}>Nunito</SelectItem>
                    <SelectItem value="'Josefin Sans'" className="text-xs" style={{ fontFamily: "Josefin Sans" }}>Josefin Sans</SelectItem>
                    <SelectItem value="'Comfortaa'" className="text-xs" style={{ fontFamily: "Comfortaa" }}>Comfortaa</SelectItem>
                    <SelectItem value="'Prompt'" className="text-xs" style={{ fontFamily: "Prompt" }}>Prompt</SelectItem>
                    <SelectItem value="'Space Grotesk'" className="text-xs" style={{ fontFamily: "Space Grotesk" }}>Space Grotesk</SelectItem>
                    <SelectItem value="'Plus Jakarta Sans'" className="text-xs" style={{ fontFamily: "Plus Jakarta Sans" }}>Plus Jakarta Sans</SelectItem>
                    <SelectItem value="'DM Sans'" className="text-xs" style={{ fontFamily: "DM Sans" }}>DM Sans</SelectItem>
                    <SelectItem value="'Unbounded'" className="text-xs" style={{ fontFamily: "Unbounded" }}>Unbounded</SelectItem>
                    <SelectItem value="'Oxanium'" className="text-xs" style={{ fontFamily: "Oxanium" }}>Oxanium</SelectItem>
                    <SelectItem value="'Orbitron'" className="text-xs" style={{ fontFamily: "Orbitron" }}>Orbitron</SelectItem>
                    <SelectItem value="'Chakra Petch'" className="text-xs" style={{ fontFamily: "Chakra Petch" }}>Chakra Petch</SelectItem>
                    <SelectItem value="'Exo 2'" className="text-xs" style={{ fontFamily: "Exo 2" }}>Exo 2</SelectItem>
                    <SelectItem value="'Bebas Neue'" className="text-xs" style={{ fontFamily: "Bebas Neue" }}>Bebas Neue</SelectItem>
                    <SelectItem value="'Bangers'" className="text-xs" style={{ fontFamily: "Bangers" }}>Bangers</SelectItem>
                    <SelectItem value="'Anton'" className="text-xs" style={{ fontFamily: "Anton" }}>Anton</SelectItem>
                    <SelectItem value="'Lilita One'" className="text-xs" style={{ fontFamily: "Lilita One" }}>Lilita One</SelectItem>
                    <SelectItem value="'Righteous'" className="text-xs" style={{ fontFamily: "Righteous" }}>Righteous</SelectItem>
                    <SelectItem value="'Press Start 2P'" className="text-[10px]" style={{ fontFamily: "Press Start 2P" }}>Press Start 2P</SelectItem>
                    <SelectItem value="'Pacifico'" className="text-xs" style={{ fontFamily: "Pacifico" }}>Pacifico</SelectItem>
                    <SelectItem value="'Caveat'" className="text-xs" style={{ fontFamily: "Caveat" }}>Caveat</SelectItem>
                    <SelectItem value="'Dancing Script'" className="text-xs" style={{ fontFamily: "Dancing Script" }}>Dancing Script</SelectItem>
                    <SelectItem value="'Kaushan Script'" className="text-xs" style={{ fontFamily: "Kaushan Script" }}>Kaushan Script</SelectItem>
                    <SelectItem value="'Permanent Marker'" className="text-xs" style={{ fontFamily: "Permanent Marker" }}>Permanent Marker</SelectItem>
                    <SelectItem value="'Architects Daughter'" className="text-xs" style={{ fontFamily: "Architects Daughter" }}>Architects Daughter</SelectItem>
                    <SelectItem value="serif" className="text-xs" style={{ fontFamily: "serif" }}>Serif</SelectItem>
                    <SelectItem value="'Cinzel'" className="text-xs" style={{ fontFamily: "Cinzel" }}>Cinzel</SelectItem>
                    <SelectItem value="'Playfair Display'" className="text-xs" style={{ fontFamily: "Playfair Display" }}>Playfair Display</SelectItem>
                    <SelectItem value="'Lora'" className="text-xs" style={{ fontFamily: "Lora" }}>Lora</SelectItem>
                    <SelectItem value="'Merriweather'" className="text-xs" style={{ fontFamily: "Merriweather" }}>Merriweather</SelectItem>
                    <SelectItem value="'Libre Baskerville'" className="text-xs" style={{ fontFamily: "Libre Baskerville" }}>Libre Baskerville</SelectItem>
                    <SelectItem value="'IBM Plex Sans'" className="text-xs" style={{ fontFamily: "IBM Plex Sans" }}>IBM Plex Sans</SelectItem>
                    <SelectItem value="'Roboto'" className="text-xs" style={{ fontFamily: "Roboto" }}>Roboto</SelectItem>
                    <SelectItem value="'Open Sans'" className="text-xs" style={{ fontFamily: "Open Sans" }}>Open Sans</SelectItem>
                    <SelectItem value="monospace" className="text-xs font-mono">Monospace</SelectItem>
                    <SelectItem value="'JetBrains Mono'" className="text-xs" style={{ fontFamily: "JetBrains Mono" }}>JetBrains Mono</SelectItem>
                    <SelectItem value="'Fira Code'" className="text-xs" style={{ fontFamily: "Fira Code" }}>Fira Code</SelectItem>
                    <SelectItem value="'Source Code Pro'" className="text-xs" style={{ fontFamily: "Source Code Pro" }}>Source Code Pro</SelectItem>
                    <SelectItem value="'Space Mono'" className="text-xs" style={{ fontFamily: "Space Mono" }}>Space Mono</SelectItem>
                    <SelectItem value="'Geist Mono'" className="text-xs" style={{ fontFamily: "Geist Mono" }}>Geist Mono</SelectItem>
                    <SelectItem value="Impact" className="text-xs" style={{ fontFamily: "Impact" }}>Impact</SelectItem>
                    <SelectItem value="Georgia" className="text-xs" style={{ fontFamily: "Georgia" }}>Georgia</SelectItem>
                    <SelectItem value="'Times New Roman'" className="text-xs" style={{ fontFamily: "Times New Roman" }}>Times New Roman</SelectItem>
                    <SelectItem value="'Courier New'" className="text-xs" style={{ fontFamily: "Courier New" }}>Courier New</SelectItem>
                  </SelectContent>
                </Select>
              </SettingRow>
              <SettingRow label="Profile Font" desc="Font applied to all text on your profile">
                <Select value={getS("profileFont", "inherit")} onValueChange={v => updS("profileFont", v)}>
                  <SelectTrigger className="w-44 bg-black/60 border-white/10 text-xs h-8"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[#0e0e0e] border-white/10 max-h-72">
                    <SelectItem value="inherit" className="text-xs">Default</SelectItem>
                    <SelectItem value="'Poppins'" className="text-xs" style={{ fontFamily: "Poppins" }}>Poppins</SelectItem>
                    <SelectItem value="'Montserrat'" className="text-xs" style={{ fontFamily: "Montserrat" }}>Montserrat</SelectItem>
                    <SelectItem value="'Raleway'" className="text-xs" style={{ fontFamily: "Raleway" }}>Raleway</SelectItem>
                    <SelectItem value="'Outfit'" className="text-xs" style={{ fontFamily: "Outfit" }}>Outfit</SelectItem>
                    <SelectItem value="'Sora'" className="text-xs" style={{ fontFamily: "Sora" }}>Sora</SelectItem>
                    <SelectItem value="'Nunito'" className="text-xs" style={{ fontFamily: "Nunito" }}>Nunito</SelectItem>
                    <SelectItem value="'Josefin Sans'" className="text-xs" style={{ fontFamily: "Josefin Sans" }}>Josefin Sans</SelectItem>
                    <SelectItem value="'Comfortaa'" className="text-xs" style={{ fontFamily: "Comfortaa" }}>Comfortaa</SelectItem>
                    <SelectItem value="'Prompt'" className="text-xs" style={{ fontFamily: "Prompt" }}>Prompt</SelectItem>
                    <SelectItem value="'Space Grotesk'" className="text-xs" style={{ fontFamily: "Space Grotesk" }}>Space Grotesk</SelectItem>
                    <SelectItem value="'Plus Jakarta Sans'" className="text-xs" style={{ fontFamily: "Plus Jakarta Sans" }}>Plus Jakarta Sans</SelectItem>
                    <SelectItem value="'DM Sans'" className="text-xs" style={{ fontFamily: "DM Sans" }}>DM Sans</SelectItem>
                    <SelectItem value="'Unbounded'" className="text-xs" style={{ fontFamily: "Unbounded" }}>Unbounded</SelectItem>
                    <SelectItem value="'Oxanium'" className="text-xs" style={{ fontFamily: "Oxanium" }}>Oxanium</SelectItem>
                    <SelectItem value="'Orbitron'" className="text-xs" style={{ fontFamily: "Orbitron" }}>Orbitron</SelectItem>
                    <SelectItem value="'Chakra Petch'" className="text-xs" style={{ fontFamily: "Chakra Petch" }}>Chakra Petch</SelectItem>
                    <SelectItem value="'Exo 2'" className="text-xs" style={{ fontFamily: "Exo 2" }}>Exo 2</SelectItem>
                    <SelectItem value="'Bebas Neue'" className="text-xs" style={{ fontFamily: "Bebas Neue" }}>Bebas Neue</SelectItem>
                    <SelectItem value="'Bangers'" className="text-xs" style={{ fontFamily: "Bangers" }}>Bangers</SelectItem>
                    <SelectItem value="'Anton'" className="text-xs" style={{ fontFamily: "Anton" }}>Anton</SelectItem>
                    <SelectItem value="'Lilita One'" className="text-xs" style={{ fontFamily: "Lilita One" }}>Lilita One</SelectItem>
                    <SelectItem value="'Righteous'" className="text-xs" style={{ fontFamily: "Righteous" }}>Righteous</SelectItem>
                    <SelectItem value="'Press Start 2P'" className="text-[10px]" style={{ fontFamily: "Press Start 2P" }}>Press Start 2P</SelectItem>
                    <SelectItem value="'Pacifico'" className="text-xs" style={{ fontFamily: "Pacifico" }}>Pacifico</SelectItem>
                    <SelectItem value="'Caveat'" className="text-xs" style={{ fontFamily: "Caveat" }}>Caveat</SelectItem>
                    <SelectItem value="'Dancing Script'" className="text-xs" style={{ fontFamily: "Dancing Script" }}>Dancing Script</SelectItem>
                    <SelectItem value="'Kaushan Script'" className="text-xs" style={{ fontFamily: "Kaushan Script" }}>Kaushan Script</SelectItem>
                    <SelectItem value="'Permanent Marker'" className="text-xs" style={{ fontFamily: "Permanent Marker" }}>Permanent Marker</SelectItem>
                    <SelectItem value="'Architects Daughter'" className="text-xs" style={{ fontFamily: "Architects Daughter" }}>Architects Daughter</SelectItem>
                    <SelectItem value="serif" className="text-xs" style={{ fontFamily: "serif" }}>Serif</SelectItem>
                    <SelectItem value="'Cinzel'" className="text-xs" style={{ fontFamily: "Cinzel" }}>Cinzel</SelectItem>
                    <SelectItem value="'Playfair Display'" className="text-xs" style={{ fontFamily: "Playfair Display" }}>Playfair Display</SelectItem>
                    <SelectItem value="'Lora'" className="text-xs" style={{ fontFamily: "Lora" }}>Lora</SelectItem>
                    <SelectItem value="'Merriweather'" className="text-xs" style={{ fontFamily: "Merriweather" }}>Merriweather</SelectItem>
                    <SelectItem value="'Libre Baskerville'" className="text-xs" style={{ fontFamily: "Libre Baskerville" }}>Libre Baskerville</SelectItem>
                    <SelectItem value="'IBM Plex Sans'" className="text-xs" style={{ fontFamily: "IBM Plex Sans" }}>IBM Plex Sans</SelectItem>
                    <SelectItem value="'Roboto'" className="text-xs" style={{ fontFamily: "Roboto" }}>Roboto</SelectItem>
                    <SelectItem value="'Open Sans'" className="text-xs" style={{ fontFamily: "Open Sans" }}>Open Sans</SelectItem>
                    <SelectItem value="monospace" className="text-xs font-mono">Monospace</SelectItem>
                    <SelectItem value="'JetBrains Mono'" className="text-xs" style={{ fontFamily: "JetBrains Mono" }}>JetBrains Mono</SelectItem>
                    <SelectItem value="'Fira Code'" className="text-xs" style={{ fontFamily: "Fira Code" }}>Fira Code</SelectItem>
                    <SelectItem value="'Source Code Pro'" className="text-xs" style={{ fontFamily: "Source Code Pro" }}>Source Code Pro</SelectItem>
                    <SelectItem value="'Space Mono'" className="text-xs" style={{ fontFamily: "Space Mono" }}>Space Mono</SelectItem>
                    <SelectItem value="'Geist Mono'" className="text-xs" style={{ fontFamily: "Geist Mono" }}>Geist Mono</SelectItem>
                    <SelectItem value="Impact" className="text-xs" style={{ fontFamily: "Impact" }}>Impact</SelectItem>
                    <SelectItem value="Georgia" className="text-xs" style={{ fontFamily: "Georgia" }}>Georgia</SelectItem>
                    <SelectItem value="'Times New Roman'" className="text-xs" style={{ fontFamily: "Times New Roman" }}>Times New Roman</SelectItem>
                    <SelectItem value="'Courier New'" className="text-xs" style={{ fontFamily: "Courier New" }}>Courier New</SelectItem>
                  </SelectContent>
                </Select>
              </SettingRow>
            </div>
          )}

          {/* AVATAR */}
          {miscSection === "avatar" && (
            <div className="space-y-4">
              <SectionTitle>Avatar</SectionTitle>
              <SettingRow label="Decoration" desc="Visual effect around the avatar">
                <Select value={getS("avatarDecoration", "none")} onValueChange={v => updS("avatarDecoration", v)}>
                  <SelectTrigger className="w-44 bg-black/60 border-white/10 text-xs h-8"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[#0e0e0e] border-white/10 max-h-72 w-44">
                    <SelectItem value="none" className="text-xs">None</SelectItem>
                    <SelectItem value="ring-pulse" className="text-xs">Ring Pulse</SelectItem>
                    <SelectItem value="ring-spin" className="text-xs">Ring Spin</SelectItem>
                    <SelectItem value="double-ring" className="text-xs">Double Ring</SelectItem>
                    <SelectItem value="rainbow-spin" className="text-xs">Rainbow Spin</SelectItem>
                    <SelectItem value="neon" className="text-xs">Neon Glow</SelectItem>
                    <SelectItem value="neon-strong" className="text-xs">Neon Strong</SelectItem>
                    <SelectItem value="aura" className="text-xs">Aura</SelectItem>
                    <SelectItem value="fire" className="text-xs">Fire</SelectItem>
                    <SelectItem value="ice" className="text-xs">Ice</SelectItem>
                    <SelectItem value="gold" className="text-xs">Gold</SelectItem>
                    <SelectItem value="discord-flame" className="text-xs">Discord Flame</SelectItem>
                    <SelectItem value="discord-stars" className="text-xs">Discord Stars</SelectItem>
                    <SelectItem value="discord-hearts" className="text-xs">Discord Hearts</SelectItem>
                    <SelectItem value="discord-bravery" className="text-xs">Discord Bravery</SelectItem>
                    {user?.isPremium && <>
                      <SelectItem value="holographic" className="text-xs text-purple-400">💎 Holographic</SelectItem>
                      <SelectItem value="galaxy" className="text-xs text-purple-400">💎 Galaxy</SelectItem>
                      <SelectItem value="crystal" className="text-xs text-purple-400">💎 Crystal</SelectItem>
                      <SelectItem value="electric" className="text-xs text-purple-400">💎 Electric</SelectItem>
                      <SelectItem value="sakura" className="text-xs text-purple-400">💎 Sakura</SelectItem>
                      <SelectItem value="crown" className="text-xs text-purple-400">💎 Crown</SelectItem>
                      <SelectItem value="aurora" className="text-xs text-purple-400">💎 Aurora</SelectItem>
                      <SelectItem value="vortex" className="text-xs text-purple-400">💎 Vortex</SelectItem>
                      <SelectItem value="plasma" className="text-xs text-purple-400">💎 Plasma</SelectItem>
                      <SelectItem value="nebula" className="text-xs text-purple-400">💎 Nebula</SelectItem>
                      <SelectItem value="celestial" className="text-xs text-purple-400">💎 Celestial</SelectItem>
                      <SelectItem value="lava" className="text-xs text-purple-400">💎 Lava</SelectItem>
                      <SelectItem value="prism" className="text-xs text-purple-400">💎 Prism</SelectItem>
                      <SelectItem value="void" className="text-xs text-purple-400">💎 Void</SelectItem>
                      <SelectItem value="dragon" className="text-xs text-purple-400">💎 Dragon</SelectItem>
                      <SelectItem value="matrix" className="text-xs text-purple-400">💎 Matrix</SelectItem>
                    </>}
                    {!user?.isPremium && (
                      <div className="px-2 py-1.5 text-[10px] text-purple-400/60 font-black border-t border-white/5 mt-1 pt-2">💎 Upgrade to Premium for more</div>
                    )}
                    {dbDecorations.length > 0 && (
                      <div className="border-t border-white/5 mt-1 pt-1">
                        {dbDecorations
                          .filter((d: any) => !d.is_premium_only || user?.isPremium)
                          .map((d: any) => (
                            <SelectItem key={d.id} value={`custom:${d.url}`} className="text-xs">
                              {d.is_premium_only ? "💎 " : ""}{d.name}
                            </SelectItem>
                          ))
                        }
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </SettingRow>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-black uppercase text-gray-500">Corner Radius (0=square, 50=circle)</Label>
                <NumSlider value={getS("avatarRadius", 50)} onChange={v => updS("avatarRadius", v)} min={0} max={50} unit="%" />
              </div>
            </div>
          )}

          {/* CURSOR */}
          {miscSection === "cursor" && (
            <div className="space-y-4">
              <SectionTitle>Cursor</SectionTitle>

              {!user?.isPremium && (
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-purple-500/30 bg-purple-500/5">
                  <span className="text-lg">💎</span>
                  <div>
                    <p className="text-sm font-black text-purple-400">Premium Feature</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">Custom cursors are exclusive to Premium users.</p>
                  </div>
                  <a href="/shop" className="ml-auto shrink-0 px-3 py-1.5 rounded-lg bg-purple-500/20 border border-purple-500/30 text-purple-400 text-[10px] font-black uppercase tracking-widest hover:bg-purple-500/30 transition-colors">
                    Upgrade
                  </a>
                </div>
              )}

              <div className={!user?.isPremium ? "opacity-40 pointer-events-none select-none" : ""}>
                <CursorPremiumPanel getS={getS} updS={updS} />
              </div>
            </div>
          )}

          {/* ALIGNMENT */}
          {miscSection === "alignment" && (
            <div className="space-y-4">
              <SectionTitle>Content Alignment</SectionTitle>
              <div className="space-y-2">
                <Label className="text-[11px] font-black uppercase text-gray-500">Profile Content Alignment</Label>
                <p className="text-[11px] text-gray-600">Controls where the profile box and all text is aligned on your page.</p>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {([
                    { value: "left", icon: AlignLeft, label: "Left" },
                    { value: "center", icon: AlignCenter, label: "Center" },
                    { value: "right", icon: AlignRight, label: "Right" },
                  ] as const).map(({ value, icon: Icon, label }) => (
                    <button key={value} onClick={() => updS("contentAlign", value)}
                      className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${getS("contentAlign", "center") === value ? "border-orange-500 bg-orange-500/10" : "border-white/10 bg-black/30 hover:border-white/20"}`}>
                      <Icon className={`w-5 h-5 ${getS("contentAlign", "center") === value ? "text-orange-500" : "text-gray-400"}`} />
                      <span className={`text-xs font-black ${getS("contentAlign", "center") === value ? "text-orange-500" : "text-gray-400"}`}>{label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* REVEAL SCREEN */}
          {miscSection === "reveal" && (
            <div className="space-y-4">
              <SectionTitle>Reveal Screen</SectionTitle>
              <p className="text-[11px] text-gray-500">Configure the reveal screen in the Profile tab under Reveal Screen settings.</p>
              <SettingRow label="Background Blur" desc="Blur behind the reveal overlay">
                <NumSlider value={getS("revealBlur", 8)} onChange={v => updS("revealBlur", v)} min={0} max={30} unit="px" />
              </SettingRow>
              <SettingRow label="Auto Reveal" desc="Automatically reveal profile after a delay">
                <Switch checked={getS("autoReveal", false)} onCheckedChange={v => updS("autoReveal", v)} />
              </SettingRow>
              {getS("autoReveal", false) && (
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-black uppercase text-gray-500">Auto Reveal Delay</Label>
                  <NumSlider value={getS("autoRevealDelay", 3)} onChange={v => updS("autoRevealDelay", v)} min={1} max={30} unit="s" />
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

// ─── Markdowns Tab ────────────────────────────────────────────────────────────

const VOIDMARK_TAGS = [
  { tag: "[b]Bold[/b]", label: "Bold", desc: "Makes text bold", example: "[b]Bold[/b]" },
  { tag: "[em]Italic[/em]", label: "Italic", desc: "Makes text italic", example: "[em]Italic[/em]" },
  { tag: "[u]Underline[/u]", label: "Underline", desc: "Underlines text", example: "[u]Underline[/u]" },
  { tag: "[del]Strike[/del]", label: "Strikethrough", desc: "Crosses out text", example: "[del]Strikethrough[/del]" },
  { tag: "[h]Heading[/h]", label: "Heading", desc: "Large bold heading", example: "[h]Heading[/h]" },
  { tag: "[theme]Accent[/theme]", label: "Theme Color", desc: "Colors text in your accent color", example: "[theme]Accent[/theme]" },
  { tag: "[color=F97316]Color[/color]", label: "Custom Color", desc: "Any hex color (no # needed)", example: "[color=F97316]Color[/color]" },
  { tag: "[highlight]Text[/highlight]", label: "Highlight", desc: "Highlighted background on text", example: "[highlight]Highlight[/highlight]" },
  { tag: "[quote]Quote[/quote]", label: "Quote Block", desc: "Displays as a styled blockquote", example: "[quote]Quote[/quote]" },
  { tag: "[code]code[/code]", label: "Code", desc: "Monospace code styling", example: "[code]console.log(1)[/code]" },
  { tag: "[spoiler]Hidden[/spoiler]", label: "Spoiler", desc: "Blurred until clicked", example: "[spoiler]Hidden[/spoiler]" },
  { tag: "[typewriter]Text[/typewriter]", label: "Typewriter", desc: "Types out then loops back after 3s", example: "[typewriter]Typewriter[/typewriter]" },
  { tag: "[left]Text[/left]", label: "Align Left", desc: "Left-aligns a block of text", example: "[left]Left[/left]" },
  { tag: "[center]Text[/center]", label: "Center", desc: "Centers a block of text", example: "[center]Centered[/center]" },
  { tag: "[right]Text[/right]", label: "Align Right", desc: "Right-aligns a block of text", example: "[right]Right[/right]" },
  { tag: "[list][item]A[/item][item]B[/item][/list]", label: "List", desc: "Bullet list with items", example: "[list][item]Item A[/item][item]Item B[/item][/list]" },
  { tag: "[hr]", label: "Divider", desc: "Horizontal rule", example: "[hr]" },
  { tag: "[hr-theme]", label: "Themed Divider", desc: "Divider in your accent color", example: "[hr-theme]" },
  { tag: "[br]", label: "Line Break", desc: "Explicit line break", example: "[br]" },
];

const MIXED_EXAMPLE = `[h][theme]Welcome to my page![/theme][/h]
[br]
[b]About me:[/b] [em]I love [glow]creating[/glow] things[/em] and [highlight]sharing[/highlight] them online.
[br]
[rainbow]✦ My skills are growing every day ✦[/rainbow]
[br]
[quote][color=7289da]"Build things that matter."[/color][/quote]
[br]
[list]
[item][b]Design[/b] — UI & visual stuff[/item]
[item][b]Code[/b] — full stack[/item]
[item][b]Music[/b] — always [spoiler]trap beats[/spoiler][/item]
[/list]
[br]
[center][small]Made with [theme]Hexed[/theme][/small][/center]`;

// ─── Profile Settings Modal ───────────────────────────────────────────────────
function ProfileSettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState<"2fa" | "password" | "theme">("2fa");

  // 2FA states
  const [twoFaStep, setTwoFaStep] = useState<"idle" | "setup-code" | "setup-pw" | "disable" | "edit-code" | "active">("idle");
  const [twoFaCode, setTwoFaCode] = useState("");
  const [twoFaNewCode, setTwoFaNewCode] = useState("");
  const [twoFaPassword, setTwoFaPassword] = useState("");
  const [twoFaError, setTwoFaError] = useState("");
  const [twoFaLoading, setTwoFaLoading] = useState(false);
  const [twoFaEnabled, setTwoFaEnabled] = useState<boolean>(user?.twoFactorEnabled ?? false);

  // Change password states
  const [pwCode, setPwCode] = useState("");
  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pwError, setPwError] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [showPwCurrent, setShowPwCurrent] = useState(false);
  const [showPwNew, setShowPwNew] = useState(false);

  // Theme state
  const [isDark, setIsDark] = useState(() => !document.documentElement.classList.contains("light"));

  useEffect(() => {
    if (open) {
      setTwoFaEnabled(user?.twoFactorEnabled ?? false);
      setTwoFaStep("idle");
      setTwoFaCode(""); setTwoFaNewCode(""); setTwoFaPassword(""); setTwoFaError("");
      setPwCode(""); setPwCurrent(""); setPwNew(""); setPwConfirm(""); setPwError("");
    }
  }, [open, user]);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    if (next) {
      document.documentElement.classList.remove("light");
      localStorage.setItem("hexed-theme", "dark");
    } else {
      document.documentElement.classList.add("light");
      localStorage.setItem("hexed-theme", "light");
    }
  };

  const inputCls = "w-full bg-white/[0.04] border border-white/[0.08] focus:border-orange-500/60 focus:bg-white/[0.06] rounded-xl h-10 px-3 text-white placeholder:text-gray-600 text-sm transition-all outline-none";

  async function handleSetup2FA() {
    setTwoFaError(""); setTwoFaLoading(true);
    try {
      const res = await fetch("/api/user/setup-2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: twoFaCode, password: twoFaPassword }),
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) { setTwoFaError(json.message || "Failed"); return; }
      setTwoFaEnabled(true);
      setTwoFaStep("active");
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({ title: "2FA enabled!", description: "Your account is now protected." });
    } catch (e: any) { setTwoFaError(e.message); }
    finally { setTwoFaLoading(false); }
  }

  async function handleDisable2FA() {
    setTwoFaError(""); setTwoFaLoading(true);
    try {
      const res = await fetch("/api/user/disable-2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: twoFaCode }),
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) { setTwoFaError(json.message || "Failed"); return; }
      setTwoFaEnabled(false);
      setTwoFaStep("idle");
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({ title: "2FA disabled" });
    } catch (e: any) { setTwoFaError(e.message); }
    finally { setTwoFaLoading(false); }
  }

  async function handleUpdate2FA() {
    setTwoFaError(""); setTwoFaLoading(true);
    try {
      const res = await fetch("/api/user/update-2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentCode: twoFaCode, newCode: twoFaNewCode }),
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) { setTwoFaError(json.message || "Failed"); return; }
      setTwoFaStep("active");
      setTwoFaCode(""); setTwoFaNewCode("");
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({ title: "2FA code updated!" });
    } catch (e: any) { setTwoFaError(e.message); }
    finally { setTwoFaLoading(false); }
  }

  async function handleChangePassword() {
    setPwError("");
    if (pwNew !== pwConfirm) { setPwError("New passwords don't match"); return; }
    if (pwNew.length < 7) { setPwError("Password must be at least 7 characters"); return; }
    setPwLoading(true);
    try {
      const res = await fetch("/api/user/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ twoFactorCode: pwCode || undefined, currentPassword: pwCurrent, newPassword: pwNew }),
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) { setPwError(json.message || "Failed"); return; }
      toast({ title: "Password changed!" });
      setPwCode(""); setPwCurrent(""); setPwNew(""); setPwConfirm("");
    } catch (e: any) { setPwError(e.message); }
    finally { setPwLoading(false); }
  }

  const tabs = [
    { id: "2fa", label: "2FA Security", icon: ShieldCheck },
    { id: "password", label: "Password", icon: Key },
    { id: "theme", label: "Theme", icon: Palette },
  ] as const;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="bg-[#0d0d0d] border border-white/[0.08] max-w-md rounded-2xl p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-4 border-b border-white/[0.06]">
          <DialogTitle className="text-white font-black flex items-center gap-2">
            <Settings className="w-4 h-4 text-orange-400" /> Profile Settings
          </DialogTitle>
        </DialogHeader>

        {/* Tab bar */}
        <div className="flex gap-1 p-3 border-b border-white/[0.06] bg-black/20">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all ${tab === t.id ? "bg-orange-500 text-black" : "text-gray-500 hover:text-gray-300"}`}>
              <t.icon className="w-3 h-3" /> {t.label}
            </button>
          ))}
        </div>

        <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* ─── 2FA Tab ─── */}
          {tab === "2fa" && (
            <div className="space-y-4">
              {twoFaEnabled || user?.twoFactorEnabled ? (
                <>
                  {twoFaStep === "idle" || twoFaStep === "active" ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-green-500/5 border border-green-500/20">
                        <ShieldCheck className="w-5 h-5 text-green-400 shrink-0" />
                        <div>
                          <p className="text-sm font-bold text-white">2FA is Active</p>
                          <p className="text-[11px] text-gray-500">Your account is protected with a 2FA code</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => { setTwoFaStep("edit-code"); setTwoFaCode(""); setTwoFaNewCode(""); setTwoFaError(""); }}
                          className="flex-1 py-2 rounded-xl border border-orange-500/40 text-orange-400 text-xs font-black uppercase tracking-widest hover:bg-orange-500/10 transition-all">
                          Edit Code
                        </button>
                        <button onClick={() => { setTwoFaStep("disable"); setTwoFaCode(""); setTwoFaError(""); }}
                          className="flex-1 py-2 rounded-xl border border-red-500/40 text-red-400 text-xs font-black uppercase tracking-widest hover:bg-red-500/10 transition-all">
                          Turn Off 2FA
                        </button>
                      </div>
                    </div>
                  ) : twoFaStep === "edit-code" ? (
                    <div className="space-y-3">
                      <p className="text-sm font-bold text-white">Edit 2FA Code</p>
                      <input value={twoFaCode} onChange={e => setTwoFaCode(e.target.value.slice(0, 6))} placeholder="Current 2FA code" maxLength={6} className={inputCls} />
                      <input value={twoFaNewCode} onChange={e => setTwoFaNewCode(e.target.value.slice(0, 6))} placeholder="New 2FA code (max 6 chars)" maxLength={6} className={inputCls} />
                      {twoFaError && <p className="text-xs text-red-400">{twoFaError}</p>}
                      <div className="flex gap-2">
                        <button onClick={() => { setTwoFaStep("active"); setTwoFaError(""); }} className="flex-1 py-2 rounded-xl border border-white/10 text-gray-400 text-xs font-black uppercase tracking-widest hover:bg-white/5 transition-all">Cancel</button>
                        <button onClick={handleUpdate2FA} disabled={twoFaLoading || !twoFaCode || !twoFaNewCode}
                          className="flex-1 py-2 rounded-xl bg-orange-500 text-black text-xs font-black uppercase tracking-widest disabled:opacity-50 transition-all">
                          {twoFaLoading ? "Saving..." : "Save"}
                        </button>
                      </div>
                    </div>
                  ) : twoFaStep === "disable" ? (
                    <div className="space-y-3">
                      <p className="text-sm font-bold text-white">Disable 2FA</p>
                      <p className="text-xs text-gray-500">Enter your current 2FA code to disable it.</p>
                      <input value={twoFaCode} onChange={e => setTwoFaCode(e.target.value.slice(0, 6))} placeholder="Your 2FA code" maxLength={6} className={inputCls} />
                      {twoFaError && <p className="text-xs text-red-400">{twoFaError}</p>}
                      <div className="flex gap-2">
                        <button onClick={() => { setTwoFaStep("active"); setTwoFaError(""); }} className="flex-1 py-2 rounded-xl border border-white/10 text-gray-400 text-xs font-black uppercase tracking-widest hover:bg-white/5 transition-all">Cancel</button>
                        <button onClick={handleDisable2FA} disabled={twoFaLoading || !twoFaCode}
                          className="flex-1 py-2 rounded-xl bg-red-500/80 text-white text-xs font-black uppercase tracking-widest disabled:opacity-50 transition-all">
                          {twoFaLoading ? "Disabling..." : "Turn Off"}
                        </button>
                      </div>
                    </div>
                  ) : null}
                </>
              ) : (
                <>
                  {twoFaStep === "idle" ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-orange-500/5 border border-orange-500/20">
                        <ShieldCheck className="w-5 h-5 text-orange-400 shrink-0" />
                        <div>
                          <p className="text-sm font-bold text-white">No 2FA Setup</p>
                          <p className="text-[11px] text-gray-500">Add an extra layer of security to your account</p>
                        </div>
                      </div>
                      <button onClick={() => { setTwoFaStep("setup-code"); setTwoFaCode(""); setTwoFaPassword(""); setTwoFaError(""); }}
                        className="w-full py-2.5 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs font-black uppercase tracking-widest hover:bg-orange-500/20 transition-all flex items-center justify-center gap-2">
                        <ShieldCheck className="w-3.5 h-3.5" /> Setup 2FA
                      </button>
                    </div>
                  ) : twoFaStep === "setup-code" ? (
                    <div className="space-y-3">
                      <p className="text-sm font-bold text-white">Choose your 2FA code</p>
                      <p className="text-xs text-gray-500">Max 6 characters. Letters and numbers allowed.</p>
                      <input value={twoFaCode} onChange={e => setTwoFaCode(e.target.value.slice(0, 6))} placeholder="e.g. abc123" maxLength={6} className={inputCls} autoFocus />
                      {twoFaError && <p className="text-xs text-red-400">{twoFaError}</p>}
                      <div className="flex gap-2">
                        <button onClick={() => { setTwoFaStep("idle"); setTwoFaError(""); }} className="flex-1 py-2 rounded-xl border border-white/10 text-gray-400 text-xs font-black uppercase tracking-widest hover:bg-white/5 transition-all">Cancel</button>
                        <button onClick={() => { setTwoFaError(""); setTwoFaStep("setup-pw"); }} disabled={!twoFaCode}
                          className="flex-1 py-2 rounded-xl bg-orange-500 text-black text-xs font-black uppercase tracking-widest disabled:opacity-50 transition-all">
                          Next →
                        </button>
                      </div>
                    </div>
                  ) : twoFaStep === "setup-pw" ? (
                    <div className="space-y-3">
                      <p className="text-sm font-bold text-white">Confirm with Password</p>
                      <p className="text-xs text-gray-500">Enter your account password to enable 2FA.</p>
                      <div className="relative">
                        <input type={showPwCurrent ? "text" : "password"} value={twoFaPassword} onChange={e => setTwoFaPassword(e.target.value)} placeholder="Your password" className={`${inputCls} pr-10`} autoFocus />
                        <button type="button" onClick={() => setShowPwCurrent(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors">
                          {showPwCurrent ? <EyeOff className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                        </button>
                      </div>
                      {twoFaError && <p className="text-xs text-red-400">{twoFaError}</p>}
                      <p className="text-[10px] text-gray-600 text-center">
                        Forgot password?{" "}
                        <a href="https://discord.gg/hexed" target="_blank" rel="noreferrer" className="text-orange-500 hover:text-orange-400 font-bold">Create a ticket on Discord</a>
                      </p>
                      <div className="flex gap-2">
                        <button onClick={() => { setTwoFaStep("setup-code"); setTwoFaError(""); }} className="flex-1 py-2 rounded-xl border border-white/10 text-gray-400 text-xs font-black uppercase tracking-widest hover:bg-white/5 transition-all">← Back</button>
                        <button onClick={handleSetup2FA} disabled={twoFaLoading || !twoFaPassword}
                          className="flex-1 py-2 rounded-xl bg-orange-500 text-black text-xs font-black uppercase tracking-widest disabled:opacity-50 transition-all flex items-center justify-center gap-1">
                          {twoFaLoading ? "Enabling..." : <><ShieldCheck className="w-3.5 h-3.5" /> Enable 2FA</>}
                        </button>
                      </div>
                    </div>
                  ) : null}
                </>
              )}
            </div>
          )}

          {/* ─── Password Tab ─── */}
          {tab === "password" && (
            <div className="space-y-3">
              {(user?.twoFactorEnabled) && (
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">2FA Code</label>
                  <input value={pwCode} onChange={e => setPwCode(e.target.value.slice(0, 6))} placeholder="Your 2FA code" maxLength={6} className={inputCls} />
                </div>
              )}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Current Password</label>
                <div className="relative">
                  <input type={showPwCurrent ? "text" : "password"} value={pwCurrent} onChange={e => setPwCurrent(e.target.value)} placeholder="Current password" className={`${inputCls} pr-10`} />
                  <button type="button" onClick={() => setShowPwCurrent(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors">
                    {showPwCurrent ? <EyeOff className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">New Password</label>
                <div className="relative">
                  <input type={showPwNew ? "text" : "password"} value={pwNew} onChange={e => setPwNew(e.target.value)} placeholder="New password (min. 7 chars)" className={`${inputCls} pr-10`} />
                  <button type="button" onClick={() => setShowPwNew(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors">
                    {showPwNew ? <EyeOff className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Confirm New Password</label>
                <input type="password" value={pwConfirm} onChange={e => setPwConfirm(e.target.value)} placeholder="Confirm new password" className={inputCls} />
              </div>
              {pwError && <p className="text-xs text-red-400">{pwError}</p>}
              <button onClick={handleChangePassword} disabled={pwLoading || !pwCurrent || !pwNew || !pwConfirm}
                className="w-full py-2.5 rounded-xl bg-orange-500 text-black text-xs font-black uppercase tracking-widest disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                {pwLoading ? "Saving..." : <><Key className="w-3.5 h-3.5" /> Change Password</>}
              </button>
              <p className="text-[10px] text-gray-600 text-center">
                Forgot password?{" "}
                <a href="https://discord.gg/hexed" target="_blank" rel="noreferrer" className="text-orange-500 hover:text-orange-400 font-bold">Create a ticket on Discord</a>
              </p>
            </div>
          )}

          {/* ─── Theme Tab ─── */}
          {tab === "theme" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <div>
                  <p className="text-sm font-bold text-white">{isDark ? "Dark Mode" : "Light Mode"}</p>
                  <p className="text-[11px] text-gray-500">Switch between dark and light theme</p>
                </div>
                <button onClick={toggleTheme}
                  className={`relative w-12 h-6 rounded-full transition-all ${isDark ? "bg-orange-500" : "bg-gray-200"}`}>
                  <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${isDark ? "left-6" : "left-0.5"}`} />
                </button>
              </div>
              <p className="text-[10px] text-gray-600">Theme preference is saved in your browser.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ProfileSettingsTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState<"2fa" | "password" | "theme">("2fa");

  const [twoFaStep, setTwoFaStep] = useState<"idle" | "setup-code" | "setup-pw" | "disable" | "edit-code" | "active">("idle");
  const [twoFaCode, setTwoFaCode] = useState("");
  const [twoFaNewCode, setTwoFaNewCode] = useState("");
  const [twoFaPassword, setTwoFaPassword] = useState("");
  const [twoFaError, setTwoFaError] = useState("");
  const [twoFaLoading, setTwoFaLoading] = useState(false);
  const [twoFaEnabled, setTwoFaEnabled] = useState<boolean>(user?.twoFactorEnabled ?? false);

  const [pwCode, setPwCode] = useState("");
  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pwError, setPwError] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [showPwCurrent, setShowPwCurrent] = useState(false);
  const [showPwNew, setShowPwNew] = useState(false);

  const [isDark, setIsDark] = useState(() => !document.documentElement.classList.contains("light"));

  const inputCls = "w-full bg-white/[0.04] border border-white/[0.08] focus:border-orange-500/60 focus:bg-white/[0.06] rounded-xl h-10 px-3 text-white placeholder:text-gray-600 text-sm transition-all outline-none";

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    if (next) {
      document.documentElement.classList.remove("light");
      localStorage.setItem("hexed-theme", "dark");
    } else {
      document.documentElement.classList.add("light");
      localStorage.setItem("hexed-theme", "light");
    }
  };

  async function handleSetup2FA() {
    setTwoFaError(""); setTwoFaLoading(true);
    try {
      const res = await fetch("/api/user/setup-2fa", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: twoFaCode, password: twoFaPassword }), credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) { setTwoFaError(json.message || "Failed"); return; }
      setTwoFaEnabled(true); setTwoFaStep("active");
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({ title: "2FA enabled!", description: "Your account is now protected." });
    } catch (e: any) { setTwoFaError(e.message); }
    finally { setTwoFaLoading(false); }
  }

  async function handleDisable2FA() {
    setTwoFaError(""); setTwoFaLoading(true);
    try {
      const res = await fetch("/api/user/disable-2fa", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: twoFaCode }), credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) { setTwoFaError(json.message || "Failed"); return; }
      setTwoFaEnabled(false); setTwoFaStep("idle");
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({ title: "2FA disabled" });
    } catch (e: any) { setTwoFaError(e.message); }
    finally { setTwoFaLoading(false); }
  }

  async function handleUpdate2FA() {
    setTwoFaError(""); setTwoFaLoading(true);
    try {
      const res = await fetch("/api/user/update-2fa", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentCode: twoFaCode, newCode: twoFaNewCode }), credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) { setTwoFaError(json.message || "Failed"); return; }
      setTwoFaStep("active"); setTwoFaCode(""); setTwoFaNewCode("");
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({ title: "2FA code updated!" });
    } catch (e: any) { setTwoFaError(e.message); }
    finally { setTwoFaLoading(false); }
  }

  async function handleChangePassword() {
    setPwError("");
    if (pwNew !== pwConfirm) { setPwError("New passwords don't match"); return; }
    if (pwNew.length < 7) { setPwError("Password must be at least 7 characters"); return; }
    setPwLoading(true);
    try {
      const res = await fetch("/api/user/change-password", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ twoFactorCode: pwCode || undefined, currentPassword: pwCurrent, newPassword: pwNew }),
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) { setPwError(json.message || "Failed"); return; }
      toast({ title: "Password changed!" });
      setPwCode(""); setPwCurrent(""); setPwNew(""); setPwConfirm("");
    } catch (e: any) { setPwError(e.message); }
    finally { setPwLoading(false); }
  }

  const tabs = [
    { id: "2fa", label: "2FA Security", icon: ShieldCheck },
    { id: "password", label: "Password", icon: Key },
    { id: "theme", label: "Theme", icon: Palette },
  ] as const;

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-black">Settings</h1>
        <p className="text-gray-500 text-sm mt-1">Manage your account security and preferences</p>
      </div>

      <div className="bg-[#0e0e0e] border border-white/[0.06] rounded-2xl overflow-hidden">
        <div className="flex gap-1 p-3 border-b border-white/[0.06] bg-black/20">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all ${tab === t.id ? "bg-orange-500 text-black" : "text-gray-500 hover:text-gray-300"}`}>
              <t.icon className="w-3 h-3" /> {t.label}
            </button>
          ))}
        </div>

        <div className="p-5 space-y-4">
          {tab === "2fa" && (
            <div className="space-y-4">
              {twoFaEnabled || user?.twoFactorEnabled ? (
                <>
                  {twoFaStep === "idle" || twoFaStep === "active" ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-green-500/5 border border-green-500/20">
                        <ShieldCheck className="w-5 h-5 text-green-400 shrink-0" />
                        <div>
                          <p className="text-sm font-bold text-white">2FA is Active</p>
                          <p className="text-[11px] text-gray-500">Your account is protected with a 2FA code</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => { setTwoFaStep("edit-code"); setTwoFaCode(""); setTwoFaNewCode(""); setTwoFaError(""); }}
                          className="flex-1 py-2 rounded-xl border border-orange-500/40 text-orange-400 text-xs font-black uppercase tracking-widest hover:bg-orange-500/10 transition-all">
                          Edit Code
                        </button>
                        <button onClick={() => { setTwoFaStep("disable"); setTwoFaCode(""); setTwoFaError(""); }}
                          className="flex-1 py-2 rounded-xl border border-red-500/40 text-red-400 text-xs font-black uppercase tracking-widest hover:bg-red-500/10 transition-all">
                          Turn Off 2FA
                        </button>
                      </div>
                    </div>
                  ) : twoFaStep === "edit-code" ? (
                    <div className="space-y-3">
                      <p className="text-sm font-bold text-white">Edit 2FA Code</p>
                      <input value={twoFaCode} onChange={e => setTwoFaCode(e.target.value.slice(0, 6))} placeholder="Current 2FA code" maxLength={6} className={inputCls} />
                      <input value={twoFaNewCode} onChange={e => setTwoFaNewCode(e.target.value.slice(0, 6))} placeholder="New 2FA code (max 6 chars)" maxLength={6} className={inputCls} />
                      {twoFaError && <p className="text-xs text-red-400">{twoFaError}</p>}
                      <div className="flex gap-2">
                        <button onClick={() => { setTwoFaStep("active"); setTwoFaError(""); }} className="flex-1 py-2 rounded-xl border border-white/10 text-gray-400 text-xs font-black uppercase tracking-widest hover:bg-white/5 transition-all">Cancel</button>
                        <button onClick={handleUpdate2FA} disabled={twoFaLoading || !twoFaCode || !twoFaNewCode}
                          className="flex-1 py-2 rounded-xl bg-orange-500 text-black text-xs font-black uppercase tracking-widest disabled:opacity-50 transition-all">
                          {twoFaLoading ? "Saving..." : "Save"}
                        </button>
                      </div>
                    </div>
                  ) : twoFaStep === "disable" ? (
                    <div className="space-y-3">
                      <p className="text-sm font-bold text-white">Disable 2FA</p>
                      <p className="text-xs text-gray-500">Enter your current 2FA code to disable it.</p>
                      <input value={twoFaCode} onChange={e => setTwoFaCode(e.target.value.slice(0, 6))} placeholder="Your 2FA code" maxLength={6} className={inputCls} />
                      {twoFaError && <p className="text-xs text-red-400">{twoFaError}</p>}
                      <div className="flex gap-2">
                        <button onClick={() => { setTwoFaStep("active"); setTwoFaError(""); }} className="flex-1 py-2 rounded-xl border border-white/10 text-gray-400 text-xs font-black uppercase tracking-widest hover:bg-white/5 transition-all">Cancel</button>
                        <button onClick={handleDisable2FA} disabled={twoFaLoading || !twoFaCode}
                          className="flex-1 py-2 rounded-xl bg-red-500/80 text-white text-xs font-black uppercase tracking-widest disabled:opacity-50 transition-all">
                          {twoFaLoading ? "Disabling..." : "Turn Off"}
                        </button>
                      </div>
                    </div>
                  ) : null}
                </>
              ) : (
                <>
                  {twoFaStep === "idle" ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-orange-500/5 border border-orange-500/20">
                        <ShieldCheck className="w-5 h-5 text-orange-400 shrink-0" />
                        <div>
                          <p className="text-sm font-bold text-white">No 2FA Setup</p>
                          <p className="text-[11px] text-gray-500">Add an extra layer of security to your account</p>
                        </div>
                      </div>
                      <button onClick={() => { setTwoFaStep("setup-code"); setTwoFaCode(""); setTwoFaPassword(""); setTwoFaError(""); }}
                        className="w-full py-2.5 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs font-black uppercase tracking-widest hover:bg-orange-500/20 transition-all flex items-center justify-center gap-2">
                        <ShieldCheck className="w-3.5 h-3.5" /> Setup 2FA
                      </button>
                    </div>
                  ) : twoFaStep === "setup-code" ? (
                    <div className="space-y-3">
                      <p className="text-sm font-bold text-white">Choose your 2FA code</p>
                      <p className="text-xs text-gray-500">Max 6 characters. Letters and numbers allowed.</p>
                      <input value={twoFaCode} onChange={e => setTwoFaCode(e.target.value.slice(0, 6))} placeholder="e.g. abc123" maxLength={6} className={inputCls} autoFocus />
                      {twoFaError && <p className="text-xs text-red-400">{twoFaError}</p>}
                      <div className="flex gap-2">
                        <button onClick={() => { setTwoFaStep("idle"); setTwoFaError(""); }} className="flex-1 py-2 rounded-xl border border-white/10 text-gray-400 text-xs font-black uppercase tracking-widest hover:bg-white/5 transition-all">Cancel</button>
                        <button onClick={() => { setTwoFaError(""); setTwoFaStep("setup-pw"); }} disabled={!twoFaCode}
                          className="flex-1 py-2 rounded-xl bg-orange-500 text-black text-xs font-black uppercase tracking-widest disabled:opacity-50 transition-all">
                          Next →
                        </button>
                      </div>
                    </div>
                  ) : twoFaStep === "setup-pw" ? (
                    <div className="space-y-3">
                      <p className="text-sm font-bold text-white">Confirm with Password</p>
                      <p className="text-xs text-gray-500">Enter your account password to enable 2FA.</p>
                      <div className="relative">
                        <input type={showPwCurrent ? "text" : "password"} value={twoFaPassword} onChange={e => setTwoFaPassword(e.target.value)} placeholder="Your password" className={`${inputCls} pr-10`} autoFocus />
                        <button type="button" onClick={() => setShowPwCurrent(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors">
                          {showPwCurrent ? <EyeOff className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                        </button>
                      </div>
                      {twoFaError && <p className="text-xs text-red-400">{twoFaError}</p>}
                      <p className="text-[10px] text-gray-600 text-center">
                        Forgot password?{" "}
                        <a href="https://discord.gg/hexed" target="_blank" rel="noreferrer" className="text-orange-500 hover:text-orange-400 font-bold">Create a ticket on Discord</a>
                      </p>
                      <div className="flex gap-2">
                        <button onClick={() => { setTwoFaStep("setup-code"); setTwoFaError(""); }} className="flex-1 py-2 rounded-xl border border-white/10 text-gray-400 text-xs font-black uppercase tracking-widest hover:bg-white/5 transition-all">← Back</button>
                        <button onClick={handleSetup2FA} disabled={twoFaLoading || !twoFaPassword}
                          className="flex-1 py-2 rounded-xl bg-orange-500 text-black text-xs font-black uppercase tracking-widest disabled:opacity-50 transition-all flex items-center justify-center gap-1">
                          {twoFaLoading ? "Enabling..." : <><ShieldCheck className="w-3.5 h-3.5" /> Enable 2FA</>}
                        </button>
                      </div>
                    </div>
                  ) : null}
                </>
              )}
            </div>
          )}

          {tab === "password" && (
            <div className="space-y-3">
              {user?.twoFactorEnabled && (
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">2FA Code</label>
                  <input value={pwCode} onChange={e => setPwCode(e.target.value.slice(0, 6))} placeholder="Your 2FA code" maxLength={6} className={inputCls} />
                </div>
              )}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Current Password</label>
                <div className="relative">
                  <input type={showPwCurrent ? "text" : "password"} value={pwCurrent} onChange={e => setPwCurrent(e.target.value)} placeholder="Current password" className={`${inputCls} pr-10`} />
                  <button type="button" onClick={() => setShowPwCurrent(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors">
                    {showPwCurrent ? <EyeOff className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">New Password</label>
                <div className="relative">
                  <input type={showPwNew ? "text" : "password"} value={pwNew} onChange={e => setPwNew(e.target.value)} placeholder="New password (min. 7 chars)" className={`${inputCls} pr-10`} />
                  <button type="button" onClick={() => setShowPwNew(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors">
                    {showPwNew ? <EyeOff className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Confirm New Password</label>
                <input type="password" value={pwConfirm} onChange={e => setPwConfirm(e.target.value)} placeholder="Confirm new password" className={inputCls} />
              </div>
              {pwError && <p className="text-xs text-red-400">{pwError}</p>}
              <button onClick={handleChangePassword} disabled={pwLoading || !pwCurrent || !pwNew || !pwConfirm}
                className="w-full py-2.5 rounded-xl bg-orange-500 text-black text-xs font-black uppercase tracking-widest disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                {pwLoading ? "Saving..." : <><Key className="w-3.5 h-3.5" /> Change Password</>}
              </button>
              <p className="text-[10px] text-gray-600 text-center">
                Forgot password?{" "}
                <a href="https://discord.gg/hexed" target="_blank" rel="noreferrer" className="text-orange-500 hover:text-orange-400 font-bold">Create a ticket on Discord</a>
              </p>
            </div>
          )}

          {tab === "theme" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <div>
                  <p className="text-sm font-bold text-white">{isDark ? "Dark Mode" : "Light Mode"}</p>
                  <p className="text-[11px] text-gray-500">Switch between dark and light theme</p>
                </div>
                <button onClick={toggleTheme}
                  className={`relative w-12 h-6 rounded-full transition-all ${isDark ? "bg-orange-500" : "bg-gray-200"}`}>
                  <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${isDark ? "left-6" : "left-0.5"}`} />
                </button>
              </div>
              <p className="text-[10px] text-gray-600">Theme preference is saved in your browser.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MarkdownsTab() {
  const { toast } = useToast();
  const [preview, setPreview] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [mixedCopied, setMixedCopied] = useState(false);
  const [profileSettingsOpen, setProfileSettingsOpen] = useState(false);

  const copy = (example: string) => {
    navigator.clipboard.writeText(example).then(() => {
      setCopied(example);
      toast({ title: "Copied to clipboard!" });
      setTimeout(() => setCopied(null), 1500);
    });
  };

  const copyMixed = () => {
    navigator.clipboard.writeText(MIXED_EXAMPLE).then(() => {
      setMixedCopied(true);
      toast({ title: "Mixed example copied!" });
      setTimeout(() => setMixedCopied(false), 1500);
    });
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <ProfileSettingsModal open={profileSettingsOpen} onClose={() => setProfileSettingsOpen(false)} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black">Markdowns</h1>
          <p className="text-gray-500 text-sm mt-1">Voidmark tags — mix and match them freely in your bio, reveal text, and anywhere text is shown</p>
        </div>
        <button
          onClick={() => setProfileSettingsOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs font-black uppercase tracking-widest hover:bg-orange-500/20 transition-all"
        >
          <Settings className="w-3.5 h-3.5" /> Profile Settings
        </button>
      </div>

      <div className="bg-[#0e0e0e] border border-white/[0.06] rounded-2xl p-5 space-y-3">
        <h3 className="text-[11px] font-black uppercase tracking-widest text-gray-500">Live Preview</h3>
        <Textarea
          value={preview}
          onChange={e => setPreview(e.target.value)}
          placeholder="Mix all your Voidmark tags here to preview..."
          className="min-h-[80px] bg-black/60 border-white/5 focus:border-orange-500/50 resize-none font-mono text-sm"
        />
        {preview && (
          <div className="p-3 bg-black/30 rounded-xl border border-white/5 text-sm leading-relaxed text-white">
            <VoidMark text={preview} themeColor="#F97316" />
          </div>
        )}
      </div>

      <div className="bg-[#0e0e0e] border border-orange-500/10 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-[11px] font-black uppercase tracking-widest text-gray-500">Mix All Together</h3>
            <p className="text-[10px] text-gray-600 mt-0.5">All tags can be freely combined — no restrictions. Here's a full example:</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={copyMixed}
            className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-lg transition-all ${mixedCopied ? "bg-orange-500/20 text-orange-400" : "bg-white/5 text-gray-400 hover:bg-orange-500/10 hover:text-orange-400"}`}
          >
            {mixedCopied ? "Copied!" : "Copy Example"}
          </motion.button>
        </div>
        <div className="bg-black/40 rounded-xl border border-white/5 p-3">
          <pre className="text-[11px] font-mono text-orange-400/80 whitespace-pre-wrap leading-relaxed">{MIXED_EXAMPLE}</pre>
        </div>
        <div className="p-3 bg-black/30 rounded-xl border border-orange-500/10 text-sm leading-relaxed text-white">
          <p className="text-[9px] font-black uppercase tracking-widest text-gray-600 mb-2">Preview</p>
          <VoidMark text={MIXED_EXAMPLE} themeColor="#F97316" />
        </div>
      </div>

      <div className="bg-[#0e0e0e] border border-white/[0.06] rounded-2xl p-5">
        <h3 className="text-[11px] font-black uppercase tracking-widest text-gray-500 mb-4">All Tags — click to copy</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {VOIDMARK_TAGS.map(({ tag, label, desc, example }) => (
            <motion.button
              key={tag}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => copy(example)}
              className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all w-full ${copied === example ? "border-orange-500/50 bg-orange-500/5" : "border-white/5 bg-black/30 hover:border-orange-500/20 hover:bg-orange-500/5"}`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-white">{label}</span>
                  {copied === example && <span className="text-[9px] font-black uppercase text-orange-500">Copied!</span>}
                </div>
                <code className="text-[11px] font-mono text-orange-400 block mt-0.5 truncate">{tag}</code>
                <p className="text-[10px] text-gray-500 mt-0.5">{desc}</p>
              </div>
            </motion.button>
          ))}
        </div>
        <p className="text-[10px] text-gray-600 mt-4">All tags can be freely mixed — nest them inside each other, combine styles, stack effects. Everything works together.</p>
      </div>
    </div>
  );
}

// ─── Tickets Tab ───────────────────────────────────────────────────────────────

function TicketsTab({ user }: { user: any }) {
  const { toast } = useToast();
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [ticketData, setTicketData] = useState<{ ticket: any; messages: any[] } | null>(null);
  const [replyInput, setReplyInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: allTickets = [], refetch } = useQuery<any[]>({
    queryKey: ["/api/admin/tickets"],
    refetchInterval: 5000,
  });

  async function loadTicket(ticket: any) {
    setSelectedTicket(ticket);
    const res = await fetch(`/api/tickets/${ticket.id}/messages`, { credentials: "include" });
    if (res.ok) {
      const data = await res.json();
      setTicketData(data);
    }
  }

  // Poll messages when ticket is open
  useEffect(() => {
    if (!selectedTicket) return;
    const interval = setInterval(async () => {
      const res = await fetch(`/api/tickets/${selectedTicket.id}/messages`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setTicketData(data);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [selectedTicket]);

  useEffect(() => {
    if (ticketData) {
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  }, [ticketData]);

  async function sendReply() {
    if (!replyInput.trim() || !selectedTicket || sending) return;
    setSending(true);
    try {
      await apiRequest("POST", `/api/tickets/${selectedTicket.id}/messages`, { content: replyInput.trim() });
      setReplyInput("");
      const res = await fetch(`/api/tickets/${selectedTicket.id}/messages`, { credentials: "include" });
      if (res.ok) setTicketData(await res.json());
    } catch (_) {}
    setSending(false);
  }

  async function claimTicket() {
    if (!selectedTicket) return;
    await apiRequest("POST", `/api/tickets/${selectedTicket.id}/claim`, {});
    const res = await fetch(`/api/tickets/${selectedTicket.id}/messages`, { credentials: "include" });
    if (res.ok) setTicketData(await res.json());
    refetch();
  }

  async function closeTicket() {
    if (!selectedTicket) return;
    await apiRequest("POST", `/api/tickets/${selectedTicket.id}/close`, {});
    const res = await fetch(`/api/tickets/${selectedTicket.id}/messages`, { credentials: "include" });
    if (res.ok) setTicketData(await res.json());
    refetch();
    setSelectedTicket((t: any) => ({ ...t, status: "closed" }));
  }

  async function reopenTicket() {
    if (!selectedTicket) return;
    await apiRequest("POST", `/api/tickets/${selectedTicket.id}/reopen`, {});
    const res = await fetch(`/api/tickets/${selectedTicket.id}/messages`, { credentials: "include" });
    if (res.ok) setTicketData(await res.json());
    refetch();
    setSelectedTicket((t: any) => ({ ...t, status: "open" }));
  }

  async function deleteTicket(id: number) {
    await apiRequest("DELETE", `/api/tickets/${id}`, undefined);
    toast({ title: "Ticket deleted" });
    refetch();
    if (selectedTicket?.id === id) {
      setSelectedTicket(null);
      setTicketData(null);
    }
  }

  const openCount = (allTickets || []).filter((t: any) => t.status === "open").length;
  const closedCount = (allTickets || []).filter((t: any) => t.status === "closed").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black">Support Tickets</h1>
          <p className="text-gray-500 text-sm mt-1">{openCount} open · {closedCount} closed</p>
        </div>
        <button onClick={() => refetch()} className="flex items-center gap-1.5 text-[11px] text-gray-500 hover:text-orange-400 transition-colors">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* ── Ticket list ── */}
        <div className="space-y-2">
          {(!allTickets || allTickets.length === 0) && (
            <div className="text-center py-16 text-gray-600 text-sm bg-white/[0.02] rounded-2xl border border-white/[0.04]">
              <Inbox className="w-8 h-8 mx-auto mb-3 opacity-30" />
              No tickets yet
            </div>
          )}
          {(allTickets || []).map((ticket: any) => (
            <div
              key={ticket.id}
              onClick={() => loadTicket(ticket)}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                selectedTicket?.id === ticket.id
                  ? "border-orange-500/40 bg-orange-500/5"
                  : "border-white/[0.06] bg-white/[0.02] hover:border-white/10"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  {ticket.discordAvatar ? (
                    <img src={ticket.discordAvatar} alt="" className="w-7 h-7 rounded-full shrink-0" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-[#5865F2]/20 flex items-center justify-center shrink-0">
                      <SiDiscord className="w-3.5 h-3.5 text-[#7289da]" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-[13px] font-bold truncate">{ticket.discordUsername || "Unknown User"}</p>
                    <p className="text-[10px] text-gray-600">#{ticket.id} · {new Date(ticket.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                    ticket.status === "open" ? "bg-green-500/20 text-green-400" : "bg-gray-500/20 text-gray-400"
                  }`}>{ticket.status}</span>
                  {ticket.claimedByDiscordUsername && (
                    <span className="text-[9px] text-orange-400 font-bold truncate max-w-[70px]">
                      → {ticket.claimedByDiscordUsername}
                    </span>
                  )}
                  <button
                    onClick={e => { e.stopPropagation(); deleteTicket(ticket.id); }}
                    className="text-gray-600 hover:text-red-400 transition-colors"
                    title="Delete ticket"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Ticket detail ── */}
        <div className="bg-[#0e0e0e] border border-white/[0.06] rounded-2xl overflow-hidden flex flex-col" style={{ minHeight: 420 }}>
          {!selectedTicket ? (
            <div className="flex-1 flex items-center justify-center text-gray-600 text-sm flex-col gap-3">
              <MessageSquare className="w-8 h-8 opacity-30" />
              Select a ticket to view
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] bg-white/[0.02]">
                <div className="flex items-center gap-2">
                  {selectedTicket.discordAvatar ? (
                    <img src={selectedTicket.discordAvatar} alt="" className="w-6 h-6 rounded-full" />
                  ) : (
                    <SiDiscord className="w-4 h-4 text-[#7289da]" />
                  )}
                  <span className="text-xs font-bold">{selectedTicket.discordUsername || "Unknown"}</span>
                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                    ticketData?.ticket?.status === "open" || selectedTicket.status === "open"
                      ? "bg-green-500/20 text-green-400"
                      : "bg-gray-500/20 text-gray-400"
                  }`}>{ticketData?.ticket?.status || selectedTicket.status}</span>
                </div>
                <div className="flex items-center gap-2">
                  {!selectedTicket.claimedByUserId && (selectedTicket.status === "open") && (
                    <button
                      onClick={claimTicket}
                      className="text-[10px] font-bold px-3 py-1.5 bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 rounded-lg transition-colors"
                    >
                      Claim
                    </button>
                  )}
                  {(ticketData?.ticket?.status === "open" || selectedTicket.status === "open") ? (
                    <button
                      onClick={closeTicket}
                      className="text-[10px] font-bold px-3 py-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors flex items-center gap-1"
                    >
                      <Lock className="w-3 h-3" /> Close
                    </button>
                  ) : (
                    <button
                      onClick={reopenTicket}
                      className="text-[10px] font-bold px-3 py-1.5 bg-green-500/10 text-green-400 hover:bg-green-500/20 rounded-lg transition-colors flex items-center gap-1"
                    >
                      <Unlock className="w-3 h-3" /> Reopen
                    </button>
                  )}
                  <button
                    onClick={() => deleteTicket(selectedTicket.id)}
                    className="text-[10px] font-bold px-3 py-1.5 bg-red-900/20 text-red-500 hover:bg-red-900/30 rounded-lg transition-colors flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" /> Delete
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2" style={{ maxHeight: 300 }}>
                {(ticketData?.messages || []).map((m: any) => (
                  <div key={m.id}>
                    {m.senderType === "system" ? (
                      <div className="flex justify-center my-1">
                        <span className="text-[10px] text-gray-600 bg-white/[0.03] px-3 py-1 rounded-full border border-white/[0.05]">
                          {m.content}
                        </span>
                      </div>
                    ) : (
                      <div className={`flex ${m.senderType === "user" ? "justify-start" : "justify-end"} items-end gap-1.5`}>
                        {m.senderType === "user" && (
                          <div className="w-6 h-6 rounded-full overflow-hidden shrink-0 mb-0.5">
                            {selectedTicket.discordAvatar ? (
                              <img src={selectedTicket.discordAvatar} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full bg-[#5865F2]/30 flex items-center justify-center">
                                <SiDiscord className="w-3 h-3 text-[#7289da]" />
                              </div>
                            )}
                          </div>
                        )}
                        <div className="flex flex-col gap-0.5 max-w-[80%]">
                          <span className="text-[10px] text-gray-600 px-1">{m.senderName}</span>
                          <div className={`px-3 py-2 rounded-xl text-[12px] leading-relaxed ${
                            m.senderType === "user"
                              ? "bg-white/[0.06] text-gray-200 border border-white/[0.06] rounded-bl-sm"
                              : "bg-orange-500 text-white rounded-br-sm"
                          }`}>
                            {m.content}
                          </div>
                        </div>
                        {m.senderType === "support" && (
                          <div className="w-6 h-6 rounded-full overflow-hidden shrink-0 mb-0.5">
                            {m.senderAvatar ? (
                              <img src={m.senderAvatar} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full bg-orange-500/20 flex items-center justify-center">
                                <Headphones className="w-3 h-3 text-orange-400" />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>

              {/* Reply input */}
              {(ticketData?.ticket?.status === "open" || selectedTicket.status === "open") && (
                <div className="px-4 pb-4 pt-2 border-t border-white/[0.05]">
                  <form
                    onSubmit={e => { e.preventDefault(); sendReply(); }}
                    className="flex gap-2 items-center bg-white/[0.04] border border-white/[0.07] rounded-xl px-3 py-2"
                  >
                    <input
                      value={replyInput}
                      onChange={e => setReplyInput(e.target.value)}
                      placeholder="Reply as support..."
                      className="flex-1 bg-transparent text-[12px] text-white placeholder-gray-600 outline-none"
                    />
                    <button
                      type="submit"
                      disabled={!replyInput.trim() || sending}
                      className="text-orange-500 hover:text-orange-400 disabled:opacity-30 transition-colors"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </form>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Team Tab ─────────────────────────────────────────────────────────────────

function TeamTab({ currentUser, adminUsers, roleMeta, canManageTeam }: { currentUser: any; adminUsers: any[]; roleMeta: Record<string, any>; canManageTeam: boolean }) {
  const { toast } = useToast();
  const { data: teamData, isLoading: teamLoading } = useQuery<any>({ queryKey: ["/api/admin/team"] });
  const [addSearch, setAddSearch] = useState("");
  const [addingId, setAddingId] = useState<number | null>(null);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [rolePickFor, setRolePickFor] = useState<number | null>(null);

  const staffRoles = ["support", "moderator", "administrator", "developer", "owner"] as const;
  const teamMembers: any[] = teamData?.team || [];
  const teamIds = new Set(teamMembers.map((m: any) => m.id));

  // Assignable roles based on current user's level
  const myLevel = ROLE_HIERARCHY[currentUser.role as keyof typeof ROLE_HIERARCHY] || 0;
  const assignable = staffRoles.filter(r => (ROLE_HIERARCHY[r] || 0) < myLevel && r !== "owner");

  const nonTeamUsers = (adminUsers || []).filter((u: any) => !teamIds.has(u.id) && u.id !== currentUser.id && u.role === "user");

  const addToTeam = async (userId: number, role: string) => {
    setAddingId(userId);
    try {
      await apiRequest("POST", "/api/admin/team", { userId, role });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/team"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: `Added to team as ${role}` });
    } catch {
      toast({ title: "Failed to add", variant: "destructive" });
    }
    setAddingId(null);
    setRolePickFor(null);
  };

  const removeFromTeam = async (userId: number) => {
    if (!confirm("Remove this person from the team?")) return;
    setRemovingId(userId);
    try {
      await apiRequest("DELETE", `/api/admin/team/${userId}`, {});
      queryClient.invalidateQueries({ queryKey: ["/api/admin/team"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "Removed from team" });
    } catch {
      toast({ title: "Failed to remove", variant: "destructive" });
    }
    setRemovingId(null);
  };

  const changeRole = async (userId: number, role: string) => {
    try {
      await apiRequest("POST", "/api/admin/team", { userId, role });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/team"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: `Role updated to ${role}` });
    } catch {
      toast({ title: "Failed to update role", variant: "destructive" });
    }
    setRolePickFor(null);
  };

  const filteredNonTeam = nonTeamUsers.filter((u: any) =>
    !addSearch || u.username.toLowerCase().includes(addSearch.toLowerCase()) || (u.discordUsername || "").toLowerCase().includes(addSearch.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-black">Team</h1>
        <p className="text-gray-500 text-sm mt-1">Staff members with access to the admin panel</p>
      </div>

      {/* Role hierarchy legend */}
      <div className="flex flex-wrap gap-2">
        {staffRoles.map(r => {
          const m = roleMeta[r];
          const Icon = m?.icon;
          return (
            <div key={r} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-black ${m?.color || "bg-gray-500/10 text-gray-400 border-gray-500/20"}`}>
              {Icon && <Icon className="w-3 h-3" />}
              {m?.label || r}
            </div>
          );
        })}
        <div className="text-[10px] text-gray-600 flex items-center gap-1 ml-1">← lowest · highest →</div>
      </div>

      {/* Current team */}
      <div className="space-y-2">
        <h2 className="text-[11px] font-black uppercase tracking-widest text-gray-500">Current Team ({teamMembers.length})</h2>
        {teamLoading ? (
          <div className="flex items-center justify-center py-8"><Loader2 className="animate-spin w-5 h-5 text-orange-500" /></div>
        ) : teamMembers.length === 0 ? (
          <div className="text-center py-10 bg-[#0e0e0e] border border-white/[0.06] rounded-2xl">
            <Users className="w-8 h-8 mx-auto mb-2 text-gray-700" />
            <p className="text-gray-600 text-sm">No team members yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {teamMembers.map((member: any) => {
              const meta = roleMeta[member.role] || roleMeta.user;
              const Icon = meta.icon || UserIcon;
              const memberLevel = ROLE_HIERARCHY[member.role as keyof typeof ROLE_HIERARCHY] || 0;
              const canEdit = canManageTeam && memberLevel < myLevel && member.id !== currentUser.id;
              return (
                <div key={member.id} className="flex items-center gap-3 px-4 py-3 bg-[#0e0e0e] border border-white/[0.06] rounded-2xl">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-orange-500/15 border border-orange-500/25 flex items-center justify-center shrink-0 overflow-hidden">
                    {member.discordAvatar ? <img src={member.discordAvatar} alt="" className="w-full h-full object-cover" /> : <UserIcon className="w-5 h-5 text-orange-400" />}
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-sm truncate">@{member.username}</p>
                    {member.discordUsername && <p className="text-[10px] text-gray-500 truncate"><SiDiscord className="inline w-2.5 h-2.5 mr-0.5" />{member.discordUsername}</p>}
                  </div>
                  {/* Role badge */}
                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-black shrink-0 ${meta.color}`}>
                    <Icon className="w-3 h-3" />
                    {meta.label}
                  </div>
                  {/* Change role / remove */}
                  {canEdit && (
                    <div className="flex items-center gap-1 shrink-0 relative">
                      <button
                        onClick={() => setRolePickFor(rolePickFor === member.id ? null : member.id)}
                        className="h-7 px-2 text-[10px] font-black text-gray-500 hover:text-white border border-white/10 hover:border-white/20 rounded-lg transition-all"
                      >
                        Change
                      </button>
                      <button
                        onClick={() => removeFromTeam(member.id)}
                        disabled={removingId === member.id}
                        className="h-7 w-7 flex items-center justify-center text-gray-600 hover:text-red-400 border border-white/10 hover:border-red-500/30 rounded-lg transition-all"
                      >
                        {removingId === member.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
                      </button>
                      {rolePickFor === member.id && (
                        <div className="absolute top-full right-0 mt-1 bg-[#111] border border-white/10 rounded-xl p-1.5 space-y-0.5 z-20 min-w-[130px] shadow-2xl">
                          {assignable.map(r => {
                            const rm = roleMeta[r];
                            const RI = rm?.icon;
                            return (
                              <button key={r} onClick={() => changeRole(member.id, r)}
                                className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-black transition-all ${member.role === r ? "bg-orange-500/15 text-orange-400" : "hover:bg-white/5 text-gray-400"}`}>
                                {RI && <RI className="w-3 h-3" />}
                                {rm?.label || r}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add to team */}
      {canManageTeam && (
        <div className="space-y-3">
          <h2 className="text-[11px] font-black uppercase tracking-widest text-gray-500">Add Member</h2>
          <input
            value={addSearch}
            onChange={e => setAddSearch(e.target.value)}
            placeholder="Search users..."
            className="w-full h-9 bg-black/60 border border-white/5 focus:border-orange-500/50 rounded-lg px-3 text-xs text-white placeholder-gray-600 outline-none transition-colors"
          />
          {filteredNonTeam.length === 0 && addSearch && (
            <p className="text-xs text-gray-600 text-center py-4">No users found</p>
          )}
          {filteredNonTeam.slice(0, 10).map((u: any) => (
            <div key={u.id} className="flex items-center gap-3 px-4 py-3 bg-[#0a0a0a] border border-white/[0.05] rounded-2xl">
              <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center shrink-0 overflow-hidden">
                {u.discordAvatar ? <img src={u.discordAvatar} alt="" className="w-full h-full object-cover" /> : <UserIcon className="w-4 h-4 text-gray-500" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm truncate text-gray-300">@{u.username}</p>
                {u.discordUsername && <p className="text-[10px] text-gray-600"><SiDiscord className="inline w-2.5 h-2.5 mr-0.5" />{u.discordUsername}</p>}
              </div>
              <div className="flex gap-1">
                {assignable.map(r => {
                  const rm = roleMeta[r];
                  return (
                    <button key={r} onClick={() => addToTeam(u.id, r)} disabled={addingId === u.id}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-black border transition-all ${rm?.color || "border-gray-600 text-gray-500"} hover:opacity-90 disabled:opacity-40`}>
                      {addingId === u.id ? <Loader2 className="w-3 h-3 animate-spin" /> : (rm?.label || r)}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Our Team Admin Tab ────────────────────────────────────────────────────────

const OUR_TEAM_ROLES = ["Founder", "Manager", "Admin", "Staff"] as const;
const OUR_TEAM_ROLE_COLORS: Record<string, string> = {
  Founder: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  Manager: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  Admin: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  Staff: "bg-blue-500/15 text-blue-400 border-blue-500/30",
};

const EMPTY_FORM = { name: "", role: "Founder" as string, description: "", tags: "", discordUser: "", discordUserId: "", profile: "", colour: "#F97316", avatarUrl: "" };

function OurTeamAdminTab() {
  const { toast } = useToast();
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [fetching, setFetching] = useState(false);

  const { data: teamMembers = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/our-team"] });

  const setField = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const fetchDiscordUser = async (id: string) => {
    if (!id.trim()) return;
    setFetching(true);
    try {
      const res = await fetch(`/api/admin/discord-user/${id.trim()}`, { credentials: "include" });
      if (!res.ok) { toast({ title: "Discord user not found", variant: "destructive" }); setFetching(false); return; }
      const data = await res.json();
      setForm(f => ({
        ...f,
        discordUser: data.globalName || data.username || f.discordUser,
        avatarUrl: data.avatar || f.avatarUrl,
      }));
      toast({ title: "Discord user fetched!" });
    } catch { toast({ title: "Lookup failed", variant: "destructive" }); }
    setFetching(false);
  };

  const openCreate = () => { setForm(EMPTY_FORM); setEditId(null); setShowForm(true); };
  const openEdit = (m: any) => {
    setForm({
      name: m.name || "", role: m.role || "Founder", description: m.description || "",
      tags: Array.isArray(m.tags) ? m.tags.join(", ") : "",
      discordUser: m.discordUser || "", discordUserId: m.discordUserId || "",
      profile: m.profile || "", colour: m.colour || "#F97316", avatarUrl: m.avatarUrl || "",
    });
    setEditId(m.id);
    setShowForm(true);
  };

  const save = async () => {
    if (!form.name.trim() || !form.role || !form.description.trim() || !form.colour.trim() || !form.discordUser.trim() || !form.profile.trim()) {
      toast({ title: "Please fill all required fields", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      role: form.role,
      description: form.description.trim(),
      tags: form.tags.split(",").map(t => t.trim()).filter(Boolean),
      discordUser: form.discordUser.trim(),
      discordUserId: form.discordUserId.trim(),
      profile: form.profile.trim(),
      colour: form.colour,
      avatarUrl: form.avatarUrl.trim(),
    };
    try {
      if (editId !== null) {
        await apiRequest("PATCH", `/api/admin/our-team/${editId}`, payload);
        toast({ title: "Member updated!" });
      } else {
        await apiRequest("POST", "/api/admin/our-team", payload);
        toast({ title: "Member created!" });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/our-team"] });
      setShowForm(false);
    } catch (e: any) {
      toast({ title: e?.message || "Failed to save", variant: "destructive" });
    }
    setSaving(false);
  };

  const del = async (id: number) => {
    if (!confirm("Delete this team member?")) return;
    setDeleting(id);
    try {
      await apiRequest("DELETE", `/api/admin/our-team/${id}`, {});
      queryClient.invalidateQueries({ queryKey: ["/api/our-team"] });
      toast({ title: "Deleted" });
    } catch { toast({ title: "Failed to delete", variant: "destructive" }); }
    setDeleting(null);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-black">Our Team</h1>
          <p className="text-gray-500 text-sm mt-1">Manage the team shown at <span className="text-orange-400 font-mono">/team</span></p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-400 text-black text-[11px] font-black uppercase tracking-widest transition-colors">
          <Plus className="w-3.5 h-3.5" /> Add Member
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-[#0e0e0e] border border-white/10 rounded-2xl p-6 space-y-4">
          <h2 className="text-sm font-black uppercase tracking-widest text-gray-400">{editId !== null ? "Edit Member" : "New Member"}</h2>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-gray-500">Name *</label>
              <input value={form.name} onChange={e => setField("name", e.target.value)}
                className="w-full h-9 bg-black/60 border border-white/5 focus:border-orange-500/50 rounded-lg px-3 text-xs text-white placeholder-gray-600 outline-none"
                placeholder="Display name" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-gray-500">Role *</label>
              <select value={form.role} onChange={e => setField("role", e.target.value)}
                className="w-full h-9 bg-black/60 border border-white/5 focus:border-orange-500/50 rounded-lg px-3 text-xs text-white outline-none">
                {OUR_TEAM_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-gray-500">Description *</label>
            <textarea value={form.description} onChange={e => setField("description", e.target.value)}
              rows={3} placeholder="About this team member..."
              className="w-full bg-black/60 border border-white/5 focus:border-orange-500/50 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-600 outline-none resize-none" />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-gray-500">Tags (comma-separated)</label>
            <input value={form.tags} onChange={e => setField("tags", e.target.value)}
              className="w-full h-9 bg-black/60 border border-white/5 focus:border-orange-500/50 rounded-lg px-3 text-xs text-white placeholder-gray-600 outline-none"
              placeholder="e.g. Developer, Designer, Support" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-gray-500">Discord User * <span className="text-gray-600">(e.g. @username)</span></label>
              <input value={form.discordUser} onChange={e => setField("discordUser", e.target.value)}
                className="w-full h-9 bg-black/60 border border-white/5 focus:border-orange-500/50 rounded-lg px-3 text-xs text-white placeholder-gray-600 outline-none"
                placeholder="@username" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-gray-500">Discord User ID <span className="text-gray-600">(optional – auto-fills)</span></label>
              <div className="flex gap-1.5">
                <input value={form.discordUserId} onChange={e => setField("discordUserId", e.target.value)}
                  className="flex-1 h-9 bg-black/60 border border-white/5 focus:border-orange-500/50 rounded-lg px-3 text-xs text-white placeholder-gray-600 outline-none"
                  placeholder="Discord user ID" />
                <button onClick={() => fetchDiscordUser(form.discordUserId)} disabled={fetching || !form.discordUserId.trim()}
                  className="h-9 px-3 rounded-lg bg-[#5865F2]/20 border border-[#5865F2]/30 text-[#7289da] text-[10px] font-black disabled:opacity-40 hover:bg-[#5865F2]/30 transition-colors flex items-center gap-1">
                  {fetching ? <Loader2 className="w-3 h-3 animate-spin" /> : <SiDiscord className="w-3 h-3" />}
                  Fetch
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-gray-500">Profile URL *</label>
              <input value={form.profile} onChange={e => setField("profile", e.target.value)}
                className="w-full h-9 bg-black/60 border border-white/5 focus:border-orange-500/50 rounded-lg px-3 text-xs text-white placeholder-gray-600 outline-none"
                placeholder="https://hexed.lol/username or /username" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-gray-500">Avatar URL</label>
              <input value={form.avatarUrl} onChange={e => setField("avatarUrl", e.target.value)}
                className="w-full h-9 bg-black/60 border border-white/5 focus:border-orange-500/50 rounded-lg px-3 text-xs text-white placeholder-gray-600 outline-none"
                placeholder="https://... (auto-filled from Discord ID)" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-gray-500">Colour * <span className="text-gray-600">(card neon glow)</span></label>
            <div className="flex items-center gap-3">
              <div className="relative w-9 h-9 rounded-lg border border-white/10 overflow-hidden shrink-0" style={{ backgroundColor: form.colour }}>
                <input type="color" value={form.colour} onChange={e => setField("colour", e.target.value)}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
              </div>
              <input value={form.colour} onChange={e => setField("colour", e.target.value)}
                className="flex-1 h-9 bg-black/60 border border-white/5 focus:border-orange-500/50 rounded-lg px-3 text-xs text-white font-mono outline-none"
                placeholder="#F97316" />
              <div className="px-3 h-9 rounded-lg flex items-center text-xs font-black shrink-0"
                style={{ background: form.colour + "20", border: `1px solid ${form.colour}40`, color: form.colour, boxShadow: `0 0 12px ${form.colour}50` }}>
                Preview
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button onClick={save} disabled={saving}
              className="flex-1 h-9 rounded-xl bg-orange-500 hover:bg-orange-400 text-black text-xs font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-1.5 disabled:opacity-60">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              {editId !== null ? "Update" : "Create"}
            </button>
            <button onClick={() => setShowForm(false)} className="h-9 px-4 rounded-xl border border-white/10 text-gray-400 hover:text-white text-xs font-black uppercase transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Member list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="animate-spin w-5 h-5 text-orange-500" /></div>
      ) : (teamMembers as any[]).length === 0 ? (
        <div className="text-center py-14 bg-[#0e0e0e] border border-white/[0.06] rounded-2xl">
          <Users className="w-10 h-10 mx-auto mb-3 text-gray-700" />
          <p className="text-gray-600 font-black">No team members yet</p>
          <p className="text-gray-700 text-xs mt-1">Click "Add Member" to get started</p>
        </div>
      ) : (
        <div className="space-y-3">
          {(teamMembers as any[]).map((m: any) => (
            <div key={m.id} className="flex items-center gap-4 p-4 bg-[#0e0e0e] border border-white/[0.06] rounded-2xl"
              style={{ boxShadow: `0 0 20px 0 ${m.colour}18` }}>
              <div className="w-12 h-12 rounded-2xl shrink-0 overflow-hidden bg-black/40 border"
                style={{ borderColor: m.colour + "44" }}>
                {m.avatarUrl
                  ? <img src={m.avatarUrl} alt={m.name} className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center text-lg font-black" style={{ color: m.colour }}>{m.name[0]}</div>
                }
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-black text-sm">{m.name}</span>
                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${OUR_TEAM_ROLE_COLORS[m.role] || "bg-gray-500/10 text-gray-400 border-gray-500/20"}`}>{m.role}</span>
                </div>
                {m.discordUser && <p className="text-[10px] text-gray-500 mt-0.5"><SiDiscord className="inline w-2.5 h-2.5 mr-0.5" />{m.discordUser}</p>}
                {Array.isArray(m.tags) && m.tags.length > 0 && (
                  <div className="flex gap-1 flex-wrap mt-1">
                    {m.tags.slice(0, 3).map((t: string) => (
                      <span key={t} className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: m.colour + "18", color: m.colour, border: `1px solid ${m.colour}30` }}>{t}</span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-1.5 shrink-0">
                <button onClick={() => openEdit(m)} className="h-8 w-8 flex items-center justify-center border border-white/10 hover:border-orange-500/30 hover:text-orange-400 rounded-lg transition-colors text-gray-500">
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => del(m.id)} disabled={deleting === m.id}
                  className="h-8 w-8 flex items-center justify-center border border-white/10 hover:border-red-500/30 hover:text-red-400 rounded-lg transition-colors text-gray-500">
                  {deleting === m.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Discord Bot Tab ───────────────────────────────────────────────────────────

function DiscordBotTab() {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    DISCORD_CLIENT_ID: "",
    DISCORD_CLIENT_SECRET: "",
    DISCORD_BOT_TOKEN: "",
    DISCORD_GUILD_ID: "",
    DISCORD_LOGIN_ENABLED: "true",
  });
  const [loaded, setLoaded] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [showToken, setShowToken] = useState(false);

  useEffect(() => {
    fetch("/api/admin/bot-settings", { credentials: "include" })
      .then(r => r.json())
      .then(data => {
        setSettings({
          DISCORD_CLIENT_ID: data.DISCORD_CLIENT_ID || "",
          DISCORD_CLIENT_SECRET: data.DISCORD_CLIENT_SECRET || "",
          DISCORD_BOT_TOKEN: data.DISCORD_BOT_TOKEN || "",
          DISCORD_GUILD_ID: data.DISCORD_GUILD_ID || "",
          DISCORD_LOGIN_ENABLED: data.DISCORD_LOGIN_ENABLED ?? "true",
        });
        setLoaded(true);
      });
  }, []);

  async function save() {
    setSaving(true);
    try {
      // Never send DISCORD_CALLBACK_URL — it is always auto-computed from the domain
      await apiRequest("POST", "/api/admin/bot-settings", {
        DISCORD_CLIENT_ID: settings.DISCORD_CLIENT_ID,
        DISCORD_CLIENT_SECRET: settings.DISCORD_CLIENT_SECRET,
        DISCORD_BOT_TOKEN: settings.DISCORD_BOT_TOKEN,
        DISCORD_GUILD_ID: settings.DISCORD_GUILD_ID,
        DISCORD_LOGIN_ENABLED: settings.DISCORD_LOGIN_ENABLED,
      });
      toast({ title: "Settings saved", description: "Changes are live immediately." });
    } catch (_) {
      toast({ title: "Failed to save", variant: "destructive" });
    }
    setSaving(false);
  }

  const [callbackHint, setCallbackHint] = useState<string>("/auth/discord/callback");

  useEffect(() => {
    fetch("/api/admin/discord-callback-url", { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.url) setCallbackHint(data.url); })
      .catch(() => {
        if (typeof window !== "undefined")
          setCallbackHint(`${window.location.protocol}//${window.location.host}/auth/discord/callback`);
      });
  }, []);

  const discordEnabled = settings.DISCORD_LOGIN_ENABLED !== "false";
  const hasCredentials = !!(settings.DISCORD_CLIENT_ID && settings.DISCORD_CLIENT_SECRET);

  const FieldRow = ({ label, hint, optional, children }: { label: string; hint?: string; optional?: boolean; children: React.ReactNode }) => (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <Label className="text-[11px] font-black uppercase tracking-widest text-gray-500">{label}</Label>
        {optional && <span className="text-[9px] font-black uppercase tracking-widest text-gray-700 bg-white/[0.04] px-1.5 py-0.5 rounded">Optional</span>}
      </div>
      {hint && <p className="text-[10px] text-gray-600 mb-1">{hint}</p>}
      {children}
    </div>
  );

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h1 className="text-2xl font-black">Discord Login Setup</h1>
        <p className="text-gray-500 text-sm mt-1">Configure Discord OAuth2 login, bot integration, and role syncing.</p>
      </div>

      {/* Enable / Disable Toggle */}
      <div className="bg-[#0e0e0e] border border-white/[0.07] rounded-2xl p-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-black">Discord Login</p>
          <p className="text-[11px] text-gray-500 mt-0.5">
            {discordEnabled
              ? "Enabled — users can log in with Discord on the login page."
              : "Disabled — the Discord button shows \"SOON\" on the login page."}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setSettings(s => ({ ...s, DISCORD_LOGIN_ENABLED: s.DISCORD_LOGIN_ENABLED === "false" ? "true" : "false" }))}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${discordEnabled ? "bg-[#5865F2]" : "bg-white/10"}`}
          data-testid="toggle-discord-enabled"
        >
          <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${discordEnabled ? "translate-x-5" : "translate-x-0"}`} />
        </button>
      </div>

      {/* Redirect URL box — shown prominently so users know what to put in Discord */}
      <div className="bg-[#0a0a12] border border-[#5865F2]/30 rounded-2xl p-4 space-y-2">
        <div className="flex items-center gap-2">
          <SiDiscord className="w-3.5 h-3.5 text-[#7289da]" />
          <span className="text-[11px] font-black uppercase tracking-widest text-[#7289da]">Your Redirect URL</span>
        </div>
        <p className="text-[10px] text-gray-500">Copy this exact URL and paste it into <b className="text-gray-300">Discord Developer Portal → OAuth2 → Redirects</b>. This is specific to your domain and must match exactly.</p>
        <div className="flex gap-2 mt-1">
          <code className="flex-1 bg-black/60 border border-[#5865F2]/20 rounded-lg px-3 py-2 text-[11px] font-mono text-[#7289da] break-all">
            {callbackHint}
          </code>
          <Button type="button" variant="outline" size="sm"
            onClick={() => { navigator.clipboard.writeText(callbackHint); toast({ title: "Copied!", description: "Paste this into Discord → OAuth2 → Redirects" }); }}
            className="shrink-0 border-[#5865F2]/30 text-[#7289da] hover:bg-[#5865F2]/10 h-auto px-3 text-xs font-black"
            data-testid="button-copy-redirect-url">
            Copy
          </Button>
        </div>
      </div>

      {/* Step guide */}
      <div className="bg-[#0a0a0a] border border-[#5865F2]/15 rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Info className="w-4 h-4 text-[#7289da]" />
          <span className="text-[11px] font-black uppercase tracking-widest text-[#7289da]">Step-by-Step Setup Guide</span>
        </div>
        <div className="space-y-3 text-[11px] text-gray-400">
          <div className="flex gap-3">
            <span className="text-white font-black shrink-0 w-4">1.</span>
            <div>
              Go to{" "}
              <a href="https://discord.com/developers/applications" target="_blank" rel="noopener noreferrer" className="text-[#7289da] hover:underline font-bold">discord.com/developers/applications</a>
              {" "}and click <b className="text-white">New Application</b>. Give it any name (e.g. "Hexed Login") and click <b className="text-white">Create</b>.
            </div>
          </div>
          <div className="flex gap-3">
            <span className="text-white font-black shrink-0 w-4">2.</span>
            <div>
              In the left sidebar, click <b className="text-white">OAuth2</b>. Under <b className="text-white">Client Information</b>, copy your <b className="text-white">Client ID</b> and click <b className="text-white">Reset Secret</b> to generate and copy the <b className="text-white">Client Secret</b>. Paste them into the fields below.
            </div>
          </div>
          <div className="flex gap-3">
            <span className="text-white font-black shrink-0 w-4">3.</span>
            <div>
              Still in <b className="text-white">OAuth2</b>, scroll down to <b className="text-white">Redirects</b>. Click <b className="text-white">Add Redirect</b> and paste the <b className="text-[#7289da]">Redirect URL</b> shown above — it must match your domain exactly. Click <b className="text-white">Save Changes</b>.
            </div>
          </div>
          <div className="flex gap-3">
            <span className="text-white font-black shrink-0 w-4">4.</span>
            <div>
              <span className="text-gray-500">(Optional — for bot features)</span> In the sidebar, click <b className="text-white">Bot</b> → <b className="text-white">Add Bot</b>. Copy the <b className="text-white">Token</b> (click Reset Token if needed). Under <b className="text-white">Privileged Gateway Intents</b>, enable <b className="text-white">Server Members Intent</b>. Paste the token below.
            </div>
          </div>
          <div className="flex gap-3">
            <span className="text-white font-black shrink-0 w-4">5.</span>
            <div>
              <span className="text-gray-500">(Optional — for role sync)</span> Get your Discord server's <b className="text-white">Guild ID</b> by right-clicking your server icon in Discord and selecting <b className="text-white">Copy Server ID</b>. (You need <b className="text-white">Developer Mode</b> enabled: Discord Settings → Advanced → Developer Mode.) Paste it below.
            </div>
          </div>
          <div className="flex gap-3">
            <span className="text-white font-black shrink-0 w-4">6.</span>
            <div>
              Enable the <b className="text-white">Discord Login</b> toggle at the top, then click <b className="text-white">Save Settings</b>. Users can immediately log in with Discord — no restart needed.
            </div>
          </div>
        </div>
      </div>

      {/* Credentials */}
      <div className="bg-[#0e0e0e] border border-[#5865F2]/20 rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2.5 mb-1">
          <SiDiscord className="w-4 h-4 text-[#7289da]" />
          <span className="font-black text-sm">OAuth2 &amp; Bot Credentials</span>
        </div>

        <FieldRow label="Client ID" hint="Discord Developer Portal → OAuth2 → Client Information → Client ID">
          <Input
            value={settings.DISCORD_CLIENT_ID}
            onChange={e => setSettings(s => ({ ...s, DISCORD_CLIENT_ID: e.target.value }))}
            placeholder="1234567890123456789"
            className="bg-black/60 border-white/5 h-9 text-sm font-mono"
            data-testid="input-discord-client-id"
          />
        </FieldRow>

        <FieldRow label="Client Secret" hint="Discord Developer Portal → OAuth2 → Client Information → Reset Secret">
          <div className="relative">
            <Input
              type={showSecret ? "text" : "password"}
              value={settings.DISCORD_CLIENT_SECRET}
              onChange={e => setSettings(s => ({ ...s, DISCORD_CLIENT_SECRET: e.target.value }))}
              placeholder="••••••••••••••••••••••••••••••••"
              className="bg-black/60 border-white/5 h-9 text-sm font-mono pr-10"
              data-testid="input-discord-client-secret"
            />
            <button type="button" onClick={() => setShowSecret(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors">
              {showSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
        </FieldRow>

        <FieldRow label="Bot Token" hint="Discord Developer Portal → Bot → Reset Token" optional>
          <div className="relative">
            <Input
              type={showToken ? "text" : "password"}
              value={settings.DISCORD_BOT_TOKEN}
              onChange={e => setSettings(s => ({ ...s, DISCORD_BOT_TOKEN: e.target.value }))}
              placeholder="••••••••••••••••••••••••••••••••••••••"
              className="bg-black/60 border-white/5 h-9 text-sm font-mono pr-10"
              data-testid="input-discord-bot-token"
            />
            <button type="button" onClick={() => setShowToken(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors">
              {showToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
        </FieldRow>

        <FieldRow label="Guild ID (Server ID)" hint="Right-click your Discord server icon → Copy Server ID (requires Developer Mode in Discord settings)" optional>
          <Input
            value={settings.DISCORD_GUILD_ID}
            onChange={e => setSettings(s => ({ ...s, DISCORD_GUILD_ID: e.target.value }))}
            placeholder="1234567890123456789"
            className="bg-black/60 border-white/5 h-9 text-sm font-mono"
            data-testid="input-discord-guild-id"
          />
        </FieldRow>

        <div className="pt-3 border-t border-white/[0.05] flex items-center gap-3">
          <Button
            onClick={save}
            disabled={saving}
            className="bg-orange-500 hover:bg-orange-400 text-black font-black border-0"
            data-testid="button-save-bot-settings"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" /> : <Save className="w-3.5 h-3.5 mr-2" />}
            Save Settings
          </Button>
          <p className="text-[11px] text-gray-600">Changes apply immediately without restart.</p>
        </div>
      </div>

      {/* Status indicators */}
      <div className="grid grid-cols-2 gap-3">
        {[
          {
            label: "Discord Login",
            ok: discordEnabled && hasCredentials,
            warn: discordEnabled && !hasCredentials,
            desc: !discordEnabled ? "Toggle is off — shows SOON" : "Add Client ID & Secret above",
          },
          { label: "Role Sync", ok: !!(settings.DISCORD_BOT_TOKEN && settings.DISCORD_GUILD_ID), desc: "Add Bot Token & Guild ID above" },
        ].map(({ label, ok, warn, desc }) => (
          <div key={label} className={`flex items-start gap-3 p-3.5 rounded-2xl border ${ok ? "bg-green-500/[0.04] border-green-500/20" : warn ? "bg-yellow-500/[0.03] border-yellow-500/10" : "bg-red-500/[0.03] border-red-500/10"}`}>
            {ok ? <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0 mt-0.5" /> : <AlertCircle className={`w-4 h-4 shrink-0 mt-0.5 ${warn ? "text-yellow-500" : "text-gray-600"}`} />}
            <div>
              <p className={`text-xs font-black ${ok ? "text-green-400" : warn ? "text-yellow-500" : "text-gray-500"}`}>{label}</p>
              <p className="text-[10px] text-gray-600">{ok ? "Active" : desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── (Spin Admin Tab removed) ────────────────────────────────────────────────

const N_SPIN = 7;
const SLICE_DEG_SPIN = 360 / N_SPIN;
const SPIN_PRIZES_DISPLAY = [
  { label: "Free Premium",  color: "#7c3aed" },
  { label: "+1 Alias",      color: "#ea580c" },
  { label: "+1 Tag",        color: "#16a34a" },
  { label: "Winner Badge",  color: "#ca8a04" },
  { label: "Nothing",       color: "#374151" },
  { label: "Custom Badge",  color: "#be185d" },
  { label: "Nothing",       color: "#1f2937" },
];

function AdminWheelSVG({ rotation, spinning }: { rotation: number; spinning: boolean }) {
  const cx = 140, cy = 140, r = 128;
  return (
    <svg
      width="280" height="280"
      style={{
        transform: `rotate(${rotation}deg)`,
        transition: spinning ? "transform 5s cubic-bezier(0.17, 0.67, 0.12, 0.99)" : "none",
        filter: "drop-shadow(0 0 18px rgba(0,0,0,0.7))",
      }}
    >
      {SPIN_PRIZES_DISPLAY.map((prize, i) => {
        const startRad = (-Math.PI / 2) + i * (2 * Math.PI / N_SPIN);
        const endRad = startRad + (2 * Math.PI / N_SPIN);
        const x1 = cx + r * Math.cos(startRad);
        const y1 = cy + r * Math.sin(startRad);
        const x2 = cx + r * Math.cos(endRad);
        const y2 = cy + r * Math.sin(endRad);
        const centerDeg = (i + 0.5) * SLICE_DEG_SPIN;
        const textR = r * 0.67;
        return (
          <g key={i}>
            <path
              d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2} Z`}
              fill={prize.color}
              stroke="#000"
              strokeWidth="2"
            />
            <g transform={`rotate(${centerDeg}, ${cx}, ${cy})`}>
              <text
                x={cx} y={cy - textR}
                textAnchor="middle" dominantBaseline="middle"
                fontSize="7" fill="white" fontWeight="bold"
                style={{ letterSpacing: "0.4px" }}
              >
                {prize.label}
              </text>
            </g>
          </g>
        );
      })}
      <circle cx={cx} cy={cy} r={16} fill="#111" stroke="#333" strokeWidth="3" />
      <circle cx={cx} cy={cy} r={9} fill="#222" />
    </svg>
  );
}

// ─── Stats Admin Tab ─────────────────────────────────────────────────────────

function StatsAdminTab({ adminUsers }: { adminUsers: any[] }) {
  const { toast } = useToast();

  // User online/offline status change
  const [userSearch, setUserSearch] = useState("");
  const [pendingStatus, setPendingStatus] = useState<Record<number, string>>({});
  const statusMut = useMutation({
    mutationFn: ({ id, userStatus }: { id: number; userStatus: string }) =>
      apiRequest("PATCH", `/api/admin/users/${id}/status`, { userStatus }),
    onSuccess: () => {
      toast({ title: "User status updated." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
    onError: (err: any) => {
      const msg = (err?.message || "Failed").replace(/^\d+:\s*/, "");
      toast({ title: msg, variant: "destructive" });
    },
  });

  const filteredUsers = (adminUsers || [])
    .filter((u: any) => !userSearch || u.username?.toLowerCase().includes(userSearch.toLowerCase()) || u.email?.toLowerCase().includes(userSearch.toLowerCase()))
    .slice(0, 30);

  return (
    <div className="space-y-8">
      {/* User Online Status Management */}
      <div className="space-y-4">
        <div>
          <h2 className="text-base font-black text-white">User Online Status</h2>
          <p className="text-gray-500 text-xs mt-1">Set any user's account status to active or disabled.</p>
        </div>
        <Input
          value={userSearch}
          onChange={e => setUserSearch(e.target.value)}
          placeholder="Search by username or email..."
          className="bg-[#0e0e0e] border-white/10 text-white max-w-sm"
          data-testid="input-user-status-search"
        />
        <div className="space-y-2">
          {filteredUsers.length === 0 && (
            <p className="text-gray-600 text-sm py-4 text-center">No users found.</p>
          )}
          {filteredUsers.map((u: any) => {
            const current = pendingStatus[u.id] ?? (u.userStatus || "active");
            return (
              <div
                key={u.id}
                className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#0e0e0e] border border-white/[0.06]"
                data-testid={`row-user-status-${u.id}`}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-black text-sm text-white truncate">{u.username}</p>
                  <p className="text-[10px] text-gray-500 truncate">{u.email}</p>
                </div>
                <div className={`flex items-center gap-1.5 text-[10px] font-black px-2.5 py-1 rounded-full ${current === "active" ? "bg-green-500/15 text-green-400" : "bg-red-500/15 text-red-400"}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${current === "active" ? "bg-green-400" : "bg-red-400"}`} />
                  {current === "active" ? "Active" : "Disabled"}
                </div>
                <Select
                  value={current}
                  onValueChange={val => setPendingStatus(prev => ({ ...prev, [u.id]: val }))}
                >
                  <SelectTrigger className="w-32 bg-[#0a0a0a] border-white/10 text-xs text-white" data-testid={`select-status-${u.id}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="disabled">Disabled</SelectItem>
                  </SelectContent>
                </Select>
                <button
                  onClick={() => statusMut.mutate({ id: u.id, userStatus: current })}
                  disabled={statusMut.isPending}
                  data-testid={`button-change-status-${u.id}`}
                  className="px-3 py-1.5 rounded-lg bg-orange-500 text-black text-[11px] font-black hover:bg-orange-400 transition-all disabled:opacity-50 shrink-0"
                >
                  Apply
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Easter Event Control ────────────────────────────────────────────────────

function EasterEventControl() {
  const { toast } = useToast();
  const { data: status, isLoading } = useQuery<{ enabled: boolean; submitted: boolean }>({
    queryKey: ["/api/easter-event/status"],
  });

  const toggleMut = useMutation({
    mutationFn: (enabled: boolean) => apiRequest("POST", "/api/admin/easter-event/toggle", { enabled }),
    onSuccess: (_data: any, enabled: boolean) => {
      queryClient.invalidateQueries({ queryKey: ["/api/easter-event/status"] });
      toast({ title: enabled ? "🐣 Easter Event is now LIVE!" : "Easter Event turned offline." });
    },
    onError: (e: any) => toast({ title: e?.message || "Failed to toggle", variant: "destructive" }),
  });

  const enabled = status?.enabled ?? false;

  return (
    <div className="bg-[#0e0e0e] border border-white/[0.06] rounded-2xl p-6 space-y-5">
      <div>
        <h2 className="text-base font-black text-white">🐣 Easter Event 2026</h2>
        <p className="text-gray-500 text-xs mt-1">Toggle whether the Easter Event page is live and accepting submissions.</p>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-black ${enabled ? "bg-pink-500/10 border-pink-500/30 text-pink-400" : "bg-white/5 border-white/10 text-gray-500"}`}>
          <span className={`w-2 h-2 rounded-full ${enabled ? "bg-pink-400 animate-pulse" : "bg-gray-600"}`} />
          {enabled ? "Easter Event LIVE" : "Easter Event Offline"}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => toggleMut.mutate(true)}
            disabled={enabled || toggleMut.isPending}
            data-testid="button-easter-online"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            style={{ background: "linear-gradient(135deg, #ff9ecc, #c4a8e8)", color: "#000" }}
          >
            🐰 Go Online
          </button>
          <button
            onClick={() => toggleMut.mutate(false)}
            disabled={!enabled || toggleMut.isPending}
            data-testid="button-easter-offline"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-400 text-xs font-black disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/10 transition-all"
          >
            Take Offline
          </button>
        </div>
      </div>

      {enabled && (
        <div className="p-4 rounded-xl text-xs space-y-1" style={{ background: "rgba(255,158,204,0.05)", border: "1px solid rgba(255,158,204,0.15)" }}>
          <p className="font-black" style={{ color: "#ff9ecc" }}>Event is currently live!</p>
          <p className="text-gray-400">Users can visit <span className="font-mono text-gray-300">/easter-event</span> to submit their profiles. Each user may only submit once.</p>
        </div>
      )}

      {isLoading && <div className="w-5 h-5 border-2 border-pink-400 border-t-transparent rounded-full animate-spin" />}
    </div>
  );
}

// ─── Website Management Tab ─────────────────────────────────────────────────

function WebsiteManagementTab({ adminUsers, currentUser }: { adminUsers: any[]; currentUser: any }) {
  const { toast } = useToast();
  const [wSub, setWSub] = useState<"announcements" | "users" | "website-controls" | "webhooks" | "products" | "easter-event" | "decorations" | "april-fools">("website-controls");

  // ── April Fools ──
  const { data: aprilFoolsStatus, refetch: refetchAprilFools } = useQuery<{ enabled: boolean }>({
    queryKey: ["/api/april-fools"],
    enabled: canManageWebsite(currentUser?.role),
  });
  const toggleAprilFoolsMut = useMutation({
    mutationFn: (enabled: boolean) => apiRequest("POST", "/api/admin/april-fools", { enabled }),
    onSuccess: (_, enabled) => {
      toast({ title: enabled ? "🎉 April Fools mode enabled!" : "April Fools mode disabled." });
      refetchAprilFools();
      queryClient.invalidateQueries({ queryKey: ["/api/april-fools"] });
    },
    onError: () => toast({ title: "Failed to update", variant: "destructive" }),
  });

  // ── Products ──
  const { data: adminProducts = [], isLoading: prodLoading, refetch: refetchProducts } = useQuery<any[]>({
    queryKey: ["/api/admin/products"],
    enabled: canManageWebsite(currentUser?.role),
  });
  const [prodFormOpen, setProdFormOpen] = useState(false);
  const [editingProd, setEditingProd] = useState<any | null>(null);
  const emptyProdForm = { slug: "", name: "", description: "", price: "", salePrice: "", icon: "📦", imageUrl: "", features: [] as string[], badgeName: "", grantsPremium: false, color: "#F97316", bgColor: "#0d0d0d" };
  const [prodForm, setProdForm] = useState<typeof emptyProdForm>(emptyProdForm);
  const [prodAdvInput, setProdAdvInput] = useState("");
  const [prodMenuOpen, setProdMenuOpen] = useState<number | null>(null);

  const openCreateProd = () => { setEditingProd(null); setProdForm(emptyProdForm); setProdAdvInput(""); setProdFormOpen(true); };
  const openEditProd = (p: any) => {
    setEditingProd(p);
    setProdForm({
      slug: p.slug,
      name: p.name,
      description: p.description ?? "",
      price: String(p.price ?? ""),
      salePrice: p.sale_price != null ? String(p.sale_price) : "",
      icon: p.icon ?? "📦",
      imageUrl: p.image_url ?? "",
      features: Array.isArray(p.features) ? p.features : [],
      badgeName: p.badge_name ?? "",
      grantsPremium: p.grants_premium ?? false,
      color: p.color ?? "#F97316",
      bgColor: p.bg_color ?? "#0d0d0d",
    });
    setProdAdvInput("");
    setProdFormOpen(true);
    setProdMenuOpen(null);
  };

  const saveProd = useMutation({
    mutationFn: async () => {
      const payload = {
        slug: prodForm.slug,
        name: prodForm.name,
        description: prodForm.description,
        price: parseFloat(prodForm.price) || 0,
        salePrice: prodForm.salePrice ? parseFloat(prodForm.salePrice) : null,
        icon: prodForm.icon,
        imageUrl: prodForm.imageUrl || null,
        features: prodForm.features,
        badgeName: prodForm.badgeName || null,
        grantsPremium: prodForm.grantsPremium,
        color: prodForm.color,
        bgColor: prodForm.bgColor,
      };
      if (editingProd) {
        return apiRequest("PATCH", `/api/admin/products/${editingProd.id}`, payload);
      } else {
        return apiRequest("POST", "/api/admin/products", payload);
      }
    },
    onSuccess: () => {
      toast({ title: editingProd ? "Product updated" : "Product created" });
      refetchProducts();
      queryClient.invalidateQueries({ queryKey: ["/api/shop/products"] });
      setProdFormOpen(false);
      setEditingProd(null);
    },
    onError: (e: any) => toast({ title: e?.message || "Failed", variant: "destructive" }),
  });

  const deleteProd = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/admin/products/${id}`, {}),
    onSuccess: () => {
      toast({ title: "Product deleted" });
      refetchProducts();
      queryClient.invalidateQueries({ queryKey: ["/api/shop/products"] });
    },
    onError: () => toast({ title: "Failed to delete", variant: "destructive" }),
  });

  // ── Website Status (moved from Stats tab) ──
  const { data: siteStatus, refetch: refetchStatus } = useQuery<any>({
    queryKey: ["/api/website-status"],
    refetchInterval: 10000,
  });
  const isDown = siteStatus?.status === "down";
  const [showDownForm, setShowDownForm] = useState(false);
  const [downReason, setDownReason] = useState("");
  const [downName, setDownName] = useState("");
  const [downRank, setDownRank] = useState("Owner");
  const setStatusMut = useMutation({
    mutationFn: (payload: any) => apiRequest("POST", "/api/admin/website-status", payload),
    onSuccess: () => {
      toast({ title: "Website status updated." });
      refetchStatus();
      setShowDownForm(false);
    },
    onError: () => toast({ title: "Failed to update status", variant: "destructive" }),
  });

  // ── Webhooks (owner only) ──
  const isOwner = currentUser?.role === "owner";

  // ── Decorations (owner + developer) ──
  const { data: adminDecorations = [], refetch: refetchDecorations } = useQuery<any[]>({
    queryKey: ["/api/admin/decorations"],
    enabled: canManageWebsite(currentUser?.role),
  });
  const emptyDecoForm = { name: "", url: "", mediaType: "image", isPremiumOnly: false };
  const [decoForm, setDecoForm] = useState(emptyDecoForm);
  const [decoFormOpen, setDecoFormOpen] = useState(false);
  const [editingDecoId, setEditingDecoId] = useState<number | null>(null);
  const [editDecoForm, setEditDecoForm] = useState(emptyDecoForm);
  const { uploadFile: uploadDecoFile, isUploading: isDecoUploading } = useUpload();
  const createDeco = useMutation({
    mutationFn: () => apiRequest("POST", "/api/admin/decorations", decoForm),
    onSuccess: () => { toast({ title: "Decoration added." }); refetchDecorations(); setDecoFormOpen(false); setDecoForm(emptyDecoForm); queryClient.invalidateQueries({ queryKey: ["/api/decorations"] }); },
    onError: (e: any) => toast({ title: e?.message || "Failed", variant: "destructive" }),
  });
  const deleteDeco = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/admin/decorations/${id}`, {}),
    onSuccess: () => { toast({ title: "Decoration deleted." }); refetchDecorations(); queryClient.invalidateQueries({ queryKey: ["/api/decorations"] }); },
    onError: () => toast({ title: "Failed", variant: "destructive" }),
  });
  const toggleDeco = useMutation({
    mutationFn: ({ id, enabled }: { id: number; enabled: boolean }) => apiRequest("PATCH", `/api/admin/decorations/${id}`, { enabled }),
    onSuccess: () => { refetchDecorations(); queryClient.invalidateQueries({ queryKey: ["/api/decorations"] }); },
    onError: () => toast({ title: "Failed", variant: "destructive" }),
  });
  const updateDeco = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => apiRequest("PATCH", `/api/admin/decorations/${id}`, data),
    onSuccess: () => { toast({ title: "Decoration updated." }); refetchDecorations(); setEditingDecoId(null); queryClient.invalidateQueries({ queryKey: ["/api/decorations"] }); },
    onError: () => toast({ title: "Failed", variant: "destructive" }),
  });
  const BUILTIN_DECORATIONS = [
    { id: "ring-pulse", name: "Ring Pulse" }, { id: "ring-spin", name: "Ring Spin" },
    { id: "double-ring", name: "Double Ring" }, { id: "rainbow-spin", name: "Rainbow Spin" },
    { id: "neon", name: "Neon Glow" }, { id: "neon-strong", name: "Neon Strong" },
    { id: "aura", name: "Aura" }, { id: "fire", name: "Fire" },
    { id: "ice", name: "Ice" }, { id: "gold", name: "Gold" },
    { id: "discord-flame", name: "Discord Flame" }, { id: "discord-stars", name: "Discord Stars" },
    { id: "discord-hearts", name: "Discord Hearts" }, { id: "discord-bravery", name: "Discord Bravery" },
    { id: "holographic", name: "Holographic (Premium)" }, { id: "galaxy", name: "Galaxy (Premium)" },
    { id: "crystal", name: "Crystal (Premium)" }, { id: "electric", name: "Electric (Premium)" },
    { id: "sakura", name: "Sakura (Premium)" }, { id: "crown", name: "Crown (Premium)" },
    { id: "aurora", name: "Aurora (Premium)" }, { id: "vortex", name: "Vortex (Premium)" },
    { id: "plasma", name: "Plasma (Premium)" }, { id: "nebula", name: "Nebula (Premium)" },
    { id: "celestial", name: "Celestial (Premium)" }, { id: "lava", name: "Lava (Premium)" },
    { id: "prism", name: "Prism (Premium)" }, { id: "void", name: "Void (Premium)" },
    { id: "dragon", name: "Dragon (Premium)" }, { id: "matrix", name: "Matrix (Premium)" },
  ];

  // ── Created Profiles Count (owner only) ──
  const { data: createdProfilesData, refetch: refetchCreatedProfiles } = useQuery<{ realCount: number; override: string | null }>({
    queryKey: ["/api/admin/created-profiles-count"],
    enabled: isOwner,
  });
  const [cpOverride, setCpOverride] = useState<string>("");
  const cpMutation = useMutation({
    mutationFn: (override: string | null) => apiRequest("POST", "/api/admin/created-profiles-count", { override }),
    onSuccess: () => { toast({ title: "Updated." }); refetchCreatedProfiles(); },
    onError: () => toast({ title: "Failed to update", variant: "destructive" }),
  });

  const { data: webhookList = [], isLoading: whLoading, refetch: refetchWebhooks } = useQuery<any[]>({
    queryKey: ["/api/admin/webhooks"],
    enabled: isOwner,
  });
  const [whForm, setWhForm] = useState({ name: "", webhookUrl: "", logType: "" });
  const createWh = useMutation({
    mutationFn: () => apiRequest("POST", "/api/admin/webhooks", whForm),
    onSuccess: () => {
      toast({ title: "Webhook created." });
      setWhForm({ name: "", webhookUrl: "", logType: "" });
      refetchWebhooks();
    },
    onError: (e: any) => toast({ title: e?.message || "Failed", variant: "destructive" }),
  });
  const deleteWh = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/admin/webhooks/${id}`, {}),
    onSuccess: () => { toast({ title: "Webhook deleted." }); refetchWebhooks(); },
    onError: () => toast({ title: "Failed to delete", variant: "destructive" }),
  });
  const [editingWhId, setEditingWhId] = useState<number | null>(null);
  const [editWhForm, setEditWhForm] = useState({ name: "", webhookUrl: "", logType: "" });
  const [whMenuOpen, setWhMenuOpen] = useState<number | null>(null);
  const updateWh = useMutation({
    mutationFn: (id: number) => apiRequest("PATCH", `/api/admin/webhooks/${id}`, editWhForm),
    onSuccess: () => { toast({ title: "Webhook updated." }); setEditingWhId(null); refetchWebhooks(); },
    onError: () => toast({ title: "Failed to update", variant: "destructive" }),
  });

  const LOG_TYPE_OPTIONS = [
    { value: "account_created", label: "Account Created" },
    { value: "database_updated", label: "Database Updated" },
    { value: "gained_views", label: "Gained Views" },
    { value: "gained_likes", label: "Gained Likes" },
    { value: "leaderboard_update", label: "Leaderboard Update" },
    { value: "leaderboard", label: "Leaderboard" },
    { value: "profile_settings_changed", label: "Profile Settings Changed" },
    { value: "received_badges", label: "Received Badges" },
    { value: "uploads", label: "Uploads" },
    { value: "website_visit", label: "Website Visit" },
    { value: "admin_panel_logs", label: "Admin Panel Logs" },
    { value: "ticket_logs", label: "Ticket Logs" },
    { value: "website_status", label: "Website Status" },
    { value: "ai_support_logs", label: "AI Support Logs" },
  ];

  // ── Announcements ──
  const { data: announcements = [], isLoading: annosLoading } = useQuery<any[]>({ queryKey: ["/api/announcements"] });
  const [annoForm, setAnnoForm] = useState({ title: "", content: "", type: "info" });
  const [editAnno, setEditAnno] = useState<any | null>(null);
  const [creatingAnno, setCreatingAnno] = useState(false);

  const saveAnno = async () => {
    try {
      if (editAnno) {
        await apiRequest("PATCH", `/api/admin/announcements/${editAnno.id}`, annoForm);
        toast({ title: "Announcement updated" });
      } else {
        await apiRequest("POST", "/api/admin/announcements", annoForm);
        toast({ title: "Announcement created" });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/announcements"] });
      setCreatingAnno(false);
      setEditAnno(null);
      setAnnoForm({ title: "", content: "", type: "info" });
    } catch (e: any) {
      toast({ title: e?.message || "Failed", variant: "destructive" });
    }
  };

  const deleteAnno = async (id: number) => {
    try {
      await apiRequest("DELETE", `/api/admin/announcements/${id}`, {});
      queryClient.invalidateQueries({ queryKey: ["/api/announcements"] });
      toast({ title: "Deleted" });
    } catch {
      toast({ title: "Failed", variant: "destructive" });
    }
  };

  // ── User presence status ──
  const presenceMut = useMutation({
    mutationFn: ({ id, presenceStatus }: { id: number; presenceStatus: string }) =>
      apiRequest("PATCH", `/api/admin/users/${id}/presence`, { presenceStatus }),
    onSuccess: () => {
      toast({ title: "Presence status updated." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
    onError: (e: any) => toast({ title: e?.message || "Failed", variant: "destructive" }),
  });

  // ── User info / login-as ──
  const [expandedUser, setExpandedUser] = useState<number | null>(null);
  const [userInfoData, setUserInfoData] = useState<Record<number, any>>({});
  const [loadingInfo, setLoadingInfo] = useState<number | null>(null);
  const [loggingAs, setLoggingAs] = useState<number | null>(null);

  const fetchUserInfo = async (userId: number) => {
    if (userInfoData[userId]) { setExpandedUser(userId); return; }
    setLoadingInfo(userId);
    try {
      const data = await apiRequest("GET", `/api/admin/user-info/${userId}`, undefined) as any;
      setUserInfoData(prev => ({ ...prev, [userId]: data }));
      setExpandedUser(userId);
    } catch (e: any) {
      toast({ title: e?.message || "Failed to fetch info", variant: "destructive" });
    }
    setLoadingInfo(null);
  };

  const loginAs = async (userId: number) => {
    setLoggingAs(userId);
    try {
      await apiRequest("POST", `/api/admin/login-as/${userId}`, {});
      toast({ title: "Logged in as user, reloading..." });
      setTimeout(() => window.location.href = "/dashboard", 800);
    } catch (e: any) {
      toast({ title: e?.message || "Failed", variant: "destructive" });
    }
    setLoggingAs(null);
  };

  const typeColors: Record<string, string> = {
    info: "border-blue-500/30 bg-blue-500/5 text-blue-400",
    warning: "border-yellow-500/30 bg-yellow-500/5 text-yellow-400",
    success: "border-green-500/30 bg-green-500/5 text-green-400",
    error: "border-red-500/30 bg-red-500/5 text-red-400",
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-black">Website Management</h2>
        <p className="text-gray-500 text-sm mt-0.5">Manage site-wide announcements and user accounts</p>
      </div>

      {/* Sub nav */}
      <div className="flex flex-wrap gap-1 bg-[#0a0a0a] border border-white/[0.04] rounded-xl p-1 w-fit">
        {([
          { key: "website-controls", label: "Website Controls" },
          { key: "april-fools", label: "April Fools" },
          { key: "easter-event", label: "Easter Event" },
          { key: "announcements", label: "Announcements" },
          { key: "products", label: "Products" },
          { key: "users", label: "Registered Users" },
          ...(isOwner ? [{ key: "webhooks", label: "Webhook Logs" }] : []),
          ...(canManageWebsite(currentUser?.role) ? [{ key: "decorations", label: "Decorations" }] : []),
        ] as const).map((t: any) => (
          <button
            key={t.key}
            onClick={() => setWSub(t.key)}
            className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${wSub === t.key ? "bg-orange-500 text-black" : "text-gray-500 hover:text-gray-300"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── WEBSITE CONTROLS ── */}
      {wSub === "website-controls" && (
        <div className="bg-[#0e0e0e] border border-white/[0.06] rounded-2xl p-6 space-y-5">
          <div>
            <h2 className="text-base font-black text-white">Website Status</h2>
            <p className="text-gray-500 text-xs mt-1">Control whether the website is accessible to the public.</p>
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-black ${isDown ? "bg-red-500/10 border-red-500/30 text-red-400" : "bg-green-500/10 border-green-500/30 text-green-400"}`}>
              <span className={`w-2 h-2 rounded-full ${isDown ? "bg-red-500 animate-pulse" : "bg-green-500"}`} />
              {isDown ? "Website Down" : "Website Up"}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setStatusMut.mutate({ status: "up" })}
                disabled={!isDown || setStatusMut.isPending}
                data-testid="button-website-up"
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-green-500 text-black text-xs font-black disabled:opacity-40 disabled:cursor-not-allowed hover:bg-green-400 transition-all"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Website Up
              </button>
              <button
                onClick={() => setShowDownForm(true)}
                disabled={isDown || setStatusMut.isPending}
                data-testid="button-website-down"
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-500 text-white text-xs font-black disabled:opacity-40 disabled:cursor-not-allowed hover:bg-red-400 transition-all"
              >
                <AlertCircle className="w-3.5 h-3.5" /> Website Down
              </button>
            </div>
          </div>
          {isDown && siteStatus && (
            <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/15 space-y-1.5 text-xs text-gray-400">
              <p><span className="text-gray-500 font-black uppercase tracking-widest text-[9px]">Reason</span><br />{siteStatus.reason || "No reason given"}</p>
              <p><span className="text-gray-500 font-black uppercase tracking-widest text-[9px]">Set by</span><br />{siteStatus.byName || "—"} <span className="text-orange-400 font-black">({siteStatus.byRank || "—"})</span></p>
            </div>
          )}
          <AnimatePresence>
            {showDownForm && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <div className="pt-2 space-y-4 border-t border-white/[0.06]">
                  <p className="text-xs font-black text-red-400 uppercase tracking-widest">Set Website Down</p>
                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block mb-1.5">Reason</label>
                      <Input value={downReason} onChange={e => setDownReason(e.target.value)} placeholder="Why is the website going down?" className="bg-[#0a0a0a] border-white/10 text-white" data-testid="input-down-reason" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block mb-1.5">Your Name</label>
                      <Input value={downName} onChange={e => setDownName(e.target.value)} placeholder="Name shown on the down page" className="bg-[#0a0a0a] border-white/10 text-white" data-testid="input-down-name" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block mb-1.5">Rank</label>
                      <Select value={downRank} onValueChange={setDownRank}>
                        <SelectTrigger className="bg-[#0a0a0a] border-white/10 text-white w-48" data-testid="select-down-rank"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Owner">Owner</SelectItem>
                          <SelectItem value="Manager">Manager</SelectItem>
                          <SelectItem value="Developer">Developer</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        if (!downReason.trim() || !downName.trim()) { toast({ title: "Please fill in all fields", variant: "destructive" }); return; }
                        setStatusMut.mutate({ status: "down", reason: downReason, byName: downName, byRank: downRank });
                      }}
                      disabled={setStatusMut.isPending}
                      data-testid="button-confirm-down"
                      className="px-5 py-2 rounded-xl bg-red-500 text-white text-xs font-black hover:bg-red-400 transition-all disabled:opacity-50"
                    >
                      {setStatusMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Confirm Down"}
                    </button>
                    <button onClick={() => setShowDownForm(false)} className="px-5 py-2 rounded-xl border border-white/10 text-gray-400 text-xs font-black hover:text-gray-200 transition-all">Cancel</button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Created Profiles counter — owner only */}
          {isOwner && (
            <div className="pt-4 border-t border-white/[0.06] space-y-3">
              <div>
                <h3 className="text-sm font-black text-white">Created Profiles</h3>
                <p className="text-gray-500 text-xs mt-0.5">Shows the total number of created profiles. You can override the displayed number below.</p>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-black text-gray-300">
                  Real count: <span className="text-orange-400">{createdProfilesData?.realCount ?? "—"}</span>
                </div>
                {createdProfilesData?.override != null && (
                  <div className="px-4 py-2 rounded-xl bg-orange-500/10 border border-orange-500/20 text-xs font-black text-orange-400">
                    Override: {createdProfilesData.override}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Input
                  value={cpOverride}
                  onChange={e => setCpOverride(e.target.value)}
                  placeholder={createdProfilesData?.override ?? String(createdProfilesData?.realCount ?? "")}
                  className="bg-[#0a0a0a] border-white/10 text-white text-xs w-40"
                  data-testid="input-created-profiles-override"
                />
                <button
                  onClick={() => { cpMutation.mutate(cpOverride.trim() || null); setCpOverride(""); }}
                  disabled={cpMutation.isPending}
                  className="px-4 py-2 rounded-xl bg-orange-500 text-black text-xs font-black hover:bg-orange-400 transition-all disabled:opacity-50"
                  data-testid="button-save-created-profiles"
                >
                  {cpMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Save"}
                </button>
                {createdProfilesData?.override != null && (
                  <button
                    onClick={() => { cpMutation.mutate(null); setCpOverride(""); }}
                    disabled={cpMutation.isPending}
                    className="px-4 py-2 rounded-xl border border-white/10 text-gray-400 text-xs font-black hover:text-gray-200 transition-all"
                  >
                    Reset to real
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── APRIL FOOLS ── */}
      {wSub === "april-fools" && (
        <div className="bg-[#0e0e0e] border border-white/[0.06] rounded-2xl p-6 space-y-6">
          <div>
            <h2 className="text-base font-black text-white flex items-center gap-2">
              🎉 April Fools Mode
            </h2>
            <p className="text-gray-500 text-xs mt-1">
              When enabled, visiting the home page (<code className="text-orange-400 bg-orange-500/10 px-1 rounded text-[10px]">/</code>) will show a fake "Hexed is Shutdown 100%" screen for 5 seconds, then reveal an April Fool joke page. Only affects the landing page — all other pages work normally.
            </p>
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-black transition-all ${aprilFoolsStatus?.enabled ? "bg-orange-500/10 border-orange-500/30 text-orange-400" : "bg-white/5 border-white/10 text-gray-500"}`}>
              <span className={`w-2 h-2 rounded-full ${aprilFoolsStatus?.enabled ? "bg-orange-500 animate-pulse" : "bg-gray-600"}`} />
              {aprilFoolsStatus?.enabled ? "Active — Prank is live! 🎉" : "Inactive — Normal homepage"}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => toggleAprilFoolsMut.mutate(true)}
                disabled={!!aprilFoolsStatus?.enabled || toggleAprilFoolsMut.isPending}
                data-testid="button-april-fools-enable"
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-orange-500 text-black text-xs font-black disabled:opacity-40 disabled:cursor-not-allowed hover:bg-orange-400 transition-all"
              >
                {toggleAprilFoolsMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "🎉"} Enable Prank
              </button>
              <button
                onClick={() => toggleAprilFoolsMut.mutate(false)}
                disabled={!aprilFoolsStatus?.enabled || toggleAprilFoolsMut.isPending}
                data-testid="button-april-fools-disable"
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-300 text-xs font-black disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/10 transition-all"
              >
                Disable
              </button>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-orange-500/5 border border-orange-500/15 space-y-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-orange-500 mb-1">What happens when enabled</p>
            <ol className="text-xs text-gray-400 space-y-1.5 list-decimal list-inside leading-relaxed">
              <li>User visits <span className="text-orange-400 font-mono">/</span> (the homepage)</li>
              <li>Sees "Hexed is Shutdown 100%" with animated <span className="font-mono text-gray-300">. .. ...</span> and a shutdown progress bar</li>
              <li>After <span className="text-white font-black">5 seconds</span> the page transitions to an "April Fool!" reveal with confetti</li>
              <li>User can then enter the site normally from the reveal page</li>
            </ol>
          </div>

          <div className="p-3 rounded-xl border border-yellow-500/20 bg-yellow-500/5">
            <p className="text-[11px] text-yellow-400 font-black">⚠️ Remember to turn this off after April 1st!</p>
          </div>
        </div>
      )}

      {/* ── EASTER EVENT ── */}
      {wSub === "easter-event" && (
        <EasterEventControl />
      )}

      {/* ── WEBHOOK LOGS ── */}
      {wSub === "webhooks" && isOwner && (
        <div className="space-y-6">
          <div>
            <h2 className="text-base font-black text-white">Webhook Logs</h2>
            <p className="text-gray-500 text-xs mt-1">Create Discord webhooks that fire on specific platform events.</p>
          </div>

          {/* Create form */}
          <div className="bg-[#0e0e0e] border border-white/[0.06] rounded-2xl p-5 space-y-4">
            <p className="text-xs font-black uppercase tracking-widest text-orange-400">Add Webhook</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block mb-1.5">Name</label>
                <Input
                  value={whForm.name}
                  onChange={e => setWhForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Views Logger"
                  className="bg-[#0a0a0a] border-white/10 text-white text-xs"
                  data-testid="input-webhook-name"
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block mb-1.5">Discord Webhook URL</label>
                <Input
                  value={whForm.webhookUrl}
                  onChange={e => setWhForm(p => ({ ...p, webhookUrl: e.target.value }))}
                  placeholder="https://discord.com/api/webhooks/..."
                  className="bg-[#0a0a0a] border-white/10 text-white text-xs"
                  data-testid="input-webhook-url"
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block mb-1.5">Log Type</label>
                <Select value={whForm.logType} onValueChange={val => setWhForm(p => ({ ...p, logType: val }))}>
                  <SelectTrigger className="bg-[#0a0a0a] border-white/10 text-white text-xs" data-testid="select-webhook-logtype">
                    <SelectValue placeholder="Select log type..." />
                  </SelectTrigger>
                  <SelectContent>
                    {LOG_TYPE_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <button
              onClick={() => createWh.mutate()}
              disabled={createWh.isPending || !whForm.name || !whForm.webhookUrl || !whForm.logType}
              data-testid="button-webhook-create"
              className="px-5 py-2 rounded-xl bg-orange-500 text-black text-xs font-black hover:bg-orange-400 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {createWh.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              Add Webhook
            </button>
          </div>

          {/* Webhook list */}
          <div className="space-y-2">
            {whLoading && <p className="text-gray-600 text-sm py-4 text-center">Loading…</p>}
            {!whLoading && webhookList.length === 0 && (
              <p className="text-gray-600 text-sm py-4 text-center">No webhooks configured yet.</p>
            )}
            {webhookList.map((wh: any) => {
              const typeLabel = LOG_TYPE_OPTIONS.find(o => o.value === wh.logType)?.label ?? wh.logType;
              const isEditing = editingWhId === wh.id;
              const menuOpen = whMenuOpen === wh.id;
              return (
                <div
                  key={wh.id}
                  className="rounded-xl bg-[#0e0e0e] border border-white/[0.06] overflow-hidden"
                  data-testid={`row-webhook-${wh.id}`}
                >
                  <div className="flex items-center gap-3 px-4 py-3">
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <p className="font-black text-sm text-white truncate">{wh.name}</p>
                      <p className="text-[10px] text-gray-500 truncate">{wh.webhookUrl}</p>
                    </div>
                    <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-orange-500/15 text-orange-400 shrink-0">{typeLabel}</span>
                    <div className="relative shrink-0">
                      <button
                        onClick={() => setWhMenuOpen(menuOpen ? null : wh.id)}
                        data-testid={`button-menu-webhook-${wh.id}`}
                        className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-all"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                      {menuOpen && (
                        <div className="absolute right-0 top-9 z-50 bg-[#141414] border border-white/10 rounded-xl shadow-2xl py-1 w-36">
                          <button
                            onClick={() => {
                              setEditingWhId(isEditing ? null : wh.id);
                              setEditWhForm({ name: wh.name, webhookUrl: wh.webhookUrl, logType: wh.logType });
                              setWhMenuOpen(null);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white hover:bg-white/5 transition-colors"
                            data-testid={`button-edit-webhook-${wh.id}`}
                          >
                            <Edit2 className="w-3.5 h-3.5 text-orange-400" />
                            Edit
                          </button>
                          <button
                            onClick={() => { deleteWh.mutate(wh.id); setWhMenuOpen(null); }}
                            disabled={deleteWh.isPending}
                            data-testid={`button-delete-webhook-${wh.id}`}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  {isEditing && (
                    <div className="border-t border-white/[0.06] px-4 py-4 space-y-3 bg-black/20">
                      <p className="text-[10px] font-black uppercase tracking-widest text-orange-500">Edit Webhook</p>
                      <input
                        value={editWhForm.name}
                        onChange={e => setEditWhForm(p => ({ ...p, name: e.target.value }))}
                        placeholder="Webhook name"
                        data-testid={`input-edit-webhook-name-${wh.id}`}
                        className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 outline-none focus:border-orange-500/40"
                      />
                      <input
                        value={editWhForm.webhookUrl}
                        onChange={e => setEditWhForm(p => ({ ...p, webhookUrl: e.target.value }))}
                        placeholder="Discord webhook URL"
                        data-testid={`input-edit-webhook-url-${wh.id}`}
                        className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 outline-none focus:border-orange-500/40"
                      />
                      <Select value={editWhForm.logType} onValueChange={val => setEditWhForm(p => ({ ...p, logType: val }))}>
                        <SelectTrigger data-testid={`select-edit-webhook-type-${wh.id}`} className="bg-black/50 border-white/10 text-sm rounded-xl">
                          <SelectValue placeholder="Log type" />
                        </SelectTrigger>
                        <SelectContent>
                          {LOG_TYPE_OPTIONS.map(o => (
                            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="flex gap-2">
                        <button
                          onClick={() => updateWh.mutate(wh.id)}
                          disabled={updateWh.isPending || !editWhForm.name || !editWhForm.webhookUrl || !editWhForm.logType}
                          data-testid={`button-save-webhook-${wh.id}`}
                          className="flex-1 py-2 rounded-xl bg-orange-500 text-black text-xs font-black hover:bg-orange-400 transition-all disabled:opacity-40"
                        >
                          {updateWh.isPending ? "Saving…" : "Save Changes"}
                        </button>
                        <button
                          onClick={() => setEditingWhId(null)}
                          className="px-4 py-2 rounded-xl bg-white/5 text-gray-400 text-xs font-black hover:bg-white/10 transition-all"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── ANNOUNCEMENTS ── */}
      {wSub === "announcements" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">{(announcements || []).length} announcement(s)</p>
            <button
              onClick={() => { setCreatingAnno(true); setEditAnno(null); setAnnoForm({ title: "", content: "", type: "info" }); }}
              className="flex items-center gap-1.5 text-[10px] font-black uppercase px-3 py-1.5 rounded-lg bg-orange-500 text-black hover:bg-orange-400 transition-all"
            >
              + New Announcement
            </button>
          </div>

          {(creatingAnno || editAnno) && (
            <div className="bg-[#0e0e0e] border border-orange-500/20 rounded-2xl p-5 space-y-3">
              <h3 className="text-[11px] font-black uppercase tracking-widest text-orange-500">
                {editAnno ? "Edit Announcement" : "New Announcement"}
              </h3>
              <input
                value={annoForm.title}
                onChange={e => setAnnoForm(p => ({ ...p, title: e.target.value }))}
                placeholder="Title"
                className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 outline-none focus:border-orange-500/40"
              />
              <textarea
                value={annoForm.content}
                onChange={e => setAnnoForm(p => ({ ...p, content: e.target.value }))}
                placeholder="Content (optional)"
                rows={2}
                className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 outline-none focus:border-orange-500/40 resize-none"
              />
              <div className="flex gap-2">
                {["info", "warning", "success", "error"].map(t => (
                  <button
                    key={t}
                    onClick={() => setAnnoForm(p => ({ ...p, type: t }))}
                    className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase border transition-all ${annoForm.type === t ? typeColors[t] : "border-white/10 text-gray-600"}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={saveAnno}
                  className="px-4 py-2 bg-orange-500 text-black text-xs font-black rounded-lg hover:bg-orange-400 transition-all"
                >
                  {editAnno ? "Save Changes" : "Create"}
                </button>
                <button
                  onClick={() => { setCreatingAnno(false); setEditAnno(null); }}
                  className="px-4 py-2 border border-white/10 text-gray-400 text-xs font-black rounded-lg hover:border-white/20 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {annosLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-gray-600" /></div>
          ) : (announcements || []).length === 0 ? (
            <div className="text-center py-12 bg-[#0e0e0e] border border-white/[0.04] rounded-2xl">
              <p className="text-gray-600 font-bold text-sm">No announcements yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {(announcements || []).map((a: any) => (
                <div key={a.id} className={`flex items-start gap-3 p-4 rounded-2xl border ${typeColors[a.type] || typeColors.info}`}>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-sm text-white">{a.title}</p>
                    {a.content && <p className="text-xs mt-0.5 opacity-70">{a.content}</p>}
                    <p className="text-[10px] mt-1 opacity-40">{a.type.toUpperCase()} · ID #{a.id}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => { setEditAnno(a); setAnnoForm({ title: a.title, content: a.content || "", type: a.type }); setCreatingAnno(false); }}
                      className="px-2 py-1 text-[10px] font-black border border-white/10 text-gray-400 rounded-lg hover:text-white hover:border-white/20 transition-all"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteAnno(a.id)}
                      className="px-2 py-1 text-[10px] font-black border border-red-500/30 text-red-400 rounded-lg hover:bg-red-500/10 transition-all"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── PRODUCTS ── */}
      {wSub === "products" && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-black text-white">Shop Products</h2>
              <p className="text-gray-500 text-xs mt-0.5">Manage the products listed in the shop.</p>
            </div>
            <button
              onClick={openCreateProd}
              data-testid="button-create-product"
              className="flex items-center gap-1.5 text-[10px] font-black uppercase px-3 py-1.5 rounded-lg bg-orange-500 text-black hover:bg-orange-400 transition-all"
            >
              + New Product
            </button>
          </div>

          {/* Product Form (Create/Edit) */}
          <AnimatePresence>
            {prodFormOpen && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-[#0e0e0e] border border-orange-500/20 rounded-2xl p-5 space-y-4"
              >
                <h3 className="text-[11px] font-black uppercase tracking-widest text-orange-500">
                  {editingProd ? "Edit Product" : "New Product"}
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Name */}
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block mb-1.5">Product Name *</label>
                    <input
                      value={prodForm.name}
                      onChange={e => setProdForm(p => ({ ...p, name: e.target.value }))}
                      placeholder="e.g. Premium"
                      data-testid="input-prod-name"
                      className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 outline-none focus:border-orange-500/40"
                    />
                  </div>
                  {/* Slug */}
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block mb-1.5">Slug / ID *</label>
                    <input
                      value={prodForm.slug}
                      onChange={e => setProdForm(p => ({ ...p, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") }))}
                      placeholder="e.g. premium"
                      disabled={!!editingProd}
                      data-testid="input-prod-slug"
                      className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 outline-none focus:border-orange-500/40 disabled:opacity-50"
                    />
                  </div>
                  {/* Price */}
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block mb-1.5">Price ($) *</label>
                    <input
                      value={prodForm.price}
                      onChange={e => setProdForm(p => ({ ...p, price: e.target.value }))}
                      placeholder="e.g. 4.99"
                      type="number"
                      step="0.01"
                      min="0"
                      data-testid="input-prod-price"
                      className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 outline-none focus:border-orange-500/40"
                    />
                  </div>
                  {/* Sale Price */}
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block mb-1.5">Sale Price ($) <span className="text-gray-600 normal-case font-normal">optional</span></label>
                    <input
                      value={prodForm.salePrice}
                      onChange={e => setProdForm(p => ({ ...p, salePrice: e.target.value }))}
                      placeholder="e.g. 1.99 (leave empty for no sale)"
                      type="number"
                      step="0.01"
                      min="0"
                      data-testid="input-prod-sale"
                      className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 outline-none focus:border-orange-500/40"
                    />
                  </div>
                  {/* Icon */}
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block mb-1.5">Icon (emoji)</label>
                    <input
                      value={prodForm.icon}
                      onChange={e => setProdForm(p => ({ ...p, icon: e.target.value }))}
                      placeholder="e.g. 💎"
                      data-testid="input-prod-icon"
                      className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 outline-none focus:border-orange-500/40"
                    />
                  </div>
                  {/* Badge Name */}
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block mb-1.5">Badge Name <span className="text-gray-600 normal-case font-normal">optional</span></label>
                    <input
                      value={prodForm.badgeName}
                      onChange={e => setProdForm(p => ({ ...p, badgeName: e.target.value }))}
                      placeholder="e.g. Premium"
                      data-testid="input-prod-badge"
                      className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 outline-none focus:border-orange-500/40"
                    />
                  </div>
                  {/* Color */}
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block mb-1.5">Accent Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={prodForm.color}
                        onChange={e => setProdForm(p => ({ ...p, color: e.target.value }))}
                        className="w-9 h-9 rounded-lg border border-white/10 bg-transparent cursor-pointer"
                      />
                      <input
                        value={prodForm.color}
                        onChange={e => setProdForm(p => ({ ...p, color: e.target.value }))}
                        className="flex-1 bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 outline-none focus:border-orange-500/40"
                      />
                    </div>
                  </div>
                  {/* BG Color */}
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block mb-1.5">Background Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={prodForm.bgColor}
                        onChange={e => setProdForm(p => ({ ...p, bgColor: e.target.value }))}
                        className="w-9 h-9 rounded-lg border border-white/10 bg-transparent cursor-pointer"
                      />
                      <input
                        value={prodForm.bgColor}
                        onChange={e => setProdForm(p => ({ ...p, bgColor: e.target.value }))}
                        className="flex-1 bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 outline-none focus:border-orange-500/40"
                      />
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block mb-1.5">Product Description</label>
                  <textarea
                    value={prodForm.description}
                    onChange={e => setProdForm(p => ({ ...p, description: e.target.value }))}
                    placeholder="Short description shown in the shop"
                    rows={2}
                    data-testid="input-prod-desc"
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 outline-none focus:border-orange-500/40 resize-none"
                  />
                </div>

                {/* Image URL */}
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block mb-1.5">Product Image URL <span className="text-gray-600 normal-case font-normal">optional</span></label>
                  <input
                    value={prodForm.imageUrl}
                    onChange={e => setProdForm(p => ({ ...p, imageUrl: e.target.value }))}
                    placeholder="https://..."
                    data-testid="input-prod-image"
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 outline-none focus:border-orange-500/40"
                  />
                  {prodForm.imageUrl && (
                    <img src={prodForm.imageUrl} alt="preview" className="mt-2 h-16 rounded-lg object-cover border border-white/10" onError={e => (e.currentTarget.style.display = "none")} />
                  )}
                </div>

                {/* Advantages */}
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block mb-1.5">Product Advantages</label>
                  <div className="space-y-2">
                    {prodForm.features.map((f, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="text-orange-400 text-xs">–</span>
                        <span className="flex-1 text-sm text-white bg-black/30 border border-white/[0.06] px-3 py-1.5 rounded-lg">{f}</span>
                        <button
                          onClick={() => setProdForm(p => ({ ...p, features: p.features.filter((_, i) => i !== idx) }))}
                          className="text-red-400 hover:text-red-300 transition-colors text-xs px-2 py-1 rounded-lg hover:bg-red-500/10"
                          data-testid={`button-remove-feat-${idx}`}
                        >✕</button>
                      </div>
                    ))}
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600 text-xs">–</span>
                      <input
                        value={prodAdvInput}
                        onChange={e => setProdAdvInput(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === "Enter" && prodAdvInput.trim()) {
                            e.preventDefault();
                            setProdForm(p => ({ ...p, features: [...p.features, prodAdvInput.trim()] }));
                            setProdAdvInput("");
                          }
                        }}
                        placeholder="Type an advantage then press Enter…"
                        data-testid="input-prod-advantage"
                        className="flex-1 bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 outline-none focus:border-orange-500/40"
                      />
                      <button
                        onClick={() => {
                          if (prodAdvInput.trim()) {
                            setProdForm(p => ({ ...p, features: [...p.features, prodAdvInput.trim()] }));
                            setProdAdvInput("");
                          }
                        }}
                        className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-400 text-xs hover:bg-white/10 transition-all"
                      >Add</button>
                    </div>
                  </div>
                </div>

                {/* Grants Premium */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setProdForm(p => ({ ...p, grantsPremium: !p.grantsPremium }))}
                    data-testid="button-prod-premium"
                    className={`w-9 h-5 rounded-full transition-colors relative ${prodForm.grantsPremium ? "bg-orange-500" : "bg-white/10"}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${prodForm.grantsPremium ? "translate-x-4" : ""}`} />
                  </button>
                  <span className="text-sm text-gray-400">Grants Premium access when purchased</span>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => saveProd.mutate()}
                    disabled={saveProd.isPending || !prodForm.name || !prodForm.slug || !prodForm.price}
                    data-testid="button-save-product"
                    className="px-5 py-2 bg-orange-500 text-black text-xs font-black rounded-xl hover:bg-orange-400 transition-all disabled:opacity-40 flex items-center gap-2"
                  >
                    {saveProd.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    {editingProd ? "Save Changes" : "Create Product"}
                  </button>
                  <button
                    onClick={() => { setProdFormOpen(false); setEditingProd(null); }}
                    className="px-5 py-2 border border-white/10 text-gray-400 text-xs font-black rounded-xl hover:border-white/20 hover:text-gray-200 transition-all"
                  >Cancel</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Product List */}
          {prodLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-gray-600" /></div>
          ) : (adminProducts || []).length === 0 ? (
            <div className="text-center py-12 bg-[#0e0e0e] border border-white/[0.04] rounded-2xl">
              <p className="text-gray-600 font-bold text-sm">No products yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {(adminProducts || []).map((p: any) => (
                <div
                  key={p.id}
                  data-testid={`card-product-${p.id}`}
                  className="bg-[#0e0e0e] border border-white/[0.06] rounded-2xl overflow-hidden"
                >
                  <div className="flex items-center gap-3 p-4">
                    {/* Icon / Image */}
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 border border-white/[0.06]"
                      style={{ background: p.bg_color || "#0d0d0d" }}
                    >
                      {p.image_url ? (
                        <img src={p.image_url} alt={p.name} className="w-full h-full object-cover rounded-xl" />
                      ) : (
                        p.icon || "📦"
                      )}
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-black text-sm text-white">{p.name}</p>
                        {p.is_seeded && (
                          <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full bg-white/5 text-gray-500 border border-white/[0.06]">Auto</span>
                        )}
                        {p.grants_premium && (
                          <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">Premium</span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-500 truncate">{p.description}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-black" style={{ color: p.color || "#F97316" }}>
                          ${p.price?.toFixed(2)}
                        </span>
                        {p.sale_price != null && (
                          <span className="text-[10px] font-black text-green-400 bg-green-500/10 border border-green-500/20 px-1.5 py-0.5 rounded-full">
                            Sale: ${p.sale_price?.toFixed(2)}
                          </span>
                        )}
                        <span className="text-[10px] text-gray-600 font-mono">/{p.slug}</span>
                      </div>
                    </div>
                    {/* Feature count */}
                    <span className="text-[10px] text-gray-600 shrink-0 hidden sm:block">
                      {Array.isArray(p.features) ? p.features.length : 0} advantage{Array.isArray(p.features) && p.features.length !== 1 ? "s" : ""}
                    </span>
                    {/* Menu */}
                    <div className="relative shrink-0">
                      <button
                        onClick={() => setProdMenuOpen(prodMenuOpen === p.id ? null : p.id)}
                        data-testid={`button-menu-product-${p.id}`}
                        className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-all"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                      {prodMenuOpen === p.id && (
                        <div className="absolute right-0 top-9 z-50 bg-[#141414] border border-white/10 rounded-xl shadow-2xl py-1 w-36">
                          <button
                            onClick={() => openEditProd(p)}
                            data-testid={`button-edit-product-${p.id}`}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white hover:bg-white/5 transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-orange-400" /> Edit
                          </button>
                          <button
                            onClick={() => { deleteProd.mutate(p.id); setProdMenuOpen(null); }}
                            disabled={deleteProd.isPending}
                            data-testid={`button-delete-product-${p.id}`}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Advantages preview */}
                  {Array.isArray(p.features) && p.features.length > 0 && (
                    <div className="border-t border-white/[0.04] px-4 pb-3 pt-2">
                      <div className="flex flex-wrap gap-x-4 gap-y-1">
                        {p.features.slice(0, 4).map((f: string, idx: number) => (
                          <span key={idx} className="text-[11px] text-gray-500 flex items-center gap-1">
                            <span className="text-orange-500">–</span> {f}
                          </span>
                        ))}
                        {p.features.length > 4 && (
                          <span className="text-[11px] text-gray-600">+{p.features.length - 4} more</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── USERS ── */}
      {wSub === "users" && (
        <div className="space-y-3">
          <p className="text-xs text-gray-500">{(adminUsers || []).length} registered user(s)</p>
          {(adminUsers || []).map((u: any) => (
            <div key={u.id} className="bg-[#0e0e0e] border border-white/[0.06] rounded-2xl overflow-hidden">
              <div className="flex items-center gap-3 p-4">
                <Avatar className="w-9 h-9 border border-white/10 shrink-0">
                  <AvatarImage src={u.discordAvatar || u.avatarUrl} />
                  <AvatarFallback className="bg-orange-500/10 text-orange-500 text-xs font-black">
                    {u.username?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-sm">{u.username}</p>
                  <p className="text-[10px] text-gray-600 font-mono">#{u.id} · {u.role}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                  {/* Presence toggle */}
                  <button
                    onClick={() => presenceMut.mutate({ id: u.id, presenceStatus: (u.presenceStatus || "offline") === "online" ? "offline" : "online" })}
                    disabled={presenceMut.isPending}
                    data-testid={`button-presence-${u.id}`}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black border rounded-lg transition-all disabled:opacity-50 ${(u.presenceStatus || "offline") === "online" ? "border-green-500/30 text-green-400 bg-green-500/5 hover:bg-green-500/15" : "border-white/10 text-gray-500 hover:text-gray-300 hover:border-white/20"}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${(u.presenceStatus || "offline") === "online" ? "bg-green-400 animate-pulse" : "bg-gray-600"}`} />
                    {(u.presenceStatus || "offline") === "online" ? "Online" : "Offline"}
                  </button>
                  <button
                    onClick={() => expandedUser === u.id ? setExpandedUser(null) : fetchUserInfo(u.id)}
                    className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-black border border-white/10 text-gray-400 rounded-lg hover:text-white hover:border-white/20 transition-all"
                  >
                    {loadingInfo === u.id ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                    {expandedUser === u.id ? "Hide Info" : "Show Info"}
                  </button>
                  <a
                    href={`/dashboard/user/${u.username}`}
                    className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-black border border-orange-500/30 text-orange-400 rounded-lg hover:bg-orange-500/10 transition-all"
                  >
                    Go to Dashboard
                  </a>
                  {u.id !== currentUser.id && (
                    <button
                      onClick={() => loginAs(u.id)}
                      disabled={loggingAs === u.id}
                      className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-black border border-purple-500/30 text-purple-400 rounded-lg hover:bg-purple-500/10 transition-all disabled:opacity-50"
                    >
                      {loggingAs === u.id ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                      Login as User
                    </button>
                  )}
                </div>
              </div>

              {expandedUser === u.id && userInfoData[u.id] && (
                <div className="border-t border-white/[0.04] p-4 bg-black/30 space-y-3">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                    {[
                      { label: "Email", value: userInfoData[u.id].email },
                      { label: "Discord ID", value: userInfoData[u.id].discordId || "—" },
                      { label: "Discord User", value: userInfoData[u.id].discordUsername || "—" },
                      { label: "Premium", value: userInfoData[u.id].isPremium ? "✓ Yes" : "No" },
                      { label: "Joined", value: userInfoData[u.id].joinDate ? new Date(userInfoData[u.id].joinDate).toLocaleDateString() : "—" },
                      { label: "Views", value: String(userInfoData[u.id].views || 0) },
                      { label: "Max Tracks", value: String(userInfoData[u.id].maxTracks ?? 3) },
                      { label: "Max Tags", value: String(userInfoData[u.id].maxTags ?? 5) },
                    ].map(({ label, value }) => (
                      <div key={label} className="bg-white/[0.02] rounded-xl p-2.5">
                        <p className="text-[9px] font-black uppercase tracking-widest text-gray-600 mb-1">{label}</p>
                        <p className="font-mono text-[11px] text-gray-300 break-all">{value}</p>
                      </div>
                    ))}
                  </div>
                  {(userInfoData[u.id].badges || []).length > 0 && (
                    <div className="bg-white/[0.02] rounded-xl p-2.5">
                      <p className="text-[9px] font-black uppercase tracking-widest text-gray-600 mb-1.5">Badges</p>
                      <div className="flex flex-wrap gap-1.5">
                        {(userInfoData[u.id].badges || []).map((b: string) => (
                          <span key={b} className="text-[10px] font-black px-2 py-0.5 rounded-lg bg-orange-500/10 text-orange-400 border border-orange-500/20">{b}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="flex items-center justify-end">
                    <a
                      href={`/dashboard/user/${u.username}`}
                      className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg bg-orange-500 text-black hover:bg-orange-400 transition-all"
                    >
                      View Full Dashboard →
                    </a>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── DECORATIONS (owner + developer) ── */}
      {wSub === "decorations" && canManageWebsite(currentUser?.role) && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-black text-white">Profile Decorations</h2>
              <p className="text-gray-500 text-xs mt-1">Manage custom avatar decorations. Supports images, GIFs, and MP4 videos.</p>
            </div>
            <button
              onClick={() => setDecoFormOpen(v => !v)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-500 text-black text-xs font-black hover:bg-orange-400 transition-all"
              data-testid="button-add-decoration"
            >
              + Add Decoration
            </button>
          </div>

          {decoFormOpen && (
            <div className="bg-[#0e0e0e] border border-orange-500/20 rounded-2xl p-5 space-y-4">
              <p className="text-xs font-black uppercase tracking-widest text-orange-400">New Decoration</p>
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block mb-1.5">Name</label>
                  <Input value={decoForm.name} onChange={e => setDecoForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Sparkle Ring" className="bg-black/60 border-white/10 text-white h-9 text-sm" data-testid="input-deco-name" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block mb-1.5">URL or Upload (image, GIF, MP4)</label>
                  <div className="flex gap-2">
                    <Input value={decoForm.url} onChange={e => setDecoForm(f => ({ ...f, url: e.target.value }))} placeholder="https://... or upload below" className="bg-black/60 border-white/10 text-white h-9 text-sm flex-1" data-testid="input-deco-url" />
                    <label className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-400 text-xs font-black uppercase tracking-widest cursor-pointer hover:bg-white/10 transition-all whitespace-nowrap">
                      {isDecoUploading ? "Uploading..." : "Upload File"}
                      <input type="file" accept="image/*,video/mp4,image/gif" className="hidden" onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const r = await uploadDecoFile(file);
                        if (r) {
                          const mt = file.type.startsWith("video") ? "video" : "image";
                          setDecoForm(f => ({ ...f, url: r.publicUrl || r.objectPath, mediaType: mt }));
                        }
                      }} />
                    </label>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block mb-1.5">Media Type</label>
                  <Select value={decoForm.mediaType} onValueChange={v => setDecoForm(f => ({ ...f, mediaType: v }))}>
                    <SelectTrigger className="bg-black/60 border-white/10 text-white h-9 text-sm w-48" data-testid="select-deco-type"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-[#0e0e0e] border-white/10">
                      <SelectItem value="image">Image / GIF</SelectItem>
                      <SelectItem value="video">MP4 Video</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-3">
                  <Switch checked={decoForm.isPremiumOnly} onCheckedChange={v => setDecoForm(f => ({ ...f, isPremiumOnly: v }))} data-testid="switch-deco-premium" />
                  <div>
                    <p className="text-xs font-black">Premium Only</p>
                    <p className="text-[10px] text-gray-500">Only premium users can select this decoration.</p>
                  </div>
                </div>
              </div>
              {decoForm.url && (
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Preview:</span>
                  {decoForm.mediaType === "video" ? (
                    <video src={decoForm.url} autoPlay loop muted playsInline className="w-16 h-16 rounded-full object-cover border border-white/10" />
                  ) : (
                    <img src={decoForm.url} alt="preview" className="w-16 h-16 rounded-full object-cover border border-white/10" />
                  )}
                </div>
              )}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => createDeco.mutate()}
                  disabled={createDeco.isPending || !decoForm.name || !decoForm.url}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-500 text-black text-xs font-black hover:bg-orange-400 disabled:opacity-50 transition-all"
                  data-testid="button-save-decoration"
                >
                  {createDeco.isPending ? "Saving..." : "Save Decoration"}
                </button>
                <button onClick={() => setDecoFormOpen(false)} className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-400 text-xs font-black hover:bg-white/10 transition-all">
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Built-in Decorations Section */}
          <div className="space-y-3">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-gray-500">Built-in Decorations</p>
              <p className="text-[10px] text-gray-600 mt-0.5">CSS-based animations built into the platform. These are always available to users.</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {BUILTIN_DECORATIONS.map((b) => (
                <div key={b.id} className="flex items-center gap-2 bg-[#0a0a0a] border border-white/[0.04] rounded-xl px-3 py-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500/60 shrink-0" />
                  <span className="text-[11px] font-bold text-gray-300 truncate">{b.name}</span>
                  <span className="ml-auto text-[9px] font-mono text-gray-600 shrink-0">{b.id}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Admin-added Decorations */}
          <div className="space-y-3">
            <p className="text-xs font-black uppercase tracking-widest text-gray-500">Added Decorations</p>
            {adminDecorations.length === 0 ? (
              <div className="text-center py-8 text-gray-600 text-sm">No added decorations yet. Add the first one above!</div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {adminDecorations.map((d: any) => (
                  <div key={d.id} className="bg-[#0e0e0e] border border-white/[0.06] rounded-2xl p-4 space-y-3">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-full overflow-hidden border border-white/10 shrink-0 bg-black/40">
                        {d.media_type === "video" ? (
                          <video src={d.url} autoPlay loop muted playsInline className="w-full h-full object-cover" />
                        ) : (
                          <img src={d.url} alt={d.name} className="w-full h-full object-cover" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-sm text-white">{d.name}</p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="text-[10px] text-gray-500 font-mono uppercase">{d.media_type}</span>
                          {d.is_premium_only && <span className="text-[9px] bg-purple-500/20 text-purple-400 border border-purple-500/30 px-1.5 py-0.5 rounded font-black uppercase">Premium Only</span>}
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-black uppercase border ${d.enabled ? "bg-green-500/10 text-green-400 border-green-500/20" : "bg-gray-500/10 text-gray-500 border-gray-500/20"}`}>{d.enabled ? "Enabled" : "Disabled"}</span>
                        </div>
                        <p className="text-[10px] text-gray-700 mt-1 truncate font-mono">{d.url}</p>
                      </div>
                      <div className="flex flex-col gap-1.5 shrink-0">
                        <button
                          onClick={() => { setEditingDecoId(editingDecoId === d.id ? null : d.id); setEditDecoForm({ name: d.name, url: d.url, mediaType: d.media_type, isPremiumOnly: d.is_premium_only }); }}
                          className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border border-blue-500/20 text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 transition-all"
                          data-testid={`button-edit-deco-${d.id}`}
                        >
                          {editingDecoId === d.id ? "Cancel" : "Edit"}
                        </button>
                        <button
                          onClick={() => toggleDeco.mutate({ id: d.id, enabled: !d.enabled })}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all ${d.enabled ? "bg-gray-500/10 border-gray-500/20 text-gray-400 hover:bg-gray-500/20" : "bg-green-500/10 border-green-500/20 text-green-400 hover:bg-green-500/20"}`}
                          data-testid={`button-toggle-deco-${d.id}`}
                        >
                          {d.enabled ? "Disable" : "Enable"}
                        </button>
                        <button
                          onClick={() => { if (confirm(`Delete "${d.name}"?`)) deleteDeco.mutate(d.id); }}
                          className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border border-red-500/20 text-red-400 bg-red-500/10 hover:bg-red-500/20 transition-all"
                          data-testid={`button-delete-deco-${d.id}`}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    {editingDecoId === d.id && (
                      <div className="border-t border-white/[0.06] pt-3 space-y-3">
                        <p className="text-[10px] font-black uppercase tracking-widest text-orange-400">Edit Decoration</p>
                        <div className="grid grid-cols-1 gap-2">
                          <Input value={editDecoForm.name} onChange={e => setEditDecoForm(f => ({ ...f, name: e.target.value }))} placeholder="Name" className="bg-black/60 border-white/10 text-white h-8 text-sm" />
                          <Input value={editDecoForm.url} onChange={e => setEditDecoForm(f => ({ ...f, url: e.target.value }))} placeholder="URL" className="bg-black/60 border-white/10 text-white h-8 text-sm" />
                          <div className="flex items-center gap-3">
                            <Select value={editDecoForm.mediaType} onValueChange={v => setEditDecoForm(f => ({ ...f, mediaType: v }))}>
                              <SelectTrigger className="bg-black/60 border-white/10 text-white h-8 text-sm w-36"><SelectValue /></SelectTrigger>
                              <SelectContent className="bg-[#0e0e0e] border-white/10">
                                <SelectItem value="image">Image / GIF</SelectItem>
                                <SelectItem value="video">MP4 Video</SelectItem>
                              </SelectContent>
                            </Select>
                            <div className="flex items-center gap-2">
                              <Switch checked={editDecoForm.isPremiumOnly} onCheckedChange={v => setEditDecoForm(f => ({ ...f, isPremiumOnly: v }))} />
                              <span className="text-[10px] text-gray-400 font-bold">Premium Only</span>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => updateDeco.mutate({ id: d.id, data: { name: editDecoForm.name, url: editDecoForm.url, mediaType: editDecoForm.mediaType, isPremiumOnly: editDecoForm.isPremiumOnly } })}
                          disabled={updateDeco.isPending || !editDecoForm.name || !editDecoForm.url}
                          className="px-4 py-2 rounded-xl bg-orange-500 text-black text-xs font-black hover:bg-orange-400 disabled:opacity-50 transition-all"
                        >
                          {updateDeco.isPending ? "Saving..." : "Save Changes"}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Uploads Admin Tab ────────────────────────────────────────────────────────
function UploadsAdminTab() {
  const [page, setPage] = useState(1);
  const { data, isLoading, refetch } = useQuery<{ uploads: any[]; total: number }>({
    queryKey: ["/api/admin/uploads", page],
    queryFn: async () => {
      const r = await fetch(`/api/admin/uploads?page=${page}`, { credentials: "include" });
      if (!r.ok) throw new Error("Failed to fetch uploads");
      return r.json();
    },
  });
  const deleteUpload = useMutation({
    mutationFn: (id: any) => apiRequest("DELETE", `/api/admin/uploads/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/uploads"] }),
  });

  const uploads = data?.uploads || [];
  const total = data?.total || 0;
  const pages = Math.ceil(total / 50);

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-black">Uploads</h2>
          <p className="text-gray-500 text-sm mt-1">All file uploads across the platform ({total} total)</p>
        </div>
        <button onClick={() => refetch()} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-orange-500" /></div>
      ) : uploads.length === 0 ? (
        <div className="text-center py-16 text-gray-600 font-bold">No uploads yet</div>
      ) : (
        <div className="bg-[#0e0e0e] border border-white/[0.06] rounded-2xl overflow-hidden divide-y divide-white/[0.04]">
          {uploads.map((u: any) => {
            const isLocalOnly = u.local_only === true;
            const viewUrl = u.public_url?.startsWith("http") ? u.public_url : `${window.location.origin}${u.public_url}`;
            const displayName = u.username || u.owner_username;
            return (
              <div key={u.id} className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors">
                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0 overflow-hidden">
                  {u.content_type?.startsWith("image/") ? (
                    <img src={viewUrl} alt="" className="w-8 h-8 rounded-lg object-cover" onError={e => { (e.target as any).style.display = "none"; }} />
                  ) : u.content_type?.startsWith("video/") ? (
                    <Film className="w-4 h-4 text-blue-400" />
                  ) : u.content_type?.startsWith("audio/") ? (
                    <Headphones className="w-4 h-4 text-purple-400" />
                  ) : (
                    <Upload className="w-4 h-4 text-gray-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-bold truncate">{u.file_name}</p>
                    {isLocalOnly && (
                      <span className="shrink-0 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-widest bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">Local</span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-500 truncate">
                    {displayName ? <span className="text-orange-400">@{displayName}</span> : <span className="text-gray-600">Unknown</span>}
                    {" · "}{u.content_type}{" · "}{new Date(u.uploaded_at).toLocaleDateString()}
                  </p>
                </div>
                <a
                  href={viewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid={`link-view-upload-${u.id}`}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-orange-500/10 text-gray-500 hover:text-orange-400 text-[11px] font-bold transition-colors shrink-0"
                >
                  <ExternalLink className="w-3 h-3" />
                  View
                </a>
                <button onClick={() => deleteUpload.mutate(u.id)} className="p-1.5 rounded-lg bg-white/5 hover:bg-red-500/20 text-gray-500 hover:text-red-400 transition-colors shrink-0">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 rounded-lg bg-white/5 text-xs font-black disabled:opacity-30 hover:bg-white/10 transition-colors">Prev</button>
          <span className="text-xs text-gray-500">{page} / {pages}</span>
          <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages} className="px-3 py-1.5 rounded-lg bg-white/5 text-xs font-black disabled:opacity-30 hover:bg-white/10 transition-colors">Next</button>
        </div>
      )}
    </div>
  );
}

// ─── Database Management Tab (Owner Only) ──────────────────────────────────────
function DatabaseManagementTab() {
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [sqlQuery, setSqlQuery] = useState("SELECT * FROM users LIMIT 10");
  const [queryResult, setQueryResult] = useState<any>(null);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [queryLoading, setQueryLoading] = useState(false);

  const { data: dbStats, isLoading: statsLoading } = useQuery<any>({
    queryKey: ["/api/admin/db/stats"],
  });

  const { data: tableData, isLoading: tableLoading } = useQuery<any>({
    queryKey: ["/api/admin/db/table", selectedTable, page],
    enabled: !!selectedTable,
    queryFn: async () => {
      if (!selectedTable) return null;
      const r = await fetch(`/api/admin/db/table/${selectedTable}?page=${page}`, { credentials: "include" });
      return r.json();
    },
  });

  async function runQuery() {
    setQueryLoading(true);
    setQueryError(null);
    setQueryResult(null);
    try {
      const r = await fetch("/api/admin/db/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ query: sqlQuery }),
      });
      const data = await r.json();
      if (!r.ok) {
        setQueryError(data.message || "Query failed");
      } else {
        setQueryResult(data);
      }
    } catch (e: any) {
      setQueryError(e.message);
    } finally {
      setQueryLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black">Database Management</h2>
        <p className="text-gray-500 text-sm mt-1">Owner-only database viewer and query tool</p>
      </div>

      {/* Stats */}
      <div>
        <h3 className="text-xs font-black uppercase tracking-widest text-gray-500 mb-3">Database Overview</h3>
        {statsLoading ? (
          <div className="flex items-center gap-2 text-gray-500 text-sm"><Loader2 className="w-4 h-4 animate-spin" /> Loading stats...</div>
        ) : dbStats ? (
          <div>
            <div className="mb-3 text-sm text-gray-400">Total size: <span className="text-orange-400 font-black">{dbStats.dbSize}</span></div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {Object.entries(dbStats.stats as Record<string, number>).map(([table, count]) => (
                <button
                  key={table}
                  onClick={() => { setSelectedTable(table); setPage(0); }}
                  className={`p-3 rounded-xl border text-left transition-all ${selectedTable === table ? "border-orange-500/50 bg-orange-500/10" : "border-white/[0.06] bg-[#0e0e0e] hover:border-white/10"}`}
                  data-testid={`db-table-btn-${table}`}
                >
                  <div className="text-[10px] uppercase tracking-widest text-gray-500 font-black">{table.replace(/_/g, " ")}</div>
                  <div className="text-lg font-black text-white mt-1">{count === -1 ? "N/A" : count.toLocaleString()}</div>
                  <div className="text-[9px] text-gray-600">rows</div>
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {/* Table Viewer */}
      {selectedTable && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-black uppercase tracking-widest text-gray-500">Table: <span className="text-orange-400">{selectedTable}</span></h3>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} className="px-3 py-1.5 rounded-lg bg-white/5 text-xs font-black disabled:opacity-40 hover:bg-white/10">← Prev</button>
              <span className="text-xs text-gray-500">Page {page + 1}</span>
              <button onClick={() => setPage(page + 1)} disabled={tableData && (page + 1) * 50 >= tableData.total} className="px-3 py-1.5 rounded-lg bg-white/5 text-xs font-black disabled:opacity-40 hover:bg-white/10">Next →</button>
            </div>
          </div>
          {tableLoading ? (
            <div className="flex items-center gap-2 text-gray-500 text-sm"><Loader2 className="w-4 h-4 animate-spin" /> Loading...</div>
          ) : tableData && tableData.rows ? (
            <div>
              <div className="text-[10px] text-gray-600 mb-2">{tableData.total.toLocaleString()} total rows</div>
              <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-white/[0.06] bg-white/[0.03]">
                      {tableData.fields.map((f: string) => (
                        <th key={f} className="px-3 py-2 text-left text-[10px] uppercase tracking-widest text-gray-500 font-black whitespace-nowrap">{f}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tableData.rows.map((row: any, i: number) => (
                      <tr key={i} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                        {tableData.fields.map((f: string) => (
                          <td key={f} className="px-3 py-2 text-gray-300 font-mono max-w-[200px] truncate" title={String(row[f] ?? "")}>
                            {row[f] === null ? <span className="text-gray-600 italic">null</span> : typeof row[f] === "object" ? <span className="text-blue-400">{JSON.stringify(row[f]).slice(0, 60)}</span> : String(row[f]).slice(0, 80)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* SQL Query Runner */}
      <div>
        <h3 className="text-xs font-black uppercase tracking-widest text-gray-500 mb-3">SQL Query Runner <span className="text-gray-600">(SELECT only)</span></h3>
        <div className="space-y-2">
          <textarea
            value={sqlQuery}
            onChange={e => setSqlQuery(e.target.value)}
            rows={4}
            className="w-full bg-[#0e0e0e] border border-white/[0.08] rounded-xl px-4 py-3 text-sm font-mono text-gray-200 focus:outline-none focus:border-orange-500/50 resize-none"
            placeholder="SELECT * FROM users LIMIT 10"
            data-testid="db-query-input"
          />
          <button
            onClick={runQuery}
            disabled={queryLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-500 text-black text-xs font-black hover:bg-orange-400 disabled:opacity-50 transition-all"
            data-testid="db-query-run"
          >
            {queryLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Database className="w-3 h-3" />}
            Run Query
          </button>
          {queryError && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-mono">{queryError}</div>
          )}
          {queryResult && (
            <div>
              <div className="text-[10px] text-gray-500 mb-2">{queryResult.rowCount} rows returned</div>
              {queryResult.rows.length > 0 && (
                <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-white/[0.06] bg-white/[0.03]">
                        {queryResult.fields.map((f: string) => (
                          <th key={f} className="px-3 py-2 text-left text-[10px] uppercase tracking-widest text-gray-500 font-black whitespace-nowrap">{f}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {queryResult.rows.map((row: any, i: number) => (
                        <tr key={i} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                          {queryResult.fields.map((f: string) => (
                            <td key={f} className="px-3 py-2 text-gray-300 font-mono max-w-[200px] truncate" title={String(row[f] ?? "")}>
                              {row[f] === null ? <span className="text-gray-600 italic">null</span> : typeof row[f] === "object" ? <span className="text-blue-400">{JSON.stringify(row[f]).slice(0, 60)}</span> : String(row[f]).slice(0, 80)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
