// src/routes/fileUpload.js
import express from "express";
import multer from "multer";
import { uploadToR2WithHash, generateHash } from "../services/r2.js";
import path from "path";

const router = express.Router();

// Use memory storage (buffer in RAM)
const upload = multer({ storage: multer.memoryStorage() });

router.post("/upload", upload.array("files", 10), async (req, res) => {
  try {
    const uploadedFiles = [];

    for (const file of req.files) {
      const buffer = file.buffer;
      const mime = file.mimetype;
      const size = file.size;

      if (!buffer || !buffer.length) continue;

      // 🔥 Generate hash for dedupe
      const hash = generateHash(buffer);

      // 🔥 Use hash as unique key
      const r2Url = await uploadToR2WithHash(buffer, mime, hash);

      if (!r2Url) {
        console.error("R2 upload failed for:", file.originalname);
        continue;
      }

      uploadedFiles.push({
        name: file.originalname,
        type: mime,
        size,
        url: r2Url, // returned to UI
        storageUrl: r2Url, // stored in DB for emails
        hash, // IMPORTANT
      });
    }

    return res.json({
      success: true,
      files: uploadedFiles,
    });
  } catch (err) {
    console.error("UPLOAD ERROR:", err);
    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

export default router;

// import express from "express";
// import multer from "multer";
// import { uploadToR2 } from "../services/r2.js"; // <-- IMPORTANT
// import path from "path";

// const router = express.Router();

// // Use memory storage (files kept in RAM temporarily)
// const upload = multer({ storage: multer.memoryStorage() });

// // Upload endpoint (R2)
// router.post("/upload", upload.array("files", 10), async (req, res) => {
//   try {
//     const uploadedFiles = [];

//     for (const file of req.files) {
//       // Create safe unique filename
//       const safeName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, "_");
//       const key = `${Date.now()}-${Math.random()
//         .toString(36)
//         .slice(2, 8)}-${safeName}`;

//       // Upload to R2
//       const r2Url = await uploadToR2(key, file.buffer, file.mimetype);

//       if (!r2Url) {
//         console.error("R2 upload failed for:", file.originalname);
//         continue;
//       }

//       uploadedFiles.push({
//         name: file.originalname,
//         filename: safeName,
//         type: file.mimetype,
//         size: file.size,

//         // URL returned to UI (R2 public URL)
//         url: r2Url,

//         // For DB storage (sent emails)
//         storageUrl: r2Url,
//       });
//     }

//     return res.json({
//       success: true,
//       files: uploadedFiles,
//     });
//   } catch (err) {
//     console.error("UPLOAD ERROR:", err);
//     return res.status(500).json({
//       success: false,
//       error: err.message,
//     });
//   }
// });

// export default router;
