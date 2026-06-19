import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import { CheckCircle2, Loader2, ExternalLink, Trophy, Palette, Upload } from "lucide-react";

export default function EasterEventPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);

  const { data: status, isLoading } = useQuery<{ enabled: boolean; submitted: boolean }>({
    queryKey: ["/api/easter-event/status"],
  });

  const submitMut = useMutation({
    mutationFn: () => apiRequest("POST", "/api/easter-event/submit"),
    onSuccess: () => {
      setSubmitted(true);
      queryClient.invalidateQueries({ queryKey: ["/api/easter-event/status"] });
      toast({ title: "Submitted!", description: "Your profile has been entered into the Easter Event 2026." });
    },
    onError: (e: any) => {
      toast({ title: e?.message || "Failed to submit", variant: "destructive" });
    },
  });

  const hasSubmitted = submitted || status?.submitted;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
      </div>
    );
  }

  if (!status?.enabled) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-sm"
        >
          <div className="text-5xl mb-5">🥚</div>
          <p className="text-[10px] font-black uppercase tracking-widest text-orange-500 mb-2">Easter Event 2026</p>
          <h1 className="text-2xl font-black text-white mb-3">Not Active</h1>
          <p className="text-sm text-gray-500 leading-relaxed">
            The Easter Event is not currently running. Check back soon.
          </p>
          <Link href="/">
            <button className="mt-6 px-5 py-2.5 rounded-xl bg-white/5 border border-white/[0.06] text-gray-400 text-xs font-black hover:bg-white/10 hover:text-white transition-all">
              ← Back to Home
            </button>
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505]">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] pointer-events-none"
        style={{ background: "radial-gradient(ellipse at center top, rgba(249,115,22,0.07) 0%, transparent 70%)" }} />

      <div className="relative z-10 max-w-xl mx-auto px-4 py-16">

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="mb-8 text-center">
            <Link href="/">
              <span className="text-xl font-bold tracking-tight text-white cursor-pointer">
                hex<span className="text-orange-500">ed</span>
              </span>
            </Link>
          </div>

          <div className="rounded-2xl border border-white/[0.06] bg-[#0a0a0a] overflow-hidden">

            <div className="px-6 pt-8 pb-6 border-b border-white/[0.06]">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-2xl shrink-0">
                  🐣
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-orange-500 mb-1">Limited Time</p>
                  <h1 className="text-2xl font-black text-white leading-tight">Easter Event 2026</h1>
                  <p className="text-sm text-gray-400 mt-1.5 leading-relaxed">
                    Submit your profile for a chance to be picked by the Manager as one of the{" "}
                    <span className="text-white font-bold">top 5 best-looking</span> Easter profiles.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-5">
              <div className="grid grid-cols-3 gap-3">
                {[
                  { icon: Palette, label: "Design", desc: "Give your profile an Easter theme" },
                  { icon: Upload, label: "Submit", desc: "One entry per user" },
                  { icon: Trophy, label: "Win", desc: "Top 5 get recognised" },
                ].map(({ icon: Icon, label, desc }) => (
                  <div key={label} className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.05] space-y-2">
                    <div className="w-7 h-7 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
                      <Icon className="w-3.5 h-3.5 text-orange-500" />
                    </div>
                    <div>
                      <p className="text-xs font-black text-white">{label}</p>
                      <p className="text-[10px] text-gray-600 leading-snug mt-0.5">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="rounded-xl bg-white/[0.02] border border-white/[0.05] p-4 space-y-2.5">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">How to enter</p>
                <div className="space-y-2">
                  {[
                    "Decorate your profile with an Easter theme — colours, bio, background",
                    "Press Submit Profile below — your bio link is automatically sent",
                    "One submission per account, so make it count",
                    "The Manager will announce the top 5 winners",
                  ].map((step, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <span className="w-4 h-4 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-500 text-[9px] font-black flex items-center justify-center shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <p className="text-xs text-gray-400 leading-snug">{step}</p>
                    </div>
                  ))}
                </div>
              </div>

              <AnimatePresence mode="wait">
                {!user ? (
                  <motion.div key="login" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <Link href="/login">
                      <button
                        data-testid="button-easter-login"
                        className="w-full py-3 rounded-xl bg-orange-500 hover:bg-orange-400 text-white text-sm font-black transition-all"
                      >
                        Log in to Submit
                      </button>
                    </Link>
                    <p className="text-center text-[11px] text-gray-600 mt-2">You need an account to participate</p>
                  </motion.div>
                ) : hasSubmitted ? (
                  <motion.div key="submitted" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}>
                    <div className="flex items-center gap-3 p-4 rounded-xl bg-orange-500/5 border border-orange-500/20">
                      <CheckCircle2 className="w-5 h-5 text-orange-500 shrink-0" />
                      <div>
                        <p className="text-sm font-black text-white">Profile Submitted</p>
                        <p className="text-[11px] text-gray-500 mt-0.5">You're in the running. Good luck!</p>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div key="submit" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
                    <div className="flex items-center gap-2.5 p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                      <div className="w-7 h-7 rounded-full bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-sm shrink-0">
                        {user.username[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-black text-white truncate">@{user.username}</p>
                        <p className="text-[10px] text-gray-600">/{user.username} will be submitted</p>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 text-gray-600 shrink-0" />
                    </div>
                    <button
                      onClick={() => submitMut.mutate()}
                      disabled={submitMut.isPending}
                      data-testid="button-easter-submit"
                      className="w-full py-3 rounded-xl bg-orange-500 hover:bg-orange-400 text-white text-sm font-black transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {submitMut.isPending ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Taking screenshot & submitting...</>
                      ) : "Submit Profile 🐣"}
                    </button>
                    <p className="text-center text-[10px] text-gray-600">One entry only — a screenshot of your profile will be sent. May take a few seconds.</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <p className="text-center text-[11px] text-gray-700 mt-6">
            Easter Event 2026 — <Link href="/"><span className="hover:text-gray-500 transition-colors cursor-pointer">hex<span className="text-orange-500">ed</span></span></Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
