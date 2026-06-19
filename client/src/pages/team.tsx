import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, ExternalLink, MoreHorizontal, Download, FileCode, Upload } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

const ROLE_ORDER: Record<string, number> = { Founder: 0, Manager: 1, Admin: 2, Staff: 3 };
const ROLE_LABELS: Record<string, string> = { Founder: "Founder", Manager: "Manager", Admin: "Admin", Staff: "Staff" };

function memberToEnv(member: any): string {
  const tags: string[] = Array.isArray(member.tags) ? member.tags : [];
  return [
    `NAME=${member.name || ""}`,
    `ROLE=${member.role || ""}`,
    `DESCRIPTION=${(member.description || "").replace(/\n/g, "\\n")}`,
    `COLOUR=${member.colour || "#F97316"}`,
    `DISCORD_USER=${member.discordUser || ""}`,
    `DISCORD_USER_ID=${member.discordUserId || ""}`,
    `PROFILE=${member.profile || ""}`,
    `AVATAR_URL=${member.avatarUrl || ""}`,
    `TAGS=${tags.join(",")}`,
    `SORT_ORDER=${member.sortOrder ?? 0}`,
  ].join("\n");
}

function parseEnv(envText: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of envText.split("\n")) {
    const eq = line.indexOf("=");
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim();
    const val = line.slice(eq + 1).replace(/\\n/g, "\n");
    if (key) result[key] = val;
  }
  return result;
}

function envToMember(env: Record<string, string>): any {
  return {
    name: env.NAME || "",
    role: env.ROLE || "",
    description: env.DESCRIPTION || "",
    colour: env.COLOUR || "#F97316",
    discordUser: env.DISCORD_USER || "",
    discordUserId: env.DISCORD_USER_ID || "",
    profile: env.PROFILE || "",
    avatarUrl: env.AVATAR_URL || "",
    tags: env.TAGS ? env.TAGS.split(",").filter(Boolean) : [],
    sortOrder: parseInt(env.SORT_ORDER || "0") || 0,
  };
}

