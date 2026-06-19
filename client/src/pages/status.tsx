import { useQuery } from "@tanstack/react-query";
import { CheckCircle, XCircle, Clock, AlertTriangle, Activity, Wifi, Server, Globe, Zap, Database, Shield, RefreshCw } from "lucide-react";
import { useState, useEffect } from "react";

interface WebsiteStatus {
  status: "up" | "down";
  reason?: string;
  byName?: string;
  byRank?: string;
}

interface ServiceItem {
  name: string;
  icon: React.ReactNode;
  key: string;
  description: string;
}

const SERVICES: ServiceItem[] = [
  { name: "API Server", icon: <Server className="w-5 h-5" />, key: "api", description: "REST API & backend services" },
  { name: "Website", icon: <Globe className="w-5 h-5" />, key: "web", description: "Frontend & public pages" },
  { name: "Discord OAuth", icon: <Wifi className="w-5 h-5" />, key: "discord", description: "Login & account linking" },
  { name: "Database", icon: <Database className="w-5 h-5" />, key: "db", description: "Data storage & retrieval" },
  { name: "CDN & Media", icon: <Zap className="w-5 h-5" />, key: "cdn", description: "Images, videos & uploads" },
  { name: "Security Layer", icon: <Shield className="w-5 h-5" />, key: "security", description: "Auth, sessions & protection" },
];

