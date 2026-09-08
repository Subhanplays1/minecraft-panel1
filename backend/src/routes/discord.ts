import { Router, Request, Response } from "express";
import { prisma } from "../utils/prisma";
import { authenticate } from "../middleware/auth";
import { initializeDiscordBot, sendVerificationDM, sendServerInvoiceDM, getDiscordClient, isDiscordReady } from "../services/discordBot";
import crypto from "crypto";

const router = Router();

function generateVerificationCode(): string {
  return crypto.randomBytes(4).toString("hex").toUpperCase();
}

router.get("/settings", authenticate, async (req: Request, res: Response) => {
  try {
    const settings = await prisma.discordSettings.findUnique({
      where: { tenantId: "default" }
    });
    const isAdmin = req.user?.role === "ADMIN";
    res.json({
      isEnabled: settings?.isEnabled || false,
      clientId: settings?.clientId || "",
      clientSecret: isAdmin ? (settings?.clientSecret || "") : undefined,
      botToken: isAdmin ? (settings?.botToken || "") : undefined,
      guildId: settings?.guildId || "",
      verificationChannelId: settings?.verificationChannelId || "",
      logChannelId: settings?.logChannelId || "",
      inviteUrl: settings?.inviteUrl || "",
      botReady: isDiscordReady()
    });
  } catch (error) {
    console.error("[Discord] Settings error:", error);
    res.status(500).json({ error: "Failed to fetch Discord settings" });
  }
});

router.post("/settings", authenticate, async (req: Request, res: Response) => {
  if (req.user?.role !== "ADMIN" && req.user?.role !== "STAFF") {
    return res.status(403).json({ error: "Forbidden" });
  }

  try {
    const { botToken, clientId, clientSecret, guildId, isEnabled, verificationChannelId, logChannelId, inviteUrl } = req.body;

    const settings = await prisma.discordSettings.upsert({
      where: { tenantId: "default" },
      update: {
        botToken,
        clientId,
        clientSecret,
        guildId,
        isEnabled: isEnabled || false,
        verificationChannelId,
        logChannelId,
        inviteUrl,
      },
      create: {
        tenantId: "default",
        botToken,
        clientId,
        clientSecret,
        guildId,
        isEnabled: isEnabled || false,
        verificationChannelId,
        logChannelId,
        inviteUrl,
      }
    });

    if (isEnabled && botToken) {
      await initializeDiscordBot();
    }

    res.json({ success: true, settings });
  } catch (error) {
    console.error("[Discord] Settings save error:", error);
    res.status(500).json({ error: "Failed to save Discord settings" });
  }
});

router.get("/oauth/url", authenticate, async (req: Request, res: Response) => {
  try {
    const settings = await prisma.discordSettings.findUnique({
      where: { tenantId: "default" }
    });

    if (!settings?.clientId) {
      return res.status(400).json({ error: "Discord OAuth not configured" });
    }

    const state = crypto.randomBytes(16).toString("hex");
    const redirectUri = `${process.env.FRONTEND_URL || "http://localhost:3000"}/auth/discord/callback`;

    await prisma.oAuthAccount.upsert({
      where: {
        provider_providerUserId: {
          provider: "discord",
          providerUserId: `state_${req.user!.userId}`
        }
      },
      update: { accessToken: state },
      create: {
        userId: req.user!.userId,
        provider: "discord",
        providerUserId: `state_${req.user!.userId}`,
        accessToken: state,
      }
    });

    const scopes = ["identify", "email", "guilds.join"];
    const oauthUrl = `https://discord.com/api/oauth2/authorize?client_id=${settings.clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scopes.join("%20")}&state=${state}`;

    res.json({ url: oauthUrl });
  } catch (error) {
    console.error("[Discord] OAuth URL error:", error);
    res.status(500).json({ error: "Failed to generate OAuth URL" });
  }
});

router.post("/verify/generate", authenticate, async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId }
    });

    if (!user) return res.status(404).json({ error: "User not found" });

    if (user.discordVerified) {
      return res.json({ alreadyVerified: true });
    }

    const existingVerification = await prisma.discordVerification.findFirst({
      where: { userId: user.id, status: "PENDING" }
    });

    if (existingVerification && existingVerification.expiresAt > new Date()) {
      return res.json({ code: existingVerification.code, expiresAt: existingVerification.expiresAt });
    }

    const code = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    const existing = await prisma.discordVerification.findFirst({
      where: { userId: user.id }
    });

    if (existing) {
      await prisma.discordVerification.update({
        where: { id: existing.id },
        data: { code, expiresAt, status: "PENDING", discordUserId: null, discordUsername: null, verifiedAt: null }
      });
    } else {
      await prisma.discordVerification.create({
        data: { userId: user.id, code, expiresAt, status: "PENDING" }
      });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { verificationCode: code, verificationCodeExpires: expiresAt }
    });

    res.json({ code, expiresAt });
  } catch (error) {
    console.error("[Discord] Generate verification error:", error);
    res.status(500).json({ error: "Failed to generate verification code" });
  }
});

