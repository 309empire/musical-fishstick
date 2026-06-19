import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { users, profiles, badges, tracks, viewLogs, links, templates, discordEvents, tickets, ticketMessages, botSettings, announcements, changelogs, profileLikes, ourTeam, webhooks, isStaff, canManageBadges, canGiveBadges, canAccessBotSettings, canManageTeam, canManageWebsite, canManageChangelogs, canManageOurTeam, ROLE_HIERARCHY } from "@shared/schema";
import { fireWebhook, makeProfileUrl } from "./webhookService";
import { eq, sql, and, desc } from "drizzle-orm";
import { db } from "./db";
import { pool } from "./db";
import bcrypt from "bcryptjs";
import { registerUploadRoutes, initStorage, getStorageMode } from "./localUploads";
import rateLimit from "express-rate-limit";
import fs from "fs";
import path from "path";

// Helper: check if user is staff
const isAdminOrStaff = (role: string) => isStaff(role);

// Super owner Discord ID - has authority over all roles including owners
const SUPER_OWNER_DISCORD_ID = "1243269414900596787";
const isSuperOwner = (user: any) => user?.discordId === SUPER_OWNER_DISCORD_ID;

// ─── Challenge definitions ──────────────────────────────────────────────────
const CHALLENGES = [
  { id: "views_10", label: "Gain 10 views", type: "views", target: 10 },
  { id: "views_50", label: "Gain 50 views", type: "views", target: 50 },
  { id: "views_100", label: "Gain 100 views", type: "views", target: 100 },
  { id: "views_150", label: "Gain 150 views", type: "views", target: 150 },
  { id: "likes_50", label: "Gain 50 likes", type: "likes", target: 50 },
  { id: "likes_100", label: "Gain 100 likes", type: "likes", target: 100 },
  { id: "views_500", label: "Gain 500 views", type: "views", target: 500 },
  { id: "views_1000", label: "Gain 1000 views", type: "views", target: 1000 },
];

// Auto-progress challenges based on current views/likes
async function autoProgressChallenges(userId: number, currentViews: number, currentLikes: number) {
  try {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) return;
    const completed: string[] = (user.completedChallenges as string[]) || [];
    let changed = false;
    for (const ch of CHALLENGES) {
      if (completed.includes(ch.id)) continue;
      const val = ch.type === "views" ? currentViews : currentLikes;
      if (val >= ch.target) {
        completed.push(ch.id);
        changed = true;
      }
    }
    if (!changed) return;
    const updates: any = { completedChallenges: completed };
    // Award Questor badge at 5 completions
    if (completed.length >= 5) {
      const currentBadges: string[] = (user.badges as string[]) || [];
      if (!currentBadges.includes("Questor")) {
        const [existBadge] = await db.select().from(badges).where(eq(badges.name, "Questor"));
        if (!existBadge) {
          await db.insert(badges).values({ name: "Questor", icon: "⚔️", description: "Completed 5 profile challenges", howToGet: "Complete 5 challenges", color: "#8B5CF6" }).catch(() => {});
        }
        updates.badges = [...currentBadges, "Questor"];
      }
    }
    await db.update(users).set(updates).where(eq(users.id, userId));
  } catch (_) {}
}

// ─── Per-route rate limiters ───────────────────────────────────────────────────
// keyGenerator uses userId when available; falls back to "anon" for guests
// validate.ip=false suppresses IPv6 handler warning since we don't use req.ip
const makeKeyGen = (req: any) => (req.user as any)?.id?.toString() ?? "anon";

const aiChatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: makeKeyGen,
  validate: { ip: false },
  message: { error: "Too many messages. Please slow down." },
  skip: () => process.env.NODE_ENV !== "production",
});

const ticketCreateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: makeKeyGen,
  validate: { ip: false },
  message: { message: "Too many tickets. Please wait before opening another." },
});

const profileSaveLimiter = rateLimit({
  windowMs: 5 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: makeKeyGen,
  validate: { ip: false },
  message: { message: "Whoa, calm down. Try again later." },
});

const ticketMsgLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: makeKeyGen,
  validate: { ip: false },
  message: { message: "Sending too fast. Please slow down." },
});

// Force-logout a user by deleting their sessions from the store
async function forceLogoutUser(userId: number) {
  try {
    await pool.query(
      `DELETE FROM session WHERE sess->'passport'->>'user' = $1`,
      [String(userId)]
    );
  } catch (_) {}
}

// Protected badge names that cannot be deleted
const PROTECTED_BADGES = ["Premium", "Rich", "Silver Donator", "Lovely Donator", "Server Booster"];

// Shop products definition
export const SHOP_PRODUCTS = [
  {
    id: "premium",
    name: "Premium",
    price: 4.99,
    icon: "💎",
    description: "Access all premium features of Hexed.",
    features: [
      "Remove Hexed watermark from your profile",
      "Unlock advanced visual effects (retro, glitch, VHS, oldtv, night)",
      "Premium badge on your profile",
      "Priority support",
      "Unlimited music tracks",
      "Custom badge slot",
      "Early access to new features",
    ],
    badgeName: "Premium",
    grantsPremium: true,
    color: "#9333ea",
    bgColor: "#1e1040",
  },
  {
    id: "rich-badge",
    name: "Rich Badge",
    price: 20.00,
    icon: "💸",
    description: "Show your richness on Hexed.",
    features: [
      "Show your richness with the rich badge",
      "Support Hexed with your contribution",
      "Help us pay for servers and keep the lights on",
      "Invest in the future of us with your donation",
    ],
    badgeName: "Rich",
    grantsPremium: false,
    color: "#f59e0b",
    bgColor: "#1c1200",
  },
  {
    id: "silver-donator",
    name: "Silver Donator",
    price: 1.99,
    icon: "🥈",
    description: "Support Hexed and get the Silver Donator badge.",
    features: [
      "Silver Donator badge on your profile",
      "Support Hexed development",
      "Help keep the servers running",
    ],
    badgeName: "Silver Donator",
    grantsPremium: false,
    color: "#94a3b8",
    bgColor: "#0f1622",
  },
  {
    id: "lovely-donator",
    name: "Lovely Donator",
    price: 3.99,
    icon: "💝",
    description: "Show your love for Hexed with this special badge.",
    features: [
      "Lovely Donator badge on your profile",
      "Show your support with a beautiful badge",
      "Help the community grow",
    ],
    badgeName: "Lovely Donator",
    grantsPremium: false,
    color: "#ec4899",
    bgColor: "#1a0a10",
  },
  {
    id: "alias-slot",
    name: "+1 Alias Slot",
    price: 1.00,
    icon: "🔗",
    description: "Add an extra alias to your profile URL.",
    features: [
      "+1 additional alias slot for your profile",
      "Be found under a custom URL like /yourchoice",
      "Great for personal branding",
    ],
    badgeName: null,
    grantsPremium: false,
    color: "#6366f1",
    bgColor: "#0d0d1c",
  },
];

// ─── Discord / bot OG embed middleware ────────────────────────────────────────
// Intercepts requests from Discord, Twitter, Slack, Telegram bots etc. and
// serves a lightweight HTML response containing Open Graph meta tags so that
// link previews (embeds) work correctly for SPAs.

