import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { motion, AnimatePresence, useSpring, useTransform } from "framer-motion";
import { useState, useEffect, useRef, useCallback } from "react";
import { Loader2, ExternalLink, MapPin, Calendar, Eye, Hash, Play, Pause, Music, Volume2, ChevronLeft, ChevronRight, Tag, Shuffle, User as UserIcon, Heart } from "lucide-react";
import { SiDiscord, SiSpotify } from "react-icons/si";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { VoidMark } from "@/lib/voidmark";
import { getPlatform } from "./dashboard";

// ─── CSS Animations ───────────────────────────────────────────────────────────

const PROFILE_STYLES = `
@keyframes rainbow-cycle {
  0%   { color: #ff0000; }
  14%  { color: #ff8800; }
  28%  { color: #ffff00; }
  42%  { color: #00ff00; }
  57%  { color: #0088ff; }
  71%  { color: #8800ff; }
  85%  { color: #ff00cc; }
  100% { color: #ff0000; }
}
@keyframes glitch-text {
  0%,100% { text-shadow: none; transform: translate(0); clip-path: none; }
  10% { text-shadow: -2px 0 #ff0000; transform: translate(-2px,0); }
  20% { text-shadow: 2px 0 #0000ff; transform: translate(2px,0); }
  30% { text-shadow: 0 0 #00ff00; transform: translate(0,1px); }
  40% { text-shadow: -2px 0 #ff00ff; transform: translate(-1px,-1px); }
  50% { text-shadow: 2px 0 #00ffff; transform: translate(2px,0); }
  60% { text-shadow: none; transform: translate(0); }
}
@keyframes gold-pulse {
  0%,100% { color: #FFD700; text-shadow: 0 0 6px #FFD700aa; }
  50% { color: #FFA500; text-shadow: 0 0 12px #FFA500aa; }
}
@keyframes neon-flicker {
  0%,19%,21%,23%,25%,54%,56%,100% { opacity:1; }
  20%,24%,55% { opacity:0.4; }
}
@keyframes shake {
  0%,100% { transform: translateX(0); }
  25% { transform: translateX(-3px); }
  75% { transform: translateX(3px); }
}
@keyframes coin-spin {
  0% { transform: scaleX(1); }
  50% { transform: scaleX(0.1); }
  100% { transform: scaleX(1); }
}
`;

// ─── helpers ─────────────────────────────────────────────────────────────────

function res(url?: string | null) {
  if (!url) return "";
  return url.startsWith("/objects/") ? `${window.location.origin}${url}` : url;
}

function getYouTubeVideoId(url: string): string | null {
  if (!url) return null;
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

function isYouTubeUrl(url: string): boolean {
  return /(?:youtube\.com|youtu\.be)/.test(url);
}

function isSoundCloudUrl(url: string): boolean {
  return /soundcloud\.com/.test(url);
}

function isSpotifyUrl(url: string): boolean {
  return /open\.spotify\.com/.test(url);
}

function getEmbedType(url: string): "youtube" | "soundcloud" | "spotify" | "audio" {
  if (isYouTubeUrl(url)) return "youtube";
  if (isSoundCloudUrl(url)) return "soundcloud";
  if (isSpotifyUrl(url)) return "spotify";
  return "audio";
}

function isVideoFileUrl(url: string): boolean {
  if (!url) return false;
  const lower = url.toLowerCase().split("?")[0];
  return /\.(mp4|webm|mov|ogg|avi|mkv)$/.test(lower);
}

function getYouTubeEmbedUrl(url: string, autoplay = true, muted = false, loop = false): string {
  const id = getYouTubeVideoId(url);
  if (!id) return "";
  const loopParams = loop ? `&loop=1&playlist=${id}` : "";
  return `https://www.youtube.com/embed/${id}?autoplay=${autoplay ? 1 : 0}&mute=${muted ? 1 : 0}${loopParams}&controls=1&enablejsapi=1`;
}

function getSoundCloudEmbedUrl(url: string): string {
  return `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&color=%23F97316&auto_play=true&hide_related=true&show_comments=false&show_user=true&show_reposts=false&visual=true`;
}

function getSpotifyEmbedUrl(url: string): string {
  // Strip locale prefix e.g. /intl-de/, then extract type + ID cleanly
  const clean = url.replace(/open\.spotify\.com\/intl-[a-z-]+\//, "open.spotify.com/");
  const match = clean.match(/open\.spotify\.com\/(track|album|playlist|artist|episode|show)\/([a-zA-Z0-9]+)/);
  if (match) return `https://open.spotify.com/embed/${match[1]}/${match[2]}?autoplay=1&utm_source=generator`;
  // Fallback: just convert to embed path with autoplay
  const base = clean.replace("open.spotify.com/", "open.spotify.com/embed/").split("?")[0];
  return base + "?autoplay=1&utm_source=generator";
}

function Img({ src, alt, className, style, eager }: { src: string; alt: string; className?: string; style?: React.CSSProperties; eager?: boolean }) {
  const r = res(src);
  if (!r) return null;
  return <img src={r} alt={alt} className={className} style={style} loading={eager ? "eager" : undefined} fetchPriority={eager ? "high" : undefined} onError={e => e.currentTarget.style.opacity = "0"} />;
}

function getS(settings: Record<string, any>, key: string, def: any) {
  return settings?.[key] !== undefined ? settings[key] : def;
}

// ─── Particle Background Effect ───────────────────────────────────────────────

function BgEffect({ type, color }: { type: string; color: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !type || type === "none") return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf: number;
    let particles: any[] = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const spawn = () => {
      if (type === "particles") {
        return { x: Math.random() * canvas.width, y: Math.random() * canvas.height, r: Math.random() * 2 + 0.5, vx: (Math.random() - 0.5) * 0.5, vy: (Math.random() - 0.5) * 0.5, alpha: Math.random() * 0.6 + 0.2 };
      }
      if (type === "snow") {
        return { x: Math.random() * canvas.width, y: -10, r: Math.random() * 3 + 1, vx: (Math.random() - 0.5) * 0.5, vy: Math.random() * 1.5 + 0.5, alpha: Math.random() * 0.7 + 0.3 };
      }
      if (type === "rain") {
        return { x: Math.random() * canvas.width, y: -20, len: Math.random() * 20 + 10, vy: Math.random() * 8 + 8, alpha: Math.random() * 0.4 + 0.1 };
      }
      if (type === "fireflies") {
        return { x: Math.random() * canvas.width, y: Math.random() * canvas.height, r: Math.random() * 2.5 + 1, vx: (Math.random() - 0.5), vy: (Math.random() - 0.5), alpha: 0, targetAlpha: Math.random() * 0.8 + 0.2, phase: "fade-in" as const };
      }
      if (type === "coins") {
        const sizes = [6, 8, 10, 12];
        return {
          x: Math.random() * canvas.width,
          y: -20,
          r: sizes[Math.floor(Math.random() * sizes.length)],
          vx: (Math.random() - 0.5) * 1.2,
          vy: Math.random() * 2 + 1.5,
          alpha: Math.random() * 0.6 + 0.4,
          spin: 0,
          spinSpeed: (Math.random() - 0.5) * 0.12,
          scaleX: 1,
          scaleDir: Math.random() > 0.5 ? 1 : -1,
        };
      }
      if (type === "cash") {
        const denoms = ["$1", "$5", "$10", "$20", "$50", "$100"];
        return {
          x: Math.random() * canvas.width,
          y: -30,
          w: Math.random() * 20 + 36,
          h: 18,
          vx: (Math.random() - 0.5) * 1.5,
          vy: Math.random() * 1.8 + 1.2,
          alpha: Math.random() * 0.55 + 0.4,
          rotate: (Math.random() - 0.5) * 30,
          rotateV: (Math.random() - 0.5) * 1.5,
          denom: denoms[Math.floor(Math.random() * denoms.length)],
          wobble: Math.random() * Math.PI * 2,
          wobbleSpeed: Math.random() * 0.06 + 0.02,
        };
      }
      return null;
    };

    const initCount = type === "rain" ? 80 : type === "particles" ? 60 : type === "coins" ? 25 : type === "cash" ? 18 : 40;
    for (let i = 0; i < initCount; i++) {
      const p = spawn();
      if (p) {
        if (type === "snow") p.y = Math.random() * canvas.height;
        if (type === "rain") p.y = Math.random() * canvas.height;
        if (type === "cash") p.y = Math.random() * canvas.height;
        particles.push(p);
      }
    }

    const hexToRgb = (hex: string) => {
      const r2 = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `${r2},${g},${b}`;
    };
    const rgb = color.startsWith("#") ? hexToRgb(color) : "249,115,22";

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p, i) => {
        if (type === "particles") {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${rgb},${p.alpha})`;
          ctx.fill();
          p.x += p.vx; p.y += p.vy;
          if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
          if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
        } else if (type === "snow") {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255,255,255,${p.alpha})`;
          ctx.fill();
          p.x += p.vx; p.y += p.vy;
          if (p.y > canvas.height + 10) { particles[i] = spawn(); if (particles[i]) particles[i].y = -10; }
        } else if (type === "rain") {
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - p.len * 0.1, p.y + p.len);
          ctx.strokeStyle = `rgba(${rgb},${p.alpha})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
          p.y += p.vy; p.x -= 0.5;
          if (p.y > canvas.height + 30 || p.x < -20) { particles[i] = spawn(); if (particles[i]) { particles[i].x = Math.random() * canvas.width; particles[i].y = -20; } }
        } else if (type === "fireflies") {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${rgb},${p.alpha})`;
          ctx.shadowBlur = 8;
          ctx.shadowColor = `rgba(${rgb},0.8)`;
          ctx.fill();
          ctx.shadowBlur = 0;
          p.x += p.vx; p.y += p.vy;
          if (p.phase === "fade-in") { p.alpha += 0.01; if (p.alpha >= p.targetAlpha) p.phase = "fade-out"; }
          else { p.alpha -= 0.008; if (p.alpha <= 0) { particles[i] = spawn(); } }
          p.vx += (Math.random() - 0.5) * 0.05;
          p.vy += (Math.random() - 0.5) * 0.05;
          p.vx = Math.max(-1, Math.min(1, p.vx));
          p.vy = Math.max(-1, Math.min(1, p.vy));
          if (p.x < 0 || p.x > canvas.width || p.y < 0 || p.y > canvas.height) particles[i] = spawn();
        } else if (type === "coins") {
          // Draw spinning coin (ellipse that scaleX oscillates)
          p.spin += p.spinSpeed;
          p.scaleX = Math.abs(Math.cos(p.spin));
          const cw = p.r * Math.max(0.08, p.scaleX);
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.beginPath();
          ctx.ellipse(0, 0, cw, p.r, 0, 0, Math.PI * 2);
          // Gold gradient
          const grad = ctx.createLinearGradient(-cw, -p.r, cw, p.r);
          grad.addColorStop(0, `rgba(255,215,0,${p.alpha})`);
          grad.addColorStop(0.4, `rgba(255,240,120,${p.alpha})`);
          grad.addColorStop(0.6, `rgba(255,180,0,${p.alpha})`);
          grad.addColorStop(1, `rgba(180,120,0,${p.alpha})`);
          ctx.fillStyle = grad;
          ctx.shadowBlur = 6;
          ctx.shadowColor = "rgba(255,200,0,0.5)";
          ctx.fill();
          ctx.shadowBlur = 0;
          ctx.restore();
          // Coin drift
          p.x += p.vx; p.y += p.vy;
          p.vx += (Math.random() - 0.5) * 0.04;
          p.vx = Math.max(-1.5, Math.min(1.5, p.vx));
          if (p.y > canvas.height + 20) {
            const np = spawn();
            if (np) { np.y = -20; particles[i] = np; }
          }
        } else if (type === "cash") {
          p.wobble += p.wobbleSpeed;
          p.rotate += p.rotateV + Math.sin(p.wobble) * 0.4;
          p.x += p.vx + Math.sin(p.wobble) * 0.6;
          p.y += p.vy;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rotate * Math.PI) / 180);
          ctx.globalAlpha = p.alpha;
          // Bill body
          const bw = p.w, bh = p.h;
          const billGrad = ctx.createLinearGradient(-bw/2, -bh/2, bw/2, bh/2);
          billGrad.addColorStop(0, "rgba(50,140,60,1)");
          billGrad.addColorStop(0.4, "rgba(80,180,90,1)");
          billGrad.addColorStop(0.7, "rgba(50,140,60,1)");
          billGrad.addColorStop(1, "rgba(30,100,40,1)");
          ctx.fillStyle = billGrad;
          ctx.beginPath();
          ctx.roundRect(-bw/2, -bh/2, bw, bh, 3);
          ctx.fill();
          // Inner border
          ctx.strokeStyle = "rgba(255,255,255,0.25)";
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.roundRect(-bw/2+2, -bh/2+2, bw-4, bh-4, 2);
          ctx.stroke();
          // Dollar text
          ctx.fillStyle = "rgba(255,255,255,0.85)";
          ctx.font = `bold ${Math.round(bh * 0.55)}px monospace`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(p.denom, 0, 0);
          ctx.globalAlpha = 1;
          ctx.restore();
          if (p.y > canvas.height + 40) {
            const np = spawn();
            if (np) { np.y = -30; particles[i] = np; }
          }
        }
      });

      raf = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(raf);
    };
  }, [type, color]);

  if (!type || type === "none") return null;
  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-[1]" />;
}

// ─── Cursor Trail ─────────────────────────────────────────────────────────────

function CursorTrail({ color }: { color: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointsRef = useRef<{ x: number; y: number; alpha: number }[]>([]);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const onResize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    const onMove = (e: MouseEvent) => {
      pointsRef.current.push({ x: e.clientX, y: e.clientY, alpha: 1 });
      if (pointsRef.current.length > 30) pointsRef.current.shift();
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      pointsRef.current = pointsRef.current.map(p => ({ ...p, alpha: p.alpha * 0.88 })).filter(p => p.alpha > 0.02);
      pointsRef.current.forEach((p, i) => {
        const size = 4 * (i / pointsRef.current.length) + 1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
        ctx.fillStyle = color + Math.floor(p.alpha * 255).toString(16).padStart(2, "0");
        ctx.fill();
      });
      rafRef.current = requestAnimationFrame(draw);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("resize", onResize);
    draw();

    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(rafRef.current);
    };
  }, [color]);

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-[9999]" />;
}

// ─── Sparkle Text ─────────────────────────────────────────────────────────────

const SPARKLE_COLORS_MAP: Record<string, string[]> = {
  rainbow: ["#ff0000", "#ff8800", "#ffff00", "#00ff00", "#0088ff", "#8800ff", "#ff00cc"],
  red: ["#ff0000", "#ff4444", "#ff8888"],
  blue: ["#0088ff", "#00ccff", "#4488ff"],
  green: ["#00ff88", "#00cc44", "#88ff00"],
  purple: ["#8800ff", "#cc00ff", "#ff00cc"],
  white: ["#ffffff", "#eeeeee", "#dddddd"],
  gold: ["#FFD700", "#FFA500", "#FFEC8B"],
};

