import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as DiscordStrategy } from "passport-discord";
import { Express } from "express";
import session from "express-session";
import bcrypt from "bcryptjs";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import { db } from "./db";
import { users, profiles, discordEvents } from "@shared/schema";
import { eq, and, lt } from "drizzle-orm";
import { syncDiscordRoleBadges } from "./discord-sync";
import { fireWebhook, makeProfileUrl } from "./webhookService";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const OWNER_DISCORD_IDS = ["1243269414900596787", "970654818521722881"];

// Throttle Discord role sync per user (max once per 5 minutes)
const discordSyncThrottle = new Map<number, number>();
const DISCORD_SYNC_INTERVAL_MS = 5 * 60 * 1000;

// ─── Discord verify callback (shared between dynamic registrations) ────────────
const discordVerify = async (_accessToken: string, _refreshToken: string, profile: any, done: any) => {
  try {
    const discordId = profile.id;
    const discordUsername = profile.username;
    const discordGlobalName = profile.global_name || profile.username;
    const email = profile.email || `${discordId}@discord.user`;
    const avatarUrl = profile.avatar
      ? `https://cdn.discordapp.com/avatars/${discordId}/${profile.avatar}.png?size=256`
      : null;

    const [existing] = await db.select().from(users).where(eq(users.discordId, discordId));

    if (existing) {
      const [updated] = await db.update(users)
        .set({ discordAvatar: avatarUrl, discordUsername: discordGlobalName })
        .where(eq(users.id, existing.id))
        .returning();

      await db.insert(discordEvents).values({
        userId: existing.id,
        discordId,
        discordUsername,
        discordGlobalName,
        email: profile.email || null,
        action: "login",
        isNewUser: false,
      });

      // Sync Discord role badges (async, don't block login)
      syncDiscordRoleBadges(existing.id, discordId).catch(() => {});

      return done(null, updated);
    }

    const role = OWNER_DISCORD_IDS.includes(discordId) ? "owner" : "user";

    let baseUsername = discordUsername.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 20) || "user";
    let username = baseUsername;
    let attempt = 0;
    while (true) {
      const [taken] = await db.select({ id: users.id }).from(users).where(eq(users.username, username));
      if (!taken) break;
      attempt++;
      username = `${baseUsername}${attempt}`;
    }

    let finalEmail = email;
    const [emailTaken] = await db.select({ id: users.id }).from(users).where(eq(users.email, finalEmail));
    if (emailTaken) finalEmail = `${discordId}_${Date.now()}@discord.user`;

    const hashedPassword = await bcrypt.hash(crypto.randomUUID(), 10);

    const [newUser] = await db.insert(users).values({
      username,
      email: finalEmail,
      password: hashedPassword,
      role,
      discordId,
      discordAvatar: avatarUrl,
      discordUsername: discordGlobalName,
    }).returning();

    await db.insert(profiles).values({
      userId: newUser.id,
      displayName: discordGlobalName || discordUsername,
      avatarUrl: avatarUrl || "",
    });

    await db.insert(discordEvents).values({
      userId: newUser.id,
      discordId,
      discordUsername,
      discordGlobalName,
      email: profile.email || null,
      action: "register",
      isNewUser: true,
    });

    // Sync Discord role badges for new user (async, don't block login)
    syncDiscordRoleBadges(newUser.id, discordId).catch(() => {});

    return done(null, newUser);
  } catch (err) {
    return done(err as Error);
  }
};

// ─── Register Discord strategy with current credentials ───────────────────────
function registerDiscordStrategy(callbackURL: string) {
  const clientID = process.env.DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;
  if (!clientID || !clientSecret) return false;
  try {
    passport.use(new DiscordStrategy({ clientID, clientSecret, callbackURL, scope: ["identify"] }, discordVerify));
    return true;
  } catch (_) {
    return false;
  }
}