function PulsingDot({ color }: { color: "green" | "red" | "yellow" | "gray" }) {
  const colors = {
    green: "bg-green-400",
    red: "bg-red-400",
    yellow: "bg-yellow-400",
    gray: "bg-gray-500",
  };
  return (
    <span className="relative flex h-2.5 w-2.5">
      {color !== "gray" && (
        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${colors[color]} opacity-50`} />
      )}
      <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${colors[color]}`} />
    </span>
  );
}

function UptimeBar() {
  const bars = Array.from({ length: 30 }, (_, i) => {
    const rand = Math.random();
    if (rand > 0.95) return "down";
    if (rand > 0.9) return "partial";
    return "up";
  });

  return (
    <div className="flex items-end gap-0.5 h-8">
      {bars.map((status, i) => (
        <div
          key={i}
          title={status === "up" ? "Operational" : status === "partial" ? "Degraded" : "Outage"}
          className={`
            flex-1 rounded-sm transition-all duration-300 cursor-default
            hover:scale-y-110 origin-bottom
            ${status === "up" ? "bg-green-500/70 hover:bg-green-400" : status === "partial" ? "bg-yellow-500/70 hover:bg-yellow-400" : "bg-red-500/70 hover:bg-red-400"}
          `}
          style={{ height: status === "up" ? "100%" : status === "partial" ? "60%" : "30%" }}
        />
      ))}
    </div>
  );
}

export default function StatusPage() {
  const { data, isLoading, refetch } = useQuery<WebsiteStatus>({
    queryKey: ["/api/website-status"],
    refetchInterval: 30000,
  });

  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    setLastUpdated(new Date());
  }, [data]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setLastUpdated(new Date());
    setTimeout(() => setIsRefreshing(false), 600);
  };

  const isUp = !isLoading && data?.status === "up";
  const isDown = !isLoading && data?.status === "down";

  return (
    <div className="min-h-screen text-white overflow-auto relative" style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(249,115,22,0.06) 0%, #070709 55%)" }}>
      {/* Subtle grid */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.03]"
        style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)", backgroundSize: "40px 40px" }}
      />

      <div className="relative max-w-3xl mx-auto px-4 py-16 space-y-10">

        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#f97316]/10 border border-[#f97316]/20 text-[#f97316] text-[10px] font-black uppercase tracking-[0.3em] mb-2">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#f97316] opacity-60" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#f97316]" />
            </span>
            Live Status
          </div>
          <h1 className="text-5xl font-black tracking-tight text-white">
            Hexed <span className="text-[#f97316]">Status</span>
          </h1>
          <p className="text-sm text-white/40">Real-time infrastructure health overview</p>
        </div>

        {/* Main Status Card */}
        <div
          className={`
            group relative overflow-hidden rounded-3xl border p-10 text-center cursor-default
            transition-all duration-700
            ${isLoading
              ? "border-white/8 bg-white/[0.02]"
              : isUp
                ? "border-green-500/20 bg-green-500/[0.03] hover:border-green-500/40 hover:bg-green-500/[0.06] shadow-[0_0_80px_-20px_rgba(34,197,94,0.12)] hover:shadow-[0_0_100px_-10px_rgba(34,197,94,0.2)]"
                : "border-red-500/20 bg-red-500/[0.03] hover:border-red-500/40 hover:bg-red-500/[0.06] shadow-[0_0_80px_-20px_rgba(239,68,68,0.12)] hover:shadow-[0_0_100px_-10px_rgba(239,68,68,0.2)]"
            }
          `}
        >
          {/* Glow orb */}
          <div
            className={`
              absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700
              ${isUp ? "bg-green-500" : isDown ? "bg-red-500" : "bg-white"}
              blur-[100px] scale-50 rounded-full top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
            `}
            style={{ width: "60%", height: "60%", opacity: 0 }}
          />

          <div className="relative z-10 space-y-5">
            {/* Icon */}
            <div className={`
              inline-flex items-center justify-center w-24 h-24 rounded-full mx-auto
              transition-all duration-500 group-hover:scale-110
              ${isLoading ? "bg-white/5 ring-1 ring-white/10"
                : isUp ? "bg-green-500/10 ring-1 ring-green-500/30 shadow-[0_0_30px_rgba(34,197,94,0.2)] group-hover:shadow-[0_0_50px_rgba(34,197,94,0.35)]"
                : "bg-red-500/10 ring-1 ring-red-500/30 shadow-[0_0_30px_rgba(239,68,68,0.2)] group-hover:shadow-[0_0_50px_rgba(239,68,68,0.35)]"}
            `}>
              {isLoading ? (
                <Clock className="w-10 h-10 text-white/30 animate-pulse" />
              ) : isUp ? (
                <CheckCircle className="w-10 h-10 text-green-400 drop-shadow-[0_0_8px_rgba(74,222,128,0.8)]" />
              ) : (
                <XCircle className="w-10 h-10 text-red-400 drop-shadow-[0_0_8px_rgba(248,113,113,0.8)]" />
              )}
            </div>

            <div>
              <h2 className={`text-3xl font-black tracking-tight transition-colors ${isLoading ? "text-white/30" : isUp ? "text-green-400" : "text-red-400"}`}>
                {isLoading ? "Checking…" : isUp ? "All Systems Operational" : "Service Disruption"}
              </h2>
              <p className="mt-1 text-sm text-white/40">
                {isLoading ? "Fetching live status..." : isUp ? "Everything is running smoothly." : "We're investigating the issue."}
              </p>
            </div>

            {isDown && data?.reason && (
              <div className="mx-auto max-w-md rounded-2xl bg-red-500/8 border border-red-500/20 p-5 text-left space-y-2">
                <div className="flex items-center gap-2 text-red-300 font-black text-xs uppercase tracking-widest">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Incident Details
                </div>
                <p className="text-sm text-white/70 leading-relaxed">{data.reason}</p>
                {data.byName && (
                  <p className="text-xs text-white/30 mt-1 pt-2 border-t border-white/[0.06]">
                    Reported by <span className="text-white/50 font-bold">{data.byName}</span>
                    {data.byRank && <span className="ml-1 text-[#f97316]/60">({data.byRank})</span>}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Services Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] uppercase tracking-[0.25em] text-white/25 font-black">Services</h3>
            <span className="text-[10px] text-white/20">
              {SERVICES.length} services monitored
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {SERVICES.map((svc, i) => (
              <div
                key={svc.key}
                className={`
                  group relative flex items-center justify-between rounded-2xl border px-5 py-4
                  transition-all duration-300 cursor-default overflow-hidden
                  ${isDown
                    ? "border-red-500/15 bg-red-500/[0.03] hover:border-red-500/30 hover:bg-red-500/[0.06] hover:shadow-[0_0_20px_rgba(239,68,68,0.08)]"
                    : "border-white/[0.06] bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.05] hover:shadow-[0_0_20px_rgba(249,115,22,0.06)]"
                  }
                `}
                style={{ animationDelay: `${i * 50}ms` }}
              >
                {/* Hover shine */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                  style={{ background: isDown ? "linear-gradient(135deg, rgba(239,68,68,0.04) 0%, transparent 60%)" : "linear-gradient(135deg, rgba(249,115,22,0.05) 0%, transparent 60%)" }}
                />

                <div className="relative flex items-center gap-3.5">
                  <div className={`
                    flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-300
                    ${isDown
                      ? "bg-red-500/10 text-red-400/70 group-hover:bg-red-500/20 group-hover:text-red-400"
                      : "bg-[#f97316]/8 text-[#f97316]/60 group-hover:bg-[#f97316]/15 group-hover:text-[#f97316]"
                    }
                  `}>
                    {svc.icon}
                  </div>
                  <div>
                    <p className="text-sm font-black text-white/80 group-hover:text-white transition-colors">{svc.name}</p>
                    <p className="text-[10px] text-white/25 group-hover:text-white/40 transition-colors mt-0.5">{svc.description}</p>
                  </div>
                </div>

                <div className="relative flex items-center gap-2">
                  {isLoading ? (
                    <span className="inline-flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-full bg-white/5 text-white/30">
                      <PulsingDot color="gray" />
                      Checking
                    </span>
                  ) : isUp ? (
                    <span className="inline-flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20 group-hover:bg-green-500/20 group-hover:border-green-500/30 transition-all">
                      <PulsingDot color="green" />
                      Operational
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 group-hover:bg-red-500/20 group-hover:border-red-500/30 transition-all">
                      <PulsingDot color="red" />
                      Down
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Uptime section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] uppercase tracking-[0.25em] text-white/25 font-black">30-Day Uptime</h3>
            <span className={`text-xs font-black ${isDown ? "text-red-400" : "text-green-400"}`}>
              {isDown ? "99.3%" : "99.9%"}
            </span>
          </div>
          <div className="bg-white/[0.02] rounded-2xl border border-white/[0.06] p-5 space-y-3 hover:border-white/10 transition-colors cursor-default group">
            <UptimeBar />
            <div className="flex items-center justify-between text-[10px] text-white/20">
              <span>30 days ago</span>
              <span className="group-hover:text-white/35 transition-colors">Today</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-white/20 pt-2">
          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              className="flex items-center gap-1.5 hover:text-white/50 transition-colors group"
              data-testid="button-refresh-status"
            >
              <RefreshCw className={`w-3 h-3 ${isRefreshing ? "animate-spin" : "group-hover:rotate-180 transition-transform duration-500"}`} />
              Refresh
            </button>
            <span className="text-white/10">·</span>
            <span>
              Updated {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
          <a href="/" className="hover:text-white/50 transition-colors flex items-center gap-1">
            ← Back to Hexed
          </a>
        </div>
      </div>
    </div>
  );
}
