import { db } from "./db";
import { users, badges } from "@shared/schema";
import { eq } from "drizzle-orm";

const SERVER_BOOSTER_BADGE_NAME = "Server Booster";
const BOOSTER_CHANNEL_ID = "1483131083343007774";

export async function syncDiscordRoleBadges(userId: number, discordId: string) {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  const guildId = process.env.DISCORD_GUILD_ID;
  if (!botToken || !guildId) return;
  try {
    const memberRes = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${discordId}`, {
      headers: { Authorization: `Bot ${botToken}` },
    });
    if (!memberRes.ok) return;
    const member = await memberRes.json() as any;
    const memberRoleIds: string[] = member.roles || [];
    const allBadges = await db.select().from(badges);
    const badgesWithRoles = allBadges.filter(b => b.roleId && b.roleId.trim() !== "");
    const [currentUser] = await db.select().from(users).where(eq(users.id, userId));
    if (!currentUser) return;
    let currentBadges: string[] = (currentUser.badges as string[]) || [];
    let changed = false;
    let newlyGotBooster = false;
    let isPremiumUpdate: boolean | undefined = undefined;

    for (const badge of badgesWithRoles) {
      const hasRole = memberRoleIds.includes(badge.roleId!);
      const hasBadge = currentBadges.includes(badge.name);
      if (hasRole && !hasBadge) {
        currentBadges = [...currentBadges, badge.name];
        changed = true;
        if (badge.name === SERVER_BOOSTER_BADGE_NAME) newlyGotBooster = true;
        if (badge.name === "Premium") isPremiumUpdate = true;
      } else if (!hasRole && hasBadge) {
        currentBadges = currentBadges.filter(b => b !== badge.name);
        changed = true;
        if (badge.name === "Premium") isPremiumUpdate = false;
      }
    }

    if (changed) {
      const updateObj: any = { badges: currentBadges };
      if (isPremiumUpdate !== undefined) updateObj.isPremium = isPremiumUpdate;
      await db.update(users).set(updateObj).where(eq(users.id, userId));
    }

    if (newlyGotBooster) {
      try {
        await fetch(`https://discord.com/api/v10/channels/${BOOSTER_CHANNEL_ID}/messages`, {
          method: "POST",
          headers: { Authorization: `Bot ${botToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            content: `<@${discordId}> just boosted 🤍`,
            embeds: [{ description: "You have received the **Server Booster** badge automatically.", color: 0xff73fa }],
          }),
        });
      } catch (_) {}
    }
  } catch (_) {}
}

export async function syncDiscordRoleBadgesByDiscordId(discordId: string) {
  const [user] = await db.select().from(users).where(eq(users.discordId, discordId)).limit(1);
  if (!user) return;
  await syncDiscordRoleBadges(user.id, discordId);
}