export function setupAuth(app: Express) {
  const isProduction = process.env.NODE_ENV === "production";

  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "hexed-secret-change-me",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      secure: isProduction,
      httpOnly: true,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  };

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // ─── Local Strategy ───────────────────────────────────────────────
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user || !(await bcrypt.compare(password, user.password))) {
          return done(null, false, { message: "Invalid credentials" });
        }
        if (user.role === "banned") {
          const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
          if (webhookUrl) {
            try {
              await fetch(webhookUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  embeds: [{
                    title: "🚫 Banned User Login Attempt",
                    description: `Banned user **${user.username}** (ID: ${user.id}) attempted to log in.`,
                    color: 0xff0000,
                    timestamp: new Date().toISOString(),
                    footer: { text: "Hexed Security" },
                  }],
                }),
              });
            } catch (_) {}
          }
          return done(null, false, { message: "You have been banned" });
        }
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }),
  );

  // Register Discord strategy at startup if credentials are already present
  const initialCallback = process.env.DISCORD_CALLBACK_URL || "https://placeholder/auth/discord/callback";
  registerDiscordStrategy(initialCallback);

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      if (user && user.role === "banned") {
        return done(null, false as any);
      }
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  // ─── Local Auth Routes ────────────────────────────────────────────
  app.post("/api/register", async (req, res, next) => {
    try {
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).send("Username already exists");
      }

      const hashedPassword = await bcrypt.hash(req.body.password, 10);
      const user = await storage.createUser({
        ...req.body,
        password: hashedPassword,
      });

      fireWebhook("account_created", {
        title: "🎉 New Account Created",
        description: `**[${user.username}](${makeProfileUrl(user.username)})** just joined Hexed!`,
        fields: [
          { name: "Username", value: user.username, inline: true },
          { name: "Email", value: user.email, inline: true },
          { name: "Profile", value: makeProfileUrl(user.username), inline: false },
        ],
      }).catch(() => {});

      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json(user);
      });
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ message: info?.message || "Invalid credentials" });

      // ─── 2FA check ────────────────────────────────────────────────
      if (user.twoFactorEnabled && user.twoFactorCode) {
        const providedCode = req.body.twoFactorCode as string | undefined;
        if (!providedCode) {
          return res.status(401).json({ requires2FA: true, message: "2FA code required" });
        }
        if (providedCode.trim() !== user.twoFactorCode.trim()) {
          return res.status(401).json({ requires2FA: true, invalid2FA: true, message: "Invalid 2FA code" });
        }
      }

      req.login(user, (err) => {
        if (err) return next(err);
        if (user.discordId) {
          syncDiscordRoleBadges(user.id, user.discordId).catch(() => {});
        }
        res.status(200).json(user);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as any;
    if (user.discordId) {
      // Throttle Discord sync to once per 5 minutes per user
      const lastSync = discordSyncThrottle.get(user.id) || 0;
      const now = Date.now();
      if (now - lastSync > DISCORD_SYNC_INTERVAL_MS) {
        discordSyncThrottle.set(user.id, now);
        syncDiscordRoleBadges(user.id, user.discordId).catch(() => {});
      }
      const [freshUser] = await db.select().from(users).where(eq(users.id, user.id));
      if (freshUser) return res.json(freshUser);
    }
    res.json(user);
  });

  // ─── Public Discord Status ────────────────────────────────────────
  app.get("/api/discord-status", (req, res) => {
    const enabled = process.env.DISCORD_LOGIN_ENABLED !== "false";
    const configured = !!(process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET);
    res.json({ enabled, configured });
  });

  // ─── Admin: Return the computed Discord callback URL ──────────────
  app.get("/api/admin/discord-callback-url", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const stored = process.env.DISCORD_CALLBACK_URL;
    const isValidOverride =
      stored &&
      !stored.startsWith("https://discord.com") &&
      stored.includes("/auth/discord/callback") &&
      /^https?:\/\//.test(stored);
    if (isValidOverride) return res.json({ url: stored });
    const replitDomain =
      process.env.REPLIT_DEV_DOMAIN ||
      (process.env.REPLIT_DOMAINS || "").split(",")[0].trim();
    if (replitDomain) return res.json({ url: `https://${replitDomain}/auth/discord/callback` });
    const proto = (req.headers["x-forwarded-proto"] as string || req.protocol || "https")
      .split(",")[0].trim();
    const host = (req.headers["x-forwarded-host"] as string || req.hostname)
      .split(",")[0].trim();
    res.json({ url: `${proto}://${host}/auth/discord/callback` });
  });

  // ─── Discord OAuth Routes ─────────────────────────────────────────
  function getDiscordCallbackURL(req: any) {
    // Use explicit override if set and valid
    const stored = process.env.DISCORD_CALLBACK_URL;
    const isValidOverride =
      stored &&
      !stored.startsWith("https://discord.com") &&
      stored.includes("/auth/discord/callback") &&
      /^https?:\/\//.test(stored);

    if (isValidOverride) return stored!;

    // Prefer Replit's managed domain variable — always correct for this Repl
    const replitDomain =
      process.env.REPLIT_DEV_DOMAIN ||
      (process.env.REPLIT_DOMAINS || "").split(",")[0].trim();
    if (replitDomain) return `https://${replitDomain}/auth/discord/callback`;

    // Fallback: compute from request headers
    const proto = (req.headers["x-forwarded-proto"] as string || req.protocol || "https")
      .split(",")[0].trim();
    const host = (req.headers["x-forwarded-host"] as string || req.hostname)
      .split(",")[0].trim();
    return `${proto}://${host}/auth/discord/callback`;
  }

  app.get("/auth/discord", (req, res, next) => {
    const enabled = process.env.DISCORD_LOGIN_ENABLED !== "false";
    if (!enabled) return res.redirect("/login?error=discord_disabled");

    const clientID = process.env.DISCORD_CLIENT_ID;
    const clientSecret = process.env.DISCORD_CLIENT_SECRET;
    if (!clientID || !clientSecret) return res.redirect("/login?error=discord_not_configured");

    const callbackURL = getDiscordCallbackURL(req);
    console.log("[discord] Starting OAuth with callbackURL:", callbackURL);

    // Re-register with latest credentials each time
    registerDiscordStrategy(callbackURL);

    passport.authenticate("discord", { callbackURL } as any)(req, res, next);
  });

  // ─── Link Discord to an existing logged-in account ────────────────
  app.get("/auth/discord/link", (req, res, next) => {
    if (!req.isAuthenticated()) return res.redirect("/login");

    const clientID = process.env.DISCORD_CLIENT_ID;
    const clientSecret = process.env.DISCORD_CLIENT_SECRET;
    if (!clientID || !clientSecret) return res.redirect("/dashboard?error=discord_not_configured");

    (req.session as any).discordLinkUserId = (req.user as any).id;
    const callbackURL = getDiscordCallbackURL(req);
    registerDiscordStrategy(callbackURL);
    passport.authenticate("discord", { callbackURL } as any)(req, res, next);
  });

  // ─── Disconnect Discord ───────────────────────────────────────────
  app.post("/api/user/disconnect-discord", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = (req.user as any).id;
    try {
      const [updated] = await db.update(users)
        .set({ discordId: null, discordAvatar: null, discordUsername: null })
        .where(eq(users.id, userId))
        .returning();
      res.json(updated);
    } catch {
      res.status(500).json({ message: "Failed to disconnect Discord" });
    }
  });

  app.get(
    "/auth/discord/callback",
    (req, res, next) => {
      const enabled = process.env.DISCORD_LOGIN_ENABLED !== "false";
      if (!enabled) return res.redirect("/login?error=discord_disabled");

      const clientID = process.env.DISCORD_CLIENT_ID;
      const clientSecret = process.env.DISCORD_CLIENT_SECRET;
      if (!clientID || !clientSecret) return res.redirect("/login?error=discord_not_configured");

      const callbackURL = getDiscordCallbackURL(req);
      console.log("[discord] Callback received, using callbackURL:", callbackURL);

      // Re-register with latest credentials each time
      registerDiscordStrategy(callbackURL);

      const linkUserId = (req.session as any).discordLinkUserId;

      passport.authenticate("discord", {
        failureRedirect: linkUserId ? "/dashboard?error=discord_link_failed" : "/login?error=discord",
        callbackURL,
      } as any, async (err: any, discordUser: any) => {
        if (err) {
          console.error("[discord] OAuth error:", err.code || err.message || err);
          return res.redirect((linkUserId ? "/dashboard" : "/login") + "?error=discord_" + encodeURIComponent(err.code || "unknown"));
        }
        if (!discordUser) {
          return res.redirect(linkUserId ? "/dashboard?error=discord_link_failed" : "/login?error=discord");
        }

        // ─── LINK flow: attach Discord to existing account ───────────
        if (linkUserId) {
          delete (req.session as any).discordLinkUserId;
          const discordId: string = discordUser.discordId;
          const discordAvatar: string | null = discordUser.discordAvatar;
          const discordUsername: string | null = discordUser.discordUsername;
          try {
            // If discordVerify returned the same linkUserId, Discord was already linked
            if (discordUser.id === linkUserId) {
              return res.redirect("/dashboard?discord=linked");
            }
            // Check if this discord ID is tied to an account that was created > 30s ago
            // (meaning it's a real, long-standing account — real conflict)
            const thirtySecondsAgo = new Date(Date.now() - 30_000);
            const [realConflict] = await db.select({ id: users.id, createdAt: users.createdAt })
              .from(users)
              .where(and(eq(users.discordId, discordId), lt(users.createdAt, thirtySecondsAgo)));
            if (realConflict) {
              // Another established account already owns this Discord
              return res.redirect("/dashboard?error=discord_already_linked");
            }
            // Safe to link — delete any freshly-created Discord-only account and attach
            await db.delete(users).where(and(eq(users.discordId, discordId), eq(users.id, discordUser.id)));
            const [updated] = await db.update(users)
              .set({ discordId, discordAvatar, discordUsername })
              .where(eq(users.id, linkUserId))
              .returning();
            syncDiscordRoleBadges(linkUserId, discordId).catch(() => {});
            req.logIn(updated, (loginErr) => {
              if (loginErr) return res.redirect("/dashboard");
              return res.redirect("/dashboard?discord=linked");
            });
          } catch (e) {
            console.error("[discord] Link error:", e);
            return res.redirect("/dashboard?error=discord_link_failed");
          }
          return;
        }

        // ─── Normal login / register flow ─────────────────────────────
        req.logIn(discordUser, (loginErr) => {
          if (loginErr) {
            console.error("[discord] Login error:", loginErr);
            return res.redirect("/login?error=discord");
          }
          res.redirect("/dashboard");
        });
      })(req, res, next);
    }
  );
}
