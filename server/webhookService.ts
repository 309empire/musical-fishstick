import { db } from "./db";
import { webhooks } from "@shared/schema";
import { eq } from "drizzle-orm";

const COLORS: Record<string, number> = {
  account_created: 0x22c55e,
  database_updated: 0x6366f1,
  gained_views: 0xf97316,
  gained_likes: 0xef4444,
  leaderboard_update: 0xeab308,
  leaderboard: 0xfbbf24,
  profile_settings_changed: 0x8b5cf6,
  received_badges: 0xf59e0b,
  uploads: 0x06b6d4,
  website_visit: 0x3b82f6,
  admin_panel_logs: 0xf43f5e,
  ticket_logs: 0x10b981,
  website_status: 0xdc2626,
  ai_support_logs: 0xa855f7,
};

async function getWebhooksForType(logType: string): Promise<string[]> {
  try {
    const rows = await db.select().from(webhooks).where(eq(webhooks.logType, logType));
    return rows.map(r => r.webhookUrl).filter(Boolean);
  } catch {
    return [];
  }
}

async function sendToWebhook(url: string, embed: object) {
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ embeds: [embed] }),
      signal: AbortSignal.timeout(5000),
    });
  } catch {}
}

export async function fireWebhook(logType: string, embed: Record<string, any>) {
  const urls = await getWebhooksForType(logType);
  const color = COLORS[logType] ?? 0xf97316;
  const fullEmbed = {
    color,
    timestamp: new Date().toISOString(),
    footer: { text: "Hexed Logs" },
    ...embed,
  };
  for (const url of urls) {
    sendToWebhook(url, fullEmbed).catch(() => {});
  }
}

export function makeProfileUrl(username: string) {
  const domain = process.env.REPLIT_DOMAINS?.split(",")[0] || process.env.DOMAIN || "hexed.at";
  return `https://${domain}/${username}`;
}
