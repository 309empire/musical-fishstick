export function resolveUrl(url: string | null | undefined): string {
  if (!url) return "";
  if (url.startsWith("/objects/")) return `${window.location.origin}${url}`;
  return url;
}

export function isUploadedFile(url: string | null | undefined): boolean {
  if (!url) return false;
  return url.includes("/objects/uploads/") || url.startsWith("/objects/");
}

export function getYouTubeVideoId(url: string): string | null {
  if (!url) return null;
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

export function isYouTubeUrl(url: string): boolean {
  return /(?:youtube\.com|youtu\.be)/.test(url);
}

export function getEmbedType(url: string): "youtube" | "soundcloud" | "spotify" | "audio" | null {
  if (!url) return null;
  if (/(?:youtube\.com|youtu\.be)/.test(url)) return "youtube";
  if (/soundcloud\.com/.test(url)) return "soundcloud";
  if (/open\.spotify\.com/.test(url)) return "spotify";
  if (url.startsWith("http")) return "audio";
  return null;
}

export function getEmbedServiceLabel(url: string): string {
  const t = getEmbedType(url);
  if (t === "youtube") return "YouTube";
  if (t === "soundcloud") return "SoundCloud";
  if (t === "spotify") return "Spotify";
  return "";
}
