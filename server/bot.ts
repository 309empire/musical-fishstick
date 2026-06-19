import { Client, GatewayIntentBits, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } from "discord.js";
import { db } from "./db";
import { users, profiles, tracks, links } from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import { syncDiscordRoleBadges } from "./discord-sync";

const PREFIX = ",";

async function findUser(identifier: string) {
  const byDiscordId = await db.select().from(users).where(eq(users.discordId, identifier)).limit(1);
  if (byDiscordId.length) return byDiscordId[0];

  const byUsername = await db.select().from(users).where(eq(users.username, identifier.toLowerCase())).limit(1);
  if (byUsername.length) return byUsername[0];

  const numId = parseInt(identifier);
  if (!isNaN(numId)) {
    const byId = await db.select().from(users).where(eq(users.id, numId)).limit(1);
    if (byId.length) return byId[0];
  }
  return null;
}

function buildProfileEmbed(u: any, profile: any, profileUrl: string, userTracks?: any[], userLinks?: any[]) {
  const settings = profile?.settings || {};
  const themeColor: number = profile?.themeColor
    ? parseInt(profile.themeColor.replace("#", ""), 16)
    : 0xf97316;

  const embed = new EmbedBuilder()
    .setColor(themeColor)
    .setTitle(`${profile?.displayName || u.username}`)
    .setURL(profileUrl)
    .setFooter({ text: "Hexed • Link-in-bio platform" })
    .setTimestamp();

  // Avatar — prefer profile avatar, fall back to Discord avatar
  if (profile?.avatarUrl) embed.setThumbnail(profile.avatarUrl);
  else if (u.discordAvatar) embed.setThumbnail(u.discordAvatar);

  // Banner image (not YouTube)
  if (profile?.bannerUrl && !profile.bannerUrl.includes("youtube")) {
    embed.setImage(profile.bannerUrl);
  } else if (profile?.backgroundUrl && !profile.backgroundUrl.includes("youtube")) {
    embed.setImage(profile.backgroundUrl);
  }

  // Identity row
  embed.addFields(
    { name: "Username", value: `[@${u.username}](${profileUrl})`, inline: true },
    { name: "UID", value: `#${u.id}`, inline: true },
    { name: "Views", value: `${u.views ?? 0} 👁`, inline: true },
  );

  if (profile?.bio) embed.addFields({ name: "Bio", value: profile.bio.slice(0, 250), inline: false });

  if (profile?.location) embed.addFields({ name: "📍 Location", value: profile.location, inline: true });
  if (u.discordUsername) embed.addFields({ name: "🎮 Discord", value: `@${u.discordUsername}`, inline: true });
  if (settings.pronouns) embed.addFields({ name: "Pronouns", value: settings.pronouns, inline: true });

  if (settings.statusEmoji || settings.statusMessage)
    embed.addFields({ name: "Status", value: `${settings.statusEmoji || ""} ${settings.statusMessage || ""}`.trim(), inline: false });

  // Badges
  if (u.badges?.length)
    embed.addFields({ name: "🏅 Badges", value: (u.badges as string[]).slice(0, 12).join("  "), inline: false });

  // Tags
  const tags: string[] = settings.tags || [];
  if (tags.length) embed.addFields({ name: "🏷 Tags", value: tags.map(t => `\`${t}\``).join(" "), inline: false });

  // Alias
  if (u.alias) embed.addFields({ name: "🔗 Alias", value: `hexed.at/${u.alias}`, inline: true });

  // Music tracks
  if (userTracks?.length) {
    const trackList = userTracks.slice(0, 3).map((t: any) => `🎵 ${t.title}${t.artist ? ` — ${t.artist}` : ""}`).join("\n");
    embed.addFields({ name: "🎶 Tracks", value: trackList, inline: false });
  }

  // Top links
  if (userLinks?.length) {
    const linkList = userLinks.slice(0, 5).map((l: any) => `• [${l.title}](${l.url})`).join("\n");
    embed.addFields({ name: "🔗 Links", value: linkList, inline: false });
  }

  return embed;
}

function buildProfileButton(profileUrl: string) {
  const btn = new ButtonBuilder()
    .setLabel("View Profile")
    .setStyle(ButtonStyle.Link)
    .setURL(profileUrl)
    .setEmoji("🌐");
  return new ActionRowBuilder<ButtonBuilder>().addComponents(btn);
}

function getProfileUrl(u: any) {
  const domain = process.env.REPL_DOMAINS
    ? `https://${process.env.REPL_DOMAINS.split(",")[0].trim()}`
    : "https://hexed.at";
  return `${domain}/${u.username}`;
}

