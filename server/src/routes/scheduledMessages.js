import express from "express";
import prisma from "../prismaClient.js"; // Ensure this path matches your project structure
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

/* ============================================================
    🔧 HELPER: Resolve real recipient email from conversation
    ============================================================ */
const resolveToEmailFromConversation = async ({
  prisma,
  conversationId,
  accountId,
}) => {
  // Build the query dynamically
  const whereClause = { conversationId };

  // Only filter by account if we actually have one
  if (accountId) {
    whereClause.emailAccountId = Number(accountId);
  }

  const lastMessage = await prisma.emailMessage.findFirst({
    where: whereClause,
    orderBy: { sentAt: "desc" },
  });

  if (!lastMessage) return null;

  if (lastMessage.direction === "received") {
    return lastMessage.fromEmail;
  }

  if (lastMessage.direction === "sent" && lastMessage.toEmail) {
    return lastMessage.toEmail.split(",")[0].trim();
  }

  return null;
};

/* ============================================================
    📬 POST /scheduled-messages → SINGLE SCHEDULE
    ============================================================ */
router.post("/", protect, async (req, res) => {
  try {
    const {
      accountId, // Optional now
      conversationId,
      subject,
      bodyHtml,
      sendAt,
      attachments,
      toEmail, // Allow direct email override
    } = req.body;

    if (!sendAt) {
      return res.status(400).json({
        success: false,
        message: "sendAt is required",
      });
    }

    // 1. Validate Account ONLY if provided
    let verifiedAccountId = null;
    if (accountId) {
      const account = await prisma.emailAccount.findFirst({
        where: { id: Number(accountId), userId: req.user.id },
      });
      if (!account) {
        return res
          .status(404)
          .json({ success: false, message: "Email account not found" });
      }
      verifiedAccountId = account.id;
    }

    // 2. Resolve To Email
    let finalToEmail = toEmail;

    // If no direct email, try to resolve from conversation
    if (!finalToEmail && conversationId) {
      finalToEmail = await resolveToEmailFromConversation({
        prisma,
        conversationId,
        accountId: verifiedAccountId,
      });
    }

    if (!finalToEmail) {
      return res.status(400).json({
        success: false,
        message:
          "Recipient email (toEmail) is required or could not be resolved.",
      });
    }

    // 3. Create or Update
    // Note: If accountId is null, we can't easily check for 'existing' duplicates by account.
    // We will just create a new record to be safe.

    const created = await prisma.scheduledMessage.create({
      data: {
        userId: req.user.id,
        accountId: verifiedAccountId, // Can be null
        conversationId,
        toEmail: finalToEmail,
        subject,
        bodyHtml,
        sendAt: new Date(sendAt),
        attachments: attachments || null,
        status: "pending",
        isFollowedUp: false,
      },
    });

    res.status(201).json({ success: true, data: created });
  } catch (err) {
    console.error("❌ Single schedule error:", err);
    res
      .status(500)
      .json({ success: false, message: "Failed to schedule reply" });
  }
});

router.post("/send-scheduled-now", protect, async (req, res) => {
  try {
    const { scheduledMessageId } = req.body;

    if (!scheduledMessageId) {
      return res.status(400).json({
        success: false,
        message: "scheduledMessageId is required",
      });
    }

    // 1️⃣ Fetch scheduled message
    const scheduled = await prisma.scheduledMessage.findFirst({
      where: {
        id: Number(scheduledMessageId),
        userId: req.user.id,
        status: "pending",
      },
    });

    if (!scheduled) {
      return res.status(404).json({
        success: false,
        message: "Scheduled message not found or already sent",
      });
    }

    // 2️⃣ Fetch email account
    const account = await prisma.emailAccount.findUnique({
      where: { id: scheduled.accountId },
    });

    if (!account) {
      return res.status(404).json({
        success: false,
        message: "Email account not found",
      });
    }

    // 3️⃣ SMTP transporter
    const transporter = nodemailer.createTransport({
      host: account.smtpHost,
      port: account.smtpPort || 465,
      secure: (account.smtpPort || 465) === 465,
      auth: {
        user: account.smtpUser || account.email,
        pass: account.encryptedPass,
      },
    });

    // 4️⃣ SEND EMAIL (manual)
    await transporter.sendMail({
      from: account.smtpUser || account.email,
      to: scheduled.toEmail,
      cc: scheduled.ccEmail || undefined,
      subject: scheduled.subject || "(No Subject)",
      html: scheduled.bodyHtml || "",
    });

    // 5️⃣ 🔥 CRITICAL FIX: mark as sent
    await prisma.scheduledMessage.update({
      where: { id: scheduled.id },
      data: {
        status: "sent",
        isFollowedUp: true,
        updatedAt: new Date(),
      },
    });

    return res.json({
      success: true,
      message: "Scheduled message sent manually",
    });
  } catch (err) {
    console.error("❌ Manual scheduled send error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to send scheduled message",
    });
  }
});

