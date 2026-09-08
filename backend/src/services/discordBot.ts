import { Client, GatewayIntentBits, Events, EmbedBuilder, TextChannel, DMChannel } from "discord.js";
import { prisma } from "../utils/prisma";

let discordClient: Client | null = null;
let isReady = false;

export function getDiscordClient(): Client | null {
  return discordClient;
}

export function isDiscordReady(): boolean {
  return isReady && discordClient?.isReady() === true;
}

export async function initializeDiscordBot(): Promise<void> {
  const settings = await prisma.discordSettings.findUnique({
    where: { tenantId: "default" }
  });

  if (!settings?.isEnabled || !settings?.botToken) {
    console.log("[Discord] Bot not configured or disabled");
    return;
  }

  discordClient = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.DirectMessages,
      GatewayIntentBits.MessageContent,
    ],
  });

  discordClient.once(Events.ClientReady, () => {
    isReady = true;
    console.log(`[Discord] Bot logged in as ${discordClient?.user?.tag}`);
  });

  discordClient.on(Events.MessageCreate, async (message) => {
    if (message.author.bot) return;
    if (!(message.channel instanceof DMChannel)) return;

    const content = message.content.trim();
    if (!content.startsWith("!verify ")) return;

    const code = content.slice(8).trim().toUpperCase();
    if (!code) {
      await message.reply("Usage: `!verify <CODE>`");
      return;
    }

    const verification = await prisma.discordVerification.findUnique({
      where: { code },
      include: { user: true }
    });

    if (!verification) {
      await message.reply("❌ Invalid verification code.");
      return;
    }

    if (verification.status !== "PENDING") {
      await message.reply("❌ This code has already been used or expired.");
      return;
    }

    if (verification.expiresAt < new Date()) {
      await prisma.discordVerification.update({
        where: { id: verification.id },
        data: { status: "EXPIRED" }
      });
      await message.reply("❌ This verification code has expired.");
      return;
    }

    await prisma.$transaction(async (tx) => {
      await tx.discordVerification.update({
        where: { id: verification.id },
        data: {
          status: "VERIFIED",
          discordUserId: message.author.id,
          discordUsername: message.author.tag,
          verifiedAt: new Date(),
        }
      });

      await tx.user.update({
        where: { id: verification.userId },
        data: {
          discordId: message.author.id,
          discordUsername: message.author.tag,
          discordAvatar: message.author.avatar ? message.author.avatarURL() : null,
          discordVerified: true,
          discordVerifiedAt: new Date(),
          verificationCode: null,
          verificationCodeExpires: null,
        }
      });
    });

    const embed = new EmbedBuilder()
      .setTitle("✅ Verification Successful")
      .setDescription("Your Discord account has been linked to your Minevo account!")
      .setColor(0x22C55E)
      .addFields(
        { name: "Discord", value: message.author.tag, inline: true },
        { name: "Status", value: "Verified", inline: true }
      )
      .setTimestamp();

    await message.reply({ embeds: [embed] });

    if (settings.logChannelId && discordClient) {
      const logChannel = discordClient.channels.cache.get(settings.logChannelId) as TextChannel;
      if (logChannel) {
        const logEmbed = new EmbedBuilder()
          .setTitle("🔗 New Discord Verification")
          .setColor(0x3B82F6)
          .addFields(
            { name: "User", value: `<@${message.author.id}> (${message.author.tag})`, inline: true },
            { name: "Panel User", value: verification.user.email, inline: true },
            { name: "Code", value: `\`${code}\``, inline: true }
          )
          .setTimestamp();
        await logChannel.send({ embeds: [logEmbed] });
      }
    }
  });

  discordClient.on(Events.Error, (error) => {
    console.error("[Discord] Client error:", error);
  });

  try {
    await discordClient.login(settings.botToken);
  } catch (error) {
    console.error("[Discord] Failed to login:", error);
    isReady = false;
  }
}

export async function sendVerificationDM(discordUserId: string, code: string, panelUrl: string): Promise<boolean> {
  if (!discordClient || !isReady) return false;

  try {
    const user = await discordClient.users.fetch(discordUserId);
    const embed = new EmbedBuilder()
      .setTitle("🔐 Minevo Verification Code")
      .setDescription("Use this code to verify your Discord account on the panel.")
      .setColor(0x6366F1)
      .addFields(
        { name: "Verification Code", value: `\`${code}\``, inline: false },
        { name: "Instructions", value: `Send \`!verify ${code}\` in this DM to complete verification.`, inline: false },
        { name: "Expires", value: "10 minutes", inline: true }
      )
      .setFooter({ text: "Minevo Panel" })
      .setTimestamp();

    await user.send({ embeds: [embed] });
    return true;
  } catch (error) {
    console.error("[Discord] Failed to send verification DM:", error);
    return false;
  }
}

export async function sendServerInvoiceDM(
  discordUserId: string,
  serverName: string,
  invoiceData: {
    amount: number;
    currency: string;
    renewalDate: Date;
    serverSoftware: string;
    serverRam: number;
    serverIp: string;
    serverPort: number;
  }
): Promise<boolean> {
  if (!discordClient || !isReady) return false;

  try {
    const user = await discordClient.users.fetch(discordUserId);
    const embed = new EmbedBuilder()
      .setTitle("📄 Server Created - Invoice")
      .setDescription(`Your server **${serverName}** has been created successfully!`)
      .setColor(0x22C55E)
      .addFields(
        { name: "Server", value: serverName, inline: true },
        { name: "Software", value: invoiceData.serverSoftware, inline: true },
        { name: "RAM", value: `${invoiceData.serverRam} MB`, inline: true },
        { name: "IP:Port", value: `${invoiceData.serverIp}:${invoiceData.serverPort}`, inline: true },
        { name: "Amount", value: `${invoiceData.amount} ${invoiceData.currency}`, inline: true },
        { name: "Renewal Date", value: `<t:${Math.floor(invoiceData.renewalDate.getTime() / 1000)}:F>`, inline: true }
      )
      .setFooter({ text: "Minevo Panel • Keep this for your records" })
      .setTimestamp();

    await user.send({ embeds: [embed] });
    return true;
  } catch (error) {
    console.error("[Discord] Failed to send invoice DM:", error);
    return false;
  }
}

export async function sendRenewalReminderDM(
  discordUserId: string,
  serverName: string,
  renewalDate: Date,
  amount: number,
  currency: string
): Promise<boolean> {
  if (!discordClient || !isReady) return false;

  try {
    const user = await discordClient.users.fetch(discordUserId);
    const embed = new EmbedBuilder()
      .setTitle("⏰ Server Renewal Reminder")
      .setDescription(`Your server **${serverName}** is due for renewal.`)
      .setColor(0xEAB308)
      .addFields(
        { name: "Server", value: serverName, inline: true },
        { name: "Renewal Date", value: `<t:${Math.floor(renewalDate.getTime() / 1000)}:F>`, inline: true },
        { name: "Amount", value: `${amount} ${currency}`, inline: true }
      )
      .setFooter({ text: "Minevo Panel" })
      .setTimestamp();

    await user.send({ embeds: [embed] });
    return true;
  } catch (error) {
    console.error("[Discord] Failed to send renewal reminder:", error);
    return false;
  }
}