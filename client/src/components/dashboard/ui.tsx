import { Slider } from "@/components/ui/slider";

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-3 flex items-center gap-1.5">
      {children}
    </h3>
  );
}

export function SettingRow({ label, desc, children }: { label: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-white/[0.03] last:border-0">
      <div className="min-w-0">
        <p className="text-sm font-bold leading-tight">{label}</p>
        {desc && <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">{desc}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export function ColorPicker({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="relative w-8 h-8 rounded-lg border border-white/10 overflow-hidden cursor-pointer shrink-0"
        style={{ backgroundColor: value }}
      >
        <input
          type="color"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
        />
      </div>
      <span className="text-xs font-mono text-gray-400">{value}</span>
    </div>
  );
}

export function NumSlider({
  value, onChange, min, max, step = 1, unit = ""
}: {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  unit?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <Slider value={[value]} onValueChange={([v]) => onChange(v)} min={min} max={max} step={step} className="flex-1 w-32" />
      <span className="text-xs font-mono text-gray-400 w-12 text-right">{value}{unit}</span>
    </div>
  );
}