function UsernameTypewriter({ text, themeColor, style, className }: { text: string; themeColor: string; style?: React.CSSProperties; className?: string }) {
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<"typing" | "wait" | "erasing">("typing");
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const speed = 80;

  const clear = () => { if (timerRef.current) clearTimeout(timerRef.current); };

  useEffect(() => {
    clear();
    setIdx(0);
    setPhase("typing");
  }, [text]);

  useEffect(() => {
    if (phase !== "typing") return;
    clear();
    if (idx < text.length) {
      timerRef.current = setTimeout(() => setIdx(i => i + 1), speed);
    } else {
      setPhase("wait");
    }
    return clear;
  }, [phase, idx, text]);

  useEffect(() => {
    if (phase !== "wait") return;
    clear();
    timerRef.current = setTimeout(() => setPhase("erasing"), 3000);
    return clear;
  }, [phase]);

  useEffect(() => {
    if (phase !== "erasing") return;
    clear();
    if (idx > 0) {
      timerRef.current = setTimeout(() => setIdx(i => i - 1), speed / 2);
    } else {
      timerRef.current = setTimeout(() => setPhase("typing"), 500);
    }
    return clear;
  }, [phase, idx]);

  const displayed = phase === "wait" ? text : text.slice(0, idx);
  return (
    <span className={className} style={style}>
      {displayed}
      <span style={{ color: themeColor }} className="animate-pulse font-thin ml-0.5">|</span>
    </span>
  );
}

function SparkleText({ text, themeColor, colorMode = "theme" }: { text: string; themeColor: string; colorMode?: string }) {
  const [sparks, setSparks] = useState<{ id: number; x: number; y: number; size: number; color: string }[]>([]);
  const idRef = useRef(0);
  const colorIdxRef = useRef(0);

  const pickColor = () => {
    const palette = SPARKLE_COLORS_MAP[colorMode];
    if (palette) {
      const c = palette[colorIdxRef.current % palette.length];
      colorIdxRef.current++;
      return c;
    }
    return themeColor;
  };

  useEffect(() => {
    const interval = setInterval(() => {
      const newSpark = {
        id: idRef.current++,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 8 + 4,
        color: pickColor(),
      };
      setSparks(s => [...s.slice(-8), newSpark]);
      setTimeout(() => setSparks(s => s.filter(sp => sp.id !== newSpark.id)), 800);
    }, 200);
    return () => clearInterval(interval);
  }, [colorMode, themeColor]);

  if (colorMode === "glitch") {
    return (
      <span className="relative inline-block" style={{ animation: "glitch-text 2s infinite" }}>
        {text}
      </span>
    );
  }

  const textStyle: React.CSSProperties = colorMode === "rainbow"
    ? { animation: "rainbow-cycle 3s linear infinite" }
    : colorMode === "gold"
    ? { animation: "gold-pulse 2s ease-in-out infinite" }
    : {};

  return (
    <span className="relative inline-block" style={textStyle}>
      {sparks.map(s => (
        <motion.span
          key={s.id}
          initial={{ opacity: 1, scale: 1, y: 0 }}
          animate={{ opacity: 0, scale: 0, y: -16 }}
          transition={{ duration: 0.8 }}
          className="absolute pointer-events-none select-none"
          style={{ left: `${s.x}%`, top: `${s.y}%`, fontSize: s.size, color: s.color }}
        >✦</motion.span>
      ))}
      {text}
    </span>
  );
}

// ─── Tilt Box ─────────────────────────────────────────────────────────────────

function TiltBox({ children, intensity = 15, enabled = true, autoTilt = false, autoTiltInterval = 4, className = "", style, onTiltChange, externalTilt }: {
  children: React.ReactNode; intensity?: number; enabled?: boolean;
  autoTilt?: boolean; autoTiltInterval?: number;
  className?: string; style?: React.CSSProperties;
  onTiltChange?: (x: number, y: number) => void;
  externalTilt?: { x: number; y: number };
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);

  const activeTilt = externalTilt ?? tilt;

  const onMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!enabled || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = (e.clientX - cx) / (rect.width / 2);
    const dy = (e.clientY - cy) / (rect.height / 2);
    const nx = dy * intensity * -1;
    const ny = dx * intensity;
    setTilt({ x: nx, y: ny });
    onTiltChange?.(nx, ny);
  }, [enabled, intensity, onTiltChange]);

  const onMouseEnter = useCallback(() => setIsHovering(true), []);
  const onMouseLeave = useCallback(() => {
    setIsHovering(false);
    setTilt({ x: 0, y: 0 });
    onTiltChange?.(0, 0);
  }, [onTiltChange]);

  useEffect(() => {
    if (!enabled || !autoTilt || isHovering) return;
    let phase = 0;
    const steps = 60;
    let step = 0;
    let rafId: number;
    const animate = () => {
      step++;
      const t = (step / steps) * Math.PI * 2;
      const x = Math.sin(t + phase) * (intensity * 0.5);
      const y = Math.cos(t * 0.7 + phase) * (intensity * 0.5);
      setTilt({ x, y });
      onTiltChange?.(x, y);
      rafId = requestAnimationFrame(animate);
    };
    const interval = setInterval(() => {
      phase += 1.2;
      step = 0;
    }, autoTiltInterval * 1000);
    rafId = requestAnimationFrame(animate);
    return () => { clearInterval(interval); cancelAnimationFrame(rafId); setTilt({ x: 0, y: 0 }); onTiltChange?.(0, 0); };
  }, [enabled, autoTilt, autoTiltInterval, intensity, isHovering, onTiltChange]);

  return (
    <div
      ref={ref}
      onMouseMove={onMouseMove}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={className}
      style={{
        ...style,
        transform: enabled ? `perspective(1000px) rotateX(${activeTilt.x}deg) rotateY(${activeTilt.y}deg)` : undefined,
        transition: activeTilt.x === 0 && activeTilt.y === 0 ? "transform 0.5s ease" : "transform 0.08s linear",
        willChange: "transform",
      }}
    >
      {children}
    </div>
  );
}

// ─── Elastic Volume Slider ───────────────────────────────────────────────────

function ElasticSlider({ value, onChange, themeColor }: {
  value: number;
  onChange: (v: number) => void;
  themeColor: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const pct = Math.max(0, Math.min(100, value));
  const springPct = useSpring(pct, { stiffness: 500, damping: 35 });
  const trackWidth = useTransform(springPct, [0, 100], ["0%", "100%"]);

  useEffect(() => { springPct.set(pct); }, [pct]);

  const getValueFromEvent = (clientX: number) => {
    if (!trackRef.current) return value;
    const rect = trackRef.current.getBoundingClientRect();
    const raw = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return Math.round(raw * 100);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setDragging(true);
    onChange(getValueFromEvent(e.clientX));
    const onMove = (me: MouseEvent) => onChange(getValueFromEvent(me.clientX));
    const onUp = () => { setDragging(false); window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    setDragging(true);
    onChange(getValueFromEvent(e.touches[0].clientX));
    const onMove = (te: TouchEvent) => onChange(getValueFromEvent(te.touches[0].clientX));
    const onEnd = () => { setDragging(false); window.removeEventListener("touchmove", onMove); window.removeEventListener("touchend", onEnd); };
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onEnd);
  };

  return (
    <div
      ref={trackRef}
      className="relative flex items-center h-7 cursor-pointer select-none"
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    >
      <div className="w-full rounded-full bg-white/10 relative overflow-visible" style={{ height: dragging ? 6 : 4, transition: "height 0.15s ease" }}>
        <motion.div
          className="h-full rounded-full absolute left-0 top-0"
          style={{ width: trackWidth, backgroundColor: themeColor }}
        />
      </div>
      <motion.div
        className="absolute rounded-full border-2 border-white shadow-lg pointer-events-none"
        style={{
          left: useTransform(springPct, p => `calc(${p}% - 7px)`),
          backgroundColor: themeColor,
          width: dragging ? 18 : 14,
          height: dragging ? 18 : 14,
          top: "50%",
          y: "-50%",
          transition: "width 0.15s ease, height 0.15s ease",
          boxShadow: `0 0 8px ${themeColor}88`,
        }}
        animate={{ scale: dragging ? 1.25 : 1 }}
        transition={{ type: "spring", stiffness: 500, damping: 28 }}
      />
    </div>
  );
}

// ─── Music Player ─────────────────────────────────────────────────────────────

function EmbedPlayer({ track, themeColor, onNext, hasPrev, hasNext, onPrev, trackCount, autoplay }: {
  track: { title: string; url: string; artistProfile?: string };
  themeColor: string;
  onNext: () => void;
  onPrev: () => void;
  hasPrev: boolean;
  hasNext: boolean;
  trackCount: number;
  autoplay?: boolean;
}) {
  const type = getEmbedType(track.url);
  let embedUrl = "";
  if (type === "youtube") embedUrl = getYouTubeEmbedUrl(track.url, true, false, trackCount === 1);
  else if (type === "soundcloud") embedUrl = getSoundCloudEmbedUrl(track.url);
  else if (type === "spotify") embedUrl = getSpotifyEmbedUrl(track.url);

  const iframeHeight = type === "spotify" ? 80 : type === "soundcloud" ? 120 : 155;

  return (
    <div className="bg-black/90 border rounded-2xl overflow-hidden" style={{ borderColor: themeColor + "44", width: 280 }}>
      <iframe
        key={`embed-${autoplay ? "playing" : "paused"}`}
        src={embedUrl}
        width="280"
        height={iframeHeight}
        frameBorder="0"
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        allowFullScreen
        style={{ display: "block" }}
      />
      <div className="flex items-center justify-between px-3 py-2" style={{ borderTop: `1px solid ${themeColor}22` }}>
        <div className="flex-1 min-w-0 mr-2">
          <p className="text-xs font-bold truncate text-white">{track.title}</p>
          {track.artistProfile && <p className="text-[10px] text-gray-400 truncate">{track.artistProfile}</p>}
        </div>
        {trackCount > 1 && (
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={onPrev} disabled={!hasPrev} className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-white disabled:opacity-30 transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={onNext} disabled={!hasNext} className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-white disabled:opacity-30 transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function MusicPlayer({ tracks, autoplay, position, themeColor, randomStart, initialVolume }: {
  tracks: { title: string; url: string; artistProfile?: string }[];
  autoplay: boolean;
  position: string;
  themeColor: string;
  randomStart?: boolean;
  initialVolume?: number;
}) {
  const [playing, setPlaying] = useState(false);
  const [trackIdx, setTrackIdx] = useState(() => randomStart && tracks.length > 1 ? Math.floor(Math.random() * tracks.length) : 0);
  const [expanded, setExpanded] = useState(false);
  const [shuffled, setShuffled] = useState(false);
  const [shuffleOrder, setShuffleOrder] = useState<number[]>([]);
  const [volume, setVolume] = useState(() => Math.max(0, Math.min(100, initialVolume ?? 80)));
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const nextFnRef = useRef<() => void>(() => {});
  const sliderRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  const actualIdx = shuffled && shuffleOrder.length > 0 ? shuffleOrder[trackIdx] : trackIdx;
  const currentTrack = tracks[actualIdx];
  const currentEmbedType = currentTrack ? getEmbedType(currentTrack.url) : "audio";
  const isEmbed = currentEmbedType !== "audio";

  const posClass = {
    "top-left": "top-4 left-4",
    "top-right": "top-4 right-4",
    "bottom-left": "bottom-4 left-4",
    "bottom-right": "bottom-4 right-4",
  }[position] || "bottom-4 right-4";

  const buildShuffle = () => {
    const arr = tracks.map((_, i) => i).sort(() => Math.random() - 0.5);
    setShuffleOrder(arr);
    setTrackIdx(0);
  };

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume / 100;
  }, [volume]);

  useEffect(() => {
    if (!isEmbed && audioRef.current && autoplay && tracks.length > 0 && !playing) {
      audioRef.current.volume = volume / 100;
      audioRef.current.play().then(() => setPlaying(true)).catch(() => {});
    }
  }, [autoplay]);

  useEffect(() => {
    if (!isEmbed && audioRef.current) {
      audioRef.current.src = res(currentTrack?.url);
      audioRef.current.volume = volume / 100;
      if (playing) audioRef.current.play().catch(() => {});
    }
  }, [trackIdx, shuffleOrder]);

  const togglePlay = () => {
    if (isEmbed) return;
    if (!audioRef.current) return;
    if (playing) { audioRef.current.pause(); setPlaying(false); }
    else { audioRef.current.play().then(() => setPlaying(true)).catch(() => {}); }
  };

  const prev = () => setTrackIdx(i => (i - 1 + tracks.length) % tracks.length);
  const next = () => setTrackIdx(i => (i + 1) % tracks.length);

  nextFnRef.current = next;

  useEffect(() => {
    if (currentEmbedType !== "youtube" || tracks.length <= 1) return;
    const handleMessage = (event: MessageEvent) => {
      try {
        if (typeof event.data !== "string") return;
        const data = JSON.parse(event.data);
        if (data.event === "onStateChange" && data.info === 0) {
          nextFnRef.current();
        }
      } catch {}
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [currentEmbedType, tracks.length]);

  const toggleShuffle = () => {
    if (!shuffled) { buildShuffle(); setShuffled(true); }
    else { setShuffled(false); setTrackIdx(actualIdx); }
  };

  if (!tracks.length) return null;

  if (isEmbed) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`fixed ${posClass} z-50`}
      >
        <EmbedPlayer
          track={currentTrack}
          themeColor={themeColor}
          onPrev={prev}
          onNext={next}
          hasPrev={trackIdx > 0}
          hasNext={trackIdx < tracks.length - 1}
          trackCount={tracks.length}
          autoplay={autoplay}
        />
      </motion.div>
    );
  }

  const seekTo = (clientX: number) => {
    if (!sliderRef.current || !audioRef.current || !duration) return;
    const rect = sliderRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    audioRef.current.currentTime = pct * duration;
    setCurrentTime(pct * duration);
  };

  const progress = duration > 0 ? currentTime / duration : 0;

  return (
    <>
      <audio
        ref={audioRef}
        src={res(currentTrack?.url)}
        loop={tracks.length === 1}
        onEnded={next}
        onTimeUpdate={() => { if (audioRef.current && !draggingRef.current) setCurrentTime(audioRef.current.currentTime); }}
        onLoadedMetadata={() => { if (audioRef.current) setDuration(audioRef.current.duration); }}
      />
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className={`fixed ${posClass} z-50`}
      >
        {/* Main pill */}
        <div
          className="flex items-center gap-3 rounded-full px-4 py-2.5"
          style={{ background: "#111", border: "1px solid rgba(255,255,255,0.08)", minWidth: 220, backdropFilter: "blur(20px)" }}
        >
          {/* Waveform bars */}
          <div className="flex items-end gap-[3px] h-6 shrink-0">
            {[0.4, 0.7, 1, 0.6].map((h, i) => (
              <motion.div
                key={i}
                style={{ width: 3, background: "rgba(255,255,255,0.55)", borderRadius: 2 }}
                animate={playing ? {
                  height: [`${h * 14}px`, `${(h * 0.4 + 0.3) * 18}px`, `${h * 14}px`],
                } : { height: "5px" }}
                transition={playing ? {
                  duration: 0.5 + i * 0.13,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: i * 0.1,
                } : { duration: 0.3 }}
              />
            ))}
          </div>

          {/* Progress slider */}
          <div
            ref={sliderRef}
            className="flex-1 relative h-1 rounded-full cursor-pointer"
            style={{ background: "rgba(255,255,255,0.15)", minWidth: 60 }}
            onMouseDown={(e) => { draggingRef.current = true; seekTo(e.clientX); }}
            onMouseMove={(e) => { if (draggingRef.current) seekTo(e.clientX); }}
            onMouseUp={() => { draggingRef.current = false; }}
            onMouseLeave={() => { draggingRef.current = false; }}
            onClick={(e) => seekTo(e.clientX)}
          >
            <div
              className="absolute top-0 left-0 h-full rounded-full"
              style={{ width: `${progress * 100}%`, background: "rgba(255,255,255,0.8)" }}
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-white shadow-lg"
              style={{ left: `calc(${progress * 100}% - 7px)` }}
            />
          </div>

          {/* Play/Pause button */}
          <button
            onClick={togglePlay}
            className="w-10 h-10 rounded-full bg-white flex items-center justify-center shrink-0 hover:bg-gray-100 transition-colors"
          >
            {playing
              ? <Pause className="w-4 h-4 text-black" />
              : <Play className="w-4 h-4 text-black ml-0.5" />
            }
          </button>
        </div>
      </motion.div>
    </>
  );
}

// ─── Page Overlay ─────────────────────────────────────────────────────────────

function PageOverlay({ type }: { type: string }) {
  if (type === "none" || !type) return null;
  if (type === "dark") return <div className="fixed inset-0 bg-black/50 pointer-events-none z-[1]" />;
  if (type === "grid") return (
    <div className="fixed inset-0 pointer-events-none z-[1]"
      style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.03) 1px,transparent 1px)", backgroundSize: "40px 40px" }}
    />
  );
  if (type === "dots") return (
    <div className="fixed inset-0 pointer-events-none z-[1]"
      style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.08) 1px,transparent 1px)", backgroundSize: "24px 24px" }}
    />
  );
  if (type === "scanlines") return (
    <div className="fixed inset-0 pointer-events-none z-[1]"
      style={{ backgroundImage: "repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.2) 2px,rgba(0,0,0,0.2) 4px)" }}
    />
  );
  if (type === "vignette") return (
    <div className="fixed inset-0 pointer-events-none z-[1]"
      style={{ background: "radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.7) 100%)" }}
    />
  );
  return null;
}

