import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Search, Eye, Copy, Check } from "lucide-react";
import { Input } from "@/components/ui/input";

const TEMPLATES = [
  {
    id: "midnight",
    name: "Midnight",
    category: "dark",
    themeColor: "#6366f1",
    bg: "linear-gradient(135deg, #0a0a0f 0%, #12121f 100%)",
    accent: "#6366f1",
    preview: { avatar: "🌙", bio: "Lost in the void between stars.", tags: ["creative", "night owl"] },
  },
  {
    id: "ember",
    name: "Ember",
    category: "dark",
    themeColor: "#f97316",
    bg: "linear-gradient(135deg, #0f0800 0%, #1a0e00 100%)",
    accent: "#f97316",
    preview: { avatar: "🔥", bio: "Burning bright every day.", tags: ["artist", "fire"] },
  },
  {
    id: "neon-green",
    name: "Neon Green",
    category: "neon",
    themeColor: "#22c55e",
    bg: "linear-gradient(135deg, #020b05 0%, #041508 100%)",
    accent: "#22c55e",
    preview: { avatar: "💚", bio: "Green is the new black.", tags: ["gaming", "tech"] },
  },
  {
    id: "cyber-pink",
    name: "Cyber Pink",
    category: "neon",
    themeColor: "#ec4899",
    bg: "linear-gradient(135deg, #0d020a 0%, #1a0312 100%)",
    accent: "#ec4899",
    preview: { avatar: "🌸", bio: "Living in a cyberpunk dream.", tags: ["aesthetic", "vibe"] },
  },
  {
    id: "arctic",
    name: "Arctic",
    category: "light",
    themeColor: "#38bdf8",
    bg: "linear-gradient(135deg, #050d14 0%, #0a1a24 100%)",
    accent: "#38bdf8",
    preview: { avatar: "❄️", bio: "Cold but beautiful.", tags: ["chill", "winter"] },
  },
  {
    id: "solar",
    name: "Solar",
    category: "warm",
    themeColor: "#fbbf24",
    bg: "linear-gradient(135deg, #0f0a00 0%, #1a1200 100%)",
    accent: "#fbbf24",
    preview: { avatar: "☀️", bio: "Sunshine all day long.", tags: ["happy", "summer"] },
  },
  {
    id: "void",
    name: "Void",
    category: "dark",
    themeColor: "#a855f7",
    bg: "linear-gradient(135deg, #050008 0%, #0d000f 100%)",
    accent: "#a855f7",
    preview: { avatar: "🌌", bio: "The void stares back.", tags: ["dark", "space"] },
  },
  {
    id: "rose",
    name: "Rose",
    category: "warm",
    themeColor: "#f43f5e",
    bg: "linear-gradient(135deg, #0f0206 0%, #1a030a 100%)",
    accent: "#f43f5e",
    preview: { avatar: "🌹", bio: "Every rose has its thorn.", tags: ["romantic", "art"] },
  },
  {
    id: "ocean",
    name: "Ocean",
    category: "cool",
    themeColor: "#0ea5e9",
    bg: "linear-gradient(135deg, #00060f 0%, #000f1a 100%)",
    accent: "#0ea5e9",
    preview: { avatar: "🌊", bio: "Deep as the sea.", tags: ["calm", "blue"] },
  },
  {
    id: "mint",
    name: "Mint",
    category: "cool",
    themeColor: "#10b981",
    bg: "linear-gradient(135deg, #000f0a 0%, #001a12 100%)",
    accent: "#10b981",
    preview: { avatar: "🌿", bio: "Fresh and clean vibes.", tags: ["nature", "fresh"] },
  },
  {
    id: "chrome",
    name: "Chrome",
    category: "light",
    themeColor: "#94a3b8",
    bg: "linear-gradient(135deg, #070809 0%, #0f1012 100%)",
    accent: "#94a3b8",
    preview: { avatar: "⚙️", bio: "Minimal and sharp.", tags: ["minimal", "tech"] },
  },
  {
    id: "lava",
    name: "Lava",
    category: "warm",
    themeColor: "#ef4444",
    bg: "linear-gradient(135deg, #0f0000 0%, #1a0000 100%)",
    accent: "#ef4444",
    preview: { avatar: "🌋", bio: "Burning everything in my path.", tags: ["intense", "red"] },
  },
];

const CATEGORIES = ["all", "dark", "neon", "warm", "cool", "light"];

