// src/services/storage.js
import multer from "multer";
import path from "path";
import fs from "fs";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: function (_req, _file, cb) {
    cb(null, UPLOAD_DIR);
  },
  filename: function (_req, file, cb) {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${unique}${ext}`);
  }
});

export const upload = multer({ storage });

export function toAttachmentRecord(file) {
  return {
    filename: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
    storageUrl: `/uploads/${path.basename(file.path)}`
  };
}
