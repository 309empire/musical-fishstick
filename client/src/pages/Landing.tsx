import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ShoppingBag, Megaphone, MessageCircle, X, Send, Bot, Headphones, ChevronRight, Maximize2, Clock, RefreshCw, MessageSquare } from "lucide-react";
import { SiDiscord } from "react-icons/si";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useRef, useCallback, ReactNode } from "react";
import { apiRequest } from "@/lib/queryClient";
import Aurora from "@/components/Aurora";

const ANNOUNCEMENTS: ReactNode[] = [
  <>
    🎉 Get 15% off all products by joining our{" "}
    <a
      href="https://discord.gg/9nZUZRcqyT"
      target="_blank"
      rel="noopener noreferrer"
      style={{ textDecoration: "underline" }}
    >
      Discord
    </a>
  </>,
  "💬 Looking for support? Open a ticket in our Discord",
  "🔗 Match your link and badge colors to your theme",
  "🎨 Mix and match your profile however you want. No limits.",
  "🎵 Set tracks to autoplay or shuffle on load",
  "👀 Alias usernames are coming soon",
];

function AnnouncementBar() {
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIdx(i => (i + 1) % ANNOUNCEMENTS.length);
        setVisible(true);
      }, 300);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="w-full py-1.5 px-4 text-center" style={{ background: "rgba(20,8,0,0.85)", borderBottom: "1px solid rgba(249,115,22,0.15)", backdropFilter: "blur(8px)" }}>
      <AnimatePresence mode="wait">
        {visible && (
          <motion.p key={idx} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.25 }}
            className="text-[11px] font-bold text-orange-400 flex items-center justify-center gap-1.5">
            <Megaphone className="w-3 h-3 shrink-0" />
            {ANNOUNCEMENTS[idx]}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

function resolveUrl(url: string | null | undefined): string {
  if (!url) return "";
  if (url.startsWith("/objects/")) return `${window.location.origin}${url}`;
  return url;
}

function MemberCard({ m }: { m: any }) {
  return (
    <a
      href={`/${m.username}`}
      className="flex flex-col items-center gap-2 px-3 py-3 rounded-2xl border border-white/[0.06] hover:border-orange-500/40 hover:bg-white/[0.04] transition-all duration-300 group cursor-pointer shrink-0"
      style={{ width: "100px" }}
    >
      <div className="w-11 h-11 rounded-xl overflow-hidden border border-white/10 bg-white/5 flex items-center justify-center">
        {m.avatarUrl
          ? <img src={resolveUrl(m.avatarUrl)} alt={m.displayName} className="w-full h-full object-cover" />
          : <span className="text-base font-black text-gray-600">{(m.displayName || m.username)[0]?.toUpperCase()}</span>
        }
      </div>
      <div className="text-center w-full">
        <p className="text-[11px] font-bold text-white group-hover:text-orange-400 transition-colors duration-300 leading-tight truncate">{m.displayName || m.username}</p>
        <p className="text-[9px] text-gray-600 mt-0.5 truncate">/{m.username}</p>
      </div>
    </a>
  );
}

function MembersMarquee({ members }: { members: any[] }) {
  const unique = Array.from(new Map(members.map(m => [m.id, m])).values());
  const minCopies = Math.max(2, Math.ceil(20 / Math.max(unique.length, 1)));
  const copies = minCopies * 2;
  const filled = Array.from({ length: copies }, (_, i) => unique[i % unique.length]);
  const [paused, setPaused] = useState(false);

  return (
    <div
      className="relative w-full"
      style={{
        maskImage: "linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)",
        WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)",
      }}
    >
      <div className="overflow-hidden w-full">
        <div
          className="flex gap-2"
          style={{
            width: "max-content",
            animation: `marquee-rtl ${Math.max(8, unique.length * 3)}s linear infinite`,
            animationPlayState: paused ? "paused" : "running",
          }}
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          {filled.map((m: any, i: number) => (
            <MemberCard key={`${m.id}-${i}`} m={m} />
          ))}
        </div>
      </div>
    </div>
  );
}

function useCountUp(target: number, duration: number, active: boolean) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!active || target === 0) return;
    const steps = 40;
    const stepTime = duration / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += 1;
      setCount(Math.round((current / steps) * target));
      if (current >= steps) {
        setCount(target);
        clearInterval(timer);
      }
    }, stepTime);
    return () => clearInterval(timer);
  }, [target, duration, active]);
  return count;
}