function TemplateCard({ template, onCopy }: { template: typeof TEMPLATES[0]; onCopy: (t: typeof TEMPLATES[0]) => void }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    onCopy(template);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl overflow-hidden border border-white/[0.06] hover:border-white/20 transition-all duration-300 group cursor-pointer"
      style={{ background: "#0a0a0a" }}
    >
      {/* Preview Card */}
      <div className="relative h-52 p-4 flex flex-col" style={{ background: template.bg }}>
        {/* Fake avatar */}
        <div className="w-12 h-12 rounded-xl bg-black/50 flex items-center justify-center text-2xl border border-white/10 mb-2">
          {template.preview.avatar}
        </div>
        {/* Fake name */}
        <div className="w-24 h-3 rounded-full mb-1" style={{ background: `${template.accent}88` }} />
        {/* Fake bio */}
        <p className="text-[10px] mb-2 leading-relaxed" style={{ color: "rgba(255,255,255,0.55)", fontFamily: "monospace", maxWidth: 160 }}>
          {template.preview.bio}
        </p>
        {/* Fake tags */}
        <div className="flex gap-1 flex-wrap">
          {template.preview.tags.map(tag => (
            <span key={tag} className="text-[9px] px-2 py-0.5 rounded-full border font-bold"
              style={{ borderColor: `${template.accent}40`, color: template.accent, background: `${template.accent}15` }}>
              {tag}
            </span>
          ))}
        </div>
        {/* Fake link */}
        <div className="mt-auto w-full h-7 rounded-lg flex items-center px-3 gap-2 border border-white/10" style={{ background: `${template.accent}22` }}>
          <div className="w-3 h-3 rounded-sm" style={{ background: template.accent }} />
          <div className="h-2 flex-1 rounded-full bg-white/10" />
        </div>

        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <button onClick={handleCopy}
            className="flex items-center gap-2 px-4 py-2 rounded-xl font-black text-sm text-black transition-all"
            style={{ background: template.accent }}>
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? "Copied!" : "Use Theme"}
          </button>
        </div>
      </div>

      {/* Info bar */}
      <div className="px-4 py-3 flex items-center justify-between">
        <div>
          <p className="font-black text-sm text-white">{template.name}</p>
          <p className="text-[10px] text-gray-600 uppercase font-bold tracking-wider">{template.category}</p>
        </div>
        <div className="w-5 h-5 rounded-full border-2 border-black/40" style={{ background: template.themeColor }} />
      </div>
    </motion.div>
  );
}

export default function Templates() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [copied, setCopied] = useState<string | null>(null);

  const filtered = TEMPLATES.filter(t => {
    const matchSearch = t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.category.toLowerCase().includes(search.toLowerCase());
    const matchCat = category === "all" || t.category === category;
    return matchSearch && matchCat;
  });

  const handleCopy = (template: typeof TEMPLATES[0]) => {
    const text = `Theme Color: ${template.themeColor}`;
    navigator.clipboard.writeText(template.themeColor).catch(() => {});
    setCopied(template.id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="min-h-screen bg-[#030303] text-white" style={{ fontFamily: "var(--font-body, sans-serif)" }}>
      {/* Header */}
      <nav className="sticky top-0 z-50 border-b border-white/[0.04]" style={{ background: "rgba(3,3,3,0.92)", backdropFilter: "blur(20px)" }}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <a href="/" className="text-gray-500 hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </a>
            <span className="font-black text-xl">Templates</span>
          </div>
          <a href="/dashboard" className="text-xs font-bold bg-orange-500 text-black hover:bg-orange-400 transition-all px-4 py-2 rounded-xl">
            My Profile
          </a>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-10">
        {/* Hero */}
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-black mb-3">Browse <span className="text-orange-500">Themes</span></h1>
          <p className="text-gray-500 text-sm max-w-md mx-auto">Pick a theme color for your profile. Click "Use Theme" to copy the hex code, then paste it into your dashboard theme color setting.</p>
        </div>

        {/* Search + filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search themes..."
              className="pl-9 bg-[#0e0e0e] border-white/[0.06] focus:border-orange-500/40 h-10 text-sm" />
          </div>
          <div className="flex gap-2 flex-wrap">
            {CATEGORIES.map(cat => (
              <button key={cat} onClick={() => setCategory(cat)}
                className={`px-4 py-2 rounded-xl font-black text-xs capitalize transition-all border ${category === cat ? "bg-orange-500 border-orange-500 text-black" : "border-white/10 text-gray-400 hover:border-orange-500/30 hover:text-white"}`}>
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-600">
            <p className="text-4xl mb-3">🔍</p>
            <p className="font-bold">No templates found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.map(t => (
              <TemplateCard key={t.id} template={t} onCopy={handleCopy} />
            ))}
          </div>
        )}

        {/* How to use */}
        <div className="mt-16 p-6 rounded-2xl border border-white/[0.06] bg-[#0e0e0e]">
          <h2 className="font-black text-lg mb-2 flex items-center gap-2"><Eye className="w-5 h-5 text-orange-500" /> How to apply a theme</h2>
          <ol className="space-y-2 text-sm text-gray-400">
            <li><span className="text-orange-500 font-black">1.</span> Click "Use Theme" on any card to copy the hex color code</li>
            <li><span className="text-orange-500 font-black">2.</span> Go to your Dashboard → Profile → Theme Color</li>
            <li><span className="text-orange-500 font-black">3.</span> Paste the color code and save</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
