import https from "https";
import http from "http";
import fs from "fs";

function fetchJson(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith("https") ? https : http;
    const req = mod.get(url, { headers: { "User-Agent": "MinecraftPanel/1.0" } }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return fetchJson(res.headers.location!).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      let data = "";
      res.on("data", (chunk: Buffer) => (data += chunk.toString()));
      res.on("end", () => {
        try { resolve(JSON.parse(data)); } catch { reject(new Error(`Invalid JSON from ${url}`)); }
      });
    });
    req.on("error", reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error(`Timeout fetching ${url}`)); });
  });
}

function downloadFile(url: string, dest: string, retries = 3): Promise<void> {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith("https") ? https : http;
    const doDownload = (dlUrl: string, redirects = 0, attempt = 0) => {
      if (redirects > 5) return reject(new Error("Too many redirects"));
      const req = mod.get(dlUrl, { headers: { "User-Agent": "MinecraftPanel/1.0" } }, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          return doDownload(res.headers.location!, redirects + 1, attempt);
        }
        if (res.statusCode !== 200) {
          return reject(new Error(`HTTP ${res.statusCode} downloading ${dlUrl}`));
        }
        const file = fs.createWriteStream(dest);
        res.pipe(file);
        file.on("finish", () => { file.close(); resolve(); });
        file.on("error", (err) => { try { fs.unlinkSync(dest); } catch {} reject(err); });
      });
      req.on("error", (err) => {
        if (attempt < retries - 1) {
          console.log(`[JarDownloader] Download attempt ${attempt + 1} failed, retrying...`);
          return doDownload(dlUrl, 0, attempt + 1);
        }
        reject(err);
      });
      req.setTimeout(120000, () => { req.destroy(); reject(new Error("Download timeout")); });
    };
    doDownload(url);
  });
}

// ============================================================
// Paper / Spigot / Bukkit — Fill v3 API
// ============================================================
async function getPaperJar(version: string): Promise<{ url: string; filename: string }> {
  if (version === "latest") {
    const data = await fetchJson("https://fill.papermc.io/v3/projects/paper");
    const groups: Record<string, string[]> = data.versions || {};
    const allVersions = Object.values(groups).flat()
      .filter((v) => !v.includes("-rc") && !v.includes("-pre") && !v.includes("-alpha") && !v.includes("-beta") && !v.includes("-snapshot"))
      .sort();
    version = allVersions[allVersions.length - 1] || "1.21.4";
    console.log(`[JarDownloader] Paper latest resolved to ${version}`);
  }

  const buildsData = await fetchJson(`https://fill.papermc.io/v3/projects/paper/versions/${version}/builds`);
  // v3 builds are an array, pick latest STABLE or latest overall
  const builds = Array.isArray(buildsData) ? buildsData : (buildsData.builds || []);
  const stable = builds.filter((b: any) => b.channel === "STABLE");
  const latest = stable.length > 0 ? stable[stable.length - 1] : builds[builds.length - 1];

  if (!latest) throw new Error(`No builds for Paper ${version}`);

  // v3: download URL is embedded in the response
  const download = latest.downloads?.["server:default"] || latest.downloads?.application;
  if (download?.url) {
    return { url: download.url, filename: download.name || `paper-${version}.jar` };
  }

  // Fallback: construct URL
  return {
    url: `https://fill.papermc.io/v3/projects/paper/versions/${version}/builds/${latest.id || latest.build}/download`,
    filename: `paper-${version}-${latest.id || latest.build}.jar`,
  };
}

// ============================================================
// Purpur — PurpurMC API
// ============================================================
async function getPurpurJar(version: string): Promise<{ url: string; filename: string }> {
  if (version === "latest") {
    const data = await fetchJson("https://api.purpurmc.org/v2/purpur");
    const versions: string[] = data.versions || [];
    version = versions[versions.length - 1];
  }
  const resp = await fetchJson(`https://api.purpurmc.org/v2/purpur/${version}/latest`);
  const builds = resp.builds || {};
  const latest = builds.latest || Object.keys(builds)[Object.keys(builds).length - 1];
  return {
    url: `https://api.purpurmc.org/v2/purpur/${version}/${latest}/download`,
    filename: `purpur-${version}-${latest}.jar`,
  };
}

