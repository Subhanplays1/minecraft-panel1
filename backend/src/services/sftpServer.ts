import { Server, utils } from "ssh2";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { prisma } from "../utils/prisma";

const SFTP_PORT = parseInt(process.env.SFTP_PORT || "2022");
let sftpServer: Server | null = null;

function getServerPath(serverId: string): string {
  return path.resolve(process.env.SERVERS_DIR || path.join(__dirname, "../../servers"), serverId);
}

function generateHostKey(): string {
  const keyPath = path.resolve(__dirname, "../../.sftp_host_key");
  if (fs.existsSync(keyPath)) {
    return fs.readFileSync(keyPath, "utf-8");
  }
  const keys = utils.generateKeyPairSync("ed25519");
  const pem = keys.private;
  fs.writeFileSync(keyPath, pem);
  console.log("Generated new SFTP host key");
  return pem;
}

function normalizePath(rootDir: string, filePath: string): string {
  const cleaned = filePath.replace(/^\/+/, "");
  const resolved = path.resolve(rootDir, cleaned);
  if (!resolved.startsWith(rootDir)) return rootDir;
  return resolved;
}

export function startSftpServer() {
  try {
    const hostKey = generateHostKey();

    sftpServer = new Server({
      hostKeys: [hostKey],
    });

    sftpServer.on("connection", (client: any) => {
      let authenticatedUserId: string | null = null;
      let authenticatedEmail: string = "";
      let chrootDir: string = "";

      client.on("authentication", (ctx: any) => {
        if (ctx.method === "password") {
          (async () => {
            try {
              const user = await prisma.user.findFirst({
                where: { email: ctx.username, banned: false },
              });
              if (!user || !user.password) {
                ctx.reject(["password"]);
                return;
              }
              const bcrypt = await import("bcryptjs");
              const valid = await bcrypt.compare(ctx.password, user.password);
              if (!valid) {
                ctx.reject(["password"]);
                return;
              }
              authenticatedUserId = user.id;
              authenticatedEmail = user.email;
              chrootDir = path.resolve(process.env.SERVERS_DIR || path.join(__dirname, "../../servers"));
              if (!fs.existsSync(chrootDir)) fs.mkdirSync(chrootDir, { recursive: true });
              ctx.accept();
            } catch {
              ctx.reject(["password"]);
            }
          })();
        } else {
          ctx.reject(["password"]);
        }
      });

      client.on("ready", () => {
        console.log(`SFTP client connected: ${authenticatedEmail}`);

        client.on("session", (accept: any) => {
          const session = accept();
          session.on("sftp", (accept: any) => {
            const rootDir = chrootDir;
            const sftpStream = accept();

            const openFiles = new Map<number, { fd: number; read: boolean; write: boolean; entries?: any[]; dirPath?: string }>();
            let nextHandle = 1;

            sftpStream.on("OPEN", (reqid: number, filePath: string, flags: any, _attrs: any) => {
              const realPath = normalizePath(rootDir, filePath);
              const flagsNum = typeof flags === "number" ? flags : 0;
              const isRead = (flagsNum & 4) !== 0 || flagsNum === 0;
              const isWrite = (flagsNum & 2) !== 0 || (flagsNum & 8) !== 0 || (flagsNum & 4) !== 0;
              const isCreate = (flagsNum & 16) !== 0 || (flagsNum & 64) !== 0;
              const isTruncate = (flagsNum & 512) !== 0;

              try {
                if (isCreate) {
                  if (!fs.existsSync(realPath)) {
                    fs.writeFileSync(realPath, "");
                  } else if (isTruncate) {
                    fs.writeFileSync(realPath, "");
                  }
                }
                const fd = fs.openSync(realPath, flagsNum);
                const handle = nextHandle++;
                openFiles.set(handle, { fd, read: isRead, write: isWrite });
                sftpStream.status(reqid, 0);
                sftpStream.handle(reqid, handle);
              } catch {
                sftpStream.status(reqid, 2);
              }
            });

            sftpStream.on("READ", (reqid: number, handle: any, offset: number, length: number) => {
              const file = openFiles.get(typeof handle === "number" ? handle : parseInt(String(handle)));
              if (!file) { sftpStream.status(reqid, 2); return; }
              try {
                const buf = Buffer.alloc(length);
                const bytesRead = fs.readSync(file.fd, buf, 0, length, offset);
                if (bytesRead === 0) {
                  sftpStream.status(reqid, 1);
                } else {
                  sftpStream.data(reqid, bytesRead === length ? buf : buf.subarray(0, bytesRead));
                }
              } catch {
                sftpStream.status(reqid, 2);
              }
            });

            sftpStream.on("WRITE", (reqid: number, handle: any, offset: number, data: Buffer) => {
              const file = openFiles.get(typeof handle === "number" ? handle : parseInt(String(handle)));
              if (!file) { sftpStream.status(reqid, 2); return; }
              try {
                fs.writeSync(file.fd, data, 0, data.length, offset);
                sftpStream.status(reqid, 0);
              } catch {
                sftpStream.status(reqid, 2);
              }
            });

            sftpStream.on("CLOSE", (reqid: number, handle: any) => {
              const numHandle = typeof handle === "number" ? handle : parseInt(String(handle));
              const file = openFiles.get(numHandle);
              if (file) {
                try { fs.closeSync(file.fd); } catch {}
                openFiles.delete(numHandle);
              }
              sftpStream.status(reqid, 0);
            });

            sftpStream.on("OPENDIR", (reqid: number, dirPath: string) => {
              const realPath = normalizePath(rootDir, dirPath);
              try {
                const entries = fs.readdirSync(realPath, { withFileTypes: true });
                const handle = nextHandle++;
                openFiles.set(handle, { fd: -1, read: false, write: false, entries: entries as any, dirPath: realPath });
                sftpStream.status(reqid, 0);
                sftpStream.handle(reqid, handle);
              } catch {
                sftpStream.status(reqid, 2);
              }
            });

            sftpStream.on("READDIR", (reqid: number, handle: any) => {
              const numHandle = typeof handle === "number" ? handle : parseInt(String(handle));
              const file = openFiles.get(numHandle);
              if (!file || !file.entries) { sftpStream.status(reqid, 1); return; }
              const entries = file.entries;
              file.entries = [];

              const attrs = entries.map((entry: any) => {
                const fullPath = path.join(file.dirPath || rootDir, entry.name);
                try {
                  const stat = fs.statSync(fullPath);
                  return {
                    filename: entry.name,
                    longname: `${entry.isDirectory() ? "d" : "-"}rwxrwxrwx 1 root root ${stat.size} ${stat.mtime?.toISOString().slice(0, 10) || "Jan 01 00:00"} ${entry.name}`,
                    attrs: {
                      mode: entry.isDirectory() ? 16877 : 33206,
                      size: stat.size,
                      uid: 0,
                      gid: 0,
                      atime: Math.floor(Date.now() / 1000),
                      mtime: Math.floor((stat.mtime?.getTime() || Date.now()) / 1000),
                    },
                  };
                } catch {
                  return {
                    filename: entry.name,
                    longname: `${entry.isDirectory() ? "d" : "-"}rwxrwxrwx 1 root root 0 Jan 01 00:00 ${entry.name}`,
                    attrs: { mode: entry.isDirectory() ? 16877 : 33206, size: 0, uid: 0, gid: 0, atime: 0, mtime: 0 },
                  };
                }
              });

              if (attrs.length === 0) {
                sftpStream.status(reqid, 1);
              } else {
                sftpStream.name(reqid, attrs);
              }
            });

            sftpStream.on("LSTAT", (reqid: number, filePath: string, _attrs: any) => {
              const realPath = normalizePath(rootDir, filePath);
              try {
                const stat = fs.lstatSync(realPath);
                sftpStream.attrs(reqid, {
                  mode: stat.isDirectory() ? 16877 : 33206,
                  size: stat.size,
                  uid: 0, gid: 0,
                  atime: Math.floor(Date.now() / 1000),
                  mtime: Math.floor((stat.mtime?.getTime() || Date.now()) / 1000),
                });
              } catch {
                sftpStream.status(reqid, 2);
              }
            });

            sftpStream.on("STAT", (reqid: number, filePath: string, _attrs: any) => {
              const realPath = normalizePath(rootDir, filePath);
              try {
                const stat = fs.statSync(realPath);
                sftpStream.attrs(reqid, {
                  mode: stat.isDirectory() ? 16877 : 33206,
                  size: stat.size,
                  uid: 0, gid: 0,
                  atime: Math.floor(Date.now() / 1000),
                  mtime: Math.floor((stat.mtime?.getTime() || Date.now()) / 1000),
                });
              } catch {
                sftpStream.status(reqid, 2);
              }
            });

            sftpStream.on("MKDIR", (reqid: number, dirPath: string, _attrs: any) => {
              const realPath = normalizePath(rootDir, dirPath);
              try {
                if (!fs.existsSync(realPath)) fs.mkdirSync(realPath, { recursive: true });
                sftpStream.status(reqid, 0);
              } catch {
                sftpStream.status(reqid, 2);
              }
            });

            sftpStream.on("RMDIR", (reqid: number, dirPath: string) => {
              const realPath = normalizePath(rootDir, dirPath);
              try {
                if (fs.existsSync(realPath)) fs.rmSync(realPath, { recursive: true, force: true });
                sftpStream.status(reqid, 0);
              } catch {
                sftpStream.status(reqid, 2);
              }
            });

            sftpStream.on("REMOVE", (reqid: number, filePath: string) => {
              const realPath = normalizePath(rootDir, filePath);
              try {
                if (fs.existsSync(realPath)) fs.unlinkSync(realPath);
                sftpStream.status(reqid, 0);
              } catch {
                sftpStream.status(reqid, 2);
              }
            });

            sftpStream.on("RENAME", (reqid: number, oldPath: string, newPath: string) => {
              const realOld = normalizePath(rootDir, oldPath);
              const realNew = normalizePath(rootDir, newPath);
              try {
                fs.renameSync(realOld, realNew);
                sftpStream.status(reqid, 0);
              } catch {
                sftpStream.status(reqid, 2);
              }
            });

            sftpStream.on("SETSTAT", (reqid: number, filePath: string, attrs: any) => {
              const realPath = normalizePath(rootDir, filePath);
              try {
                if (attrs.size !== undefined) {
                  fs.truncateSync(realPath, attrs.size);
                }
                sftpStream.status(reqid, 0);
              } catch {
                sftpStream.status(reqid, 2);
              }
            });

            sftpStream.on("REALPATH", (reqid: number, filePath: string) => {
              const realPath = normalizePath(rootDir, filePath);
              const displayPath = realPath.replace(rootDir, "") || "/";
              sftpStream.name(reqid, [{ filename: displayPath, longname: displayPath, attrs: {} }]);
            });
          });
        });

        client.on("close", () => {
          console.log(`SFTP client disconnected: ${authenticatedEmail}`);
        });
      });

      client.on("error", (err: Error) => {
        console.error("SFTP client error:", err.message);
      });
    });

    sftpServer.listen(SFTP_PORT, "0.0.0.0", () => {
      console.log(`SFTP server listening on port ${SFTP_PORT}`);
    });

    sftpServer.on("error", (err: any) => {
      if (err.code === "EADDRINUSE") {
        console.warn(`SFTP port ${SFTP_PORT} in use, trying ${SFTP_PORT + 1}`);
        sftpServer!.listen(SFTP_PORT + 1, "0.0.0.0", () => {
          console.log(`SFTP server listening on port ${SFTP_PORT + 1}`);
        });
      } else {
        console.error("SFTP server error:", err);
      }
    });
  } catch (err) {
    console.error("Failed to start SFTP server:", err);
  }
}

export function getSftpPort(): number {
  return SFTP_PORT;
}

export function stopSftpServer() {
  if (sftpServer) {
    sftpServer.close();
    sftpServer = null;
    console.log("SFTP server stopped");
  }
}
