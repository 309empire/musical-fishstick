import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { SiDiscord, SiSpotify } from "react-icons/si";

const DISCORD_FLAGS: { flag: number; label: string; emoji: string; color: string }[] = [
  { flag: 1 << 0,  label: "Discord Staff",              emoji: "🛡️",  color: "#5865F2" },
  { flag: 1 << 1,  label: "Partnered Server Owner",     emoji: "👥",  color: "#5865F2" },
  { flag: 1 << 2,  label: "HypeSquad Events",           emoji: "🏆",  color: "#5865F2" },
  { flag: 1 << 3,  label: "Bug Hunter Level 1",         emoji: "🐛",  color: "#23a55a" },
  { flag: 1 << 6,  label: "HypeSquad Bravery",          emoji: "🟣",  color: "#9c59b6" },
  { flag: 1 << 7,  label: "HypeSquad Brilliance",       emoji: "🔴",  color: "#e74c3c" },
  { flag: 1 << 8,  label: "HypeSquad Balance",          emoji: "🟡",  color: "#f1c40f" },
  { flag: 1 << 9,  label: "Early Supporter",            emoji: "💜",  color: "#9b59b6" },
  { flag: 1 << 14, label: "Bug Hunter Level 2",         emoji: "🥇",  color: "#f0b232" },
  { flag: 1 << 17, label: "Verified Bot Developer",     emoji: "🤖",  color: "#5865F2" },
  { flag: 1 << 18, label: "Discord Certified Moderator",emoji: "⚖️",  color: "#23a55a" },
  { flag: 1 << 22, label: "Active Developer",           emoji: "👨‍💻", color: "#23a55a" },
];

function getDiscordBadges(publicFlags: number): typeof DISCORD_FLAGS {
  if (!publicFlags) return [];
  return DISCORD_FLAGS.filter(b => (publicFlags & b.flag) !== 0);
}

