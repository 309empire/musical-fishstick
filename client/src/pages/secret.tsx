import { useState, useEffect } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

function WinkingAvatar({ src, name, role }: { src: string; name: string; role: string }) {
  const [winking, setWinking] = useState(false);

  return (
    <motion.div
      className="flex flex-col items-center gap-3 cursor-pointer select-none"
      whileHover={{ scale: 1.05 }}
      onHoverStart={() => setWinking(true)}
      onHoverEnd={() => setWinking(false)}
    >
      <div className="relative w-20 h-20">
        <img
          src={src}
          alt={name}
          className="w-20 h-20 rounded-full border-2 border-orange-500/40 object-cover"
          style={{ filter: "brightness(0.95)" }}
        />
        <AnimatePresence>
          {winking && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.1 }}
              className="absolute inset-0 rounded-full flex items-center justify-center"
              style={{ background: "rgba(0,0,0,0.55)" }}
            >
              <span className="text-3xl select-none" style={{ lineHeight: 1 }}>😉</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div className="text-center">
        <p className="font-black text-sm text-white">{name}</p>
        <p className="text-[11px] text-gray-500">{role}</p>
      </div>
    </motion.div>
  );
}

export default function SecretPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [claimed, setClaimed] = useState(false);
  const [alreadyClaimed, setAlreadyClaimed] = useState<boolean>(!!(user as any)?.easterEggClaimed);
  const [eggVisible, setEggVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setEggVisible(true), 200);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if ((user as any)?.easterEggClaimed) setAlreadyClaimed(true);
  }, [user]);

  const claimMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/easter-egg/claim"),
    onSuccess: () => {
      setClaimed(true);
      toast({
        title: "🎉 Easter Egg Claimed!",
        description: "You have gotten a Free track & a Free Tag extra.",
      });
    },
    onError: (err: any) => {
      if (err?.message?.includes("409") || err?.status === 409) {
        setAlreadyClaimed(true);
        toast({ title: "Already claimed", description: "You already found this egg before.", variant: "destructive" });
      }
    },
  });

  const owners = [
    {
      name: "Byte",
      role: "Founder & Developer",
      src: "https://images-ext-1.discordapp.net/external/pe9I6XgMGyTMeSIumNgAHOD_uk8D5RvJF-4UIrO7UaA/%3Fsize%3D4096/https/cdn.discordapp.com/avatars/1243269414900596787/549d88c80e293b757c3f84a9087ab0b0.png?format=webp&quality=lossless&width=448&height=448",
    },
    {
      name: "Mr Pain",
      role: "Co-Founder",
      src: "https://images-ext-1.discordapp.net/external/lnHTZlNjKo4qOJjYYw3wEdY-mYbkFzuAv705xHQta3k/%3Fsize%3D4096/https/cdn.discordapp.com/avatars/970654818521722881/9ffa9a856e2add01c17df818731fda28.png?format=webp&quality=lossless&width=72&height=72",
    },
  ];

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-start bg-black p-6 pt-20 pb-24">
      <AnimatePresence>
        {eggVisible && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col items-center gap-6 text-center max-w-md w-full"
          >
            <motion.div
              animate={{ rotate: [0, -8, 8, -8, 0] }}
              transition={{ duration: 1, delay: 0.5, repeat: Infinity, repeatDelay: 3 }}
              className="text-7xl select-none"
            >
              🥚
            </motion.div>

            <div className="space-y-2">
              <h1 className="text-2xl font-black text-white">You found a secret!</h1>
              <p className="text-gray-500 text-sm">
                Not many people make it here. As a reward, claim your free bonus below.
              </p>
            </div>

            {claimed ? (
              <div className="px-6 py-3 rounded-xl border border-green-500/30 bg-green-500/10 text-green-400 font-black text-sm">
                ✓ Claimed! +1 Track & +1 Tag added to your account.
              </div>
            ) : alreadyClaimed ? (
              <div className="px-6 py-3 rounded-xl border border-white/10 bg-white/5 text-gray-400 font-bold text-sm">
                You already claimed this egg before. 🐣
              </div>
            ) : (
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => claimMutation.mutate()}
                disabled={claimMutation.isPending}
                className="px-8 py-3 rounded-xl bg-orange-500 hover:bg-orange-400 text-black font-black text-sm transition-all disabled:opacity-60 flex items-center gap-2"
              >
                {claimMutation.isPending ? (
                  <span className="animate-spin">⏳</span>
                ) : "🎁 Claim Easter Egg"}
              </motion.button>
            )}

            <Link href="/">
              <button className="px-5 py-2 rounded-xl border border-white/20 bg-transparent text-white font-bold text-xs transition-all hover:bg-white hover:text-black hover:border-white">
                Return Home
              </button>
            </Link>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Owners Section */}
      <AnimatePresence>
        {eggVisible && (
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="mt-20 flex flex-col items-center gap-6 max-w-md w-full"
          >
            <div className="flex items-center gap-3 w-full">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-[11px] font-black uppercase tracking-widest text-gray-600">Owners Team</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>
            <p className="text-xs text-gray-600 text-center -mt-2">Hover over them — they say hi 👀</p>
            <div className="flex items-center justify-center gap-10">
              {owners.map(o => (
                <WinkingAvatar key={o.name} src={o.src} name={o.name} role={o.role} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
