import { spawn, ChildProcess } from "child_process";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { downloadJar } from "./jarDownloader";

const processes = new Map<string, ChildProcess>();
const serverStartedAt = new Map<string, string>();
const logStreams = new Map<string, fs.WriteStream>();

export function resolveJavaBinary(): string | null {
  const candidates = [
    "C:\\Program Files\\Eclipse Adoptium\\jdk-21.0.12.101-hotspot\\bin\\java.exe",
    "C:\\Program Files\\Eclipse Adoptium\\jdk-25.0.4.1-hotspot\\bin\\java.exe",
    "C:\\Program Files\\Java\\jdk-21\\bin\\java.exe",
    "C:\\Program Files\\Java\\jdk-17\\bin\\java.exe",
    "/usr/bin/java",
    "/usr/local/bin/java",
    "/usr/lib/jvm/java-25-openjdk-amd64/bin/java",
    "/usr/lib/jvm/java-21-openjdk-amd64/bin/java",
    "/usr/lib/jvm/java-17-openjdk-amd64/bin/java",
    "java",
  ];
  for (const cand of candidates) {
    try {
      if (cand === "java") {
        const output = execSync("java -version", { stdio: "pipe" }).toString() + execSync("java -version 2>&1", { stdio: "pipe" }).toString();
        if (output.includes("25.") || output.includes("24.") || output.includes("23.") || output.includes("22.") || output.includes("21.")) {
          return "java";
        }
      } else if (fs.existsSync(cand)) {
        return cand;
      }
    } catch {}
  }
  return null;
}

export async function createLocalServer(serverData: {
  id: string;
  name: string;
  software: string;
  mcVersion: string;
  ram: number;
  port: number;
}): Promise<string> {
  const serverDir = getServerPath(serverData.id);
  fs.mkdirSync(serverDir, { recursive: true });

  const type = (serverData.software || "paper").toUpperCase();
  const port = serverData.port || 25565;

  // Pre-seed files based on server type
  if (type === "VELOCITY") {
    const configPath = path.join(serverDir, "velocity.toml");
    if (!fs.existsSync(configPath)) {
      fs.writeFileSync(configPath, `bind = "0.0.0.0:${port}"\nmotd = "A Velocity Server"\nonline-mode = true\n`);
    }
  } else if (type === "BUNGEECORD" || type === "WATERFALL") {
    const configPath = path.join(serverDir, "config.yml");
    if (!fs.existsSync(configPath)) {
      fs.writeFileSync(configPath, `listeners:\n- query_port: ${port}\n  host: 0.0.0.0:${port}\n  max_players: 1000\n`);
    }
  } else {
    // Standard Minecraft server (Paper, Spigot, Purpur, Forge, Fabric, etc.)
    const eulaPath = path.join(serverDir, "eula.txt");
    fs.writeFileSync(eulaPath, "eula=true\n");

    const propsPath = path.join(serverDir, "server.properties");
    if (!fs.existsSync(propsPath)) {
      const props = [
        `server-port=${port}`,
        `max-players=20`,
        `gamemode=survival`,
        `difficulty=normal`,
        `online-mode=true`,
        `level-name=world`,
        `motd=Minecraft Server`,
      ].join("\n");
      fs.writeFileSync(propsPath, props);
    }
  }

  // Download JAR if missing or too small (< 500KB = incomplete)
  const jarPath = path.join(serverDir, "server.jar");
  let needDownload = false;
  if (!fs.existsSync(jarPath)) {
    needDownload = true;
  } else {
    const stat = fs.statSync(jarPath);
    if (stat.size < 500 * 1024) {
      needDownload = true;
    }
  }

  if (needDownload) {
    try {
      await downloadJar(type, serverData.mcVersion || "latest", jarPath);
    } catch (e: any) {
      console.warn(`[LocalServer] Deferred JAR download: ${e.message}`);
    }
  }

  return serverData.id;
}

