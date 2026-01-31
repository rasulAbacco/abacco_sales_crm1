// server/src/queues/emailQueue.js
// BullMQ queue system for background email operations

import { Queue, Worker, QueueScheduler } from "bullmq"
import prisma from "../prismaClient.js";
import { deltaSyncAccount } from "../services/sync/deltaSync.js"
import { sendEmail } from "../services/mailer.js"


// Redis connection config
const redisConnection = {
  host: process.env.REDIS_HOST || "localhost",
  port: Number.parseInt(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
}

// ============================================================
// QUEUE DEFINITIONS
// ============================================================

// Email sync queue
export const syncQueue = new Queue("email-sync", { connection: redisConnection })

// Scheduled email queue
export const scheduledQueue = new Queue("scheduled-emails", { connection: redisConnection })

// Email tracking queue
export const trackingQueue = new Queue("email-tracking", { connection: redisConnection })

// Sequence queue (for HubSpot-style sequences)
export const sequenceQueue = new Queue("email-sequences", { connection: redisConnection })

// ============================================================
// QUEUE SCHEDULERS (Required for delayed jobs)
// ============================================================

new QueueScheduler("email-sync", { connection: redisConnection })
new QueueScheduler("scheduled-emails", { connection: redisConnection })
new QueueScheduler("email-sequences", { connection: redisConnection })

// ============================================================
// SYNC WORKER
// ============================================================

const syncWorker = new Worker(
  "email-sync",
  async (job) => {
    const { accountId, fullSync = false } = job.data

    console.log(`📥 [Queue] Syncing account ${accountId}`)

    const account = await prisma.emailAccount.findUnique({
      where: { id: accountId },
    })

    if (!account) {
      throw new Error(`Account ${accountId} not found`)
    }

    // Update sync status
    await prisma.emailAccount.update({
      where: { id: accountId },
      data: { syncStatus: "syncing" },
    })

    try {
      await deltaSyncAccount(account, { fullSync })

      await prisma.emailAccount.update({
        where: { id: accountId },
        data: {
          syncStatus: "idle",
          lastSyncAt: new Date(),
          syncError: null,
        },
      })

      console.log(`✅ [Queue] Sync complete for ${account.email}`)
    } catch (err) {
      await prisma.emailAccount.update({
        where: { id: accountId },
        data: {
          syncStatus: "error",
          syncError: err.message,
        },
      })
      throw err
    }
  },
  {
    connection: redisConnection,
    concurrency: 3, // Max 3 accounts syncing simultaneously
  },
)

syncWorker.on("failed", (job, err) => {
  console.error(`❌ [Queue] Sync failed for job ${job.id}:`, err.message)
})

// ============================================================
// SCHEDULED EMAIL WORKER
// ============================================================

const scheduledWorker = new Worker(
  "scheduled-emails",
  async (job) => {
    const { scheduledMessageId } = job.data

    console.log(`📤 [Queue] Sending scheduled email ${scheduledMessageId}`)

    const scheduled = await prisma.scheduledMessage.findUnique({
      where: { id: scheduledMessageId },
      include: { emailAccount: true, user: true },
    })

    if (!scheduled || scheduled.status !== "pending") {
      console.log(`⚠️ [Queue] Scheduled message ${scheduledMessageId} not found or not pending`)
      return
    }

    try {
      // Send the email
      await sendEmail({
        accountId: scheduled.accountId,
        to: scheduled.toEmail,
        cc: scheduled.ccEmail,
        subject: scheduled.subject,
        html: scheduled.bodyHtml,
        attachments: scheduled.attachments,
      })

      // Update status
      await prisma.scheduledMessage.update({
        where: { id: scheduledMessageId },
        data: { status: "sent" },
      })

      console.log(`✅ [Queue] Scheduled email sent to ${scheduled.toEmail}`)
    } catch (err) {
      // Retry logic
      const retryCount = (scheduled.retryCount || 0) + 1

      if (retryCount < 3) {
        await prisma.scheduledMessage.update({
          where: { id: scheduledMessageId },
          data: {
            retryCount,
            errorMessage: err.message,
          },
        })

        // Retry in 5 minutes
        await scheduledQueue.add("send-scheduled", { scheduledMessageId }, { delay: 5 * 60 * 1000 })
      } else {
        await prisma.scheduledMessage.update({
          where: { id: scheduledMessageId },
          data: {
            status: "failed",
            errorMessage: err.message,
          },
        })
      }

      throw err
    }
  },
  {
    connection: redisConnection,
    concurrency: 5,
  },
)

// ============================================================
// SEQUENCE WORKER - For automated email sequences
// ============================================================

const sequenceWorker = new Worker(
  "email-sequences",
  async (job) => {
    const { enrollmentId } = job.data

    const enrollment = await prisma.sequenceEnrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        sequence: {
          include: { steps: true },
        },
      },
    })

    if (!enrollment || enrollment.status !== "active") {
      return
    }

    const currentStep = enrollment.sequence.steps.find((s) => s.stepNumber === enrollment.currentStep + 1)

    if (!currentStep) {
      // Sequence complete
      await prisma.sequenceEnrollment.update({
        where: { id: enrollmentId },
        data: { status: "completed" },
      })
      return
    }

    // TODO: Send the email for this step
    // await sendSequenceEmail(enrollment, currentStep);

    // Schedule next step
    const nextStepDelay = (currentStep.delayDays * 24 + currentStep.delayHours) * 60 * 60 * 1000

    await prisma.sequenceEnrollment.update({
      where: { id: enrollmentId },
      data: {
        currentStep: enrollment.currentStep + 1,
        nextSendAt: new Date(Date.now() + nextStepDelay),
      },
    })

    if (enrollment.currentStep + 1 < enrollment.sequence.steps.length) {
      await sequenceQueue.add("process-step", { enrollmentId }, { delay: nextStepDelay })
    }
  },
  {
    connection: redisConnection,
    concurrency: 10,
  },
)

// ============================================================
// HELPER FUNCTIONS
// ============================================================

// Queue a sync job for an account
export async function queueAccountSync(accountId, fullSync = false) {
  await syncQueue.add(
    "sync-account",
    { accountId, fullSync },
    {
      removeOnComplete: 100,
      removeOnFail: 50,
    },
  )
}

// Queue all accounts for periodic sync
export async function queueAllAccountsSync() {
  const accounts = await prisma.emailAccount.findMany({
    where: { verified: true },
    select: { id: true },
  })

  for (const account of accounts) {
    await queueAccountSync(account.id)
  }

  console.log(`📥 [Queue] Queued sync for ${accounts.length} accounts`)
}

// Schedule an email
export async function scheduleEmail(scheduledMessageId, sendAt) {
  const delay = new Date(sendAt).getTime() - Date.now()

  if (delay <= 0) {
    // Send immediately
    await scheduledQueue.add("send-scheduled", { scheduledMessageId })
  } else {
    await scheduledQueue.add("send-scheduled", { scheduledMessageId }, { delay })
  }
}

// Initialize recurring jobs
export function initializeRecurringJobs() {
  // Sync all accounts every 2 minutes
  syncQueue.add(
    "sync-all",
    {},
    {
      repeat: { every: 2 * 60 * 1000 },
      removeOnComplete: true,
    },
  )

  console.log("✅ [Queue] Recurring jobs initialized")
}