router.post("/verify/check", authenticate, async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId }
    });

    if (!user) return res.status(404).json({ error: "User not found" });

    const verification = await prisma.discordVerification.findFirst({
      where: { userId: user.id, status: "VERIFIED" }
    });

    if (verification) {
      return res.json({ verified: true, discordUsername: verification.discordUsername });
    }

    res.json({ verified: false });
  } catch (error) {
    console.error("[Discord] Check verification error:", error);
    res.status(500).json({ error: "Failed to check verification" });
  }
});

router.post("/verify/send-dm", authenticate, async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId }
    });

    if (!user || !user.discordId) {
      return res.status(400).json({ error: "Discord not linked" });
    }

    const verification = await prisma.discordVerification.findFirst({
      where: { userId: user.id, status: "PENDING" }
    });

    if (!verification) {
      return res.status(400).json({ error: "No pending verification" });
    }

    const panelUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const sent = await sendVerificationDM(user.discordId, verification.code, panelUrl);

    if (sent) {
      res.json({ success: true });
    } else {
      res.status(500).json({ error: "Failed to send DM. Make sure you have DMs enabled." });
    }
  } catch (error) {
    console.error("[Discord] Send DM error:", error);
    res.status(500).json({ error: "Failed to send verification DM" });
  }
});

router.get("/status", authenticate, async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: {
        discordId: true,
        discordUsername: true,
        discordAvatar: true,
        discordVerified: true,
        discordVerifiedAt: true,
        verificationCode: true,
        verificationCodeExpires: true,
      }
    });

    res.json({
      discord: user,
      botReady: isDiscordReady()
    });
  } catch (error) {
    console.error("[Discord] Status error:", error);
    res.status(500).json({ error: "Failed to get Discord status" });
  }
});

export async function handleDiscordCallback(code: string, state: string): Promise<{ userId: string; discordData: any } | null> {
  try {
    const settings = await prisma.discordSettings.findUnique({
      where: { tenantId: "default" }
    });

    if (!settings?.clientId || !settings?.clientSecret) {
      throw new Error("Discord OAuth not configured");
    }

    const redirectUri = `${process.env.FRONTEND_URL || "http://localhost:3000"}/auth/discord/callback`;

    const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: settings.clientId,
        client_secret: settings.clientSecret,
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) throw new Error("Failed to exchange code");

    const tokens = await tokenResponse.json() as { access_token: string; token_type: string; refresh_token: string; expires_in: number };

    const userResponse = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    if (!userResponse.ok) throw new Error("Failed to fetch Discord user");

    const discordUser = await userResponse.json() as { id: string; email: string; username: string; global_name?: string; avatar?: string };

    const oauthAccount = await prisma.oAuthAccount.findFirst({
      where: { provider: "discord", providerUserId: `state_${discordUser.id}` },
    });

    let userId: string;
    if (oauthAccount) {
      userId = oauthAccount.userId;
    } else {
      let user = await prisma.user.findUnique({ where: { email: discordUser.email } });
      if (!user) {
        user = await prisma.user.create({
          data: {
            email: discordUser.email,
            name: discordUser.global_name || discordUser.username,
            password: "",
            role: "CUSTOMER",
            emailVerified: true,
            discordId: discordUser.id,
            discordUsername: discordUser.username,
            discordAvatar: discordUser.avatar ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png` : null,
            discordVerified: true,
            discordVerifiedAt: new Date(),
          }
        });
      } else {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            discordId: discordUser.id,
            discordUsername: discordUser.username,
            discordAvatar: discordUser.avatar ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png` : null,
            discordVerified: true,
            discordVerifiedAt: new Date(),
          }
        });
      }
      userId = user.id;
    }

    await prisma.oAuthAccount.upsert({
      where: { provider_providerUserId: { provider: "discord", providerUserId: discordUser.id } },
      update: { accessToken: tokens.access_token, refreshToken: tokens.refresh_token, expiresAt: new Date(Date.now() + tokens.expires_in * 1000) },
      create: { userId, provider: "discord", providerUserId: discordUser.id, accessToken: tokens.access_token, refreshToken: tokens.refresh_token, expiresAt: new Date(Date.now() + tokens.expires_in * 1000) },
    });

    if (settings.guildId && tokens.access_token) {
      await fetch(`https://discord.com/api/guilds/${settings.guildId}/members/${discordUser.id}`, {
        method: "PUT",
        headers: { Authorization: `Bot ${settings.botToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ access_token: tokens.access_token }),
      }).catch(() => {});
    }

    return { userId, discordData: discordUser };
  } catch (error) {
    console.error("[Discord] Callback error:", error);
    return null;
  }
}

export { router as discordRouter, initializeDiscordBot };