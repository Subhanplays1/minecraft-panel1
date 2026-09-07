import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../utils/prisma";
import { authenticate, generateToken } from "../middleware/auth";
import { validate, loginSchema, registerSchema } from "../middleware/validation";

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

export default router;
