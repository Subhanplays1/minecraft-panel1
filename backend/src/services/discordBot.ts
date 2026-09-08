import { Client, GatewayIntentBits, Events, EmbedBuilder, TextChannel, DMChannel, SlashCommandBuilder, InteractionEditReplyOptions } from "discord.js";
import { prisma } from "../utils/prisma";

let discordClient: Client | null = null;
let isReady = false;

export function getDiscordClient(): Client | null {
  return discordClient;
}

export function isDiscordReady(): boolean {
  return isReady && discordClient?.isReady() === true;
}

async function handleVerify(code: string, interaction: any, settings: any): Promise<InteractionEditReplyOptions> {
  if (!code) {
    return { content: "Usage: `/verify <CODE>`" };
  }

  const upperCode = code.toUpperCase();

  const verification = await prisma.discordVerification.findUnique({
    where: { code: upperCode },
    include: { user: true }
  });

  if (!verification) {
    return { content: "Invalid verification code." };
  }

  if (verification.status !== "PENDING") {
    return { content: "This code has already been used or expired." };
  }

  if (verification.expiresAt < new Date()) {
    await prisma.discordVerification.update({
      where: { id: verification.id },
      data: { status: "EXPIRED" }
    });
    return { content: "This verification code has expired. Please generate a new one on the panel." };
  }

  await prisma.$transaction(async (tx) => {
    await tx.discordVerification.update({
      where: { id: verification.id },
      data: {
        status: "VERIFIED",
        discordUserId: interaction.user.id,
        discordUsername: interaction.user.tag,
        verifiedAt: new Date(),
      }
    });

    await tx.user.update({
      where: { id: verification.userId },
      data: {
        discordId: interaction.user.id,
        discordUsername: interaction.user.tag,
        discordAvatar: interaction.user.avatar ? interaction.user.displayAvatarURL() : null,
        discordVerified: true,
        discordVerifiedAt: new Date(),
        verificationCode: null,
        verificationCodeExpires: null,
      }
    });
  });

  if (settings.logChannelId && discordClient) {
    const logChannel = discordClient.channels.cache.get(settings.logChannelId) as TextChannel;
    if (logChannel) {
      const logEmbed = new EmbedBuilder()
        .setTitle("New Discord Verification")
        .setColor(0x3B82F6)
        .addFields(
          { name: "User", value: `<@${interaction.user.id}> (${interaction.user.tag})`, inline: true },
          { name: "Panel User", value: verification.user.email, inline: true },
          { name: "Code", value: `\`${upperCode}\``, inline: true }
        )
        .setTimestamp();
      await logChannel.send({ embeds: [logEmbed] });
    }
  }

  return {
    embeds: [
      new EmbedBuilder()
        .setTitle("Verification Successful")
        .setDescription("Your Discord account has been linked to your Minevo account!")
        .setColor(0x22C55E)
        .addFields(
          { name: "Discord", value: interaction.user.tag, inline: true },
          { name: "Status", value: "Verified", inline: true }
        )
        .setTimestamp()
    ]
  };
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

  discordClient.once(Events.ClientReady, async (client) => {
    isReady = true;
    console.log(`[Discord] Bot logged in as ${client.user.tag}`);

    try {
      const verifyCommand = new SlashCommandBuilder()
        .setName("verify")
        .setDescription("Verify your Minevo account")
        .addStringOption(option =>
          option.setName("code")
            .setDescription("Your verification code")
            .setRequired(true)
        );

      await client.application.commands.create(verifyCommand);
      console.log("[Discord] /verify slash command registered");
    } catch (error) {
      console.error("[Discord] Failed to register slash command:", error);
    }
  });

  discordClient.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    if (interaction.commandName !== "verify") return;

    const code = interaction.options.getString("code") || "";

    if (settings.verificationChannelId && interaction.channelId !== settings.verificationChannelId) {
      const embed = new EmbedBuilder()
        .setDescription(`Please use the <#${settings.verificationChannelId}> channel to verify your account.`)
        .setColor(0xF59E0B);
      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    await interaction.deferReply();

    const reply = await handleVerify(code, interaction, settings);

    try {
      await interaction.editReply(reply);
    } catch (error) {
      console.error("[Discord] Failed to reply to interaction:", error);
    }

    if (settings.verificationChannelId && interaction.channelId === settings.verificationChannelId) {
      try {
        await interaction.deleteReply();
      } catch {}
    }
  });

  discordClient.on(Events.MessageCreate, async (message) => {
    if (message.author.bot) return;
    if (message.channel instanceof DMChannel) return;

    if (settings.verificationChannelId && message.channelId === settings.verificationChannelId) {
      try { await message.delete(); } catch {}
      const embed = new EmbedBuilder()
        .setDescription("Please use the `/verify` slash command to verify your account. Type `/verify` and enter your code.")
        .setColor(0x6366F1);
      try {
        const reply = await message.channel.send({ embeds: [embed] });
        setTimeout(() => { reply.delete().catch(() => {}); }, 5000);
      } catch {}
      return;
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
      .setTitle("Minevo Verification Code")
      .setDescription("Use this code to verify your Discord account on the panel.")
      .setColor(0x6366F1)
      .addFields(
        { name: "Verification Code", value: `\`${code}\``, inline: false },
        { name: "Instructions", value: `Use the slash command \`/verify code:${code}\` in the verification channel to complete verification.`, inline: false },
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
      .setTitle("Server Created - Invoice")
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
      .setFooter({ text: "Minevo Panel - Keep this for your records" })
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
      .setTitle("Server Renewal Reminder")
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
