// src/services/cleanupAccount.js
import prisma from "../prismaClient.js";
import { deleteFromR2 } from "./r2.js";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { URL } from "url";

dotenv.config();

const UPLOAD_DIR = path.join(process.cwd(), "uploads");

function getKeyFromUrl(storageUrl) {
  try {
    if (!storageUrl || !storageUrl.startsWith("http")) return null;
    const parsed = new URL(storageUrl);
    return parsed.pathname.substring(1);
  } catch (err) {
    return null;
  }
}

/**
 * ---------------------------------------------------------
 * CLEANUP LOGIC FIXED:
 * ---------------------------------------------------------
 * ✔ Deletes R2 files safely (no crash)
 * ✔ Deletes local uploads
 * ✔ DOES NOT delete DB rows here (your delete-route handles DB)
 * ✔ Prevents duplicate deletion & FK issues
 * ✔ Always returns success (unless hard failure)
 * ---------------------------------------------------------
 */
export async function cleanupEmailAccount(emailAccountId) {
  try {
    const id = Number(emailAccountId);
    console.log("🧹 Starting cleanupEmailAccount for account:", id);

    // Get all attachment storage info ONLY — no messages deletion here
    const messages = await prisma.emailMessage.findMany({
      where: { emailAccountId: id },
      select: {
        attachments: {
          select: { hash: true, storageUrl: true },
        },
      },
    });

    const r2Keys = new Set();
    const localFiles = new Set();

    for (const msg of messages) {
      for (const att of msg.attachments) {
        const hash = att.hash;
        const url = att.storageUrl || "";

        // Strategy 1: hash/dedup keys
        if (hash) {
          r2Keys.add(`dedup/${hash}`);
          r2Keys.add(hash);
        }

        // Strategy 2: extract key from full R2 URL
        const extracted = getKeyFromUrl(url);
        if (extracted) r2Keys.add(extracted);

        // Strategy 3: local uploads
        if (url.startsWith("/uploads")) {
          const filename = url.replace(/^\/?uploads\//, "");
          if (filename) localFiles.add(filename);
        }
      }
    }

    // ---------------------------
    // DELETE R2 FILES
    // ---------------------------
    console.log(`🗑 Deleting ${r2Keys.size} R2 objects...`);
    await Promise.all(
      Array.from(r2Keys).map((key) =>
        deleteFromR2(key).catch((err) => {
          console.warn("⚠️ R2 delete failed:", key, err?.message);
        })
      )
    );

    // ---------------------------
    // DELETE LOCAL FILES
    // ---------------------------
    for (const filename of localFiles) {
      const full = path.join(UPLOAD_DIR, filename);
      try {
        if (fs.existsSync(full)) {
          fs.unlinkSync(full);
          console.log("🗑 Deleted local file:", full);
        }
      } catch (err) {
        console.warn("⚠️ Failed deleting local file:", full, err?.message);
      }
    }

    // --------------------------------------------------------
    // ❗ IMPORTANT:
    // DO NOT DELETE DB ROWS HERE.
    // The delete-route handles:
    // attachments → messageTags → messages → conversations → scheduledMessages → accounts
    // --------------------------------------------------------

    console.log("✅ cleanupEmailAccount completed for account:", id);
    return { success: true };
  } catch (err) {
    console.error("❌ cleanupEmailAccount ERROR:", err);
    return { success: false, error: err?.message || "Cleanup failed" };
  }
}

// // src/services/cleanupAccount.js
// import { PrismaClient } from "@prisma/client";
// import { deleteFromR2 } from "./r2.js";
// import fs from "fs";
// import path from "path";
// import dotenv from "dotenv";
// import { URL } from "url";

// dotenv.config();

// const prisma = new PrismaClient();
// const UPLOAD_DIR = path.join(process.cwd(), "uploads");

// function getKeyFromUrl(storageUrl) {
//   try {
//     if (!storageUrl || !storageUrl.startsWith("http")) return null;
//     const parsed = new URL(storageUrl);
//     return parsed.pathname.substring(1);
//   } catch (e) {
//     return null;
//   }
// }

// export async function cleanupEmailAccount(emailAccountId) {
//   try {
//     const accountId = Number(emailAccountId);
//     console.log("🧹 Starting COMPLETE cleanup for account ID:", accountId);

//     // 1️⃣ Fetch attachments (Only needed to get the keys)
//     const messages = await prisma.emailMessage.findMany({
//       where: { emailAccountId: accountId },
//       select: {
//         attachments: {
//           select: { hash: true, storageUrl: true },
//         },
//       },
//     });

//     const filesToDelete = new Set();
//     const localFilesToDelete = new Set();

//     for (const msg of messages) {
//       for (const att of msg.attachments) {
//         const hash = att.hash;
//         const storageUrl = att.storageUrl || "";

//         // Strategy 1: Delete by Hash (The primary key now)
//         if (hash) {
//           filesToDelete.add(`dedup/${hash}`);
//           filesToDelete.add(hash); // just in case
//         }

//         // Strategy 2: Delete by URL Key
//         const urlKey = getKeyFromUrl(storageUrl);
//         if (urlKey) filesToDelete.add(urlKey);

//         // Strategy 3: Local Files
//         if (storageUrl.startsWith("/uploads")) {
//           localFilesToDelete.add(storageUrl.replace(/^\/?uploads\//, ""));
//         }
//       }
//     }

//     // 2️⃣ Delete from R2 (No sharing checks needed anymore)
//     console.log(`🗑 Deleting ${filesToDelete.size} R2 files...`);
//     const r2Promises = Array.from(filesToDelete).map((key) =>
//       deleteFromR2(key).catch((e) =>
//         console.warn(`⚠️ R2 Delete failed (${key})`)
//       )
//     );
//     await Promise.all(r2Promises);

//     // 3️⃣ Delete Local Files
//     localFilesToDelete.forEach((filename) => {
//       const fullPath = path.join(UPLOAD_DIR, filename);
//       if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
//     });

//     // 4️⃣ Delete Database Records
//     await prisma.attachment.deleteMany({
//       where: { message: { emailAccountId: accountId } },
//     });
//     await prisma.emailMessage.deleteMany({
//       where: { emailAccountId: accountId },
//     });
//     await prisma.scheduledMessage.deleteMany({
//       where: { accountId: accountId },
//     });
//     await prisma.conversation.deleteMany({ where: { accountId: accountId } });

//     console.log("✅ Account data and files completely wiped.");
//     return { success: true };
//   } catch (err) {
//     console.error("❌ cleanupEmailAccount ERROR:", err);
//     return { success: false, error: err.message };
//   }
// }
