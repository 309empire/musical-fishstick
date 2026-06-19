import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Plus, Link as LinkIcon, Loader2 } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";
import { LinkAddForm } from "./link/LinkAddForm";
import { LinkCard } from "./link/LinkCard";

export function LinksTab({ userLinks, linksLoading }: { userLinks: any[]; linksLoading: boolean }) {
  const { toast } = useToast();
  const { t } = useI18n();
  const [adding, setAdding] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newStyle, setNewStyle] = useState("default");
  const [newIcon, setNewIcon] = useState("");
  const [platformSearch, setPlatformSearch] = useState("");

  const resetForm = () => {
    setNewTitle(""); setNewUrl(""); setNewDesc(""); setNewStyle("default"); setNewIcon("");
    setSelectedPlatform(null); setPlatformSearch(""); setAdding(false);
  };

  const addMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/links", {
      title: newTitle || (selectedPlatform === "discord-embed" ? "Discord Server" : ""),
      url: newUrl,
      description: selectedPlatform === "discord-embed" ? "" : newDesc,
      platform: selectedPlatform || "",
      style: selectedPlatform === "discord-embed" ? "card" : newStyle,
      icon: newIcon,
    }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/links"] }); resetForm(); toast({ title: "Link added" }); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/links/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/links"] }); toast({ title: "Link deleted" }); },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, enabled }: any) => apiRequest("PATCH", `/api/links/${id}`, { enabled }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/links"] }),
  });

  const styleMutation = useMutation({
    mutationFn: ({ id, style }: any) => apiRequest("PATCH", `/api/links/${id}`, { style }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/links"] }),
  });

  const editMutation = useMutation({
    mutationFn: ({ id, data }: any) => apiRequest("PATCH", `/api/links/${id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/links"] }); toast({ title: "Link updated" }); },
  });

  const moveMutation = useMutation({
    mutationFn: ({ id, order }: any) => apiRequest("PATCH", `/api/links/${id}`, { order }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/links"] }),
  });

  const moveLink = (link: any, dir: -1 | 1) => {
    const sorted = [...(userLinks || [])].sort((a, b) => (a.order || 0) - (b.order || 0));
    const idx = sorted.findIndex((l: any) => l.id === link.id);
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const swap = sorted[swapIdx];
    moveMutation.mutate({ id: link.id, order: swap.order ?? swapIdx });
    moveMutation.mutate({ id: swap.id, order: link.order ?? idx });
  };

  const sorted = [...(userLinks || [])].sort((a, b) => (a.order || 0) - (b.order || 0));

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-black">Links</h1>
          <p className="text-gray-500 text-sm mt-1">Add social platforms and custom links</p>
        </div>
        <button onClick={() => setAdding(a => !a)}
          className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-400 text-black font-black rounded-xl transition-all text-sm">
          <Plus className="w-4 h-4" /> Add Link
        </button>
      </div>
      <AnimatePresence>
        {adding && (
          <LinkAddForm
            selectedPlatform={selectedPlatform} platformSearch={platformSearch}
            newTitle={newTitle} newUrl={newUrl} newDesc={newDesc} newStyle={newStyle} newIcon={newIcon}
            isPending={addMutation.isPending}
            setSelectedPlatform={setSelectedPlatform} setPlatformSearch={setPlatformSearch}
            setNewTitle={setNewTitle} setNewUrl={setNewUrl} setNewDesc={setNewDesc}
            setNewStyle={setNewStyle} setNewIcon={setNewIcon}
            onAdd={() => addMutation.mutate()} onCancel={resetForm}
          />
        )}
      </AnimatePresence>
      {linksLoading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="animate-spin text-orange-500 w-6 h-6" /></div>
      ) : sorted.length === 0 ? (
        <div className="text-center py-16 bg-[#0e0e0e] border border-white/[0.06] rounded-2xl">
          <LinkIcon className="w-10 h-10 mx-auto mb-3 text-gray-700" />
          <p className="font-black text-gray-500">No links yet</p>
          <p className="text-[11px] text-gray-700 mt-1">Add your social platforms and websites above</p>
        </div>
      ) : (
        <motion.div className="space-y-2" layout>
          {sorted.map((link: any, idx: number) => (
            <LinkCard key={link.id} link={link} idx={idx} total={sorted.length}
              onMove={moveLink}
              onToggle={(id, enabled) => toggleMutation.mutate({ id, enabled })}
              onStyle={(id, style) => styleMutation.mutate({ id, style })}
              onDelete={(id) => deleteMutation.mutate(id)}
              onEdit={(id, data) => editMutation.mutate({ id, data })}
            />
          ))}
        </motion.div>
      )}
    </div>
  );
}
