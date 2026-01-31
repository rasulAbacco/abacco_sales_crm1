import express from "express";
import nodemailer from "nodemailer";
import dns from "dns/promises";
import { protect } from "../middlewares/authMiddleware.js";
import { runSyncForAccount } from "../services/imapSync.js";
import { ImapFlow } from "imapflow";
import prisma from "../prismaClient.js";

const router = express.Router();

/**
 * Suggest IMAP/SMTP hosts (prioritize provider param, then MX records, then provider map)
 * Returns array of suggestions (best-first).
 */
const PROVIDER_MAP = {
  gmail: {
    imapHost: "imap.gmail.com",
    imapPort: 993,
    smtpHost: "smtp.gmail.com",
    smtpPort: 587,
  },
  gsuite: {
    imapHost: "imap.gmail.com",
    imapPort: 993,
    smtpHost: "smtp.gmail.com",
    smtpPort: 587,
  },
  zoho: {
    imapHost: "imap.zoho.com",
    imapPort: 993,
    smtpHost: "smtp.zoho.com",
    smtpPort: 587,
  },
  zoho_in: {
    imapHost: "imappro.zoho.in",
    imapPort: 993,
    smtpHost: "smtppro.zoho.in",
    smtpPort: 587,
  },
  bluehost: {
    imapHost: "imap.titan.email",
    imapPort: 993,
    smtpHost: "smtp.titan.email",
    smtpPort: 465,
  },
  titan: {
    imapHost: "imap.titan.email",
    imapPort: 993,
    smtpHost: "smtp.titan.email",
    smtpPort: 465,
  },
  namecheap: {
    imapHost: "mail.privateemail.com",
    imapPort: 993,
    smtpHost: "mail.privateemail.com",
    smtpPort: 587,
  },
  hostinger: {
    imapHost: "imap.hostinger.com",
    imapPort: 993,
    smtpHost: "smtp.hostinger.com",
    smtpPort: 465,
  },
  godaddy: {
    imapHost: "imap.secureserver.net",
    imapPort: 993,
    smtpHost: "smtpout.secureserver.net",
    smtpPort: 465,
  },
  yahoo: {
    imapHost: "imap.mail.yahoo.com",
    imapPort: 993,
    smtpHost: "smtp.mail.yahoo.com",
    smtpPort: 587,
  },
  outlook: {
    imapHost: "outlook.office365.com",
    imapPort: 993,
    smtpHost: "smtp.office365.com",
    smtpPort: 587,
  },
  rediff: {
    imapHost: "imap.rediffmailpro.com",
    imapPort: 143,
    smtpHost: "smtp.rediffmailpro.com",
    smtpPort: 587,
  },
  // add other providers you want...
};

const UNIVERSAL_PROVIDER_SETTINGS = {
  titan: {
    imapHost: "imap.titan.email",
    smtpHost: "smtp.titan.email",
    imapPort: 993,
    smtpPort: 465,
  },
  namecheap: {
    imapHost: "mail.privateemail.com",
    smtpHost: "mail.privateemail.com",
    imapPort: 993,
    smtpPort: 587,
  },
  zoho: {
    imapHost: "imap.zoho.com",
    smtpHost: "smtp.zoho.com",
    imapPort: 993,
    smtpPort: 587,
  },
  zoho_in: {
    imapHost: "imappro.zoho.in",
    smtpHost: "smtppro.zoho.in",
    imapPort: 993,
    smtpPort: 587,
  },
  gmail: {
    imapHost: "imap.gmail.com",
    smtpHost: "smtp.gmail.com",
    imapPort: 993,
    smtpPort: 587,
  },
  office365: {
    imapHost: "outlook.office365.com",
    smtpHost: "smtp.office365.com",
    imapPort: 993,
    smtpPort: 587,
  },
  godaddy: {
    imapHost: "imap.secureserver.net",
    smtpHost: "smtpout.secureserver.net",
    imapPort: 993,
    smtpPort: 465,
  },
  hostinger: {
    imapHost: "imap.hostinger.com",
    smtpHost: "smtp.hostinger.com",
    imapPort: 993,
    smtpPort: 465,
  },
};