/* ============================================================
    📦 POST /scheduled-messages/bulk
    ============================================================ */
// router.post("/bulk", protect, async (req, res) => {
//   try {
//     const { accountId, sendAt, messages } = req.body;

//     if (!sendAt || !Array.isArray(messages)) {
//       return res.status(400).json({
//         success: false,
//         message: "sendAt and messages[] are required",
//       });
//     }

//     // 1. Verify Account (Optional)
//     let verifiedAccountId = null;
//     if (accountId) {
//       const account = await prisma.emailAccount.findFirst({
//         where: { id: Number(accountId), userId: req.user.id },
//       });
//       if (account) verifiedAccountId = account.id;
//     }

//     const results = [];

//     for (const msg of messages) {
//       // 🔥 Extract leadStatus from the request
//       const {
//         conversationId,
//         subject,
//         bodyHtml,
//         attachments,
//         toEmail,
//         leadStatus,
//       } = msg;

//       // ... (Email resolution logic same as before) ...
//       let finalToEmail = toEmail;
//       // [Insert resolveToEmailFromConversation logic if needed]

//       if (!finalToEmail) continue;

//       // 2. Create Record with leadStatus
//       const row = await prisma.scheduledMessage.create({
//         data: {
//           userId: req.user.id,
//           accountId: verifiedAccountId,
//           conversationId,
//           toEmail: finalToEmail,
//           subject,
//           bodyHtml: bodyHtml || "", // ✅ Allow empty body
//           sendAt: new Date(sendAt),

//           // 🔥 SAVE THE STATUS
//           leadStatus: leadStatus || "New",

//           attachments: attachments || null,
//           status: "pending",
//           isFollowedUp: false,
//         },
//       });

//       results.push(row);
//     }

//     res.json({ success: true, count: results.length, data: results });
//   } catch (err) {
//     console.error("❌ Bulk schedule error:", err);
//     res.status(500).json({ success: false, message: "Bulk schedule failed" });
//   }
// });
router.post("/bulk", protect, async (req, res) => {
  try {
    const { accountId, sendAt, messages } = req.body;

    if (!sendAt || !Array.isArray(messages)) {
      return res.status(400).json({
        success: false,
        message: "sendAt and messages[] are required",
      });
    }

    // 1. Verify Account (Optional)
    let verifiedAccountId = null;

    if (accountId) {
      const account = await prisma.emailAccount.findFirst({
        where: {
          id: Number(accountId),
          userId: req.user.id,
        },
      });

      if (account) {
        verifiedAccountId = account.id;
      }
    }

    const results = [];

    // 🔥 Delay config
    const BASE_DELAY = 45; // 45 sec between emails

    for (const msg of messages) {
      const {
        conversationId,
        subject,
        bodyHtml,
        attachments,
        toEmail,
        leadStatus,
      } = msg;

      // =====================================================
      // 🔥 Resolve recipient
      // =====================================================
      let finalToEmail = toEmail;

      if (!finalToEmail && conversationId) {
        finalToEmail = await resolveToEmailFromConversation({
          prisma,
          conversationId,
          accountId: verifiedAccountId,
        });
      }

      if (!finalToEmail) {
        console.warn(
          "⚠️ Skipping message because recipient email not found"
        );
        continue;
      }

      // =====================================================
      // 🔥 Human-like staggered delay
      // =====================================================
      const RANDOM_DELAY = Math.floor(Math.random() * 30);

      const scheduledTime = new Date(sendAt);

      scheduledTime.setSeconds(
        scheduledTime.getSeconds() +
          results.length * BASE_DELAY +
          RANDOM_DELAY
      );

      // =====================================================
      // 🔥 Create scheduled message
      // =====================================================
      const row = await prisma.scheduledMessage.create({
        data: {
          userId: req.user.id,
          accountId: verifiedAccountId,
          conversationId,

          toEmail: finalToEmail,

          subject,
          bodyHtml: bodyHtml || "",

          // 🔥 staggered send time
          sendAt: scheduledTime,

          leadStatus: leadStatus || "New",

          attachments: attachments || null,

          status: "pending",
          isFollowedUp: false,
        },
      });

      results.push(row);
    }

    return res.json({
      success: true,
      count: results.length,
      data: results,
    });
  } catch (err) {
    console.error("❌ Bulk schedule error:", err);

    return res.status(500).json({
      success: false,
      message: "Bulk schedule failed",
    });
  }
});
/* ============================================================
    📧 GET /scheduled-messages/:id/conversation
    ============================================================ */
