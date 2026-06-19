import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Loader2, Flower, Egg, Sparkles, ExternalLink, ArrowLeft, Star, Award, Trophy } from "lucide-react";

const DISCORD_INVITE = "https://discord.gg/9nZUZRcqyT";
const DISCORD_CHANNEL = "easter-bios";

function EasterPetal({ style }: { style: React.CSSProperties }) {
  return (
    <div
      className="absolute pointer-events-none"
      style={style}
    >
      <svg width="18" height="22" viewBox="0 0 18 22" fill="none">
        <ellipse cx="9" cy="11" rx="7" ry="10" fill="currentColor" opacity="0.18" transform="rotate(-20 9 11)" />
      </svg>
    </div>
  );
}

function FloatingOrb({ x, y, size, color, delay }: { x: string; y: string; size: number; color: string; delay: number }) {
  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={{ left: x, top: y, width: size, height: size, background: color, filter: "blur(60px)", opacity: 0.18 }}
      animate={{ y: [0, -18, 0], opacity: [0.14, 0.22, 0.14] }}
      transition={{ duration: 5 + delay, repeat: Infinity, ease: "easeInOut", delay }}
    />
  );
}

export default function EasterPage() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-5" style={{ background: "#0c0812" }}>
        <div className="text-[28px] font-bold tracking-tight text-white" style={{ fontFamily: "'Geist', 'Inter', sans-serif", letterSpacing: "-0.5px" }}>
          hex<span style={{ color: "#c084fc" }}>ed</span>
        </div>
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: "#c084fc" }} />
        <p className="text-sm font-semibold" style={{ color: "#6b7280" }}>Logging in...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden" style={{ background: "#0c0812" }}>
        <FloatingOrb x="10%" y="20%" size={320} color="#7c3aed" delay={0} />
        <FloatingOrb x="70%" y="60%" size={260} color="#db2777" delay={1.5} />
        <FloatingOrb x="50%" y="10%" size={200} color="#059669" delay={2.5} />

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="text-center z-10 max-w-md"
        >
          <div className="flex items-center justify-center gap-3 mb-6">
            <Egg className="w-10 h-10" style={{ color: "#c084fc" }} />
            <Flower className="w-8 h-8" style={{ color: "#f9a8d4" }} />
          </div>
          <h1 className="text-3xl font-black mb-3 text-white">Easter Event 2026</h1>
          <p className="text-sm mb-8 leading-relaxed" style={{ color: "#9ca3af" }}>
            You need to be logged in to access the Easter Event.
          </p>
          <Link href="/login">
            <button
              className="px-8 py-3 font-black rounded-2xl text-sm transition-all text-white"
              style={{ background: "#7c3aed" }}
              data-testid="button-login-easter"
            >
              Log In to Join
            </button>
          </Link>
          <div className="mt-4">
            <Link href="/">
              <button className="text-xs font-semibold transition-colors flex items-center gap-1.5 mx-auto" style={{ color: "#6b7280" }} data-testid="link-back-home-easter">
                <ArrowLeft className="w-3 h-3" /> Back to Home
              </button>
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: "#0c0812" }}>
      {/* Ambient orbs */}
      <FloatingOrb x="5%" y="15%" size={400} color="#7c3aed" delay={0} />
      <FloatingOrb x="65%" y="55%" size={340} color="#db2777" delay={1.8} />
      <FloatingOrb x="40%" y="5%" size={260} color="#059669" delay={3} />
      <FloatingOrb x="80%" y="20%" size={200} color="#c084fc" delay={0.8} />
      <FloatingOrb x="20%" y="75%" size={220} color="#f472b6" delay={2.2} />

      {/* Decorative petal scatter */}
      {[
        { top: "8%", left: "12%", color: "#c084fc", rotate: "15deg" },
        { top: "18%", right: "10%", color: "#f9a8d4", rotate: "-25deg" },
        { top: "55%", left: "5%", color: "#86efac", rotate: "35deg" },
        { top: "75%", right: "15%", color: "#c084fc", rotate: "-10deg" },
        { top: "40%", right: "5%", color: "#f9a8d4", rotate: "50deg" },
      ].map((p, i) => (
        <EasterPetal
          key={i}
          style={{ top: p.top, left: (p as any).left, right: (p as any).right, color: p.color, transform: `rotate(${p.rotate})`, width: 40, height: 50 }}
        />
      ))}

      <div className="relative z-10 max-w-2xl mx-auto px-4 py-16 flex flex-col items-center gap-12">

        {/* Header breadcrumb */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="text-[10px] font-black uppercase tracking-widest"
          style={{ color: "rgba(192,132,252,0.6)" }}
        >
          hexed / easter 2026
        </motion.p>

        {/* Hero icon cluster */}
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col items-center gap-5"
        >
          <div className="relative flex items-center justify-center w-28 h-28 rounded-full" style={{ background: "rgba(124,58,237,0.12)", border: "1px solid rgba(192,132,252,0.2)" }}>
            <motion.div
              animate={{ rotate: [0, 8, -8, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            >
              <Egg className="w-14 h-14" style={{ color: "#c084fc" }} />
            </motion.div>
            <motion.div
              className="absolute -top-2 -right-2"
              animate={{ scale: [1, 1.18, 1], rotate: [0, 15, 0] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
            >
              <Flower className="w-7 h-7" style={{ color: "#f9a8d4" }} />
            </motion.div>
            <motion.div
              className="absolute -bottom-1 -left-2"
              animate={{ scale: [1, 1.12, 1] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            >
              <Sparkles className="w-5 h-5" style={{ color: "#86efac" }} />
            </motion.div>
          </div>

          {/* Main title */}
          <div className="text-center">
            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="text-5xl font-black leading-tight mb-3 text-white"
              style={{ letterSpacing: "-1px" }}
            >
              Welcome to the<br />
              <span style={{ color: "#c084fc" }}>Easter Event 2026</span><br />
              of Hexed
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="text-base leading-relaxed"
              style={{ color: "#9ca3af" }}
            >
              A special seasonal event — only the top 5 earn the badge.
            </motion.p>
          </div>
        </motion.div>

        {/* Badge prize card */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="w-full rounded-3xl p-8"
          style={{ background: "rgba(124,58,237,0.08)", border: "1px solid rgba(192,132,252,0.18)" }}
        >
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(192,132,252,0.12)" }}>
              <Award className="w-5 h-5" style={{ color: "#c084fc" }} />
            </div>
            <div>
              <p className="font-black text-white text-lg">Easter 2026 Badge</p>
              <p className="text-xs" style={{ color: "#6b7280" }}>Exclusive limited event reward</p>
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-sm leading-relaxed" style={{ color: "#d1d5db" }}>
              To gain the <span className="font-black text-white">Easter 2026 Badge</span>, you need to send your
              Hexed profile to the{" "}
              <span className="font-black px-1.5 py-0.5 rounded-lg text-xs" style={{ background: "rgba(192,132,252,0.15)", color: "#c084fc" }}>
                # {DISCORD_CHANNEL}
              </span>{" "}
              channel inside our Discord server.
            </p>
            <p className="text-sm leading-relaxed" style={{ color: "#d1d5db" }}>
              If you make it into the{" "}
              <span className="font-black text-white">Top 5</span>{" "}
              of submitted profiles, you will receive the exclusive Easter 2026 Badge on your profile.
            </p>
          </div>
        </motion.div>

        {/* Steps */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="w-full space-y-3"
        >
          <p className="text-[11px] font-black uppercase tracking-widest mb-4" style={{ color: "rgba(192,132,252,0.5)" }}>How to participate</p>
          {[
            { icon: Star, text: "Set up your Hexed profile and make it look great", color: "#c084fc" },
            { icon: ExternalLink, text: `Join the Hexed Discord server and find #${DISCORD_CHANNEL}`, color: "#f9a8d4" },
            { icon: Flower, text: "Post your profile link in the channel", color: "#86efac" },
            { icon: Trophy, text: "If you land in the Top 5, you get the Easter 2026 Badge", color: "#fbbf24" },
          ].map((step, i) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.55 + i * 0.08 }}
                className="flex items-center gap-4 rounded-2xl px-5 py-4"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${step.color}18` }}>
                  <Icon className="w-4 h-4" style={{ color: step.color }} />
                </div>
                <p className="text-sm font-semibold text-white">{step.text}</p>
              </motion.div>
            );
          })}
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.75 }}
          className="flex flex-col items-center gap-3"
        >
          <a
            href={DISCORD_INVITE}
            target="_blank"
            rel="noreferrer"
            data-testid="link-discord-easter"
            className="inline-flex items-center gap-2.5 px-8 py-3.5 rounded-2xl font-black text-sm transition-all text-white"
            style={{ background: "#7c3aed" }}
          >
            <ExternalLink className="w-4 h-4" />
            Join the Discord
          </a>
          <Link href="/">
            <button className="text-xs font-semibold transition-colors flex items-center gap-1.5" style={{ color: "#6b7280" }} data-testid="link-back-home">
              <ArrowLeft className="w-3 h-3" /> Back to Home
            </button>
          </Link>
        </motion.div>

        {/* Footer note */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="text-[11px] text-center leading-relaxed"
          style={{ color: "#374151" }}
        >
          This is a limited seasonal event. Submissions are reviewed by the Hexed team.<br />
          Results will be announced inside the Discord server.
        </motion.p>
      </div>
    </div>
  );
}
