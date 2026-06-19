import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Loader2, X, ExternalLink, Crown, Link2, Tag, Trophy,
  Wind, Sparkles, Minus, RotateCw, ChevronLeft, BarChart3,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";

const DISCORD_INVITE = "https://discord.gg/9nZUZRcqyT";

const PRIZES = [
  { id: "premium",      label: "Free Premium",  icon: Crown,    color: "#7c3aed", shortLabel: "Premium"  },
  { id: "alias",        label: "+1 Alias",       icon: Link2,    color: "#ea580c", shortLabel: "+1 Alias" },
  { id: "tag",          label: "+1 Tag",          icon: Tag,      color: "#16a34a", shortLabel: "+1 Tag"   },
  { id: "winner_badge", label: "Winner Badge",   icon: Trophy,   color: "#ca8a04", shortLabel: "Winner"   },
  { id: "nothing",      label: "Nothing",         icon: Wind,     color: "#374151", shortLabel: "Nothing"  },
  { id: "custom_badge", label: "Custom Badge",   icon: Sparkles, color: "#be185d", shortLabel: "Custom"   },
  { id: "nothing2",     label: "Nothing",         icon: Minus,    color: "#1f2937", shortLabel: "Nothing"  },
];

const ODDS = [
  { label: "+1 Alias",      pct: "20%", icon: Link2    },
  { label: "+1 Tag",         pct: "20%", icon: Tag      },
  { label: "Nothing",        pct: "25%", icon: Wind     },
  { label: "Nothing",        pct: "20%", icon: Minus    },
  { label: "Free Premium",  pct: "8%",  icon: Crown    },
  { label: "Custom Badge",  pct: "4%",  icon: Sparkles },
  { label: "Winner Badge",  pct: "3%",  icon: Trophy   },
];

const N = PRIZES.length;
const SLICE_DEG = 360 / N;

// ─── Inline SVG icons for wheel slices (can't use React components inside SVG) ─

function SliceIcon({ id, cx, cy }: { id: string; cx: number; cy: number }) {
  const s = "white";
  switch (id) {
    case "premium": // Crown
      return (
        <g transform={`translate(${cx},${cy})`}>
          <rect x="-7" y="2" width="14" height="4" rx="1.5" fill={s} opacity="0.95" />
          <polygon points="0,-9 -3.5,2 3.5,2" fill={s} opacity="0.95" />
          <polygon points="-6.5,-5 -9,2 -4,2" fill={s} opacity="0.9" />
          <polygon points="6.5,-5 9,2 4,2" fill={s} opacity="0.9" />
        </g>
      );
    case "alias": // Chain link
      return (
        <g transform={`translate(${cx},${cy})`}>
          <rect x="-9" y="-5" width="8" height="5" rx="2.5" fill="none" stroke={s} strokeWidth="2" />
          <rect x="1" y="0" width="8" height="5" rx="2.5" fill="none" stroke={s} strokeWidth="2" />
          <line x1="-2" y1="-2.5" x2="2" y2="2.5" stroke={s} strokeWidth="2" />
        </g>
      );
    case "tag": // Tag shape
      return (
        <g transform={`translate(${cx},${cy})`}>
          <path d="M-2,-8 L6,-8 A2,2 0 0 1 8,-6 L8,3 L0,8 L-8,3 L-8,-6 A2,2 0 0 1 -6,-8 Z" fill={s} opacity="0.9" />
          <circle cx="-3" cy="-4" r="1.5" fill={PRIZES[2].color} />
        </g>
      );
    case "winner_badge": // Trophy
      return (
        <g transform={`translate(${cx},${cy})`}>
          <path d="M-5,-8 C-5,3 5,3 5,-8 Z" fill={s} opacity="0.95" />
          <rect x="-1.5" y="3" width="3" height="3" fill={s} />
          <rect x="-5" y="6" width="10" height="2.5" rx="1" fill={s} opacity="0.95" />
          <path d="-8,-6 C-12,-6 -12,0 -8,0" fill="none" stroke={s} strokeWidth="2" />
          <path d="M5,-6 C9,-6 9,0 5,0" fill="none" stroke={s} strokeWidth="2" />
        </g>
      );
    case "nothing": // Wind lines
      return (
        <g transform={`translate(${cx},${cy})`}>
          <line x1="-7" y1="-4" x2="6" y2="-4" stroke={s} strokeWidth="2" strokeLinecap="round" />
          <line x1="-7" y1="0" x2="7" y2="0" stroke={s} strokeWidth="2" strokeLinecap="round" />
          <line x1="-7" y1="4" x2="4" y2="4" stroke={s} strokeWidth="2" strokeLinecap="round" />
        </g>
      );
    case "custom_badge": // Star
      return (
        <g transform={`translate(${cx},${cy})`}>
          <polygon points="0,-9 2.5,-3.5 8,-3.5 3.5,0.5 5.5,6.5 0,3 -5.5,6.5 -3.5,0.5 -8,-3.5 -2.5,-3.5" fill={s} opacity="0.95" />
        </g>
      );
    case "nothing2": // Dash
      return (
        <g transform={`translate(${cx},${cy})`}>
          <line x1="-7" y1="0" x2="7" y2="0" stroke={s} strokeWidth="3" strokeLinecap="round" />
          <line x1="-4" y1="-4" x2="4" y2="4" stroke={s} strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
          <line x1="4" y1="-4" x2="-4" y2="4" stroke={s} strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
        </g>
      );
    default:
      return null;
  }
}

