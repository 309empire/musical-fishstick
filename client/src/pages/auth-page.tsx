import { useAuth } from "@/hooks/use-auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertUserSchema } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useState, useRef } from "react";
import { Eye, EyeOff, ArrowRight, Zap, ShieldCheck, KeyRound } from "lucide-react";
import { SiDiscord } from "react-icons/si";
import { motion, AnimatePresence } from "framer-motion";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type Step = "auth" | "login-2fa" | "post-register-2fa-code" | "post-register-2fa-pw";

export default function AuthPage() {
  const { login, register, isLoggingIn, isRegistering, loginError, user } = useAuth();
  const [, setLocation] = useLocation();
  const [location] = useLocation();
  const [mode, setMode] = useState<"login" | "register">(location === "/register" ? "register" : "login");
  const [showLoginPw, setShowLoginPw] = useState(false);
  const [showRegPw, setShowRegPw] = useState(false);
  const [step, setStep] = useState<Step>("auth");
  const [twoFaCode, setTwoFaCode] = useState("");
  const [loginCreds, setLoginCreds] = useState<{ username: string; password: string } | null>(null);
  const [twoFaError, setTwoFaError] = useState("");
  const [twoFaLoading, setTwoFaLoading] = useState(false);
  const [setupCode, setSetupCode] = useState("");
  const [setupPassword, setSetupPassword] = useState("");
  const [setupError, setSetupError] = useState("");
  const [setupLoading, setSetupLoading] = useState(false);
  const [showSetupPw, setShowSetupPw] = useState(false);
  const { toast } = useToast();

  const isBanned = loginError?.toLowerCase().includes("banned");

  const { data: discordStatus } = useQuery<{ enabled: boolean; configured: boolean }>({
    queryKey: ["/api/discord-status"],
    staleTime: 30000,
  });
  const discordEnabled = discordStatus?.enabled !== false && discordStatus?.configured === true;

  const loginForm = useForm({
    defaultValues: { username: "", password: "" },
  });

  const registerSchema = insertUserSchema.extend({
    password: z.string().min(7, "Password must be at least 7 characters"),
  });

  const registerForm = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: { username: "", password: "", email: "" },
  });

  const inputCls = "bg-white/[0.04] border border-white/[0.08] focus:border-orange-500/60 focus:bg-white/[0.06] rounded-xl h-12 px-4 text-white placeholder:text-gray-600 text-sm font-medium transition-all outline-none ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 w-full";

  async function handleLogin(data: { username: string; password: string }) {
    setLoginCreds(data);
    setTwoFaError("");
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) {
        if (json.requires2FA) {
          setStep("login-2fa");
          setTwoFaCode("");
          return;
        }
        throw new Error(json.message || "Invalid credentials");
      }
      queryClient.setQueryData(["/api/user"], json);
    } catch (err: any) {
      loginForm.setError("root", { message: err.message });
    }
  }

  async function handleLogin2FA() {
    if (!loginCreds) return;
    setTwoFaError("");
    setTwoFaLoading(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...loginCreds, twoFactorCode: twoFaCode }),
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) {
        setTwoFaError(json.message || "Invalid code");
        return;
      }
      queryClient.setQueryData(["/api/user"], json);
    } catch (err: any) {
      setTwoFaError(err.message);
    } finally {
      setTwoFaLoading(false);
    }
  }

  async function handleRegister(data: any) {
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Registration failed");
      queryClient.setQueryData(["/api/user"], json);
      setStep("post-register-2fa-code");
    } catch (err: any) {
      toast({ title: "Registration failed", description: err.message, variant: "destructive" });
    }
  }

  async function handleSetup2FA() {
    setSetupError("");
    setSetupLoading(true);
    try {
      const res = await fetch("/api/user/setup-2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: setupCode, password: setupPassword }),
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) {
        setSetupError(json.message || "Setup failed");
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({ title: "2FA enabled!", description: "Your account is now protected." });
      setLocation("/dashboard");
    } catch (err: any) {
      setSetupError(err.message);
    } finally {
      setSetupLoading(false);
    }
  }

  if (user && step === "auth") {
    setLocation("/dashboard");
    return null;
  }

  return (
    <div className="min-h-screen bg-[#050505] flex overflow-hidden">
      {/* Left decorative panel */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-[50%] relative flex-col items-center justify-center p-16 bg-[#070707] border-r border-white/[0.04]">
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)",
            backgroundSize: "40px 40px"
          }}
        />

        <div className="relative z-10 text-center max-w-sm">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-[10px] font-black uppercase tracking-widest mb-8">
            <Zap className="w-3 h-3" /> Your identity. Your rules.
          </div>
          <h1 className="text-5xl xl:text-6xl font-black text-white tracking-tighter leading-none mb-4">
            hex<span className="text-orange-500">ed</span>
          </h1>
          <p className="text-gray-500 text-sm leading-relaxed mb-10">
            The social profile platform built for creators, communities, and the people behind them.
          </p>

          <div className="flex flex-wrap gap-2 justify-center">
            {["Custom themes", "Discord sync", "Music player", "Badges", "Analytics"].map(f => (
              <span key={f} className="px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.06] text-gray-500 text-[11px] font-bold">{f}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-10 relative">
        <div className="lg:hidden mb-8 text-center">
          <a href="/" className="text-3xl font-black text-orange-500 tracking-tighter">hexed</a>
        </div>

        <a href="/" className="absolute top-6 left-6 text-[10px] font-black uppercase tracking-widest text-gray-600 hover:text-gray-400 transition-colors flex items-center gap-1">
          ← Back
        </a>

        <div className="w-full max-w-[380px]">
          {/* Banned state */}
          {isBanned ? (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-4 p-8 rounded-2xl bg-red-500/5 border border-red-500/20">
              <div className="text-5xl">🚫</div>
              <div>
                <h2 className="text-xl font-black text-red-400 mb-1">You've been banned</h2>
                <p className="text-gray-500 text-sm">Your account has been suspended. Contact support if you believe this is a mistake.</p>
              </div>
              <button onClick={() => window.location.href = "/"} className="px-6 py-2.5 rounded-xl border border-red-500/30 text-red-400 text-sm font-bold hover:bg-red-500/10 transition-all">
                Go Home
              </button>
            </motion.div>
          ) : step === "login-2fa" ? (
            /* ─── 2FA Login Step ─── */
            <motion.div key="login-2fa" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <div className="text-center mb-8">
                <div className="w-14 h-14 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center mx-auto mb-4">
                  <ShieldCheck className="w-7 h-7 text-orange-400" />
                </div>
                <h2 className="text-2xl font-black text-white">2FA Verification</h2>
                <p className="text-gray-500 text-sm mt-1">Enter your 2FA code to continue</p>
              </div>

              <div className="space-y-3">
                <input
                  value={twoFaCode}
                  onChange={e => setTwoFaCode(e.target.value.slice(0, 6))}
                  placeholder="Enter your 6-character code"
                  maxLength={6}
                  className={inputCls}
                  data-testid="input-2fa-code"
                  onKeyDown={e => e.key === "Enter" && handleLogin2FA()}
                  autoFocus
                />
                {twoFaError && <p className="text-xs text-red-400 font-medium px-1">{twoFaError}</p>}

                <button
                  onClick={handleLogin2FA}
                  disabled={twoFaLoading || !twoFaCode}
                  data-testid="button-verify-2fa"
                  className="w-full h-12 rounded-xl bg-orange-500 text-black font-black text-sm flex items-center justify-center gap-2 hover:bg-orange-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {twoFaLoading ? "Verifying..." : <><span>Verify & Sign In</span><ArrowRight className="w-4 h-4" /></>}
                </button>

                <div className="text-center pt-2">
                  <p className="text-xs text-gray-600">
                    Forgot your 2FA code?{" "}
                    <a href="https://discord.gg/hexed" target="_blank" rel="noreferrer" className="text-orange-500 font-bold hover:text-orange-400 transition-colors">
                      Open a ticket on Discord
                    </a>
                  </p>
                  <button onClick={() => { setStep("auth"); setTwoFaCode(""); }} className="text-[11px] text-gray-600 hover:text-gray-400 mt-2 transition-colors">
                    ← Back to login
                  </button>
                </div>
              </div>
            </motion.div>
          ) : step === "post-register-2fa-code" ? (
            /* ─── Post-Register 2FA Setup (code step) ─── */
            <motion.div key="post-2fa-code" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <div className="text-center mb-8">
                <div className="w-14 h-14 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center mx-auto mb-4">
                  <ShieldCheck className="w-7 h-7 text-orange-400" />
                </div>
                <h2 className="text-2xl font-black text-white">Setup 2FA</h2>
                <p className="text-gray-500 text-sm mt-1">Create a code to protect your account (max 6 characters, letters or numbers)</p>
              </div>

              <div className="space-y-3">
                <input
                  value={setupCode}
                  onChange={e => setSetupCode(e.target.value.slice(0, 6))}
                  placeholder="Enter 2FA code (e.g. abc123)"
                  maxLength={6}
                  className={inputCls}
                  data-testid="input-setup-2fa-code"
                  autoFocus
                />
                <p className="text-[10px] text-gray-600 px-1">Max 6 characters. Letters and numbers are allowed.</p>

                {setupError && <p className="text-xs text-red-400 font-medium px-1">{setupError}</p>}

                <button
                  onClick={() => { setSetupError(""); setStep("post-register-2fa-pw"); }}
                  disabled={!setupCode}
                  className="w-full h-12 rounded-xl bg-orange-500 text-black font-black text-sm flex items-center justify-center gap-2 hover:bg-orange-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span>Next</span><ArrowRight className="w-4 h-4" />
                </button>

                <button onClick={() => setLocation("/dashboard")} className="w-full py-2.5 text-xs text-gray-500 hover:text-gray-300 transition-colors font-semibold">
                  Skip for now
                </button>
              </div>
            </motion.div>
          ) : step === "post-register-2fa-pw" ? (
            /* ─── Post-Register 2FA Setup (password confirmation) ─── */
            <motion.div key="post-2fa-pw" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <div className="text-center mb-8">
                <div className="w-14 h-14 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center mx-auto mb-4">
                  <KeyRound className="w-7 h-7 text-orange-400" />
                </div>
                <h2 className="text-2xl font-black text-white">Confirm Password</h2>
                <p className="text-gray-500 text-sm mt-1">Enter your password to activate 2FA</p>
              </div>

              <div className="space-y-3">
                <div className="relative">
                  <input
                    type={showSetupPw ? "text" : "password"}
                    value={setupPassword}
                    onChange={e => setSetupPassword(e.target.value)}
                    placeholder="Your password"
                    className={`${inputCls} pr-11`}
                    data-testid="input-setup-2fa-password"
                    autoFocus
                    onKeyDown={e => e.key === "Enter" && handleSetup2FA()}
                  />
                  <button type="button" onClick={() => setShowSetupPw(v => !v)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors">
                    {showSetupPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {setupError && <p className="text-xs text-red-400 font-medium px-1">{setupError}</p>}

                <button
                  onClick={handleSetup2FA}
                  disabled={setupLoading || !setupPassword}
                  data-testid="button-confirm-setup-2fa"
                  className="w-full h-12 rounded-xl bg-orange-500 text-black font-black text-sm flex items-center justify-center gap-2 hover:bg-orange-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {setupLoading ? "Enabling 2FA..." : <><span>Enable 2FA</span><ShieldCheck className="w-4 h-4" /></>}
                </button>

                <button onClick={() => setStep("post-register-2fa-code")} className="w-full py-2.5 text-xs text-gray-500 hover:text-gray-300 transition-colors font-semibold">
                  ← Back
                </button>

                <p className="text-center text-[10px] text-gray-600 mt-1">
                  Forgot password?{" "}
                  <a href="https://discord.gg/hexed" target="_blank" rel="noreferrer" className="text-orange-500 font-bold hover:text-orange-400 transition-colors">
                    Create a ticket on Discord
                  </a>
                </p>
              </div>
            </motion.div>
          ) : (
            <>
              {/* Tab switcher */}
              <div className="flex items-center gap-1 p-1 rounded-xl bg-white/[0.04] border border-white/[0.06] mb-8">
                {(["login", "register"] as const).map(m => (
                  <button key={m} onClick={() => setMode(m)}
                    className={`flex-1 py-2 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all ${mode === m ? "bg-orange-500 text-black shadow-lg" : "text-gray-500 hover:text-gray-300"}`}>
                    {m === "login" ? "Sign In" : "Sign Up"}
                  </button>
                ))}
              </div>

              <AnimatePresence mode="wait">
                {mode === "login" ? (
                  <motion.div key="login" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} transition={{ duration: 0.18 }}>
                    <div className="mb-6">
                      <h2 className="text-2xl font-black text-white">Welcome back</h2>
                      <p className="text-gray-500 text-sm mt-1">Sign in to your Hexed account</p>
                    </div>

                    {discordEnabled ? (
                      <a href="/auth/discord" data-testid="button-discord-login"
                        className="flex items-center justify-center gap-2.5 w-full h-12 rounded-xl bg-[#5865F2]/10 border border-[#5865F2]/30 text-white font-bold text-sm hover:bg-[#5865F2]/20 hover:border-[#5865F2]/60 transition-all mb-4">
                        <SiDiscord className="w-4 h-4 text-[#7289da]" /> Continue with Discord
                      </a>
                    ) : (
                      <div data-testid="button-discord-login-disabled"
                        className="flex items-center justify-center gap-2.5 w-full h-12 rounded-xl bg-white/[0.02] border border-white/[0.05] text-gray-600 font-bold text-sm cursor-not-allowed mb-4 select-none">
                        <SiDiscord className="w-4 h-4 text-gray-700" /> Continue with Discord
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-widest bg-white/[0.06] text-gray-600">SOON</span>
                      </div>
                    )}

                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex-1 h-px bg-white/[0.05]" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-gray-600">or</span>
                      <div className="flex-1 h-px bg-white/[0.05]" />
                    </div>

                    <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-3">
                      <input
                        {...loginForm.register("username")}
                        placeholder="Username"
                        className={inputCls}
                        data-testid="input-username"
                        autoComplete="username"
                      />
                      <div className="relative">
                        <input
                          {...loginForm.register("password")}
                          type={showLoginPw ? "text" : "password"}
                          placeholder="Password"
                          className={`${inputCls} pr-11`}
                          data-testid="input-password"
                          autoComplete="current-password"
                        />
                        <button type="button" onClick={() => setShowLoginPw(v => !v)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors">
                          {showLoginPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>

                      {loginForm.formState.errors.root && (
                        <p className="text-xs text-red-400 font-medium px-1">{(loginForm.formState.errors.root as any).message}</p>
                      )}
                      {loginError && !isBanned && (
                        <p className="text-xs text-red-400 font-medium px-1">{loginError}</p>
                      )}

                      <button type="submit" disabled={isLoggingIn} data-testid="button-login"
                        className="w-full h-12 rounded-xl bg-orange-500 text-black font-black text-sm flex items-center justify-center gap-2 hover:bg-orange-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-1">
                        {isLoggingIn ? "Signing in..." : <><span>Sign In</span><ArrowRight className="w-4 h-4" /></>}
                      </button>
                    </form>

                    <p className="text-center text-xs text-gray-600 mt-6">
                      Don't have an account?{" "}
                      <button onClick={() => setMode("register")} className="text-orange-500 font-bold hover:text-orange-400 transition-colors">Sign up</button>
                    </p>
                  </motion.div>
                ) : (
                  <motion.div key="register" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.18 }}>
                    <div className="mb-6">
                      <h2 className="text-2xl font-black text-white">Create account</h2>
                      <p className="text-gray-500 text-sm mt-1">Join Hexed and build your profile</p>
                    </div>

                    {discordEnabled ? (
                      <a href="/auth/discord" data-testid="button-discord-register"
                        className="flex items-center justify-center gap-2.5 w-full h-12 rounded-xl bg-[#5865F2]/10 border border-[#5865F2]/30 text-white font-bold text-sm hover:bg-[#5865F2]/20 hover:border-[#5865F2]/60 transition-all mb-4">
                        <SiDiscord className="w-4 h-4 text-[#7289da]" /> Sign up with Discord
                      </a>
                    ) : null}

                    {discordEnabled && (
                      <div className="flex items-center gap-3 mb-4">
                        <div className="flex-1 h-px bg-white/[0.05]" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-600">or sign up manually</span>
                        <div className="flex-1 h-px bg-white/[0.05]" />
                      </div>
                    )}

                    <Form {...registerForm}>
                      <form onSubmit={registerForm.handleSubmit(handleRegister)} className="space-y-3">
                        <FormField control={registerForm.control} name="username" render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <input {...field} placeholder="Username" className={inputCls} data-testid="input-reg-username" autoComplete="username" />
                            </FormControl>
                            <FormMessage className="text-xs text-red-400" />
                          </FormItem>
                        )} />
                        <FormField control={registerForm.control} name="email" render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <input {...field} type="email" placeholder="Email address" className={inputCls} data-testid="input-reg-email" autoComplete="email" />
                            </FormControl>
                            <FormMessage className="text-xs text-red-400" />
                          </FormItem>
                        )} />
                        <FormField control={registerForm.control} name="password" render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <div className="relative">
                                <input {...field} type={showRegPw ? "text" : "password"} placeholder="Password (min. 7 characters)" className={`${inputCls} pr-11`} data-testid="input-reg-password" autoComplete="new-password" />
                                <button type="button" onClick={() => setShowRegPw(v => !v)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors">
                                  {showRegPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                              </div>
                            </FormControl>
                            <FormMessage className="text-xs text-red-400" />
                          </FormItem>
                        )} />

                        <button type="submit" disabled={isRegistering} data-testid="button-register"
                          className="w-full h-12 rounded-xl bg-orange-500 text-black font-black text-sm flex items-center justify-center gap-2 hover:bg-orange-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-1">
                          {isRegistering ? "Creating account..." : <><span>Get Started</span><ArrowRight className="w-4 h-4" /></>}
                        </button>
                      </form>
                    </Form>

                    <p className="text-center text-xs text-gray-600 mt-6">
                      Already have an account?{" "}
                      <button onClick={() => setMode("login")} className="text-orange-500 font-bold hover:text-orange-400 transition-colors">Sign in</button>
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}

          <p className="text-center text-[10px] text-gray-700 font-bold mt-8">
            <a href="/shop" className="hover:text-gray-500 transition-colors uppercase tracking-widest">Visit Shop</a>
          </p>
        </div>
      </div>
    </div>
  );
}