// ─── Profile Effect Overlays ──────────────────────────────────────────────────

function ProfileEffect({ effect }: { effect: string }) {
  if (!effect || effect === "none") return null;

  if (effect === "retro") return (
    <>
      <div className="fixed inset-0 pointer-events-none z-[2]"
        style={{ backgroundImage: "repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,0,0,0.15) 3px,rgba(0,0,0,0.15) 4px)", mixBlendMode: "multiply" }}
      />
      <div className="fixed inset-0 pointer-events-none z-[2]" style={{ background: "radial-gradient(ellipse at center, transparent 60%, rgba(0,0,0,0.6) 100%)" }} />
      <style>{`body { filter: sepia(0.35) saturate(0.7) contrast(1.1); }`}</style>
    </>
  );
  if (effect === "oldtv") return (
    <>
      <div className="fixed inset-0 pointer-events-none z-[2]"
        style={{ backgroundImage: "repeating-linear-gradient(0deg,transparent,transparent 1px,rgba(0,0,0,0.3) 1px,rgba(0,0,0,0.3) 2px)" }}
      />
      <div className="fixed inset-0 pointer-events-none z-[2]" style={{ background: "radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.85) 100%)" }} />
      <style>{`body { filter: grayscale(0.4) contrast(1.2) brightness(0.9); }`}</style>
    </>
  );
  if (effect === "oldtv2") return (
    <>
      <style>{`
        @keyframes crt-scan {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100vh); }
        }
        @keyframes crt-flicker {
          0%,100% { opacity: 1; }
          88% { opacity: 1; }
          89% { opacity: 0.78; }
          90% { opacity: 1; }
          94% { opacity: 1; }
          94.5% { opacity: 0.65; }
          95% { opacity: 1; }
        }
        @keyframes crt-jitter {
          0%,100% { transform: translateX(0); }
          92% { transform: translateX(0); }
          92.5% { transform: translateX(-1.5px); }
          93% { transform: translateX(1px); }
          93.5% { transform: translateX(0); }
        }
        body {
          filter: contrast(1.15) brightness(0.78) saturate(0.5) sepia(0.12);
          animation: crt-flicker 9s ease-in-out infinite, crt-jitter 9s ease-in-out infinite;
        }
      `}</style>
      {/* Fine scanlines */}
      <div className="fixed inset-0 pointer-events-none z-[2]"
        style={{ backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.18) 3px, rgba(0,0,0,0.18) 4px)" }}
      />
      {/* Slow moving bright scan band */}
      <div className="fixed left-0 right-0 pointer-events-none z-[3]"
        style={{ height: "6px", background: "linear-gradient(180deg, transparent, rgba(255,255,255,0.04), transparent)", animation: "crt-scan 5s linear infinite" }}
      />
      {/* RGB color fringe on edges */}
      <div className="fixed inset-0 pointer-events-none z-[2]"
        style={{ background: "linear-gradient(90deg, rgba(255,0,0,0.03) 0%, transparent 3%, transparent 97%, rgba(0,0,255,0.03) 100%)" }}
      />
      {/* Curved tube vignette */}
      <div className="fixed inset-0 pointer-events-none z-[2]"
        style={{ background: "radial-gradient(ellipse 90% 85% at 50% 50%, transparent 45%, rgba(0,0,0,0.6) 75%, rgba(0,0,0,0.92) 100%)" }}
      />
      {/* Top / bottom bar burn-in */}
      <div className="fixed inset-0 pointer-events-none z-[2]"
        style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.55) 0%, transparent 8%, transparent 92%, rgba(0,0,0,0.55) 100%)" }}
      />
    </>
  );
  if (effect === "night") return (
    <>
      <div className="fixed inset-0 pointer-events-none z-[2]" style={{ background: "linear-gradient(180deg, rgba(10,20,60,0.4) 0%, rgba(5,5,30,0.5) 100%)", mixBlendMode: "color" }} />
      <style>{`body { filter: brightness(0.85) saturate(0.6) hue-rotate(200deg); }`}</style>
    </>
  );
  if (effect === "vhs") return (
    <>
      <div className="fixed inset-0 pointer-events-none z-[2]"
        style={{ backgroundImage: "repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.1) 2px,rgba(0,0,0,0.1) 4px)" }}
      />
      <style>{`
        body { filter: saturate(1.3) contrast(1.1); }
        body::before { content:''; position:fixed; inset:0; background: rgba(255,0,0,0.03); mix-blend-mode:screen; pointer-events:none; z-index:9999; }
      `}</style>
    </>
  );
  if (effect === "glitch") return (
    <style>{`
      @keyframes glitch-bg {
        0%,100% { transform: translate(0); }
        20% { transform: translate(-2px,1px); }
        40% { transform: translate(2px,-1px); }
        60% { transform: translate(-1px,2px); }
        80% { transform: translate(1px,-2px); }
      }
      body { animation: glitch-bg 4s infinite; }
    `}</style>
  );
  if (effect === "shine") return (
    <>
      <style>{`
        @keyframes shine-sweep {
          0% { background-position: -200% center; }
          100% { background-position: 250% center; }
        }
        .shine-overlay {
          background: linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.18) 50%, rgba(255,255,255,0.32) 55%, rgba(255,255,255,0.18) 60%, transparent 70%);
          background-size: 200% 100%;
          animation: shine-sweep 3.5s linear infinite;
        }
      `}</style>
      <div className="shine-overlay fixed inset-0 pointer-events-none z-[3]" style={{ mixBlendMode: "screen" }} />
    </>
  );
  if (effect === "liquid") return (
    <>
      <style>{`
        @keyframes liquid-wave {
          0% { transform: translateY(0) scaleX(1); }
          25% { transform: translateY(-6px) scaleX(1.01); }
          50% { transform: translateY(0) scaleX(1); }
          75% { transform: translateY(6px) scaleX(0.99); }
          100% { transform: translateY(0) scaleX(1); }
        }
        @keyframes liquid-hue {
          0% { filter: hue-rotate(0deg) saturate(1.3); }
          50% { filter: hue-rotate(20deg) saturate(1.6); }
          100% { filter: hue-rotate(0deg) saturate(1.3); }
        }
        .liquid-wave { animation: liquid-wave 6s ease-in-out infinite; }
        .liquid-wave-rev { animation: liquid-wave 5s ease-in-out infinite reverse; }
        .liquid-hue { animation: liquid-hue 8s ease-in-out infinite; }
      `}</style>
      <div className="liquid-wave liquid-hue fixed inset-0 pointer-events-none z-[3]"
        style={{ background: "radial-gradient(ellipse at 30% 50%, rgba(255,255,255,0.06) 0%, transparent 60%), radial-gradient(ellipse at 70% 50%, rgba(255,255,255,0.06) 0%, transparent 60%)" }} />
      <div className="liquid-wave-rev fixed inset-0 pointer-events-none z-[2]"
        style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.03) 0%, transparent 50%, rgba(0,0,0,0.15) 100%)" }} />
    </>
  );
  return null;
}

// ─── Avatar Decoration ────────────────────────────────────────────────────────

