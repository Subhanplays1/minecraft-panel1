import { Router, Request, Response } from "express";
import { authenticate } from "../middleware/auth";

const TEMPLATES = [
  {
    id: "vanilla",
    name: "Vanilla Minecraft",
    description: "Stock Minecraft server from Mojang",
    software: "paper",
    mcVersion: "latest",
    ram: 2048,
    tags: ["vanilla", "survival", "creative"],
  },
  {
    id: "paper-essential",
    name: "Paper + EssentialsX",
    description: "Paper with EssentialsX for commands and permissions",
    software: "paper",
    mcVersion: "latest",
    ram: 3072,
    tags: ["paper", "essentials", "permissions"],
    plugins: ["EssentialsX"],
  },
  {
    id: "paper-plugins",
    name: "Paper Plugin Server",
    description: "Paper with popular plugins pre-configured",
    software: "paper",
    mcVersion: "latest",
    ram: 4096,
    tags: ["paper", "plugins"],
    plugins: ["EssentialsX", "WorldEdit", "LuckPerms", "Vault"],
  },
  {
    id: "purpur",
    name: "Purpur Server",
    description: "Purpur - fork of Paper with extra configuration",
    software: "purpur",
    mcVersion: "latest",
    ram: 3072,
    tags: ["purpur", "performance", "configurable"],
  },
  {
    id: "proxy-bungee",
    name: "BungeeCord Proxy",
    description: "BungeeCord proxy for network servers",
    software: "bungeecord",
    mcVersion: "latest",
    ram: 1024,
    tags: ["proxy", "bungeecord", "network"],
  },
];

const router = Router();

router.get("/templates", authenticate, (req: Request, res: Response) => {
  res.json(TEMPLATES);
});

router.get("/templates/:id", authenticate, (req: Request, res: Response) => {
  const template = TEMPLATES.find((t) => t.id === req.params.id);

  if (!template) {
    res.status(404).json({ error: "Template not found" });
    return;
  }

  res.json(template);
});

export default router;