function escAttr(s: string) {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function buildOgHtml(tags: Record<string, string>, twitterCard: string = "summary") {
  const metas = Object.entries(tags)
    .map(([k, v]) => `<meta property="${k}" content="${escAttr(v)}" />`)
    .join("\n");
  return `<!DOCTYPE html><html><head>${metas}\n<meta name="theme-color" content="${escAttr(tags["og:color"] ?? "#F97316")}" /><meta name="twitter:card" content="${escAttr(twitterCard)}" /></head><body></body></html>`;
}

async function discordEmbedMiddleware(req: Request, res: Response, next: NextFunction) {
  const ua = req.headers["user-agent"] || "";
  const isBot = /Discordbot|Twitterbot|facebookexternalhit|Slackbot|LinkedInBot|TelegramBot|WhatsApp|bot|crawler|spider/i.test(ua);
  if (!isBot) return next();

  const host = req.get("host") || "hexed.at";
  const protocol = req.protocol || "https";
  const origin = `${protocol}://${host}`;
  const path = req.path;

  if (path === "/") {
    return res.status(200).set("Content-Type", "text/html").end(buildOgHtml({
      "og:type": "website",
      "og:url": `${origin}/`,
      "og:site_name": "Hexed",
      "og:title": "Hexed",
      "og:description": "Create your free bio page in seconds.",
      "og:image": `${origin}/favicon.png`,
      "og:image:width": "256",
      "og:image:height": "256",
      "og:color": "#F97316",
    }));
  }

  // Profile pages: single path segment that doesn't belong to a known route
  const RESERVED = new Set(["api", "auth", "objects", "shop", "login", "register", "dashboard", "team", "founders", "changes", "templates", "tos", "secret", "assets", "easter-event", "leaderboard", "status", "x"]);
  const segment = path.replace(/^\//, "").split("/")[0];
  if (segment && !RESERVED.has(segment) && /^[a-zA-Z0-9_\-.]+$/.test(segment)) {
    try {
      let [user] = await db.select().from(users).where(sql`LOWER(${users.username}) = LOWER(${segment})`);
      if (!user) {
        const [aliasUser] = await db.select().from(users).where(sql`LOWER(${users.alias}) = LOWER(${segment})`);
        if (aliasUser) user = aliasUser;
      }
      if (!user) {
        const segLower = segment.toLowerCase();
        const aliasArrResult = await pool.query(`SELECT * FROM users WHERE aliases @> $1::jsonb LIMIT 1`, [JSON.stringify([segLower])]);
        if (aliasArrResult.rows[0]) user = aliasArrResult.rows[0] as any;
      }
      if (user && user.role !== "banned") {
        const [profile] = await db.select().from(profiles).where(eq(profiles.userId, user.id));
        const s: Record<string, any> = (profile?.settings as any) || {};

        const displayName = profile?.displayName || user.username;
        const bio = profile?.bio || "";
        const themeColor = profile?.themeColor || "#F97316";

        const showWatermark = profile?.showWatermark !== false;
        const isPremium = user.isPremium;
        const defaultTitle = (isPremium && !showWatermark) ? displayName : `${displayName} — Hexed`;
        const embedTitle = s.discordEmbedTitle || defaultTitle;
        const embedDesc  = s.discordEmbedDescription || bio || `Check out ${displayName}'s profile on Hexed.`;
        const showAvatar = s.discordEmbedShowAvatar !== false;
        const rawAvatar  = profile?.avatarUrl || "";
        const customImage = s.discordEmbedCustomImage || "";
        const imageSize = s.discordEmbedImageSize || "small";
        const twitterCard = imageSize === "large" ? "summary_large_image" : "summary";
        let imageUrl = `${origin}/favicon.png`;
        if (customImage) {
          imageUrl = customImage.startsWith("/objects/") ? `${origin}${customImage}` : customImage;
        } else if (showAvatar && rawAvatar) {
          imageUrl = rawAvatar.startsWith("/objects/") ? `${origin}${rawAvatar}` : rawAvatar;
        }

        return res.status(200).set("Content-Type", "text/html").end(buildOgHtml({
          "og:type": "profile",
          "og:url": `${origin}/${segment}`,
          "og:site_name": "Hexed",
          "og:title": embedTitle,
          "og:description": embedDesc,
          "og:image": imageUrl,
          "og:image:width": imageSize === "large" ? "1200" : "256",
          "og:image:height": imageSize === "large" ? "630" : "256",
          "og:color": themeColor,
        }, twitterCard));
      }
    } catch (_) {}
  }

  return next();
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Load saved bot settings from DB into process.env before auth setup
  try {
    const rows = await pool.query("SELECT key, value FROM bot_settings");
    for (const row of rows.rows) {
      if (!row.value) continue;
      // Skip DISCORD_CALLBACK_URL if it's a full Discord OAuth URL (accidentally saved)
      if (row.key === "DISCORD_CALLBACK_URL") {
        const val: string = row.value;
        if (val.startsWith("https://discord.com") || !val.includes("/auth/discord/callback")) {
          console.warn("[startup] Ignoring invalid DISCORD_CALLBACK_URL stored in DB:", val.slice(0, 60));
          continue;
        }
      }
      process.env[row.key] = row.value;
    }
  } catch (_) {} // table may not exist yet on first boot

  setupAuth(app);
  registerUploadRoutes(app);

  // Discord/bot OG embed middleware — must come before route handlers
  app.use(discordEmbedMiddleware);

  // Update lastSeenAt for authenticated users on every request (throttled to once per 60s)
  const lastSeenCache = new Map<number, number>();
  app.use((req, res, next) => {
    if (req.isAuthenticated && req.isAuthenticated() && (req as any).user) {
      const uid = (req as any).user.id as number;
      const now = Date.now();
      const last = lastSeenCache.get(uid) || 0;
      if (now - last > 60_000) {
        lastSeenCache.set(uid, now);
        db.update(users).set({ lastSeenAt: new Date() }).where(eq(users.id, uid)).catch(() => {});
      }
    }
    next();
  });

  // Auto-create templates table if needed
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS templates (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        username TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT DEFAULT '',
        preview_image_url TEXT,
        profile_snapshot JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW(),
        uses INTEGER DEFAULT 0
      )
    `);
    await pool.query(`ALTER TABLE templates ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'`);
    await pool.query(`ALTER TABLE templates ADD COLUMN IF NOT EXISTS favorites INTEGER DEFAULT 0`);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS template_favorites (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) NOT NULL,
        template_id INTEGER REFERENCES templates(id) ON DELETE CASCADE NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, template_id)
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS template_last_used (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) NOT NULL,
        template_id INTEGER REFERENCES templates(id) ON DELETE CASCADE NOT NULL,
        used_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, template_id)
      )
    `);
  } catch (_) {}

  // ─── Auto-migrate columns ────────────────────────────────────────────────
  try {
    await pool.query(`ALTER TABLE badges ADD COLUMN IF NOT EXISTS available BOOLEAN DEFAULT TRUE`);
    await pool.query(`ALTER TABLE badges ADD COLUMN IF NOT EXISTS badge_order INTEGER DEFAULT 0`);
    await pool.query(`ALTER TABLE badges ADD COLUMN IF NOT EXISTS role_id TEXT DEFAULT ''`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS hidden_badges JSONB DEFAULT '[]'`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS easter_egg_claimed BOOLEAN DEFAULT false`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS daily_streak INTEGER DEFAULT 0`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_daily_claim TIMESTAMP`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS aliases JSONB DEFAULT '[]'`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS completed_challenges JSONB DEFAULT '[]'`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMP`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS bonus_likes INTEGER DEFAULT 0`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS user_status TEXT DEFAULT 'active'`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS presence_status TEXT DEFAULT 'offline'`);
    await pool.query(`CREATE TABLE IF NOT EXISTS easter_event_submissions (id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, username TEXT NOT NULL, discord_id TEXT, submitted_at TIMESTAMP DEFAULT NOW(), UNIQUE(user_id))`);

    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_setup_done BOOLEAN DEFAULT false`);
    // One-time migration: mark pre-existing users (created before this feature) as setup-done.
    // Tracked via bot_settings so it only runs once and doesn't affect new users.
    const migCheck = await pool.query(`SELECT value FROM bot_settings WHERE key = 'migrated_profile_setup_done' LIMIT 1`).catch(() => ({ rows: [] }));
    if (migCheck.rows.length === 0) {
      await pool.query(`UPDATE users SET profile_setup_done = true WHERE profile_setup_done IS NULL OR profile_setup_done = false`);
      await pool.query(`INSERT INTO bot_settings (key, value) VALUES ('migrated_profile_setup_done', 'true') ON CONFLICT (key) DO UPDATE SET value = 'true'`).catch(() => {});
    }
    // Rename legacy "Quester" badge to "Questor" for existing users
    await pool.query(`UPDATE users SET badges = (SELECT jsonb_agg(CASE WHEN val::text = '"Quester"' THEN '"Questor"'::jsonb ELSE val END) FROM jsonb_array_elements(badges) AS val) WHERE badges @> '"Quester"'`).catch(() => {});
    await pool.query(`UPDATE badges SET name = 'Questor' WHERE name = 'Quester'`).catch(() => {});
    await pool.query(`ALTER TABLE profiles ALTER COLUMN reveal_enabled SET DEFAULT true`).catch(() => {});
    await pool.query(`
      CREATE TABLE IF NOT EXISTS profile_likes (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) NOT NULL,
        ip_address TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
  } catch (_) {}

  await initStorage();

  // Auto-seed admin user
  const adminUsername = "abdz1";
  const adminEmail = "admin@example.com";
  const existingAdmin = await storage.getUserByUsername(adminUsername);
  const existingEmail = await db.select().from(users).where(eq(users.email, adminEmail));

  if (!existingAdmin && existingEmail.length === 0) {
    const hashedPassword = await bcrypt.hash("man1", 10);
    const [user] = await db.insert(users).values({
      username: adminUsername,
      password: hashedPassword,
      email: adminEmail,
      role: "owner",
      profileSetupDone: true,
    }).returning();
    await db.insert(profiles).values({ userId: user.id, displayName: "abdz1", bio: "Platform Owner" });
  }

  // Auto-seed protected badges
  for (const product of SHOP_PRODUCTS) {
    if (!product.badgeName) continue;
    const existing = await db.select().from(badges).where(eq(badges.name, product.badgeName));
    if (existing.length === 0) {
      const iconMap: Record<string, string> = {
        "Premium": "💎",
        "Rich": "💸",
        "Silver Donator": "🥈",
        "Lovely Donator": "💝",
      };
      const colorMap: Record<string, string> = {
        "Premium": "#9333ea",
        "Rich": "#f59e0b",
        "Silver Donator": "#94a3b8",
        "Lovely Donator": "#ec4899",
      };
      await db.insert(badges).values({
        name: product.badgeName,
        icon: iconMap[product.badgeName] || "⭐",
        color: colorMap[product.badgeName] || "#F97316",
        isProtected: true,
      });
    }
  }

  // Auto-seed achievement badges
  const ACHIEVEMENT_BADGES = [
    { name: "100 Views",              icon: "👁️",  color: "#F97316", description: "Earned 100 profile views",        howToGet: "Get 100 total profile views",          isProtected: false },
    { name: "500 Views",              icon: "👁️",  color: "#F97316", description: "Earned 500 profile views",        howToGet: "Get 500 total profile views",          isProtected: false },
    { name: "1K Views",               icon: "🔥",  color: "#EF4444", description: "Earned 1,000 profile views",      howToGet: "Get 1,000 total profile views",        isProtected: false },
    { name: "5K Views",               icon: "⚡",  color: "#EAB308", description: "Earned 5,000 profile views",      howToGet: "Get 5,000 total profile views",        isProtected: false },
    { name: "Loved by the Community", icon: "❤️",  color: "#EF4444", description: "Reached 100 profile likes",       howToGet: "Get 100 likes on your profile",        isProtected: false },
    { name: "Day 7 Streak",           icon: "🔥",  color: "#F97316", description: "Logged in 7 days in a row",       howToGet: "Claim daily rewards for 7 consecutive days", isProtected: false },
    { name: "Questor",                 icon: "⚔️",  color: "#8B5CF6", description: "Completed 5 profile challenges",  howToGet: "Complete 5 challenges in the Extras tab",  isProtected: false },
  ];
  for (const ab of ACHIEVEMENT_BADGES) {
    const existing = await db.select().from(badges).where(eq(badges.name, ab.name));
    if (existing.length === 0) {
      await db.insert(badges).values(ab).catch(() => {});
    }
  }

  // Auto-seed Winner badge (awarded via wheel spin)
  const winnerBadgeExisting = await db.select().from(badges).where(eq(badges.name, "Winner"));
  if (winnerBadgeExisting.length === 0) {
    await db.insert(badges).values({
      name: "Winner",
      icon: "🏆",
      color: "#eab308",
      description: "Won the Hexed wheel spin.",
      howToGet: "Win the wheel spin at hexed.at/hexed/wheelspin",
      isProtected: false,
    }).catch(() => {});
  }

  // Auto-seed Server Booster badge (linked to Discord booster role)
  const boosterBadgeExisting = await db.select().from(badges).where(eq(badges.name, "Server Booster"));
  if (boosterBadgeExisting.length === 0) {
    await db.insert(badges).values({
      name: "Server Booster",
      icon: "🌸",
      color: "#ff73fa",
      description: "Boosting the Hexed Discord server.",
      howToGet: "Boost the Hexed Discord server.",
      roleId: "1475950301021212849",
      isProtected: true,
    }).catch(() => {});
  } else if (boosterBadgeExisting.length > 0 && !boosterBadgeExisting[0].roleId) {
    await db.update(badges).set({ roleId: "1475950301021212849" }).where(eq(badges.name, "Server Booster")).catch(() => {});
  }

  // Auto-seed Premium badge (linked to Discord premium role)
  const PREMIUM_ROLE_ID = "1483130889801039942";
  const premiumBadgeExisting = await db.select().from(badges).where(eq(badges.name, "Premium"));
  if (premiumBadgeExisting.length === 0) {
    await db.insert(badges).values({
      name: "Premium",
      icon: "💎",
      color: "#a855f7",
      description: "Premium member of Hexed.",
      howToGet: "Purchase Premium or hold the Premium Discord role.",
      roleId: PREMIUM_ROLE_ID,
      isProtected: true,
    }).catch(() => {});
  } else if (premiumBadgeExisting.length > 0 && premiumBadgeExisting[0].roleId !== PREMIUM_ROLE_ID) {
    await db.update(badges).set({ roleId: PREMIUM_ROLE_ID }).where(eq(badges.name, "Premium")).catch(() => {});
  }

  // ─── Admin: Databank ───────────────────────────────────────────────────────

  app.get("/api/admin/users", async (req, res) => {
    if (!req.isAuthenticated() || !isStaff((req.user as any).role)) return res.sendStatus(403);
    const allUsers = await db.select().from(users);
    res.json(allUsers);
  });

  app.patch("/api/admin/users/:id", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role === "user") return res.sendStatus(403);
    const requestingRole = (req.user as any).role;
    const targetId = parseInt(req.params.id);
    const [targetUser] = await db.select().from(users).where(eq(users.id, targetId));
    if (!targetUser) return res.sendStatus(404);

    const { role, badges: userBadges, maxTracks, maxTags, isPremium, maxAliases, alias: adminAlias } = req.body;

    const superOwner = isSuperOwner(req.user);

    if (targetId === (req.user as any).id && role !== undefined) {
      return res.status(400).json({ message: "Cannot modify your own role" });
    }
    if (targetUser.role === "owner" && !superOwner && role !== undefined) {
      return res.status(403).json({ message: "Owner role cannot be changed" });
    }
    if (role === "owner" && !superOwner) return res.status(403).json({ message: "Cannot promote to owner" });
    if (role === "admin" && requestingRole !== "owner" && !superOwner) return res.status(403).json({ message: "Only owners can promote to admin" });

    const updateObj: any = {};
    if (userBadges !== undefined) updateObj.badges = userBadges;
    if (maxTracks !== undefined) updateObj.maxTracks = maxTracks;
    if (maxTags !== undefined) updateObj.maxTags = maxTags;
    if (maxAliases !== undefined) updateObj.maxAliases = maxAliases;
    if (role !== undefined) updateObj.role = role;
    if (adminAlias !== undefined) {
      if (adminAlias === null || adminAlias === "") {
        updateObj.alias = null;
      } else {
        const clean = (adminAlias as string).toLowerCase().trim().replace(/[^a-z0-9_-]/g, "");
        if (clean.length >= 2 && clean.length <= 30) {
          updateObj.alias = clean;
        }
      }
    }
    if (isPremium !== undefined) {
      updateObj.isPremium = isPremium;
      const curr: string[] = (targetUser.badges as string[]) || [];
      if (isPremium && !curr.includes("Premium")) {
        updateObj.badges = userBadges !== undefined ? userBadges : [...curr, "Premium"];
      } else if (!isPremium && curr.includes("Premium")) {
        updateObj.badges = userBadges !== undefined ? userBadges : curr.filter((b: string) => b !== "Premium");
      }
    }

    const [updated] = await db.update(users).set(updateObj).where(eq(users.id, targetId)).returning();

    if (role === "banned") {
      await forceLogoutUser(targetId);
      // Free up username and alias so others can use them
      const bannedUsername = `banned_${targetId}`;
      await db.update(users).set({
        username: bannedUsername,
        alias: null,
        aliases: [],
      }).where(eq(users.id, targetId));
      // Delete all links for the banned user
      const [bannedProfile] = await db.select().from(profiles).where(eq(profiles.userId, targetId));
      if (bannedProfile) {
        await db.delete(links).where(eq(links.profileId, bannedProfile.id));
      }
    }

    // Fire badge webhook if badges changed
    if (userBadges !== undefined) {
      const prevBadges: string[] = (targetUser.badges as string[]) || [];
      const newBadgesList: string[] = userBadges || [];
      const added = newBadgesList.filter(b => !prevBadges.includes(b));
      if (added.length > 0) {
        const actor = req.user as any;
        fireWebhook("received_badges", {
          title: "🏅 Badge(s) Received",
          description: `**[${targetUser.username}](${makeProfileUrl(targetUser.username)})** received new badge(s).`,
          fields: [
            { name: "New Badges", value: added.join(", "), inline: false },
            { name: "Discord", value: targetUser.discordUsername ? `@${targetUser.discordUsername}` : "Not linked", inline: true },
            { name: "Granted By", value: actor.username, inline: true },
            { name: "Profile", value: makeProfileUrl(targetUser.username), inline: false },
          ],
        }).catch(() => {});
      }
    }

    res.json(updated);
  });

  app.patch("/api/admin/users/:id/views", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== "owner") return res.sendStatus(403);
    const targetId = parseInt(req.params.id);
    const { delta } = req.body;
    if (typeof delta !== "number") return res.sendStatus(400);
    const [target] = await db.select().from(users).where(eq(users.id, targetId));
    if (!target) return res.sendStatus(404);
    const newViews = Math.max(0, (target.views || 0) + delta);
    const [updated] = await db.update(users).set({ views: newViews }).where(eq(users.id, targetId)).returning();
    res.json({ views: updated.views });
  });

  app.patch("/api/admin/users/:id/likes", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== "owner") return res.sendStatus(403);
    const targetId = parseInt(req.params.id);
    const { delta } = req.body;
    if (typeof delta !== "number") return res.sendStatus(400);
    const [target] = await db.select().from(users).where(eq(users.id, targetId));
    if (!target) return res.sendStatus(404);
    const newBonusLikes = Math.max(0, ((target as any).bonusLikes || 0) + delta);
    const [updated] = await db.update(users).set({ bonusLikes: newBonusLikes } as any).where(eq(users.id, targetId)).returning();
    const [countRow] = await db.select({ count: sql<number>`count(*)` }).from(profileLikes).where(eq(profileLikes.userId, targetId));
    const totalLikes = Number(countRow?.count ?? 0) + ((updated as any).bonusLikes || 0);
    res.json({ bonusLikes: (updated as any).bonusLikes, totalLikes });
  });

  app.delete("/api/admin/users/:id", async (req, res) => {
    if (!req.isAuthenticated() || ((req.user as any).role !== "owner" && !isSuperOwner(req.user))) return res.sendStatus(403);
    const targetId = parseInt(req.params.id);
    const [targetUser] = await db.select().from(users).where(eq(users.id, targetId));
    if (!targetUser) return res.sendStatus(404);
    if (targetUser.role === "owner" && !isSuperOwner(req.user)) return res.status(403).json({ message: "Cannot delete owner" });
    if (targetId === (req.user as any).id) return res.status(400).json({ message: "Cannot delete yourself" });
    await db.delete(tracks).where(eq(tracks.userId, targetId));
    await db.delete(viewLogs).where(eq(viewLogs.userId, targetId));
    const [profile] = await db.select().from(profiles).where(eq(profiles.userId, targetId));
    if (profile) await db.delete(links).where(eq(links.profileId, profile.id));
    await db.delete(profiles).where(eq(profiles.userId, targetId));
    await db.delete(users).where(eq(users.id, targetId));
    res.sendStatus(200);
  });

  app.post("/api/admin/users/:id/disconnect-discord", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const requestingUser = req.user as any;
    const superOwner = isSuperOwner(requestingUser);
    if (requestingUser.role !== "owner" && !superOwner) return res.sendStatus(403);
    const targetId = parseInt(req.params.id);
    const [targetUser] = await db.select().from(users).where(eq(users.id, targetId));
    if (!targetUser) return res.sendStatus(404);
    if (targetUser.role === "owner" && !superOwner) return res.status(403).json({ message: "Cannot disconnect discord of another owner" });
    await db.update(users).set({ discordId: null, discordAvatar: null, discordUsername: null }).where(eq(users.id, targetId));
    await forceLogoutUser(targetId);
    res.json({ ok: true });
  });

  app.get("/api/admin/users/:id/data", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const requestingUser = req.user as any;
    const superOwner = isSuperOwner(requestingUser);
    if (requestingUser.role !== "owner" && !superOwner) return res.sendStatus(403);
    const targetId = parseInt(req.params.id);
    const [targetUser] = await db.select().from(users).where(eq(users.id, targetId));
    if (!targetUser) return res.sendStatus(404);
    res.json({
      id: targetUser.id,
      username: targetUser.username,
      email: targetUser.email,
      passwordHash: targetUser.password,
      role: targetUser.role,
      discordId: targetUser.discordId,
      discordUsername: targetUser.discordUsername,
      discordAvatar: targetUser.discordAvatar,
      isPremium: targetUser.isPremium,
      joinDate: targetUser.joinDate,
      views: targetUser.views,
      badges: targetUser.badges,
      twoFactorCode: targetUser.twoFactorCode,
      twoFactorEnabled: targetUser.twoFactorEnabled,
    });
  });

  // ─── Admin: Change user password ──────────────────────────────────────────
  app.post("/api/admin/users/:id/change-password", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const requestingUser = req.user as any;
    const superOwner = isSuperOwner(requestingUser);
    if (requestingUser.role !== "owner" && !superOwner) return res.sendStatus(403);
    const targetId = parseInt(req.params.id);
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 7) {
      return res.status(400).json({ message: "Password must be at least 7 characters" });
    }
    const [targetUser] = await db.select().from(users).where(eq(users.id, targetId));
    if (!targetUser) return res.sendStatus(404);
    if (targetUser.role === "owner" && !superOwner) {
      return res.status(403).json({ message: "Cannot change another owner's password" });
    }
    const hashed = await bcrypt.hash(newPassword, 10);
    await db.update(users).set({ password: hashed }).where(eq(users.id, targetId));
    res.json({ message: "Password changed successfully" });
  });

  // ─── 2FA: Setup ───────────────────────────────────────────────────────────
  app.post("/api/user/setup-2fa", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = (req.user as any).id;
    const { code, password } = req.body;
    if (!code || code.length > 6 || code.length < 1) {
      return res.status(400).json({ message: "Code must be 1-6 characters" });
    }
    if (!password) return res.status(400).json({ message: "Password is required" });
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) return res.sendStatus(404);
    const passwordOk = await bcrypt.compare(password, user.password);
    if (!passwordOk) return res.status(401).json({ message: "Incorrect password" });
    const [updated] = await db.update(users)
      .set({ twoFactorCode: code, twoFactorEnabled: true })
      .where(eq(users.id, userId))
      .returning();
    res.json({ message: "2FA enabled", user: { ...updated, password: undefined } });
  });

  // ─── 2FA: Disable ─────────────────────────────────────────────────────────
  app.post("/api/user/disable-2fa", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = (req.user as any).id;
    const { code } = req.body;
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) return res.sendStatus(404);
    if (user.twoFactorEnabled && user.twoFactorCode) {
      if (!code || code.trim() !== user.twoFactorCode.trim()) {
        return res.status(401).json({ message: "Invalid 2FA code" });
      }
    }
    const [updated] = await db.update(users)
      .set({ twoFactorCode: null, twoFactorEnabled: false })
      .where(eq(users.id, userId))
      .returning();
    res.json({ message: "2FA disabled", user: { ...updated, password: undefined } });
  });

  // ─── 2FA: Update code ─────────────────────────────────────────────────────
  app.post("/api/user/update-2fa", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = (req.user as any).id;
    const { currentCode, newCode } = req.body;
    if (!newCode || newCode.length > 6 || newCode.length < 1) {
      return res.status(400).json({ message: "New code must be 1-6 characters" });
    }
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) return res.sendStatus(404);
    if (user.twoFactorEnabled && user.twoFactorCode) {
      if (!currentCode || currentCode.trim() !== user.twoFactorCode.trim()) {
        return res.status(401).json({ message: "Invalid current 2FA code" });
      }
    }
    const [updated] = await db.update(users)
      .set({ twoFactorCode: newCode })
      .where(eq(users.id, userId))
      .returning();
    res.json({ message: "2FA code updated", user: { ...updated, password: undefined } });
  });

  // ─── Admin: Update user 2FA code ──────────────────────────────────────────
  app.post("/api/admin/users/:id/update-2fa", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const requestingUser = req.user as any;
    const superOwner = isSuperOwner(requestingUser);
    if (requestingUser.role !== "owner" && !superOwner) return res.sendStatus(403);
    const targetId = parseInt(req.params.id);
    const { newCode, action } = req.body;
    const [targetUser] = await db.select().from(users).where(eq(users.id, targetId));
    if (!targetUser) return res.sendStatus(404);
    if (targetUser.role === "owner" && !superOwner) {
      return res.status(403).json({ message: "Cannot modify another owner's 2FA" });
    }
    if (action === "disable") {
      await db.update(users).set({ twoFactorCode: null, twoFactorEnabled: false }).where(eq(users.id, targetId));
      return res.json({ message: "2FA disabled for user" });
    }
    if (!newCode || newCode.length > 6 || newCode.length < 1) {
      return res.status(400).json({ message: "Code must be 1-6 characters" });
    }
    await db.update(users).set({ twoFactorCode: newCode }).where(eq(users.id, targetId));
    res.json({ message: "2FA code updated" });
  });

  // ─── Change password (requires 2FA if enabled) ────────────────────────────
  app.post("/api/user/change-password", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = (req.user as any).id;
    const { twoFactorCode, currentPassword, newPassword } = req.body;
    if (!newPassword || newPassword.length < 7) {
      return res.status(400).json({ message: "Password must be at least 7 characters" });
    }
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) return res.sendStatus(404);
    if (user.twoFactorEnabled && user.twoFactorCode) {
      if (!twoFactorCode || twoFactorCode.trim() !== user.twoFactorCode.trim()) {
        return res.status(401).json({ message: "Invalid 2FA code" });
      }
    }
    const passwordOk = await bcrypt.compare(currentPassword, user.password);
    if (!passwordOk) return res.status(401).json({ message: "Incorrect current password" });
    const hashed = await bcrypt.hash(newPassword, 10);
    await db.update(users).set({ password: hashed }).where(eq(users.id, userId));
    res.json({ message: "Password changed successfully" });
  });

  // ─── Tracks ───────────────────────────────────────────────────────────────

  app.get("/api/tracks", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userTracks = await db.select().from(tracks).where(eq(tracks.userId, (req.user as any).id));
    res.json(userTracks);
  });

  app.post("/api/tracks", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as any;
    const isPremium = user.isPremium;
    const maxTracks = isPremium ? 20 : (user.maxTracks || 3);
    const currentTracks = await db.select().from(tracks).where(eq(tracks.userId, user.id));
    if (currentTracks.length >= maxTracks) {
      return res.status(400).send("Max tracks reached");
    }
    const [newTrack] = await db.insert(tracks).values({ ...req.body, userId: user.id }).returning();
    res.json(newTrack);
  });

  app.patch("/api/tracks/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const { enabled } = req.body;
    const [updated] = await db.update(tracks)
      .set({ enabled: enabled ? 1 : 0 })
      .where(sql`${tracks.id} = ${parseInt(req.params.id)} AND ${tracks.userId} = ${(req.user as any).id}`)
      .returning();
    res.json(updated);
  });

  app.delete("/api/tracks/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    await db.delete(tracks).where(sql`${tracks.id} = ${parseInt(req.params.id)} AND ${tracks.userId} = ${(req.user as any).id}`);
    res.sendStatus(200);
  });

  // ─── Badges ───────────────────────────────────────────────────────────────

  app.get("/api/badges", async (_req, res) => {
    res.set("Cache-Control", "public, max-age=30, stale-while-revalidate=60");
    const allBadges = await db.select().from(badges);
    res.json(allBadges);
  });

  app.post("/api/admin/badges", async (req, res) => {
    if (!req.isAuthenticated() || !canManageBadges((req.user as any).role)) return res.sendStatus(403);
    const BADGE_ALLOWED_FIELDS = ["name", "icon", "color", "description", "howToGet", "visibleTo", "available", "roleId"];
    const insertData: Record<string, any> = {};
    for (const k of BADGE_ALLOWED_FIELDS) {
      if (req.body[k] !== undefined) insertData[k] = req.body[k];
    }
    const [newBadge] = await db.insert(badges).values(insertData).returning();
    res.json(newBadge);
  });

  app.patch("/api/admin/badges/:id", async (req, res) => {
    if (!req.isAuthenticated() || !canGiveBadges((req.user as any).role)) return res.sendStatus(403);
    const userRole = (req.user as any).role;
    const badgeId = parseInt(req.params.id);
    const [badge] = await db.select().from(badges).where(eq(badges.id, badgeId));
    if (!badge) return res.sendStatus(404);
    const BADGE_ALLOWED_FIELDS = ["name", "icon", "color", "description", "howToGet", "visibleTo", "available", "roleId", "badgeOrder"];
    const rawData = req.body;
    const updateData: Record<string, any> = {};
    for (const k of BADGE_ALLOWED_FIELDS) {
      if (rawData[k] !== undefined) updateData[k] = rawData[k];
    }
    if (badge.isProtected) delete updateData.isProtected;
    // Moderators can only update the visibleTo (badge assignment), not create/delete
    if (!canManageBadges(userRole)) {
      const allowed = ["visibleTo"];
      for (const k of Object.keys(updateData)) {
        if (!allowed.includes(k)) delete updateData[k];
      }
    }
    if (Object.keys(updateData).length === 0) return res.json(badge);
    const [updated] = await db.update(badges).set(updateData).where(eq(badges.id, badgeId)).returning();
    res.json(updated);
  });

  app.delete("/api/admin/badges/:id", async (req, res) => {
    if (!req.isAuthenticated() || !canManageBadges((req.user as any).role)) return res.sendStatus(403);
    const badgeId = parseInt(req.params.id);
    const [badge] = await db.select().from(badges).where(eq(badges.id, badgeId));
    if (!badge) return res.sendStatus(404);
    if (badge.isProtected) return res.status(403).json({ message: `The "${badge.name}" badge is protected and cannot be deleted.` });
    const allUsers = await db.select().from(users);
    for (const user of allUsers) {
      const userBadges = (user.badges as string[]) || [];
      if (userBadges.includes(badge.name)) {
        await db.update(users).set({ badges: userBadges.filter(b => b !== badge.name) }).where(eq(users.id, user.id));
      }
    }
    await db.delete(badges).where(eq(badges.id, badgeId));
    res.sendStatus(200);
  });

  // Badge reorder
  app.post("/api/admin/badges/reorder", async (req, res) => {
    if (!req.isAuthenticated() || !canManageBadges((req.user as any).role)) return res.sendStatus(403);
    const { order } = req.body; // array of { id, badgeOrder } objects OR badge IDs
    if (!Array.isArray(order)) return res.status(400).json({ message: "order array required" });
    for (const item of order) {
      if (typeof item === "object" && item.id !== undefined) {
        await db.update(badges).set({ badgeOrder: item.badgeOrder }).where(eq(badges.id, item.id));
      } else {
        const idx = order.indexOf(item);
        await db.update(badges).set({ badgeOrder: idx }).where(eq(badges.id, item));
      }
    }
    res.json({ ok: true });
  });

  // Fetch Discord roles from guild
  app.get("/api/admin/discord-roles", async (req, res) => {
    if (!req.isAuthenticated() || !canManageBadges((req.user as any).role)) return res.sendStatus(403);
    const botToken = process.env.DISCORD_BOT_TOKEN;
    const guildId = process.env.DISCORD_GUILD_ID;
    if (!botToken || !guildId) return res.status(400).json({ message: "Bot token or Guild ID not configured", roles: [] });
    try {
      const r = await fetch(`https://discord.com/api/v10/guilds/${guildId}/roles`, {
        headers: { Authorization: `Bot ${botToken}` },
      });
      if (!r.ok) return res.status(400).json({ message: "Failed to fetch roles", roles: [] });
      const data = await r.json() as any[];
      res.json({ roles: data.map((role: any) => ({ id: role.id, name: role.name, color: role.color })) });
    } catch {
      res.status(500).json({ message: "Error fetching Discord roles", roles: [] });
    }
  });

  // User: toggle badge visibility
  app.post("/api/user/badge-visibility", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = (req.user as any).id;
    const { badgeName, hidden } = req.body;
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) return res.sendStatus(404);
    const hiddenBadges: string[] = (user as any).hiddenBadges || [];
    let updated: string[];
    if (hidden) {
      updated = hiddenBadges.includes(badgeName) ? hiddenBadges : [...hiddenBadges, badgeName];
    } else {
      updated = hiddenBadges.filter(b => b !== badgeName);
    }
    await pool.query(`UPDATE users SET hidden_badges = $1 WHERE id = $2`, [JSON.stringify(updated), userId]);
    res.json({ hiddenBadges: updated });
  });

  // Team management endpoints
  app.get("/api/admin/team", async (req, res) => {
    if (!req.isAuthenticated() || !isStaff((req.user as any).role)) return res.sendStatus(403);
    const allUsers = await db.select().from(users);
    const teamMembers = allUsers.filter(u => isStaff(u.role));
    const discordUsers = allUsers.filter(u => u.discordId && !isStaff(u.role));
    res.json({ team: teamMembers, discordUsers });
  });

  app.post("/api/admin/team", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const requestingRole = (req.user as any).role;
    if (!canManageTeam(requestingRole)) return res.status(403).json({ message: "Only administrators+ can manage team" });
    const { userId, role } = req.body;
    if (!userId || !role) return res.status(400).json({ message: "userId and role required" });
    const validRoles = ["support", "moderator", "administrator", "developer", "owner"];
    if (!validRoles.includes(role)) return res.status(400).json({ message: "Invalid role" });
    // Check hierarchy
    const requestingLevel = ROLE_HIERARCHY[requestingRole] || 0;
    const targetLevel = ROLE_HIERARCHY[role] || 0;
    if (targetLevel >= requestingLevel) return res.status(403).json({ message: "Cannot assign a role equal or higher than your own" });
    const [target] = await db.select().from(users).where(eq(users.id, parseInt(userId)));
    if (!target) return res.sendStatus(404);
    if (target.role === "owner") return res.status(403).json({ message: "Cannot modify the owner" });
    const [updated] = await db.update(users).set({ role }).where(eq(users.id, parseInt(userId))).returning();
    res.json(updated);
  });

  app.delete("/api/admin/team/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const requestingRole = (req.user as any).role;
    if (!canManageTeam(requestingRole)) return res.status(403).json({ message: "Cannot manage team" });
    const targetId = parseInt(req.params.id);
    const [target] = await db.select().from(users).where(eq(users.id, targetId));
    if (!target) return res.sendStatus(404);
    if (target.role === "owner") return res.status(403).json({ message: "Cannot remove owner" });
    const requestingLevel = ROLE_HIERARCHY[requestingRole] || 0;
    const targetLevel = ROLE_HIERARCHY[target.role] || 0;
    if (targetLevel >= requestingLevel) return res.status(403).json({ message: "Cannot remove someone equal or higher rank" });
    const [updated] = await db.update(users).set({ role: "user" }).where(eq(users.id, targetId)).returning();
    res.json(updated);
  });

  // ─── Profile ──────────────────────────────────────────────────────────────

  app.get("/api/profile", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = (req.user as any).id;
    let [profile] = await db.select().from(profiles).where(eq(profiles.userId, userId));
    if (!profile) [profile] = await db.insert(profiles).values({ userId }).returning();
    res.json(profile);
  });

  app.patch("/api/profile", profileSaveLimiter, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = (req.user as any).id;
    const user = req.user as any;
    const [existing] = await db.select().from(profiles).where(eq(profiles.userId, userId));
    if (!existing) await db.insert(profiles).values({ userId });
    
    const updateData = { ...req.body };
    if (!user.isPremium && updateData.showWatermark === false) {
      updateData.showWatermark = true;
    }

    const [updated] = await db.update(profiles).set(updateData).where(eq(profiles.userId, userId)).returning();
    const [actor] = await db.select().from(users).where(eq(users.id, userId));
    if (actor) {
      fireWebhook("profile_settings_changed", {
        title: "⚙️ Profile Settings Changed",
        description: `**[${actor.username}](${makeProfileUrl(actor.username)})** updated their profile settings.`,
        fields: [
          { name: "Discord", value: actor.discordUsername ? `@${actor.discordUsername}` : "Not linked", inline: true },
          { name: "Profile", value: makeProfileUrl(actor.username), inline: false },
        ],
      }).catch(() => {});
    }
    res.json(updated);
  });

  // ─── Username / profile URL setup ────────────────────────────────────────
  app.get("/api/check-username", async (req, res) => {
    const raw = (req.query.username as string || "").trim().toLowerCase();
    if (!raw || raw.length < 1 || raw.length > 20) return res.json({ available: false, reason: "Username must be 1-20 characters" });
    if (!/^[a-zA-Z0-9_]+$/.test(raw)) return res.json({ available: false, reason: "Only letters, numbers and underscores allowed" });
    const RESERVED = ["api", "auth", "objects", "shop", "login", "register", "dashboard", "team", "founders", "changes", "templates", "tos", "secret", "assets", "hexed", "admin", "status", "leaderboard", "profile", "options", "miscellaneous", "extras", "markdowns", "wheelspin", "easter", "x"];
    if (RESERVED.includes(raw)) return res.json({ available: false, reason: "That username is reserved" });
    const currentUserId = req.isAuthenticated() ? (req.user as any).id : null;
    const [taken] = await db.select({ id: users.id }).from(users).where(sql`LOWER(${users.username}) = ${raw}`);
    if (taken && taken.id !== currentUserId) return res.json({ available: false, reason: "Username is already taken" });
    // Also check if this name conflicts with any user's alias
    const [aliasTaken] = await db.select({ id: users.id }).from(users).where(sql`LOWER(${users.alias}) = ${raw} AND ${users.id} != ${currentUserId || 0}`);
    if (aliasTaken) return res.json({ available: false, reason: "Username is already taken" });
    const aliasArrCheck = await pool.query(`SELECT id FROM users WHERE aliases @> $1::jsonb AND id != $2`, [JSON.stringify([raw]), currentUserId || 0]);
    if (aliasArrCheck.rows.length > 0) return res.json({ available: false, reason: "Username is already taken" });
    res.json({ available: true });
  });

  app.post("/api/setup-username", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = (req.user as any).id;
    const raw = (req.body.username as string || "").trim();
    if (!raw || raw.length < 1 || raw.length > 20) return res.status(400).json({ message: "Username must be 1-20 characters" });
    if (!/^[a-zA-Z0-9_]+$/.test(raw)) return res.status(400).json({ message: "Only letters, numbers and underscores allowed" });
    const RESERVED = ["api", "auth", "objects", "shop", "login", "register", "dashboard", "team", "founders", "changes", "templates", "tos", "secret", "assets", "hexed", "admin", "status", "leaderboard", "profile", "options", "miscellaneous", "extras", "markdowns", "wheelspin", "easter", "x"];
    if (RESERVED.includes(raw.toLowerCase())) return res.status(400).json({ message: "That username is reserved" });
    const [taken] = await db.select({ id: users.id }).from(users).where(sql`LOWER(${users.username}) = ${raw.toLowerCase()}`);
    if (taken && taken.id !== userId) return res.status(400).json({ message: "Username is already taken" });
    // Also check alias conflicts
    const [aliasTakenSetup] = await db.select({ id: users.id }).from(users).where(sql`LOWER(${users.alias}) = ${raw.toLowerCase()} AND ${users.id} != ${userId}`);
    if (aliasTakenSetup) return res.status(400).json({ message: "Username is already taken" });
    const aliasArrSetup = await pool.query(`SELECT id FROM users WHERE aliases @> $1::jsonb AND id != $2`, [JSON.stringify([raw.toLowerCase()]), userId]);
    if (aliasArrSetup.rows.length > 0) return res.status(400).json({ message: "Username is already taken" });
    const [updated] = await db.update(users).set({ username: raw, profileSetupDone: true }).where(eq(users.id, userId)).returning();
    res.json(updated);
  });

  app.post("/api/profile/setup-done", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = (req.user as any).id;
    await db.update(users).set({ profileSetupDone: true }).where(eq(users.id, userId));
    res.json({ ok: true });
  });

  app.post("/api/profile/reset", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = (req.user as any).id;
    try {
      const [existing] = await db.select().from(profiles).where(eq(profiles.userId, userId));
      if (!existing) return res.sendStatus(404);
      const resetData = {
        displayName: "",
        bio: "",
        location: "",
        avatarUrl: null,
        bannerUrl: null,
        backgroundUrl: null,
        backgroundVideoUrl: null,
        musicUrl: null,
        showViews: true,
        showUid: true,
        showJoinDate: true,
        showWatermark: true,
        themeColor: "#F97316",
        backgroundEffect: "none",
        revealEnabled: true,
        revealText: "Click to reveal",
        settings: {},
      };
      const [updated] = await db.update(profiles).set(resetData).where(eq(profiles.userId, userId)).returning();
      await db.delete(tracks).where(eq(tracks.userId, userId));
      res.json(updated);
    } catch (e) {
      res.status(500).json({ message: "Failed to reset profile" });
    }
  });

  // ─── Links ────────────────────────────────────────────────────────────────

  app.get("/api/links", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const [profile] = await db.select().from(profiles).where(eq(profiles.userId, (req.user as any).id));
    if (!profile) return res.json([]);
    const userLinks = await db.select().from(links).where(eq(links.profileId, profile.id));
    res.json(userLinks.sort((a: any, b: any) => (a.order || 0) - (b.order || 0)));
  });

  app.post("/api/links", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    let [profile] = await db.select().from(profiles).where(eq(profiles.userId, (req.user as any).id));
    if (!profile) [profile] = await db.insert(profiles).values({ userId: (req.user as any).id }).returning();
    const existingLinks = await db.select().from(links).where(eq(links.profileId, profile.id));
    const [newLink] = await db.insert(links).values({ ...req.body, profileId: profile.id, order: existingLinks.length }).returning();
    res.json(newLink);
  });

  app.patch("/api/links/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const [profile] = await db.select().from(profiles).where(eq(profiles.userId, (req.user as any).id));
    if (!profile) return res.sendStatus(403);
    const [updated] = await db.update(links)
      .set(req.body)
      .where(and(eq(links.id, parseInt(req.params.id)), eq(links.profileId, profile.id)))
      .returning();
    res.json(updated);
  });

  app.delete("/api/links/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const [profile] = await db.select().from(profiles).where(eq(profiles.userId, (req.user as any).id));
    if (!profile) return res.sendStatus(403);
    await db.delete(links).where(and(eq(links.id, parseInt(req.params.id)), eq(links.profileId, profile.id)));
    res.sendStatus(200);
  });

  // ─── Alias Management ─────────────────────────────────────────────────────

  app.get("/api/user/alias", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const [user] = await db.select().from(users).where(eq(users.id, (req.user as any).id));
    const aliasesArr: string[] = (user?.aliases as string[]) || (user?.alias ? [user.alias] : []);
    res.json({ alias: user?.alias || null, aliases: aliasesArr, maxAliases: user?.maxAliases ?? 1 });
  });

  app.patch("/api/user/alias", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const { alias } = req.body;
    const userId = (req.user as any).id;
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) return res.sendStatus(404);

    if (alias !== null && alias !== "") {
      const clean = (alias as string).toLowerCase().trim().replace(/[^a-z0-9_-]/g, "");
      if (!clean) return res.status(400).json({ message: "Invalid alias" });
      if (clean.length < 1 || clean.length > 30) return res.status(400).json({ message: "Alias must be 1-30 characters" });
      const reserved = ["dashboard", "login", "register", "shop", "tos", "api", "admin", "profile", "options", "miscellaneous", "extras", "markdowns", "templates", "x"];
      if (reserved.includes(clean)) return res.status(400).json({ message: "This alias is reserved" });
      const [existingUser] = await db.select().from(users).where(sql`LOWER(${users.username}) = LOWER(${clean}) AND ${users.id} != ${userId}`);
      if (existingUser) return res.status(400).json({ message: "This alias is already taken" });
      const [existingAlias] = await db.select().from(users).where(sql`LOWER(${users.alias}) = LOWER(${clean}) AND ${users.id} != ${userId}`);
      if (existingAlias) return res.status(400).json({ message: "This alias is already taken" });
      await db.update(users).set({ alias: clean }).where(eq(users.id, userId));
      return res.json({ alias: clean });
    }

    await db.update(users).set({ alias: null }).where(eq(users.id, userId));
    res.json({ alias: null });
  });

  // Add a new alias
  app.post("/api/user/aliases", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const { alias } = req.body;
    const userId = (req.user as any).id;
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) return res.sendStatus(404);

    const clean = (alias as string || "").toLowerCase().trim().replace(/[^a-z0-9_-]/g, "");
    if (!clean || clean.length < 1 || clean.length > 30) return res.status(400).json({ message: "Alias must be 1-30 characters" });

    const reserved = ["dashboard", "login", "register", "shop", "tos", "api", "admin", "profile", "options", "miscellaneous", "extras", "markdowns", "templates", "x"];
    if (reserved.includes(clean)) return res.status(400).json({ message: "This alias is reserved" });

    const currentAliases: string[] = (user.aliases as string[]) || (user.alias ? [user.alias] : []);
    const maxAliases = user.maxAliases ?? 1;
    if (maxAliases !== -1 && currentAliases.length >= maxAliases) return res.status(400).json({ message: `You can only have ${maxAliases} alias${maxAliases > 1 ? "es" : ""}` });
    if (currentAliases.includes(clean)) return res.status(400).json({ message: "You already have this alias" });

    const [existingUser] = await db.select().from(users).where(sql`LOWER(${users.username}) = LOWER(${clean}) AND ${users.id} != ${userId}`);
    if (existingUser) return res.status(400).json({ message: "This alias is already taken" });
    const [existingAlias] = await db.select().from(users).where(sql`LOWER(${users.alias}) = LOWER(${clean}) AND ${users.id} != ${userId}`);
    if (existingAlias) return res.status(400).json({ message: "This alias is already taken" });
    const existingInArray = await pool.query(`SELECT id FROM users WHERE aliases @> $1::jsonb AND id != $2`, [JSON.stringify([clean]), userId]);
    if (existingInArray.rows.length > 0) return res.status(400).json({ message: "This alias is already taken" });

    const newAliases = [...currentAliases, clean];
    await db.update(users).set({ aliases: newAliases, alias: newAliases[0] }).where(eq(users.id, userId));
    res.json({ aliases: newAliases });
  });

  // Remove an alias
  app.delete("/api/user/aliases/:alias", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = (req.user as any).id;
    const toRemove = req.params.alias.toLowerCase();
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) return res.sendStatus(404);

    const currentAliases: string[] = (user.aliases as string[]) || (user.alias ? [user.alias] : []);
    const newAliases = currentAliases.filter(a => a !== toRemove);
    await db.update(users).set({ aliases: newAliases, alias: newAliases[0] || null }).where(eq(users.id, userId));
    res.json({ aliases: newAliases });
  });

  // ─── Views History ─────────────────────────────────────────────────────────

  app.get("/api/user/views-history", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = (req.user as any).id;
    try {
      const result = await pool.query(`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as count
        FROM view_logs
        WHERE user_id = $1
          AND created_at >= NOW() - INTERVAL '30 days'
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `, [userId]);
      
      // Fill in missing days with 0
      const today = new Date();
      const days: { date: string; count: number }[] = [];
      for (let i = 29; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split("T")[0];
        const found = result.rows.find((r: any) => r.date?.toISOString?.()?.split("T")?.[0] === dateStr || r.date === dateStr);
        days.push({ date: dateStr, count: found ? parseInt(found.count) : 0 });
      }
      res.json(days);
    } catch (e) {
      res.json([]);
    }
  });

  // ─── Shop ─────────────────────────────────────────────────────────────────

  // Seed SHOP_PRODUCTS into the DB on first run
  try {
    for (let i = 0; i < SHOP_PRODUCTS.length; i++) {
      const p = SHOP_PRODUCTS[i];
      await pool.query(`
        INSERT INTO products (slug, name, description, price, sale_price, icon, image_url, features, badge_name, grants_premium, color, bg_color, sort_order, is_seeded)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,true)
        ON CONFLICT (slug) DO NOTHING
      `, [
        p.id, p.name, p.description, p.price, (p as any).salePrice ?? null,
        p.icon, null, JSON.stringify(p.features), p.badgeName ?? null,
        p.grantsPremium, p.color, p.bgColor, i,
      ]);
    }
  } catch (e) {
    console.error("[products] Failed to seed default products:", e);
  }

  app.get("/api/shop/products", async (_req, res) => {
    try {
      const result = await pool.query(`SELECT * FROM products ORDER BY sort_order ASC, created_at ASC`);
      const rows = result.rows.map((r: any) => ({
        id: r.slug,
        dbId: r.id,
        name: r.name,
        price: r.price,
        salePrice: r.sale_price,
        onSale: r.sale_price != null,
        icon: r.icon,
        imageUrl: r.image_url,
        description: r.description,
        features: Array.isArray(r.features) ? r.features : [],
        badgeName: r.badge_name,
        grantsPremium: r.grants_premium,
        color: r.color,
        bgColor: r.bg_color,
        isSeeded: r.is_seeded,
      }));
      res.json(rows);
    } catch {
      res.json(SHOP_PRODUCTS);
    }
  });

  // ─── Admin: Products CRUD ──────────────────────────────────────────────────

  app.get("/api/admin/products", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const role = (req.user as any).role;
    if (!["developer", "owner"].includes(role)) return res.sendStatus(403);
    try {
      const result = await pool.query(`SELECT * FROM products ORDER BY sort_order ASC, created_at ASC`);
      res.json(result.rows);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/admin/products", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const role = (req.user as any).role;
    if (!["developer", "owner"].includes(role)) return res.sendStatus(403);
    const { slug, name, description, price, salePrice, icon, imageUrl, features, badgeName, grantsPremium, color, bgColor, sortOrder } = req.body;
    if (!name || !slug || price == null) return res.status(400).json({ error: "name, slug, price required" });
    try {
      const result = await pool.query(`
        INSERT INTO products (slug, name, description, price, sale_price, icon, image_url, features, badge_name, grants_premium, color, bg_color, sort_order, is_seeded)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,false)
        RETURNING *
      `, [
        slug, name, description ?? "", parseFloat(price), salePrice != null ? parseFloat(salePrice) : null,
        icon ?? "📦", imageUrl ?? null, JSON.stringify(features ?? []), badgeName ?? null,
        grantsPremium ?? false, color ?? "#F97316", bgColor ?? "#0d0d0d", sortOrder ?? 0,
      ]);
      res.json(result.rows[0]);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.patch("/api/admin/products/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const role = (req.user as any).role;
    if (!["developer", "owner"].includes(role)) return res.sendStatus(403);
    const { id } = req.params;
    const { name, description, price, salePrice, icon, imageUrl, features, badgeName, grantsPremium, color, bgColor, sortOrder } = req.body;
    try {
      const result = await pool.query(`
        UPDATE products SET
          name = COALESCE($1, name),
          description = COALESCE($2, description),
          price = COALESCE($3, price),
          sale_price = $4,
          icon = COALESCE($5, icon),
          image_url = $6,
          features = COALESCE($7, features),
          badge_name = $8,
          grants_premium = COALESCE($9, grants_premium),
          color = COALESCE($10, color),
          bg_color = COALESCE($11, bg_color),
          sort_order = COALESCE($12, sort_order)
        WHERE id = $13
        RETURNING *
      `, [
        name ?? null, description ?? null,
        price != null ? parseFloat(price) : null,
        salePrice != null ? parseFloat(salePrice) : null,
        icon ?? null, imageUrl ?? null,
        features != null ? JSON.stringify(features) : null,
        badgeName ?? null,
        grantsPremium != null ? grantsPremium : null,
        color ?? null, bgColor ?? null,
        sortOrder != null ? sortOrder : null,
        parseInt(id),
      ]);
      if (!result.rows.length) return res.status(404).json({ error: "Not found" });
      res.json(result.rows[0]);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete("/api/admin/products/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const role = (req.user as any).role;
    if (!["developer", "owner"].includes(role)) return res.sendStatus(403);
    const { id } = req.params;
    try {
      await pool.query(`DELETE FROM products WHERE id = $1`, [parseInt(id)]);
      res.json({ ok: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ─── Templates ────────────────────────────────────────────────────────────

  app.get("/api/templates", async (req, res) => {
    const sort = (req.query.sort as string) || "trending";
    const userId = req.isAuthenticated() ? (req.user as any).id : null;
    try {
      let orderBy = "t.created_at DESC";
      if (sort === "trending") orderBy = "t.uses DESC, t.favorites DESC";
      else if (sort === "new") orderBy = "t.created_at DESC";
      else if (sort === "favorites") orderBy = "t.favorites DESC";

      const result = await pool.query(`
        SELECT t.*,
          COALESCE(
            (SELECT true FROM template_favorites WHERE user_id = $1 AND template_id = t.id LIMIT 1),
            false
          ) as is_favorited
        FROM templates t
        ORDER BY ${orderBy}
        LIMIT 100
      `, [userId]);
      res.json(result.rows);
    } catch (e) {
      res.json([]);
    }
  });

  app.get("/api/templates/my-uploads", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = (req.user as any).id;
    try {
      const result = await pool.query(`
        SELECT t.*,
          COALESCE(
            (SELECT true FROM template_favorites WHERE user_id = $1 AND template_id = t.id LIMIT 1),
            false
          ) as is_favorited
        FROM templates t
        WHERE t.user_id = $1
        ORDER BY t.created_at DESC
      `, [userId]);
      res.json(result.rows);
    } catch (e) {
      res.json([]);
    }
  });

  app.get("/api/templates/my-favorites", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = (req.user as any).id;
    try {
      const result = await pool.query(`
        SELECT t.*, true as is_favorited
        FROM templates t
        INNER JOIN template_favorites tf ON tf.template_id = t.id AND tf.user_id = $1
        ORDER BY tf.created_at DESC
      `, [userId]);
      res.json(result.rows);
    } catch (e) {
      res.json([]);
    }
  });

  app.get("/api/templates/my-last-used", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = (req.user as any).id;
    try {
      const result = await pool.query(`
        SELECT t.*,
          COALESCE(
            (SELECT true FROM template_favorites WHERE user_id = $1 AND template_id = t.id LIMIT 1),
            false
          ) as is_favorited
        FROM templates t
        INNER JOIN template_last_used tlu ON tlu.template_id = t.id AND tlu.user_id = $1
        ORDER BY tlu.used_at DESC
        LIMIT 20
      `, [userId]);
      res.json(result.rows);
    } catch (e) {
      res.json([]);
    }
  });

  app.post("/api/templates", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as any;
    const { name, description, previewImageUrl, profileSnapshot, tags } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: "Template name required" });
    try {
      const result = await pool.query(`
        INSERT INTO templates (user_id, username, name, description, preview_image_url, profile_snapshot, tags)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `, [user.id, user.username, name.trim(), description || "", previewImageUrl || null, JSON.stringify(profileSnapshot || {}), JSON.stringify(tags || [])]);
      res.json(result.rows[0]);
    } catch (e) {
      res.status(500).json({ message: "Failed to create template" });
    }
  });

  app.get("/api/templates/:id", async (req, res) => {
    const userId = req.isAuthenticated() ? (req.user as any).id : null;
    try {
      const result = await pool.query(`
        SELECT t.*,
          COALESCE(
            (SELECT true FROM template_favorites WHERE user_id = $1 AND template_id = t.id LIMIT 1),
            false
          ) as is_favorited
        FROM templates t
        WHERE t.id = $2
      `, [userId, req.params.id]);
      if (result.rows.length === 0) return res.sendStatus(404);
      res.json(result.rows[0]);
    } catch (e) {
      res.sendStatus(500);
    }
  });

  app.post("/api/templates/:id/favorite", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = (req.user as any).id;
    const templateId = parseInt(req.params.id);
    try {
      const existing = await pool.query(`SELECT id FROM template_favorites WHERE user_id = $1 AND template_id = $2`, [userId, templateId]);
      if (existing.rows.length > 0) {
        await pool.query(`DELETE FROM template_favorites WHERE user_id = $1 AND template_id = $2`, [userId, templateId]);
        await pool.query(`UPDATE templates SET favorites = GREATEST(favorites - 1, 0) WHERE id = $1`, [templateId]);
        res.json({ favorited: false });
      } else {
        await pool.query(`INSERT INTO template_favorites (user_id, template_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [userId, templateId]);
        await pool.query(`UPDATE templates SET favorites = favorites + 1 WHERE id = $1`, [templateId]);
        res.json({ favorited: true });
      }
    } catch (e) {
      res.status(500).json({ message: "Failed to toggle favorite" });
    }
  });

  app.post("/api/templates/:id/use", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = (req.user as any).id;
    try {
      const result = await pool.query(`SELECT * FROM templates WHERE id = $1`, [req.params.id]);
      if (result.rows.length === 0) return res.sendStatus(404);
      const tmpl = result.rows[0];
      const snapshot = tmpl.profile_snapshot || {};

      // Apply template settings to user's profile (keep bio, avatar, displayName, location)
      const [existing] = await db.select().from(profiles).where(eq(profiles.userId, userId));
      if (!existing) await db.insert(profiles).values({ userId });

      const updateData: any = {};
      if (snapshot.themeColor) updateData.themeColor = snapshot.themeColor;
      if (snapshot.backgroundUrl !== undefined) updateData.backgroundUrl = snapshot.backgroundUrl;
      if (snapshot.backgroundVideoUrl !== undefined) updateData.backgroundVideoUrl = snapshot.backgroundVideoUrl;
      if (snapshot.bannerUrl !== undefined) updateData.bannerUrl = snapshot.bannerUrl;
      if (snapshot.backgroundEffect !== undefined) updateData.backgroundEffect = snapshot.backgroundEffect;

      // Merge settings (preserve user's own settings not overridden by template)
      if (snapshot.settings) {
        const currentSettings = existing?.settings || {};
        updateData.settings = { ...currentSettings, ...snapshot.settings };
      }

      await db.update(profiles).set(updateData).where(eq(profiles.userId, userId));

      // Apply tracks if included in snapshot
      if (snapshot.tracks && Array.isArray(snapshot.tracks)) {
        await db.delete(tracks).where(eq(tracks.userId, userId));
        for (let i = 0; i < snapshot.tracks.length; i++) {
          const t = snapshot.tracks[i];
          await db.insert(tracks).values({ userId, title: t.title, url: t.url, artistProfile: t.artistProfile || "", order: i });
        }
      }

      // Increment template uses and record last used
      await pool.query(`UPDATE templates SET uses = uses + 1 WHERE id = $1`, [req.params.id]);
      await pool.query(`
        INSERT INTO template_last_used (user_id, template_id, used_at) VALUES ($1, $2, NOW())
        ON CONFLICT (user_id, template_id) DO UPDATE SET used_at = NOW()
      `, [userId, req.params.id]);

      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ message: "Failed to apply template" });
    }
  });

  app.delete("/api/templates/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = (req.user as any).id;
    try {
      const result = await pool.query(`SELECT * FROM templates WHERE id = $1`, [req.params.id]);
      if (result.rows.length === 0) return res.sendStatus(404);
      if (result.rows[0].user_id !== userId && (req.user as any).role === "user") return res.sendStatus(403);
      await pool.query(`DELETE FROM templates WHERE id = $1`, [req.params.id]);
      res.sendStatus(200);
    } catch (e) {
      res.sendStatus(500);
    }
  });

  // ─── Public Profile ───────────────────────────────────────────────────────

  app.get("/api/public/profile/:username", async (req, res) => {
    let [user] = await db.select().from(users).where(sql`LOWER(${users.username}) = LOWER(${req.params.username})`);
    if (!user) {
      const [aliasUser] = await db.select().from(users).where(sql`LOWER(${users.alias}) = LOWER(${req.params.username})`);
      if (aliasUser) user = aliasUser;
    }
    if (!user) {
      const slugLower = req.params.username.toLowerCase();
      const aliasArrResult = await pool.query(`SELECT * FROM users WHERE aliases @> $1::jsonb LIMIT 1`, [JSON.stringify([slugLower])]);
      if (aliasArrResult.rows[0]) user = aliasArrResult.rows[0] as any;
    }
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.role === "banned") {
      const { password: _, ...safeUser } = user as any;
      return res.status(200).json({ user: safeUser, profile: null, links: [], isBanned: true });
    }
    let [profile] = await db.select().from(profiles).where(eq(profiles.userId, user.id));
    if (!profile) [profile] = await db.insert(profiles).values({ userId: user.id }).returning();

    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const ipString = (Array.isArray(ip) ? ip[0] : ip || 'unknown').split(',')[0].trim();
    const [existingView] = await db.select().from(viewLogs)
      .where(and(eq(viewLogs.userId, user.id), eq(viewLogs.ipAddress, ipString))).limit(1);

    if (!existingView) {
      await db.insert(viewLogs).values({ userId: user.id, ipAddress: ipString });
      const newViews = (user.views || 0) + 1;
      await db.update(users).set({ views: newViews }).where(eq(users.id, user.id));
      fireWebhook("gained_views", {
        title: "👁️ Profile View",
        description: `**[${user.username}](${makeProfileUrl(user.username)})** just received a new profile view.`,
        fields: [
          { name: "Total Views", value: String(newViews), inline: true },
          { name: "Discord", value: user.discordUsername ? `@${user.discordUsername}` : "Not linked", inline: true },
          { name: "Profile", value: makeProfileUrl(user.username), inline: false },
        ],
      }).catch(() => {});
      fireWebhook("website_visit", {
        title: "🌐 Website Visit",
        description: `A new visitor viewed **[${user.username}](${makeProfileUrl(user.username)})**'s profile.`,
        fields: [
          { name: "Total Views", value: String(newViews), inline: true },
          { name: "Discord", value: user.discordUsername ? `@${user.discordUsername}` : "Not linked", inline: true },
          { name: "Profile", value: makeProfileUrl(user.username), inline: false },
        ],
      }).catch(() => {});
      // Auto-award view milestone badges
      const viewBadges: Array<{ threshold: number; name: string; icon: string; label: string }> = [
        { threshold: 100, name: "100 Views", icon: "👁️", label: "100 Views" },
        { threshold: 500, name: "500 Views", icon: "👁️", label: "500 Views" },
        { threshold: 1000, name: "1K Views", icon: "🔥", label: "1K Views" },
        { threshold: 5000, name: "5K Views", icon: "⚡", label: "5K Views" },
      ];
      for (const vb of viewBadges) {
        if (newViews >= vb.threshold) {
          const currentBadges: string[] = (user.badges as string[]) || [];
          if (!currentBadges.includes(vb.name)) {
            // Ensure the badge exists
            const [existBadge] = await db.select().from(badges).where(eq(badges.name, vb.name));
            if (!existBadge) {
              await db.insert(badges).values({ name: vb.name, icon: vb.icon, description: `Earned ${vb.label} profile views`, howToGet: `Get ${vb.threshold} total views`, color: "#F97316" }).catch(() => {});
            }
            await db.update(users).set({ badges: [...currentBadges, vb.name] }).where(eq(users.id, user.id)).catch(() => {});
            user.badges = [...currentBadges, vb.name];
          }
        }
      }
      // Auto-progress challenges
      await autoProgressChallenges(user.id, newViews, 0);
    }

    const profileLinks = await db.select().from(links)
      .where(and(eq(links.profileId, profile.id), eq(links.enabled, true)));
    profileLinks.sort((a, b) => (a.order || 0) - (b.order || 0));
    const { password: _, ...safeUser } = user as any;
    res.json({ user: safeUser, profile, links: profileLinks.map(l => ({ ...l, position: l.order })) });
  });

  app.get("/api/public/tracks/:username", async (req, res) => {
    let [user] = await db.select().from(users).where(sql`LOWER(${users.username}) = LOWER(${req.params.username})`);
    if (!user) {
      const [aliasUser] = await db.select().from(users).where(sql`LOWER(${users.alias}) = LOWER(${req.params.username})`);
      if (aliasUser) user = aliasUser;
    }
    if (!user) {
      const slugLower = req.params.username.toLowerCase();
      const aliasArrResult = await pool.query(`SELECT * FROM users WHERE aliases @> $1::jsonb LIMIT 1`, [JSON.stringify([slugLower])]);
      if (aliasArrResult.rows[0]) user = aliasArrResult.rows[0] as any;
    }
    if (!user) return res.json([]);
    const userTracks = await db.select().from(tracks).where(eq(tracks.userId, user.id));
    res.json(userTracks.sort((a, b) => (a.order || 0) - (b.order || 0)));
  });

  app.get("/api/public/members", async (_req, res) => {
    const allUsers = await db.select({
      id: users.id,
      username: users.username,
    }).from(users).limit(100);
    const result = [];
    for (const u of allUsers) {
      const [profile] = await db.select({ avatarUrl: profiles.avatarUrl, displayName: profiles.displayName })
        .from(profiles).where(eq(profiles.userId, u.id));
      result.push({ id: u.id, username: u.username, displayName: profile?.displayName || u.username, avatarUrl: profile?.avatarUrl || null });
    }
    res.json(result);
  });

  app.get("/api/public/user-count", async (_req, res) => {
    res.set("Cache-Control", "public, max-age=60, stale-while-revalidate=120");
    try {
      const [row] = await db.select({ count: sql<number>`count(*)` }).from(users);
      const realCount = Number(row?.count ?? 0);
      const [overrideSetting] = await db.select().from(botSettings).where(eq(botSettings.key, "CREATED_PROFILES_OVERRIDE"));
      const override = overrideSetting?.value;
      const count = override && !isNaN(Number(override)) ? Number(override) : realCount;
      res.json({ count });
    } catch {
      res.json({ count: 0 });
    }
  });

  // ─── Profile Likes ────────────────────────────────────────────────

  app.post("/api/public/like/:username", async (req, res) => {
    try {
      let [user] = await db.select().from(users).where(sql`LOWER(${users.username}) = LOWER(${req.params.username})`);
      if (!user) {
        const [aliasUser] = await db.select().from(users).where(sql`LOWER(${users.alias}) = LOWER(${req.params.username})`);
        if (aliasUser) user = aliasUser;
      }
      if (!user) return res.status(404).json({ message: "User not found" });

      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
      const ipString = (Array.isArray(ip) ? ip[0] : ip || 'unknown').split(',')[0].trim();

      const [existingLike] = await db.select().from(profileLikes)
        .where(and(eq(profileLikes.userId, user.id), eq(profileLikes.ipAddress, ipString))).limit(1);

      if (existingLike) {
        return res.status(200).json({ liked: true, alreadyLiked: true });
      }

      await db.insert(profileLikes).values({ userId: user.id, ipAddress: ipString });
      const [countRow] = await db.select({ count: sql<number>`count(*)` }).from(profileLikes).where(eq(profileLikes.userId, user.id));
      const [userRow] = await db.select().from(users).where(eq(users.id, user.id));
      const totalLikes = Number(countRow?.count ?? 0) + ((userRow as any)?.bonusLikes || 0);

      // Auto-award likes milestone badges
      const likeMilestones = [
        { threshold: 100, name: "Loved by the Community", icon: "❤️", description: "Reached 100 profile likes", howToGet: "Get 100 likes on your profile", color: "#EF4444" },
      ];
      const [fullUser] = await db.select().from(users).where(eq(users.id, user.id));
      if (fullUser) {
        for (const lm of likeMilestones) {
          if (totalLikes >= lm.threshold) {
            const currentBadges: string[] = (fullUser.badges as string[]) || [];
            if (!currentBadges.includes(lm.name)) {
              const [existBadge] = await db.select().from(badges).where(eq(badges.name, lm.name));
              if (!existBadge) await db.insert(badges).values(lm).catch(() => {});
              await db.update(users).set({ badges: [...currentBadges, lm.name] }).where(eq(users.id, user.id)).catch(() => {});
            }
          }
        }
        await autoProgressChallenges(user.id, fullUser.views || 0, totalLikes);
      }

      fireWebhook("gained_likes", {
        title: "❤️ Profile Like",
        description: `**[${user.username}](${makeProfileUrl(user.username)})** received a new like!`,
        fields: [
          { name: "Total Likes", value: String(totalLikes), inline: true },
          { name: "Discord", value: user.discordUsername ? `@${user.discordUsername}` : "Not linked", inline: true },
          { name: "Profile", value: makeProfileUrl(user.username), inline: false },
        ],
      }).catch(() => {});
      res.json({ liked: true, likes: totalLikes });
    } catch (err) {
      res.status(500).json({ message: "Failed to like profile" });
    }
  });

  app.delete("/api/public/like/:username", async (req, res) => {
    try {
      let [user] = await db.select().from(users).where(sql`LOWER(${users.username}) = LOWER(${req.params.username})`);
      if (!user) {
        const [aliasUser] = await db.select().from(users).where(sql`LOWER(${users.alias}) = LOWER(${req.params.username})`);
        if (aliasUser) user = aliasUser;
      }
      if (!user) return res.status(404).json({ message: "User not found" });

      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
      const ipString = (Array.isArray(ip) ? ip[0] : ip || 'unknown').split(',')[0].trim();

      await pool.query(
        `DELETE FROM profile_likes WHERE user_id = $1 AND ip_address = $2`,
        [user.id, ipString]
      );

      const [countRow] = await db.select({ count: sql<number>`count(*)` }).from(profileLikes).where(eq(profileLikes.userId, user.id));
      const bonusLikes = (user as any).bonusLikes || 0;
      const totalLikes = Number(countRow?.count ?? 0) + bonusLikes;

      res.json({ liked: false, likes: totalLikes });
    } catch (err) {
      res.status(500).json({ message: "Failed to unlike profile" });
    }
  });

  app.get("/api/public/like-status/:username", async (req, res) => {
    try {
      let [user] = await db.select().from(users).where(sql`LOWER(${users.username}) = LOWER(${req.params.username})`);
      if (!user) {
        const [aliasUser] = await db.select().from(users).where(sql`LOWER(${users.alias}) = LOWER(${req.params.username})`);
        if (aliasUser) user = aliasUser;
      }
      if (!user) return res.json({ liked: false, likes: 0 });

      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
      const ipString = (Array.isArray(ip) ? ip[0] : ip || 'unknown').split(',')[0].trim();

      const [existingLike] = await db.select().from(profileLikes)
        .where(and(eq(profileLikes.userId, user.id), eq(profileLikes.ipAddress, ipString))).limit(1);
      const [countRow] = await db.select({ count: sql<number>`count(*)` }).from(profileLikes).where(eq(profileLikes.userId, user.id));
      const bonusLikes = (user as any).bonusLikes || 0;

      res.json({ liked: !!existingLike, likes: Number(countRow?.count ?? 0) + bonusLikes });
    } catch {
      res.json({ liked: false, likes: 0 });
    }
  });

  app.get("/api/user/likes", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    const userId = (req.user as any).id;
    const [countRow] = await db.select({ count: sql<number>`count(*)` }).from(profileLikes).where(eq(profileLikes.userId, userId));
    const [userRow] = await db.select().from(users).where(eq(users.id, userId));
    const bonusLikes = (userRow as any)?.bonusLikes || 0;
    res.json({ likes: Number(countRow?.count ?? 0) + bonusLikes });
  });

  // ─── Trending Profiles ────────────────────────────────────────────

  let trendingCache: { data: any[]; timestamp: number } | null = null;
  const TRENDING_CACHE_TTL = 3 * 60 * 60 * 1000; // 3 hours

  app.get("/api/public/trending", async (_req, res) => {
    try {
      const now = Date.now();
      if (trendingCache && now - trendingCache.timestamp < TRENDING_CACHE_TTL) {
        return res.json(trendingCache.data);
      }
      const rows = await pool.query(`
        SELECT u.id, u.username, u.role, u.views, u.is_premium,
               p.display_name, p.avatar_url, p.theme_color,
               COALESCE(l.like_count, 0) as likes
        FROM users u
        LEFT JOIN profiles p ON p.user_id = u.id
        LEFT JOIN (
          SELECT user_id, COUNT(*) as like_count FROM profile_likes GROUP BY user_id
        ) l ON l.user_id = u.id
        WHERE u.role != 'banned'
        ORDER BY RANDOM()
        LIMIT 12
      `);
      const result = rows.rows.map((r: any) => ({
        id: r.id,
        username: r.username,
        role: r.role,
        views: r.views || 0,
        isPremium: r.is_premium || false,
        displayName: r.display_name || r.username,
        avatarUrl: r.avatar_url || null,
        themeColor: r.theme_color || "#F97316",
        likes: Number(r.likes || 0),
      }));
      trendingCache = { data: result, timestamp: now };
      res.json(result);
    } catch (err) {
      res.json([]);
    }
  });

  app.get("/api/public/registered-today", async (_req, res) => {
    res.set("Cache-Control", "public, max-age=60, stale-while-revalidate=120");
    try {
      const [row] = await db.select({ count: sql<number>`count(*)` }).from(users)
        .where(sql`DATE(${users.createdAt}) = CURRENT_DATE`);
      const real = Number(row?.count ?? 0);
      const display = real > 0 ? real + Math.floor(Math.random() * 8) + 2 : Math.floor(Math.random() * 12) + 3;
      res.json({ count: display });
    } catch {
      res.json({ count: Math.floor(Math.random() * 12) + 3 });
    }
  });

  // ─── Leaderboard badge auto-award ─────────────────────────────────
  const LEADERBOARD_BADGE_NAME = "#10 Leaderboard Views";

  async function checkAndAwardLeaderboardBadge() {
    try {
      // Ensure the badge exists
      const [existing] = await db.select().from(badges).where(eq(badges.name, LEADERBOARD_BADGE_NAME));
      if (!existing) {
        await db.insert(badges).values({
          name: LEADERBOARD_BADGE_NAME,
          icon: "🏆",
          color: "#f59e0b",
          description: "Ranked in the top 10 profiles by total views of all time",
          howToGet: "Be in the top 10 on the all-time views leaderboard",
          isProtected: true,
        }).onConflictDoNothing();
      }

      // Get current top 10 by views (non-banned)
      const top10 = await pool.query(`
        SELECT id FROM users WHERE role != 'banned' ORDER BY views DESC LIMIT 10
      `);
      const top10Ids = new Set(top10.rows.map((r: any) => r.id));

      // Get all users who currently have the badge
      const hasBadge = await pool.query(`
        SELECT id, badges FROM users WHERE badges @> $1::jsonb
      `, [JSON.stringify([LEADERBOARD_BADGE_NAME])]);

      // Remove badge from users no longer in top 10
      for (const row of hasBadge.rows) {
        if (!top10Ids.has(row.id)) {
          const updated = (row.badges as string[]).filter((b: string) => b !== LEADERBOARD_BADGE_NAME);
          await db.update(users).set({ badges: updated }).where(eq(users.id, row.id));
        }
      }

      // Award badge to top 10 users who don't have it
      const hasBadgeIds = new Set(hasBadge.rows.map((r: any) => r.id));
      for (const row of top10.rows) {
        if (!hasBadgeIds.has(row.id)) {
          const [u] = await db.select().from(users).where(eq(users.id, row.id));
          if (u) {
            const curr: string[] = (u.badges as string[]) || [];
            if (!curr.includes(LEADERBOARD_BADGE_NAME)) {
              await db.update(users).set({ badges: [...curr, LEADERBOARD_BADGE_NAME] }).where(eq(users.id, u.id));
            }
          }
        }
      }
    } catch (_) {}
  }

  // ─── Leaderboard ──────────────────────────────────────────────────

  app.get("/api/leaderboard", async (_req, res) => {
    try {
      const top = await pool.query(`
        SELECT u.id, u.username, u.role, u.views,
               p.display_name, p.avatar_url
        FROM users u
        LEFT JOIN profiles p ON p.user_id = u.id
        WHERE u.role != 'banned'
        ORDER BY u.views DESC
        LIMIT 10
      `);
      // Fire badge check in the background (non-blocking)
      checkAndAwardLeaderboardBadge().catch(() => {});
      res.json(top.rows.map((r: any) => ({
        id: r.id,
        username: r.username,
        role: r.role,
        views: r.views || 0,
        displayName: r.display_name || r.username,
        avatarUrl: r.avatar_url || null,
      })));
    } catch {
      res.json([]);
    }
  });

  app.get("/api/leaderboard/weekly", async (_req, res) => {
    try {
      const result = await pool.query(`
        SELECT vl.user_id as id, u.username, u.role,
               COUNT(*) as views,
               p.display_name, p.avatar_url
        FROM view_logs vl
        JOIN users u ON u.id = vl.user_id
        LEFT JOIN profiles p ON p.user_id = vl.user_id
        WHERE vl.created_at >= NOW() - INTERVAL '7 days'
          AND u.role != 'banned'
        GROUP BY vl.user_id, u.username, u.role, p.display_name, p.avatar_url
        ORDER BY views DESC
        LIMIT 10
      `);
      res.json(result.rows.map((r: any) => ({
        id: r.id,
        username: r.username,
        role: r.role,
        views: parseInt(r.views),
        displayName: r.display_name || r.username,
        avatarUrl: r.avatar_url || null,
      })));
    } catch {
      res.json([]);
    }
  });

  app.get("/api/leaderboard/daily", async (_req, res) => {
    try {
      const result = await pool.query(`
        SELECT vl.user_id as id, u.username, u.role,
               COUNT(*) as views,
               p.display_name, p.avatar_url
        FROM view_logs vl
        JOIN users u ON u.id = vl.user_id
        LEFT JOIN profiles p ON p.user_id = vl.user_id
        WHERE DATE(vl.created_at) = CURRENT_DATE
          AND u.role != 'banned'
        GROUP BY vl.user_id, u.username, u.role, p.display_name, p.avatar_url
        ORDER BY views DESC
        LIMIT 10
      `);
      res.json(result.rows.map((r: any) => ({
        id: r.id,
        username: r.username,
        role: r.role,
        views: parseInt(r.views),
        displayName: r.display_name || r.username,
        avatarUrl: r.avatar_url || null,
      })));
    } catch {
      res.json([]);
    }
  });

  // ─── Discord Invite Proxy ─────────────────────────────────────────
  app.get("/api/discord-invite/:code", async (req, res) => {
    try {
      const { code } = req.params;
      const r = await fetch(`https://discord.com/api/v10/invites/${code}?with_counts=true`);
      if (!r.ok) return res.status(404).json({ error: "Invite not found" });
      const data = await r.json() as any;
      res.json({
        name: data.guild?.name || null,
        icon: data.guild?.icon
          ? `https://cdn.discordapp.com/icons/${data.guild.id}/${data.guild.icon}.png?size=128`
          : null,
        memberCount: data.approximate_member_count || null,
        onlineCount: data.approximate_presence_count || null,
        code: data.code || code,
      });
    } catch {
      res.status(500).json({ error: "Failed to fetch invite" });
    }
  });

  // ─── Username Change ──────────────────────────────────────────────
  app.patch("/api/user/username", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = (req.user as any).id;
    const raw = (req.body.username as string || "").trim();
    if (!raw || raw.length < 1 || raw.length > 20) return res.status(400).json({ message: "Username must be 1-20 characters" });
    if (!/^[a-zA-Z0-9_]+$/.test(raw)) return res.status(400).json({ message: "Only letters, numbers and underscores allowed" });
    const RESERVED = ["api", "auth", "objects", "shop", "login", "register", "dashboard", "team", "founders", "changes", "templates", "tos", "secret", "assets", "hexed", "admin", "status", "leaderboard", "profile", "options", "miscellaneous", "extras", "markdowns", "wheelspin", "easter", "x"];
    if (RESERVED.includes(raw.toLowerCase())) return res.status(400).json({ message: "That username is reserved" });
    const [taken] = await db.select({ id: users.id }).from(users).where(sql`LOWER(${users.username}) = ${raw.toLowerCase()}`);
    if (taken && taken.id !== userId) return res.status(400).json({ message: "Username already taken" });
    const [updated] = await db.update(users).set({ username: raw }).where(eq(users.id, userId)).returning();
    res.json(updated);
  });

  // ─── Admin Badges: Sync with Discord ──────────────────────────────
  app.post("/api/admin/badges/sync-discord", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role === "user") return res.sendStatus(403);
    try {
      const allBadges = await db.select().from(badges);
      const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
      if (webhookUrl) {
        const badgeLines = allBadges.map(b => {
          const vis = !b.visibleTo || b.visibleTo === "all" ? "All members" : `Custom: ${b.visibleTo}`;
          return `${b.icon} **${b.name}** — ${b.description || "No description"} | Visible: ${vis}`;
        }).join("\n");
        await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            embeds: [{
              title: "🏅 Hexed Badge Sync",
              description: badgeLines || "No badges found.",
              color: 0xF97316,
              footer: { text: `${allBadges.length} badge(s) synced • Hexed` },
              timestamp: new Date().toISOString(),
            }],
          }),
        });
      }
      res.json({ synced: allBadges.length });
    } catch (e) {
      res.status(500).json({ message: "Sync failed" });
    }
  });

  // ─── Admin Discord Events ─────────────────────────────────────────
  app.get("/api/admin/discord-events", async (req, res) => {
    if (!req.isAuthenticated() || !isStaff((req.user as any).role)) return res.sendStatus(403);
    const events = await db.select().from(discordEvents).orderBy(desc(discordEvents.createdAt)).limit(100);
    res.json(events);
  });

  // ─── Auto-create new tables ──────────────────────────────────────────────
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tickets (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        discord_id TEXT,
        discord_username TEXT,
        discord_avatar TEXT,
        status TEXT NOT NULL DEFAULT 'open',
        claimed_by_user_id INTEGER REFERENCES users(id),
        claimed_by_discord_username TEXT,
        claimed_by_discord_avatar TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ticket_messages (
        id SERIAL PRIMARY KEY,
        ticket_id INTEGER REFERENCES tickets(id) NOT NULL,
        sender_type TEXT NOT NULL DEFAULT 'user',
        sender_name TEXT,
        sender_avatar TEXT,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS bot_settings (
        id SERIAL PRIMARY KEY,
        key TEXT NOT NULL UNIQUE,
        value TEXT NOT NULL DEFAULT '',
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS webhooks (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        webhook_url TEXT NOT NULL,
        log_type TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
  } catch (_) {}

  // ─── Bot Settings (Admin) ─────────────────────────────────────────────────
  app.get("/api/admin/bot-settings", async (req, res) => {
    if (!req.isAuthenticated() || !isStaff((req.user as any).role)) return res.sendStatus(403);
    const rows = await db.select().from(botSettings);
    const settings: Record<string, string> = {};
    for (const row of rows) settings[row.key] = row.value;
    // Also return current env values as defaults
    const defaults: Record<string, string> = {
      DISCORD_CLIENT_ID: process.env.DISCORD_CLIENT_ID || "",
      DISCORD_CLIENT_SECRET: process.env.DISCORD_CLIENT_SECRET || "",
      DISCORD_BOT_TOKEN: process.env.DISCORD_BOT_TOKEN || "",
      DISCORD_CALLBACK_URL: process.env.DISCORD_CALLBACK_URL || "",
      DISCORD_GUILD_ID: process.env.DISCORD_GUILD_ID || "",
      DISCORD_LOGIN_ENABLED: process.env.DISCORD_LOGIN_ENABLED ?? "true",
    };
    res.json({ ...defaults, ...settings });
  });

  app.post("/api/admin/bot-settings", async (req, res) => {
    if (!req.isAuthenticated() || !canAccessBotSettings((req.user as any).role)) return res.sendStatus(403);
    const allowed = ["DISCORD_CLIENT_ID", "DISCORD_CLIENT_SECRET", "DISCORD_BOT_TOKEN", "DISCORD_CALLBACK_URL", "DISCORD_GUILD_ID", "DISCORD_LOGIN_ENABLED"];
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        let val = String(req.body[key]);

        // Validate DISCORD_CALLBACK_URL — reject full Discord OAuth URLs that were accidentally pasted
        if (key === "DISCORD_CALLBACK_URL" && val) {
          if (val.startsWith("https://discord.com") || !val.includes("/auth/discord/callback")) {
            return res.status(400).json({ message: "Invalid Callback URL. It must end with /auth/discord/callback on your own domain, not a discord.com URL." });
          }
          // Strip any query params — only the bare URL is needed
          try { val = val.split("?")[0]; } catch (_) {}
        }

        const existing = await db.select().from(botSettings).where(eq(botSettings.key, key));
        if (existing.length > 0) {
          await db.update(botSettings).set({ value: val, updatedAt: new Date() }).where(eq(botSettings.key, key));
        } else {
          await db.insert(botSettings).values({ key, value: val });
        }
        // Also update process.env for the running process
        process.env[key] = val;
      }
    }
    res.json({ ok: true });
  });

  // ─── Tickets ──────────────────────────────────────────────────────────────
  // Create ticket (any user, Discord login required)
  app.post("/api/tickets", ticketCreateLimiter, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as any;
    if (!user.discordId) return res.status(400).json({ message: "Discord login required to open a ticket" });
    const { firstMessage } = req.body;
    if (!firstMessage?.trim()) return res.status(400).json({ message: "Message required" });

    const [ticket] = await db.insert(tickets).values({
      userId: user.id,
      discordId: user.discordId,
      discordUsername: user.discordUsername || user.username,
      discordAvatar: user.discordAvatar,
      status: "open",
    }).returning();

    await db.insert(ticketMessages).values({
      ticketId: ticket.id,
      senderType: "user",
      senderName: user.discordUsername || user.username,
      senderAvatar: user.discordAvatar,
      content: firstMessage.trim(),
    });

    fireWebhook("ticket_logs", {
      title: "🎫 New Support Ticket",
      description: `**${user.discordUsername || user.username}** opened a new support ticket.`,
      fields: [
        { name: "Ticket ID", value: `#${ticket.id}`, inline: true },
        { name: "User", value: `[${user.username}](${makeProfileUrl(user.username)})`, inline: true },
        { name: "Message", value: firstMessage.trim().slice(0, 200), inline: false },
      ],
    }).catch(() => {});

    res.json(ticket);
  });

  // Get my tickets
  app.get("/api/tickets/mine", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as any;
    const myTickets = await db.select().from(tickets).where(eq(tickets.userId, user.id)).orderBy(desc(tickets.createdAt));
    res.json(myTickets);
  });

  // Get single ticket messages (user or admin)
  app.get("/api/tickets/:id/messages", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as any;
    const ticketId = parseInt(req.params.id);
    const [ticket] = await db.select().from(tickets).where(eq(tickets.id, ticketId));
    if (!ticket) return res.sendStatus(404);
    const isAdmin = isStaff(user.role);
    if (!isAdmin && ticket.userId !== user.id) return res.sendStatus(403);
    const msgs = await db.select().from(ticketMessages).where(eq(ticketMessages.ticketId, ticketId)).orderBy(ticketMessages.createdAt);
    res.json({ ticket, messages: msgs });
  });

  // Send message to ticket
  app.post("/api/tickets/:id/messages", ticketMsgLimiter, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as any;
    const ticketId = parseInt(req.params.id);
    const [ticket] = await db.select().from(tickets).where(eq(tickets.id, ticketId));
    if (!ticket) return res.sendStatus(404);
    const userIsStaff = isStaff(user.role);
    if (!userIsStaff && ticket.userId !== user.id) return res.sendStatus(403);
    if (ticket.status === "closed") return res.status(400).json({ message: "Ticket is closed" });
    const { content } = req.body;
    if (!content?.trim()) return res.status(400).json({ message: "Content required" });

    const senderType = userIsStaff ? "support" : "user";
    const [msg] = await db.insert(ticketMessages).values({
      ticketId,
      senderType,
      senderName: user.discordUsername || user.username,
      senderAvatar: user.discordAvatar,
      content: content.trim(),
    }).returning();

    await db.update(tickets).set({ updatedAt: new Date() }).where(eq(tickets.id, ticketId));
    res.json(msg);
  });

  // Admin: get all tickets
  app.get("/api/admin/tickets", async (req, res) => {
    if (!req.isAuthenticated() || !isStaff((req.user as any).role)) return res.sendStatus(403);
    const allTickets = await db.select().from(tickets).orderBy(desc(tickets.updatedAt));
    res.json(allTickets);
  });

  // Admin: claim ticket
  app.post("/api/tickets/:id/claim", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as any;
    if (!isStaff(user.role)) return res.sendStatus(403);
    const ticketId = parseInt(req.params.id);
    const [ticket] = await db.select().from(tickets).where(eq(tickets.id, ticketId));
    if (!ticket) return res.sendStatus(404);

    await db.update(tickets).set({
      claimedByUserId: user.id,
      claimedByDiscordUsername: user.discordUsername || user.username,
      claimedByDiscordAvatar: user.discordAvatar,
      updatedAt: new Date(),
    }).where(eq(tickets.id, ticketId));

    const claimMsg = `**${user.discordUsername || user.username}** will be assisting you today, how can our Support help you?`;
    await db.insert(ticketMessages).values({
      ticketId,
      senderType: "system",
      senderName: "Support",
      senderAvatar: null,
      content: claimMsg,
    });

    res.json({ ok: true });
  });

  // Admin: close ticket
  app.post("/api/tickets/:id/close", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as any;
    if (!isStaff(user.role)) return res.sendStatus(403);
    const ticketId = parseInt(req.params.id);
    await db.update(tickets).set({ status: "closed", updatedAt: new Date() }).where(eq(tickets.id, ticketId));
    await db.insert(ticketMessages).values({
      ticketId,
      senderType: "system",
      senderName: "System",
      content: "This ticket has been closed.",
    });
    res.json({ ok: true });
  });

  // Admin: reopen ticket
  app.post("/api/tickets/:id/reopen", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as any;
    if (!isStaff(user.role)) return res.sendStatus(403);
    const ticketId = parseInt(req.params.id);
    await db.update(tickets).set({ status: "open", updatedAt: new Date() }).where(eq(tickets.id, ticketId));
    await db.insert(ticketMessages).values({
      ticketId,
      senderType: "system",
      senderName: "System",
      content: "This ticket has been reopened.",
    });
    res.json({ ok: true });
  });

  // Admin: delete ticket
  app.delete("/api/tickets/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as any;
    if (!isStaff(user.role)) return res.sendStatus(403);
    const ticketId = parseInt(req.params.id);
    await db.delete(ticketMessages).where(eq(ticketMessages.ticketId, ticketId));
    await db.delete(tickets).where(eq(tickets.id, ticketId));
    res.json({ ok: true });
  });

  app.post("/api/ai/chat", aiChatLimiter, async (req, res) => {
    const { messages } = req.body;
    if (!Array.isArray(messages)) return res.status(400).json({ error: "messages required" });
    const systemPrompt = `You are Hex, a short and friendly AI support assistant for Hexed — a free customizable link-in-bio profile platform. Help users navigate the site and customize their profiles. Keep answers brief (2-4 sentences max).

SITE NAVIGATION:
- Dashboard (/dashboard): Main control panel with tabs: Profile, Options, Miscellaneous, Extras, Markdowns
- Profile tab: change display name, bio, location, avatar, banner image, social links
- Options tab: change background (upload image/video or URL), theme/accent color, visual effects (particles, snow, rain, fireflies, coins, cursor trails), card tilt effect
- Miscellaneous tab: enable music player (upload tracks or YouTube/Spotify/SoundCloud embed), view counter, UID display
- Extras tab: advanced social features
- Markdowns tab: add custom HTML/markdown content sections
- Shop (/shop): buy Premium (€4.99 one-time), badges, extra alias slots
- Premium unlocks: removes watermark, unlocks advanced effects, up to 20 music tracks, exclusive badge
- Templates (/templates): browse and apply pre-made profile designs
- Public profile: accessible at hexed.app/[username]

When users ask how to change/find something, tell them exactly which tab/section to go to. Be helpful and concise.`;

    try {
      const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer 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`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "system", content: systemPrompt }, ...messages],
          max_tokens: 300,
          temperature: 0.7,
        }),
      });
      const data = await groqRes.json() as any;
      if (data.choices?.[0]?.message?.content) {
        res.json({ reply: data.choices[0].message.content });
      } else {
        res.status(500).json({ error: "No response from AI" });
      }
    } catch (e) {
      res.status(500).json({ error: "AI unavailable" });
    }
  });

  // ─── Auto-create announcements table ─────────────────────────────────────
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS announcements (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT NOT NULL DEFAULT '',
        type TEXT NOT NULL DEFAULT 'info',
        active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
  } catch (_) {}

  // ─── Auto-create changelogs table ────────────────────────────────────────
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS changelogs (
        id SERIAL PRIMARY KEY,
        version TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL DEFAULT '',
        author TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    // Seed V1.02 if empty
    const { rows } = await pool.query("SELECT COUNT(*) FROM changelogs");
    if (parseInt(rows[0].count) === 0) {
      await pool.query(`
        INSERT INTO changelogs (version, title, content, author) VALUES
        ('V 1.02', 'Initial Platform Launch', 'Hexed launched after 3+ weeks of development. Core profile system, badge databank, music player, effects, custom links, Discord OAuth, and the full admin panel are live. Many more updates coming soon.', 'Byte')
      `);
    }
  } catch (_) {}

  // ─── Auto-create our_team table ──────────────────────────────────────────
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS our_team (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        role TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        tags JSONB DEFAULT '[]',
        discord_user TEXT DEFAULT '',
        discord_user_id TEXT DEFAULT '',
        profile TEXT DEFAULT '',
        colour TEXT NOT NULL DEFAULT '#F97316',
        avatar_url TEXT DEFAULT '',
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
  } catch (_) {}

  // ─── Our Team (public read) ────────────────────────────────────────────────
  const TEAM_ROLE_ORDER: Record<string, number> = { Founder: 0, Manager: 1, Admin: 2, Staff: 3 };

  app.get("/api/our-team", async (_req, res) => {
    try {
      const rows = await db.select().from(ourTeam).orderBy(ourTeam.sortOrder, ourTeam.createdAt);
      rows.sort((a, b) => {
        const ra = TEAM_ROLE_ORDER[a.role] ?? 99;
        const rb = TEAM_ROLE_ORDER[b.role] ?? 99;
        if (ra !== rb) return ra - rb;
        return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
      });
      res.json(rows);
    } catch { res.json([]); }
  });

  // ─── Our Team CRUD (owner only) ────────────────────────────────────────────
  app.post("/api/admin/our-team", async (req, res) => {
    if (!req.isAuthenticated() || !canManageOurTeam((req.user as any).role)) return res.sendStatus(403);
    const { name, role, description, tags, discordUser, discordUserId, profile, colour, avatarUrl } = req.body;
    if (!name?.trim() || !role?.trim() || !description?.trim() || !colour?.trim()) {
      return res.status(400).json({ message: "Name, role, description, and colour are required" });
    }
    const validRoles = ["Founder", "Manager", "Admin", "Staff"];
    if (!validRoles.includes(role)) return res.status(400).json({ message: "Invalid role" });
    const [row] = await db.insert(ourTeam).values({
      name: name.trim(), role: role.trim(), description: description.trim(),
      tags: Array.isArray(tags) ? tags : [],
      discordUser: discordUser?.trim() || "",
      discordUserId: discordUserId?.trim() || "",
      profile: profile?.trim() || "",
      colour: colour.trim(),
      avatarUrl: avatarUrl?.trim() || "",
    }).returning();
    res.json(row);
  });

  app.patch("/api/admin/our-team/:id", async (req, res) => {
    if (!req.isAuthenticated() || !canManageOurTeam((req.user as any).role)) return res.sendStatus(403);
    const id = parseInt(req.params.id);
    const { name, role, description, tags, discordUser, discordUserId, profile, colour, avatarUrl } = req.body;
    const update: any = {};
    if (name !== undefined) update.name = name.trim();
    if (role !== undefined) update.role = role.trim();
    if (description !== undefined) update.description = description.trim();
    if (tags !== undefined) update.tags = Array.isArray(tags) ? tags : [];
    if (discordUser !== undefined) update.discordUser = discordUser.trim();
    if (discordUserId !== undefined) update.discordUserId = discordUserId.trim();
    if (profile !== undefined) update.profile = profile.trim();
    if (colour !== undefined) update.colour = colour.trim();
    if (avatarUrl !== undefined) update.avatarUrl = avatarUrl.trim();
    const [row] = await db.update(ourTeam).set(update).where(eq(ourTeam.id, id)).returning();
    if (!row) return res.sendStatus(404);
    res.json(row);
  });

  app.delete("/api/admin/our-team/:id", async (req, res) => {
    if (!req.isAuthenticated() || !canManageOurTeam((req.user as any).role)) return res.sendStatus(403);
    await db.delete(ourTeam).where(eq(ourTeam.id, parseInt(req.params.id)));
    res.sendStatus(200);
  });

  // ─── Discord user lookup (for Our Team auto-fill) ─────────────────────────
  app.get("/api/admin/discord-user/:discordId", async (req, res) => {
    if (!req.isAuthenticated() || !canManageOurTeam((req.user as any).role)) return res.sendStatus(403);
    const botToken = process.env.DISCORD_BOT_TOKEN;
    if (!botToken) return res.status(400).json({ message: "Bot not configured" });
    try {
      const r = await fetch(`https://discord.com/api/v10/users/${req.params.discordId}`, {
        headers: { Authorization: `Bot ${botToken}` },
      });
      if (!r.ok) return res.status(404).json({ message: "User not found" });
      const data = await r.json() as any;
      const avatar = data.avatar
        ? `https://cdn.discordapp.com/avatars/${data.id}/${data.avatar}.png?size=256`
        : `https://cdn.discordapp.com/embed/avatars/${(parseInt(data.id) >> 22) % 6}.png`;
      res.json({ id: data.id, username: data.username, globalName: data.global_name, avatar });
    } catch { res.status(500).json({ message: "Lookup failed" }); }
  });

  // ─── Announcements (public read) ───────────────────────────────────────────
  app.get("/api/announcements", async (_req, res) => {
    try {
      const rows = await db.select().from(announcements).where(eq(announcements.active, true)).orderBy(desc(announcements.createdAt));
      res.json(rows);
    } catch {
      res.json([]);
    }
  });

  // ─── Announcements CRUD (dev/owner only) ───────────────────────────────────
  app.get("/api/admin/announcements", async (req, res) => {
    if (!req.isAuthenticated() || !canManageWebsite((req.user as any).role)) return res.sendStatus(403);
    const rows = await db.select().from(announcements).orderBy(desc(announcements.createdAt));
    res.json(rows);
  });

  app.post("/api/admin/announcements", async (req, res) => {
    if (!req.isAuthenticated() || !canManageWebsite((req.user as any).role)) return res.sendStatus(403);
    const { title, content, type } = req.body;
    if (!title?.trim()) return res.status(400).json({ message: "Title required" });
    const [row] = await db.insert(announcements).values({ title: title.trim(), content: content || "", type: type || "info", active: true }).returning();
    res.json(row);
  });

  app.patch("/api/admin/announcements/:id", async (req, res) => {
    if (!req.isAuthenticated() || !canManageWebsite((req.user as any).role)) return res.sendStatus(403);
    const id = parseInt(req.params.id);
    const { title, content, type, active } = req.body;
    const update: any = {};
    if (title !== undefined) update.title = title;
    if (content !== undefined) update.content = content;
    if (type !== undefined) update.type = type;
    if (active !== undefined) update.active = active;
    const [row] = await db.update(announcements).set(update).where(eq(announcements.id, id)).returning();
    res.json(row);
  });

  app.delete("/api/admin/announcements/:id", async (req, res) => {
    if (!req.isAuthenticated() || !canManageWebsite((req.user as any).role)) return res.sendStatus(403);
    await db.delete(announcements).where(eq(announcements.id, parseInt(req.params.id)));
    res.sendStatus(200);
  });

  // ─── Admin: User Info (dev/owner only) ────────────────────────────────────
  app.get("/api/admin/user-info/:id", async (req, res) => {
    if (!req.isAuthenticated() || !canManageWebsite((req.user as any).role)) return res.sendStatus(403);
    const [user] = await db.select().from(users).where(eq(users.id, parseInt(req.params.id)));
    if (!user) return res.sendStatus(404);
    res.json(user);
  });

  // ─── Admin: Login as user (dev/owner only) ────────────────────────────────
  app.post("/api/admin/login-as/:id", async (req, res) => {
    if (!req.isAuthenticated() || !canManageWebsite((req.user as any).role)) return res.sendStatus(403);
    const targetId = parseInt(req.params.id);
    const [target] = await db.select().from(users).where(eq(users.id, targetId));
    if (!target) return res.sendStatus(404);
    req.login(target, (err) => {
      if (err) return res.status(500).json({ message: "Login failed" });
      res.json({ ok: true, username: target.username });
    });
  });

  // ─── Admin: Give Spin (reset wheel cooldown) ──────────────────────────────
  app.post("/api/admin/give-spin", async (req, res) => {
    if (!req.isAuthenticated() || !isStaff((req.user as any).role)) return res.sendStatus(403);
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: "userId required" });
    const [target] = await db.select().from(users).where(eq(users.id, userId));
    if (!target) return res.sendStatus(404);
    await db.update(users).set({ lastWheelSpin: null } as any).where(eq(users.id, userId));
    res.json({ ok: true, message: `Spin granted to ${target.username}` });
  });

  // ─── Discord Badge Sync ────────────────────────────────────────────────────
  app.post("/api/user/sync-discord-badges", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as any;
    if (!user.discordId) return res.status(400).json({ message: "No Discord account linked" });

    const botToken = process.env.DISCORD_BOT_TOKEN;
    const guildId = process.env.DISCORD_GUILD_ID;
    if (!botToken || !guildId) return res.status(400).json({ message: "Bot not configured" });

    try {
      const memberRes = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${user.discordId}`, {
        headers: { Authorization: `Bot ${botToken}` },
      });
      if (!memberRes.ok) return res.status(400).json({ message: "Not a member of the server" });

      const member = await memberRes.json() as any;
      const memberRoleIds: string[] = member.roles || [];

      const allBadges = await db.select().from(badges);
      const badgesWithRoles = allBadges.filter(b => b.roleId && b.roleId.trim() !== "");

      const [currentUser] = await db.select().from(users).where(eq(users.id, user.id));
      let currentBadges: string[] = (currentUser.badges as string[]) || [];
      let changed = false;

      const PREMIUM_ROLE_ID_SYNC = "1483130889801039942";
      let isPremiumNow = currentUser.isPremium || false;

      for (const badge of badgesWithRoles) {
        const hasRole = memberRoleIds.includes(badge.roleId!);
        const hasBadge = currentBadges.includes(badge.name);
        if (hasRole && !hasBadge) {
          currentBadges = [...currentBadges, badge.name];
          changed = true;
        } else if (!hasRole && hasBadge) {
          currentBadges = currentBadges.filter(b => b !== badge.name);
          changed = true;
        }
      }

      // Sync isPremium based on the premium role
      const hasPremiumRole = memberRoleIds.includes(PREMIUM_ROLE_ID_SYNC);
      if (hasPremiumRole && !isPremiumNow) {
        isPremiumNow = true;
        changed = true;
      }
      // Note: we don't remove premium if they lose the role (purchased premium should persist)

      const updatePayload: any = {};
      if (changed) updatePayload.badges = currentBadges;
      if (hasPremiumRole && !currentUser.isPremium) updatePayload.isPremium = true;

      if (Object.keys(updatePayload).length > 0) {
        await db.update(users).set(updatePayload).where(eq(users.id, user.id));
      }

      res.json({ synced: true, badges: currentBadges, isPremium: isPremiumNow });
    } catch (e) {
      res.status(500).json({ message: "Sync failed" });
    }
  });

  // ─── Changelogs (public) ──────────────────────────────────────────────────
  app.get("/api/changelogs", async (_req, res) => {
    try {
      const logs = await db.select().from(changelogs);
      res.json(logs);
    } catch (_) { res.json([]); }
  });

  // ─── Changelogs (admin) ───────────────────────────────────────────────────
  app.post("/api/admin/changelogs", async (req, res) => {
    if (!req.isAuthenticated() || !canManageChangelogs((req.user as any).role)) return res.sendStatus(403);
    const { version, title, content, author } = req.body;
    if (!version || !title) return res.status(400).json({ message: "version and title required" });
    const [newLog] = await db.insert(changelogs).values({ version, title, content: content || "", author: author || "" }).returning();
    res.json(newLog);
  });

  app.patch("/api/admin/changelogs/:id", async (req, res) => {
    if (!req.isAuthenticated() || !canManageChangelogs((req.user as any).role)) return res.sendStatus(403);
    const id = parseInt(req.params.id);
    const { version, title, content, author } = req.body;
    const updateData: any = {};
    if (version !== undefined) updateData.version = version;
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (author !== undefined) updateData.author = author;
    updateData.updatedAt = new Date();
    const [updated] = await db.update(changelogs).set(updateData).where(eq(changelogs.id, id)).returning();
    if (!updated) return res.sendStatus(404);
    res.json(updated);
  });

  app.delete("/api/admin/changelogs/:id", async (req, res) => {
    if (!req.isAuthenticated() || !canManageChangelogs((req.user as any).role)) return res.sendStatus(403);
    await db.delete(changelogs).where(eq(changelogs.id, parseInt(req.params.id)));
    res.sendStatus(200);
  });

  // ─── Easter Egg Claim ─────────────────────────────────────────────────────
  app.post("/api/easter-egg/claim", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as any;
    if (user.easterEggClaimed) return res.status(409).json({ message: "Already claimed" });
    await db.update(users).set({
      easterEggClaimed: true,
      maxTracks: (user.maxTracks || 3) + 1,
      maxTags: (user.maxTags || 5) + 1,
    }).where(eq(users.id, user.id));
    res.json({ success: true });
  });

  // ─── Rising Profiles ──────────────────────────────────────────────────────
  let risingCache: { data: any[]; timestamp: number } | null = null;
  const RISING_CACHE_TTL = 12 * 60 * 60 * 1000; // 12 hours

  app.get("/api/public/rising", async (_req, res) => {
    try {
      const now = Date.now();
      if (risingCache && now - risingCache.timestamp < RISING_CACHE_TTL) {
        return res.json(risingCache.data);
      }
      const rows = await pool.query(`
        SELECT u.id, u.username, u.role, u.views, u.is_premium,
               p.display_name, p.avatar_url, p.theme_color,
               COUNT(vl.id) as recent_views
        FROM users u
        LEFT JOIN profiles p ON p.user_id = u.id
        LEFT JOIN view_logs vl ON vl.user_id = u.id AND vl.viewed_at >= NOW() - INTERVAL '24 hours'
        WHERE u.role != 'banned' AND u.views < 1000 AND u.views > 0
        GROUP BY u.id, p.display_name, p.avatar_url, p.theme_color
        ORDER BY recent_views DESC, u.views ASC
        LIMIT 8
      `);
      const result = rows.rows.map((r: any) => ({
        id: r.id,
        username: r.username,
        role: r.role,
        views: r.views || 0,
        isPremium: r.is_premium || false,
        displayName: r.display_name || r.username,
        avatarUrl: r.avatar_url || null,
        themeColor: r.theme_color || "#F97316",
        recentViews: Number(r.recent_views || 0),
      }));
      risingCache = { data: result, timestamp: now };
      res.json(result);
    } catch {
      res.json([]);
    }
  });

  // ─── Daily Reward ────────────────────────────────────────────────────────────

  app.get("/api/daily-reward", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const [user] = await db.select().from(users).where(eq(users.id, (req.user as any).id));
    if (!user) return res.sendStatus(404);

    const now = new Date();
    const lastClaim = user.lastDailyClaim ? new Date(user.lastDailyClaim) : null;
    const todayStr = now.toISOString().split("T")[0];
    const lastStr = lastClaim ? lastClaim.toISOString().split("T")[0] : null;
    const canClaim = lastStr !== todayStr;

    let streak = user.dailyStreak ?? 0;
    if (lastClaim && canClaim) {
      const diffMs = now.getTime() - lastClaim.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays > 1) streak = 0; // missed a day, reset on next claim
    }

    const DAILY_REWARDS: Array<{ day: number; label: string; reward: string }> = [
      { day: 1, label: "Day 1", reward: "+50 XP" },
      { day: 2, label: "Day 2", reward: "+50 XP" },
      { day: 3, label: "Day 3", reward: "Extra Alias Slot" },
      { day: 4, label: "Day 4", reward: "+50 XP" },
      { day: 5, label: "Day 5", reward: "+50 XP" },
      { day: 6, label: "Day 6", reward: "+50 XP" },
      { day: 7, label: "Day 7", reward: "Day 7 Streak Badge" },
    ];

    res.json({
      canClaim,
      streak,
      lastClaim: lastClaim?.toISOString() || null,
      rewards: DAILY_REWARDS,
    });
  });

  app.post("/api/daily-reward/claim", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const [user] = await db.select().from(users).where(eq(users.id, (req.user as any).id));
    if (!user) return res.sendStatus(404);

    const now = new Date();
    const lastClaim = user.lastDailyClaim ? new Date(user.lastDailyClaim) : null;
    const todayStr = now.toISOString().split("T")[0];
    const lastStr = lastClaim ? lastClaim.toISOString().split("T")[0] : null;
    if (lastStr === todayStr) return res.status(400).json({ message: "Already claimed today" });

    let streak = user.dailyStreak ?? 0;
    if (lastClaim) {
      const diffMs = now.getTime() - lastClaim.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays <= 1) {
        streak = streak + 1;
      } else {
        streak = 1; // missed a day
      }
    } else {
      streak = 1;
    }
    if (streak > 7) streak = 1; // reset after full week

    const updates: any = { dailyStreak: streak, lastDailyClaim: now };

    // Day 3 reward: extra alias slot
    if (streak === 3) {
      updates.maxAliases = (user.maxAliases ?? 1) + 1;
    }

    // Day 7 reward: badge
    if (streak === 7) {
      const badgeName = "Day 7 Streak";
      const currentBadges: string[] = (user.badges as string[]) || [];
      if (!currentBadges.includes(badgeName)) {
        const [existBadge] = await db.select().from(badges).where(eq(badges.name, badgeName));
        if (!existBadge) {
          await db.insert(badges).values({ name: badgeName, icon: "🔥", description: "Logged in 7 days in a row", howToGet: "Claim daily rewards for 7 consecutive days", color: "#F97316" }).catch(() => {});
        }
        updates.badges = [...currentBadges, badgeName];
      }
    }

    await db.update(users).set(updates).where(eq(users.id, user.id));
    res.json({ success: true, streak, reward: streak === 3 ? "Extra Alias Slot" : streak === 7 ? "Day 7 Streak Badge" : "+50 XP" });
  });

  // ─── Challenges ───────────────────────────────────────────────────────────────

  app.get("/api/user/challenges", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = (req.user as any).id;
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) return res.sendStatus(404);

    const [countRow] = await db.select({ count: sql<number>`count(*)` }).from(profileLikes).where(eq(profileLikes.userId, userId));
    const currentLikes = Number(countRow?.count ?? 0);
    const currentViews = user.views || 0;
    const completed: string[] = (user.completedChallenges as string[]) || [];

    // Auto-progress on fetch
    await autoProgressChallenges(userId, currentViews, currentLikes);

    const [updatedUser] = await db.select().from(users).where(eq(users.id, userId));
    const updatedCompleted: string[] = (updatedUser?.completedChallenges as string[]) || [];

    const freshViews = updatedUser?.views || 0;
    const challengesWithProgress = CHALLENGES.map(ch => {
      const val = ch.type === "views" ? freshViews : currentLikes;
      return {
        ...ch,
        completed: updatedCompleted.includes(ch.id),
        progress: Math.min(val, ch.target),
      };
    });

    res.json({
      challenges: challengesWithProgress,
      completedCount: updatedCompleted.length,
      totalCount: CHALLENGES.length,
    });
  });

  // ─── Wheel Spin ────────────────────────────────────────────────────────────────
  const SPIN_COOLDOWN_MS = 48 * 60 * 60 * 1000; // 48 hours
  const SPIN_PRIZES = [
    { type: "premium",      label: "Free Premium",  weight: 8  }, // index 0
    { type: "alias",        label: "+1 Alias",       weight: 20 }, // index 1
    { type: "tag",          label: "+1 Tag",          weight: 20 }, // index 2
    { type: "winner_badge", label: "Winner Badge",   weight: 3  }, // index 3
    { type: "nothing",      label: "Nothing",         weight: 25 }, // index 4
    { type: "custom_badge", label: "Custom Badge",   weight: 4  }, // index 5
    { type: "nothing2",     label: "Nothing",         weight: 20 }, // index 6
  ];

  function pickSpinPrize(): number {
    const total = SPIN_PRIZES.reduce((s, p) => s + p.weight, 0);
    let rand = Math.random() * total;
    for (let i = 0; i < SPIN_PRIZES.length; i++) {
      rand -= SPIN_PRIZES[i].weight;
      if (rand <= 0) return i;
    }
    return 4; // fallback: nothing
  }

  app.get("/api/wheelspin/status", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = (req.user as any).id;
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) return res.sendStatus(404);
    const lastSpin = (user as any).lastWheelSpin ? new Date((user as any).lastWheelSpin) : null;
    const now = Date.now();
    const canSpin = !lastSpin || (now - lastSpin.getTime()) >= SPIN_COOLDOWN_MS;
    const nextSpinAt = lastSpin ? new Date(lastSpin.getTime() + SPIN_COOLDOWN_MS) : null;
    res.json({ canSpin, nextSpinAt: canSpin ? null : nextSpinAt?.toISOString() });
  });

  app.post("/api/wheelspin/spin", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = (req.user as any).id;
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) return res.sendStatus(404);

    const lastSpin = (user as any).lastWheelSpin ? new Date((user as any).lastWheelSpin) : null;
    const now = Date.now();
    if (lastSpin && (now - lastSpin.getTime()) < SPIN_COOLDOWN_MS) {
      return res.status(429).json({ error: "Not yet! Wait for your cooldown.", nextSpinAt: new Date(lastSpin.getTime() + SPIN_COOLDOWN_MS).toISOString() });
    }

    const prizeIndex = pickSpinPrize();
    const prize = SPIN_PRIZES[prizeIndex];
    const updates: any = { lastWheelSpin: new Date() };
    let message = "";

    if (prize.type === "alias") {
      updates.maxAliases = (user.maxAliases ?? 1) + 1;
      message = "🔗 +1 alias slot has been added to your account!";
    } else if (prize.type === "tag") {
      updates.maxTags = (user.maxTags ?? 5) + 1;
      message = "🏷️ +1 tag slot has been added to your account!";
    } else if (prize.type === "winner_badge") {
      const currentBadges: string[] = (user.badges as string[]) || [];
      if (!currentBadges.includes("Winner")) {
        updates.badges = [...currentBadges, "Winner"];
      }
      message = "🏆 Winner Badge has been added to your profile!";
    } else if (prize.type === "premium") {
      message = "👑 Congrats! Please open a ticket to claim your Free Premium.";
    } else if (prize.type === "custom_badge") {
      message = "✨ Custom Badge! Please open a ticket to claim your Custom Badge.";
    } else {
      message = "💨 Better luck next time!";
    }

    await db.update(users).set(updates).where(eq(users.id, userId));
    const nextSpinAt = new Date(Date.now() + SPIN_COOLDOWN_MS).toISOString();
    res.json({ prizeIndex, prizeType: prize.type, prizeLabel: prize.label, message, nextSpinAt });
  });

  // ─── Music Search via Deezer (no credentials required) ───────────────────────
  app.get("/api/spotify/search", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const q = (req.query.q as string || "").trim();
    if (!q) return res.json([]);
    try {
      const r = await fetch(
        `https://api.deezer.com/search?q=${encodeURIComponent(q)}&limit=20&output=json`,
        { headers: { "Accept": "application/json" } }
      );
      if (!r.ok) return res.json([]);
      const data = await r.json() as any;
      const tracks = (data.data || []).map((t: any) => ({
        id: String(t.id),
        title: t.title || "",
        artist: t.artist?.name || "",
        album: t.album?.title || "",
        image: t.album?.cover_medium || t.album?.cover || "",
        url: t.preview || "",
        preview: t.preview || null,
        duration: (t.duration || 0) * 1000,
      }));
      res.json(tracks);
    } catch { res.json([]); }
  });

  // ─── YouTube search for full songs (uses internal API, no key required) ──────
  app.get("/api/youtube/search", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const q = (req.query.q as string || "").trim();
    if (!q) return res.json({ url: null });
    try {
      const r = await fetch(
        "https://www.youtube.com/youtubei/v1/search?key=AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          },
          body: JSON.stringify({
            context: {
              client: {
                clientName: "WEB",
                clientVersion: "2.20230801.00.00",
                hl: "en",
                gl: "US",
              },
            },
            query: q,
            params: "EgIQAQ%3D%3D",
          }),
        }
      );
      const data = await r.json() as any;
      const items =
        data?.contents?.twoColumnSearchResultsRenderer?.primaryContents
          ?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents;
      let videoId: string | null = null;
      if (Array.isArray(items)) {
        for (const item of items) {
          const id = item?.videoRenderer?.videoId;
          if (id) { videoId = id; break; }
        }
      }
      res.json({ url: videoId ? `https://www.youtube.com/watch?v=${videoId}` : null });
    } catch { res.json({ url: null }); }
  });

  // ─── Admin: Storage Status ────────────────────────────────────────────────
  app.get("/api/admin/storage-status", async (req, res) => {
    if (!req.isAuthenticated() || !isStaff((req.user as any).role)) return res.sendStatus(403);
    const mode = getStorageMode();
    res.json({ mode });
  });

  // ─── Admin: Uploads ───────────────────────────────────────────────────────
  app.get("/api/admin/uploads", async (req, res) => {
    if (!req.isAuthenticated() || !isStaff((req.user as any).role)) return res.sendStatus(403);
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = 50;
      const offset = (page - 1) * limit;

      // Query DB for tracked uploads
      let dbUploads: any[] = [];
      let dbTotal = 0;
      try {
        const result = await pool.query(
          `SELECT u.*, us.username as owner_username FROM uploads u LEFT JOIN users us ON u.user_id = us.id ORDER BY u.uploaded_at DESC LIMIT $1 OFFSET $2`,
          [limit, offset]
        );
        const countResult = await pool.query(`SELECT COUNT(*) FROM uploads`);
        dbUploads = result.rows;
        dbTotal = parseInt(countResult.rows[0].count);
      } catch (dbErr: any) {
        console.error("[admin/uploads] DB query failed:", dbErr?.message);
      }

      // Also scan local uploads directory for files not tracked in DB
      const uploadsDir = path.resolve(process.cwd(), "uploads");
      let localOnlyUploads: any[] = [];
      try {
        if (fs.existsSync(uploadsDir)) {
          const trackedPaths = new Set(dbUploads.map((u: any) => u.object_path));
          const files = fs.readdirSync(uploadsDir).filter((f: string) => !f.endsWith(".meta.json"));
          for (const file of files) {
            const localPath = `/objects/uploads/${file}`;
            if (!trackedPaths.has(localPath)) {
              const metaPath = path.join(uploadsDir, `${file}.meta.json`);
              let contentType = "application/octet-stream";
              try {
                const meta = JSON.parse(fs.readFileSync(metaPath, "utf-8"));
                if (meta?.contentType) contentType = meta.contentType;
              } catch (_) {}
              const stat = fs.statSync(path.join(uploadsDir, file));
              localOnlyUploads.push({
                id: `local-${file}`,
                user_id: null,
                username: null,
                file_name: file,
                content_type: contentType,
                object_path: localPath,
                public_url: localPath,
                uploaded_at: stat.mtime.toISOString(),
                local_only: true,
              });
            }
          }
        }
      } catch (fsErr: any) {
        console.warn("[admin/uploads] Local scan failed:", fsErr?.message);
      }

      const allUploads = [...dbUploads, ...localOnlyUploads].sort(
        (a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime()
      );
      const total = dbTotal + localOnlyUploads.length;
      res.json({ uploads: allUploads.slice(0, limit), total });
    } catch (err: any) {
      console.error("[admin/uploads] Unexpected error:", err?.message);
      res.status(500).json({ message: "Failed to fetch uploads" });
    }
  });

  app.delete("/api/admin/uploads/:id", async (req, res) => {
    if (!req.isAuthenticated() || !isStaff((req.user as any).role)) return res.sendStatus(403);
    try {
      const id = req.params.id;
      if (id.startsWith("local-")) {
        // Delete local file
        const filename = id.replace("local-", "");
        const uploadsDir = path.resolve(process.cwd(), "uploads");
        const filePath = path.join(uploadsDir, filename);
        const metaPath = path.join(uploadsDir, `${filename}.meta.json`);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        if (fs.existsSync(metaPath)) fs.unlinkSync(metaPath);
        return res.sendStatus(200);
      }
      await pool.query(`DELETE FROM uploads WHERE id = $1`, [id]);
      res.sendStatus(200);
    } catch (err: any) {
      console.error("[admin/uploads] Delete failed:", err?.message);
      res.status(500).json({ message: "Failed to delete upload record" });
    }
  });

  // ─── Admin: Database Management (owner only) ──────────────────────────────
  app.get("/api/admin/db/stats", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== "owner") return res.sendStatus(403);
    try {
      const tables = ["users", "profiles", "links", "tracks", "badges", "view_logs", "tickets", "ticket_messages", "templates", "discord_events", "session"];
      const stats: Record<string, number> = {};
      for (const table of tables) {
        try {
          const r = await pool.query(`SELECT COUNT(*) as count FROM ${table}`);
          stats[table] = parseInt(r.rows[0].count, 10);
        } catch {
          stats[table] = -1;
        }
      }
      const dbSize = await pool.query(`SELECT pg_size_pretty(pg_database_size(current_database())) as size`);
      res.json({ stats, dbSize: dbSize.rows[0].size });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/admin/db/query", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== "owner") return res.sendStatus(403);
    const { query: rawQuery } = req.body;
    if (!rawQuery || typeof rawQuery !== "string") return res.status(400).json({ message: "Query required" });
    const trimmed = rawQuery.trim().toLowerCase();
    const forbidden = ["drop ", "truncate ", "delete ", "update ", "insert ", "alter ", "create ", "grant ", "revoke ", "pg_read", "pg_write", "copy "];
    for (const f of forbidden) {
      if (trimmed.startsWith(f) || trimmed.includes(";" + f)) {
        return res.status(400).json({ message: "Only SELECT queries are allowed" });
      }
    }
    if (!trimmed.startsWith("select")) {
      return res.status(400).json({ message: "Only SELECT queries are allowed" });
    }
    try {
      const result = await pool.query(rawQuery);
      res.json({ rows: result.rows, fields: result.fields.map(f => f.name), rowCount: result.rowCount });
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.get("/api/admin/db/table/:name", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== "owner") return res.sendStatus(403);
    const allowed = ["users", "profiles", "links", "tracks", "badges", "tickets", "ticket_messages", "templates", "discord_events", "bot_settings", "changelogs", "announcements"];
    const table = req.params.name;
    if (!allowed.includes(table)) return res.status(400).json({ message: "Table not allowed" });
    const page = Math.max(0, parseInt(req.query.page as string || "0", 10));
    const limit = 50;
    const offset = page * limit;
    try {
      const result = await pool.query(`SELECT * FROM ${table} ORDER BY id DESC LIMIT $1 OFFSET $2`, [limit, offset]);
      const count = await pool.query(`SELECT COUNT(*) as total FROM ${table}`);
      res.json({ rows: result.rows, fields: result.fields.map(f => f.name), total: parseInt(count.rows[0].total, 10), page, limit });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // ─── Website Status ────────────────────────────────────────────────────────
  app.get("/api/website-status", async (req, res) => {
    res.set("Cache-Control", "public, max-age=5, stale-while-revalidate=10");
    try {
      const rows = await db.select().from(botSettings).where(eq(botSettings.key, "WEBSITE_STATUS"));
      const status = rows[0]?.value || "up";
      if (status === "down") {
        const reasonRows = await db.select().from(botSettings).where(eq(botSettings.key, "WEBSITE_DOWN_REASON"));
        const nameRows = await db.select().from(botSettings).where(eq(botSettings.key, "WEBSITE_DOWN_BY_NAME"));
        const rankRows = await db.select().from(botSettings).where(eq(botSettings.key, "WEBSITE_DOWN_BY_RANK"));
        return res.json({
          status: "down",
          reason: reasonRows[0]?.value || "",
          byName: nameRows[0]?.value || "",
          byRank: rankRows[0]?.value || "",
        });
      }
      res.json({ status: "up" });
    } catch {
      res.json({ status: "up" });
    }
  });

  app.post("/api/admin/website-status", async (req, res) => {
    if (!req.isAuthenticated() || !isStaff((req.user as any).role)) return res.sendStatus(403);
    const { status, reason, byName, byRank } = req.body;
    if (!["up", "down"].includes(status)) return res.status(400).json({ message: "Invalid status" });
    const upsert = async (key: string, value: string) => {
      const existing = await db.select().from(botSettings).where(eq(botSettings.key, key));
      if (existing.length > 0) {
        await db.update(botSettings).set({ value, updatedAt: new Date() }).where(eq(botSettings.key, key));
      } else {
        await db.insert(botSettings).values({ key, value });
      }
    };
    await upsert("WEBSITE_STATUS", status);
    if (status === "down") {
      await upsert("WEBSITE_DOWN_REASON", reason || "");
      await upsert("WEBSITE_DOWN_BY_NAME", byName || "");
      await upsert("WEBSITE_DOWN_BY_RANK", byRank || "");
    }
    const actor = req.user as any;
    fireWebhook("website_status", {
      title: status === "down" ? "🔴 Website Down" : "🟢 Website Up",
      description: status === "down"
        ? `The website has been taken **offline** by **${byName || actor.username}** (${byRank || actor.role}).`
        : `The website is back **online**, brought up by **${actor.username}**.`,
      fields: status === "down" && reason ? [{ name: "Reason", value: reason, inline: false }] : [],
    }).catch(() => {});
    res.json({ ok: true });
  });

  // ─── April Fools ──────────────────────────────────────────────────────────
  app.get("/api/april-fools", async (_req, res) => {
    res.set("Cache-Control", "public, max-age=5, stale-while-revalidate=10");
    try {
      const rows = await db.select().from(botSettings).where(eq(botSettings.key, "APRIL_FOOLS_ENABLED"));
      res.json({ enabled: rows[0]?.value === "true" });
    } catch {
      res.json({ enabled: false });
    }
  });

  app.post("/api/admin/april-fools", async (req, res) => {
    if (!req.isAuthenticated() || !canManageWebsite((req.user as any).role)) return res.sendStatus(403);
    const { enabled } = req.body;
    const value = enabled ? "true" : "false";
    try {
      const existing = await db.select().from(botSettings).where(eq(botSettings.key, "APRIL_FOOLS_ENABLED"));
      if (existing.length > 0) {
        await db.update(botSettings).set({ value, updatedAt: new Date() }).where(eq(botSettings.key, "APRIL_FOOLS_ENABLED"));
      } else {
        await db.insert(botSettings).values({ key: "APRIL_FOOLS_ENABLED", value });
      }
      res.json({ ok: true, enabled });
    } catch {
      res.status(500).json({ message: "Failed to update April Fools setting" });
    }
  });

  // ─── Created Profiles Count (Owner Only) ─────────────────────────────────
  app.get("/api/admin/created-profiles-count", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== "owner") return res.sendStatus(403);
    try {
      // Get real count from DB
      const [row] = await db.select({ count: sql<number>`count(*)` }).from(users);
      const realCount = Number(row?.count ?? 0);
      // Get override if set
      const [override] = await db.select().from(botSettings).where(eq(botSettings.key, "CREATED_PROFILES_OVERRIDE"));
      res.json({ realCount, override: override?.value ?? null });
    } catch {
      res.status(500).json({ message: "Failed to get count" });
    }
  });

  app.post("/api/admin/created-profiles-count", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== "owner") return res.sendStatus(403);
    const { override } = req.body;
    try {
      const existing = await db.select().from(botSettings).where(eq(botSettings.key, "CREATED_PROFILES_OVERRIDE"));
      if (override === null || override === "") {
        // Remove override
        if (existing.length > 0) await db.delete(botSettings).where(eq(botSettings.key, "CREATED_PROFILES_OVERRIDE"));
      } else {
        const val = String(override);
        if (existing.length > 0) {
          await db.update(botSettings).set({ value: val, updatedAt: new Date() }).where(eq(botSettings.key, "CREATED_PROFILES_OVERRIDE"));
        } else {
          await db.insert(botSettings).values({ key: "CREATED_PROFILES_OVERRIDE", value: val });
        }
      }
      res.json({ ok: true });
    } catch {
      res.status(500).json({ message: "Failed to update" });
    }
  });

  // ─── Webhook CRUD (Owner Only) ────────────────────────────────────────────
  app.get("/api/admin/webhooks", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== "owner") return res.sendStatus(403);
    const rows = await db.select().from(webhooks);
    res.json(rows);
  });

  app.post("/api/admin/webhooks", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== "owner") return res.sendStatus(403);
    const { name, webhookUrl, logType } = req.body;
    if (!name?.trim() || !webhookUrl?.trim() || !logType?.trim()) return res.status(400).json({ message: "All fields required" });
    const [row] = await db.insert(webhooks).values({ name: name.trim(), webhookUrl: webhookUrl.trim(), logType: logType.trim() }).returning();
    res.json(row);
  });

  app.delete("/api/admin/webhooks/:id", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== "owner") return res.sendStatus(403);
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid id" });
    await db.delete(webhooks).where(eq(webhooks.id, id));
    res.json({ ok: true });
  });

  app.patch("/api/admin/webhooks/:id", async (req, res) => {
    if (!req.isAuthenticated() || (req.user as any).role !== "owner") return res.sendStatus(403);
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid id" });
    const { name, webhookUrl, logType } = req.body;
    if (!name?.trim() || !webhookUrl?.trim() || !logType?.trim()) return res.status(400).json({ message: "All fields required" });
    const [row] = await db.update(webhooks).set({ name: name.trim(), webhookUrl: webhookUrl.trim(), logType: logType.trim() }).where(eq(webhooks.id, id)).returning();
    res.json(row);
  });

  // ─── Admin: Change User Account Status (active/disabled) ─────────────────
  app.patch("/api/admin/users/:id/status", async (req, res) => {
    if (!req.isAuthenticated() || !isStaff((req.user as any).role)) return res.sendStatus(403);
    const targetId = parseInt(req.params.id);
    if (isNaN(targetId)) return res.status(400).json({ message: "Invalid id" });
    const { userStatus } = req.body;
    if (!["active", "disabled"].includes(userStatus)) return res.status(400).json({ message: "Invalid status. Use 'active' or 'disabled'" });
    const [target] = await db.select().from(users).where(eq(users.id, targetId));
    if (!target) return res.sendStatus(404);
    await db.update(users).set({ userStatus } as any).where(eq(users.id, targetId));
    const actor = req.user as any;
    fireWebhook("admin_panel_logs", {
      title: "🔧 Admin: User Status Changed",
      description: `**${actor.username}** changed account status of **${target.username}** to \`${userStatus}\`.`,
      fields: [
        { name: "Target User", value: target.username, inline: true },
        { name: "New Status", value: userStatus, inline: true },
        { name: "By Admin", value: actor.username, inline: true },
      ],
    }).catch(() => {});
    res.json({ ok: true });
  });

  // ─── Admin: Change User Presence Status (online/offline) ──────────────────
  app.patch("/api/admin/users/:id/presence", async (req, res) => {
    if (!req.isAuthenticated() || !isStaff((req.user as any).role)) return res.sendStatus(403);
    const targetId = parseInt(req.params.id);
    if (isNaN(targetId)) return res.status(400).json({ message: "Invalid id" });
    const { presenceStatus } = req.body;
    if (!["online", "offline"].includes(presenceStatus)) return res.status(400).json({ message: "Invalid status. Use 'online' or 'offline'" });
    const [target] = await db.select().from(users).where(eq(users.id, targetId));
    if (!target) return res.sendStatus(404);
    await db.update(users).set({ presenceStatus } as any).where(eq(users.id, targetId));
    const actor = req.user as any;
    fireWebhook("admin_panel_logs", {
      title: "🟢 Admin: User Presence Changed",
      description: `**${actor.username}** set **${target.username}**'s presence to \`${presenceStatus}\`.`,
      fields: [
        { name: "Target User", value: target.username, inline: true },
        { name: "Presence", value: presenceStatus, inline: true },
        { name: "By Admin", value: actor.username, inline: true },
      ],
    }).catch(() => {});
    res.json({ ok: true });
  });

  // ─── Easter Event ─────────────────────────────────────────────────────────
  app.get("/api/easter-event/status", async (req, res) => {
    const enabledRow = await pool.query(`SELECT value FROM bot_settings WHERE key = 'easter_event_enabled' LIMIT 1`).catch(() => ({ rows: [] }));
    const enabled = enabledRow.rows[0]?.value === "true";
    let submitted = false;
    if (req.isAuthenticated()) {
      const userId = (req.user as any).id;
      const sub = await pool.query(`SELECT id FROM easter_event_submissions WHERE user_id = $1 LIMIT 1`, [userId]).catch(() => ({ rows: [] }));
      submitted = sub.rows.length > 0;
    }
    res.json({ enabled, submitted });
  });

  app.post("/api/easter-event/submit", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as any;

    const enabledRow = await pool.query(`SELECT value FROM bot_settings WHERE key = 'easter_event_enabled' LIMIT 1`).catch(() => ({ rows: [] }));
    if (enabledRow.rows[0]?.value !== "true") return res.status(403).json({ message: "Easter Event is not currently active." });

    const existing = await pool.query(`SELECT id FROM easter_event_submissions WHERE user_id = $1 LIMIT 1`, [user.id]).catch(() => ({ rows: [] }));
    if (existing.rows.length > 0) return res.status(409).json({ message: "You have already submitted your profile." });

    const [profile] = await db.select().from(profiles).where(eq(profiles.userId, user.id));
    const host = req.get("host") || "";
    const protocol = host.includes("localhost") ? "http" : "https";
    const profileUrl = `${protocol}://${host}/${user.username}`;
    const profilePreviewUrl = `${protocol}://${host}/${user.username}?preview=1`;
    const discordMention = user.discordId ? `<@${user.discordId}>` : `@${user.username}`;
    const displayName = profile?.displayName || user.username;

    // Take real screenshot via Microlink API (headless browser render)
    let screenshotUrl: string | null = null;
    try {
      const mlRes = await fetch(
        `https://api.microlink.io/?url=${encodeURIComponent(profilePreviewUrl)}&screenshot=true&meta=false&waitFor=2500&viewport.width=1280&viewport.height=800`,
        { headers: { "Accept": "application/json" } }
      );
      if (mlRes.ok) {
        const mlData = await mlRes.json();
        screenshotUrl = mlData?.data?.screenshot?.url || null;
      }
    } catch {
      screenshotUrl = null;
    }
    // Fallback to thum.io if Microlink failed
    if (!screenshotUrl) {
      screenshotUrl = `https://image.thum.io/get/width/1280/${profilePreviewUrl}`;
    }

    const embedPayload = {
      username: "Hexed Easter Event",
      embeds: [{
        title: "🐣 Easter Event 2026 — New Submission!",
        description: `${discordMention} has submitted their Easter profile!\n\n**[🔗 View Profile](${profileUrl})**`,
        color: 0xf97316,
        image: { url: screenshotUrl },
        fields: [
          { name: "Username", value: user.username, inline: true },
          { name: "Display Name", value: displayName, inline: true },
          { name: "Profile URL", value: profileUrl, inline: false },
        ],
        footer: { text: "Hexed Easter Event 2026" },
        timestamp: new Date().toISOString(),
      }],
    };

    const WEBHOOK_URL = "https://discord.com/api/webhooks/1486312686739525682/ZkPuWxCMRW7CQNAvTkdhm9ko-rReZ_o6HXXN59ko2ay7tAa1f4XjEeh0CimxWULpqJSv";
    try {
      const whRes = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(embedPayload),
      });
      if (!whRes.ok) return res.status(500).json({ message: "Failed to send to Discord." });
    } catch {
      return res.status(500).json({ message: "Failed to send to Discord." });
    }

    await pool.query(`INSERT INTO easter_event_submissions (user_id, username, discord_id) VALUES ($1, $2, $3) ON CONFLICT (user_id) DO NOTHING`,
      [user.id, user.username, user.discordId || null]);
    res.json({ ok: true });
  });

  app.post("/api/admin/easter-event/toggle", async (req, res) => {
    if (!req.isAuthenticated() || !canManageWebsite((req.user as any).role)) return res.sendStatus(403);
    const { enabled } = req.body;
    const val = enabled ? "true" : "false";
    await pool.query(`INSERT INTO bot_settings (key, value) VALUES ('easter_event_enabled', $1) ON CONFLICT (key) DO UPDATE SET value = $1`, [val]);
    res.json({ ok: true, enabled: enabled === true || enabled === "true" });
  });

  // ── Profile Decorations (public) ──
  app.get("/api/decorations", async (req, res) => {
    try {
      const { rows } = await pool.query(`SELECT * FROM profile_decorations WHERE enabled = true ORDER BY created_at ASC`);
      res.json(rows);
    } catch { res.json([]); }
  });

  // ── Profile Decorations Admin (owner + developer) ──
  const canManageDeco = (req: any) => req.isAuthenticated() && ["owner", "developer"].includes((req.user as any).role);

  app.get("/api/admin/decorations", async (req, res) => {
    if (!canManageDeco(req)) return res.sendStatus(403);
    try {
      const { rows } = await pool.query(`SELECT * FROM profile_decorations ORDER BY created_at ASC`);
      res.json(rows);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/admin/decorations", async (req, res) => {
    if (!canManageDeco(req)) return res.sendStatus(403);
    const { name, url, mediaType, isPremiumOnly } = req.body;
    if (!name || !url || !mediaType) return res.status(400).json({ error: "name, url, and mediaType are required" });
    try {
      const { rows } = await pool.query(
        `INSERT INTO profile_decorations (name, url, media_type, is_premium_only, enabled) VALUES ($1, $2, $3, $4, true) RETURNING *`,
        [name, url, mediaType, isPremiumOnly ?? false]
      );
      res.json(rows[0]);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.patch("/api/admin/decorations/:id", async (req, res) => {
    if (!canManageDeco(req)) return res.sendStatus(403);
    const { name, url, mediaType, isPremiumOnly, enabled } = req.body;
    try {
      const { rows } = await pool.query(
        `UPDATE profile_decorations SET name=COALESCE($1,name), url=COALESCE($2,url), media_type=COALESCE($3,media_type), is_premium_only=COALESCE($4,is_premium_only), enabled=COALESCE($5,enabled) WHERE id=$6 RETURNING *`,
        [name ?? null, url ?? null, mediaType ?? null, isPremiumOnly ?? null, enabled ?? null, req.params.id]
      );
      if (!rows[0]) return res.status(404).json({ error: "Not found" });
      res.json(rows[0]);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.delete("/api/admin/decorations/:id", async (req, res) => {
    if (!canManageDeco(req)) return res.sendStatus(403);
    try {
      await pool.query(`DELETE FROM profile_decorations WHERE id=$1`, [req.params.id]);
      res.json({ ok: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  const httpServer = createServer(app);
  return httpServer;
}