export async function startBot() {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) {
    console.log("[bot] DISCORD_BOT_TOKEN not set — bot disabled");
    return;
  }

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildMembers,
    ],
  });

  client.once("ready", () => {
    console.log(`[bot] Logged in as ${client.user?.tag}`);
  });

  client.on("guildMemberUpdate", async (oldMember, newMember) => {
    const oldRoles = new Set(oldMember.roles.cache.keys());
    const newRoles = new Set(newMember.roles.cache.keys());
    const rolesChanged =
      [...oldRoles].some(r => !newRoles.has(r)) ||
      [...newRoles].some(r => !oldRoles.has(r));
    if (!rolesChanged) return;

    const discordId = newMember.id;
    const [user] = await db.select().from(users).where(eq(users.discordId, discordId)).limit(1);
    if (!user) return;

    console.log(`[bot] Roles changed for ${newMember.user?.tag} — syncing badges for user #${user.id}`);
    await syncDiscordRoleBadges(user.id, discordId).catch(err =>
      console.error("[bot] Badge sync error:", err)
    );
  });

  client.on("messageCreate", async (message) => {
    if (message.author.bot) return;
    if (!message.content.startsWith(PREFIX)) return;

    const args = message.content.slice(PREFIX.length).trim().split(/\s+/);
    const command = args.shift()?.toLowerCase();

    if (command === "me") {
      const discordId = message.author.id;
      const found = await db.select().from(users).where(eq(users.discordId, discordId)).limit(1);

      if (!found.length) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xef4444)
              .setDescription("❌ Your Discord account isn't linked to a Hexed profile.\nLog in at Hexed and connect your Discord!"),
          ],
        });
      }

      const u = found[0];
      const [profile] = await db.select().from(profiles).where(eq(profiles.userId, u.id));
      const userTracks = await db.select().from(tracks).where(eq(tracks.userId, u.id));
      const userLinks = profile
        ? await db.select().from(links).where(eq(links.profileId, profile.id))
        : [];
      const profileUrl = getProfileUrl(u);
      const embed = buildProfileEmbed(u, profile, profileUrl, userTracks, userLinks);
      return message.reply({ embeds: [embed], components: [buildProfileButton(profileUrl)] });
    }

    if (command === "look-up") {
      const raw = args[0];
      if (!raw) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xf97316)
              .setDescription("Usage: `,look-up <username | #uid | @mention>`\nExample: `,look-up abdz1` or `,look-up #5`"),
          ],
        });
      }

      const mentionMatch = raw.match(/^<@!?(\d+)>$/);
      const uidMatch = raw.match(/^#(\d+)$/);
      let u = null;

      if (mentionMatch) {
        const byDiscord = await db.select().from(users).where(eq(users.discordId, mentionMatch[1])).limit(1);
        u = byDiscord[0] ?? null;
      } else if (uidMatch) {
        const byId = await db.select().from(users).where(eq(users.id, parseInt(uidMatch[1]))).limit(1);
        u = byId[0] ?? null;
      } else {
        u = await findUser(raw);
      }

      if (!u) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xef4444)
              .setDescription(`❌ No Hexed user found for \`${raw}\``),
          ],
        });
      }

      const [profile] = await db.select().from(profiles).where(eq(profiles.userId, u.id));
      const userTracks = await db.select().from(tracks).where(eq(tracks.userId, u.id));
      const userLinks = profile
        ? await db.select().from(links).where(eq(links.profileId, profile.id))
        : [];
      const profileUrl = getProfileUrl(u);
      const embed = buildProfileEmbed(u, profile, profileUrl, userTracks, userLinks);
      return message.reply({ embeds: [embed], components: [buildProfileButton(profileUrl)] });
    }

    if (command === "leaderboard") {
      const top = await db.select().from(users).orderBy(desc(users.views)).limit(10);
      if (!top.length) {
        return message.reply({
          embeds: [new EmbedBuilder().setColor(0xf97316).setDescription("No users yet!")],
        });
      }
      const domain = process.env.REPL_DOMAINS
        ? `https://${process.env.REPL_DOMAINS.split(",")[0].trim()}`
        : "https://hexed.at";

      const medals = ["🥇", "🥈", "🥉"];
      const rows = top.map((u: any, i: number) => {
        const badge = medals[i] ?? `**${i + 1}.**`;
        return `${badge} [@${u.username}](${domain}/${u.username}) — **${u.views ?? 0}** views`;
      }).join("\n");

      const embed = new EmbedBuilder()
        .setColor(0xf97316)
        .setTitle("🏆 Hexed Leaderboard — Most Views")
        .setDescription(rows)
        .setFooter({ text: "Hexed • Link-in-bio platform" })
        .setTimestamp();

      return message.reply({ embeds: [embed] });
    }
  });

  try {
    await client.login(token);
  } catch (err: any) {
    console.error("[bot] Login failed:", err.message);
  }
}
