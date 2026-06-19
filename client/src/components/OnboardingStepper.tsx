import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUpload } from "@/hooks/use-upload";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Upload, Palette, User, Check, ChevronRight, ChevronLeft, X, Link } from "lucide-react";

const STEPS = [
  {
    id: "link",
    icon: Link,
    title: "Choose Your Link",
    desc: "Pick the unique URL people will use to find your profile.",
    color: "#22c55e",
  },
  {
    id: "banner",
    icon: Upload,
    title: "Upload a Banner",
    desc: "Add a banner image or video at the top of your profile to make it stand out.",
    color: "#F97316",
  },
  {
    id: "theme",
    icon: Palette,
    title: "Pick a Theme Color",
    desc: "Choose an accent color — it tints your profile card, links, and effects.",
    color: "#a855f7",
  },
  {
    id: "avatar",
    icon: User,
    title: "Upload a Profile Picture",
    desc: "Give your profile a face. Upload any image to use as your avatar.",
    color: "#3b82f6",
  },
];

const PRESET_COLORS = [
  "#F97316", "#ef4444", "#f59e0b", "#84cc16",
  "#22c55e", "#14b8a6", "#3b82f6", "#6366f1",
  "#8b5cf6", "#a855f7", "#ec4899", "#ffffff",
];

interface Props {
  initialThemeColor?: string;
  onDone: (changes: { bannerUrl?: string; avatarUrl?: string; themeColor?: string }) => void;
}

