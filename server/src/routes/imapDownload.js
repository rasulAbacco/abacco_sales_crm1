// /mnt/data/src/routes/imapDownload.js
import express from "express";
import { PrismaClient } from "@prisma/client";
import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";

const router = express.Router();
const prisma = new PrismaClient();

/**
 * GET /api/inbox/download/:uid/:filename?accountId=123
 * Streams a single attachment from IMAP (live).
 */
router.get("/download/:uid/:filename", async (req, res) => {
  const { uid, filename } = req.params;
  const accountId = Number(req.query.accountId);

  if (!accountId) return res.status(400).send("Missing accountId");

  const account = await prisma.emailAccount.findUnique({
    where: { id: accountId },
  });
  if (!account) return res.status(404).send("Email account not found");

  const client = new ImapFlow({
    host: account.imapHost,
    port: account.imapPort || 993,
    secure: !!account.imapSecure,
    auth: {
      user: account.imapUser || account.email,
      pass: account.encryptedPass,
    },
    tls: { rejectUnauthorized: false },
  });

  try {
    await client.connect();

    let found = false;
    for await (const msg of client.fetch(String(uid), {
      source: true,
      envelope: true,
    })) {
      const parsed = await simpleParser(msg.source);
      const target = (parsed.attachments || []).find(
        (a) =>
          a.filename === filename || decodeURIComponent(filename) === a.filename
      );
      if (!target) continue;

      const buffer = Buffer.isBuffer(target.content)
        ? target.content
        : Buffer.from(target.content || "");
      const mime =
        target.contentType || target.mime || "application/octet-stream";

      res.setHeader("Content-Type", mime);
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${target.filename}"`
      );
      res.setHeader("Content-Length", buffer.length);

      res.send(buffer);
      found = true;
      break;
    }

    if (!found) return res.status(404).send("Attachment not found");
  } catch (err) {
    console.error("❌ IMAP download error:", err.message || err);
    return res.status(500).send("Server error while fetching attachment");
  } finally {
    try {
      await client.logout();
    } catch {}
  }
});

export default router;
