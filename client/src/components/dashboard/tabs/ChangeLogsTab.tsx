import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Plus, Trash2, Pencil, Loader2, Tag, Check, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

function LogForm({ initial, onSave, onCancel, saving }: { initial?: any; onSave: (data: any) => void; onCancel: () => void; saving: boolean }) {
  const [version, setVersion] = useState(initial?.version || "");
  const [title, setTitle] = useState(initial?.title || "");
  const [content, setContent] = useState(initial?.content || "");
  const [author, setAuthor] = useState(initial?.author || "");
  return (
    <div className="space-y-3 bg-[#0a0a0a] border border-white/[0.08] rounded-2xl p-5">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-[10px] font-black uppercase text-gray-500">Version</Label>
          <Input value={version} onChange={e => setVersion(e.target.value)} placeholder="e.g. V 1.02" className="bg-black/60 border-white/5" />
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] font-black uppercase text-gray-500">Author</Label>
          <Input value={author} onChange={e => setAuthor(e.target.value)} placeholder="e.g. Byte" className="bg-black/60 border-white/5" />
        </div>
      </div>
      <div className="space-y-1">
        <Label className="text-[10px] font-black uppercase text-gray-500">Title</Label>
        <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Short title for this update" className="bg-black/60 border-white/5" />
      </div>
      <div className="space-y-1">
        <Label className="text-[10px] font-black uppercase text-gray-500">Content</Label>
        <Textarea value={content} onChange={e => setContent(e.target.value)} placeholder="What changed in this version..." className="bg-black/60 border-white/5 min-h-[80px] resize-none text-sm" />
      </div>
      <div className="flex gap-2 pt-1">
        <Button onClick={() => onSave({ version, title, content, author })} disabled={saving || !version || !title} className="bg-orange-500 hover:bg-orange-400 text-black font-black border-0 flex-1">
          {saving ? <Loader2 className="animate-spin w-4 h-4" /> : <Check className="w-4 h-4" />} {initial ? "Save Changes" : "Create"}
        </Button>
        <Button variant="outline" onClick={onCancel} className="border-white/10 font-black"><X className="w-4 h-4" /></Button>
      </div>
    </div>
  );
}

export function ChangeLogsTab() {
  const { toast } = useToast();
  const { data: logs = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/changelogs"] });
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async (data: any, id?: number) => {
    setSaving(true);
    try {
      if (id) await apiRequest("PATCH", `/api/admin/changelogs/${id}`, data);
      else await apiRequest("POST", "/api/admin/changelogs", data);
      queryClient.invalidateQueries({ queryKey: ["/api/changelogs"] });
      toast({ title: id ? "Updated" : "Created" });
      setCreating(false); setEditing(null);
    } catch { toast({ title: "Failed", variant: "destructive" }); }
    setSaving(false);
  };

  const remove = async (id: number) => {
    if (!confirm("Delete this changelog?")) return;
    await apiRequest("DELETE", `/api/admin/changelogs/${id}`, undefined);
    queryClient.invalidateQueries({ queryKey: ["/api/changelogs"] });
    toast({ title: "Deleted" });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-black">Change Logs</h1>
          <p className="text-gray-500 text-sm mt-1">Developer/Owner only — manage public changelog entries</p>
        </div>
        <Button onClick={() => { setCreating(true); setEditing(null); }} className="bg-orange-500 hover:bg-orange-400 text-black font-black border-0 flex items-center gap-2">
          <Plus className="w-4 h-4" /> New Entry
        </Button>
      </div>
      {creating && <LogForm onSave={d => save(d)} onCancel={() => setCreating(false)} saving={saving} />}
      {isLoading ? <div className="flex items-center justify-center py-10"><Loader2 className="animate-spin w-5 h-5 text-orange-500" /></div> : (
        <div className="space-y-3">
          {[...logs].reverse().map((log: any) => (
            <motion.div key={log.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-[#0e0e0e] border border-white/[0.07] rounded-2xl p-5">
              {editing === log.id ? (
                <LogForm initial={log} onSave={d => save(d, log.id)} onCancel={() => setEditing(null)} saving={saving} />
              ) : (
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="px-2.5 py-1 rounded-lg bg-orange-500/15 border border-orange-500/30 text-orange-400 text-[11px] font-black">{log.version}</span>
                      <span className="font-black text-white">{log.title}</span>
                      <span className="text-[10px] text-gray-600 font-bold">by {log.author}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => setEditing(log.id)} className="w-7 h-7 flex items-center justify-center text-gray-500 hover:text-white rounded-lg hover:bg-white/5 transition-all"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => remove(log.id)} className="w-7 h-7 flex items-center justify-center text-gray-500 hover:text-red-400 rounded-lg hover:bg-red-500/5 transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                  {log.content && <p className="text-sm text-gray-400 mt-3 leading-relaxed whitespace-pre-wrap">{log.content}</p>}
                  <p className="text-[10px] text-gray-700 mt-3 font-mono">{new Date(log.createdAt).toLocaleString()}</p>
                </div>
              )}
            </motion.div>
          ))}
          {logs.length === 0 && (
            <div className="text-center py-14 bg-[#0e0e0e] border border-white/[0.06] rounded-2xl">
              <Tag className="w-8 h-8 mx-auto mb-3 text-gray-700" />
              <p className="text-gray-600 font-bold">No changelog entries yet</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
