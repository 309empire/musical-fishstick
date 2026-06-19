import { motion } from "framer-motion";
import { Clock, Code, AlertTriangle, Database, Moon, Bug, Cpu } from "lucide-react";

const TIMELINE = [
  { icon: Cpu, label: "Day 1", text: "Byte & Mr Pain started the project from scratch. First commit pushed late at night." },
  { icon: Code, label: "Week 1", text: "Core profile system built. Multiple rewrites happened as ideas evolved. Many nights were lost to debugging." },
  { icon: Database, label: "Day 9–11", text: "Byte spent over 2 days straight making the badge Databank work. Repeated failures, scripts crashing — but Byte kept going until it was solid." },
  { icon: Bug, label: "Week 2", text: "Bug after bug. The effects system, music player, and link cards all had major issues. Often fixed at 3–4am." },
  { icon: AlertTriangle, label: "Week 3", text: "The domain hexed.at took ages to sort out. Meanwhile both founders kept pushing updates through the nights." },
  { icon: Moon, label: "Launch", text: "After 3+ weeks of late nights, crashes, rewrites and determination — Hexed went live. Still being improved every day." },
];

function FounderCard({ name, role, desc, color }: { name: string; role: string; desc: string; color: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-[#0e0e0e] border border-white/[0.07] rounded-2xl p-7 flex flex-col gap-4"
    >
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-black" style={{ background: color + "22", border: `1px solid ${color}44` }}>
          {name[0]}
        </div>
        <div>
          <p className="text-xl font-black text-white">{name}</p>
          <p className="text-xs font-bold uppercase tracking-widest mt-0.5" style={{ color }}>{role}</p>
        </div>
      </div>
      <p className="text-sm text-gray-400 leading-relaxed">{desc}</p>
    </motion.div>
  );
}

function TimelineItem({ icon: Icon, label, text, i }: { icon: any; label: string; text: string; i: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: i * 0.1, duration: 0.4 }}
      className="flex gap-4"
    >
      <div className="flex flex-col items-center">
        <div className="w-9 h-9 rounded-xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 text-orange-400" />
        </div>
        {i < TIMELINE.length - 1 && <div className="flex-1 w-px bg-white/[0.06] my-1" />}
      </div>
      <div className="pb-6">
        <p className="text-[10px] font-black uppercase tracking-widest text-orange-500 mb-1">{label}</p>
        <p className="text-sm text-gray-400 leading-relaxed">{text}</p>
      </div>
    </motion.div>
  );
}

export default function FoundersPage() {
  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <div className="max-w-3xl mx-auto px-6 py-20">
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mb-12">
          <p className="text-[10px] font-black uppercase tracking-widest text-orange-500 mb-3">hexed.at / founders</p>
          <h1 className="text-4xl font-black mb-4">Meet the Founders</h1>
          <p className="text-gray-500 text-base leading-relaxed max-w-xl">
            Hexed was built by two people — Byte and Mr Pain. What started as a side project between friends turned into
            3+ weeks of late nights, rewrites, and stubborn persistence.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-4 mb-14">
          <FounderCard
            name="Byte"
            role="Lead Developer & Co-Founder"
            color="#F97316"
            desc="The main coder behind Hexed. Byte wrote most of the platform — from the profile system to the badge databank (which alone took 2+ days to get working). Known for staying up all night debugging broken scripts."
          />
          <FounderCard
            name="Mr Pain"
            role="Co-Founder & Vision"
            color="#a855f7"
            desc="Brought the original concept and direction. Worked alongside Byte through countless nights to shape what Hexed became. The name says it all — building this platform was truly painful at times."
          />
        </div>

        <div className="mb-6">
          <div className="flex items-center gap-2 mb-6">
            <Clock className="w-4 h-4 text-orange-500" />
            <h2 className="text-lg font-black">Development Timeline</h2>
          </div>
          <div>
            {TIMELINE.map((item, i) => (
              <TimelineItem key={i} {...item} i={i} />
            ))}
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="border border-orange-500/20 bg-orange-500/5 rounded-2xl p-6 text-center"
        >
          <p className="text-sm text-gray-400 leading-relaxed">
            Hexed is still actively developed. Every update you see was shipped by the same two people who started it —
            Byte grinding on the code, Mr Pain steering the ship. If you're here, you're part of it.
          </p>
        </motion.div>

        <div className="mt-8 text-center">
          <a href="/" className="text-xs text-gray-600 hover:text-orange-500 transition-colors font-bold uppercase tracking-widest">← Back to Hexed</a>
        </div>
      </div>
    </div>
  );
}