async function detectProviderFromMx(domain) {
  try {
    const mx = await dns.resolveMx(domain);
    if (!mx || mx.length === 0) return null;
    // take highest priority (lowest priority value)
    mx.sort((a, b) => a.priority - b.priority);
    const host = mx[0].exchange.toLowerCase();

    // Heuristics: map common MX host patterns to providers
    if (host.includes("google") || host.includes("google.com")) return "gmail";
    if (host.includes("googlehosted")) return "gmail";
    if (host.includes("zoho")) return "zoho";
    if (host.includes("titan") || host.includes("titan.email")) return "titan";
    if (host.includes("privateemail") || host.includes("mail.privateemail"))
      return "namecheap";
    if (host.includes("hostinger")) return "hostinger";
    if (host.includes("secureserver") || host.includes("smtpout"))
      return "godaddy";
    if (host.includes("yahoodns") || host.includes("mail.yahoo"))
      return "yahoo";
    if (
      host.includes("outlook") ||
      host.includes("office365") ||
      host.includes("protection.outlook")
    )
      return "outlook";
    if (host.includes("rediff")) return "rediff";
    // fallback
    return null;
  } catch (e) {
    return null;
  }
}

async function detectEmailProvider(domain) {
  try {
    const mx = await dns.resolveMx(domain);
    mx.sort((a, b) => a.priority - b.priority);
    const mxHost = mx[0].exchange.toLowerCase();

    // TITAN MAIL (Bluehost, Hostinger, BigRock, etc.)
    if (mxHost.includes("titan.email")) return "titan";

    // NAMECHEAP PRIVATE EMAIL
    if (mxHost.includes("privateemail")) return "namecheap";

    // ZOHO (Global or India)
    if (mxHost.includes("zoho.in")) return "zoho_in";
    if (mxHost.includes("zoho.com")) return "zoho";

    // GOOGLE WORKSPACE / GMAIL
    if (mxHost.includes("google") || mxHost.includes("googlehosted"))
      return "gmail";

    // OFFICE 365
    if (mxHost.includes("outlook") || mxHost.includes("office365"))
      return "office365";

    // GODADDY
    if (mxHost.includes("secureserver")) return "godaddy";

    // HOSTINGER
    if (mxHost.includes("hostinger")) return "hostinger";

    // CPANEL / PLESK EMAIL
    if (mxHost.includes(`mail.${domain}`)) return "cpanel";

    return "unknown";
  } catch (err) {
    return "unknown";
  }
}

/**
 * Main suggestion function.
 * - email: full email like user@domain.com
 * - provider: optional provider string from frontend (e.g., 'bluehost','zoho','gmail')
 */
async function suggestHostsForEmail(email) {
  const domain = email.split("@")[1];
  const provider = await detectEmailProvider(domain);

  if (UNIVERSAL_PROVIDER_SETTINGS[provider]) {
    return [
      {
        reason: `Detected: ${provider}`,
        ...UNIVERSAL_PROVIDER_SETTINGS[provider],
      },
    ];
  }

  // fallback guess
  return [
    {
      reason: "Unknown — guessed from domain",
      imapHost: `imap.${domain}`,
      smtpHost: `smtp.${domain}`,
      imapPort: 993,
      smtpPort: 587,
    },
  ];
}

/* ============================================================
   🟢 CREATE NEW EMAIL ACCOUNT — VERIFY IMAP & SMTP
============================================================ */

