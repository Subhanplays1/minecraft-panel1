import multer from "multer";
import path from "path";
import { v4 as uuid } from "uuid";
import sharp from "sharp";
import fs from "fs/promises";
import { Request, Response, NextFunction } from "express";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";

const ALLOWED_IMAGE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/svg+xml",
];

const ALLOWED_FONT_TYPES = [
  "font/woff",
  "font/woff2",
  "font/ttf",
  "application/font-woff",
  "application/font-woff2",
  "application/x-font-ttf",
];

const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm"];

const storage = multer.diskStorage({
  destination: async (_req, file, cb) => {
    const subDir = getSubDir(file.fieldname);
    const dir = path.join(UPLOAD_DIR, subDir);
    await fs.mkdir(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuid()}${ext}`);
  },
});

function getSubDir(fieldname: string): string {
  if (fieldname.includes("logo") || fieldname.includes("Logo")) return "logos";
  if (fieldname.includes("favicon")) return "favicon";
  if (fieldname.includes("font")) return "fonts";
  if (fieldname.includes("video")) return "images";
  return "images";
}

const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allTypes = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_FONT_TYPES, ...ALLOWED_VIDEO_TYPES];

  if (allTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} is not allowed`));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || "10485760"), // 10MB
  },
});

export async function optimizeImage(filePath: string, options?: { width?: number; height?: number; quality?: number }) {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === ".svg") {
    return filePath;
  }

  if ([".png", ".jpg", ".jpeg", ".webp"].includes(ext)) {
    const outputPath = filePath.replace(ext, `-optimized${ext}`);
    await sharp(filePath)
      .resize(options?.width, options?.height, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: options?.quality || 80 })
      .toFile(outputPath);

    await fs.unlink(filePath);
    return outputPath;
  }

  return filePath;
}

export function serveUploads(req: Request, res: Response) {
  const filePath = req.params["0"];
  if (!filePath) {
    return res.status(400).json({ error: "No file path provided" });
  }

  const safePath = path.normalize(filePath).replace(/^(\.\.[\/\\])+/, "");
  const fullPath = path.join(UPLOAD_DIR, safePath);

  // Prevent path traversal
  if (!fullPath.startsWith(path.resolve(UPLOAD_DIR))) {
    return res.status(403).json({ error: "Access denied" });
  }

  return res.sendFile(fullPath);
}

export function handleUploadError(err: Error, _req: Request, res: Response, next: NextFunction) {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({ error: "File too large" });
    }
    return res.status(400).json({ error: err.message });
  }
  if (err.message.includes("File type")) {
    return res.status(400).json({ error: err.message });
  }
  next(err);
}