router.get("/:id/conversation", protect, async (req, res) => {
  try {
    const scheduled = await prisma.scheduledMessage.findFirst({
      where: { id: Number(req.params.id), userId: req.user.id },
    });

    if (!scheduled) {
      return res.status(404).json({ success: false });
    }

    // 🔥 FIX: Fetch messages even if accountId is null
    const whereClause = {
      conversationId: scheduled.conversationId,
    };

    // Only filter by account if the scheduled message HAS an account
    if (scheduled.accountId) {
      whereClause.emailAccountId = scheduled.accountId;
    }

    const messages = await prisma.emailMessage.findMany({
      where: whereClause,
      orderBy: { sentAt: "asc" },
      include: { attachments: true },
    });

    res.json({
      success: true,
      scheduledMessage: scheduled,
      conversationMessages: messages,
    });
  } catch (err) {
    console.error("❌ Fetch scheduled conversation error:", err);
    res.status(500).json({ success: false });
  }
});

/* ============================================================
    📅 GET /scheduled-messages/today
    ============================================================ */
router.get("/today", protect, async (req, res) => {
  try {
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const messages = await prisma.scheduledMessage.findMany({
      where: {
        userId: req.user.id,
        status: "pending",
        sendAt: { gte: start, lte: end },
        OR: [{ isFollowedUp: false }, { isFollowedUp: null }],
      },
      orderBy: { sendAt: "asc" },
    });

    // Normalize rows if email is missing (legacy support)
    const normalized = await Promise.all(
      messages.map(async (m) => {
        if (m.toEmail?.includes("@")) return m;

        const resolved = await resolveToEmailFromConversation({
          prisma,
          conversationId: m.conversationId,
          accountId: m.accountId,
        });

        return {
          ...m,
          toEmail: resolved || m.toEmail,
        };
      })
    );

    res.json(normalized);
  } catch (err) {
    console.error("❌ Fetch today follow-ups error:", err);
    res
      .status(500)
      .json({ error: "Failed to fetch today's scheduled messages" });
  }
});

/* ============================================================
    ✏️ PATCH /scheduled-messages/:id
    ============================================================ */
router.patch("/:id", protect, async (req, res) => {
  try {
    const { subject, bodyHtml, toEmail, ccEmail, sendAt, attachments } =
      req.body;

    const existing = await prisma.scheduledMessage.findFirst({
      where: {
        id: Number(req.params.id),
        userId: req.user.id,
        status: "pending",
      },
    });

    if (!existing) return res.status(404).json({ success: false });

    const updateData = {};
    if (subject !== undefined) updateData.subject = subject;
    if (bodyHtml !== undefined) updateData.bodyHtml = bodyHtml;
    if (ccEmail !== undefined) updateData.ccEmail = ccEmail;
    if (sendAt !== undefined) updateData.sendAt = new Date(sendAt);
    if (attachments !== undefined) updateData.attachments = attachments;
    if (toEmail !== undefined) updateData.toEmail = toEmail;

    const updated = await prisma.scheduledMessage.update({
      where: { id: existing.id },
      data: updateData,
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    console.error("❌ Update scheduled error:", err);
    res.status(500).json({ success: false });
  }
});

/* ============================================================
    🗑️ DELETE /scheduled-messages/:id
    ============================================================ */
router.delete("/:id", protect, async (req, res) => {
  try {
    const existing = await prisma.scheduledMessage.findFirst({
      where: {
        id: Number(req.params.id),
        userId: req.user.id,
        status: "pending",
      },
    });

    if (!existing) return res.status(404).json({ success: false });

    await prisma.scheduledMessage.delete({ where: { id: existing.id } });
    res.json({ success: true });
  } catch (err) {
    console.error("❌ Delete scheduled error:", err);
    res.status(500).json({ success: false });
  }
});

export default router;
