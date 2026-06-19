import { motion } from "framer-motion";
import { useState } from "react";
import { ChevronDown, ChevronRight, Upload, Tag, Music, ShoppingBag, FileText, User, Image, Link } from "lucide-react";

const fade = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
};

function Section({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <motion.div {...fade} className="border border-white/[0.07] rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-6 py-4 bg-white/[0.03] hover:bg-white/[0.05] transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-orange-500/15 border border-orange-500/20 flex items-center justify-center shrink-0">
            <Icon className="w-4 h-4 text-orange-400" />
          </div>
          <span className="font-black text-sm">{title}</span>
        </div>
        {open ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
      </button>
      {open && (
        <div className="px-6 pb-6 pt-4 space-y-3 text-sm text-gray-400 leading-relaxed">
          {children}
        </div>
      )}
    </motion.div>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="shrink-0 w-5 h-5 rounded-full bg-orange-500/20 border border-orange-500/30 text-orange-400 text-[10px] font-black flex items-center justify-center mt-0.5">{n}</span>
      <span>{children}</span>
    </div>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return <code className="bg-black/50 border border-white/10 px-1.5 py-0.5 rounded text-[0.85em] font-mono text-orange-300">{children}</code>;
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-orange-500/5 border border-orange-500/20 rounded-xl px-4 py-3 text-orange-300/80 text-xs">
      {children}
    </div>
  );
}

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-[#030303] text-white" style={{ fontFamily: "var(--font-body)" }}>
      {/* Nav */}
      <nav className="border-b border-white/[0.04] sticky top-0 z-50 bg-[#030303]/90 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center gap-4">
          <a href="/" className="text-xl font-extrabold text-orange-500 mr-4" style={{ fontFamily: "var(--font-display)" }}>Hexed</a>
          <span className="text-gray-600 text-xs">/ Help</span>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-16 space-y-5">
        {/* Header */}
        <motion.div {...fade} className="mb-12">
          <p className="text-[11px] font-bold uppercase tracking-widest text-orange-500/70 mb-3">Documentation</p>
          <h1 className="text-5xl font-extrabold tracking-tight mb-4" style={{ fontFamily: "var(--font-display)" }}>Help Center</h1>
          <p className="text-gray-500 text-base max-w-xl">Everything you need to know to set up and customise your Hexed profile.</p>
        </motion.div>

        {/* Aliases */}
        <Section icon={Tag} title="What is an Alias?">
          <p>An alias is an alternative username people can use to visit your profile. For example if your username is <Code>john123</Code>, you could set an alias <Code>john</Code> so people can also reach you at <Code>hexed.at/john</Code>.</p>
          <div className="space-y-2 mt-2">
            <Step n={1}>Go to your Dashboard and open the <strong>Extras</strong> tab.</Step>
            <Step n={2}>Select <strong>Alias</strong> from the section menu.</Step>
            <Step n={3}>Type in your desired alias and click <strong>Save</strong>.</Step>
          </div>
          <Note>Free accounts get 1 alias slot. Premium users can claim up to 3 aliases.</Note>
        </Section>

        {/* Upload Profile Picture */}
        <Section icon={User} title="How to Upload a Profile Picture">
          <div className="space-y-2">
            <Step n={1}>Go to your Dashboard and open the <strong>Bio &amp; Info</strong> tab.</Step>
            <Step n={2}>Click the avatar / profile picture area or the <strong>Upload</strong> button next to it.</Step>
            <Step n={3}>Choose an image file from your device (JPG, PNG, WebP, GIF supported).</Step>
            <Step n={4}>Click <strong>Save</strong> at the bottom of the form.</Step>
          </div>
          <Note>Images are stored securely and served from our CDN. Max file size is 8 MB.</Note>
        </Section>

        {/* Upload Banner */}
        <Section icon={Image} title="How to Upload a Banner or Background">
          <p>You can set a <strong>banner</strong> (the wide strip at the top of your profile card) and a full-page <strong>background</strong> separately.</p>
          <div className="space-y-2 mt-2">
            <Step n={1}>Go to your Dashboard → <strong>Bio &amp; Info</strong> tab.</Step>
            <Step n={2}>Scroll to the <strong>Banner</strong> section. Click <strong>Upload File</strong> or paste a direct image/video URL.</Step>
            <Step n={3}>For the full-page background, scroll to <strong>Background Image / Video</strong> and do the same.</Step>
            <Step n={4}>Hit <strong>Save</strong>.</Step>
          </div>
          <Note>Banners and backgrounds support images (JPG/PNG/WebP/GIF) and video files (MP4/WebM). Video banners with audio can be played by visitors — they get a play/volume control overlay on your profile.</Note>
        </Section>

        {/* Upload a Track */}
        <Section icon={Music} title="How to Upload a Music Track">
          <div className="space-y-2">
            <Step n={1}>Go to your Dashboard → <strong>Bio &amp; Info</strong> tab → scroll to the <strong>Music</strong> section, or go to <strong>Extras → Tracks</strong>.</Step>
            <Step n={2}>Click <strong>Add Track</strong>. You can either upload an audio file (MP3, WAV, OGG, FLAC) or paste a direct URL.</Step>
            <Step n={3}>Fill in the title and optional artist name, then click <strong>Add</strong>.</Step>
            <Step n={4}>Tracks appear in the music player on your profile. You can reorder them by dragging.</Step>
          </div>
          <Note>Free accounts support up to 3 tracks. Premium users get up to 20 tracks. Go to Dashboard → Profile Settings → Music to set autoplay or shuffle.</Note>
        </Section>

        {/* Buying something */}
        <Section icon={ShoppingBag} title="How to Buy Something from the Shop">
          <div className="space-y-2">
            <Step n={1}>Click <strong>Shop</strong> in the navigation bar, or go to <a href="/shop" className="text-orange-400 underline">hexed.at/shop</a>.</Step>
            <Step n={2}>Browse the products. Click on any item to view its details.</Step>
            <Step n={3}>Click <strong>Buy</strong> and follow the checkout flow. Most purchases are handled via Discord — you'll need to join our server to complete the transaction.</Step>
            <Step n={4}>Once paid, your item (badge, premium status, etc.) is applied to your account automatically or after a staff confirmation in Discord.</Step>
          </div>
          <Note>The most popular purchase is <strong>Premium (€4.99)</strong> which removes the watermark, unlocks 20 tracks, removes ads, and gives access to exclusive effects and settings.</Note>
        </Section>

        {/* Markdowns */}
        <Section icon={FileText} title="How Markdowns Work in Your Bio">
          <p>Your bio supports a custom markup language called <strong>VoidMark</strong>. Wrap text in tags to style it:</p>
          <div className="grid sm:grid-cols-2 gap-2 mt-3 text-xs font-mono">
            {[
              { tag: "[b]Bold[/b]", desc: "Bold text" },
              { tag: "[em]Italic[/em]", desc: "Italic text" },
              { tag: "[u]Underline[/u]", desc: "Underlined text" },
              { tag: "[del]Strike[/del]", desc: "Strikethrough" },
              { tag: "[h]Heading[/h]", desc: "Large heading" },
              { tag: "[theme]Colored[/theme]", desc: "Your theme color" },
              { tag: "[color=FF0000]Red[/color]", desc: "Custom hex color" },
              { tag: "[highlight]Mark[/highlight]", desc: "Highlighted text" },
              { tag: "[glow]Glowing[/glow]", desc: "Glow effect" },
              { tag: "[spoiler]Hidden[/spoiler]", desc: "Click-to-reveal" },
              { tag: "[code]Code block[/code]", desc: "Monospace block" },
              { tag: "[quote]Quote[/quote]", desc: "Blockquote" },
              { tag: "[center]Text[/center]", desc: "Center align" },
              { tag: "[right]Text[/right]", desc: "Right align" },
              { tag: "[rainbow]Text[/rainbow]", desc: "Rainbow animated" },
              { tag: "[shake]Text[/shake]", desc: "Shake animation" },
              { tag: "[big]Large[/big]", desc: "Larger text" },
              { tag: "[small]Tiny[/small]", desc: "Smaller text" },
              { tag: "[typewriter]Text[/typewriter]", desc: "Typing animation" },
              { tag: "[hr]", desc: "Horizontal divider" },
              { tag: "[hr-theme]", desc: "Theme-colored divider" },
              { tag: "[br]", desc: "Line break" },
            ].map(({ tag, desc }) => (
              <div key={tag} className="flex items-center gap-2 p-2 bg-white/[0.03] border border-white/[0.06] rounded-lg">
                <Code>{tag}</Code>
                <span className="text-gray-500 text-[11px]">{desc}</span>
              </div>
            ))}
          </div>
          <Note>Tags can be nested freely — for example <Code>[b][theme]Bold theme color[/theme][/b]</Code> works perfectly. Visit <a href="/markdowns" className="text-orange-400 underline">Dashboard → Markdowns</a> for an interactive preview.</Note>
        </Section>

        {/* Custom Links */}
        <Section icon={Link} title="How to Add Links to Your Profile">
          <div className="space-y-2">
            <Step n={1}>Go to Dashboard → <strong>Manage Links</strong> tab.</Step>
            <Step n={2}>Click <strong>Add Link</strong>. Fill in a title, URL, and optionally an icon or emoji.</Step>
            <Step n={3}>Toggle the link on/off with the switch. Drag to reorder.</Step>
            <Step n={4}>Click <strong>Save</strong>. The link appears on your public profile immediately.</Step>
          </div>
          <Note>You can choose between Stacked (single column) and Split (two column) layout in Dashboard → Profile Settings → Links.</Note>
        </Section>

        {/* Footer link */}
        <motion.div {...fade} className="pt-6 text-center">
          <p className="text-gray-600 text-sm">Still have questions? Join our <a href="https://discord.gg/9nZUZRcqyT" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:text-orange-300 underline">Discord server</a> and open a support ticket.</p>
        </motion.div>
      </div>
    </div>
  );
}
