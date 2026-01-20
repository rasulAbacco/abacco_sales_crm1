import express from "express";
import { PrismaClient } from "@prisma/client";
import { protect } from "../middlewares/authMiddleware.js";
import { cleanupEmailAccount } from "../services/cleanupAccount.js";

const router = express.Router();
const prisma = new PrismaClient();

router.post("/clear", protect, async (req, res) => {
  try {
    const { emailAccountId } = req.body;
    if (!emailAccountId) {
      return res
        .status(400)
        .json({ success: false, message: "emailAccountId required" });
    }

    const accountId = Number(emailAccountId);

    const account = await prisma.emailAccount.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      return res
        .status(404)
        .json({ success: false, message: "Account not found" });
    }

    if (account.userId !== req.user.id) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    // 1️⃣ FILE CLEANUP (R2 + local)
    await cleanupEmailAccount(accountId);

    // 2️⃣ FETCH IDS (NO RELATIONS USED)
    const messages = await prisma.emailMessage.findMany({
      where: { emailAccountId: accountId },
      select: { id: true, conversationId: true },
    });

    const messageIds = messages.map((m) => m.id);
    const conversationIds = [
      ...new Set(messages.map((m) => m.conversationId).filter(Boolean)),
    ];

    // 3️⃣ BREAK FK LOOP
    await prisma.scheduledMessage.updateMany({
      where: { accountId },
      data: { conversationId: null },
    });

    // 4️⃣ DELETE IN SAFE ORDER
    await prisma.$transaction([
      // ---------- MESSAGE CHILDREN ----------
      prisma.attachment.deleteMany({
        where: { messageId: { in: messageIds } },
      }),

      prisma.messageTag.deleteMany({
        where: { messageId: { in: messageIds } },
      }),

      prisma.trackingEvent.deleteMany({
        where: { messageId: { in: messageIds } },
      }),

      prisma.emailComment.deleteMany({
        where: { messageId: { in: messageIds } },
      }),

      // ---------- CONVERSATION CHILDREN ----------
      prisma.emailComment.deleteMany({
        where: { conversationId: { in: conversationIds } },
      }),

      prisma.conversationTag.deleteMany({
        where: { conversationId: { in: conversationIds } },
      }),

      prisma.scheduledMessage.deleteMany({
        where: { accountId },
      }),

      // ---------- MESSAGES ----------
      prisma.emailMessage.deleteMany({
        where: { id: { in: messageIds } },
      }),

      // ---------- CONVERSATIONS ----------
      prisma.conversation.deleteMany({
        where: { id: { in: conversationIds } },
      }),

      // ---------- SYNC / FOLDERS ----------
      prisma.syncState.deleteMany({ where: { accountId } }),
      prisma.emailFolder.deleteMany({ where: { accountId } }),

      // ---------- EMAIL ACCOUNT ----------
      prisma.emailAccount.delete({
        where: { id: accountId },
      }),
    ]);

    console.log("✅ FULL EMAIL ACCOUNT DELETED:", accountId);
    return res.json({ success: true });
  } catch (err) {
    console.error("❌ ACCOUNT CLEANUP FAILED:", err);
    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

export default router;

// import express from "express";
// import { protect } from "../middlewares/authMiddleware.js";
// import { PrismaClient } from "@prisma/client";
// import { cleanupEmailAccount } from "../services/cleanupAccount.js";

// const router = express.Router();
// const prisma = new PrismaClient();

// // POST /api/cleanup-account/clear
// router.post("/clear", protect, async (req, res) => {
//   try {
//     const { emailAccountId } = req.body;

//     if (!emailAccountId) {
//       return res.status(400).json({
//         success: false,
//         message: "emailAccountId is required",
//       });
//     }

//     const id = Number(emailAccountId);

//     // 🔍 Verify account exists
//     const account = await prisma.emailAccount.findUnique({
//       where: { id },
//     });

//     if (!account) {
//       return res.status(404).json({
//         success: false,
//         message: "Email account not found",
//       });
//     }

//     // 🔐 Verify ownership
//     if (account.userId !== req.user.id) {
//       return res.status(403).json({
//         success: false,
//         message: "Unauthorized",
//       });
//     }

//     // 🧹 FIRST: run manual cleanup safely (does not throw)
//     let cleanupResponse = { success: true };

//     try {
//       cleanupResponse = await cleanupEmailAccount(id);
//     } catch (cleanupErr) {
//       console.error("⚠️ cleanupEmailAccount error:", cleanupErr);
//       cleanupResponse = { success: false, error: cleanupErr?.message };
//     }

//     // 🗃️ SECOND: Run DB cleanup in FIXED ORDER to avoid FK errors
//     await prisma.$transaction(async (tx) => {
//       console.log("🟡 Cleaning DB message data…");

//       const messageIds = (
//         await tx.emailMessage.findMany({
//           where: { emailAccountId: id },
//           select: { id: true },
//         })
//       ).map((m) => m.id);

//       // ⚠️ Delete in correct FK order
//       if (messageIds.length > 0) {
//         await tx.attachment.deleteMany({
//           where: { messageId: { in: messageIds } },
//         });

//         await tx.messageTag.deleteMany({
//           where: { messageId: { in: messageIds } },
//         });
//       }

//       await tx.emailMessage.deleteMany({
//         where: { emailAccountId: id },
//       });

//       console.log("🟡 Cleaning conversation data…");

//       const conversationIds = (
//         await tx.conversation.findMany({
//           where: { accountId: id },
//           select: { id: true },
//         })
//       ).map((c) => c.id);

//       if (conversationIds.length > 0) {
//         await tx.scheduledMessage.deleteMany({
//           where: { conversationId: { in: conversationIds } },
//         });

//         await tx.conversationTag.deleteMany({
//           where: { conversationId: { in: conversationIds } },
//         });
//       }

//       await tx.scheduledMessage.deleteMany({
//         where: { accountId: id },
//       });

//       await tx.conversation.deleteMany({
//         where: { accountId: id },
//       });

//       console.log("🟢 Cleanup transaction finished");
//     });

//     return res.json({
//       success: true,
//       message: "Cleanup completed",
//       serviceCleanup: cleanupResponse,
//     });
//   } catch (err) {
//     console.error("❌ Cleanup Route Error:", err);
//     return res.status(500).json({
//       success: false,
//       error: err?.message || "Something went wrong during cleanup",
//     });
//   }
// });

// export default router;
