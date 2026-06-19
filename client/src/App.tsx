import { Switch, Route, Redirect, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery, useMutation } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "./hooks/use-auth";
import { I18nProvider } from "./lib/i18n";
import ClickSpark from "@/components/ClickSpark";
import { Info, AlertTriangle, Check, X, Loader2 } from "lucide-react";
import { SiDiscord } from "react-icons/si";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef, ReactNode, lazy, Suspense } from "react";
import { apiRequest } from "./lib/queryClient";

const NotFound = lazy(() => import("./pages/not-found"));
const AuthPage = lazy(() => import("./pages/auth-page"));
const Dashboard = lazy(() => import("./pages/dashboard"));
const UserDashboard = lazy(() => import("./pages/user-dashboard"));
const PublicProfile = lazy(() => import("./pages/public-profile"));
const Landing = lazy(() => import("./pages/Landing"));
const Leaderboard = lazy(() => import("./pages/Leaderboard"));
const HelpPage = lazy(() => import("./pages/Help"));
const Shop = lazy(() => import("./pages/shop"));
const TOS = lazy(() => import("./pages/tos"));
const Templates = lazy(() => import("./pages/templates"));
const SecretPage = lazy(() => import("./pages/secret"));
const TeamPage = lazy(() => import("./pages/team"));
const FoundersPage = lazy(() => import("./pages/founders"));
const ChangesPage = lazy(() => import("./pages/changes"));
const WheelSpinPage = lazy(() => import("./pages/wheelspin"));
const EasterPage = lazy(() => import("./pages/easter"));
const EasterEventPage = lazy(() => import("./pages/easter-event"));
const StatusPage = lazy(() => import("./pages/status"));

const storedTheme = localStorage.getItem("hexed-theme");
if (storedTheme === "light") {
  document.documentElement.classList.add("light");
} else {
  document.documentElement.classList.remove("light");
}

const FUN_FACTS = [
  "Fun fact: Hexed was created by Byte & Mr Pain — before it was called Hexed, it was called Voidlink.",
  "Did you know? This whole platform took over 3 weeks to go from idea to live.",
  "Byte spent 2+ days straight getting the badge Databank to work. Pure stubbornness.",
  "The name 'Voidlink' didn't stick, so here we are. Hexed just felt right.",
  "Hexed started as a small side project between two friends. Now you're using it.",
];

function playDing() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(1046, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(784, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.09, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.55);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.6);
    ctx.close();
  } catch (_) {}
}

