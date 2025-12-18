import express from "express";
import { PrismaClient } from "@prisma/client";
import nodemailer from "nodemailer";
import dns from "dns/promises";
import { protect } from "../middlewares/authMiddleware.js";
import { runSyncForAccount } from "../services/imapSync.js";
import { ImapFlow } from "imapflow";

const router = express.Router();
const prisma = new PrismaClient();

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
// router.post("/", protect, async (req, res) => {
//   try {
//     const {
//       email,
//       provider,
//       imapHost,
//       imapPort,
//       imapUser,
//       smtpHost,
//       smtpPort,
//       smtpUser,
//       encryptedPass,
//       oauthClientId,
//       oauthClientSecret,
//       refreshToken,
//       authType,
//     } = req.body;

//     if (
//       !email ||
//       !provider ||
//       !imapHost ||
//       !imapPort ||
//       !imapUser ||
//       !smtpHost ||
//       !smtpPort ||
//       !smtpUser
//     ) {
//       return res
//         .status(400)
//         .json({ error: "All connection fields are required" });
//     }

//     const exists = await prisma.emailAccount.findUnique({ where: { email } });
//     if (exists)
//       return res.status(400).json({ error: "Account already exists" });

//     /* -------------------------
//        VERIFY IMAP
//     -------------------------- */
//     const imap = new ImapFlow({
//       host: imapHost,
//       port: Number(imapPort),
//       secure: Number(imapPort) === 993,
//       auth: { user: imapUser || email, pass: encryptedPass },
//       tls: { rejectUnauthorized: false },
//     });

//     try {
//       await imap.connect();
//       await imap.logout();
//     } catch (err) {
//       const suggestions = await suggestHostsForEmail(email);

//       const domain = email.split("@")[1];
//       const detectedProvider = await detectEmailProvider(domain);

//       let finalSuggestion = null;
//       let help = null;

//       const isHostError =
//         err.message.includes("ENOTFOUND") ||
//         err.message.includes("lookup") ||
//         err.message.includes("Invalid host") ||
//         err.message.includes("Can't connect") ||
//         err.message.includes("ECONN");

//       // If IMAP host is wrong → show suggestions
//       if (isHostError) {
//         finalSuggestion = suggestions[0];
//       }

//       // If authentication failed but host is correct → show only help message
//       const isAuthError =
//         err.message.includes("AUTHENTICATIONFAILED") ||
//         err.message.includes("Invalid credentials") ||
//         err.message.includes("LOGIN failed") ||
//         err.message.includes("authentication") ||
//         err.message.includes("Command failed");

//       if (isAuthError && !isHostError) {
//         finalSuggestion = null; // hide suggestions block

//         // UNIVERSAL APP PASSWORD HELP (for all providers)
//         if (["zoho", "zoho_in"].includes(detectedProvider)) {
//           help = `
//         <b>Zoho Mail requires an App Password</b><br/>
//         Normal email password will NOT work.<br/><br/>
//         <b>How to fix:</b><br/>
//         1. Log in to Zoho Mail<br/>
//         2. Go to Settings → Security → App Passwords<br/>
//         3. Generate a new App Password<br/>
//         4. Use that password here<br/>
//       `;
//         }

//         if (["gmail"].includes(detectedProvider)) {
//           help = `
//         <b>Gmail requires an App Password</b><br/>
//         If 2FA is enabled, normal password will NOT work.<br/><br/>
//         <b>How to fix:</b><br/>
//         1. Go to Google Account<br/>
//         2. Security → App Passwords<br/>
//         3. Generate new App Password<br/>
//         4. Use it here<br/>
//       `;
//         }

//         if (["titan", "bluehost", "hostinger"].includes(detectedProvider)) {
//           help = `
//         <b>Titan/Bluehost/Hostinger email requires proper authentication</b><br/>
//         Normal password might be blocked.<br/><br/>
//         <b>Fix:</b><br/>
//         1. Open your hosting panel<br/>
//         2. Go to Email Account → Security<br/>
//         3. Enable IMAP access or generate App Password<br/>
//         4. Use that here<br/>
//       `;
//         }

//         if (["namecheap"].includes(detectedProvider)) {
//           help = `
//         <b>Namecheap Private Email may require app password</b><br/>
//         Make sure IMAP is enabled.<br/><br/>
//         <b>Fix:</b><br/>
//         1. Open PrivateEmail dashboard<br/>
//         2. Ensure IMAP/SMTP enabled<br/>
//         3. Generate or reset mailbox password<br/>
//       `;
//         }