export default function OnboardingStepper({ initialThemeColor = "#F97316", onDone }: Props) {
  const [step, setStep] = useState(0);
  const [bannerUrl, setBannerUrl] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [themeColor, setThemeColor] = useState(initialThemeColor);
  const [bannerPreview, setBannerPreview] = useState("");
  const [avatarPreview, setAvatarPreview] = useState("");
  const [direction, setDirection] = useState(1);
  const [linkInput, setLinkInput] = useState("");
  const [linkStatus, setLinkStatus] = useState<"idle" | "checking" | "available" | "taken" | "invalid">("idle");
  const [linkSaved, setLinkSaved] = useState(false);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const { uploadFile, isUploading } = useUpload();

  const setupDoneMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/profile/setup-done"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    },
  });

  const profileMutation = useMutation({
    mutationFn: (data: object) => apiRequest("PATCH", "/api/profile", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
    },
  });

  const usernameMutation = useMutation({
    mutationFn: (username: string) => apiRequest("POST", "/api/setup-username", { username }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      setLinkSaved(true);
    },
  });

  const finish = async () => {
    const changes: { bannerUrl?: string; avatarUrl?: string; themeColor?: string } = {};
    if (bannerUrl) changes.bannerUrl = bannerUrl;
    if (avatarUrl) changes.avatarUrl = avatarUrl;
    if (themeColor !== initialThemeColor) changes.themeColor = themeColor;
    if (Object.keys(changes).length > 0) await profileMutation.mutateAsync(changes);
    await setupDoneMutation.mutateAsync();
    onDone(changes);
  };

  const go = (delta: number) => {
    setDirection(delta);
    const next = step + delta;
    if (next >= STEPS.length) { finish(); return; }
    if (next < 0) return;
    setStep(next);
  };

  const checkLink = async (val: string) => {
    const clean = val.toLowerCase().replace(/[^a-z0-9_]/g, "");
    if (!clean || clean.length < 1 || clean.length > 20) {
      setLinkStatus("invalid");
      return;
    }
    setLinkStatus("checking");
    try {
      const r = await fetch(`/api/check-username?username=${encodeURIComponent(clean)}`);
      const data = await r.json();
      setLinkStatus(data.available ? "available" : "taken");
    } catch {
      setLinkStatus("idle");
    }
  };

  const handleLinkChange = (val: string) => {
    setLinkInput(val);
    setLinkStatus("idle");
    setLinkSaved(false);
    if (val.length > 0) {
      clearTimeout((handleLinkChange as any)._t);
      (handleLinkChange as any)._t = setTimeout(() => checkLink(val), 400);
    }
  };

  const saveLink = async () => {
    if (linkStatus !== "available") return;
    const clean = linkInput.toLowerCase().replace(/[^a-z0-9_]/g, "");
    await usernameMutation.mutateAsync(clean);
  };

  const handleFileUpload = async (file: File, type: "banner" | "avatar") => {
    const result = await uploadFile(file);
    if (!result) return;
    const url = result.publicUrl || `${window.location.origin}${result.objectPath}`;
    if (type === "banner") { setBannerUrl(url); setBannerPreview(url); }
    else { setAvatarUrl(url); setAvatarPreview(url); }
  };

  const currentStep = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const variants = {
    enter: (d: number) => ({ x: d > 0 ? 60 : -60, opacity: 0, filter: "blur(6px)" }),
    center: { x: 0, opacity: 1, filter: "blur(0px)" },
    exit: (d: number) => ({ x: d > 0 ? -60 : 60, opacity: 0, filter: "blur(6px)" }),
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(16px)" }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-lg"
      >
        {/* Card */}
        <div className="relative overflow-hidden rounded-3xl border border-white/[0.08]" style={{ background: "#0a0a0a" }}>
          {/* Top accent */}
          <div className="h-[2px] w-full" style={{ background: `linear-gradient(90deg, ${currentStep.color}80, transparent)` }} />

          {/* Skip all */}
          <button
            onClick={finish}
            className="absolute top-4 right-4 text-[11px] text-gray-600 hover:text-gray-400 transition-colors flex items-center gap-1"
          >
            Skip all <X className="w-3 h-3" />
          </button>

          <div className="p-8 pb-7">
            {/* Step indicators */}
            <div className="flex items-center gap-2 mb-8">
              {STEPS.map((s, i) => (
                <div key={i} className="flex items-center gap-2">
                  <motion.div
                    animate={{
                      width: i === step ? 28 : 8,
                      backgroundColor: i < step ? "#22c55e" : i === step ? currentStep.color : "rgba(255,255,255,0.1)",
                    }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    className="h-2 rounded-full"
                  />
                </div>
              ))}
              <span className="ml-auto text-[11px] text-gray-600 font-bold">{step + 1} / {STEPS.length}</span>
            </div>

            {/* Step content */}
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={step}
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              >
                {/* Icon */}
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5"
                  style={{ background: `${currentStep.color}18`, border: `1px solid ${currentStep.color}30` }}
                >
                  <currentStep.icon className="w-5 h-5" style={{ color: currentStep.color }} />
                </div>

                <h2 className="text-2xl font-extrabold mb-2" style={{ fontFamily: "var(--font-display)" }}>
                  {currentStep.title}
                </h2>
                <p className="text-gray-500 text-sm leading-relaxed mb-6">{currentStep.desc}</p>

                {/* STEP: Choose Link */}
                {step === 0 && (
                  <div className="space-y-3">
                    <div className="relative">
                      <div className="flex items-center gap-0 rounded-xl overflow-hidden border border-white/[0.08] bg-black/40">
                        <span className="pl-4 pr-1 text-gray-600 text-sm font-bold select-none">hexed.at/</span>
                        <input
                          value={linkInput}
                          onChange={e => handleLinkChange(e.target.value)}
                          placeholder="yourname"
                          className="flex-1 bg-transparent py-3 pr-4 text-sm text-white placeholder-gray-600 outline-none"
                          maxLength={20}
                          autoComplete="off"
                          spellCheck={false}
                        />
                        <div className="pr-3">
                          {linkStatus === "checking" && <span className="text-[10px] text-gray-500 font-bold">...</span>}
                          {linkStatus === "available" && <span className="text-[10px] text-green-400 font-black">✓ Available</span>}
                          {linkStatus === "taken" && <span className="text-[10px] text-red-400 font-black">✗ Taken</span>}
                          {linkStatus === "invalid" && <span className="text-[10px] text-orange-400 font-black">Invalid</span>}
                        </div>
                      </div>
                    </div>
                    <p className="text-[11px] text-gray-600">Only letters, numbers and underscores. Max 20 characters.</p>
                    {linkSaved && (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-[12px] font-black">
                        <Check className="w-3.5 h-3.5" /> Link saved — hexed.at/{linkInput.toLowerCase().replace(/[^a-z0-9_]/g, "")}
                      </div>
                    )}
                    {linkStatus === "available" && !linkSaved && (
                      <button
                        onClick={saveLink}
                        disabled={usernameMutation.isPending}
                        className="w-full py-2.5 rounded-xl text-sm font-black text-black transition-all"
                        style={{ background: currentStep.color }}
                      >
                        {usernameMutation.isPending ? "Saving..." : "Save This Link"}
                      </button>
                    )}
                  </div>
                )}

                {/* STEP: Banner */}
                {step === 1 && (
                  <div className="space-y-3">
                    {bannerPreview ? (
                      <div className="relative rounded-xl overflow-hidden border border-white/[0.06]">
                        <img src={bannerPreview} alt="Banner" className="w-full h-32 object-cover" loading="lazy" />
                        <button
                          onClick={() => { setBannerUrl(""); setBannerPreview(""); }}
                          className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/70 border border-white/10 flex items-center justify-center hover:bg-red-500 transition-colors"
                        >
                          <X className="w-3 h-3 text-white" />
                        </button>
                        <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/80 rounded-full text-[9px] font-black uppercase text-green-400 flex items-center gap-1">
                          <Check className="w-2.5 h-2.5" /> Uploaded
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => bannerInputRef.current?.click()}
                        disabled={isUploading}
                        className="w-full h-28 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-colors"
                        style={{ borderColor: "rgba(249,115,22,0.2)", background: "rgba(249,115,22,0.03)" }}
                      >
                        {isUploading ? (
                          <span className="text-[12px] text-orange-400 animate-pulse">Uploading...</span>
                        ) : (
                          <>
                            <Upload className="w-5 h-5 text-gray-600" />
                            <span className="text-[12px] text-gray-600">Click to upload image or video</span>
                          </>
                        )}
                      </button>
                    )}
                    <input
                      ref={bannerInputRef}
                      type="file"
                      accept="image/*,video/*"
                      className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f, "banner"); e.target.value = ""; }}
                    />
                    <input
                      value={bannerUrl.startsWith("/objects") || bannerUrl.startsWith("http") ? "" : bannerUrl}
                      onChange={e => { setBannerUrl(e.target.value); setBannerPreview(e.target.value); }}
                      placeholder="Or paste an image URL..."
                      className="w-full bg-black/40 border border-white/[0.06] rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 outline-none focus:border-orange-500/40 transition-colors"
                    />
                  </div>
                )}

                {/* STEP: Theme */}
                {step === 2 && (
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      {PRESET_COLORS.map(c => (
                        <button
                          key={c}
                          onClick={() => setThemeColor(c)}
                          className="w-8 h-8 rounded-lg border-2 transition-all duration-150"
                          style={{
                            backgroundColor: c,
                            borderColor: themeColor === c ? "white" : "transparent",
                            transform: themeColor === c ? "scale(1.15)" : "scale(1)",
                            boxShadow: themeColor === c ? `0 0 12px ${c}80` : "none",
                          }}
                        />
                      ))}
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={themeColor}
                        onChange={e => setThemeColor(e.target.value)}
                        className="w-10 h-10 rounded-lg border border-white/10 bg-black/40 cursor-pointer"
                      />
                      <span className="text-sm text-gray-400">Custom color</span>
                      <div
                        className="ml-auto px-3 py-1.5 rounded-lg text-[12px] font-bold"
                        style={{ background: `${themeColor}20`, color: themeColor, border: `1px solid ${themeColor}40` }}
                      >
                        {themeColor.toUpperCase()}
                      </div>
                    </div>
                    <div
                      className="rounded-xl p-4 flex items-center gap-3 border"
                      style={{ background: `${themeColor}08`, borderColor: `${themeColor}25` }}
                    >
                      <div className="w-8 h-8 rounded-full" style={{ background: themeColor }} />
                      <div>
                        <div className="text-sm font-bold text-white">Preview</div>
                        <div className="text-[11px]" style={{ color: themeColor }}>Your username</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP: Avatar */}
                {step === 3 && (
                  <div className="space-y-3">
                    {avatarPreview ? (
                      <div className="flex items-center gap-4">
                        <img src={avatarPreview} alt="Avatar" className="w-20 h-20 rounded-2xl object-cover border border-white/10" loading="lazy" />
                        <div>
                          <p className="text-sm font-bold text-white mb-1">Looking good!</p>
                          <button onClick={() => { setAvatarUrl(""); setAvatarPreview(""); }} className="text-[11px] text-red-400 hover:text-red-300 transition-colors">Remove</button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => avatarInputRef.current?.click()}
                        disabled={isUploading}
                        className="w-full h-28 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-colors"
                        style={{ borderColor: "rgba(59,130,246,0.2)", background: "rgba(59,130,246,0.03)" }}
                      >
                        {isUploading ? (
                          <span className="text-[12px] text-blue-400 animate-pulse">Uploading...</span>
                        ) : (
                          <>
                            <User className="w-5 h-5 text-gray-600" />
                            <span className="text-[12px] text-gray-600">Click to upload your photo</span>
                          </>
                        )}
                      </button>
                    )}
                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f, "avatar"); e.target.value = ""; }}
                    />
                    <input
                      value={avatarUrl.startsWith("/objects") || avatarUrl.startsWith("http") ? "" : avatarUrl}
                      onChange={e => { setAvatarUrl(e.target.value); setAvatarPreview(e.target.value); }}
                      placeholder="Or paste an image URL..."
                      className="w-full bg-black/40 border border-white/[0.06] rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 outline-none focus:border-blue-500/40 transition-colors"
                    />
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Navigation */}
          <div className="px-8 pb-8 flex items-center gap-3">
            {step > 0 ? (
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={() => go(-1)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-white/[0.08] text-sm text-gray-400 hover:text-white hover:border-white/20 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" /> Back
              </motion.button>
            ) : (
              <div />
            )}
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => go(1)}
              disabled={setupDoneMutation.isPending || profileMutation.isPending}
              className="ml-auto flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm text-black transition-all disabled:opacity-50"
              style={{ background: currentStep.color }}
            >
              {isLast
                ? (setupDoneMutation.isPending || profileMutation.isPending ? "Saving..." : "Finish")
                : "Next"}
              {!isLast && <ChevronRight className="w-4 h-4" />}
              {isLast && <Check className="w-4 h-4" />}
            </motion.button>
          </div>
        </div>

        {/* Step label below */}
        <p className="text-center text-[11px] text-gray-700 mt-4">
          You can change everything later in your Dashboard
        </p>
      </motion.div>
    </div>
  );
}
