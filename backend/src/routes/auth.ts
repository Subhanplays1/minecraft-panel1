import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import * as OTPAuth from "otpauth";
import crypto from "crypto";
import { prisma } from "../utils/prisma";
import { authenticate, generateToken } from "../middleware/auth";
import { validate, loginSchema, registerSchema } from "../middleware/validation";
import nodemailer from "nodemailer";

const router = Router();

// POST /api/auth/login
router.post("/login", validate(loginSchema), async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.password) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    if (user.banned) {
      return res.status(403).json({ error: "Account is banned", reason: user.banReason });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Check if 2FA is enabled
    if (user.twoFactorEnabled && user.totpSecret) {
      const tempToken = jwt.sign(
        { userId: user.id, email: user.email, role: user.role, temp: true },
        process.env.JWT_SECRET || "dev-secret",
        { expiresIn: "5m" }
      );
      return res.json({ requires2FA: true, tempToken });
    }

    // Update login info
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date(), loginCount: { increment: 1 } },
    });

    const token = generateToken(user);

    // Create session
    await prisma.session.create({
      data: {
        userId: user.id,
        token,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/auth/login/2fa
router.post("/login/2fa", async (req: Request, res: Response) => {
  try {
    const { tempToken, code } = req.body;
    if (!tempToken || !code) {
      return res.status(400).json({ error: "TempToken and code are required" });
    }

    let decoded;
    try {
      decoded = jwt.verify(tempToken, process.env.JWT_SECRET || "dev-secret") as {
        userId: string;
        email: string;
        role: string;
        temp: boolean;
      };
    } catch {
      return res.status(401).json({ error: "Invalid or expired temp token" });
    }

    if (!decoded.temp) {
      return res.status(400).json({ error: "Invalid token type" });
    }

    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user || !user.totpSecret || !user.twoFactorEnabled) {
      return res.status(400).json({ error: "2FA is not configured" });
    }

    const totp = new OTPAuth.TOTP({
      issuer: "MineVo",
      label: user.email,
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(user.totpSecret),
    });

    const delta = totp.validate({ token: code, window: 1 });
    if (delta === null) {
      return res.status(400).json({ error: "Invalid code" });
    }

    // Update login info
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date(), loginCount: { increment: 1 } },
    });

    const token = generateToken(user);

    await prisma.session.create({
      data: {
        userId: user.id,
        token,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    console.error("2FA login error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/auth/register
router.post("/register", validate(registerSchema), async (req: Request, res: Response) => {
  try {
    const { email, password, name, firstName, lastName } = req.body;

    // Check if registration is enabled
    const authBranding = await prisma.authBranding.findUnique({
      where: { tenantId: "default" },
    });
    if (authBranding && !authBranding.registerEnabled) {
      return res.status(403).json({ error: "Registration is disabled" });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        firstName,
        lastName,
      },
    });

    const token = generateToken(user);

    return res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Register error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/auth/me
router.get("/me", authenticate, async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: {
        id: true,
        email: true,
        name: true,
        firstName: true,
        lastName: true,
        role: true,
        avatar: true,
        emailVerified: true,
        createdAt: true,
        discordId: true,
        discordUsername: true,
        discordDisplayName: true,
        discordAvatar: true,
        discordVerified: true,
        discordVerifiedAt: true,
        googleId: true,
        googleAvatar: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.json({ user });
  } catch (error) {
    console.error("Get user error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/auth/logout
router.post("/logout", authenticate, async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader) {
      const token = authHeader.split(" ")[1];
      await prisma.session.deleteMany({ where: { token } });
    }
    return res.json({ message: "Logged out" });
  } catch (error) {
    console.error("Logout error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /api/auth/profile
router.put("/profile", authenticate, async (req: Request, res: Response) => {
  try {
    const { name, email } = req.body;
    const userId = req.user!.userId;

    if (email) {
      const existing = await prisma.user.findFirst({ where: { email, NOT: { id: userId } } });
      if (existing) return res.status(409).json({ error: "Email already in use" });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { ...(name && { name }), ...(email && { email }) },
      select: { id: true, email: true, name: true, role: true, avatar: true },
    });
    return res.json({ user });
  } catch (error) {
    console.error("Update profile error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /api/auth/password
router.put("/password", authenticate, async (req: Request, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user!.userId;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "Current and new password required" });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters" });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.password) {
      return res.status(400).json({ error: "No password set" });
    }

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) {
      return res.status(401).json({ error: "Current password is incorrect" });
    }

    const hashed = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: userId }, data: { password: hashed } });
    return res.json({ message: "Password updated" });
  } catch (error) {
    console.error("Update password error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ============================================================
// EMAIL VERIFICATION
// ============================================================

async function sendVerificationEmail(email: string, token: string) {
  const smtpHost = await prisma.setting.findFirst({ where: { group: "smtp", key: "host" } });
  const smtpPort = await prisma.setting.findFirst({ where: { group: "smtp", key: "port" } });
  const smtpUser = await prisma.setting.findFirst({ where: { group: "smtp", key: "user" } });
  const smtpPass = await prisma.setting.findFirst({ where: { group: "smtp", key: "pass" } });
  const smtpFrom = await prisma.setting.findFirst({ where: { group: "smtp", key: "from" } });
  const panelUrl = await prisma.setting.findFirst({ where: { group: "branding", key: "siteUrl" } });

  if (!smtpHost?.value || !smtpUser?.value || !smtpPass?.value) {
    console.log(`[Email] Verification token for ${email}: ${token}`);
    return;
  }

  const transporter = nodemailer.createTransport({
    host: smtpHost.value,
    port: parseInt(smtpPort?.value || "587"),
    secure: parseInt(smtpPort?.value || "587") === 465,
    auth: { user: smtpUser.value, pass: smtpPass.value },
  });

  const url = panelUrl?.value || "http://localhost:3000";

  await transporter.sendMail({
    from: smtpFrom?.value || smtpUser.value,
    to: email,
    subject: "Verify your email - Minevo",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
        <h2 style="color: #111;">Verify your email</h2>
        <p style="color: #666; font-size: 14px;">Click the link below to verify your email address:</p>
        <a href="${url}/verify-email?token=${token}" style="display: inline-block; padding: 12px 24px; background: #111; color: #fff; text-decoration: none; border-radius: 8px; font-size: 14px; margin: 16px 0;">Verify Email</a>
        <p style="color: #999; font-size: 12px;">Or copy this link: ${url}/verify-email?token=${token}</p>
        <p style="color: #999; font-size: 12px;">This link expires in 24 hours.</p>
      </div>
    `,
  });
}

// POST /api/auth/verify-email/send
router.post("/verify-email/send", authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: "User not found" });
    if (user.emailVerified) return res.status(400).json({ error: "Email already verified" });

    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.user.update({
      where: { id: userId },
      data: { verificationCode: token, verificationCodeExpires: expires },
    });

    await sendVerificationEmail(user.email, token);
    return res.json({ message: "Verification email sent" });
  } catch (error) {
    console.error("Send verification error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/auth/verify-email
router.post("/verify-email", async (req: Request, res: Response) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: "Token required" });

    const user = await prisma.user.findFirst({
      where: { verificationCode: token, verificationCodeExpires: { gt: new Date() } },
    });
    if (!user) return res.status(400).json({ error: "Invalid or expired token" });

    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: true, verificationCode: null, verificationCodeExpires: null },
    });

    return res.json({ message: "Email verified" });
  } catch (error) {
    console.error("Verify email error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ============================================================
// GOOGLE OAUTH
// ============================================================

// POST /api/auth/google
router.post("/google", async (req: Request, res: Response) => {
  try {
    const { idToken, email, name, avatar, googleId } = req.body;
    if (!email || !googleId) return res.status(400).json({ error: "Invalid Google auth data" });

    let user = await prisma.user.findFirst({
      where: { OR: [{ googleId }, { email }] },
    });

    if (user) {
      // Update Google fields
      if (!user.googleId) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { googleId, googleAvatar: avatar, emailVerified: true },
        });
      }
    } else {
      // Create new user
      user = await prisma.user.create({
        data: {
          email,
          name: name || email.split("@")[0],
          avatar: avatar || null,
          googleId,
          googleAvatar: avatar,
          emailVerified: true,
          password: null,
        },
      });
    }

    if (user.banned) return res.status(403).json({ error: "Account is banned" });

    const token = generateToken(user);

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date(), loginCount: { increment: 1 } },
    });

    return res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role, avatar: user.avatar },
    });
  } catch (error) {
    console.error("Google auth error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