//         if (["office365", "outlook"].includes(detectedProvider)) {
//           help = `
//         <b>Office365/Outlook requires App Password if MFA enabled</b><br/>
//         Normal password may fail.<br/><br/>
//         <b>Fix:</b><br/>
//         1. Go to Office365 Security page<br/>
//         2. Enable App Passwords<br/>
//         3. Generate an App Password<br/>
//         4. Use that here<br/>
//       `;
//         }
//       }

//       return res.status(400).json({
//         success: false,
//         error: "IMAP Login Failed: " + err.message,
//         suggestion: finalSuggestion, // Smart suggestion logic
//         help,
//       });
//     }

//     /* -------------------------
//        VERIFY SMTP
//     -------------------------- */
//     const transporter = nodemailer.createTransport({
//       host: smtpHost,
//       port: Number(smtpPort),
//       secure: Number(smtpPort) === 465,
//       auth: { user: smtpUser || email, pass: encryptedPass },
//     });

//     try {
//       await transporter.verify();
//     } catch (err) {
//       // const suggestions = await suggestHostsForEmail(email);
//       const suggestions = await suggestHostsForEmail(email, provider);
//       return res.status(400).json({
//         success: false,
//         error: "SMTP Login Failed: " + err.message,
//         suggestion: suggestions[0] || null,
//       });
//     }

//     /* -------------------------
//        IF VERIFIED → SAVE ACCOUNT
//     -------------------------- */
//     const newAccount = await prisma.emailAccount.create({
//       data: {
//         userId: req.user.id,
//         email,
//         provider,
//         imapHost,
//         imapPort: Number(imapPort),
//         imapUser,
//         smtpHost,
//         smtpPort: Number(smtpPort),
//         smtpUser,
//         encryptedPass,
//         oauthClientId,
//         oauthClientSecret,
//         refreshToken,
//         authType,
//         verified: true,
//       },
//     });

//     // Initial quick sync
//     runSyncForAccount(prisma, email)
//       .then(() => console.log(`⚡ Quick sync done for ${email}`))
//       .catch((e) => console.log("Sync trigger error:", e));

//     res.status(201).json(newAccount);
//   } catch (err) {
//     console.error("CREATE ACCOUNT ERROR:", err);
//     res
//       .status(500)
//       .json({ error: "Failed to create account", details: err.message });
//   }
// });
/* server/routes/accounts.js */

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

// DELETE EMAIL ACCOUNT (with full cleanup + disable IMAP)
// router.delete("/:id", protect, async (req, res) => {
//   try {
//     const id = Number(req.params.id);
//     if (!id) return res.status(400).json({ error: "Invalid account id" });

//     console.log("🟡 Starting delete flow for account:", id);

//     // Disable IMAP credentials first
//     await prisma.emailAccount.update({
//       where: { id },
//       data: {
//         imapHost: null,
//         imapUser: null,
//         encryptedPass: null,
//         refreshToken: null,
//         accessToken: null,
//         verified: false,
//       },
//     });

//     console.log("🟢 IMAP credentials disabled — sync stopped");

//     // Run cleanup
//     try {
//       const { cleanupEmailAccount } = await import(
//         "../services/cleanupAccount.js"
//       );
//       await cleanupEmailAccount(id);
//       console.log("🟢 Cleanup executed for account:", id);
//     } catch (cleanupErr) {
//       console.error("❌ Cleanup error:", cleanupErr.message);
//     }

//     // Delete everything in DB safely
//     await prisma.$transaction(async (tx) => {
//       console.log("🟡 Running DB delete transaction...");

//       // Get all message IDs
//       const messageIds = (
//         await tx.emailMessage.findMany({
//           where: { emailAccountId: id },
//           select: { id: true },
//         })
//       ).map((m) => m.id);

//       // Attachments + Message Tags
//       if (messageIds.length > 0) {
//         await tx.attachment.deleteMany({
//           where: { messageId: { in: messageIds } },
//         });
//         await tx.messageTag.deleteMany({
//           where: { messageId: { in: messageIds } },
//         });
//       }

//       // Delete messages
//       await tx.emailMessage.deleteMany({
//         where: { emailAccountId: id },
//       });

//       // Get conversation IDs
//       const conversationIds = (
//         await tx.conversation.findMany({
//           where: { accountId: id },
//           select: { id: true },
//         })
//       ).map((c) => c.id);