export function startLocalServer(id: string, serverData: {
  name: string;
  software: string;
  mcVersion: string;
  ram: number;
  port: number;
  startupCmd?: string;
}): Promise<void> {
  const serverDir = getServerPath(id);
  fs.mkdirSync(serverDir, { recursive: true });
  const type = (serverData.software || "paper").toUpperCase();

  // Create log stream
  const logPath = path.join(serverDir, "panel.log");
  const logStream = fs.createWriteStream(logPath, { flags: "a" });
  logStreams.set(id, logStream);

  const emitLog = (msg: string) => {
    // Store for polling
    if (logStream.writable) logStream.write(msg);
  };

  const logMessage = (msg: string) => {
    const formatted = `[Panel] ${msg}\n`;
    emitLog(formatted);
  };

  let child: ChildProcess;

  // Custom startup command
  if (serverData.startupCmd && serverData.startupCmd.trim()) {
    const parts = serverData.startupCmd.trim().split(/\s+/);
    const bin = parts[0];
    const args = parts.slice(1);
    child = spawn(bin, args, { cwd: serverDir, stdio: ["pipe", "pipe", "pipe"] });
  } else if (type === "NODEJS" || type === "NODE") {
    let entry = "index.js";
    for (const f of ["index.js", "app.js", "server.js", "main.js"]) {
      if (fs.existsSync(path.join(serverDir, f))) { entry = f; break; }
    }
    child = spawn("node", [entry], {
      cwd: serverDir,
      env: { ...process.env, PORT: String(serverData.port || 3000), SERVER_PORT: String(serverData.port || 3000) },
      stdio: ["pipe", "pipe", "pipe"],
    });
  } else if (type === "PYTHON" || type === "PYTHON3") {
    let entry = "main.py";
    for (const f of ["main.py", "app.py", "bot.py", "server.py"]) {
      if (fs.existsSync(path.join(serverDir, f))) { entry = f; break; }
    }
    child = spawn("python3", ["-u", entry], {
      cwd: serverDir,
      env: { ...process.env, PORT: String(serverData.port || 8000), PYTHONUNBUFFERED: "1" },
      stdio: ["pipe", "pipe", "pipe"],
    });
  } else {
    // Minecraft server
    const jarPath = path.join(serverDir, "server.jar");
    let needDownload = false;
    if (!fs.existsSync(jarPath)) needDownload = true;
    else { const stat = fs.statSync(jarPath); if (stat.size < 500 * 1024) needDownload = true; }

    if (needDownload) {
      logMessage(`Server JAR missing. Downloading ${type}...`);
      try {
        downloadJar(type, serverData.mcVersion || "latest", jarPath).then(() => {
          logMessage("Server JAR downloaded.");
        });
      } catch (dlErr: any) {
        logMessage(`Failed to download JAR: ${dlErr.message}`);
      }
    }

    // Ensure EULA
    fs.writeFileSync(path.join(serverDir, "eula.txt"), "eula=true\n");

    const javaBin = resolveJavaBinary();
    if (!javaBin) {
      const errMsg = "Java not found. Install Java 21 or set JAVA_BIN environment variable.";
      logMessage(errMsg);
      throw new Error(errMsg);
    }

    const memory = serverData.ram || 2;
    child = spawn(javaBin, [
      `-Xms${Math.floor(memory / 1024)}G`,
      `-Xmx${Math.floor(memory / 1024)}G`,
      "-Djline.terminal=jline.UnsupportedTerminal",
      "-jar", "server.jar", "nogui", "--nojline",
    ], { cwd: serverDir, stdio: ["pipe", "pipe", "pipe"] });
  }

  processes.set(id, child);

  child.on("spawn", () => {
    serverStartedAt.set(id, new Date().toISOString());
    logMessage(`Server started with PID ${child.pid} (${serverData.name})`);
  });

  child.on("error", (err) => {
    serverStartedAt.delete(id);
    logMessage(`Failed to start: ${err.message}`);
    if (err.message.includes("ENOENT")) {
      logMessage("Java is not installed or not in PATH.");
    }
  });

  child.on("close", (code) => {
    logMessage(`Server exited with code ${code}`);
    processes.delete(id);
    serverStartedAt.delete(id);
  });

  child.stdout?.on("data", (data: Buffer) => {
    const text = data.toString();
    if (logStream.writable) logStream.write(text);
  });

  child.stderr?.on("data", (data: Buffer) => {
    const text = data.toString();
    if (logStream.writable) logStream.write(text);
  });

  // Wait for spawn to confirm
  return new Promise<void>((resolve, reject) => {
    let settled = false;
    const errorHandler = (err: Error) => {
      if (!settled) { settled = true; processes.delete(id); serverStartedAt.delete(id); reject(new Error(`Server failed to start: ${err.message}`)); }
    };
    const exitHandler = (code: number | null) => {
      if (!settled && code !== 0 && code !== null) { settled = true; processes.delete(id); serverStartedAt.delete(id); reject(new Error(`Server exited with code ${code}`)); }
    };
    child.once("error", errorHandler);
    child.once("close", exitHandler);
    setTimeout(() => {
      if (!settled) { settled = true; child.removeListener("error", errorHandler); child.removeListener("close", exitHandler); resolve(); }
    }, 500);
  });
}

export function stopLocalServer(id: string): boolean {
  serverStartedAt.delete(id);
  const child = processes.get(id);
  if (!child) return true;

  // Graceful stop via stdin
  if (child.stdin && child.stdin.writable) {
    try { child.stdin.write("stop\nend\nexit\n"); } catch {}
  }
  try { child.kill("SIGTERM"); } catch {}

  // Force kill after 4 seconds
  setTimeout(() => {
    if (processes.has(id)) {
      try { child.kill("SIGKILL"); } catch {}
      processes.delete(id);
    }
  }, 4000);

  processes.delete(id);
  return true;
}

export function killLocalServer(id: string): void {
  serverStartedAt.delete(id);
  const child = processes.get(id);
  if (child) {
    try { child.kill("SIGKILL"); } catch {}
    processes.delete(id);
  }
}

export function sendLocalCommand(id: string, command: string): void {
  const child = processes.get(id);
  if (child && child.stdin && child.stdin.writable) {
    child.stdin.write(command + "\n");
  }
}

export function isRunning(id: string): boolean {
  return processes.has(id);
}

export function getStartedAt(id: string): string | null {
  return serverStartedAt.get(id) || null;
}

export function getServerLogs(id: string): string[] {
  const logPath = path.join(getServerPath(id), "panel.log");
  if (fs.existsSync(logPath)) {
    const content = fs.readFileSync(logPath, "utf-8");
    return content.split("\n").filter((l) => l.trim()).slice(-200);
  }
  return [];
}

export function getServerPath(id: string): string {
  return path.resolve(process.env.SERVERS_DIR || path.join(__dirname, "../../servers"), id);
}