function FunFactToast() {
  const [location] = useLocation();
  const [visible, setVisible] = useState(false);
  const [factIdx, setFactIdx] = useState(0);

  const isHome = location === "/";

  useEffect(() => {
    if (!isHome) return;
    let showTimer: ReturnType<typeof setTimeout>;
    let hideTimer: ReturnType<typeof setTimeout>;
    let cycleTimer: ReturnType<typeof setTimeout>;

    const schedule = (delay: number) => {
      showTimer = setTimeout(() => {
        if (Math.random() > 0.35) {
          const next = 480000 + Math.random() * 360000;
          cycleTimer = setTimeout(() => schedule(0), next);
          return;
        }
        setFactIdx(Math.floor(Math.random() * FUN_FACTS.length));
        setVisible(true);
        playDing();
        hideTimer = setTimeout(() => {
          setVisible(false);
          const next = 480000 + Math.random() * 360000;
          cycleTimer = setTimeout(() => schedule(0), next);
        }, 7000);
      }, delay);
    };

    schedule(180000 + Math.random() * 120000);
    return () => { clearTimeout(showTimer); clearTimeout(hideTimer); clearTimeout(cycleTimer); };
  }, [isHome]);

  if (!isHome) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, x: 60, scale: 0.95 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 60, scale: 0.95 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="fixed bottom-6 right-6 z-[9999] max-w-[280px] w-[80vw] pointer-events-auto"
        >
          <div
            className="flex items-start gap-2.5 px-4 py-3 rounded-2xl border text-[11px] leading-relaxed shadow-2xl"
            style={{ background: "rgba(8,8,8,0.96)", borderColor: "rgba(249,115,22,0.28)", backdropFilter: "blur(20px)", color: "#d4d4d4" }}
          >
            <Info className="w-3.5 h-3.5 text-orange-400 shrink-0 mt-0.5" />
            <span>{FUN_FACTS[factIdx]}</span>
            <button onClick={() => setVisible(false)} className="ml-auto shrink-0 text-gray-600 hover:text-gray-400 transition-colors text-sm leading-none">✕</button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function DiscordRequiredWall() {
  const { logout } = useAuth();
  return (
    <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md text-center space-y-6"
      >
        <div className="text-5xl">✋</div>
        <div className="space-y-2">
          <h1 className="text-2xl font-black text-white">Hey, Stop!</h1>
          <p className="text-gray-400 text-sm leading-relaxed">
            To continue using Hexed, you need to connect your Discord account. This keeps your account safe and verified.
          </p>
        </div>
        <div className="p-4 rounded-2xl bg-[#5865F2]/10 border border-[#5865F2]/20 text-left space-y-2">
          <p className="text-[11px] font-black uppercase tracking-widest text-[#7289da]">Why Discord?</p>
          <p className="text-xs text-gray-400 leading-relaxed">
            Connecting your Discord ensures your account is real and secure. We only request your username and avatar — no email, no private messages.
          </p>
        </div>
        <a
          href="/auth/discord/link"
          className="flex items-center justify-center gap-3 w-full py-3.5 rounded-xl font-bold text-sm text-white transition-all border border-[#5865F2]/40 hover:border-[#5865F2] hover:bg-[#5865F2]/10"
          style={{ background: "rgba(88,101,242,0.12)" }}
        >
          <SiDiscord className="w-5 h-5 text-[#5865F2]" />
          Connect Discord
        </a>
        <button
          onClick={() => logout()}
          className="w-full py-2.5 rounded-xl text-xs font-black uppercase tracking-widest text-gray-600 hover:text-gray-400 transition-colors border border-white/[0.04] hover:border-white/10"
        >
          Logout
        </button>
      </motion.div>
    </div>
  );
}

const STAFF_ROLES = ["admin", "administrator", "moderator", "support", "developer", "owner"];
const BYPASS_DOWN_ROLES = ["admin", "administrator", "owner"];

function WebsiteDownPage({ reason, byName, byRank }: { reason: string; byName: string; byRank: string }) {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 select-none">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-lg text-center space-y-8"
      >
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-red-400" />
          </div>
        </div>
        <div className="space-y-3">
          <h1 className="text-3xl font-black text-white tracking-tight">Whoops.</h1>
          <p className="text-lg font-bold text-gray-300">Seems like the website is down.</p>
          <p className="text-sm text-gray-500 leading-relaxed max-w-sm mx-auto">
            We're aware of the issue and are working hard to get things back up as soon as possible. Sorry for the inconvenience!
          </p>
        </div>
        {(reason || byName) && (
          <div className="bg-[#0d0d0d] border border-white/[0.06] rounded-2xl p-5 text-left space-y-3">
            {reason && (
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-600 mb-1">Reason</p>
                <p className="text-sm text-gray-300">{reason}</p>
              </div>
            )}
            {byName && (
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-600 mb-1">Set by</p>
                <p className="text-sm text-gray-300">
                  {byName}{byRank && <span className="ml-2 text-orange-400 font-black text-xs">({byRank})</span>}
                </p>
              </div>
            )}
          </div>
        )}
        <div className="space-y-3">
          <p className="text-xs text-gray-600">Come back later — we'll be back shortly.</p>
          <a
            href="https://discord.gg/hexed"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2.5 px-6 py-3 rounded-xl text-sm font-bold text-white border border-[#5865F2]/30 hover:border-[#5865F2] hover:bg-[#5865F2]/10 transition-all"
            style={{ background: "rgba(88,101,242,0.08)" }}
          >
            <SiDiscord className="w-4 h-4 text-[#5865F2]" />
            Join our Discord for updates
          </a>
        </div>
        <p className="text-[10px] text-gray-700 font-mono">
          hex<span className="text-orange-500">ed</span>
        </p>
      </motion.div>
    </div>
  );
}

function ProfileUrlSetup() {
  const { user } = useAuth();
  const [username, setUsername] = useState((user as any)?.username || "");
  const [checkResult, setCheckResult] = useState<{ available: boolean; reason?: string } | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const domain = window.location.hostname;

  const setupMutation = useMutation({
    mutationFn: (name: string) => apiRequest("POST", "/api/setup-username", { username: name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    },
    onError: async (err: any) => {
      let msg = "Failed to set username";
      try { const d = await err.json?.(); msg = d?.message || msg; } catch {}
      setError(msg);
    },
  });

  const validate = (val: string) => {
    if (!val) return "Enter a username";
    if (val.length < 1 || val.length > 20) return "Must be 1-20 characters";
    if (!/^[a-zA-Z0-9_]+$/.test(val)) return "Only letters, numbers and underscores";
    return null;
  };

  useEffect(() => {
    const err = validate(username);
    if (err) { setCheckResult(null); setChecking(false); return; }
    setChecking(true);
    setCheckResult(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/check-username?username=${encodeURIComponent(username)}`);
        const data = await res.json();
        setCheckResult(data);
      } catch {
        setCheckResult(null);
      }
      setChecking(false);
    }, 500);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [username]);

  const validationError = validate(username);
  const canSubmit = !validationError && checkResult?.available && !checking && !setupMutation.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError("");
    setupMutation.mutate(username);
  };

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md space-y-8"
      >
        <div className="text-center space-y-2">
          <div className="text-3xl font-black text-white tracking-tight">
            hex<span className="text-orange-500">ed</span>
          </div>
          <h1 className="text-xl font-black text-white mt-4">Choose your profile URL</h1>
          <p className="text-sm text-gray-400 leading-relaxed">
            This is the link you share with the world. It's how people find your page on Hexed.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <div
              className="flex items-center rounded-xl overflow-hidden border"
              style={{ borderColor: checkResult?.available ? "rgba(34,197,94,0.4)" : checkResult && !checkResult.available ? "rgba(239,68,68,0.4)" : "rgba(255,255,255,0.08)", background: "rgba(0,0,0,0.5)" }}
            >
              <span className="px-3 py-3 text-sm text-gray-500 border-r border-white/[0.06] whitespace-nowrap shrink-0 font-mono">
                {domain}/
              </span>
              <input
                data-testid="input-username-setup"
                type="text"
                value={username}
                onChange={e => { setUsername(e.target.value); setError(""); }}
                placeholder="yourname"
                maxLength={20}
                className="flex-1 bg-transparent px-3 py-3 text-sm text-white outline-none placeholder-gray-600 font-mono"
                autoFocus
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
              />
              <div className="px-3 shrink-0">
                {checking ? (
                  <Loader2 className="w-4 h-4 text-gray-500 animate-spin" />
                ) : checkResult?.available ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : checkResult && !checkResult.available ? (
                  <X className="w-4 h-4 text-red-400" />
                ) : null}
              </div>
            </div>

            <div className="min-h-[18px] px-1">
              {(validationError && username) ? (
                <p className="text-[11px] text-red-400">{validationError}</p>
              ) : checkResult && !checkResult.available ? (
                <p className="text-[11px] text-red-400">{checkResult.reason}</p>
              ) : checkResult?.available ? (
                <p className="text-[11px] text-green-500">✓ Available — your page will be at <span className="font-mono font-bold">{domain}/{username}</span></p>
              ) : null}
              {error && <p className="text-[11px] text-red-400">{error}</p>}
            </div>
          </div>

          <div className="px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-1">
            <p className="text-[11px] font-black uppercase tracking-widest text-gray-500">Your profile link</p>
            <p className="text-sm text-gray-300 font-mono break-all">
              <span className="text-gray-500">{domain}/</span>
              <span className="text-orange-400 font-bold">{username || "yourname"}</span>
            </p>
            <p className="text-[10px] text-gray-600 mt-1">1-20 characters. Letters, numbers and underscores only. You can change this later.</p>
          </div>

          <button
            data-testid="button-confirm-username"
            type="submit"
            disabled={!canSubmit}
            className="w-full py-3.5 rounded-xl text-sm font-black uppercase tracking-widest transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: canSubmit ? "linear-gradient(135deg,#f97316,#ea580c)" : "rgba(255,255,255,0.05)",
              color: canSubmit ? "#fff" : "#555",
              border: canSubmit ? "none" : "1px solid rgba(255,255,255,0.06)",
            }}
          >
            {setupMutation.isPending ? <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Saving...</span> : "Confirm & Continue"}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (!user) return <Redirect to="/login" />;
  if (!user.discordId && !STAFF_ROLES.includes(user.role)) return <DiscordRequiredWall />;
  if (!(user as any).profileSetupDone) return <ProfileUrlSetup />;
  return <>{children}</>;
}

function PageLoader() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <span className="text-xs font-black italic tracking-widest text-white/60">HEXED.AT</span>
    </div>
  );
}

function Router() {
  const { user, isLoading } = useAuth();
  const { data: siteStatus } = useQuery<any>({
    queryKey: ["/api/website-status"],
    refetchInterval: 15000,
    staleTime: 5000,
  });
  const [location] = useLocation();
  const websiteDown = siteStatus?.status === "down";
  const canBypassDown = user && BYPASS_DOWN_ROLES.includes(user.role);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <span className="text-xs font-black italic tracking-widest text-white/60">HEXED.AT</span>
      </div>
    );
  }

  if (websiteDown && !canBypassDown && location !== "/status") {
    return <WebsiteDownPage reason={siteStatus?.reason || ""} byName={siteStatus?.byName || ""} byRank={siteStatus?.byRank || ""} />;
  }

  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path="/"><Landing /></Route>
        <Route path="/login">{user ? <Redirect to="/dashboard" /> : <AuthPage />}</Route>
        <Route path="/register">{user ? <Redirect to="/dashboard" /> : <AuthPage />}</Route>
        <Route path="/dashboard"><ProtectedRoute><Dashboard /></ProtectedRoute></Route>
        <Route path="/profile"><ProtectedRoute><Dashboard activeTab="profile" /></ProtectedRoute></Route>
        <Route path="/options"><ProtectedRoute><Dashboard activeTab="options" /></ProtectedRoute></Route>
        <Route path="/miscellaneous"><ProtectedRoute><Dashboard activeTab="miscellaneous" /></ProtectedRoute></Route>
        <Route path="/extras"><ProtectedRoute><Dashboard activeTab="extras" /></ProtectedRoute></Route>
        <Route path="/dashboard/tags"><ProtectedRoute><Dashboard activeTab="extras" extrasSection="tags" /></ProtectedRoute></Route>
        <Route path="/dashboard/visual"><ProtectedRoute><Dashboard activeTab="extras" extrasSection="visual" /></ProtectedRoute></Route>
        <Route path="/dashboard/tracks"><ProtectedRoute><Dashboard activeTab="extras" extrasSection="tracks" /></ProtectedRoute></Route>
        <Route path="/dashboard/alias"><ProtectedRoute><Dashboard activeTab="extras" extrasSection="alias" /></ProtectedRoute></Route>
        <Route path="/dashboard/embed"><ProtectedRoute><Dashboard activeTab="extras" extrasSection="embed" /></ProtectedRoute></Route>
        <Route path="/dashboard/challenges"><ProtectedRoute><Dashboard activeTab="extras" extrasSection="challenges" /></ProtectedRoute></Route>
        <Route path="/dashboard/templates"><ProtectedRoute><Dashboard activeTab="extras" extrasSection="templates" /></ProtectedRoute></Route>
        <Route path="/dashboard/user/:username"><ProtectedRoute><UserDashboard /></ProtectedRoute></Route>
        <Route path="/markdowns"><ProtectedRoute><Dashboard activeTab="markdowns" /></ProtectedRoute></Route>
        <Route path="/leaderboard"><Leaderboard /></Route>
        <Route path="/help"><HelpPage /></Route>
        <Route path="/shop/:productId"><Shop /></Route>
        <Route path="/shop"><Shop /></Route>
        <Route path="/tos"><TOS /></Route>
        <Route path="/team"><TeamPage /></Route>
        <Route path="/templates"><Templates /></Route>
        <Route path="/changes"><ChangesPage /></Route>
        <Route path="/status"><StatusPage /></Route>
        <Route path="/hexed/founders"><FoundersPage /></Route>
        <Route path="/hexed/wheelspin"><WheelSpinPage /></Route>
        <Route path="/hexed/easter"><EasterPage /></Route>
        <Route path="/easter-event"><EasterEventPage /></Route>
        <Route path="/hexed/secret"><ProtectedRoute><SecretPage /></ProtectedRoute></Route>
        <Route path="/:username" component={PublicProfile} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <I18nProvider>
          <TooltipProvider>
            <ClickSpark
              sparkColor="#F97316"
              sparkSize={10}
              sparkRadius={25}
              sparkCount={8}
              duration={300}
            >
              <FunFactToast />
              <Router />
              <Toaster />
            </ClickSpark>
          </TooltipProvider>
        </I18nProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