function WheelSVG({ rotation, spinning }: { rotation: number; spinning: boolean }) {
  const cx = 160, cy = 160, r = 148;
  const iconR = r * 0.82;
  const textR = r * 0.62;

  return (
    <svg
      width="320"
      height="320"
      style={{
        transform: `rotate(${rotation}deg)`,
        transition: spinning
          ? "transform 5s cubic-bezier(0.17, 0.67, 0.12, 0.99)"
          : "none",
        filter: "drop-shadow(0 0 28px rgba(0,0,0,0.7))",
        willChange: "transform",
      }}
    >
      <defs>
        <filter id="wheel-shadow">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="rgba(0,0,0,0.5)" />
        </filter>
      </defs>

      {/* Outer ring */}
      <circle cx={cx} cy={cy} r={r + 3} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4" />

      {PRIZES.map((prize, i) => {
        const startRad = (-Math.PI / 2) + i * (2 * Math.PI / N);
        const endRad = startRad + (2 * Math.PI / N);
        const x1 = cx + r * Math.cos(startRad);
        const y1 = cy + r * Math.sin(startRad);
        const x2 = cx + r * Math.cos(endRad);
        const y2 = cy + r * Math.sin(endRad);
        const centerDeg = (i + 0.5) * SLICE_DEG;
        const angleRad = (-Math.PI / 2) + (i + 0.5) * (2 * Math.PI / N);
        const iconX = cx + iconR * Math.cos(angleRad);
        const iconY = cy + iconR * Math.sin(angleRad);

        return (
          <g key={i}>
            <path
              d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2} Z`}
              fill={prize.color}
              stroke="rgba(0,0,0,0.4)"
              strokeWidth="1.5"
            />

            {/* Icon at absolute position, rotated to face outward */}
            <g transform={`translate(${iconX}, ${iconY}) rotate(${centerDeg})`}>
              <SliceIcon id={prize.id} cx={0} cy={0} />
            </g>

            {/* Label text */}
            <g transform={`rotate(${centerDeg}, ${cx}, ${cy})`}>
              <text
                x={cx}
                y={cy - textR}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="7.5"
                fill="rgba(255,255,255,0.92)"
                fontWeight="bold"
                letterSpacing="0.4"
              >
                {prize.shortLabel}
              </text>
            </g>
          </g>
        );
      })}

      {/* Divider lines */}
      {PRIZES.map((_, i) => {
        const angle = (-Math.PI / 2) + i * (2 * Math.PI / N);
        return (
          <line
            key={`line-${i}`}
            x1={cx}
            y1={cy}
            x2={cx + r * Math.cos(angle)}
            y2={cy + r * Math.sin(angle)}
            stroke="rgba(0,0,0,0.35)"
            strokeWidth="1.5"
          />
        );
      })}

      {/* Center hub */}
      <circle cx={cx} cy={cy} r={20} fill="#111" stroke="rgba(255,255,255,0.12)" strokeWidth="2" />
      <circle cx={cx} cy={cy} r={11} fill="#1a1a1a" />
      <circle cx={cx} cy={cy} r={5} fill="rgba(255,255,255,0.15)" />
    </svg>
  );
}

function OddsModal({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.25 }}
        className="bg-[#0e0e0e] border border-white/10 rounded-2xl p-6 max-w-sm w-full"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <BarChart3 className="w-4 h-4 text-orange-400" />
            <h2 className="text-lg font-black">Prize Odds</h2>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-1">
          {ODDS.map((o, i) => {
            const IconComp = o.icon;
            return (
              <div key={i} className="flex items-center justify-between py-2.5 border-b border-white/[0.05] last:border-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-white/5">
                    <IconComp className="w-3.5 h-3.5 text-gray-300" />
                  </div>
                  <span className="text-sm font-semibold text-gray-300">{o.label}</span>
                </div>
                <span className="text-sm font-black text-orange-400">{o.pct}</span>
              </div>
            );
          })}
        </div>
        <p className="text-[10px] text-gray-600 mt-4 text-center">Results are generated server-side.</p>
      </motion.div>
    </motion.div>
  );
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return "00:00:00";
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function WheelSpinPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [showOdds, setShowOdds] = useState(false);
  const [countdown, setCountdown] = useState("");
  const [welcomed, setWelcomed] = useState(false);
  const intervalRef = useRef<any>(null);

  const { data: status, refetch: refetchStatus } = useQuery<any>({
    queryKey: ["/api/wheelspin/status"],
    enabled: !!user,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (user && !welcomed) setWelcomed(true);
  }, [user]);

  useEffect(() => {
    if (!status?.nextSpinAt) {
      setCountdown("");
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    const target = new Date(status.nextSpinAt).getTime();
    const tick = () => {
      const diff = target - Date.now();
      if (diff <= 0) {
        setCountdown("");
        clearInterval(intervalRef.current);
        refetchStatus();
        return;
      }
      setCountdown(formatCountdown(diff));
    };
    tick();
    intervalRef.current = setInterval(tick, 1000);
    return () => clearInterval(intervalRef.current);
  }, [status?.nextSpinAt]);

  const spinMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/wheelspin/spin"),
    onSuccess: (data: any) => {
      const prizeIndex = data.prizeIndex;
      setRotation(prev => {
        const targetAngle = ((360 - (prizeIndex + 0.5) * SLICE_DEG) % 360 + 360) % 360;
        const prevAngle = prev % 360;
        const needed = ((targetAngle - prevAngle) % 360 + 360) % 360;
        return prev + 5 * 360 + (needed === 0 ? 360 : needed);
      });
      setSpinning(true);
      setTimeout(() => {
        setSpinning(false);
        setResult(data);
        refetchStatus();
        queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      }, 5200);
    },
    onError: () => {
      toast({ title: "Could not spin. Please try again.", variant: "destructive" });
    },
  });

  const handleSpin = () => {
    if (spinning || spinMutation.isPending) return;
    setResult(null);
    spinMutation.mutate();
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center gap-5">
        <div className="text-[28px] font-bold tracking-tight">
          hex<span className="text-orange-500">ed</span>
        </div>
        <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
        <p className="text-gray-500 text-sm font-semibold">Logging in...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center gap-6 px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
          <div className="w-16 h-16 rounded-full bg-orange-500/10 border border-orange-500/20 flex items-center justify-center mx-auto mb-6">
            <RotateCw className="w-8 h-8 text-orange-400" />
          </div>
          <h1 className="text-3xl font-black mb-2">Wheel Spin</h1>
          <p className="text-gray-500 text-sm mb-8">You need to log in to spin the wheel.</p>
          <Link href="/login">
            <button className="px-8 py-3 bg-orange-500 hover:bg-orange-400 text-black font-black rounded-2xl transition-all text-sm">
              Log In to Spin
            </button>
          </Link>
          <div className="mt-4">
            <Link href="/">
              <button className="text-xs text-gray-600 hover:text-gray-400 transition-colors font-semibold flex items-center gap-1 mx-auto">
                <ChevronLeft className="w-3 h-3" /> Back to Home
              </button>
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  const canSpin = status?.canSpin !== false && !spinning && !spinMutation.isPending;
  const resultPrize = result ? PRIZES[result.prizeIndex] : null;
  const ResultIcon = resultPrize?.icon;

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <div className="max-w-2xl mx-auto px-4 py-12 flex flex-col items-center gap-8">

        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <p className="text-[10px] font-black uppercase tracking-widest text-orange-500/70 mb-2">hexed / wheelspin</p>
          <h1 className="text-4xl font-black mb-1">Wheel Spin</h1>
          <AnimatePresence>
            {welcomed && (
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-gray-400 text-sm font-semibold mt-1"
              >
                Welcome back, <span className="text-orange-400 font-black">{user.username}</span>
              </motion.p>
            )}
          </AnimatePresence>
          <p className="text-gray-600 text-xs mt-2">Spin once every 2 days for a chance to win prizes.</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="relative flex flex-col items-center"
        >
          {/* Pointer */}
          <div
            className="absolute -top-3 left-1/2 -translate-x-1/2 z-10"
            style={{
              width: 0, height: 0,
              borderLeft: "14px solid transparent",
              borderRight: "14px solid transparent",
              borderTop: "26px solid white",
              filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.9))",
            }}
          />
          {/* Glow ring when spinning */}
          <AnimatePresence>
            {spinning && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 rounded-full pointer-events-none"
                style={{ boxShadow: "0 0 60px 20px rgba(249,115,22,0.25)", borderRadius: "50%" }}
              />
            )}
          </AnimatePresence>
          <div
            className="rounded-full overflow-hidden"
            style={{ boxShadow: "0 0 48px rgba(249,115,22,0.15), 0 0 80px rgba(0,0,0,0.8)" }}
          >
            <WheelSVG rotation={rotation} spinning={spinning} />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex flex-col items-center gap-4 w-full max-w-xs"
        >
          {canSpin ? (
            <button
              onClick={handleSpin}
              disabled={spinning || spinMutation.isPending}
              data-testid="button-spin"
              className="w-full py-4 bg-orange-500 hover:bg-orange-400 text-black font-black rounded-2xl transition-all text-lg shadow-lg shadow-orange-500/20 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2.5"
            >
              {spinMutation.isPending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Spinning...</span>
                </>
              ) : spinning ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Spinning...</span>
                </>
              ) : (
                <>
                  <RotateCw className="w-5 h-5" />
                  <span>Spin the Wheel</span>
                </>
              )}
            </button>
          ) : (
            <div className="w-full text-center">
              <div className="bg-[#0e0e0e] border border-white/[0.06] rounded-2xl px-6 py-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">Next spin in</p>
                <p className="text-3xl font-black text-orange-400 font-mono">{countdown || "Loading..."}</p>
              </div>
              <button
                disabled
                className="w-full mt-3 py-4 bg-white/5 text-gray-600 font-black rounded-2xl text-sm cursor-not-allowed border border-white/[0.05] flex items-center justify-center gap-2"
              >
                <Minus className="w-4 h-4" />
                Already Spun
              </button>
            </div>
          )}

          <button
            onClick={() => setShowOdds(true)}
            className="text-xs font-bold text-gray-500 hover:text-gray-300 transition-colors flex items-center gap-1.5 underline underline-offset-4"
          >
            <BarChart3 className="w-3 h-3" />
            Show odds
          </button>
        </motion.div>

        <AnimatePresence>
          {result && resultPrize && (
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.4 }}
              className="w-full max-w-sm"
            >
              <div
                className="rounded-2xl border p-6 text-center"
                style={{
                  background: "rgba(14,14,14,0.98)",
                  borderColor: resultPrize.color + "55",
                  boxShadow: `0 0 40px 0 ${resultPrize.color}25`,
                }}
              >
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                  style={{ background: resultPrize.color + "22", border: `1px solid ${resultPrize.color}44` }}
                >
                  {ResultIcon && <ResultIcon className="w-8 h-8" style={{ color: resultPrize.color }} />}
                </div>
                <p className="text-xl font-black mb-2">{result.prizeLabel}</p>
                <p className="text-sm text-gray-300 leading-relaxed">{result.message}</p>

                {(result.prizeType === "premium" || result.prizeType === "custom_badge") && (
                  <a
                    href={DISCORD_INVITE}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 bg-[#5865F2] hover:bg-[#4f5ce0] text-white font-bold rounded-xl transition-all text-sm"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Open Discord
                  </a>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="text-center">
          <Link href="/">
            <button className="text-xs font-semibold text-gray-600 hover:text-orange-500 transition-colors uppercase tracking-widest flex items-center gap-1.5">
              <ChevronLeft className="w-3 h-3" /> Back to Home
            </button>
          </Link>
        </div>
      </div>

      <AnimatePresence>
        {showOdds && <OddsModal onClose={() => setShowOdds(false)} />}
      </AnimatePresence>
    </div>
  );
}
