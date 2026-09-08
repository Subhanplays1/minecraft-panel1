import { Router, Request, Response } from "express";
import { authenticate, generateToken } from "../middleware/auth";
import { prisma } from "../utils/prisma";
import * as OTPAuth from "otpauth";
import QRCode from "qrcode";

const router = Router();

router.post("/setup", authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: "User not found" });

    const totp = new OTPAuth.TOTP({
      issuer: "MineVo",
      label: user.email,
      algorithm: "SHA1",
      digits: 6,
      period: 30,
    });

    // Generate a random secret
    totp.secret = new OTPAuth.Secret({ size: 20 });
    const secretBase32 = totp.secret.base32;
    await prisma.user.update({ where: { id: userId }, data: { totpSecret: secretBase32 } });

    const otpauthUrl = totp.toString();
    const qrCode = await QRCode.toDataURL(otpauthUrl);

    return res.json({ secret: secretBase32, qrCode, otpauthUrl });
  } catch (error) {
    console.error("2FA setup error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/verify", authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: "Code is required" });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.totpSecret) {
      return res.status(400).json({ error: "2FA not set up" });
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

    await prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: true },
    });

    return res.json({ success: true });
  } catch (error) {
    console.error("2FA verify error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/disable", authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: "Code is required to disable 2FA" });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.totpSecret) {
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

    await prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: false, totpSecret: null },
    });

    return res.json({ success: true });
  } catch (error) {
    console.error("2FA disable error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/status", authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorEnabled: true, totpSecret: true },
    });

    if (!user) return res.status(404).json({ error: "User not found" });

    return res.json({
      enabled: user.twoFactorEnabled,
      configured: !!user.totpSecret,
    });
  } catch (error) {
    console.error("2FA status error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
