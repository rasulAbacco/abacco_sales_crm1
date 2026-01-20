import { PrismaClient } from "@prisma/client";
import {
  S3Client,
  ListObjectsV2Command,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import dotenv from "dotenv";

dotenv.config();
const prisma = new PrismaClient();

// Setup R2 Client
const R2 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

async function runGC() {
  console.log("🧹 Starting Garbage Collection...");

  // 1. Get ALL valid file keys from the Database
  console.log("⏳ Fetching active files from Database...");
  const allAttachments = await prisma.attachment.findMany({
    select: { storageUrl: true },
    where: { storageUrl: { not: null } },
  });

  // Extract the key "dedup/xxxxx" or "uploads/xxxxx" from the full URL
  const validKeys = new Set();

  allAttachments.forEach((att) => {
    try {
      const url = new URL(att.storageUrl);
      // Remove leading slash (e.g. "/dedup/hash" -> "dedup/hash")
      const key = url.pathname.substring(1);
      validKeys.add(key);
    } catch (e) {
      // ignore invalid urls
    }
  });

  console.log(`✅ DB contains ${validKeys.size} active files.`);

  // 2. List ALL files in R2 bucket
  console.log("⏳ Listing files in R2...");

  let continuationToken = undefined;
  let deletedCount = 0;
  let keptCount = 0;

  do {
    const command = new ListObjectsV2Command({
      Bucket: process.env.R2_BUCKET_NAME,
      // Prefix: "dedup/", // Uncomment if you only want to clean the dedup folder
      ContinuationToken: continuationToken,
    });

    const response = await R2.send(command);
    const objects = response.Contents || [];

    if (objects.length === 0) break;

    for (const obj of objects) {
      const r2Key = obj.Key;

      // Check if this R2 file exists in our Valid Keys list
      if (!validKeys.has(r2Key)) {
        process.stdout.write("x"); // 'x' means deleted
        // console.log(`🗑 Deleting Orphan: ${r2Key}`);

        await R2.send(
          new DeleteObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: r2Key,
          })
        );
        deletedCount++;
      } else {
        process.stdout.write("."); // '.' means kept
        keptCount++;
      }
    }

    continuationToken = response.NextContinuationToken;
  } while (continuationToken);

  console.log("\n\n=======================================");
  console.log(`✅ Garbage Collection Complete.`);
  console.log(`📂 Files Kept:    ${keptCount}`);
  console.log(`🗑  Files Deleted: ${deletedCount}`);
  console.log("=======================================");
}

runGC()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
