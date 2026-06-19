import {
  SiDiscord, SiX, SiInstagram, SiYoutube, SiTiktok, SiTwitch,
  SiGithub, SiLinkedin, SiSpotify, SiPaypal, SiCashapp, SiLinktree,
  SiSteam, SiReddit, SiSnapchat, SiTelegram, SiKofi, SiPatreon,
  SiKick, SiPinterest,
} from "react-icons/si";

export const PLATFORMS: { id: string; name: string; icon: any; color: string; domain: string; placeholder: string }[] = [
  { id: "discord",   name: "Discord",     icon: SiDiscord,   color: "#5865F2", domain: "discord.gg",             placeholder: "https://discord.gg/..." },
  { id: "x",         name: "X / Twitter", icon: SiX,         color: "#e7e7e7", domain: "x.com",                  placeholder: "https://x.com/username" },
  { id: "instagram", name: "Instagram",   icon: SiInstagram, color: "#E1306C", domain: "instagram.com",          placeholder: "https://instagram.com/username" },
  { id: "youtube",   name: "YouTube",     icon: SiYoutube,   color: "#FF0000", domain: "youtube.com",            placeholder: "https://youtube.com/@channel" },
  { id: "tiktok",    name: "TikTok",      icon: SiTiktok,    color: "#69C9D0", domain: "tiktok.com",             placeholder: "https://tiktok.com/@username" },
  { id: "twitch",    name: "Twitch",      icon: SiTwitch,    color: "#9146FF", domain: "twitch.tv",              placeholder: "https://twitch.tv/username" },
  { id: "github",    name: "GitHub",      icon: SiGithub,    color: "#e7e7e7", domain: "github.com",             placeholder: "https://github.com/username" },
  { id: "linkedin",  name: "LinkedIn",    icon: SiLinkedin,  color: "#0077B5", domain: "linkedin.com",           placeholder: "https://linkedin.com/in/username" },
  { id: "spotify",   name: "Spotify",     icon: SiSpotify,   color: "#1DB954", domain: "spotify.com",            placeholder: "https://open.spotify.com/..." },
  { id: "paypal",    name: "PayPal",      icon: SiPaypal,    color: "#003087", domain: "paypal.com",             placeholder: "https://paypal.me/username" },
  { id: "cashapp",   name: "Cash App",    icon: SiCashapp,   color: "#00D64F", domain: "cash.app",               placeholder: "https://cash.app/$username" },
  { id: "linktree",  name: "Linktree",    icon: SiLinktree,  color: "#39E09B", domain: "linktr.ee",              placeholder: "https://linktr.ee/username" },
  { id: "steam",     name: "Steam",       icon: SiSteam,     color: "#c6d4df", domain: "store.steampowered.com", placeholder: "https://steamcommunity.com/id/..." },
  { id: "reddit",    name: "Reddit",      icon: SiReddit,    color: "#FF4500", domain: "reddit.com",             placeholder: "https://reddit.com/u/username" },
  { id: "snapchat",  name: "Snapchat",    icon: SiSnapchat,  color: "#FFFC00", domain: "snapchat.com",           placeholder: "https://snapchat.com/add/username" },
  { id: "telegram",  name: "Telegram",    icon: SiTelegram,  color: "#2CA5E0", domain: "t.me",                   placeholder: "https://t.me/username" },
  { id: "kofi",      name: "Ko-fi",       icon: SiKofi,      color: "#FF5E5B", domain: "ko-fi.com",              placeholder: "https://ko-fi.com/username" },
  { id: "patreon",   name: "Patreon",     icon: SiPatreon,   color: "#FF424D", domain: "patreon.com",            placeholder: "https://patreon.com/username" },
  { id: "kick",      name: "Kick",        icon: SiKick,      color: "#53FC18", domain: "kick.com",               placeholder: "https://kick.com/username" },
  { id: "pinterest", name: "Pinterest",   icon: SiPinterest, color: "#E60023", domain: "pinterest.com",          placeholder: "https://pinterest.com/username" },
];

export function getPlatform(id: string | undefined) {
  return PLATFORMS.find(p => p.id === id) ?? null;
}
