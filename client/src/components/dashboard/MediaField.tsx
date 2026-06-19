import { motion, AnimatePresence } from "framer-motion";
import { Upload, Check, X, Loader2, Music } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUpload } from "@/hooks/use-upload";
import { useToast } from "@/hooks/use-toast";
import { resolveUrl, isUploadedFile } from "./helpers";

export function MediaField({
  label, value, onChange, accept, uploadId, mediaType, icon
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  accept: string;
  uploadId: string;
  mediaType: "image" | "video" | "audio";
  icon?: React.ReactNode;
}) {
  const { toast } = useToast();
  const { uploadFile, isUploading } = useUpload();
  const hasValue = !!value;
  const resolved = resolveUrl(value);
  const uploaded = isUploadedFile(value);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const result = await uploadFile(file);
    if (result) {
      onChange(result.publicUrl || `${window.location.origin}${result.objectPath}`);
      toast({ title: `${label || "File"} uploaded` });
    } else {
      toast({ title: "Upload failed", variant: "destructive" });
    }
    e.target.value = "";
  };

  return (
    <div className="space-y-2">
      {label && (
        <Label className="text-[11px] font-black uppercase tracking-widest text-gray-500 flex items-center gap-1.5">
          {icon}{label}
        </Label>
      )}
      <AnimatePresence>
        {hasValue && (
          <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }}
            className="relative rounded-xl overflow-hidden border border-white/5 bg-black/40 group">
            {mediaType === "image" && <img src={resolved} alt={label} className="w-full h-32 object-cover" onError={e => e.currentTarget.classList.add("opacity-20")} />}
            {mediaType === "video" && <video src={resolved} className="w-full h-32 object-cover" muted playsInline />}
            {mediaType === "audio" && (
              <div className="p-3 flex items-center gap-3">
                <Music className="w-5 h-5 text-orange-500 shrink-0" />
                <audio controls className="flex-1 h-8" src={resolved} />
              </div>
            )}
            {uploaded && mediaType !== "audio" && (
              <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/80 rounded-full text-[9px] font-black uppercase tracking-widest text-green-400 flex items-center gap-1">
                <Check className="w-2.5 h-2.5" /> Uploaded
              </div>
            )}
            <button type="button"
              className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/70 hover:bg-red-500 border border-white/10 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
              onClick={() => onChange("")}><X className="w-3 h-3 text-white" /></button>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="flex gap-2">
        {!uploaded ? (
          <Input value={value} onChange={e => onChange(e.target.value)} placeholder="Paste URL or upload..."
            className="bg-black/60 border-white/5 focus:border-orange-500/50 text-xs h-9" />
        ) : (
          <div className="flex-1 flex items-center gap-2 px-3 h-9 bg-black/40 border border-white/5 rounded-md">
            <Check className="w-3 h-3 text-green-500 shrink-0" />
            <span className="text-xs text-gray-400 truncate flex-1">File saved</span>
            <button type="button" onClick={() => onChange("")} className="text-gray-600 hover:text-red-400 transition-colors"><X className="w-3 h-3" /></button>
          </div>
        )}
        <label htmlFor={uploadId}
          className={`flex items-center justify-center w-9 h-9 rounded-md border border-white/10 bg-white/5 hover:bg-orange-500/10 hover:border-orange-500/30 cursor-pointer transition-colors shrink-0 ${isUploading ? "opacity-50 pointer-events-none" : ""}`}>
          {isUploading ? <Loader2 className="w-4 h-4 animate-spin text-orange-500" /> : <Upload className="w-4 h-4 text-gray-400" />}
          <input id={uploadId} type="file" accept={accept} className="hidden" onChange={handleUpload} />
        </label>
      </div>
    </div>
  );
}
