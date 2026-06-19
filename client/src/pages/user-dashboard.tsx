import { useAuth } from "@/hooks/use-auth";
import { useParams, useLocation } from "wouter";
import { canManageWebsite } from "@shared/schema";
import NotFound from "./not-found";
import { Loader2, ArrowLeft, ExternalLink, Music, Image, User, Tag, Link2, Eye, EyeOff } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { SiDiscord } from "react-icons/si";

export default function UserDashboard() {
  const { user: currentUser, isLoading: authLoading } = useAuth();
  const params = useParams<{ username: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const username = params.username;
  const [activeTab, setActiveTab] = useState<"overview" | "profile" | "music" | "badges" | "settings">("overview");
  const [showPreview, setShowPreview] = useState(false);

  const { data: allUsers, isLoading: usersLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/users"],
    enabled: !authLoading && !!currentUser && canManageWebsite(currentUser.role),
  });

  const targetUser = allUsers?.find(
    (u: any) => u.username.toLowerCase() === username?.toLowerCase()
  );

  const { data: targetProfile, isLoading: profileLoading } = useQuery<any>({
    queryKey: [`/api/public/profile/${username}`],
    enabled: !!username,
  });

  const { data: publicTracks = [] } = useQuery<any[]>({
    queryKey: [`/api/public/tracks/${username}`],
    enabled: !!username,
  });

  const { data: allBadges } = useQuery<any[]>({ queryKey: ["/api/badges"] });

  if (authLoading || usersLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <span className="text-xs font-black italic tracking-widest text-white/60">HEXED.AT</span>
      </div>
    );
  }

  if (!currentUser || !canManageWebsite(currentUser.role)) {
    return <NotFound />;
  }

  if (!targetUser) {
    return <NotFound />;
  }

  const profile = targetProfile?.profile || {};
  const links = targetProfile?.links || [];
  const themeColor = profile.themeColor || "#F97316";
  const settings = profile.settings || {};
  const getS = (k: string, def: any) => settings[k] !== undefined ? settings[k] : def;

  const saveUser = async (updates: any) => {
    try {
      await apiRequest("PATCH", `/api/admin/users/${targetUser.id}`, updates);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "User updated" });
    } catch {
      toast({ title: "Failed to update user", variant: "destructive" });
    }
  };

  const toggleBadge = (badgeName: string, checked: boolean) => {
    const curr = targetUser.badges || [];
    const next = checked ? [...curr, badgeName] : curr.filter((b: string) => b !== badgeName);
    saveUser({ badges: next });
  };

  const tabs = [
    { id: "overview", label: "Overview", icon: User },
    { id: "profile", label: "Profile", icon: Image },
    { id: "music", label: "Music", icon: Music },
    { id: "badges", label: "Badges", icon: Tag },
    { id: "settings", label: "Settings", icon: Eye },
  ] as const;

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <header className="border-b border-white/[0.04] bg-[#050505]/90 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/dashboard")}
              className="flex items-center gap-2 text-gray-500 hover:text-white transition-colors text-sm font-bold"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Admin
            </button>
            <div className="h-4 w-px bg-white/10" />
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-orange-500">Managing</span>
              <span className="text-sm font-black">@{targetUser.username}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowPreview(v => !v)}
              className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest transition-colors px-3 py-1.5 rounded-lg border ${showPreview ? "border-orange-500/40 text-orange-400 bg-orange-500/10" : "border-white/10 text-gray-500 hover:text-white"}`}
            >
              {showPreview ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              {showPreview ? "Hide Preview" : "Live Preview"}
            </button>
            <a
              href={`/${targetUser.username}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-orange-500 transition-colors"
            >
              <ExternalLink className="w-3 h-3" /> Public Profile
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-5">
        <div className="bg-[#0a0a0a] border border-orange-500/30 rounded-xl p-3 flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse shrink-0" />
          <p className="text-xs text-orange-400 font-bold">
            Managing <span className="font-black">@{targetUser.username}</span> as {currentUser.role}
          </p>
        </div>

        {/* Live Preview Iframe */}
        {showPreview && (
          <div className="rounded-2xl overflow-hidden border border-white/[0.06] bg-black" style={{ height: 500 }}>
            <div className="flex items-center gap-2 px-3 py-2 bg-[#0e0e0e] border-b border-white/[0.04]">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
              </div>
              <span className="text-[10px] font-mono text-gray-600 flex-1 text-center">{window.location.host}/{targetUser.username}</span>
            </div>
            <iframe
              src={`/${targetUser.username}`}
              className="w-full"
              style={{ height: "calc(100% - 36px)", border: "none" }}
              title={`Profile of ${targetUser.username}`}
            />
          </div>
        )}

        {/* Tab Nav */}
        <div className="flex gap-1 bg-[#0a0a0a] border border-white/[0.04] rounded-xl p-1 w-fit overflow-x-auto">
          {tabs.map(t => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${activeTab === t.id ? "bg-orange-500 text-black" : "text-gray-500 hover:text-gray-300"}`}
              >
                <Icon className="w-3 h-3" />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* ── OVERVIEW TAB ── */}
        {activeTab === "overview" && (
          <div className="grid md:grid-cols-3 gap-5">
            <div className="space-y-4">
              <div className="bg-[#0e0e0e] border border-white/[0.06] rounded-2xl p-5">
                <h2 className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-4">User Info</h2>
                <div className="flex items-center gap-3 mb-4">
                  <div className="relative">
                    <Avatar className="w-14 h-14 border-2 border-white/10">
                      <AvatarImage src={profile.avatarUrl || targetUser.discordAvatar} />
                      <AvatarFallback className="bg-orange-500/10 text-orange-500 font-black text-lg">
                        {targetUser.username[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {profile.avatarUrl && (
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-green-500 border-2 border-[#0e0e0e]" title="Has custom avatar" />
                    )}
                  </div>
                  <div>
                    <p className="font-black">{profile.displayName || targetUser.username}</p>
                    <p className="text-[10px] text-gray-500">@{targetUser.username}</p>
                    {profile.location && <p className="text-[10px] text-gray-600 mt-0.5">📍 {profile.location}</p>}
                  </div>
                </div>
                <div className="space-y-1.5 text-xs">
                  {[
                    { label: "UID", value: `#${targetUser.id}` },
                    { label: "Role", value: targetUser.role, color: targetUser.role === "owner" ? "text-red-400" : targetUser.role === "administrator" ? "text-orange-400" : "text-gray-300" },
                    { label: "Views", value: String(targetUser.views || 0) },
                    { label: "Email", value: targetUser.email, mono: true },
                    { label: "Premium", value: targetUser.isPremium ? "Yes" : "No", color: targetUser.isPremium ? "text-purple-400" : "text-gray-600" },
                    { label: "Joined", value: targetUser.joinDate ? new Date(targetUser.joinDate).toLocaleDateString() : "—" },
                  ].map(({ label, value, color, mono }) => (
                    <div key={label} className="flex justify-between py-1.5 border-b border-white/[0.04] last:border-0">
                      <span className="text-gray-500">{label}</span>
                      <span className={`${mono ? "font-mono text-[10px] max-w-[140px] truncate" : "font-bold"} ${color || ""}`}>{value}</span>
                    </div>
                  ))}
                  {targetUser.discordId && (
                    <div className="flex justify-between py-1.5 border-t border-white/[0.04]">
                      <span className="text-gray-500 flex items-center gap-1"><SiDiscord className="w-3 h-3" /> Discord</span>
                      <span className="font-mono text-[10px] text-[#7289da]">{targetUser.discordUsername}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-[#0e0e0e] border border-white/[0.06] rounded-2xl p-4">
                <h2 className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-3">Quick Controls</h2>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold">💎 Premium</span>
                    <Switch checked={!!targetUser.isPremium} onCheckedChange={v => saveUser({ isPremium: v })} />
                  </div>
                  {targetUser.role !== "owner" && (
                    targetUser.role === "banned" ? (
                      <Button onClick={() => saveUser({ role: "user" })} className="w-full bg-transparent border border-green-500 text-green-500 hover:bg-green-500 hover:text-black font-black text-xs h-8">
                        Unban User
                      </Button>
                    ) : (
                      <Button onClick={() => saveUser({ role: "banned" })} className="w-full bg-transparent border border-red-500/60 text-red-400 hover:bg-red-500 hover:text-white font-black text-xs h-8">
                        Ban User
                      </Button>
                    )
                  )}
                </div>
              </div>
            </div>

            <div className="md:col-span-2 space-y-4">
              {/* Theme & Background Preview */}
              <div className="bg-[#0e0e0e] border border-white/[0.06] rounded-2xl overflow-hidden">
                <div
                  className="h-24 w-full relative"
                  style={{
                    background: profile.backgroundUrl
                      ? `url(${profile.backgroundUrl}) center/cover no-repeat`
                      : `linear-gradient(135deg, ${themeColor}22, ${themeColor}05)`,
                  }}
                >
                  <div className="absolute inset-0 bg-black/30" />
                  {!profile.backgroundUrl && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-[10px] text-gray-600 font-bold">No background set</span>
                    </div>
                  )}
                  <div className="absolute bottom-3 left-4 flex items-end gap-3">
                    <Avatar className="w-12 h-12 border-2" style={{ borderColor: themeColor }}>
                      <AvatarImage src={profile.avatarUrl || targetUser.discordAvatar} />
                      <AvatarFallback style={{ background: themeColor + "22", color: themeColor }} className="font-black">
                        {targetUser.username[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-black text-sm text-white drop-shadow">{profile.displayName || targetUser.username}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <div className="w-2 h-2 rounded-full" style={{ background: themeColor }} />
                        <span className="text-[10px] text-gray-300 font-mono">{themeColor}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="p-4 space-y-2">
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="text-gray-600 mb-1">Background</p>
                      {profile.backgroundUrl ? (
                        <a href={profile.backgroundUrl} target="_blank" rel="noreferrer" className="text-blue-400 underline text-[10px] truncate block max-w-full">View image</a>
                      ) : <p className="text-gray-600">Not set</p>}
                    </div>
                    <div>
                      <p className="text-gray-600 mb-1">Avatar</p>
                      {profile.avatarUrl ? (
                        <a href={profile.avatarUrl} target="_blank" rel="noreferrer" className="text-blue-400 underline text-[10px]">View image</a>
                      ) : <p className="text-gray-600">Not set</p>}
                    </div>
                    {profile.bio && (
                      <div className="col-span-2">
                        <p className="text-gray-600 mb-1">Bio</p>
                        <p className="text-gray-300 leading-relaxed text-[11px]">{profile.bio}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Links */}
              {links.length > 0 && (
                <div className="bg-[#0e0e0e] border border-white/[0.06] rounded-2xl p-4">
                  <h2 className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-3 flex items-center gap-1.5"><Link2 className="w-3 h-3" /> Links ({links.length})</h2>
                  <div className="space-y-1.5">
                    {links.map((link: any, i: number) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <div className="w-1 h-1 rounded-full shrink-0" style={{ background: themeColor }} />
                        <span className="text-gray-400 font-bold truncate">{link.label || link.title}</span>
                        <a href={link.url} target="_blank" rel="noreferrer" className="text-gray-600 hover:text-blue-400 font-mono text-[10px] truncate max-w-[180px]">{link.url}</a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tracks summary */}
              {publicTracks.length > 0 && (
                <div className="bg-[#0e0e0e] border border-white/[0.06] rounded-2xl p-4">
                  <h2 className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-3 flex items-center gap-1.5"><Music className="w-3 h-3" /> Music ({publicTracks.length} track{publicTracks.length !== 1 ? "s" : ""})</h2>
                  <div className="space-y-1.5">
                    {publicTracks.map((t: any, i: number) => (
                      <div key={i} className="flex items-center gap-2 text-xs bg-black/30 rounded-lg px-2.5 py-1.5">
                        <Music className="w-3 h-3 shrink-0" style={{ color: themeColor }} />
                        <span className="font-bold truncate flex-1">{t.title || t.url}</span>
                        {t.platform && <span className="text-[9px] text-gray-600 font-black uppercase bg-white/5 px-1.5 py-0.5 rounded">{t.platform}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── PROFILE TAB ── */}
        {activeTab === "profile" && (
          <div className="space-y-4">
            <div className="bg-[#0e0e0e] border border-white/[0.06] rounded-2xl p-5">
              <h2 className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-4">Profile Details</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                {[
                  { label: "Display Name", value: profile.displayName || "—" },
                  { label: "Location", value: profile.location || "—" },
                  { label: "Theme Color", value: themeColor, isColor: true },
                  { label: "Avatar URL", value: profile.avatarUrl ? "Set" : "Not set", link: profile.avatarUrl },
                  { label: "Background URL", value: profile.backgroundUrl ? "Set" : "Not set", link: profile.backgroundUrl },
                  { label: "Avatar Radius", value: String(profile.avatarRadius ?? 50) + "%" },
                  { label: "Decoration", value: profile.avatarDecoration || "None" },
                  { label: "Cursor", value: profile.cursor || "Default" },
                  { label: "Font", value: profile.fontFamily || "Default" },
                ].map(({ label, value, isColor, link }) => (
                  <div key={label} className="bg-black/30 rounded-xl p-3">
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-600 mb-1">{label}</p>
                    <div className="flex items-center gap-1.5">
                      {isColor && <div className="w-3 h-3 rounded-full border border-white/20" style={{ background: value }} />}
                      {link ? (
                        <a href={link} target="_blank" rel="noreferrer" className="text-blue-400 underline font-bold">{value}</a>
                      ) : (
                        <p className="font-bold text-gray-200 truncate">{value}</p>
                      )}
                    </div>
                  </div>
                ))}
                {profile.bio && (
                  <div className="col-span-2 md:col-span-3 bg-black/30 rounded-xl p-3">
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-600 mb-1">Bio</p>
                    <p className="font-bold text-gray-200 text-xs leading-relaxed">{profile.bio}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Background visual */}
            {profile.backgroundUrl && (
              <div className="bg-[#0e0e0e] border border-white/[0.06] rounded-2xl overflow-hidden">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 px-4 pt-4 mb-2">Background</p>
                <img src={profile.backgroundUrl} alt="Background" className="w-full max-h-48 object-cover" />
              </div>
            )}

            {/* Avatar visual */}
            {profile.avatarUrl && (
              <div className="bg-[#0e0e0e] border border-white/[0.06] rounded-2xl p-4 flex items-center gap-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Avatar</p>
                <Avatar className="w-16 h-16 border-2" style={{ borderColor: themeColor }}>
                  <AvatarImage src={profile.avatarUrl} />
                  <AvatarFallback>{targetUser.username[0].toUpperCase()}</AvatarFallback>
                </Avatar>
              </div>
            )}

            {/* Links */}
            <div className="bg-[#0e0e0e] border border-white/[0.06] rounded-2xl p-5">
              <h2 className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-3">Links ({links.length})</h2>
              {links.length === 0 ? (
                <p className="text-xs text-gray-600">No links set.</p>
              ) : (
                <div className="space-y-2">
                  {links.map((link: any, i: number) => (
                    <div key={i} className="flex items-center gap-3 bg-black/30 rounded-xl px-3 py-2.5 text-xs">
                      {link.icon && <span className="text-base shrink-0">{link.icon}</span>}
                      <div className="flex-1 min-w-0">
                        <p className="font-bold truncate">{link.label || link.title}</p>
                        <a href={link.url} target="_blank" rel="noreferrer" className="text-blue-400 text-[10px] font-mono truncate block">{link.url}</a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── MUSIC TAB ── */}
        {activeTab === "music" && (
          <div className="space-y-4">
            <div className="bg-[#0e0e0e] border border-white/[0.06] rounded-2xl p-5">
              <h2 className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">Music Tracks</h2>
              <p className="text-xs text-gray-600 mb-4">{publicTracks.length} / {targetUser.maxTracks ?? 3} tracks used</p>
              {profileLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-gray-600" /></div>
              ) : publicTracks.length === 0 ? (
                <div className="text-center py-10 bg-black/20 rounded-xl">
                  <Music className="w-8 h-8 text-gray-700 mx-auto mb-2" />
                  <p className="text-xs text-gray-600 font-bold">No music tracks set</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {publicTracks.map((track: any, i: number) => (
                    <div key={i} className="bg-black/30 border border-white/[0.04] rounded-xl p-3 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: themeColor + "22" }}>
                        <Music className="w-4 h-4" style={{ color: themeColor }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm truncate">{track.title || "Untitled"}</p>
                        <p className="text-[10px] text-gray-500 font-mono truncate">{track.url}</p>
                      </div>
                      {track.platform && (
                        <span className="text-[9px] font-black uppercase shrink-0 px-2 py-1 rounded-lg" style={{ background: themeColor + "22", color: themeColor }}>
                          {track.platform}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-[#0e0e0e] border border-white/[0.06] rounded-2xl p-5">
              <h2 className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-3">Track Limit</h2>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-gray-400">Max Tracks</Label>
                  <span className="text-xs font-mono" style={{ color: themeColor }}>{targetUser.maxTracks ?? 3}</span>
                </div>
                <input
                  type="range" min={0} max={20}
                  defaultValue={targetUser.maxTracks ?? 3}
                  onChange={() => {}}
                  onMouseUp={e => saveUser({ maxTracks: parseInt((e.target as HTMLInputElement).value) })}
                  className="w-full accent-orange-500"
                />
              </div>
              <div className="space-y-2 mt-4">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-gray-400">Max Tags</Label>
                  <span className="text-xs font-mono" style={{ color: themeColor }}>{targetUser.maxTags ?? 5}</span>
                </div>
                <input
                  type="range" min={0} max={20}
                  defaultValue={targetUser.maxTags ?? 5}
                  onChange={() => {}}
                  onMouseUp={e => saveUser({ maxTags: parseInt((e.target as HTMLInputElement).value) })}
                  className="w-full accent-orange-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* ── BADGES TAB ── */}
        {activeTab === "badges" && (
          <div className="bg-[#0e0e0e] border border-white/[0.06] rounded-2xl p-5">
            <h2 className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-4">Badges</h2>
            {!allBadges || allBadges.length === 0 ? (
              <p className="text-xs text-gray-600 text-center py-3">No badges created yet.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {allBadges.map((badge: any) => {
                  const owned = (targetUser.badges || []).includes(badge.name);
                  return (
                    <div
                      key={badge.id}
                      onClick={() => toggleBadge(badge.name, !owned)}
                      className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all cursor-pointer ${owned ? "border-orange-500/30 bg-orange-500/5" : "border-white/5 bg-black/30 hover:border-white/10"}`}
                    >
                      <div className={`w-5 h-5 rounded flex items-center justify-center border shrink-0 transition-all ${owned ? "bg-orange-500 border-orange-500" : "border-white/20 bg-transparent"}`}>
                        {owned && <span className="text-black text-xs font-black">✓</span>}
                      </div>
                      <div className="w-7 h-7 flex items-center justify-center shrink-0">
                        {badge.icon?.startsWith("http") || badge.icon?.includes("/objects/") ? (
                          <img src={badge.icon} alt={badge.name} className="w-6 h-6 object-contain" />
                        ) : (
                          <span className="text-xl">{badge.icon}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate">{badge.name}</p>
                        {badge.description && <p className="text-[10px] text-gray-600 truncate">{badge.description}</p>}
                      </div>
                      {owned && <span className="text-[9px] font-black uppercase text-orange-500 shrink-0">Active</span>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── SETTINGS TAB ── */}
        {activeTab === "settings" && (
          <div className="space-y-4">
            <div className="bg-[#0e0e0e] border border-white/[0.06] rounded-2xl p-5">
              <h2 className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-4">Profile Settings (Read-only View)</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                {[
                  { label: "Music Player", value: getS("musicEnabled", false) ? "On" : "Off" },
                  { label: "Autoplay", value: getS("autoplay", false) ? "On" : "Off" },
                  { label: "Reveal Screen", value: getS("revealEnabled", false) ? "On" : "Off" },
                  { label: "Show Views", value: getS("showViews", false) ? "On" : "Off" },
                  { label: "Match Links to Theme", value: getS("matchLinksToTheme", false) ? "On" : "Off" },
                  { label: "Match Badges to Theme", value: getS("matchBadgesToTheme", false) ? "On" : "Off" },
                  { label: "Badges Glow", value: getS("badgesGlow", false) ? "On" : "Off" },
                  { label: "Visual Effect", value: getS("visualEffect", "none") || "None" },
                  { label: "Music Position", value: getS("musicPosition", "bottom-right") },
                  { label: "Content Align", value: getS("contentAlign", "left") },
                  { label: "Links Per Row", value: String(getS("linksPerRow", 1)) },
                  { label: "Watermark", value: getS("hideWatermark", false) ? "Hidden" : "Visible" },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-black/30 rounded-xl p-2.5">
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-600 mb-1">{label}</p>
                    <p className={`font-bold ${value === "On" ? "text-green-400" : value === "Off" ? "text-gray-600" : "text-gray-200"}`}>{value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[#0e0e0e] border border-white/[0.06] rounded-2xl p-5">
              <h2 className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-3">Account Limits</h2>
              <div className="space-y-4">
                {[
                  { label: "Max Tracks", key: "maxTracks", default: 3, max: 20 },
                  { label: "Max Tags", key: "maxTags", default: 5, max: 20 },
                ].map(({ label, key, default: def, max }) => (
                  <div key={key} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-gray-400">{label}</Label>
                      <span className="text-xs font-mono text-orange-500">{targetUser[key] ?? def}</span>
                    </div>
                    <input
                      type="range" min={0} max={max}
                      defaultValue={targetUser[key] ?? def}
                      onChange={() => {}}
                      onMouseUp={e => saveUser({ [key]: parseInt((e.target as HTMLInputElement).value) })}
                      className="w-full accent-orange-500"
                    />
                  </div>
                ))}
              </div>
            </div>

            {targetUser.role !== "owner" && (
              <div className="bg-[#0e0e0e] border border-red-500/10 rounded-2xl p-5">
                <h2 className="text-[10px] font-black uppercase tracking-widest text-red-500/50 mb-3">Account Control</h2>
                <div className="flex gap-3">
                  {targetUser.role === "banned" ? (
                    <Button onClick={() => saveUser({ role: "user" })} className="bg-transparent border border-green-500 text-green-500 hover:bg-green-500 hover:text-black font-black text-xs">
                      Unban User
                    </Button>
                  ) : (
                    <Button onClick={() => saveUser({ role: "banned" })} className="bg-transparent border border-red-500/60 text-red-400 hover:bg-red-500 hover:text-white font-black text-xs">
                      Ban User
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
