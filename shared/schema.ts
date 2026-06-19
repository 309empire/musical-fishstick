import { pgTable, text, serial, integer, timestamp, boolean, jsonb, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("user"),
  joinDate: timestamp("join_date").defaultNow(),
  views: integer("views").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  maxTracks: integer("max_tracks").default(3),
  maxTags: integer("max_tags").default(5),
  badges: jsonb("badges").$type<string[]>().default([]),
  hiddenBadges: jsonb("hidden_badges").$type<string[]>().default([]),
  isPremium: boolean("is_premium").default(false),
  premiumExpiry: timestamp("premium_expiry"),
  alias: text("alias"),
  maxAliases: integer("max_aliases").default(1),
  discordId: text("discord_id").unique(),
  discordAvatar: text("discord_avatar"),
  discordUsername: text("discord_username"),
  easterEggClaimed: boolean("easter_egg_claimed").default(false),
  dailyStreak: integer("daily_streak").default(0),
  lastDailyClaim: timestamp("last_daily_claim"),
  aliases: jsonb("aliases").$type<string[]>().default([]),
  completedChallenges: jsonb("completed_challenges").$type<string[]>().default([]),
  lastWheelSpin: timestamp("last_wheel_spin"),
  lastSeenAt: timestamp("last_seen_at"),
  bonusLikes: integer("bonus_likes").default(0),
  userStatus: text("user_status").default("active"),
  presenceStatus: text("presence_status").default("offline"),
  profileSetupDone: boolean("profile_setup_done").default(false),
  twoFactorCode: text("two_factor_code"),
  twoFactorEnabled: boolean("two_factor_enabled").default(false),
});

export const profiles = pgTable("profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull().unique(),
  displayName: text("display_name").default(""),
  bio: text("bio").default(""),
  location: text("location").default(""),
  avatarUrl: text("avatar_url"),
  bannerUrl: text("banner_url"),
  backgroundUrl: text("background_url"),
  backgroundVideoUrl: text("background_video_url"),
  musicUrl: text("music_url"),
  showViews: boolean("show_views").default(true),
  showUid: boolean("show_uid").default(true),
  showJoinDate: boolean("show_join_date").default(true),
  showWatermark: boolean("show_watermark").default(true),
  themeColor: text("theme_color").default("#F97316"),
  backgroundEffect: text("background_effect").default("none"),
  revealEnabled: boolean("reveal_enabled").default(true),
  revealText: text("reveal_text").default("Click to reveal"),
  settings: jsonb("settings").$type<Record<string, any>>().default({}),
});

export const badges = pgTable("badges", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  icon: text("icon").notNull(),
  color: text("color").notNull().default("#F97316"),
  isProtected: boolean("is_protected").default(false),
  description: text("description").default(""),
  howToGet: text("how_to_get").default(""),
  visibleTo: text("visible_to").default("all"),
  available: boolean("available").default(true),
  badgeOrder: integer("badge_order").default(0),
  roleId: text("role_id").default(""),
});

export const links = pgTable("links", {
  id: serial("id").primaryKey(),
  profileId: integer("profile_id").references(() => profiles.id).notNull(),
  title: text("title").notNull(),
  url: text("url").notNull(),
  description: text("description").default(""),
  icon: text("icon").default(""),
  platform: text("platform").default(""),
  style: text("style").default("default"),
  order: integer("order").default(0),
  enabled: boolean("enabled").default(true),
  clicks: integer("clicks").default(0),
});

export const tracks = pgTable("tracks", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  title: text("title").notNull(),
  url: text("url").notNull(),
  artistProfile: text("artist_profile").default(""),
  order: integer("order").default(0),
  enabled: integer("enabled").default(1),
});

export const viewLogs = pgTable("view_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  ipAddress: text("ip_address").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const templates = pgTable("templates", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  username: text("username").notNull(),
  name: text("name").notNull(),
  description: text("description").default(""),
  previewImageUrl: text("preview_image_url"),
  profileSnapshot: jsonb("profile_snapshot").$type<Record<string, any>>().default({}),
  createdAt: timestamp("created_at").defaultNow(),
  uses: integer("uses").default(0),
});