// ============================================================
// Velocity — Fill v3 API
// ============================================================
async function getVelocityJar(version: string): Promise<{ url: string; filename: string }> {
  if (version === "latest") {
    const data = await fetchJson("https://fill.papermc.io/v3/projects/velocity");
    const groups: Record<string, string[]> = data.versions || {};
    const allVersions = Object.values(groups).flat()
      .filter((v) => !v.includes("-rc") && !v.includes("-pre") && !v.includes("-alpha") && !v.includes("-beta") && !v.includes("-snapshot"))
      .sort();
    version = allVersions[allVersions.length - 1] || "3.3.0";
  }

  const buildsData = await fetchJson(`https://fill.papermc.io/v3/projects/velocity/versions/${version}/builds`);
  const builds = Array.isArray(buildsData) ? buildsData : (buildsData.builds || []);
  const stable = builds.filter((b: any) => b.channel === "STABLE" || b.channel === "RECOMMENDED");
  const latest = stable.length > 0 ? stable[stable.length - 1] : builds[builds.length - 1];

  if (!latest) throw new Error(`No builds for Velocity ${version}`);

  const download = latest.downloads?.["server:default"] || latest.downloads?.application;
  if (download?.url) {
    return { url: download.url, filename: download.name || `velocity-${version}.jar` };
  }

  return {
    url: `https://fill.papermc.io/v3/projects/velocity/versions/${version}/builds/${latest.id || latest.build}/download`,
    filename: `velocity-${version}-${latest.id || latest.build}.jar`,
  };
}

// ============================================================
// Waterfall / BungeeCord — Fill v3 API
// ============================================================
async function getBungeeCordJar(): Promise<{ url: string; filename: string }> {
  const data = await fetchJson("https://fill.papermc.io/v3/projects/waterfall");
  const groups: Record<string, string[]> = data.versions || {};
  const allVersions = Object.values(groups).flat()
    .filter((v) => !v.includes("-rc") && !v.includes("-pre") && !v.includes("-alpha") && !v.includes("-beta") && !v.includes("-snapshot"))
    .sort();
  const version = allVersions[allVersions.length - 1] || "1.21";

  const buildsData = await fetchJson(`https://fill.papermc.io/v3/projects/waterfall/versions/${version}/builds`);
  const builds = Array.isArray(buildsData) ? buildsData : (buildsData.builds || []);
  const stable = builds.filter((b: any) => b.channel === "STABLE");
  const latest = stable.length > 0 ? stable[stable.length - 1] : builds[builds.length - 1];

  const download = latest?.downloads?.["server:default"] || latest?.downloads?.application;
  if (download?.url) {
    return { url: download.url, filename: download.name || "waterfall.jar" };
  }

  return {
    url: `https://fill.papermc.io/v3/projects/waterfall/versions/${version}/builds/${latest?.id || latest?.build}/download`,
    filename: `waterfall-${version}.jar`,
  };
}

// ============================================================
// Fabric — FabricMeta API
// ============================================================
async function getFabricJar(version: string): Promise<{ url: string; filename: string }> {
  if (version === "latest") {
    const data = await fetchJson("https://meta.fabricmc.net/v2/versions/game");
    const stable = data.filter((v: any) => v.stable);
    version = stable.length > 0 ? stable[0].version : data[0].version;
  }
  const loaders = await fetchJson("https://meta.fabricmc.net/v2/versions/loader");
  const loader = loaders[0];
  return {
    url: `https://meta.fabricmc.net/v2/versions/loader/${version}/${loader.version}/1.0.0/server/jar`,
    filename: `fabric-server-${version}.jar`,
  };
}

// ============================================================
// Forge — Minecraft Forge Maven
// ============================================================
async function getForgeJar(version: string): Promise<{ url: string; filename: string }> {
  if (version === "latest") {
    try {
      const data = await fetchJson("https://files.minecraftforge.net/net/minecraftforge/forge/promotions_slim.json");
      version = data.latest?.recommended || "1.21.4-21.4.0";
    } catch {
      version = "1.21.4-21.4.0";
    }
  }
  return {
    url: `https://maven.minecraftforge.net/net/minecraftforge/forge/${version}/forge-${version}-installer.jar`,
    filename: `forge-${version}-installer.jar`,
  };
}

export async function downloadJar(type: string, version: string, destPath: string): Promise<string> {
  const t = (type || "paper").toUpperCase();
  let source: { url: string; filename: string };

  console.log(`[JarDownloader] Resolving ${t} ${version}...`);

  switch (t) {
    case "PAPER":
    case "SPIGOT":
    case "BUKKIT":
      source = await getPaperJar(version);
      break;
    case "PURPUR":
      source = await getPurpurJar(version);
      break;
    case "VELOCITY":
      source = await getVelocityJar(version);
      break;
    case "FABRIC":
      source = await getFabricJar(version);
      break;
    case "FORGE":
    case "NEOFORGE":
    case "QUILT":
      source = await getForgeJar(version);
      break;
    case "BUNGEECORD":
    case "WATERFALL":
      source = await getBungeeCordJar();
      break;
    default:
      source = await getPaperJar(version);
  }

  console.log(`[JarDownloader] Downloading from ${source.url}`);
  await downloadFile(source.url, destPath);
  console.log(`[JarDownloader] Saved to ${destPath} (${fs.statSync(destPath).size} bytes)`);
  return source.filename;
}