function DotMenu({ member, isOwner }: { member: any; isOwner: boolean }) {
  const [open, setOpen] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editText, setEditText] = useState("");
  const [importText, setImportText] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleDownload = () => {
    const content = memberToEnv(member);
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(member.name || "member").toLowerCase().replace(/\s+/g, "-")}.env`;
    a.click();
    URL.revokeObjectURL(url);
    setOpen(false);
  };

  const handleEditOpen = () => {
    setEditText(memberToEnv(member));
    setShowEditModal(true);
    setOpen(false);
  };

  const handleImportOpen = () => {
    setImportText("");
    setShowImportModal(true);
    setOpen(false);
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImportText((ev.target?.result as string) || "");
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleImportApply = () => {
    const parsed = parseEnv(importText);
    const asJson = JSON.stringify(envToMember(parsed), null, 2);
    alert("Parsed .env data:\n" + asJson + "\n\nCopy this and use the admin panel to update the team member.");
    setShowImportModal(false);
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(v => !v)}
        className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-lg text-gray-600 hover:text-white hover:bg-white/10 transition-all z-10"
        data-testid="button-team-dots"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -4 }}
              transition={{ duration: 0.15 }}
              className="absolute top-10 right-3 z-40 bg-[#111] border border-white/10 rounded-xl shadow-xl overflow-hidden min-w-[170px]"
            >
              <button onClick={handleDownload} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[12px] font-semibold text-gray-300 hover:text-white hover:bg-white/5 transition-colors text-left">
                <Download className="w-3.5 h-3.5 shrink-0" /> Download as .env
              </button>
              <button onClick={handleEditOpen} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[12px] font-semibold text-gray-300 hover:text-white hover:bg-white/5 transition-colors text-left">
                <FileCode className="w-3.5 h-3.5 shrink-0" /> Edit .env
              </button>
              <button onClick={handleImportOpen} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[12px] font-semibold text-gray-300 hover:text-white hover:bg-white/5 transition-colors text-left">
                <Upload className="w-3.5 h-3.5 shrink-0" /> Import .env
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {showEditModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowEditModal(false)}>
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-[#111] border border-white/10 rounded-2xl p-5 w-full max-w-md z-10 space-y-4"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-black text-white flex items-center gap-2"><FileCode className="w-4 h-4 text-orange-500" /> Edit .env — {member.name}</h3>
                <button onClick={() => setShowEditModal(false)} className="text-gray-500 hover:text-white transition-colors text-lg leading-none">✕</button>
              </div>
              <textarea
                value={editText}
                onChange={e => setEditText(e.target.value)}
                className="w-full h-64 bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-[12px] font-mono text-gray-300 resize-none focus:outline-none focus:border-orange-500/50"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const content = editText;
                    const blob = new Blob([content], { type: "text/plain" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `${(member.name || "member").toLowerCase().replace(/\s+/g, "-")}.env`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-400 text-black font-black text-sm transition-colors"
                >
                  <Download className="w-3.5 h-3.5" /> Download
                </button>
                <button onClick={() => setShowEditModal(false)} className="px-4 py-2 rounded-xl border border-white/10 text-gray-400 hover:text-white text-sm font-semibold transition-colors">
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Import Modal */}
      <AnimatePresence>
        {showImportModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowImportModal(false)}>
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-[#111] border border-white/10 rounded-2xl p-5 w-full max-w-md z-10 space-y-4"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-black text-white flex items-center gap-2"><Upload className="w-4 h-4 text-orange-500" /> Import .env</h3>
                <button onClick={() => setShowImportModal(false)} className="text-gray-500 hover:text-white transition-colors text-lg leading-none">✕</button>
              </div>
              <div className="space-y-3">
                <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-white/20 hover:border-orange-500/40 cursor-pointer transition-colors text-sm text-gray-400 hover:text-white">
                  <Upload className="w-4 h-4" /> Choose .env file
                  <input ref={fileRef} type="file" accept=".env,.txt" className="hidden" onChange={handleFileImport} />
                </label>
                <p className="text-[11px] text-gray-600 text-center">— or paste below —</p>
                <textarea
                  value={importText}
                  onChange={e => setImportText(e.target.value)}
                  placeholder={"NAME=...\nROLE=...\nDESCRIPTION=..."}
                  className="w-full h-48 bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-[12px] font-mono text-gray-300 resize-none focus:outline-none focus:border-orange-500/50"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleImportApply}
                  disabled={!importText.trim()}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-400 disabled:opacity-40 text-black font-black text-sm transition-colors"
                >
                  Parse & Preview
                </button>
                <button onClick={() => setShowImportModal(false)} className="px-4 py-2 rounded-xl border border-white/10 text-gray-400 hover:text-white text-sm font-semibold transition-colors">
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TeamCard({ member, index, isOwner }: { member: any; index: number; isOwner: boolean }) {
  const [winking, setWinking] = useState(false);
  const accent = member.colour || "#F97316";
  const tags: string[] = Array.isArray(member.tags) ? member.tags : [];
  const isFounder = member.role === "Founder";
  const avatarSize = isFounder ? "w-24 h-24" : "w-20 h-20";

  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: index * 0.12, ease: [0.22, 1, 0.36, 1] }}
      className={`relative bg-[#0e0e0e] border border-white/[0.06] rounded-3xl flex flex-col gap-6 w-full ${isFounder ? "p-10 max-w-md" : "p-8 max-w-sm"}`}
      style={{ boxShadow: `0 0 ${isFounder ? "60px" : "40px"} 0 ${accent}${isFounder ? "28" : "18"}` }}
    >
      <div
        className="absolute inset-0 rounded-3xl pointer-events-none"
        style={{ background: `radial-gradient(ellipse at 50% 0%, ${accent}${isFounder ? "20" : "15"} 0%, transparent 60%)` }}
      />

      <DotMenu member={member} isOwner={isOwner} />

      <div className="flex items-start gap-5 relative">
        <div
          className={`relative ${avatarSize} shrink-0 cursor-pointer select-none`}
          onMouseEnter={() => setWinking(true)}
          onMouseLeave={() => setWinking(false)}
        >
          {member.avatarUrl ? (
            <img
              src={member.avatarUrl}
              alt={member.name}
              className={`${avatarSize} rounded-2xl object-cover`}
              style={{ border: `2px solid ${accent}55` }}
            />
          ) : (
            <div
              className={`${avatarSize} rounded-2xl flex items-center justify-center font-black`}
              style={{ border: `2px solid ${accent}55`, background: accent + "15", color: accent, fontSize: isFounder ? "2rem" : "1.75rem" }}
            >
              {member.name[0]}
            </div>
          )}
          <AnimatePresence>
            {winking && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.1 }}
                className="absolute inset-0 rounded-2xl flex items-center justify-center"
                style={{ background: "rgba(0,0,0,0.65)" }}
              >
                <span className={`select-none ${isFounder ? "text-4xl" : "text-3xl"}`} style={{ lineHeight: 1 }}>😉</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="min-w-0">
          <h2 className={`font-black text-white ${isFounder ? "text-2xl" : "text-xl"}`}>{member.name}</h2>
          <p className={`font-semibold mt-0.5 ${isFounder ? "text-base" : "text-sm"}`} style={{ color: accent }}>
            {ROLE_LABELS[member.role] || member.role}
          </p>
          {member.discordUser && (
            <p className="text-[11px] text-gray-600 mt-1 font-mono">
              {member.discordUser}
            </p>
          )}
        </div>
      </div>

      <p className="text-sm text-gray-400 leading-relaxed relative">{member.description}</p>

      {tags.length > 0 && (
        <div className="relative">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-600 mb-2.5">Responsibilities</p>
          <div className="flex flex-wrap gap-1.5">
            {tags.map(t => (
              <span
                key={t}
                className="text-[10px] font-semibold px-2.5 py-1 rounded-full"
                style={{ background: accent + "18", color: accent, border: `1px solid ${accent}30` }}
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      )}

      {member.profile && (
        <a
          href={member.profile}
          target="_blank"
          rel="noreferrer"
          className="relative flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest self-start px-3 py-1.5 rounded-lg transition-all hover:opacity-80"
          style={{ background: accent + "15", color: accent, border: `1px solid ${accent}30` }}
        >
          <ExternalLink className="w-2.5 h-2.5" /> View Profile
        </a>
      )}
    </motion.div>
  );
}

export default function TeamPage() {
  const { user } = useAuth();
  const isOwner = user?.role === "owner";
  const { data: members = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/our-team"] });

  const sorted = [...(members as any[])].sort((a, b) => {
    const ra = ROLE_ORDER[a.role] ?? 99;
    const rb = ROLE_ORDER[b.role] ?? 99;
    return ra !== rb ? ra - rb : (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
  });

  return (
    <div className="min-h-screen bg-[#030303] text-white" style={{ fontFamily: "var(--font-body)" }}>
      <div className="max-w-5xl mx-auto px-6 pt-20 pb-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-16"
        >
          <p className="text-[11px] font-semibold uppercase tracking-widest text-orange-500/70 mb-3">The people behind it</p>
          <h1 className="text-5xl font-extrabold mb-4" style={{ fontFamily: "var(--font-display)" }}>
            Our Team
          </h1>
          <p className="text-gray-500 text-base max-w-md mx-auto">
            The people who build and run Hexed every day.
          </p>
        </motion.div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
          </div>
        ) : sorted.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-600 text-sm">No team members listed yet.</p>
          </div>
        ) : (
          <div className="flex flex-wrap justify-center gap-6">
            {sorted.map((member, i) => (
              <TeamCard key={member.id} member={member} index={i} isOwner={isOwner} />
            ))}
          </div>
        )}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="text-center mt-16"
        >
          <Link href="/">
            <button className="text-xs font-semibold px-5 py-2.5 rounded-xl border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 transition-all">
              ← Back to Home
            </button>
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