function timeAgo(date: Date | string | null): string {
  if (!date) return "a while ago";
  const d = typeof date === "string" ? new Date(date) : date;
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const STATUS_COLORS: Record<string, string> = {
  online: "#23a55a",
  idle: "#f0b232",
  dnd: "#f23f43",
  offline: "#80848e",
};

const STATUS_LABELS: Record<string, string> = {
  online: "Online",
  idle: "Idle",
  dnd: "Do Not Disturb",
  offline: "Offline",
};

export function DiscordProfileWidget({
  user,
  themeColor,
  contentAlign,
  alwaysOffline,
}: {
  user: any;
  themeColor: string;
  contentAlign: string;
  alwaysOffline?: boolean;
}) {
  const discordId = user?.discordId;
  const discordUsername = user?.discordUsername || "Unknown";
  const discordAvatarRaw = user?.discordAvatar;
  const lastSeenAt = user?.lastSeenAt;

  const [lanyard, setLanyard] = useState<any>(null);
  const [lanyardLoaded, setLanyardLoaded] = useState(false);
  const [lanyardError, setLanyardError] = useState(false);

  useEffect(() => {
    if (!discordId) return;
    setLanyardLoaded(false);
    setLanyardError(false);
    fetch(`https://api.lanyard.rest/v1/users/${discordId}`)
      .then(r => r.ok ? r.json() : Promise.reject("not found"))
      .then(d => {
        setLanyard(d?.data || null);
        setLanyardLoaded(true);
      })
      .catch(() => {
        setLanyardLoaded(true);
        setLanyardError(true);
      });
  }, [discordId]);

  const avatarUrl = (() => {
    const lanyardAvatar = lanyard?.discord_user?.avatar;
    const lanyardId = lanyard?.discord_user?.id;
    if (lanyardAvatar && lanyardId) {
      const ext = lanyardAvatar.startsWith("a_") ? "gif" : "png";
      return `https://cdn.discordapp.com/avatars/${lanyardId}/${lanyardAvatar}.${ext}?size=128`;
    }
    if (discordAvatarRaw) {
      if (discordAvatarRaw.startsWith("http")) return discordAvatarRaw;
      if (discordId) {
        const ext = discordAvatarRaw.startsWith("a_") ? "gif" : "png";
        return `https://cdn.discordapp.com/avatars/${discordId}/${discordAvatarRaw}.${ext}?size=128`;
      }
    }
    const idx = discordId ? parseInt(discordId) % 5 : 0;
    return `https://cdn.discordapp.com/embed/avatars/${idx}.png`;
  })();

  const displayName =
    lanyard?.discord_user?.global_name ||
    lanyard?.discord_user?.username ||
    (discordUsername.includes("#") ? discordUsername.split("#")[0] : discordUsername);

  const usernameTag = lanyard?.discord_user?.username
    ? lanyard.discord_user.discriminator && lanyard.discord_user.discriminator !== "0"
      ? `@${lanyard.discord_user.username}#${lanyard.discord_user.discriminator}`
      : `@${lanyard.discord_user.username}`
    : discordUsername.startsWith("@")
      ? discordUsername
      : `@${discordUsername}`;

  const rawStatus: string = lanyard?.discord_status || "offline";
  const status: string = alwaysOffline ? "offline" : rawStatus;
  const statusColor = STATUS_COLORS[status] || STATUS_COLORS.offline;
  const statusLabel = STATUS_LABELS[status] || "Offline";

  const spotify = alwaysOffline ? null : lanyard?.spotify;
  const listeningToSpotify = !alwaysOffline && lanyard?.listening_to_spotify && lanyard?.spotify;
  const activity = alwaysOffline ? null : lanyard?.activities?.find((a: any) => a.type === 0 && a.name !== "Spotify");
  const customStatus = alwaysOffline ? null : lanyard?.activities?.find((a: any) => a.type === 4);

  const profileBannerHash = lanyard?.discord_user?.banner;
  const bannerUrl = profileBannerHash && discordId
    ? `https://cdn.discordapp.com/banners/${discordId}/${profileBannerHash}.${profileBannerHash.startsWith("a_") ? "gif" : "png"}?size=480`
    : null;

  const publicFlags = lanyard?.discord_user?.public_flags || 0;
  const discordBadges = getDiscordBadges(publicFlags);

  const needsLanyard = !lanyardLoaded;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="mb-4"
    >
      <div
        className="rounded-2xl relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #1e1f2e 0%, #1a1b2e 100%)",
          border: "1px solid rgba(88,101,242,0.35)",
          boxShadow: "0 4px 24px rgba(88,101,242,0.12)",
        }}
      >
        {bannerUrl && (
          <div className="w-full h-16 relative overflow-hidden">
            <img src={bannerUrl} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, transparent 50%, #1e1f2e 100%)" }} />
          </div>
        )}

        <div className="p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="relative shrink-0">
              <img
                src={avatarUrl}
                alt={displayName}
                className="w-12 h-12 rounded-full object-cover"
                style={{ border: `2px solid ${statusColor}` }}
                onError={(e: any) => { e.target.src = "https://cdn.discordapp.com/embed/avatars/0.png"; }}
              />
              <div
                className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-[#1e1f2e]"
                style={{ background: statusColor }}
                title={statusLabel}
              />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-black text-sm text-white truncate">{displayName}</span>
                {discordBadges.length > 0 && (
                  <div className="flex items-center gap-0.5 flex-wrap">
                    {discordBadges.map(b => (
                      <span key={b.flag} title={b.label} className="text-[11px] cursor-default" style={{ lineHeight: 1 }}>{b.emoji}</span>
                    ))}
                  </div>
                )}
              </div>
              <p className="text-[11px] truncate" style={{ color: "rgba(255,255,255,0.45)" }}>{usernameTag}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: statusColor }} />
                <span className="text-[10px] font-bold" style={{ color: statusColor }}>
                  {status === "offline" && lastSeenAt
                    ? `Last seen ${timeAgo(lastSeenAt)}`
                    : statusLabel}
                </span>
                {needsLanyard && (
                  <span className="text-[9px] text-gray-600 ml-1">loading…</span>
                )}
              </div>
            </div>

            <div
              className="shrink-0 w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(88,101,242,0.18)", border: "1px solid rgba(88,101,242,0.3)" }}
            >
              <SiDiscord className="w-4 h-4" style={{ color: "#5865F2" }} />
            </div>
          </div>

          {lanyardError && (
            <div className="px-3 py-2 rounded-xl text-[10px] text-yellow-400/70 bg-yellow-400/5 border border-yellow-400/10">
              Live presence unavailable — join discord.gg/lanyard to enable activity tracking.
            </div>
          )}

          {customStatus?.state && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: "rgba(255,255,255,0.04)" }}>
              <span className="text-base leading-none">{customStatus.emoji?.name || "💬"}</span>
              <span className="text-[11px] text-gray-300 truncate">{customStatus.state}</span>
            </div>
          )}

          {activity && (
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl" style={{ background: "rgba(255,255,255,0.04)" }}>
              {activity.assets?.large_image && !activity.assets.large_image.startsWith("mp:") ? (
                <img
                  src={`https://cdn.discordapp.com/app-assets/${activity.application_id}/${activity.assets.large_image}.png`}
                  alt=""
                  className="w-10 h-10 rounded-lg shrink-0 object-cover"
                  onError={(e: any) => { e.target.style.display = "none"; }}
                />
              ) : (
                <div className="w-10 h-10 rounded-lg shrink-0 flex items-center justify-center text-lg" style={{ background: "rgba(88,101,242,0.15)" }}>
                  🎮
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black uppercase tracking-wider text-gray-500">Playing</p>
                <p className="text-xs font-bold text-white truncate">{activity.name}</p>
                {activity.details && <p className="text-[10px] text-gray-400 truncate">{activity.details}</p>}
                {activity.state && <p className="text-[10px] text-gray-500 truncate">{activity.state}</p>}
              </div>
            </div>
          )}

          {listeningToSpotify && (
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl" style={{ background: "rgba(29,185,84,0.08)", border: "1px solid rgba(29,185,84,0.2)" }}>
              {spotify.album_art_url ? (
                <img src={spotify.album_art_url} alt="" className="w-10 h-10 rounded-lg shrink-0 object-cover" />
              ) : (
                <div className="w-10 h-10 rounded-lg shrink-0 flex items-center justify-center" style={{ background: "#1DB954" }}>
                  <SiSpotify className="w-5 h-5 text-white" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <SiSpotify className="w-3 h-3 shrink-0" style={{ color: "#1DB954" }} />
                  <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: "#1DB954" }}>Listening to Spotify</p>
                </div>
                <p className="text-xs font-bold text-white truncate">{spotify.song}</p>
                <p className="text-[10px] text-gray-400 truncate">by {spotify.artist?.replace(/;/g, ", ")}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