function StatsSection({ profileCount }: { profileCount: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const animatedCount = useCountUp(profileCount, 1200, visible);

  return (
    <section ref={ref} className="py-16 border-y border-white/[0.04]">
      <div className="max-w-5xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={visible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center"
        >
          {[
            { val: "100%", label: "Free to use" },
            { val: "∞", label: "Customization" },
            { val: "5s", label: "Setup time" },
          ].map(s => (
            <div key={s.label}>
              <p className="text-3xl md:text-4xl font-extrabold text-orange-500 mb-1" style={{ fontFamily: "var(--font-display)" }}>{s.val}</p>
              <p className="text-xs text-gray-600 font-medium tracking-widest uppercase">{s.label}</p>
            </div>
          ))}
          <div>
            <p className="text-3xl md:text-4xl font-extrabold text-orange-500 mb-1" style={{ fontFamily: "var(--font-display)" }}>
              {visible ? animatedCount : 0}
            </p>
            <p className="text-xs text-gray-600 font-medium tracking-widest uppercase">Profiles Created</p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

const QUICK_QUESTIONS = [
  "How do I change my background?",
  "How do I add music?",
  "Where can I change my avatar?",
  "How do I get Premium?",
];

type AiMessage = { role: "user" | "assistant"; content: string; showSupportBtn?: boolean };
type SupportMsg = { id: number; senderType: string; senderName: string | null; senderAvatar: string | null; content: string; createdAt: string };

function SupportChat() {
  const { user } = useAuth();
  const qc = useQueryClient();

  // ─── AI mode state ─────────────────────────────────────────────
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"ai" | "discord-prompt" | "support" | "history">("ai");
  const [messages, setMessages] = useState<AiMessage[]>([
    { role: "assistant", content: "Hey! I'm Hex 👋 How can I help you with your profile today?" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  // ─── Support ticket state ──────────────────────────────────────
  const [ticketId, setTicketId] = useState<number | null>(null);
  const [supportMsgs, setSupportMsgs] = useState<SupportMsg[]>([]);
  const [supportInput, setSupportInput] = useState("");
  const [sendingSupport, setSendingSupport] = useState(false);

  // ─── Ticket history state ──────────────────────────────────────
  const [myTickets, setMyTickets] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // ─── Draggable state ───────────────────────────────────────────
  const [pos, setPos] = useState({ x: 0, y: 0 }); // offset from default (bottom-right)
  const [dragging, setDragging] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const dragStart = useRef<{ mx: number; my: number; px: number; py: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const supportBottomRef = useRef<HTMLDivElement>(null);

  // ─── Scroll to bottom ─────────────────────────────────────────
  useEffect(() => {
    if (open) {
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
        supportBottomRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 50);
    }
  }, [messages, open, supportMsgs]);

  // ─── Poll for support messages ─────────────────────────────────
  useEffect(() => {
    if (mode !== "support" || !ticketId) return;
    const poll = async () => {
      try {
        const res = await fetch(`/api/tickets/${ticketId}/messages`, { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          setSupportMsgs(data.messages || []);
        }
      } catch (_) {}
    };
    poll();
    const interval = setInterval(poll, 3000);
    return () => clearInterval(interval);
  }, [mode, ticketId]);

  // ─── Drag handlers ─────────────────────────────────────────────
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("button, input, form, textarea")) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    dragStart.current = { mx: e.clientX, my: e.clientY, px: pos.x, py: pos.y };
  }, [pos]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging || !dragStart.current) return;
    const dx = e.clientX - dragStart.current.mx;
    const dy = e.clientY - dragStart.current.my;
    setPos({ x: dragStart.current.px + dx, y: dragStart.current.py + dy });
  }, [dragging]);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    if (!dragging) return;
    setDragging(false);
    // Check if near left or right edge — expand if within 120px of edge
    const winW = window.innerWidth;
    const rightEdge = winW - 24; // default right-6 position
    const curRight = rightEdge + pos.x; // actual right position
    if (curRight < 140 || curRight > winW - 140) {
      setExpanded(true);
    }
    dragStart.current = null;
  }, [dragging, pos]);

  // ─── Send AI message ───────────────────────────────────────────
  async function sendAiMessage(text: string) {
    if (!text.trim() || loading) return;
    const userMsg: AiMessage = { role: "user", content: text.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages.map(m => ({ role: m.role, content: m.content })) }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, {
        role: "assistant",
        content: data.reply || "Sorry, I couldn't get a response. Try again!",
        showSupportBtn: true,
      }]);
    } catch {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Something went wrong. Please try again.",
        showSupportBtn: true,
      }]);
    } finally {
      setLoading(false);
    }
  }

  // ─── Open support (after clicking "Get help") ──────────────────
  function openSupportFlow() {
    if (!user) {
      window.location.href = "/login";
      return;
    }
    if (!(user as any).discordId) {
      setMode("discord-prompt");
      return;
    }
    setMode("support");
  }

  // ─── Create ticket ─────────────────────────────────────────────
  async function createTicket() {
    const msg = input.trim() || "Hi, I need help with something the AI couldn't answer.";
    setSendingSupport(true);
    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ firstMessage: msg }),
      });
      if (res.ok) {
        const ticket = await res.json();
        setTicketId(ticket.id);
        setSupportInput("");
        setInput("");
      }
    } catch (_) {}
    setSendingSupport(false);
  }

  // ─── Load ticket history ───────────────────────────────────────
  async function loadHistory() {
    setHistoryLoading(true);
    try {
      const res = await fetch("/api/tickets/mine", { credentials: "include" });
      if (res.ok) setMyTickets(await res.json());
    } catch (_) {}
    setHistoryLoading(false);
  }

  // ─── Resume a past ticket ──────────────────────────────────────
  async function resumeTicket(id: number) {
    setTicketId(id);
    setMode("support");
    try {
      const res = await fetch(`/api/tickets/${id}/messages`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setSupportMsgs(data.messages || []);
      }
    } catch (_) {}
  }

  // ─── Send support message ──────────────────────────────────────
  async function sendSupportMessage() {
    if (!supportInput.trim() || !ticketId || sendingSupport) return;
    setSendingSupport(true);
    try {
      await fetch(`/api/tickets/${ticketId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content: supportInput.trim() }),
      });
      setSupportInput("");
      const res = await fetch(`/api/tickets/${ticketId}/messages`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setSupportMsgs(data.messages || []);
      }
    } catch (_) {}
    setSendingSupport(false);
  }

  // ─── Widget dimensions ─────────────────────────────────────────
  const chatW = expanded ? 420 : 320;
  const chatH = expanded ? 520 : 400;

  return (
    <div
      ref={containerRef}
      className="fixed z-[100]"
      style={{
        bottom: 24 - pos.y,
        right: 24 - pos.x,
        cursor: dragging ? "grabbing" : "auto",
        userSelect: "none",
      }}
    >
      <div className="flex flex-col items-end gap-3">
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 12 }}
              transition={{ duration: 0.2 }}
              style={{
                width: chatW,
                background: "rgba(10,10,10,0.97)",
                backdropFilter: "blur(20px)",
              }}
              className="rounded-2xl border border-white/[0.08] overflow-hidden shadow-2xl transition-all duration-300"
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
            >
              {/* ─── Header ─────────────────── */}
              <div
                className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] cursor-grab active:cursor-grabbing"
                style={{ background: "rgba(249,115,22,0.08)" }}
              >
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-orange-500/20 border border-orange-500/40 flex items-center justify-center">
                    {mode === "support" ? <Headphones className="w-3 h-3 text-orange-400" /> : <Bot className="w-3 h-3 text-orange-400" />}
                  </div>
                  <span className="text-xs font-bold text-white">
                    {mode === "support" ? "Live Support" : "Hex AI Support"}
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setExpanded(e => !e)}
                    className="text-gray-600 hover:text-white transition-colors"
                    title="Expand / Shrink"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                  </button>
                  {(user as any)?.discordId && mode !== "history" && (
                    <button
                      onClick={() => { setMode("history"); loadHistory(); }}
                      className="text-gray-600 hover:text-orange-400 transition-colors"
                      title="Ticket History"
                    >
                      <Clock className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {mode !== "ai" && (
                    <button onClick={() => { setMode("ai"); setTicketId(null); setSupportMsgs([]); }} className="text-gray-600 hover:text-orange-400 transition-colors text-[10px] font-bold">
                      AI
                    </button>
                  )}
                  <button onClick={() => setOpen(false)} className="text-gray-600 hover:text-white transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* ─── Discord prompt ────────── */}
              {mode === "discord-prompt" && (
                <div className="px-5 py-8 flex flex-col items-center gap-4 text-center">
                  <div className="w-12 h-12 rounded-full bg-[#5865F2]/20 border border-[#5865F2]/40 flex items-center justify-center">
                    <SiDiscord className="w-6 h-6 text-[#7289da]" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white mb-1">Login with Discord</p>
                    <p className="text-[12px] text-gray-400 leading-relaxed">
                      Hey! To assist you manually by our support you will need to login with Discord first.
                    </p>
                  </div>
                  <a
                    href={user ? "/auth/discord/link" : "/auth/discord"}
                    className="flex items-center gap-2 px-5 py-2.5 bg-[#5865F2] hover:bg-[#4752c4] text-white text-xs font-bold rounded-xl transition-colors"
                  >
                    <SiDiscord className="w-4 h-4" />
                    Connect Discord
                  </a>
                  <button onClick={() => setMode("ai")} className="text-[11px] text-gray-600 hover:text-gray-400 transition-colors">
                    Back to AI
                  </button>
                </div>
              )}

              {/* ─── Ticket history ───────── */}
              {mode === "history" && (
                <div style={{ height: chatH - 60 }} className="overflow-y-auto">
                  <div className="px-4 py-3 border-b border-white/[0.05] flex items-center justify-between">
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Your Tickets</span>
                    <button
                      onClick={loadHistory}
                      disabled={historyLoading}
                      className="text-gray-600 hover:text-orange-400 transition-colors"
                      title="Refresh"
                    >
                      <RefreshCw className={`w-3 h-3 ${historyLoading ? "animate-spin" : ""}`} />
                    </button>
                  </div>
                  {historyLoading && (
                    <div className="flex justify-center py-8">
                      <div className="flex gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    </div>
                  )}
                  {!historyLoading && myTickets.length === 0 && (
                    <div className="text-center py-10 px-4">
                      <Headphones className="w-8 h-8 mx-auto mb-2 text-gray-700" />
                      <p className="text-sm text-gray-600 font-bold">No tickets yet</p>
                      <p className="text-[11px] text-gray-700 mt-1">Open a support ticket from the AI chat.</p>
                    </div>
                  )}
                  {!historyLoading && myTickets.map((t: any) => (
                    <button
                      key={t.id}
                      onClick={() => resumeTicket(t.id)}
                      className="w-full text-left px-4 py-3 border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[12px] font-bold text-white truncate">Ticket #{t.id}</span>
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full shrink-0 ${
                          t.status === "open" ? "bg-green-500/10 text-green-400 border border-green-500/20" :
                          t.status === "closed" ? "bg-red-500/10 text-red-400 border border-red-500/20" :
                          "bg-orange-500/10 text-orange-400 border border-orange-500/20"
                        }`}>
                          {t.status.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-600 mt-0.5">
                        {t.claimedByDiscordUsername ? `Claimed by ${t.claimedByDiscordUsername}` : "Awaiting agent"}
                        {" · "}
                        {new Date(t.updatedAt || t.createdAt).toLocaleDateString()}
                      </p>
                      <p className="text-[10px] text-orange-500/70 mt-1 flex items-center gap-1">
                        <MessageSquare className="w-2.5 h-2.5" /> Continue conversation
                      </p>
                    </button>
                  ))}
                </div>
              )}

              {/* ─── Support chat ─────────── */}
              {mode === "support" && (
                <>
                  {!ticketId ? (
                    <div className="px-5 py-8 flex flex-col items-center gap-4 text-center">
                      <div className="w-12 h-12 rounded-full bg-orange-500/10 border border-orange-500/30 flex items-center justify-center">
                        <Headphones className="w-6 h-6 text-orange-400" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white mb-1">Open Support Ticket</p>
                        <p className="text-[12px] text-gray-400 leading-relaxed">
                          A support agent will assist you shortly. Describe your issue below.
                        </p>
                      </div>
                      <textarea
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        placeholder="Describe your issue..."
                        rows={3}
                        className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-[12px] text-white placeholder-gray-600 outline-none resize-none"
                      />
                      <button
                        onClick={createTicket}
                        disabled={sendingSupport}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-colors"
                      >
                        {sendingSupport ? "Opening..." : "Open Ticket"}
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div style={{ height: chatH - 110 }} className="overflow-y-auto px-3 py-3 flex flex-col gap-2">
                        {supportMsgs.map((m) => (
                          <div key={m.id}>
                            {m.senderType === "system" ? (
                              <div className="flex justify-center my-1">
                                <span className="text-[10px] text-gray-600 bg-white/[0.03] px-3 py-1 rounded-full border border-white/[0.05]">
                                  {m.content}
                                </span>
                              </div>
                            ) : (
                              <div className={`flex ${m.senderType === "user" ? "justify-end" : "justify-start"} items-end gap-1.5`}>
                                {m.senderType === "support" && (
                                  <div className="w-5 h-5 rounded-full overflow-hidden bg-orange-500/20 flex items-center justify-center shrink-0 mb-0.5">
                                    {m.senderAvatar ? (
                                      <img src={m.senderAvatar} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                      <Headphones className="w-2.5 h-2.5 text-orange-400" />
                                    )}
                                  </div>
                                )}
                                <div className="flex flex-col gap-0.5 max-w-[80%]">
                                  {m.senderType !== "user" && (
                                    <span className="text-[10px] text-gray-600 px-1">{m.senderName}</span>
                                  )}
                                  <div
                                    className={`px-3 py-2 rounded-xl text-[12px] leading-relaxed ${
                                      m.senderType === "user"
                                        ? "bg-orange-500 text-white rounded-br-sm"
                                        : "bg-white/[0.06] text-gray-200 border border-white/[0.06] rounded-bl-sm"
                                    }`}
                                  >
                                    {m.content}
                                  </div>
                                </div>
                                {m.senderType === "user" && (
                                  <div className="w-5 h-5 rounded-full overflow-hidden shrink-0 mb-0.5">
                                    {(user as any)?.discordAvatar ? (
                                      <img src={(user as any).discordAvatar} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                      <div className="w-full h-full bg-orange-500/30 flex items-center justify-center">
                                        <span className="text-[8px] text-orange-400 font-bold">U</span>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                        <div ref={supportBottomRef} />
                      </div>
                      <div className="px-3 pb-3 pt-1 border-t border-white/[0.05]">
                        <form
                          onSubmit={e => { e.preventDefault(); sendSupportMessage(); }}
                          className="flex gap-2 items-center bg-white/[0.04] border border-white/[0.07] rounded-xl px-3 py-2"
                        >
                          <input
                            value={supportInput}
                            onChange={e => setSupportInput(e.target.value)}
                            placeholder="Type a message..."
                            className="flex-1 bg-transparent text-[12px] text-white placeholder-gray-600 outline-none"
                          />
                          <button
                            type="submit"
                            disabled={!supportInput.trim() || sendingSupport}
                            className="text-orange-500 hover:text-orange-400 disabled:opacity-30 transition-colors"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>
                        </form>
                      </div>
                    </>
                  )}
                </>
              )}

              {/* ─── AI chat ──────────────── */}
              {mode === "ai" && (
                <>
                  <div style={{ height: chatH - 110 }} className="overflow-y-auto px-3 py-3 flex flex-col gap-2">
                    {messages.map((m, i) => (
                      <div key={i}>
                        <div className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                          <div
                            className={`max-w-[85%] px-3 py-2 rounded-xl text-[12px] leading-relaxed ${
                              m.role === "user"
                                ? "bg-orange-500 text-white rounded-br-sm"
                                : "bg-white/[0.06] text-gray-200 border border-white/[0.06] rounded-bl-sm"
                            }`}
                          >
                            {m.content}
                          </div>
                        </div>
                        {m.role === "assistant" && m.showSupportBtn && (
                          <div className="flex justify-start mt-1.5 ml-1">
                            <button
                              onClick={openSupportFlow}
                              className="text-[10px] flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#5865F2]/30 bg-[#5865F2]/10 text-[#7289da] hover:bg-[#5865F2]/20 transition-colors"
                              data-testid="button-get-human-support"
                            >
                              <Headphones className="w-3 h-3" />
                              AI Not helping? Get help by our Support
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                    {loading && (
                      <div className="flex justify-start">
                        <div className="bg-white/[0.06] border border-white/[0.06] px-3 py-2 rounded-xl rounded-bl-sm flex gap-1 items-center">
                          <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                          <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                          <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                        </div>
                      </div>
                    )}
                    <div ref={bottomRef} />
                  </div>

                  {messages.length <= 1 && (
                    <div className="px-3 pb-2 flex flex-wrap gap-1.5">
                      {QUICK_QUESTIONS.map(q => (
                        <button
                          key={q}
                          onClick={() => sendAiMessage(q)}
                          className="text-[10px] px-2.5 py-1 rounded-full border border-orange-500/30 text-orange-400 hover:bg-orange-500/10 transition-colors"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="px-3 pb-3 pt-1 border-t border-white/[0.05]">
                    <form
                      onSubmit={e => { e.preventDefault(); sendAiMessage(input); }}
                      className="flex gap-2 items-center bg-white/[0.04] border border-white/[0.07] rounded-xl px-3 py-2"
                    >
                      <input
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        placeholder="Ask anything..."
                        className="flex-1 bg-transparent text-[12px] text-white placeholder-gray-600 outline-none"
                        data-testid="input-ai-chat"
                      />
                      <button
                        type="submit"
                        disabled={!input.trim() || loading}
                        className="text-orange-500 hover:text-orange-400 disabled:opacity-30 transition-colors"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </form>
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          onClick={() => setOpen(o => !o)}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
          className="w-11 h-11 rounded-full flex items-center justify-center shadow-lg border border-orange-500/30 relative"
          style={{ background: "rgba(10,10,10,0.92)", backdropFilter: "blur(12px)" }}
          data-testid="button-support-chat"
        >
          <AnimatePresence mode="wait">
            {open ? (
              <motion.div key="close" initial={{ opacity: 0, rotate: -90 }} animate={{ opacity: 1, rotate: 0 }} exit={{ opacity: 0, rotate: 90 }} transition={{ duration: 0.15 }}>
                <X className="w-4 h-4 text-orange-400" />
              </motion.div>
            ) : (
              <motion.div key="open" initial={{ opacity: 0, rotate: 90 }} animate={{ opacity: 1, rotate: 0 }} exit={{ opacity: 0, rotate: -90 }} transition={{ duration: 0.15 }}>
                <MessageCircle className="w-4 h-4 text-orange-400" />
              </motion.div>
            )}
          </AnimatePresence>
          {!open && (
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-orange-500 border-2 border-[#0a0a0a]" />
          )}
        </motion.button>
      </div>
    </div>
  );
}

const AF_KEY = "hexed_af_seen";

function markAfSeen() {
  try { localStorage.setItem(AF_KEY, "1"); } catch (_) {}
}

function isAfSeen() {
  try { return localStorage.getItem(AF_KEY) === "1"; } catch (_) { return false; }
}

function AprilFoolsShutdown({ onReveal, onSkip }: { onReveal: () => void; onSkip: () => void }) {
  const [dotIdx, setDotIdx] = useState(0);
  const DOTS = [".", "..", "..."];

  useEffect(() => {
    const dotTimer = setInterval(() => {
      setDotIdx(i => (i + 1) % 3);
    }, 500);
    const revealTimer = setTimeout(() => {
      clearInterval(dotTimer);
      onReveal();
    }, 5000);
    return () => {
      clearInterval(dotTimer);
      clearTimeout(revealTimer);
    };
  }, [onReveal]);

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 select-none">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-lg text-center space-y-8"
      >
        <div className="space-y-3">
          <h1 className="text-3xl font-black text-white tracking-tight">Hexed is Shutdown.</h1>
          <p className="text-lg font-bold text-gray-400">100% permanent{DOTS[dotIdx]}</p>
        </div>

        <p className="text-[10px] text-gray-700 font-mono">
          hex<span className="text-orange-500">ed</span>
        </p>

        <button
          onClick={onSkip}
          className="text-[11px] text-gray-700 hover:text-gray-500 transition-colors"
        >
          Skip
        </button>
      </motion.div>
    </div>
  );
}

function AprilFoolsReveal({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 select-none">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-lg text-center space-y-8"
      >
        <div className="space-y-4">
          <p className="text-[11px] font-black uppercase tracking-[0.25em] text-orange-500">
            April Fools
          </p>
          <h1 className="text-3xl font-black text-white tracking-tight">
            Hexed will never stop.
          </h1>
          <p className="text-gray-500 text-sm leading-relaxed max-w-sm mx-auto">
            We will keep going. Enjoy the new update.
          </p>
        </div>

        <button
          onClick={onDismiss}
          className="inline-flex items-center gap-2 px-7 py-3 rounded-xl text-sm font-black text-white border border-orange-500/30 hover:border-orange-500 hover:bg-orange-500/10 transition-all"
          style={{ background: "rgba(249,115,22,0.08)" }}
        >
          Go to Homepage
        </button>

        <p className="text-[10px] text-gray-700 font-mono">
          hex<span className="text-orange-500">ed</span>
        </p>
      </motion.div>
    </div>
  );
}

export default function Landing() {
  const { user } = useAuth();
  const { data: countData } = useQuery<{ count: number }>({ queryKey: ["/api/public/user-count"] });
  const { data: trendingData } = useQuery<any[]>({ queryKey: ["/api/public/trending"] });
  const { data: risingData } = useQuery<any[]>({ queryKey: ["/api/public/rising"] });
  const { data: registeredTodayData } = useQuery<{ count: number }>({ queryKey: ["/api/public/registered-today"] });
  const profileCount = countData?.count ?? 0;
  const trending = trendingData || [];

  // ── April Fools ──
  const { data: aprilFoolsData } = useQuery<{ enabled: boolean }>({
    queryKey: ["/api/april-fools"],
    staleTime: 10000,
  });
  // Start as "normal" — switch to shutdown only once data confirms enabled + never seen before
  const [afPhase, setAfPhase] = useState<"shutdown" | "reveal" | "normal">("normal");
  const [afTriggered, setAfTriggered] = useState(false);

  useEffect(() => {
    if (!aprilFoolsData?.enabled || afTriggered) return;
    if (isAfSeen()) return;
    setAfTriggered(true);
    setAfPhase("shutdown");
  }, [aprilFoolsData, afTriggered]);

  const [hexedClickCount, setHexedClickCount] = useState(0);
  const [shaking, setShaking] = useState(false);
  const [buttonsVisible, setButtonsVisible] = useState(true);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const handleHexedClick = useCallback(() => {
    setHexedClickCount(c => {
      const next = c + 1;
      if (next >= 5) {
        try {
          const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.connect(g); g.connect(ctx.destination);
          o.type = "sawtooth";
          o.frequency.setValueAtTime(440, ctx.currentTime);
          o.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.4);
          g.gain.setValueAtTime(0.3, ctx.currentTime);
          g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
          o.start(); o.stop(ctx.currentTime + 0.5);
        } catch (_) {}
        setShaking(true);
        setButtonsVisible(false);
        setTimeout(() => setShaking(false), 600);
        setTimeout(() => setButtonsVisible(true), 4000);
        return 0;
      }
      return next;
    });
  }, []);

  if (afPhase === "shutdown") return (
    <AprilFoolsShutdown
      onReveal={() => { markAfSeen(); setAfPhase("reveal"); }}
      onSkip={() => { markAfSeen(); setAfPhase("normal"); }}
    />
  );
  if (afPhase === "reveal") return (
    <AprilFoolsReveal onDismiss={() => { markAfSeen(); setAfPhase("normal"); }} />
  );

  return (
    <div
      className="min-h-screen bg-[#030303] text-white overflow-x-hidden"
      style={{ fontFamily: "var(--font-body)", animation: shaking ? "hexed-shake 0.5s ease-in-out" : undefined }}
    >
      <style>{`
        @keyframes marquee-rtl {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
        @keyframes hexed-shake {
          0%, 100% { transform: translateX(0); }
          10% { transform: translateX(-6px) rotate(-0.5deg); }
          20% { transform: translateX(6px) rotate(0.5deg); }
          30% { transform: translateX(-5px); }
          40% { transform: translateX(5px); }
          50% { transform: translateX(-4px); }
          60% { transform: translateX(4px); }
          70% { transform: translateX(-2px); }
          80% { transform: translateX(2px); }
          90% { transform: translateX(-1px); }
        }
      `}</style>

      {/* ─── Nav ───────────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.04]" style={{ background: "rgba(3,3,3,0.85)", backdropFilter: "blur(20px)" }}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <span
            className="text-2xl font-extrabold text-orange-500 tracking-tight cursor-pointer select-none"
            style={{ fontFamily: "var(--font-display)" }}
            onClick={handleHexedClick}
            title={hexedClickCount > 0 ? `${5 - hexedClickCount} more...` : undefined}
          >Hexed</span>
          <div className="flex items-center gap-2">
            <a href="/help" className="hidden sm:block text-xs font-semibold text-gray-400 hover:text-white transition-colors px-4 py-2 rounded-lg hover:bg-white/5">Help</a>
            <a href="/shop" className="hidden sm:block text-xs font-semibold text-gray-400 hover:text-white transition-colors px-4 py-2 rounded-lg hover:bg-white/5">Shop</a>
            {user ? (
              <a href="/dashboard" className="text-xs font-semibold bg-orange-500 text-black hover:bg-white hover:text-black transition-all px-4 py-2 rounded-lg">
                Dashboard
              </a>
            ) : (
              <>
                <AnimatePresence>
                  {buttonsVisible && (
                    <motion.a
                      href="/login"
                      key="login-btn"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.4 }}
                      className="text-xs font-semibold text-gray-400 hover:text-white hover:bg-white/5 transition-colors px-4 py-2 rounded-lg border border-white/10 hover:border-white/20"
                    >
                      Login
                    </motion.a>
                  )}
                </AnimatePresence>
                <AnimatePresence>
                  {buttonsVisible && (
                    <motion.a
                      href="/register"
                      key="register-btn"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.4, delay: 0.05 }}
                      className="text-xs font-semibold bg-orange-500 text-black hover:bg-white hover:text-black border border-orange-500 hover:border-white transition-all px-4 py-2 rounded-lg"
                    >
                      Get started
                    </motion.a>
                  )}
                </AnimatePresence>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ─── Hero ──────────────────────────────────────────────────── */}
      <section className="relative pt-36 pb-20 px-6 flex flex-col items-center text-center overflow-hidden">
        {/* Aurora Background */}
        <div className="absolute top-0 left-0 right-0 pointer-events-none overflow-hidden" style={{ height: "60%", opacity: 0.55 }}>
          <Aurora
            colorStops={["#ff9c66", "#ff4000", "#ff4929"]}
            amplitude={0.8}
            blend={0.4}
            speed={0.4}
          />
          {/* Fade out at the bottom */}
          <div className="absolute bottom-0 left-0 right-0 h-40" style={{ background: "linear-gradient(to bottom, transparent, #030303)" }} />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 max-w-4xl mx-auto"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-orange-500/30 bg-orange-500/10 text-[11px] font-bold text-orange-400 tracking-wide mb-10 shadow-lg shadow-orange-500/10"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
            Free to use · No credit card
          </motion.div>

          <h1
            className="text-6xl sm:text-7xl md:text-8xl font-extrabold leading-[0.9] mb-8 tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            The #1 bio page
            <br />
            <span style={{ background: "linear-gradient(135deg, #F97316 0%, #fb923c 50%, #fdba74 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}> for you.</span>
          </h1>

          <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed font-normal">
            Your entire online presence, one link. Music, links, badges, and a profile that actually looks like you.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2 mb-12">
            {[
              { label: "Upload your Music", icon: "" },
              { label: "Custom Themes", icon: "" },
              { label: "Profile Effects", icon: "" },
              { label: "Earn Badges", icon: "" },
              { label: "Full Customization", icon: "" },
            ].map(f => (
              <span key={f.label} className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.10] text-[11px] font-semibold text-gray-300 hover:border-orange-500/30 hover:text-orange-400 transition-colors duration-200">
                <span>{f.icon}</span> {f.label}
              </span>
            ))}
          </div>

          {registeredTodayData && registeredTodayData.count > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-[11px] font-semibold text-gray-400 mb-6"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span><strong className="text-white">{registeredTodayData.count}</strong> people joined today. Grab your username while it's still available.</span>
            </motion.div>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 min-h-[64px]">
            <AnimatePresence>
              {buttonsVisible && (
                <motion.a
                  key="hero-login"
                  href={user ? "/dashboard" : "/login"}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.4 }}
                  className="group flex items-center gap-2.5 px-8 py-4 bg-orange-500 text-white font-bold rounded-2xl hover:bg-white hover:text-black transition-all text-sm shadow-xl shadow-orange-500/20"
                >
                  {user ? "Dashboard" : "Login"}
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </motion.a>
              )}
            </AnimatePresence>
            <AnimatePresence>
              {buttonsVisible && (
                <motion.a
                  key="hero-shop"
                  href="/shop"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.4, delay: 0.05 }}
                  className="flex items-center gap-2.5 px-8 py-4 bg-white/5 text-white font-semibold rounded-2xl border border-white/10 hover:bg-white hover:text-black hover:border-white transition-all text-sm"
                >
                  <ShoppingBag className="w-4 h-4" />
                  Visit Shop
                </motion.a>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </section>

      {/* ─── Trending Profiles ──────────────────────────────────────── */}
      <section className="py-14">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 28, filter: "blur(10px)" }}
            whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
            className="text-center mb-10"
          >
            <p className="text-[11px] font-semibold uppercase tracking-widest text-orange-500/70 mb-2">Discover</p>
            <h2 className="text-3xl font-extrabold" style={{ fontFamily: "var(--font-display)" }}>Trending Profiles</h2>
            <p className="text-gray-600 text-sm mt-2">Most popular profiles right now</p>
          </motion.div>
          {trending.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {trending.map((m: any) => (
                <a
                  key={m.id}
                  href={`/${m.username}`}
                  className="relative flex flex-col items-center gap-2.5 p-4 rounded-2xl border border-white/[0.06] hover:border-orange-500/40 hover:bg-white/[0.03] transition-all duration-300 group cursor-pointer"
                >
                  {m.isPremium && (
                    <div className="absolute top-2 right-2 text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-400">
                      💎
                    </div>
                  )}
                  <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 flex items-center justify-center bg-white/5 shrink-0"
                    style={{ borderColor: m.themeColor + "55" }}>
                    {m.avatarUrl
                      ? <img src={m.avatarUrl.startsWith("/objects/") ? `${window.location.origin}${m.avatarUrl}` : m.avatarUrl} alt={m.displayName} className="w-full h-full object-cover" />
                      : <span className="text-xl font-black" style={{ color: m.themeColor }}>{(m.displayName || m.username)[0]?.toUpperCase()}</span>
                    }
                  </div>
                  <div className="text-center w-full min-w-0">
                    <p className="text-[11px] font-bold text-white group-hover:text-orange-400 transition-colors leading-tight truncate">{m.displayName || m.username}</p>
                    <p className="text-[9px] text-gray-600 mt-0.5 truncate">/{m.username}</p>
                    <div className="flex items-center justify-center gap-2 mt-1.5">
                      <span className="text-[9px] text-gray-600 flex items-center gap-0.5">
                        <span className="text-gray-500">👁</span> {m.views?.toLocaleString() || 0}
                      </span>
                      {m.likes > 0 && (
                        <span className="text-[9px] text-pink-500/80 flex items-center gap-0.5">
                          ❤ {m.likes}
                        </span>
                      )}
                    </div>
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <div className="flex justify-center items-center py-8">
              <p className="text-gray-600 text-sm">No profiles yet. Be the first!</p>
            </div>
          )}
        </div>
      </section>

      {/* ─── Rising Profiles ─────────────────────────────────────── */}
      {risingData && risingData.length > 0 && (
        <section className="py-14">
          <div className="max-w-6xl mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 28, filter: "blur(10px)" }}
              whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
              className="text-center mb-10"
            >
              <p className="text-[11px] font-semibold uppercase tracking-widest text-green-500/70 mb-2">On the Rise</p>
              <h2 className="text-3xl font-extrabold" style={{ fontFamily: "var(--font-display)" }}>Rising Profiles</h2>
              <p className="text-gray-600 text-sm mt-2">Fast-growing newcomers to watch</p>
            </motion.div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-3">
              {risingData.map((m: any) => (
                <a
                  key={m.id}
                  href={`/${m.username}`}
                  className="relative flex items-center gap-3 p-4 rounded-2xl border border-white/[0.06] hover:border-green-500/40 hover:bg-white/[0.03] transition-all duration-300 group cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-xl overflow-hidden border flex items-center justify-center bg-white/5 shrink-0"
                    style={{ borderColor: m.themeColor + "55" }}>
                    {m.avatarUrl
                      ? <img src={m.avatarUrl.startsWith("/objects/") ? `${window.location.origin}${m.avatarUrl}` : m.avatarUrl} alt={m.displayName} className="w-full h-full object-cover" />
                      : <span className="text-lg font-black" style={{ color: m.themeColor }}>{(m.displayName || m.username)[0]?.toUpperCase()}</span>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold text-white group-hover:text-green-400 transition-colors leading-tight truncate">{m.displayName || m.username}</p>
                    <p className="text-[9px] text-gray-600 truncate">/{m.username}</p>
                    <p className="text-[9px] text-green-500/80 mt-0.5 flex items-center gap-0.5">↑ {m.views} views</p>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── Stats ─────────────────────────────────────────────────── */}
      <StatsSection profileCount={profileCount} />

      {/* ─── How it works ──────────────────────────────────────────── */}
      <section className="py-24 px-6 border-y border-white/[0.04]">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 28, filter: "blur(10px)" }}
            whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
            className="text-center mb-16"
          >
            <p className="text-[11px] font-bold uppercase tracking-widest text-orange-500/70 mb-3">Simple</p>
            <h2 className="text-5xl font-extrabold" style={{ fontFamily: "var(--font-display)" }}>Up in seconds.</h2>
            <p className="text-gray-600 text-sm mt-3 max-w-xs mx-auto">Three steps and your page is live. No configuration required.</p>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-5">
            {[
              {
                step: "01",
                title: "Create your account",
                desc: "Sign up with a username and password. No credit card required, no hoops to jump through.",
                color: "#F97316",
                icon: "✦",
              },
              {
                step: "02",
                title: "Build your profile",
                desc: "Add your avatar, bio, links, and pick a theme. Every detail is yours to control.",
                color: "#a855f7",
                icon: "◈",
              },
              {
                step: "03",
                title: "Share it",
                desc: "Your page lives at hexed.at/username. Put it in your bio, your socials, anywhere.",
                color: "#3b82f6",
                icon: "⊹",
              },
            ].map((s, i) => (
              <motion.div
                key={s.step}
                initial={{ opacity: 0, y: 32, filter: "blur(8px)" }}
                whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ delay: i * 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                className="relative group"
              >
                {/* Connector line (not on last card) */}
                {i < 2 && (
                  <div className="hidden md:block absolute top-10 left-full w-5 z-10 pointer-events-none">
                    <div className="h-px w-full mt-px" style={{ background: `linear-gradient(90deg, ${s.color}40, transparent)` }} />
                  </div>
                )}
                <div
                  className="relative overflow-hidden rounded-2xl border transition-all duration-300 h-full"
                  style={{
                    borderColor: `${s.color}18`,
                    background: `linear-gradient(145deg, ${s.color}08 0%, rgba(0,0,0,0) 60%)`,
                  }}
                >
                  {/* Top accent bar */}
                  <div className="h-[2px] w-full" style={{ background: `linear-gradient(90deg, ${s.color}60, transparent)` }} />

                  {/* Glow on hover */}
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-2xl"
                    style={{ background: `radial-gradient(ellipse at 30% 20%, ${s.color}10 0%, transparent 65%)` }}
                  />

                  <div className="p-7">
                    {/* Step badge + icon */}
                    <div className="flex items-center justify-between mb-6">
                      <div
                        className="flex items-center gap-2 px-2.5 py-1 rounded-lg text-[11px] font-black tracking-widest"
                        style={{ background: `${s.color}15`, color: s.color }}
                      >
                        <span>{s.icon}</span>
                        <span>STEP {s.step}</span>
                      </div>
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black opacity-20 group-hover:opacity-60 transition-opacity duration-300"
                        style={{ background: s.color, color: "#000" }}
                      >
                        {parseInt(s.step)}
                      </div>
                    </div>

                    {/* Big number watermark */}
                    <div
                      className="absolute -bottom-3 -right-2 text-[88px] font-extrabold select-none pointer-events-none leading-none opacity-[0.04] group-hover:opacity-[0.07] transition-opacity duration-300"
                      style={{ color: s.color, fontFamily: "var(--font-display)" }}
                    >
                      {s.step}
                    </div>

                    <h3
                      className="font-extrabold text-lg mb-3 text-white"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      {s.title}
                    </h3>
                    <p className="text-[13px] text-gray-500 leading-relaxed">{s.desc}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FAQ ────────────────────────────────────────────────────── */}
      <section className="py-20 px-6">
        <div className="max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 24, filter: "blur(10px)" }}
            whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="text-center mb-10"
          >
            <p className="text-[11px] font-bold uppercase tracking-widest text-orange-500/70 mb-3">Got Questions</p>
            <h2 className="text-4xl font-extrabold" style={{ fontFamily: "var(--font-display)" }}>FAQ</h2>
          </motion.div>
          <div className="space-y-2">
            {[
              {
                q: "What is Hexed?",
                a: "Hexed is a free bio page platform. You get a personal page at hexed.at/yourname where you can share your links, bio, music, and avatar with a style that's entirely yours.",
              },
              {
                q: "Is Hexed free?",
                a: "Yes, completely free to sign up and use. A Premium plan (€2.49 one-time) unlocks additional features like no watermark, more music tracks, advanced effects, and a Premium badge.",
              },
              {
                q: "What can I customize?",
                a: "Almost everything: your avatar, banner, background image or video, bio, theme color, link layout, username style, visual effects, and more. If you can think of it, you can probably change it.",
              },
              {
                q: "How do I get my page live?",
                a: "Create an account, fill in your details in the Dashboard, and your page is instantly live at hexed.at/yourusername. There is no waiting period or approval process.",
              },
            ].map((item, i) => {
              const isOpen = openFaq === i;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 16, filter: "blur(6px)" }}
                  whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ delay: i * 0.07, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden rounded-2xl"
                >
                  <motion.button
                    onClick={() => setOpenFaq(isOpen ? null : i)}
                    whileTap={{ scale: 0.985 }}
                    animate={{
                      borderColor: isOpen ? "rgba(249,115,22,0.3)" : "rgba(255,255,255,0.06)",
                      backgroundColor: isOpen ? "rgba(249,115,22,0.06)" : "rgba(255,255,255,0.02)",
                    }}
                    transition={{ duration: 0.2 }}
                    className="w-full flex items-center justify-between px-5 py-4 border text-left rounded-2xl"
                    style={{ borderRadius: isOpen ? "16px 16px 0 0" : 16 }}
                  >
                    <motion.span
                      animate={{ color: isOpen ? "#fff" : "rgba(255,255,255,0.85)" }}
                      transition={{ duration: 0.2 }}
                      className="font-bold text-sm"
                    >
                      {item.q}
                    </motion.span>
                    <motion.span
                      animate={{
                        rotate: isOpen ? 45 : 0,
                        borderColor: isOpen ? "rgba(249,115,22,0.6)" : "rgba(255,255,255,0.12)",
                        color: isOpen ? "#F97316" : "#4b5563",
                        backgroundColor: isOpen ? "rgba(249,115,22,0.12)" : "transparent",
                      }}
                      transition={{ type: "spring", stiffness: 400, damping: 25 }}
                      className="shrink-0 ml-4 w-5 h-5 rounded-full border flex items-center justify-center"
                    >
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M5 1v8M1 5h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    </motion.span>
                  </motion.button>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        key="answer"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ height: { type: "spring", stiffness: 300, damping: 30 }, opacity: { duration: 0.2 } }}
                        className="overflow-hidden"
                        style={{ borderLeft: "1px solid rgba(249,115,22,0.15)", borderRight: "1px solid rgba(249,115,22,0.15)", borderBottom: "1px solid rgba(249,115,22,0.15)", borderRadius: "0 0 16px 16px" }}
                      >
                        <motion.p
                          initial={{ y: -8 }}
                          animate={{ y: 0 }}
                          exit={{ y: -4 }}
                          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                          className="px-5 pt-3 pb-5 text-[13px] text-gray-500 leading-relaxed"
                        >
                          {item.a}
                        </motion.p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── Premium CTA ───────────────────────────────────────────── */}
      <section className="py-28 px-6">
        <motion.div
          initial={{ opacity: 0, y: 36, filter: "blur(10px)" }}
          whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-3xl mx-auto"
        >
          <div className="relative overflow-hidden rounded-3xl border border-orange-500/20 p-10 md:p-14 text-center" style={{ background: "linear-gradient(135deg, rgba(249,115,22,0.06) 0%, rgba(0,0,0,0) 60%)" }}>
            <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 50% -20%, rgba(249,115,22,0.12) 0%, transparent 60%)" }} />
            <p className="text-4xl mb-5">💎</p>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-600 text-white text-[11px] font-black uppercase tracking-widest mb-4">
              💎 Premium
            </div>
            <h2 className="text-4xl md:text-5xl font-extrabold mb-4" style={{ fontFamily: "var(--font-display)" }}>Go Premium</h2>
            <p className="text-gray-400 text-base mb-8 max-w-md mx-auto leading-relaxed">
              Remove the watermark, unlock more music tracks, access advanced effects, get priority placement in trending, and display a Premium badge on your profile.
            </p>
            <div className="flex items-baseline justify-center gap-3 mb-8">
              <span className="text-6xl font-extrabold text-orange-500" style={{ fontFamily: "var(--font-display)" }}>€2.49</span>
              <span className="text-gray-600 text-sm">one time</span>
            </div>
            <a
              href="/shop/premium"
              className="inline-flex items-center gap-2 px-8 py-4 bg-orange-500 text-white font-bold rounded-2xl hover:bg-white hover:text-black transition-all text-sm"
            >
              Get Premium <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </motion.div>
      </section>

      {/* ─── Footer ────────────────────────────────────────────────── */}
      <footer className="py-12 border-t border-white/[0.04]">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-lg font-extrabold text-orange-500" style={{ fontFamily: "var(--font-display)" }}>Hexed</span>
          <div className="flex items-center gap-6">
            <a href="/shop" className="text-xs text-gray-600 hover:text-gray-400 transition-colors">Shop</a>
            <a href="/login" className="text-xs text-gray-600 hover:text-gray-400 transition-colors">Login</a>
            <a href="/register" className="text-xs text-gray-600 hover:text-gray-400 transition-colors">Register</a>
            <a href="/tos" className="text-xs text-gray-600 hover:text-gray-400 transition-colors">Terms</a>
            <a href="/team" className="text-xs text-gray-600 hover:text-gray-400 transition-colors">Our Team</a>
            <a href="/changes" className="text-xs text-gray-600 hover:text-gray-400 transition-colors">Changes</a>
            <a href="/leaderboard" className="text-xs text-gray-600 hover:text-gray-400 transition-colors">Leaderboard</a>
            <a href="/help" className="text-xs text-gray-600 hover:text-gray-400 transition-colors">Help</a>
          </div>
          <p className="text-[11px] text-gray-700">© 2026 Hexed</p>
        </div>
      </footer>

      {/* ─── Support Chat ───────────────────────────────────────────── */}
      <SupportChat />
    </div>
  );
}