//       // Delete scheduled messages & tags linked with conversations
//       if (conversationIds.length > 0) {
//         await tx.scheduledMessage.deleteMany({
//           where: { conversationId: { in: conversationIds } },
//         });

//         await tx.conversationTag.deleteMany({
//           where: { conversationId: { in: conversationIds } },
//         });
//       }

//       // Delete scheduled messages linked directly to account
//       await tx.scheduledMessage.deleteMany({
//         where: { accountId: id },
//       });

//       // Delete conversations
//       await tx.conversation.deleteMany({
//         where: { accountId: id },
//       });

//       // Delete email account
//       await tx.emailAccount.delete({ where: { id } });

//       console.log("🟢 Transaction successfully completed");
//     });

//     res.json({
//       success: true,
//       message: "Account deleted successfully with full cleanup.",
//     });
//   } catch (err) {
//     console.error("❌ Final delete error:", err);
//     res.status(500).json({ error: "Failed to delete account" });
//   }
// });
// Replace the outer try/catch body in your current DELETE handler
router.delete("/:id", protect, async (req, res) => {
  const id = Number(req.params.id);
  if (!id)
    return res
      .status(400)
      .json({ success: false, error: "Invalid account id" });

  console.log(`🟡 Starting delete for account ${id}`);

  try {
    // 1. Disable IMAP/SMTP credentials immediately
    await prisma.emailAccount.updateMany({
      where: { id },
      data: {
        imapHost: null,
        imapUser: null,
        encryptedPass: null,
        refreshToken: null,
        accessToken: null,
        verified: false,
      },
    });

    console.log("🟢 Credentials disabled");

    // 2. FULL transaction — correct deletion order
    await prisma.$transaction(async (tx) => {
      console.log("🟡 Running DB delete transaction...");

      // ------------------------------------------
      // A) DELETE EMAIL MESSAGES & DEPENDENCIES
      // ------------------------------------------
      const messages = await tx.emailMessage.findMany({
        where: { emailAccountId: id },
        select: { id: true },
      });

      const messageIds = messages.map((m) => m.id);

      if (messageIds.length > 0) {
        // Delete attachments FIRST → fixes your FK error
        await tx.attachment.deleteMany({
          where: { messageId: { in: messageIds } },
        });

        // Delete messageTag relations
        await tx.messageTag.deleteMany({
          where: { messageId: { in: messageIds } },
        });
      }

      // Delete messages
      await tx.emailMessage.deleteMany({
        where: { emailAccountId: id },
      });

      // ------------------------------------------
      // B) DELETE CONVERSATIONS & DEPENDENCIES
      // ------------------------------------------
      const conversations = await tx.conversation.findMany({
        where: { accountId: id },
        select: { id: true },
      });

      const conversationIds = conversations.map((c) => c.id);

      if (conversationIds.length > 0) {
        // Delete scheduled messages linked to conversations
        await tx.scheduledMessage.deleteMany({
          where: { conversationId: { in: conversationIds } },
        });

        // Delete conversation tags
        await tx.conversationTag.deleteMany({
          where: { conversationId: { in: conversationIds } },
        });
      }

      // Delete scheduled messages linked directly to account
      await tx.scheduledMessage.deleteMany({
        where: { accountId: id },
      });

      // Delete conversations
      await tx.conversation.deleteMany({
        where: { accountId: id },
      });

      // ------------------------------------------
      // C) FINALLY DELETE EMAIL ACCOUNT
      // ------------------------------------------
      await tx.emailAccount.delete({
        where: { id },
      });

      console.log("🟢 DB transaction complete for account", id);
    });

    return res.json({ success: true, message: "Account deleted successfully" });
  } catch (err) {
    console.error("❌ Delete account error:", err?.message, err?.stack);

    const isProd = process.env.NODE_ENV === "production";

    return res.status(500).json({
      success: false,
      error: "Failed to delete account",
      details: isProd ? err?.message : err?.stack || err,
    });
  }
});

/* ============================================================
   🟢 GET USER ACCOUNTS
   ============================================================ */
router.get("/", protect, async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        error: "Unauthorized: req.user missing",
      });
    }

    const accounts = await prisma.emailAccount.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: "desc" },
    });

    return res.json(accounts);
  } catch (err) {
    console.error("🔥 GET /accounts error:", err);
    res.status(500).json({
      error: "Failed to fetch accounts",
      details: err.message,
    });
  }
});

// ======================================================
// 🔄 IMMEDIATELY SYNC AND RETURN EMAILS
// ======================================================
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

export default router;