router.post("/", protect, async (req, res) => {
  try {
    const {
      email,
      provider,
      imapHost,
      imapPort,
      imapUser,
      smtpHost,
      smtpPort,
      smtpUser,
      encryptedPass,
      authType,
    } = req.body;

    // 1. Validation
    if (
      !email ||
      !provider ||
      !imapHost ||
      !imapPort ||
      !imapUser ||
      !smtpHost ||
      !smtpPort ||
      !smtpUser
    ) {
      return res
        .status(400)
        .json({ error: "All connection fields are required" });
    }

    const exists = await prisma.emailAccount.findUnique({ where: { email } });
    if (exists)
      return res.status(400).json({ error: "Account already exists" });

    /* -------------------------
       VERIFY IMAP (Incoming)
    -------------------------- */
    const imap = new ImapFlow({
      host: imapHost,
      port: Number(imapPort),
      secure: Number(imapPort) === 993, // SSL for 993
      auth: { user: imapUser || email, pass: encryptedPass },
      tls: { rejectUnauthorized: false },
    });

    // 🔥 FIX 1: Prevent process crash on socket timeouts (common with Zoho/Bluehost)
    imap.on("error", (err) => {
      console.error("⚠️ IMAP Verification Background Error:", err.message);
    });

    try {
      await imap.connect();
      await imap.logout();
    } catch (err) {
      const suggestions = await suggestHostsForEmail(email);
      const domain = email.split("@")[1];
      const detectedProvider = await detectEmailProvider(domain);
      let help = null;

      // Provide Zoho-specific help if auth fails
      if (
        err.message.includes("AUTHENTICATIONFAILED") &&
        ["zoho", "zoho_in"].includes(detectedProvider)
      ) {
        help = `<b>Zoho Requires an App Password</b><br/>1. Log in to Zoho Webmail<br/>2. Settings → Security → App Passwords<br/>3. Ensure <b>IMAP Access</b> is enabled in Mail Accounts settings.`;
      }

      return res.status(400).json({
        success: false,
        error: "IMAP Login Failed: " + err.message,
        suggestion: suggestions[0],
        help,
      });
    }

    /* -------------------------
       VERIFY SMTP (Outgoing)
    -------------------------- */
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: Number(smtpPort),
      // secure: true for 465 (Implicit SSL), false for 587 (STARTTLS)
      secure: Number(smtpPort) === 465,
      auth: { user: smtpUser || email, pass: encryptedPass },
      // 🔥 FIX 2: Support STARTTLS for Port 587 (Required for Zoho/Gmail/Bluehost)
      requireTLS: Number(smtpPort) === 587,
      tls: {
        rejectUnauthorized: false,
        minVersion: "TLSv1.2",
      },
    });

    try {
      await transporter.verify();
    } catch (err) {
      const suggestions = await suggestHostsForEmail(email);
      return res.status(400).json({
        success: false,
        error: "SMTP Login Failed: " + err.message,
        suggestion: suggestions[0],
      });
    }

    /* -------------------------
       SAVE ACCOUNT & START SYNC
    -------------------------- */
    const newAccount = await prisma.emailAccount.create({
      data: {
        userId: req.user.id,
        email,
        provider,
        imapHost,
        imapPort: Number(imapPort),
        imapUser,
        smtpHost,
        smtpPort: Number(smtpPort),
        smtpUser,
        encryptedPass,
        authType,
        verified: true,
      },
    });

    // Trigger initial sync in background
    runSyncForAccount(prisma, email)
      .then(() => console.log(`⚡ Initial sync completed for ${email}`))
      .catch((e) => console.error("Sync trigger error:", e));

    res.status(201).json(newAccount);
  } catch (err) {
    console.error("CREATE ACCOUNT ERROR:", err);
    res
      .status(500)
      .json({ error: "Internal server error", details: err.message });
  }
});
/* ============================================================
   🟢 UPDATE ACCOUNT
   ============================================================ */
