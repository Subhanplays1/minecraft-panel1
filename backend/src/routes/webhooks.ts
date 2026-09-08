import { Router, Request, Response } from "express";
import { authenticate, authorize } from "../middleware/auth";
import { prisma } from "../utils/prisma";
import crypto from "crypto";

const router = Router();

function param(req: Request, name: string): string {
  const val = req.params[name];
  return Array.isArray(val) ? val[0] : val;
}

router.use(authenticate);
router.use(authorize("ADMIN"));

router.get("/", async (_req: Request, res: Response) => {
  try {
    const webhooks = await prisma.webhook.findMany({
      orderBy: { createdAt: "desc" },
    });
    res.json(webhooks);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req: Request, res: Response) => {
  try {
    const { url, events, secret } = req.body;
    if (!url || !events) {
      res.status(400).json({ error: "url and events are required" });
      return;
    }
    const webhook = await prisma.webhook.create({
      data: {
        url,
        events: JSON.stringify(events),
        secret: secret || null,
      },
    });
    res.status(201).json(webhook);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/:id", async (req: Request, res: Response) => {
  try {
    const id = param(req, "id");
    const { url, events, secret, isEnabled } = req.body;
    const data: Record<string, any> = {};
    if (url !== undefined) data.url = url;
    if (events !== undefined) data.events = JSON.stringify(events);
    if (secret !== undefined) data.secret = secret;
    if (isEnabled !== undefined) data.isEnabled = isEnabled;

    const webhook = await prisma.webhook.update({
      where: { id },
      data,
    });
    res.json(webhook);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const id = param(req, "id");
    await prisma.webhook.delete({ where: { id } });
    res.json({ message: "Webhook deleted" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/:id/test", async (req: Request, res: Response) => {
  try {
    const id = param(req, "id");
    const webhook = await prisma.webhook.findUnique({ where: { id } });
    if (!webhook) {
      res.status(404).json({ error: "Webhook not found" });
      return;
    }

    const body = JSON.stringify({
      event: "test",
      data: { message: "Test webhook triggered" },
      timestamp: new Date().toISOString(),
    });

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (webhook.secret) {
      const sig = crypto
        .createHmac("sha256", webhook.secret)
        .update(body)
        .digest("hex");
      headers["X-Webhook-Signature"] = sig;
    }

    await fetch(webhook.url, {
      method: "POST",
      headers,
      body,
      signal: AbortSignal.timeout(10000),
    });

    res.json({ message: "Test webhook sent" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export async function triggerWebhooks(
  event: string,
  data: Record<string, any>
) {
  const webhooks = await prisma.webhook.findMany({
    where: { isEnabled: true },
  });
  for (const wh of webhooks) {
    const events = JSON.parse(wh.events);
    if (!events.includes(event)) continue;
    try {
      const body = JSON.stringify({
        event,
        data,
        timestamp: new Date().toISOString(),
      });
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (wh.secret) {
        const sig = crypto
          .createHmac("sha256", wh.secret)
          .update(body)
          .digest("hex");
        headers["X-Webhook-Signature"] = sig;
      }
      await fetch(wh.url, {
        method: "POST",
        headers,
        body,
        signal: AbortSignal.timeout(10000),
      });
    } catch (err: any) {
      console.error(`[Webhook] Failed to trigger ${wh.url}: ${err.message}`);
    }
  }
}

export default router;
