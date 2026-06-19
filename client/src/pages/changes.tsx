import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Tag, User, Clock, ChevronDown } from "lucide-react";
import { useState } from "react";

function ChangelogEntry({ log, i }: { log: any; i: number }) {
  const [open, setOpen] = useState(i === 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.07, duration: 0.4 }}
      className="bg-[#0e0e0e] border border-white/[0.07] rounded-2xl overflow-hidden"
    >
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-4 px-6 py-5 text-left hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <span className="px-2.5 py-1 rounded-lg bg-orange-500/15 border border-orange-500/30 text-orange-400 text-[11px] font-black uppercase tracking-widest shrink-0">
            {log.version}
          </span>
          <span className="font-black text-white truncate">{log.title}</span>
        </div>
        <div className="flex items-center gap-4 shrink-0 text-[10px] text-gray-600 font-bold uppercase tracking-widest">
          <span className="hidden sm:flex items-center gap-1.5">
            <User className="w-3 h-3" /> {log.author}
          </span>
          <span className="hidden sm:flex items-center gap-1.5">
            <Clock className="w-3 h-3" /> {new Date(log.createdAt).toLocaleDateString()}
          </span>
          <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${open ? "rotate-180" : ""}`} />
        </div>
      </button>
      {open && (
        <div className="px-6 pb-6 border-t border-white/[0.05]">
          <div className="flex items-center gap-4 pt-4 mb-4 text-[10px] text-gray-600 font-bold uppercase tracking-widest sm:hidden">
            <span className="flex items-center gap-1.5"><User className="w-3 h-3" /> {log.author}</span>
            <span className="flex items-center gap-1.5"><Clock className="w-3 h-3" /> {new Date(log.createdAt).toLocaleDateString()}</span>
          </div>
          <p className="text-sm text-gray-400 leading-relaxed whitespace-pre-wrap">{log.content}</p>
        </div>
      )}
    </motion.div>
  );
}

export default function ChangesPage() {
  const { data: logs = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/changelogs"] });

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <div className="max-w-3xl mx-auto px-6 py-20">
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="mb-12">
          <p className="text-[10px] font-black uppercase tracking-widest text-orange-500 mb-3">hexed.at / changes</p>
          <h1 className="text-4xl font-black mb-4">Change Log</h1>
          <p className="text-gray-500 text-base leading-relaxed">
            Every update, fix, and improvement shipped to Hexed. Tracked and documented so you know what changed.
          </p>
        </motion.div>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 bg-white/[0.03] rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-20 bg-[#0e0e0e] border border-white/[0.06] rounded-2xl">
            <Tag className="w-8 h-8 mx-auto mb-3 text-gray-700" />
            <p className="text-gray-600 font-bold">No change logs yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {[...logs].reverse().map((log: any, i: number) => (
              <ChangelogEntry key={log.id} log={log} i={i} />
            ))}
          </div>
        )}

        <div className="mt-10 text-center">
          <a href="/" className="text-xs text-gray-600 hover:text-orange-500 transition-colors font-bold uppercase tracking-widest">← Back to Hexed</a>
        </div>
      </div>
    </div>
  );
}