router.put("/:id", protect, async (req, res) => {
  try {
    const accountId = Number(req.params.id);

    const {
      email,
      provider,
      imapHost,
      imapPort,
      imapUser,
      smtpHost,
      smtpPort,
      smtpUser,
      encryptedPass,
      oauthClientId,
      oauthClientSecret,
      refreshToken,
      authType,
    } = req.body;

    const updated = await prisma.emailAccount.update({
      where: { id: accountId },
      data: {
        email,
        provider,
        imapHost,
        imapPort: Number(imapPort),
        imapUser,
        smtpHost,
        smtpPort: Number(smtpPort),
        smtpUser,
        encryptedPass,
        oauthClientId,
        oauthClientSecret,
        refreshToken,
        authType,
      },
    });

    res.json(updated);
  } catch (err) {
    console.error("❌ Update error:", err);
    res.status(500).json({ error: "Failed to update account" });
  }
});


router.delete("/:id", protect, async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ success: false, error: "Invalid ID" });

  console.log(`🟡 Starting delete for account ${id}`);

  try {
    // 1️⃣ CHECK IF ACCOUNT EXISTS FIRST
    // If it's already deleted (e.g. by cleanup service), just return success.
    const existing = await prisma.emailAccount.findUnique({ where: { id } });

    if (!existing) {
      console.log("⚠️ Account already deleted. Skipping DB delete.");
      return res.json({
        success: true,
        message: "Account was already deleted",
      });
    }

    // 2️⃣ Disable Credentials (Safe to run)
    await prisma.emailAccount.updateMany({
      where: { id },
      data: {
        imapHost: null,
        imapUser: null,
        encryptedPass: null,
        verified: false,
      },
    });

    // 3️⃣ Run Transaction
    await prisma.$transaction(async (tx) => {
      // Fetch messages
      const messages = await tx.emailMessage.findMany({
        where: { emailAccountId: id },
        select: { id: true },
      });
      const messageIds = messages.map((m) => m.id);

      // Delete message dependencies
      if (messageIds.length > 0) {
        await tx.attachment.deleteMany({
          where: { messageId: { in: messageIds } },
        });
        await tx.messageTag.deleteMany({
          where: { messageId: { in: messageIds } },
        });
      }

      // Delete messages
      await tx.emailMessage.deleteMany({ where: { emailAccountId: id } });

      // Fetch conversations (CORRECTED FIELD: emailAccountId)
      const conversations = await tx.conversation.findMany({
        where: { emailAccountId: id },
        select: { id: true },
      });
      const conversationIds = conversations.map((c) => c.id);

      // Delete conversation dependencies
      if (conversationIds.length > 0) {
        await tx.scheduledMessage.deleteMany({
          where: { conversationId: { in: conversationIds } },
        });
        await tx.conversationTag.deleteMany({
          where: { conversationId: { in: conversationIds } },
        });
      }

      // Delete remaining scheduled messages (CORRECTED FIELD: accountId)
      await tx.scheduledMessage.deleteMany({ where: { accountId: id } });

      // Delete conversations (CORRECTED FIELD: emailAccountId)
      await tx.conversation.deleteMany({ where: { emailAccountId: id } });

      // Delete folders & sync state
      await tx.emailFolder.deleteMany({ where: { accountId: id } });
      await tx.syncState.deleteMany({ where: { accountId: id } });

      // Final Delete
      await tx.emailAccount.delete({ where: { id } });
    });

    console.log("🟢 Account deleted successfully");
    res.json({ success: true, message: "Account deleted" });
  } catch (err) {
    // If error is "Record to delete does not exist", it means a race condition deleted it.
    // We can safely ignore it and return success.
    if (err.code === "P2025") {
      console.log("⚠️ Race condition: Account deleted during transaction.");
      return res.json({ success: true, message: "Account deleted" });
    }

    console.error("❌ Delete error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});
/* ============================================================
   🟢 GET USER ACCOUNTS
   ============================================================ */
// router.get("/", protect, async (req, res) => {
//   try {
//     if (!req.user || !req.user.id) {
//       return res.status(401).json({
//         error: "Unauthorized: req.user missing",
//       });
//     }

//     const accounts = await prisma.emailAccount.findMany({
//       where: { userId: req.user.id },
//       orderBy: { createdAt: "desc" },
//     });

//     return res.json(accounts);
//   } catch (err) {
//     console.error("🔥 GET /accounts error:", err);
//     res.status(500).json({
//       error: "Failed to fetch accounts",
//       details: err.message,
//     });
//   }
// });

// ======================================================
// 🔄 IMMEDIATELY SYNC AND RETURN EMAILS
// ======================================================

/* ============================================================
   📋 GET /accounts → GET ALL ACCOUNTS (WITH SENDER NAME)
   ============================================================ */
router.get("/", protect, async (req, res) => {
  try {
    const accounts = await prisma.emailAccount.findMany({
      where: { userId: req.user.id },
      select: {
        id: true,
        email: true,
        provider: true,
        senderName: true,
        verified: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return res.json({
      success: true,
      data: accounts,
    });
  } catch (error) {
    console.error("❌ Error fetching accounts:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch accounts",
    });
  }
});


router.get("/sync/:email", async (req, res) => {
  try {
    const email = req.params.email;

    const account = await prisma.emailAccount.findUnique({
      where: { email },
    });

    if (!account) {
      return res.status(404).json({ error: "Account not found" });
    }

    await runSyncForAccount(prisma, email);

    const messages = await prisma.emailMessage.findMany({
      where: { emailAccountId: account.id },
      orderBy: { sentAt: "desc" },
      include: { attachments: true },
    });

    res.json({
      success: true,
      messages,
    });
  } catch (err) {
    console.error("SYNC ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// ======================================================
// 🟢 GET ACCOUNTS BY EMPLOYEE ID
// ======================================================
router.get("/emp/:empId", protect, async (req, res) => {
  try {
    const empId = req.params.empId;

    const accounts = await prisma.emailAccount.findMany({
      where: { empId },
      orderBy: { createdAt: "desc" },
    });

    return res.json({
      success: true,
      data: accounts,
    });
  } catch (err) {
    console.error("❌ Error fetching accounts by empId:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch accounts",
      details: err.message,
    });
  }
});

// GET /api/accounts/:accountId/unread
router.get("/:accountId/unread", protect, async (req, res) => {
  try {
    const accountId = Number(req.params.accountId);
    if (!accountId) {
      return res.status(400).json({ error: "Invalid account ID" });
    }

    const unreadCount = await prisma.emailMessage.count({
      where: {
        emailAccountId: accountId,
        isRead: false,
      },
    });

    res.json({ success: true, unread: unreadCount });
  } catch (err) {
    console.error("❌ Unread count error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to fetch unread count",
      details: err.message,
    });
  }
});

/* ============================================================
   🔧 PATCH /accounts/:id/sender-name → UPDATE SENDER NAME
   ============================================================ */
router.patch("/:id/sender-name", protect, async (req, res) => {
  try {
    const { id } = req.params;
    const { senderName } = req.body;

    if (!senderName || !senderName.trim()) {
      return res.status(400).json({
        success: false,
        message: "Sender name is required",
      });
    }

    // Verify account ownership
    const account = await prisma.emailAccount.findFirst({
      where: {
        id: parseInt(id),
        userId: req.user.id,
      },
    });

    if (!account) {
      return res.status(404).json({
        success: false,
        message: "Email account not found",
      });
    }

    // Update sender name
    const updated = await prisma.emailAccount.update({
      where: { id: parseInt(id) },
      data: { senderName: senderName.trim() },
    });

    return res.json({
      success: true,
      message: "Sender name updated successfully",
      data: {
        id: updated.id,
        email: updated.email,
        senderName: updated.senderName,
      },
    });
  } catch (error) {
    console.error("❌ Error updating sender name:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update sender name",
      error: error.message,
    });
  }
});
export default router;
