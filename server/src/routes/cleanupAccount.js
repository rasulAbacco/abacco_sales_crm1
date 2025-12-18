import express from "express";
import { protect } from "../middlewares/authMiddleware.js";
import { PrismaClient } from "@prisma/client";
import { cleanupEmailAccount } from "../services/cleanupAccount.js";

const router = express.Router();
const prisma = new PrismaClient();

// POST /api/cleanup-account/clear
router.post("/clear", protect, async (req, res) => {
  try {
    const { emailAccountId } = req.body;

    if (!emailAccountId) {
      return res.status(400).json({
        success: false,
        message: "emailAccountId is required",
      });
    }

    const id = Number(emailAccountId);

    // 🔍 Verify account exists
    const account = await prisma.emailAccount.findUnique({
      where: { id },
    });

    if (!account) {
      return res.status(404).json({
        success: false,
        message: "Email account not found",
      });
    }

    // 🔐 Verify ownership
    if (account.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized",
      });
    }

    // 🧹 FIRST: run manual cleanup safely (does not throw)
    let cleanupResponse = { success: true };

    try {
      cleanupResponse = await cleanupEmailAccount(id);
    } catch (cleanupErr) {
      console.error("⚠️ cleanupEmailAccount error:", cleanupErr);
      cleanupResponse = { success: false, error: cleanupErr?.message };
    }

    // 🗃️ SECOND: Run DB cleanup in FIXED ORDER to avoid FK errors
    await prisma.$transaction(async (tx) => {
      console.log("🟡 Cleaning DB message data…");

      const messageIds = (
        await tx.emailMessage.findMany({
          where: { emailAccountId: id },
          select: { id: true },
        })
      ).map((m) => m.id);

      // ⚠️ Delete in correct FK order
      if (messageIds.length > 0) {
        await tx.attachment.deleteMany({
          where: { messageId: { in: messageIds } },
        });

        await tx.messageTag.deleteMany({
          where: { messageId: { in: messageIds } },
        });
      }

      await tx.emailMessage.deleteMany({
        where: { emailAccountId: id },
      });

      console.log("🟡 Cleaning conversation data…");

      const conversationIds = (
        await tx.conversation.findMany({
          where: { accountId: id },
          select: { id: true },
        })
      ).map((c) => c.id);

      if (conversationIds.length > 0) {
        await tx.scheduledMessage.deleteMany({
          where: { conversationId: { in: conversationIds } },
        });

        await tx.conversationTag.deleteMany({
          where: { conversationId: { in: conversationIds } },
        });
      }

      await tx.scheduledMessage.deleteMany({
        where: { accountId: id },
      });

      await tx.conversation.deleteMany({
        where: { accountId: id },
      });

      console.log("🟢 Cleanup transaction finished");
    });

    return res.json({
      success: true,
      message: "Cleanup completed",
      serviceCleanup: cleanupResponse,
    });
  } catch (err) {
    console.error("❌ Cleanup Route Error:", err);
    return res.status(500).json({
      success: false,
      error: err?.message || "Something went wrong during cleanup",
    });
  }
});

export default router;

// import express from "express";
// import { protect } from "../middlewares/authMiddleware.js";
// import { cleanupEmailAccount } from "../services/cleanupAccount.js";
// import { PrismaClient } from "@prisma/client";

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

//     // Verify ownership
//     const account = await prisma.emailAccount.findUnique({
//       where: { id: Number(emailAccountId) },
//     });

//     if (!account) {
//       return res
//         .status(404)
//         .json({ success: false, message: "Account not found" });
//     }

//     if (account.userId !== req.user.id) {
//       return res.status(403).json({ success: false, message: "Unauthorized" });
//     }

//     // Run cleanup logic
//     const result = await cleanupEmailAccount(emailAccountId);

//     if (result.success) {
//       return res.json({ success: true, message: "Cleanup completed" });
//     } else {
//       return res.status(500).json({ success: false, error: result.error });
//     }
//   } catch (err) {
//     console.error("Cleanup Route Error:", err);
//     res.status(500).json({ success: false, error: err.message });
//   }
// });

// export default router;