function AvatarWrapper({ src, username, radius, decoration, themeColor, size = 112 }: {
  src?: string; username: string; radius: number; decoration: string; themeColor: string; size?: number;
}) {
  const s = size;
  const borderRadius = `${radius}%`;
  const isYT = src ? isYouTubeUrl(src) : false;

  const decoStyle: React.CSSProperties = {};
  if (decoration === "ring-pulse") {
    decoStyle.boxShadow = `0 0 0 3px ${themeColor}, 0 0 0 6px ${themeColor}44`;
    decoStyle.animation = "pulse 2s infinite";
  } else if (decoration === "neon") {
    decoStyle.boxShadow = `0 0 15px ${themeColor}88, 0 0 30px ${themeColor}44`;
  } else if (decoration === "neon-strong") {
    decoStyle.boxShadow = `0 0 0 2px ${themeColor}, 0 0 20px ${themeColor}cc, 0 0 40px ${themeColor}66, 0 0 60px ${themeColor}33`;
  } else if (decoration === "aura") {
    decoStyle.boxShadow = `0 0 0 4px ${themeColor}55, 0 0 24px 8px ${themeColor}44, 0 0 50px 16px ${themeColor}22`;
  } else if (decoration === "fire") {
    decoStyle.boxShadow = `0 0 0 2px #ff6600, 0 0 18px #ff440088, 0 0 36px #ff220055, 0 -8px 24px #ff880066`;
  } else if (decoration === "ice") {
    decoStyle.boxShadow = `0 0 0 2px #88ddff, 0 0 18px #44bbffaa, 0 0 36px #0099ff55`;
  } else if (decoration === "gold") {
    decoStyle.boxShadow = `0 0 0 2px #FFD700, 0 0 12px #FFD70099, 0 0 24px #FFD70044`;
  }

  const showOrbitStars = decoration === "discord-stars";
  const showOrbitHearts = decoration === "discord-hearts";
  const showOrbitDots = decoration === "discord-bravery";
  const showFlameRing = decoration === "discord-flame";
  const showHolographic = decoration === "holographic";
  const showGalaxy = decoration === "galaxy";
  const showCrystal = decoration === "crystal";
  const showElectric = decoration === "electric";
  const showSakura = decoration === "sakura";
  const showCrown = decoration === "crown";
  const showAurora = decoration === "aurora";
  const showVortex = decoration === "vortex";
  const showPlasma = decoration === "plasma";
  const showNebula = decoration === "nebula";
  const showCelestial = decoration === "celestial";
  const showLava = decoration === "lava";
  const showPrism = decoration === "prism";
  const showVoid = decoration === "void";
  const showDragon = decoration === "dragon";
  const showMatrix = decoration === "matrix";
  const customDecoUrl = decoration?.startsWith("custom:") ? decoration.slice(7) : null;
  const customDecoIsVideo = customDecoUrl ? /\.(mp4|webm|mov)(\?|$)/i.test(customDecoUrl) : false;

  return (
    <div className="relative" style={{ width: s, height: s }}>
      {/* Ring spin */}
      {decoration === "ring-spin" && (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0 rounded-full"
          style={{ borderRadius, background: `conic-gradient(${themeColor}, transparent, ${themeColor})`, padding: "3px" }}
        />
      )}
      {/* Rainbow spin */}
      {decoration === "rainbow-spin" && (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0"
          style={{ borderRadius, background: "conic-gradient(#ff0000,#ff8800,#ffff00,#00ff00,#0088ff,#8800ff,#ff0000)", padding: "3px" }}
        />
      )}
      {/* Gradient border double ring */}
      {decoration === "double-ring" && (
        <>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0"
            style={{ borderRadius, background: `conic-gradient(${themeColor},transparent,${themeColor})`, padding: "3px" }}
          />
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            className="absolute"
            style={{ inset: -4, borderRadius, background: `conic-gradient(transparent,${themeColor}88,transparent)`, padding: "2px" }}
          />
        </>
      )}
      {/* Discord flame style ring */}
      {showFlameRing && (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0"
          style={{ borderRadius, background: "conic-gradient(#ff6a00,#ee0979,#ff6a00,#ffb347,#ff6a00)", padding: "3px" }}
        />
      )}
      {/* Discord Bravery style — purple animated dots */}
      {showOrbitDots && (
        <div className="absolute inset-0" style={{ borderRadius }}>
          {[0, 60, 120, 180, 240, 300].map((angle, idx) => (
            <motion.div
              key={idx}
              animate={{ rotate: [angle, angle + 360] }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
              className="absolute"
              style={{ inset: -4, borderRadius: "50%" }}
            >
              <div
                className="absolute w-2 h-2 rounded-full"
                style={{
                  background: "#8B5CF6",
                  boxShadow: "0 0 6px #8B5CF6",
                  top: "50%", left: "50%",
                  transform: `translate(-50%,-50%) rotate(${angle}deg) translateY(${-s/2 - 4}px)`,
                }}
              />
            </motion.div>
          ))}
        </div>
      )}
      {/* Discord stars — orbiting ★ symbols */}
      {showOrbitStars && (
        <div className="absolute inset-0 pointer-events-none" style={{ borderRadius }}>
          {["★", "✦", "★", "✦"].map((sym, idx) => (
            <motion.div
              key={idx}
              animate={{ rotate: [idx * 90, idx * 90 + 360] }}
              transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0"
              style={{ borderRadius: "50%" }}
            >
              <span
                className="absolute text-xs font-black"
                style={{
                  color: "#5865F2",
                  textShadow: "0 0 8px #5865F2",
                  top: "50%", left: "50%",
                  transform: `translate(-50%,-50%) rotate(${idx * 90}deg) translateY(${-s/2 - 6}px) rotate(${-(idx * 90)}deg)`,
                }}
              >{sym}</span>
            </motion.div>
          ))}
        </div>
      )}
      {/* Discord hearts — orbiting ♥ symbols */}
      {showOrbitHearts && (
        <div className="absolute inset-0 pointer-events-none" style={{ borderRadius }}>
          {["♥", "♥", "♥", "♥"].map((sym, idx) => (
            <motion.div
              key={idx}
              animate={{ rotate: [idx * 90, idx * 90 + 360] }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0"
              style={{ borderRadius: "50%" }}
            >
              <span
                className="absolute text-xs font-black"
                style={{
                  color: themeColor,
                  textShadow: `0 0 8px ${themeColor}`,
                  top: "50%", left: "50%",
                  transform: `translate(-50%,-50%) rotate(${idx * 90}deg) translateY(${-s/2 - 6}px) rotate(${-(idx * 90)}deg)`,
                }}
              >{sym}</span>
            </motion.div>
          ))}
        </div>
      )}
      {/* Holographic — rainbow shimmer that cycles */}
      {showHolographic && (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0"
          style={{ borderRadius, background: "conic-gradient(#ff0080,#ff8c00,#ffe600,#00ff88,#00cfff,#8800ff,#ff0080)", padding: "3px" }}
        />
      )}
      {showHolographic && (
        <motion.div
          animate={{ rotate: -180 }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
          className="absolute"
          style={{ inset: -2, borderRadius, background: "conic-gradient(transparent,rgba(255,255,255,0.4),transparent,rgba(255,255,255,0.4),transparent)", padding: "2px" }}
        />
      )}
      {/* Galaxy — deep cosmic star-orbit ring */}
      {showGalaxy && (
        <>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            className="absolute"
            style={{ inset: -6, borderRadius: "50%", background: "conic-gradient(transparent 0deg, rgba(100,80,255,0.8) 60deg, transparent 120deg, rgba(200,100,255,0.5) 200deg, transparent 260deg, rgba(80,160,255,0.7) 320deg, transparent 360deg)" }}
          />
          {[0,45,90,135,180,225,270,315].map((angle, idx) => (
            <div key={idx} className="absolute" style={{ inset: 0, borderRadius: "50%" }}>
              <div className="absolute w-1 h-1 rounded-full" style={{
                background: idx % 2 === 0 ? "#a78bfa" : "#e0d0ff",
                top: "50%", left: "50%",
                transform: `translate(-50%,-50%) rotate(${angle}deg) translateY(${-s/2 - 7}px)`,
                boxShadow: "0 0 4px rgba(167,139,250,0.9)",
              }} />
            </div>
          ))}
        </>
      )}
      {/* Crystal — prismatic sparkle shards */}
      {showCrystal && (
        <>
          <div className="absolute inset-0" style={{ borderRadius, boxShadow: `0 0 0 2.5px rgba(200,230,255,0.7), 0 0 14px rgba(180,220,255,0.5), 0 0 30px rgba(160,210,255,0.25)` }} />
          {[0,72,144,216,288].map((angle, idx) => (
            <motion.div key={idx}
              animate={{ opacity: [0.4, 1, 0.4], scale: [0.8, 1.2, 0.8] }}
              transition={{ duration: 1.5 + idx * 0.3, repeat: Infinity, ease: "easeInOut" }}
              className="absolute"
              style={{ top: "50%", left: "50%", transform: `translate(-50%,-50%) rotate(${angle}deg) translateY(${-s/2 - 8}px)` }}
            >
              <div style={{ width: 6, height: 6, background: "linear-gradient(135deg, #e0f0ff, #a8d8ff)", clipPath: "polygon(50% 0%,100% 100%,0% 100%)", boxShadow: "0 0 8px #c0e8ff" }} />
            </motion.div>
          ))}
        </>
      )}
      {/* Electric — crackling lightning ring */}
      {showElectric && (
        <>
          <motion.div
            animate={{ opacity: [1, 0.6, 1, 0.7, 1], scale: [1, 1.01, 1] }}
            transition={{ duration: 0.15, repeat: Infinity, repeatType: "mirror" }}
            className="absolute"
            style={{ inset: -3, borderRadius, boxShadow: `0 0 0 2px #00ffff, 0 0 12px #00ffff, 0 0 30px #0088ff88, 0 0 50px #00ffff33` }}
          />
          {[30,90,150,210,270,330].map((angle, idx) => (
            <motion.div key={idx}
              animate={{ opacity: [0, 1, 0], scaleY: [0.6, 1, 0.6] }}
              transition={{ duration: 0.3 + idx * 0.05, repeat: Infinity, delay: idx * 0.08 }}
              className="absolute"
              style={{ top: "50%", left: "50%", width: 2, height: 10, background: "linear-gradient(180deg, #00ffff, transparent)", transformOrigin: "top center", transform: `translate(-50%, -${s/2 + 10}px) rotate(${angle}deg)`, filter: "blur(0.5px)" }}
            />
          ))}
        </>
      )}
      {/* Sakura — floating cherry blossoms */}
      {showSakura && (
        <div className="absolute pointer-events-none" style={{ inset: -16 }}>
          {[0,1,2,3,4,5].map(idx => (
            <motion.div key={idx}
              animate={{ y: [-s/2 - 10, s/2 + 10], x: [Math.sin(idx) * 12, Math.sin(idx + 2) * 12], rotate: [0, 360], opacity: [0, 1, 0] }}
              transition={{ duration: 2.5 + idx * 0.4, repeat: Infinity, delay: idx * 0.5, ease: "easeInOut" }}
              style={{ position: "absolute", left: `${15 + idx * 13}%`, top: "50%", fontSize: 10 }}
            >🌸</motion.div>
          ))}
        </div>
      )}
      {/* Crown — golden crown floating above */}
      {showCrown && (
        <>
          <div className="absolute inset-0" style={{ borderRadius, boxShadow: `0 0 0 2px #FFD700, 0 0 16px #FFD70088, 0 0 32px #FFD70033` }} />
          <motion.div
            animate={{ y: [-3, 0, -3] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            style={{ position: "absolute", top: -18, left: "50%", transform: "translateX(-50%)", fontSize: 16, lineHeight: 1, filter: "drop-shadow(0 0 6px #FFD700)" }}
          >👑</motion.div>
        </>
      )}
      {/* Aurora — flowing northern lights halo */}
      {showAurora && (
        <>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
            className="absolute"
            style={{ inset: -5, borderRadius: "50%", background: "conic-gradient(rgba(0,255,128,0.5),rgba(0,180,255,0.5),rgba(180,0,255,0.5),rgba(255,0,128,0.4),rgba(0,255,128,0.5))", filter: "blur(4px)" }}
          />
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 7, repeat: Infinity, ease: "linear" }}
            className="absolute"
            style={{ inset: -2, borderRadius: "50%", background: "conic-gradient(transparent,rgba(120,255,200,0.4),transparent,rgba(100,200,255,0.4),transparent)", filter: "blur(2px)" }}
          />
        </>
      )}
      {/* Vortex — spinning wormhole/portal ring */}
      {showVortex && (
        <>
          {[0,1,2].map(i => (
            <motion.div key={i}
              animate={{ rotate: i % 2 === 0 ? 360 : -360, scale: [1, 1.04, 1] }}
              transition={{ duration: 2 + i * 0.7, repeat: Infinity, ease: "linear" }}
              className="absolute"
              style={{ inset: -(i * 3 + 2), borderRadius: "50%", background: `conic-gradient(${themeColor}${80 - i * 20}, transparent, ${themeColor}${60 - i * 15}, transparent)`, opacity: 0.8 - i * 0.15 }}
            />
          ))}
        </>
      )}
      {/* Plasma — multi-color swirling conic gradient */}
      {showPlasma && (
        <>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            className="absolute"
            style={{ inset: -4, borderRadius: "50%", background: "conic-gradient(#ff00cc,#3333ff,#00ffcc,#ffff00,#ff6600,#ff00cc)", padding: "4px", filter: "blur(0.5px)" }}
          />
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
            className="absolute"
            style={{ inset: -2, borderRadius: "50%", background: "conic-gradient(rgba(255,0,200,0.5),rgba(0,255,200,0.5),rgba(100,100,255,0.5),rgba(255,0,200,0.5))", filter: "blur(2px)" }}
          />
        </>
      )}
      {/* Nebula — deep space purple/cyan swirl */}
      {showNebula && (
        <>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
            className="absolute"
            style={{ inset: -6, borderRadius: "50%", background: "conic-gradient(rgba(120,0,255,0.8),rgba(0,200,255,0.6),rgba(255,0,128,0.5),rgba(80,0,200,0.8))", filter: "blur(3px)" }}
          />
          {[0,60,120,180,240,300].map((angle, idx) => (
            <div key={idx} className="absolute" style={{ inset: 0, borderRadius: "50%" }}>
              <motion.div
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 2 + idx * 0.3, repeat: Infinity, ease: "easeInOut" }}
                className="absolute w-1.5 h-1.5 rounded-full"
                style={{
                  background: idx % 2 === 0 ? "#c084fc" : "#67e8f9",
                  top: "50%", left: "50%",
                  transform: `translate(-50%,-50%) rotate(${angle}deg) translateY(${-s/2 - 8}px)`,
                  boxShadow: idx % 2 === 0 ? "0 0 6px #c084fc" : "0 0 6px #67e8f9",
                }}
              />
            </div>
          ))}
        </>
      )}
      {/* Celestial — gold metallic ring with orbiting moons */}
      {showCelestial && (
        <>
          <div className="absolute inset-0" style={{ borderRadius, boxShadow: `0 0 0 3px #d4af37, 0 0 18px #d4af3788, 0 0 36px #d4af3733` }} />
          {[0, 72, 144, 216, 288].map((angle, idx) => (
            <motion.div key={idx}
              animate={{ rotate: [angle, angle + 360] }}
              transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
              className="absolute"
              style={{ inset: 0, borderRadius: "50%" }}
            >
              <div
                className="absolute"
                style={{
                  width: 7, height: 7, borderRadius: "50%",
                  background: "radial-gradient(circle, #fffde7 30%, #d4af37 100%)",
                  boxShadow: "0 0 8px #d4af37",
                  top: "50%", left: "50%",
                  transform: `translate(-50%,-50%) rotate(${angle}deg) translateY(${-s/2 - 9}px)`,
                }}
              />
            </motion.div>
          ))}
        </>
      )}
      {/* Lava — slow red/orange morphing blob ring */}
      {showLava && (
        <>
          <motion.div
            animate={{ rotate: 360, scale: [1, 1.05, 1] }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            className="absolute"
            style={{ inset: -4, borderRadius: "50%", background: "conic-gradient(#ff2200,#ff6600,#ff9900,#ffcc00,#ff4400,#ff2200)", filter: "blur(2px)", opacity: 0.9 }}
          />
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
            className="absolute"
            style={{ inset: -2, borderRadius: "50%", background: "conic-gradient(transparent,rgba(255,100,0,0.6),transparent,rgba(255,50,0,0.6),transparent)", filter: "blur(3px)" }}
          />
          <motion.div
            animate={{ boxShadow: [`0 0 0 2px #ff4400, 0 0 20px #ff440099, 0 0 40px #ff220055`, `0 0 0 2px #ff6600, 0 0 28px #ff6600aa, 0 0 55px #ff330066`] }}
            transition={{ duration: 1.5, repeat: Infinity, repeatType: "mirror" }}
            className="absolute inset-0"
            style={{ borderRadius }}
          />
        </>
      )}
      {/* Prism — shifting rainbow hue-rotate gradient */}
      {showPrism && (
        <>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
            className="absolute"
            style={{ inset: -3, borderRadius: "50%", background: "conic-gradient(#ff0000,#ff8800,#ffff00,#00ff88,#0088ff,#8800ff,#ff0088,#ff0000)", padding: "3px" }}
          />
          <motion.div
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="absolute"
            style={{ inset: -1, borderRadius, boxShadow: "0 0 20px rgba(255,255,255,0.3), 0 0 40px rgba(180,100,255,0.2)" }}
          />
        </>
      )}
      {/* Void — dark portal with glowing edge and dim orbiting dots */}
      {showVoid && (
        <>
          <div className="absolute inset-0" style={{ borderRadius, boxShadow: `0 0 0 2px rgba(255,255,255,0.15), 0 0 24px rgba(100,50,200,0.5), 0 0 50px rgba(50,0,150,0.3)` }} />
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
            className="absolute"
            style={{ inset: -5, borderRadius: "50%", background: "conic-gradient(transparent 0deg, rgba(150,50,255,0.3) 60deg, transparent 120deg, rgba(50,0,200,0.2) 200deg, transparent 360deg)", filter: "blur(4px)" }}
          />
          {[0, 90, 180, 270].map((angle, idx) => (
            <div key={idx} className="absolute" style={{ inset: 0, borderRadius: "50%" }}>
              <motion.div
                animate={{ opacity: [0, 0.6, 0] }}
                transition={{ duration: 3, repeat: Infinity, delay: idx * 0.75, ease: "easeInOut" }}
                className="absolute w-1 h-1 rounded-full"
                style={{
                  background: "#a78bfa",
                  boxShadow: "0 0 6px #a78bfa",
                  top: "50%", left: "50%",
                  transform: `translate(-50%,-50%) rotate(${angle}deg) translateY(${-s/2 - 6}px)`,
                }}
              />
            </div>
          ))}
        </>
      )}
      {/* Dragon — fire and shadow dual-ring */}
      {showDragon && (
        <>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="absolute"
            style={{ inset: -5, borderRadius: "50%", background: "conic-gradient(#ff1a00,#ff6600,#ffbb00,#ff4400,#cc0000,#ff1a00)", filter: "blur(1px)", opacity: 0.9 }}
          />
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            className="absolute"
            style={{ inset: -2, borderRadius: "50%", background: "conic-gradient(transparent,rgba(200,0,0,0.7),transparent,rgba(255,100,0,0.5),transparent)", filter: "blur(2px)" }}
          />
          <motion.div
            animate={{ boxShadow: [`0 0 0 2px #ff3300, 0 0 16px #ff330099, 0 -6px 20px #ff880066`, `0 0 0 2px #ff6600, 0 0 24px #ff6600cc, 0 -10px 30px #ffaa0088`] }}
            transition={{ duration: 0.8, repeat: Infinity, repeatType: "mirror" }}
            className="absolute inset-0"
            style={{ borderRadius }}
          />
          <div style={{ position: "absolute", top: -20, left: "50%", transform: "translateX(-50%)", fontSize: 14, filter: "drop-shadow(0 0 8px #ff4400)" }}>🐉</div>
        </>
      )}
      {/* Matrix — falling green code rain aura */}
      {showMatrix && (
        <>
          <div className="absolute inset-0" style={{ borderRadius, boxShadow: `0 0 0 2px #00ff41, 0 0 16px #00ff4188, 0 0 32px #00ff4133` }} />
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            className="absolute"
            style={{ inset: -4, borderRadius: "50%", background: "conic-gradient(transparent,rgba(0,255,65,0.4),transparent,rgba(0,200,50,0.3),transparent)", filter: "blur(2px)" }}
          />
          {[0,45,90,135,180,225,270,315].map((angle, idx) => (
            <motion.div key={idx}
              animate={{ opacity: [0, 1, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: idx * 0.19, ease: "easeInOut" }}
              className="absolute"
              style={{ top: "50%", left: "50%", transform: `translate(-50%,-50%) rotate(${angle}deg) translateY(${-s/2 - 6}px)`, fontFamily: "monospace", fontSize: 8, color: "#00ff41", textShadow: "0 0 6px #00ff41" }}
            >
              {["0","1","ア","イ","01"][idx % 5]}
            </motion.div>
          ))}
        </>
      )}
      {/* Custom DB decoration — image/GIF/MP4 overlay */}
      {customDecoUrl && (
        <div className="absolute pointer-events-none" style={{ inset: -8, zIndex: 10 }}>
          {customDecoIsVideo ? (
            <video src={customDecoUrl} autoPlay loop muted playsInline className="w-full h-full" style={{ objectFit: "contain", borderRadius: "50%" }} />
          ) : (
            <img src={customDecoUrl} alt="decoration" className="w-full h-full" style={{ objectFit: "contain", borderRadius: "50%" }} />
          )}
        </div>
      )}
      <div className="absolute inset-0 overflow-hidden bg-[#111]" style={{ borderRadius, ...decoStyle }}>
        {src && isYT ? (
          <iframe
            src={getYouTubeEmbedUrl(src, true, true)}
            width={s}
            height={s}
            frameBorder="0"
            allow="autoplay; mute"
            style={{ display: "block", pointerEvents: "none" }}
          />
        ) : src ? (
          <Img src={src} alt={username} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-3xl font-black text-white/20">
            {username[0].toUpperCase()}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Link Renderers ────────────────────────────────────────────────────────────

function LinkCard({ link, themeColor, primaryText, secondaryText, matchToTheme, linksGlow, themeColorIcons }: any) {
  const lp = getPlatform(link.platform);
  const IconEl = lp?.icon;
  const iconSrc = link.icon && !lp ? link.icon : null;

  const iconColor = themeColorIcons ? themeColor : (matchToTheme ? "#ffffff" : (lp?.color || themeColor));
  const iconBg = matchToTheme ? `${themeColor}22` : (lp ? `${lp.color}22` : "rgba(255,255,255,0.05)");
  const iconBorder = matchToTheme ? `${themeColor}44` : `1px solid ${lp ? lp.color + "33" : "rgba(255,255,255,0.1)"}`;
  const bg = matchToTheme ? `${themeColor}08` : (lp ? `${lp.color}18` : `rgba(255,255,255,0.03)`);
  const borderColor = matchToTheme ? `${themeColor}22` : (lp ? `${lp.color}33` : "rgba(255,255,255,0.05)");

  return (
    <motion.a
      href={link.url}
      target="_blank"
      rel="noreferrer"
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      className="w-full h-full flex items-center gap-4 p-4 rounded-2xl border transition-all group relative overflow-hidden"
      style={{ backgroundColor: bg, borderColor, boxShadow: linksGlow ? `0 0 18px 2px ${themeColor}30, 0 0 40px 4px ${themeColor}14` : undefined }}
    >
      <motion.div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ background: matchToTheme ? `linear-gradient(135deg, ${themeColor}12, ${themeColor}22)` : (lp ? `linear-gradient(135deg, ${lp.color}12, ${lp.color}22)` : `linear-gradient(135deg, ${themeColor}08, ${themeColor}14)`) }}
      />
      <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 relative"
        style={{ backgroundColor: iconBg, border: iconBorder }}>
        {iconSrc ? (
          <img src={res(iconSrc)} alt="" className="w-7 h-7 object-contain" style={matchToTheme ? { filter: "brightness(0) invert(1)" } : undefined} />
        ) : IconEl ? (
          <IconEl style={{ color: iconColor }} className="w-6 h-6" />
        ) : (
          <ExternalLink className="w-5 h-5" style={{ color: iconColor }} />
        )}
      </div>
      <div className="flex-1 min-w-0 relative">
        <p className="font-black text-base leading-tight" style={{ color: primaryText }}>{link.title}</p>
        {link.description && <p className="text-xs mt-0.5 leading-snug" style={{ color: secondaryText }}>{link.description}</p>}
        {lp && <p className="text-[10px] font-bold uppercase tracking-wider mt-1 opacity-60" style={{ color: matchToTheme ? themeColor : lp.color }}>{lp.name}</p>}
      </div>
    </motion.a>
  );
}

function LinkIcon({ link, themeColor, matchToTheme, themeColorIcons }: any) {
  const lp = getPlatform(link.platform);
  const IconEl = lp?.icon;
  const iconSrc = link.icon && !lp ? link.icon : null;
  const iconColor = themeColorIcons ? themeColor : (matchToTheme ? themeColor : (lp?.color || themeColor));

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <motion.a
          href={link.url}
          target="_blank"
          rel="noreferrer"
          whileHover={{ scale: 1.25, y: -2 }}
          whileTap={{ scale: 0.9 }}
          className="w-10 h-10 flex items-center justify-center transition-all"
          title={link.title}
        >
          {iconSrc ? (
            <img src={res(iconSrc)} alt="" className="w-7 h-7 object-contain drop-shadow-md" />
          ) : IconEl ? (
            <IconEl style={{ color: iconColor }} className="w-6 h-6 drop-shadow-md" />
          ) : (
            <ExternalLink className="w-5 h-5 drop-shadow-md" style={{ color: iconColor }} />
          )}
        </motion.a>
      </TooltipTrigger>
      <TooltipContent className="bg-black border-white/10 text-xs font-bold">{link.title}</TooltipContent>
    </Tooltip>
  );
}

// ─── Discord Server Embed Card ─────────────────────────────────────────────────
function DiscordEmbedCard({ link, themeColor, large }: any) {
  const [server, setServer] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const raw = (link.url || "").trim();
    const code = raw
      .replace(/https?:\/\/discord\.gg\//i, "")
      .replace(/https?:\/\/discord\.com\/invite\//i, "")
      .replace(/\?.*/,"")
      .trim();
    if (!code) { setLoading(false); return; }
    fetch(`/api/discord-invite/${code}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { setServer(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [link.url]);

  const pad = large ? "p-6" : "p-4";
  const iconSize = large ? "w-20 h-20" : "w-14 h-14";
  const iconText = large ? "text-3xl" : "text-xl";
  const nameClass = large ? "font-black text-xl leading-tight truncate" : "font-black text-base leading-tight truncate";
  const statsClass = large ? "text-sm text-gray-400 mt-1" : "text-xs text-gray-400 mt-0.5";
  const joinClass = large ? "relative px-6 py-3 bg-[#5865F2] hover:bg-[#4752c4] text-white font-black rounded-xl text-base transition-colors shrink-0" : "relative px-4 py-2 bg-[#5865F2] hover:bg-[#4752c4] text-white font-black rounded-xl text-sm transition-colors shrink-0";

  if (loading) return null;

  if (!server?.name) {
    const fallbackUrl = (link.url || "").trim() || "#";
    return (
      <motion.a
        href={fallbackUrl}
        target="_blank"
        rel="noreferrer"
        whileHover={{ scale: 1.01, y: -1 }}
        className={`flex items-center gap-4 ${pad} rounded-2xl border relative overflow-hidden cursor-pointer`}
        style={{ backgroundColor: "#5865F211", borderColor: "#5865F233" }}
      >
        <div className={`${iconSize} rounded-full bg-[#5865F2]/20 flex items-center justify-center shrink-0 relative`}>
          <span className={`text-[#5865F2] ${iconText} font-black`}>D</span>
        </div>
        <div className="flex-1 min-w-0 relative">
          <p className={nameClass}>Discord Server</p>
          <p className={statsClass}>Click to join</p>
          <p className="text-[10px] font-black uppercase tracking-wider mt-1 text-[#7289da] opacity-80">discord · via hexed.at</p>
        </div>
        <span className={joinClass}>Join</span>
      </motion.a>
    );
  }

  const joinUrl = `https://discord.gg/${server.code}`;
  return (
    <motion.a
      href={joinUrl}
      target="_blank"
      rel="noreferrer"
      whileHover={{ scale: 1.01, y: -1 }}
      className={`flex items-center gap-4 ${pad} rounded-2xl border relative overflow-hidden cursor-pointer`}
      style={{ backgroundColor: "#5865F211", borderColor: "#5865F233" }}
    >
      <motion.div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity"
        style={{ background: "linear-gradient(135deg, #5865F212, #5865F224)" }} />
      {server.icon
        ? <img src={server.icon} alt="" className={`${iconSize} rounded-full shrink-0 relative`} />
        : <div className={`${iconSize} rounded-full bg-[#5865F2]/20 flex items-center justify-center shrink-0 relative`}>
            <span className={`text-[#5865F2] ${iconText} font-black`}>{server.name[0]}</span>
          </div>
      }
      <div className="flex-1 min-w-0 relative">
        <p className={nameClass}>{server.name}</p>
        <p className={statsClass}>
          <span className="text-green-400 font-bold">{server.onlineCount?.toLocaleString() ?? "?"}</span> online
          {" · "}
          <span className="font-bold">{server.memberCount?.toLocaleString() ?? "?"}</span> members
        </p>
        <p className="text-[10px] font-black uppercase tracking-wider mt-1 text-[#7289da] opacity-80">discord · via hexed.at</p>
      </div>
      <span className={joinClass}>Join</span>
    </motion.a>
  );
}

function LinkDefault({ link, themeColor, primaryText, secondaryText, matchToTheme, linksGlow, themeColorIcons }: any) {
  const lp = getPlatform(link.platform);
  const IconEl = lp?.icon;
  const iconSrc = link.icon && !lp ? link.icon : null;
  const iconColor = themeColorIcons ? themeColor : (matchToTheme ? "#ffffff" : (lp?.color || secondaryText));
  const iconBgColor = matchToTheme ? `${themeColor}22` : "rgba(0,0,0,0.5)";
  const iconBorderColor = matchToTheme ? `${themeColor}44` : `${lp?.color || themeColor}22`;

  return (
    <motion.a
      href={link.url}
      target="_blank"
      rel="noreferrer"
      whileHover={{ scale: 1.01, x: 3 }}
      whileTap={{ scale: 0.98 }}
      className="w-full h-full flex items-center gap-3 p-3.5 rounded-2xl border border-white/5 transition-all group relative overflow-hidden"
      style={{ backgroundColor: "rgba(255,255,255,0.03)", boxShadow: linksGlow ? `0 0 18px 2px ${themeColor}30, 0 0 40px 4px ${themeColor}14` : undefined }}
    >
      <motion.div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ background: `linear-gradient(135deg, ${themeColor}08, ${themeColor}14)` }}
      />
      <div className="w-9 h-9 rounded-xl flex items-center justify-center border shrink-0 relative"
        style={{ backgroundColor: iconBgColor, borderColor: iconBorderColor }}>
        {iconSrc ? (
          <img src={res(iconSrc)} alt="" className="w-5 h-5 object-contain" style={matchToTheme ? { filter: "brightness(0) invert(1)" } : undefined} />
        ) : IconEl ? (
          <IconEl style={{ color: iconColor }} className="w-4 h-4" />
        ) : (
          <ExternalLink className="w-4 h-4" style={{ color: iconColor }} />
        )}
      </div>
      <div className="flex-1 text-left relative">
        <p className="font-black text-sm leading-tight" style={{ color: primaryText }}>{link.title}</p>
        {link.description && <p className="text-[11px] mt-0.5 leading-tight" style={{ color: secondaryText }}>{link.description}</p>}
      </div>
    </motion.a>
  );
}

// ─── Main Profile ─────────────────────────────────────────────────────────────

export default function PublicProfile() {
  const [, params] = useRoute("/:username");
  const [revealed, setRevealed] = useState(false);
  const [musicStarted, setMusicStarted] = useState(false);
  const bgVideoRef = useRef<HTMLVideoElement>(null);
  const bannerVideoRef = useRef<HTMLVideoElement>(null);
  const [bannerVolume, setBannerVolume] = useState(80);
  const [bannerPlaying, setBannerPlaying] = useState(false);
  const [splitTilt, setSplitTilt] = useState({ x: 0, y: 0 });
  const [showLikePrompt, setShowLikePrompt] = useState(false);
  const [likePromptDismissed, setLikePromptDismissed] = useState(false);
  const [likedAnimation, setLikedAnimation] = useState(false);
  const [showThankYou, setShowThankYou] = useState(false);
  const [likeUnlocked, setLikeUnlocked] = useState(false);
  const username = params?.username;

  const { data, isLoading, error } = useQuery<any>({
    queryKey: [`/api/public/profile/${username}`],
    enabled: !!username,
    retry: false,
  });

  const { data: badgeData } = useQuery<any>({ queryKey: ["/api/badges"] });
  const { data: tracksData } = useQuery<any>({
    queryKey: [`/api/public/tracks/${username}`],
    enabled: !!username,
  });

  const { data: likeStatus, refetch: refetchLikes } = useQuery<{ liked: boolean; likes: number }>({
    queryKey: [`/api/public/like-status/${username}`],
    enabled: !!username && !!data,
    retry: false,
  });

  const likeMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/public/like/${username}`),
    onSuccess: () => {
      refetchLikes();
      setLikedAnimation(true);
      setTimeout(() => setLikedAnimation(false), 600);
    },
  });

  const unlikeMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/public/like/${username}`),
    onSuccess: () => {
      refetchLikes();
    },
  });

  const handleLike = () => {
    if (likeStatus?.liked) {
      unlikeMutation.mutate();
      setShowThankYou(false);
    } else {
      likeMutation.mutate();
      setLikePromptDismissed(true);
      setShowLikePrompt(false);
      setShowThankYou(true);
      setTimeout(() => setShowThankYou(false), 1800);
    }
  };

  const dismissLikePrompt = () => {
    setLikePromptDismissed(true);
    setShowLikePrompt(false);
  };

  useEffect(() => {
    if (!username || !data) return;
    setLikeUnlocked(true);
    if (!likePromptDismissed) {
      const seenKey = `hexed_seen_like_${username}`;
      if (localStorage.getItem(seenKey) !== "1") {
        const t = setTimeout(() => {
          setShowLikePrompt(true);
        }, 5000);
        return () => clearTimeout(t);
      }
    }
  }, [username, data]);

  const { user, profile } = data || {};
  const s: Record<string, any> = profile?.settings || {};

  const themeColor       = profile?.themeColor || "#F97316";
  const primaryText      = getS(s, "primaryTextColor", "#ffffff");
  const secondaryText    = getS(s, "secondaryTextColor", "#9ca3af");
  const faviconUrl       = getS(s, "faviconUrl", "");
  const pageTitle        = getS(s, "pageTitle", "");
  const pageTitleAnim    = getS(s, "pageTitleAnim", "none");
  const pageTitleSpeed   = getS(s, "pageTitleAnimSpeed", 3);
  const pageOverlay      = getS(s, "pageOverlay", "none");
  const enterAnim        = getS(s, "pageEnterAnim", "fade");
  const enterSpeed       = getS(s, "pageEnterSpeed", 0.4);
  const bannerOpacity    = getS(s, "bannerOpacity", 1);
  const bannerBlur       = getS(s, "bannerBlur", 0);
  const boxTilt          = getS(s, "boxTilt", true);
  const boxTiltIntensity = getS(s, "boxTiltIntensity", 12);
  const autoTilt         = getS(s, "autoTilt", false);
  const autoTiltInterval = getS(s, "autoTiltInterval", 4);
  const boxWidth         = getS(s, "boxWidth", 520);
  const boxPadding       = getS(s, "boxPadding", 28);
  const boxColor         = getS(s, "boxColor", "#000000");
  const boxOpacity       = getS(s, "boxOpacity", 0.45);
  const boxRadius        = getS(s, "boxRadius", 24);
  const bgSize           = getS(s, "bgSize", "cover");
  const bgBlur           = getS(s, "bgBlur", 0);
  const bgOpacity        = getS(s, "bgOpacity", 0.4);
  const bgParticles      = getS(s, "bgParticles", "none");
  const usernameSparkles    = getS(s, "usernameSparkles", false);
  const sparkleColor        = getS(s, "sparkleColor", "theme");
  const usernameFont        = getS(s, "usernameFont", "inherit");
  const usernameTypewriter  = getS(s, "usernameTypewriter", false);
  const avatarDecoration = getS(s, "avatarDecoration", "none");
  const avatarRadius     = getS(s, "avatarRadius", 50);
  const cursorRaw        = getS(s, "cursor", "default");
  const cursorImageUrl   = getS(s, "cursorImageUrl", "");
  const cursorColor      = getS(s, "cursorColor", "");
  const buildColoredCursor = (color: string) => {
    const escaped = color.replace(/"/g, "'");
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='20' height='28' viewBox='0 0 20 28'><path d='M0 0 L0 22 L6 16 L10 24 L13 23 L9 15 L16 15 Z' fill='${escaped}' stroke='rgba(0,0,0,0.45)' stroke-width='1.2'/></svg>`;
    return `url("data:image/svg+xml,${encodeURIComponent(svg)}") 0 0, auto`;
  };
  const cursor           = cursorImageUrl
    ? `url(${cursorImageUrl}), auto`
    : cursorColor
    ? buildColoredCursor(cursorColor)
    : cursorRaw;
  const cursorTrail      = getS(s, "cursorTrail", false);
  const cursorTrailColor = getS(s, "cursorTrailColor", themeColor);
  const revealBlur       = getS(s, "revealBlur", 8);
  const autoReveal       = getS(s, "autoReveal", false);
  const autoRevealDelay  = getS(s, "autoRevealDelay", 3);
  const trackPlayerEnabled  = getS(s, "trackPlayerEnabled", true);
  const trackPlayerPos      = getS(s, "trackPlayerPos", "bottom-right");
  const trackPlayerAutoplay = getS(s, "trackPlayerAutoplay", true);
  const trackRandomStart    = getS(s, "trackRandomStart", false);
  const profileEffect      = getS(s, "profileEffect", "none");
  const contentAlign       = getS(s, "contentAlign", "center");
  const tags: string[]     = getS(s, "tags", []);
  const tagsPosition       = getS(s, "tagsPosition", "default");
  const profileFont        = getS(s, "profileFont", "inherit");
  const pronouns           = getS(s, "pronouns", "");
  const statusMsg          = getS(s, "statusMessage", "");
  const statusEmoji        = getS(s, "statusEmoji", "");
  const metaInfoPos        = getS(s, "metaInfoPos", "default");
  const matchLinksToTheme  = getS(s, "matchLinksToTheme", false);
  const matchBadgesToTheme = getS(s, "matchBadgesToTheme", false);
  const badgesGlow         = getS(s, "badgesGlow", false);
  const linksLayout        = getS(s, "linksLayout", "stacked");
  const linksGlow          = getS(s, "linksGlow", false);
  const boxBlurAmount      = getS(s, "boxBlurAmount", 20);
  const boxBlurX           = getS(s, "boxBlurX", 50);
  const boxBlurY           = getS(s, "boxBlurY", 50);
  const profileTheme          = getS(s, "profileTheme", "none");
  const matchMaterialToTheme  = getS(s, "matchMaterialToTheme", false);
  const trackVolume           = getS(s, "trackVolume", 80);
  const themeColorIcons    = getS(s, "themeColorIcons", false);
  const boxBorderColor     = getS(s, "boxBorderColor", null);
  const showLikeCounter    = getS(s, "showLikeCounter", true);
  const strokeEnabled      = getS(s, "strokeEnabled", false);
  const strokeColor        = getS(s, "strokeColor", "#ffffff");
  const strokeOpacity      = getS(s, "strokeOpacity", 1);
  const strokeWidth        = getS(s, "strokeWidth", 1);

  const hexToRgba = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  };
  const strokeBorderStyle: React.CSSProperties = strokeEnabled
    ? { border: `${strokeWidth}px solid ${hexToRgba(strokeColor, strokeOpacity)}` }
    : {};

  // Gradient settings (premium)
  const themeGradientEnabled         = getS(s, "themeGradientEnabled", false);
  const themeGradientFrom            = getS(s, "themeGradientFrom", themeColor);
  const themeGradientTo              = getS(s, "themeGradientTo", "#FF6B6B");
  const themeGradientAngle           = getS(s, "themeGradientAngle", 135);
  const primaryTextGradientEnabled   = getS(s, "primaryTextGradientEnabled", false);
  const primaryTextGradientFrom      = getS(s, "primaryTextGradientFrom", "#ffffff");
  const primaryTextGradientTo        = getS(s, "primaryTextGradientTo", "#aaaaaa");
  const primaryTextGradientAngle     = getS(s, "primaryTextGradientAngle", 135);
  const secondaryTextGradientEnabled = getS(s, "secondaryTextGradientEnabled", false);
  const secondaryTextGradientFrom    = getS(s, "secondaryTextGradientFrom", "#9ca3af");
  const secondaryTextGradientTo      = getS(s, "secondaryTextGradientTo", "#6b7280");
  const secondaryTextGradientAngle   = getS(s, "secondaryTextGradientAngle", 135);
  const boxBorderGradientEnabled     = getS(s, "boxBorderGradientEnabled", false);
  const boxBorderGradientFrom        = getS(s, "boxBorderGradientFrom", "#ffffff");
  const boxBorderGradientTo          = getS(s, "boxBorderGradientTo", "#888888");
  const boxBorderGradientAngle       = getS(s, "boxBorderGradientAngle", 135);
  const boxBlurEnabled               = getS(s, "boxBlurEnabled", false);
  const boxBlurOpacity               = getS(s, "boxBlurOpacity", 0.4);

  // Computed gradient CSS helpers
  const primaryTextStyle: React.CSSProperties = primaryTextGradientEnabled
    ? { background: `linear-gradient(${primaryTextGradientAngle}deg, ${primaryTextGradientFrom}, ${primaryTextGradientTo})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", color: "transparent" }
    : { color: primaryText };
  const secondaryTextStyle: React.CSSProperties = secondaryTextGradientEnabled
    ? { background: `linear-gradient(${secondaryTextGradientAngle}deg, ${secondaryTextGradientFrom}, ${secondaryTextGradientTo})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", color: "transparent" }
    : { color: secondaryText };
  const effectiveThemeColor = themeGradientEnabled
    ? `url(#hexedThemeGrad)` : themeColor;

  // Page title effect
  useEffect(() => {
    if (!data) return;
    const base = pageTitle || (profile ? `${profile.displayName || user?.username} — Hexed` : "Hexed");
    if (pageTitleAnim === "scroll") {
      const full = `${base}   `;
      let i = 0;
      const t = setInterval(() => {
        document.title = full.slice(i) + full.slice(0, i);
        i = (i + 1) % full.length;
      }, pageTitleSpeed * 100);
      return () => clearInterval(t);
    } else if (pageTitleAnim === "blink") {
      let on = true;
      const t = setInterval(() => {
        document.title = on ? base : "· · ·";
        on = !on;
      }, pageTitleSpeed * 300);
      return () => clearInterval(t);
    } else {
      document.title = base;
    }
  }, [data, pageTitle, pageTitleAnim, pageTitleSpeed]);

  useEffect(() => {
    if (!faviconUrl) return;
    let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
    if (!link) { link = document.createElement("link"); link.rel = "icon"; document.head.appendChild(link); }
    link.href = res(faviconUrl);
  }, [faviconUrl]);

  // Reveal
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const isPreview = params.get("preview") === "1";
    if (data?.profile && (!data.profile.revealEnabled || isPreview)) { setRevealed(true); setMusicStarted(true); }
  }, [data]);

  // Auto-reveal timer
  useEffect(() => {
    if (!data?.profile?.revealEnabled || revealed || !autoReveal) return;
    const t = setTimeout(() => { setRevealed(true); setMusicStarted(true); }, autoRevealDelay * 1000);
    return () => clearTimeout(t);
  }, [data, revealed, autoReveal, autoRevealDelay]);

  const tracks = (tracksData || []).filter((t: any) => t.enabled !== 0).map((t: any) => ({ title: t.title, url: t.url, artistProfile: t.artistProfile || "" }));
  if (profile?.musicUrl && tracks.length === 0) {
    tracks.push({ title: "Music", url: profile.musicUrl, artistProfile: "" });
  }

  // Reactively update background video muted state (React's muted prop doesn't update the DOM attribute)
  useEffect(() => {
    if (!bgVideoRef.current) return;
    bgVideoRef.current.muted = tracks.length > 0 || !musicStarted;
  }, [tracks.length, musicStarted]);

  // Banner video audio — activate when music starts and no tracks are loaded
  const bannerIsVideo = isVideoFileUrl(profile?.bannerUrl || "");
  useEffect(() => {
    if (!bannerVideoRef.current || !bannerIsVideo) return;
    if (musicStarted && tracks.length === 0) {
      bannerVideoRef.current.muted = false;
      bannerVideoRef.current.volume = bannerVolume / 100;
      setBannerPlaying(true);
    } else {
      bannerVideoRef.current.muted = true;
    }
  }, [musicStarted, tracks.length, bannerIsVideo]);

  useEffect(() => {
    if (!bannerVideoRef.current || !bannerIsVideo) return;
    bannerVideoRef.current.volume = bannerVolume / 100;
  }, [bannerVolume, bannerIsVideo]);

  const toggleBannerAudio = () => {
    if (!bannerVideoRef.current) return;
    if (bannerPlaying) {
      bannerVideoRef.current.muted = true;
      setBannerPlaying(false);
    } else {
      bannerVideoRef.current.muted = false;
      bannerVideoRef.current.volume = bannerVolume / 100;
      setBannerPlaying(true);
    }
  };

  const enterVariants: Record<string, any> = {
    fade:       { initial: { opacity: 0 }, animate: { opacity: 1 } },
    "slide-up": { initial: { opacity: 0, y: 40 }, animate: { opacity: 1, y: 0 } },
    scale:      { initial: { opacity: 0, scale: 0.85 }, animate: { opacity: 1, scale: 1 } },
    blur:       { initial: { opacity: 0, filter: "blur(20px)" }, animate: { opacity: 1, filter: "blur(0px)" } },
  };
  const ev = enterVariants[enterAnim] || enterVariants.fade;

  const handleReveal = () => { setRevealed(true); setMusicStarted(true); };

  if (isLoading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <span className="text-xs font-black italic tracking-widest text-white/60">HEXED.AT</span>
    </div>
  );

  if (error || !data) return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center p-4">
      <h1 className="text-5xl font-black mb-2 tracking-widest" style={{ color: themeColor }}>404</h1>
      <p className="text-gray-500 font-bold tracking-widest uppercase text-xs">User not found</p>
      <a href="/" className="mt-8 text-xs font-black tracking-widest uppercase border border-white/20 px-6 py-2.5 rounded-xl hover:bg-white hover:text-black transition-all" style={{ color: primaryText }}>Go Home</a>
    </div>
  );

  if (data?.isBanned) return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center p-4">
      <div className="text-6xl mb-4">🚫</div>
      <h1 className="text-3xl font-black mb-2 tracking-widest text-red-400">This user has been banned!</h1>
      <p className="text-gray-600 font-bold tracking-widest uppercase text-xs">This account has been disabled.</p>
      <a href="/" className="mt-8 text-xs font-black tracking-widest uppercase border border-white/20 px-6 py-2.5 rounded-xl hover:bg-white hover:text-black transition-all text-white">Go Home</a>
    </div>
  );

  const showReveal = profile?.revealEnabled && !revealed;

  const getBadgeIcon = (name: string) => badgeData?.find((b: any) => b.name === name)?.icon || "";
  const getBadgeMeta = (name: string) => badgeData?.find((b: any) => b.name === name) || null;

  const hexToRgb = (hex: string) => {
    try {
      const r2 = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `${r2},${g},${b}`;
    } catch { return "0,0,0"; }
  };
  const boxRgb = hexToRgb(boxColor.startsWith("#") ? boxColor : "#000000");
  const boxBg = `rgba(${boxRgb},${boxOpacity})`;
  const boxBorderStyle: React.CSSProperties = boxBorderGradientEnabled
    ? { background: `linear-gradient(${boxBg}, ${boxBg}) padding-box, linear-gradient(${boxBorderGradientAngle}deg, ${boxBorderGradientFrom}, ${boxBorderGradientTo}) border-box`, border: "1.5px solid transparent" }
    : {};

  const tc = themeColor; // shorthand
  const profileThemeStyle: React.CSSProperties = (() => {
    if (profileTheme === "glass") {
      const tintBg = matchMaterialToTheme
        ? `linear-gradient(135deg, ${tc}18 0%, ${tc}08 50%, ${tc}14 100%)`
        : "linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.04) 50%, rgba(255,255,255,0.10) 100%)";
      const borderColor = matchMaterialToTheme ? `${tc}66` : "rgba(255,255,255,0.35)";
      return {
        background: tintBg,
        border: `1.5px solid ${borderColor}`,
        backdropFilter: `blur(${Math.max(boxBlurAmount, 32)}px) saturate(180%)`,
        WebkitBackdropFilter: `blur(${Math.max(boxBlurAmount, 32)}px) saturate(180%)`,
        boxShadow: `inset 0 1px 0 rgba(255,255,255,0.25), inset 0 -1px 0 rgba(255,255,255,0.05), 0 8px 32px rgba(0,0,0,0.35)`,
      };
    }
    if (profileTheme === "metallic") {
      const bg = matchMaterialToTheme
        ? `linear-gradient(135deg, ${tc}55 0%, ${tc}aa 35%, ${tc}66 55%, ${tc}bb 100%)`
        : "linear-gradient(135deg, #3a3a3a 0%, #7a7a7a 35%, #4a4a4a 55%, #8a8a8a 100%)";
      return {
        background: bg,
        border: "1px solid rgba(255,255,255,0.22)",
        backdropFilter: `blur(${boxBlurAmount}px)`,
        WebkitBackdropFilter: `blur(${boxBlurAmount}px)`,
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.3), 0 4px 24px rgba(0,0,0,0.4)",
      };
    }
    if (profileTheme === "chrome") {
      const bg = matchMaterialToTheme
        ? `linear-gradient(135deg, ${tc}33 0%, ${tc}88 25%, ${tc}44 50%, ${tc}77 75%, ${tc}55 100%)`
        : "linear-gradient(135deg, #b0b0b0 0%, #e0e0e0 25%, #888888 50%, #d0d0d0 75%, #989898 100%)";
      return {
        background: bg,
        border: "1px solid rgba(255,255,255,0.45)",
        backdropFilter: `blur(${boxBlurAmount}px)`,
        WebkitBackdropFilter: `blur(${boxBlurAmount}px)`,
        boxShadow: "inset 0 2px 0 rgba(255,255,255,0.55), inset 0 -1px 0 rgba(0,0,0,0.2), 0 6px 32px rgba(0,0,0,0.45)",
      };
    }
    if (profileTheme === "cardboard") {
      const bg = matchMaterialToTheme
        ? `linear-gradient(135deg, ${tc}55 0%, ${tc}88 40%, ${tc}44 60%, ${tc}77 100%)`
        : "linear-gradient(135deg, #a07840 0%, #c2a060 40%, #956a30 60%, #b89050 100%)";
      return {
        background: bg,
        border: matchMaterialToTheme ? `1px solid ${tc}66` : "1px solid rgba(139,90,43,0.5)",
        backdropFilter: `blur(${boxBlurAmount}px)`,
        WebkitBackdropFilter: `blur(${boxBlurAmount}px)`,
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.15), 0 4px 20px rgba(0,0,0,0.3)",
      };
    }
    if (profileTheme === "dark") {
      return {
        background: "#0a0a0a",
        border: "1px solid rgba(255,255,255,0.10)",
        backdropFilter: `blur(${boxBlurAmount}px)`,
        WebkitBackdropFilter: `blur(${boxBlurAmount}px)`,
        boxShadow: "0 4px 24px rgba(0,0,0,0.6)",
      };
    }
    if (profileTheme === "white") {
      return {
        background: "#ffffff",
        border: "1px solid rgba(0,0,0,0.10)",
        backdropFilter: `blur(${boxBlurAmount}px)`,
        WebkitBackdropFilter: `blur(${boxBlurAmount}px)`,
        boxShadow: "0 4px 24px rgba(0,0,0,0.15)",
        color: "#111111",
      };
    }
    return {
      background: boxBg,
      backdropFilter: `blur(${boxBlurAmount}px)`,
      WebkitBackdropFilter: `blur(${boxBlurAmount}px)`,
      border: `1px solid rgba(255,255,255,0.07)`,
    };
  })();

  const alignClass = contentAlign === "left" ? "items-start" : contentAlign === "right" ? "items-end" : "items-center";
  const textAlignClass = contentAlign === "left" ? "text-left" : contentAlign === "right" ? "text-right" : "text-center";

  // Separate icon-style links from others
  const iconLinks = (data.links || []).filter((l: any) => l.style === "icon");
  const regularLinks = (data.links || []).filter((l: any) => l.style !== "icon");

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden"
      style={{ backgroundColor: "#050505", color: primaryText, cursor, fontFamily: profileFont !== "inherit" ? profileFont : undefined }}
    >
      <style>{PROFILE_STYLES}</style>

      {/* Background Media */}
      {profile?.backgroundVideoUrl ? (
        <div className="fixed inset-0 z-0 pointer-events-none">
          <video ref={bgVideoRef} src={res(profile.backgroundVideoUrl)} autoPlay loop playsInline
            muted={tracks.length > 0 || !musicStarted}
            className="w-full h-full"
            style={{ objectFit: bgSize as any, opacity: bgOpacity, filter: bgBlur > 0 ? `blur(${bgBlur}px)` : undefined }}
          />
        </div>
      ) : profile?.backgroundUrl ? (
        <div className="fixed inset-0 z-0 pointer-events-none">
          <Img src={profile.backgroundUrl} alt="bg" className="w-full h-full" eager
            style={{ objectFit: bgSize as any, opacity: bgOpacity, filter: bgBlur > 0 ? `blur(${bgBlur}px)` : undefined }}
          />
        </div>
      ) : null}

      <BgEffect type={bgParticles} color={themeColor} />
      <PageOverlay type={pageOverlay} />
      {cursorTrail && <CursorTrail color={cursorTrailColor} />}
      <ProfileEffect effect={profileEffect} />

      {trackPlayerEnabled && tracks.length > 0 && (
        <MusicPlayer tracks={tracks} autoplay={(trackPlayerAutoplay || !profile?.revealEnabled) && musicStarted} position={trackPlayerPos} themeColor={themeColor} randomStart={trackRandomStart} initialVolume={trackVolume} />
      )}

      {/* Like count — top left (respects showLikeCounter setting) — becomes clickable after 10s */}
      <AnimatePresence>
        {showLikeCounter && likeStatus && (
          <motion.button
            key="like-count"
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.4, delay: 0.5 }}
            onClick={() => { if (likeUnlocked) handleLike(); }}
            disabled={!likeUnlocked || likeMutation.isPending || unlikeMutation.isPending}
            className="fixed top-4 left-4 z-50 flex items-center gap-1.5 px-3 py-1.5 rounded-full backdrop-blur-md border transition-all"
            style={{
              backgroundColor: "rgba(0,0,0,0.65)",
              borderColor: likeStatus?.liked ? themeColor + "cc" : themeColor + "55",
              cursor: likeUnlocked ? "pointer" : "default",
              boxShadow: likeStatus?.liked ? `0 0 12px ${themeColor}44` : "none",
            }}
          >
            <Heart
              className="w-3 h-3 transition-transform"
              style={{
                color: themeColor,
                fill: likeStatus?.liked ? themeColor : "transparent",
                transform: likedAnimation ? "scale(1.4)" : "scale(1)",
              }}
            />
            <span className="text-[11px] font-black" style={{ color: themeColor }}>{likeStatus.likes}</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Thank you message after liking — shown below the heart button */}
      <AnimatePresence>
        {showThankYou && (
          <motion.div
            key="thank-you"
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="fixed top-14 left-4 z-[200] flex items-center gap-2.5 px-3.5 py-2 rounded-xl backdrop-blur-xl border shadow-xl"
            style={{ backgroundColor: "rgba(0,0,0,0.88)", borderColor: themeColor + "66" }}
          >
            <Heart className="w-3.5 h-3.5 fill-current shrink-0" style={{ color: themeColor }} />
            <span className="text-xs font-semibold text-white whitespace-nowrap">Thanks for the like!</span>
            <button
              onClick={() => setShowThankYou(false)}
              className="w-4 h-4 flex items-center justify-center text-gray-500 hover:text-white transition-colors shrink-0 ml-0.5"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Like prompt — 15 seconds — shown top left */}
      <AnimatePresence>
        {showLikePrompt && !likePromptDismissed && !showThankYou && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="fixed top-4 left-4 z-[200] flex items-center gap-3 px-4 py-2.5 rounded-2xl backdrop-blur-xl border shadow-xl"
            style={{ backgroundColor: "rgba(0,0,0,0.85)", borderColor: themeColor + "55", maxWidth: "calc(100vw - 32px)" }}
          >
            <Heart className="w-4 h-4 shrink-0" style={{ color: themeColor }} />
            <span className="text-sm whitespace-nowrap font-semibold text-white">Do you like this profile?</span>
            <motion.button
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => handleLike()}
              disabled={likeMutation.isPending || unlikeMutation.isPending}
              className="px-3 h-7 rounded-full flex items-center justify-center transition-all shrink-0 text-xs font-black"
              style={{ backgroundColor: likeStatus?.liked ? themeColor + "33" : themeColor, color: likeStatus?.liked ? themeColor : "black" }}
            >
              {likeStatus?.liked ? "Liked ♥" : "Like"}
            </motion.button>
            <button
              onClick={dismissLikePrompt}
              className="w-5 h-5 flex items-center justify-center text-gray-600 hover:text-white transition-colors shrink-0"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {/* Reveal Screen */}
        {showReveal ? (
          <motion.div
            key="reveal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center cursor-pointer select-none"
            style={{ backgroundColor: "#050505" }}
            onClick={handleReveal}
          >
            {/* Blurred background preview */}
            {profile?.backgroundVideoUrl ? (
              <div className="absolute inset-0 pointer-events-none">
                <video src={res(profile.backgroundVideoUrl)} autoPlay loop muted playsInline
                  className="w-full h-full object-cover"
                  style={{ opacity: 0.25, filter: `blur(${Math.max(revealBlur, 12)}px)` }}
                />
              </div>
            ) : profile?.backgroundUrl ? (
              <div className="absolute inset-0 pointer-events-none">
                <Img src={profile.backgroundUrl} alt="bg" className="w-full h-full object-cover"
                  style={{ opacity: 0.25, filter: `blur(${Math.max(revealBlur, 12)}px)` }}
                />
              </div>
            ) : null}

            {/* Dark overlay */}
            <div className="absolute inset-0 bg-black/75 pointer-events-none" />

            {/* Radial glow behind content */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div style={{
                width: 400, height: 400, borderRadius: "50%",
                background: `radial-gradient(circle, ${themeColor}22 0%, transparent 70%)`,
                filter: "blur(40px)",
              }} />
            </div>

            {/* Center content */}
            <div className="relative z-10 flex flex-col items-center gap-6 px-8 text-center">
              {/* Avatar hint */}
              {profile?.avatarUrl && (
                <div className="relative">
                  <div className="w-20 h-20 rounded-full overflow-hidden"
                    style={{ filter: "blur(6px)", opacity: 0.5, border: `2px solid ${themeColor}55` }}>
                    <Img src={profile.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                  </div>
                </div>
              )}

              {/* Main reveal text */}
              <motion.div
                animate={{ scale: [1, 1.04, 1] }}
                transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
              >
                <h2 className="text-4xl font-black uppercase tracking-[0.2em]" style={{ color: themeColor }}>
                  <VoidMark text={profile.revealText || "Click to reveal"} themeColor={themeColor} />
                </h2>
              </motion.div>

            </div>

            {/* Corner hex watermark */}
            <div className="absolute bottom-5 right-5 text-[11px] font-black uppercase tracking-widest pointer-events-none"
              style={{ color: themeColor + "55" }}>
              hex<span style={{ color: themeColor + "99" }}>ed</span>
            </div>
          </motion.div>
        ) : (
          /* Main Profile */
          <motion.div
            key="profile"
            initial={ev.initial}
            animate={ev.animate}
            transition={{ duration: enterSpeed }}
            className="relative z-10 py-8"
            style={{ width: "100%", maxWidth: boxWidth }}
          >
            <TiltBox
              enabled={boxTilt}
              intensity={boxTiltIntensity}
              autoTilt={autoTilt}
              autoTiltInterval={autoTiltInterval}
              onTiltChange={(x, y) => setSplitTilt({ x, y })}
              className="rounded-3xl overflow-visible relative"
              style={{
                ...profileThemeStyle,
                ...(boxBorderColor && !boxBorderGradientEnabled ? { borderColor: boxBorderColor } : {}),
                ...(boxBorderGradientEnabled ? boxBorderStyle : {}),
                ...strokeBorderStyle,
                borderRadius: boxRadius,
                padding: boxPadding,
              }}
            >
              {/* Blur spotlight overlay */}
              {boxBlurEnabled && boxBlurAmount > 0 && (
                <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden" style={{ borderRadius: boxRadius }}>
                  <div style={{
                    position: "absolute",
                    width: "60%",
                    height: "60%",
                    left: `${boxBlurX}%`,
                    top: `${boxBlurY}%`,
                    transform: "translate(-50%, -50%)",
                    background: `radial-gradient(circle, rgba(255,255,255,${boxBlurOpacity}) 0%, transparent 70%)`,
                    filter: "blur(20px)",
                  }} />
                </div>
              )}
              {/* Glass shine overlay */}
              {profileTheme === "glass" && (
                <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden" style={{ borderRadius: boxRadius }}>
                  <div style={{
                    position: "absolute",
                    top: 0, left: 0, right: 0,
                    height: "45%",
                    background: "linear-gradient(180deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.04) 60%, transparent 100%)",
                    borderRadius: `${boxRadius}px ${boxRadius}px 0 0`,
                  }} />
                  <div style={{
                    position: "absolute",
                    top: "8%", left: "10%", right: "10%",
                    height: "1px",
                    background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)",
                  }} />
                </div>
              )}
              {/* Banner */}
              {profile?.bannerUrl && (
                <div className="absolute top-0 left-0 right-0 overflow-hidden" style={{ height: 160, borderRadius: `${boxRadius}px ${boxRadius}px 0 0` }}>
                  {isYouTubeUrl(profile.bannerUrl) ? (
                    <iframe
                      src={getYouTubeEmbedUrl(profile.bannerUrl, true, tracks.length > 0)}
                      className="w-full h-full"
                      style={{ opacity: bannerOpacity, filter: bannerBlur > 0 ? `blur(${bannerBlur}px)` : undefined, pointerEvents: "none", border: "none" }}
                      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                      frameBorder="0"
                    />
                  ) : bannerIsVideo ? (
                    <video
                      ref={bannerVideoRef}
                      src={res(profile.bannerUrl)}
                      autoPlay loop playsInline muted
                      className="w-full h-full object-cover"
                      style={{ opacity: bannerOpacity, filter: bannerBlur > 0 ? `blur(${bannerBlur}px)` : undefined }}
                    />
                  ) : (
                    <Img src={profile.bannerUrl} alt="banner" className="w-full h-full object-cover"
                      style={{ opacity: bannerOpacity, filter: bannerBlur > 0 ? `blur(${bannerBlur}px)` : undefined }}
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/80" />
                  {/* Banner audio controls — only when banner is a video file */}
                  {bannerIsVideo && (
                    <AnimatePresence>
                      <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="absolute bottom-8 right-3 z-20 flex items-center gap-2 px-2.5 py-1.5 rounded-xl backdrop-blur-md"
                        style={{ backgroundColor: "rgba(0,0,0,0.7)", border: `1px solid ${themeColor}44` }}
                      >
                        <button
                          onClick={toggleBannerAudio}
                          className="w-5 h-5 flex items-center justify-center transition-colors hover:opacity-80"
                          style={{ color: themeColor }}
                        >
                          {bannerPlaying ? <Pause className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current" />}
                        </button>
                        <div className="w-20">
                          <ElasticSlider value={bannerVolume} onChange={setBannerVolume} themeColor={themeColor} />
                        </div>
                        <Volume2 className="w-3 h-3" style={{ color: themeColor }} />
                      </motion.div>
                    </AnimatePresence>
                  )}
                </div>
              )}

              {/* Top-right meta chips — overlap banner */}
              {metaInfoPos === "top-right" && (
                <div className="absolute top-3 right-3 z-20 flex flex-wrap justify-end gap-1.5 max-w-[65%]">
                  {profile.location && (
                    <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-bold backdrop-blur-md" style={{ backgroundColor: "rgba(0,0,0,0.55)", border: `1px solid ${themeColor}33`, color: secondaryText }}>
                      <MapPin className="w-2.5 h-2.5 shrink-0" style={{ color: themeColor }} />{profile.location}
                    </span>
                  )}
                  {pronouns && (
                    <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-bold backdrop-blur-md" style={{ backgroundColor: "rgba(0,0,0,0.55)", border: `1px solid ${themeColor}33`, color: secondaryText }}>
                      <UserIcon className="w-2.5 h-2.5 shrink-0" style={{ color: themeColor }} />{pronouns}
                    </span>
                  )}
                  {profile.showJoinDate && (
                    <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-bold backdrop-blur-md" style={{ backgroundColor: "rgba(0,0,0,0.55)", border: `1px solid ${themeColor}33`, color: secondaryText }}>
                      <Calendar className="w-2.5 h-2.5 shrink-0" style={{ color: themeColor }} />{new Date(user.joinDate).toLocaleDateString()}
                    </span>
                  )}
                  {profile.showUid && (
                    <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-bold backdrop-blur-md" style={{ backgroundColor: "rgba(0,0,0,0.55)", border: `1px solid ${themeColor}33`, color: secondaryText }}>
                      <Hash className="w-2.5 h-2.5 shrink-0" style={{ color: themeColor }} />UID {user.id}
                    </span>
                  )}
                  {profile.showViews && (
                    <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-bold backdrop-blur-md" style={{ backgroundColor: "rgba(0,0,0,0.55)", border: `1px solid ${themeColor}33`, color: secondaryText }}>
                      <Eye className="w-2.5 h-2.5 shrink-0" style={{ color: themeColor }} />{user.views} views
                    </span>
                  )}
                </div>
              )}

              {/* Content */}
              <div className={`relative ${profile?.bannerUrl ? "mt-28" : ""}`}>
                {/* Avatar row */}
                <div className={`flex ${contentAlign === "center" ? "flex-col items-center" : "items-end gap-4"} mb-4`}>
                  <div className="relative inline-block">
                    <AvatarWrapper
                      src={profile?.avatarUrl}
                      username={user.username}
                      radius={avatarRadius}
                      decoration={avatarDecoration}
                      themeColor={themeColor}
                      size={contentAlign === "center" ? 100 : 88}
                    />
                  </div>
                  <div className={`pb-1 min-w-0 ${contentAlign === "center" ? "mt-3 text-center" : ""}`}>
                    <div className={`flex items-center gap-2 flex-wrap ${contentAlign === "center" ? "justify-center" : ""}`}>
                      <h1
                        className="text-2xl font-black leading-tight"
                        style={{ ...primaryTextStyle, fontFamily: usernameFont !== "inherit" ? usernameFont : undefined }}
                      >
                        {usernameSparkles
                          ? <SparkleText text={profile.displayName || user.username} themeColor={themeColor} colorMode={sparkleColor} />
                          : usernameTypewriter
                            ? <UsernameTypewriter text={profile.displayName || user.username} themeColor={themeColor} />
                            : (profile.displayName || user.username)
                        }
                      </h1>
                    </div>
                        {/* Badges */}
                        {user.badges && user.badges.length > 0 && (
                          <TooltipProvider delayDuration={50}>
                            <div className={`flex items-center gap-1.5 mt-2 flex-wrap ${contentAlign === "center" ? "justify-center" : ""}`}>
                              {user.badges.map((badgeName: string) => {
                                const meta = getBadgeMeta(badgeName);
                                const icon = meta?.icon || getBadgeIcon(badgeName);
                                const displayName = badgeName.startsWith("custom:") ? badgeName.replace("custom:", "") : badgeName;
                                const isImg = icon?.startsWith("http") || icon?.startsWith("/objects/") || icon?.includes("/objects/");
                                const badgeColor = (matchBadgesToTheme ? themeColor : meta?.color) || "#F97316";

                                // Parse theme color to HSL for filter generation
                                const hexToHSL = (hex: string) => {
                                  const r = parseInt(hex.slice(1,3),16)/255;
                                  const g = parseInt(hex.slice(3,5),16)/255;
                                  const b = parseInt(hex.slice(5,7),16)/255;
                                  const max = Math.max(r,g,b), min = Math.min(r,g,b), d = max-min;
                                  const l = (max+min)/2;
                                  const s = d===0 ? 0 : d/(1-Math.abs(2*l-1));
                                  let h = 0;
                                  if (d!==0) {
                                    if (max===r) h=((g-b)/d)%6;
                                    else if (max===g) h=(b-r)/d+2;
                                    else h=(r-g)/d+4;
                                    h=h*60; if(h<0) h+=360;
                                  }
                                  return { h: Math.round(h), s, l };
                                };
                                const { h: themeH, s: themeS, l: themeL } = hexToHSL(themeColor);
                                const isLightTheme = themeL > 0.78;
                                const glowColor = isLightTheme ? "#aaaaaa" : themeColor;
                                const glowDrop = badgesGlow
                                  ? `drop-shadow(0 0 5px ${glowColor}dd) drop-shadow(0 0 10px ${glowColor}88)`
                                  : "";
                                const buildThemeFilter = () => {
                                  if (themeS < 0.08) {
                                    const bri = Math.max(0.25, themeL * 2.5);
                                    return `grayscale(1) brightness(${bri.toFixed(2)})`;
                                  }
                                  const hueRot = themeH - 30;
                                  const sat = Math.min(8, themeS * 6);
                                  const bri = Math.max(0.4, themeL * 1.9);
                                  return `grayscale(1) sepia(1) hue-rotate(${hueRot}deg) saturate(${sat.toFixed(1)}) brightness(${bri.toFixed(2)})`;
                                };
                                const themeFilter = buildThemeFilter();
                                let iconFilter = "";
                                if (matchBadgesToTheme && badgesGlow) iconFilter = `${themeFilter} ${glowDrop}`.trim();
                                else if (matchBadgesToTheme) iconFilter = themeFilter;
                                else if (badgesGlow) iconFilter = glowDrop;

                                const glowFilter = badgesGlow
                                  ? `drop-shadow(0 0 6px ${glowColor}ee) drop-shadow(0 0 12px ${glowColor}88) drop-shadow(0 0 18px ${glowColor}44)`
                                  : "";
                                const finalFilter = [matchBadgesToTheme ? themeFilter : "", glowFilter].filter(Boolean).join(" ").trim();

                                return (
                                  <Tooltip key={badgeName}>
                                    <TooltipTrigger asChild>
                                      <motion.div
                                        whileHover={{ scale: 1.15, y: -2 }}
                                        whileTap={{ scale: 0.92 }}
                                        className="cursor-default select-none flex items-center justify-center shrink-0"
                                        style={{ width: 34, height: 34 }}
                                      >
                                        {isImg
                                          ? <img src={res(icon)} alt={displayName} className="w-6 h-6 object-contain" style={finalFilter ? { filter: finalFilter } : undefined} />
                                          : <span className="text-2xl leading-none" style={finalFilter ? { filter: finalFilter } : undefined}>{icon}</span>
                                        }
                                      </motion.div>
                                    </TooltipTrigger>
                                    <TooltipContent
                                      className="border text-[10px] font-bold px-2.5 py-1 rounded-lg"
                                      style={{ backgroundColor: "#111", borderColor: badgeColor + "40", color: badgeColor }}
                                    >
                                      {displayName}
                                    </TooltipContent>
                                  </Tooltip>
                                );
                              })}
                            </div>
                          </TooltipProvider>
                        )}
                  </div>
                </div>


                {/* Bio */}
                {profile.bio && (
                  <div className={`mb-4 text-sm leading-relaxed ${textAlignClass}`} style={secondaryTextStyle}>
                    <VoidMark text={profile.bio} themeColor={themeColor} />
                  </div>
                )}

                {/* Status bubble */}
                {(statusMsg || statusEmoji) && (
                  <div className={`flex mb-2 ${contentAlign === "center" ? "justify-center" : ""}`}>
                    <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/8 text-[11px] font-semibold" style={{ color: secondaryText }}>
                      {statusEmoji && <span className="text-sm">{statusEmoji}</span>}
                      {statusMsg}
                    </span>
                  </div>
                )}


                {/* Meta chips — shown inline when NOT top-right (top-right is rendered over banner above) */}
                {metaInfoPos !== "top-right" && (
                  <div className={`flex flex-wrap gap-2 mb-3 text-[10px] font-bold uppercase tracking-widest ${metaInfoPos === "center" || contentAlign === "center" ? "justify-center" : ""}`}>
                    {profile.location && (
                      <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/5 border border-white/5" style={{ color: secondaryText }}>
                        <MapPin className="w-3 h-3" style={{ color: themeColor }} />{profile.location}
                      </span>
                    )}
                    {pronouns && (
                      <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/5 border border-white/5" style={{ color: secondaryText }}>
                        <UserIcon className="w-3 h-3" style={{ color: themeColor }} />{pronouns}
                      </span>
                    )}
                    {profile.showJoinDate && (
                      <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/5 border border-white/5" style={{ color: secondaryText }}>
                        <Calendar className="w-3 h-3" style={{ color: themeColor }} />{new Date(user.joinDate).toLocaleDateString()}
                      </span>
                    )}
                    {profile.showUid && (
                      <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/5 border border-white/5" style={{ color: secondaryText }}>
                        <Hash className="w-3 h-3" style={{ color: themeColor }} />UID {user.id}
                      </span>
                    )}
                    {profile.showViews && (
                      <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/5 border border-white/5" style={{ color: secondaryText }}>
                        <Eye className="w-3 h-3" style={{ color: themeColor }} />{user.views} views
                      </span>
                    )}
                  </div>
                )}

                {/* Tags — default position (below bio/status) */}
                {tags.length > 0 && (tagsPosition === "default") && (
                  <div className={`flex flex-wrap gap-1.5 mb-5 ${contentAlign === "center" ? "justify-center" : ""}`}>
                    {tags.map((tag: string) => (
                      <span key={tag}
                        className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border"
                        style={{ color: themeColor, borderColor: themeColor + "44", backgroundColor: themeColor + "12" }}>
                        <Tag className="w-2.5 h-2.5" />{tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Icon links row */}
                {iconLinks.length > 0 && (
                  <TooltipProvider>
                    <div className={`flex flex-wrap gap-2 mb-4 ${contentAlign === "center" ? "justify-center" : ""}`}>
                      {iconLinks.sort((a: any, b: any) => (a.position || 0) - (b.position || 0)).map((link: any) => (
                        <LinkIcon key={link.id} link={link} themeColor={themeColor} matchToTheme={matchLinksToTheme} themeColorIcons={themeColorIcons} />
                      ))}
                    </div>
                  </TooltipProvider>
                )}

                {/* Tags — above-links position */}
                {tags.length > 0 && tagsPosition === "above-links" && (
                  <div className={`flex flex-wrap gap-1.5 mb-3 ${contentAlign === "center" ? "justify-center" : ""}`}>
                    {tags.map((tag: string) => (
                      <span key={tag}
                        className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border"
                        style={{ color: themeColor, borderColor: themeColor + "44", backgroundColor: themeColor + "12" }}>
                        <Tag className="w-2.5 h-2.5" />{tag}
                      </span>
                    ))}
                  </div>
                )}


                {/* Stacked links */}
                {linksLayout !== "split" && (
                  <div className="space-y-2">
                    {regularLinks.sort((a: any, b: any) => (a.position || 0) - (b.position || 0)).map((link: any) => (
                      link.platform === "discord-embed"
                        ? <DiscordEmbedCard key={link.id} link={link} themeColor={themeColor} />
                        : <TiltBox key={link.id} enabled={boxTilt} intensity={boxTiltIntensity * 0.5}>
                            {link.style === "card"
                              ? <LinkCard link={link} themeColor={themeColor} primaryText={primaryText} secondaryText={secondaryText} matchToTheme={matchLinksToTheme} linksGlow={linksGlow} themeColorIcons={themeColorIcons} />
                              : <LinkDefault link={link} themeColor={themeColor} primaryText={primaryText} secondaryText={secondaryText} matchToTheme={matchLinksToTheme} linksGlow={linksGlow} themeColorIcons={themeColorIcons} />
                            }
                          </TiltBox>
                    ))}
                  </div>
                )}

                {/* 2-column split layout — inside card, same 3D tilt */}
                {linksLayout === "split" && regularLinks.length > 0 && (() => {
                  const sorted = [...regularLinks].sort((a: any, b: any) => (a.position || 0) - (b.position || 0));
                  const nonDiscordCount = sorted.filter((l: any) => l.platform !== "discord-embed").length;
                  const lastIsAlone = nonDiscordCount % 2 === 1;
                  let nonDiscordIdx = 0;
                  return (
                    <div className="mt-3 grid grid-cols-2 gap-2 items-stretch">
                      {sorted.map((link: any) => {
                        if (link.platform === "discord-embed") {
                          return <div key={link.id} className="col-span-2"><DiscordEmbedCard link={link} themeColor={themeColor} large /></div>;
                        }
                        const myIdx = nonDiscordIdx++;
                        const spanFull = lastIsAlone && myIdx === nonDiscordCount - 1;
                        return (
                          <TiltBox key={link.id} enabled={boxTilt} intensity={boxTiltIntensity} className={`flex${spanFull ? " col-span-2" : ""}`} style={{ perspective: "800px" }}>
                            <div className="flex-1">
                              {link.style === "card"
                                ? <LinkCard link={link} themeColor={themeColor} primaryText={primaryText} secondaryText={secondaryText} matchToTheme={matchLinksToTheme} linksGlow={linksGlow} themeColorIcons={themeColorIcons} />
                                : <LinkDefault link={link} themeColor={themeColor} primaryText={primaryText} secondaryText={secondaryText} matchToTheme={matchLinksToTheme} linksGlow={linksGlow} themeColorIcons={themeColorIcons} />
                              }
                            </div>
                          </TiltBox>
                        );
                      })}
                    </div>
                  );
                })()}


              </div>
            </TiltBox>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fixed watermark — bottom-right corner, only if not premium or premium with showWatermark=true */}
      {profile.showWatermark && (
        <a
          href="/"
          className="fixed bottom-4 right-4 z-50 text-[9px] font-black uppercase tracking-[0.25em] opacity-30 hover:opacity-70 transition-opacity select-none"
          style={{ color: "#fff", textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}
        >
          Hexed
        </a>
      )}
    </div>
  );
}
