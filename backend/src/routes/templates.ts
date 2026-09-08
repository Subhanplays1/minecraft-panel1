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
    icon: "pickaxe",
    tags: ["vanilla", "survival", "creative"],
  },
  {
    id: "paper-essential",
    name: "Paper + EssentialsX",
    description: "Paper with EssentialsX for commands and permissions",
    software: "paper",
    mcVersion: "latest",
    ram: 3072,
    icon: "zap",
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
    icon: "puzzle",
    tags: ["paper", "plugins", "modded"],
    plugins: ["EssentialsX", "WorldEdit", "LuckPerms", "Vault"],
  },
  {
    id: "fabric-modded",
    name: "Fabric Modded",
    description: "Fabric loader for lightweight modding",
    software: "fabric",
    mcVersion: "latest",
    ram: 4096,
    icon: "cog",
    tags: ["fabric", "mods", "modded"],
  },
  {
    id: "forge-modded",
    name: "Forge Modded",
    description: "Forge loader for heavy modpacks",
    software: "forge",
    mcVersion: "latest",
    ram: 6144,
    icon: "wrench",
    tags: ["forge", "mods", "modpack"],
  },
  {
    id: "purpur",
    name: "Purpur Server",
    description: "Purpur - fork of Paper with extra configuration",
    software: "purpur",
    mcVersion: "latest",
    ram: 3072,
    icon: "droplets",
    tags: ["purpur", "performance", "configurable"],
  },
  {
    id: "proxy-velocity",
    name: "Velocity Proxy",
    description: "Velocity proxy for network servers",
    software: "velocity",
    mcVersion: "latest",
    ram: 1024,
    icon: "network",
    tags: ["proxy", "velocity", "network"],
  },
  {
    id: "proxy-bungee",
    name: "BungeeCord Proxy",
    description: "BungeeCord proxy for network servers",
    software: "bungeecord",
    mcVersion: "latest",
    ram: 1024,
    icon: "network",
    tags: ["proxy", "bungeecord", "network"],
  },
];

const router = Router();

router.get("/api/templates", authenticate, (req: Request, res: Response) => {
  res.json(TEMPLATES);
});

router.get("/api/templates/:id", authenticate, (req: Request, res: Response) => {
  const template = TEMPLATES.find((t) => t.id === req.params.id);

  if (!template) {
    res.status(404).json({ error: "Template not found" });
    return;
  }

  res.json(template);
});

export default router;