export const profileLikes = pgTable("profile_likes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  ipAddress: text("ip_address").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const discordEvents = pgTable("discord_events", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  discordId: text("discord_id").notNull(),
  discordUsername: text("discord_username"),
  discordGlobalName: text("discord_global_name"),
  email: text("email"),
  action: text("action").notNull().default("login"),
  isNewUser: boolean("is_new_user").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const tickets = pgTable("tickets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  discordId: text("discord_id"),
  discordUsername: text("discord_username"),
  discordAvatar: text("discord_avatar"),
  status: text("status").notNull().default("open"),
  claimedByUserId: integer("claimed_by_user_id").references(() => users.id),
  claimedByDiscordUsername: text("claimed_by_discord_username"),
  claimedByDiscordAvatar: text("claimed_by_discord_avatar"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const ticketMessages = pgTable("ticket_messages", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id").references(() => tickets.id).notNull(),
  senderType: text("sender_type").notNull().default("user"),
  senderName: text("sender_name"),
  senderAvatar: text("sender_avatar"),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const botSettings = pgTable("bot_settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull().default(""),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const announcements = pgTable("announcements", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull().default(""),
  type: text("type").notNull().default("info"),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const changelogs = pgTable("changelogs", {
  id: serial("id").primaryKey(),
  version: text("version").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull().default(""),
  author: text("author").notNull().default(""),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const webhooks = pgTable("webhooks", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  webhookUrl: text("webhook_url").notNull(),
  logType: text("log_type").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  price: real("price").notNull().default(0),
  salePrice: real("sale_price"),
  icon: text("icon").notNull().default("📦"),
  imageUrl: text("image_url"),
  features: jsonb("features").$type<string[]>().default([]),
  badgeName: text("badge_name"),
  grantsPremium: boolean("grants_premium").default(false),
  color: text("color").default("#F97316"),
  bgColor: text("bg_color").default("#0d0d0d"),
  sortOrder: integer("sort_order").default(0),
  isSeeded: boolean("is_seeded").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const ourTeam = pgTable("our_team", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  role: text("role").notNull(),
  description: text("description").notNull().default(""),
  tags: jsonb("tags").$type<string[]>().default([]),
  discordUser: text("discord_user").default(""),
  discordUserId: text("discord_user_id").default(""),
  profile: text("profile").default(""),
  colour: text("colour").notNull().default("#F97316"),
  avatarUrl: text("avatar_url").default(""),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true, joinDate: true, views: true, createdAt: true, badges: true, isPremium: true, premiumExpiry: true,
  discordId: true, discordAvatar: true, discordUsername: true, hiddenBadges: true,
  dailyStreak: true, lastDailyClaim: true, aliases: true, completedChallenges: true,
  profileSetupDone: true,
});
export const insertProfileSchema = createInsertSchema(profiles).omit({ id: true, userId: true });
export const insertBadgeSchema = createInsertSchema(badges).omit({ id: true });
export const insertTemplateSchema = createInsertSchema(templates).omit({ id: true, userId: true, username: true, createdAt: true, uses: true });
export const insertChangelogSchema = createInsertSchema(changelogs).omit({ id: true, createdAt: true, updatedAt: true });

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Profile = typeof profiles.$inferSelect;
export type InsertProfile = z.infer<typeof insertProfileSchema>;
export type Badge = typeof badges.$inferSelect;
export type Track = typeof tracks.$inferSelect;
export type Template = typeof templates.$inferSelect;
export type Ticket = typeof tickets.$inferSelect;
export type TicketMessage = typeof ticketMessages.$inferSelect;
export type Changelog = typeof changelogs.$inferSelect;
export type Webhook = typeof webhooks.$inferSelect;

export const LOG_TYPES = [
  "account_created",
  "database_updated",
  "gained_views",
  "gained_likes",
  "leaderboard_update",
  "profile_settings_changed",
  "received_badges",
  "uploads",
  "website_visit",
  "admin_panel_logs",
  "ticket_logs",
  "website_status",
  "ai_support_logs",
] as const;

export type LogType = typeof LOG_TYPES[number];

export const profileDecorations = pgTable("profile_decorations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  url: text("url").notNull(),
  mediaType: text("media_type").notNull().default("image"),
  isPremiumOnly: boolean("is_premium_only").default(false),
  enabled: boolean("enabled").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});
export type ProfileDecoration = typeof profileDecorations.$inferSelect;
export const insertProfileDecorationSchema = createInsertSchema(profileDecorations).omit({ id: true, createdAt: true });

export const LOG_TYPE_LABELS: Record<string, string> = {
  account_created: "Account Created",
  database_updated: "Database Updated",
  gained_views: "Gained Views",
  gained_likes: "Gained Likes",
  leaderboard_update: "Leaderboard Update",
  profile_settings_changed: "Profile Settings Changed",
  received_badges: "Received Badges",
  uploads: "Uploads",
  website_visit: "Website Visit",
  admin_panel_logs: "Admin Panel Logs",
  ticket_logs: "Ticket Logs",
  website_status: "Website Status",
  ai_support_logs: "AI Support Logs",
};

export const STAFF_ROLES = ["support", "moderator", "administrator", "developer", "admin", "owner"];
export const isStaff = (role: string) => STAFF_ROLES.includes(role);
export const canManageBadges = (role: string) => ["administrator", "developer", "admin", "owner"].includes(role);
export const canGiveBadges = (role: string) => ["moderator", "administrator", "developer", "admin", "owner"].includes(role);
export const canAccessBotSettings = (role: string) => ["developer", "owner"].includes(role);
export const canManageTeam = (role: string) => ["administrator", "developer", "admin", "owner"].includes(role);
export const canManageWebsite = (role: string) => ["developer", "owner"].includes(role);
export const canManageChangelogs = (role: string) => ["developer", "owner"].includes(role);
export const canManageOurTeam = (role: string) => role === "owner";
export const ROLE_HIERARCHY: Record<string, number> = {
  support: 1, moderator: 2, administrator: 3, admin: 3, developer: 4, owner: 5,
};
