const prisma = require('../../config/database');
const notificationService = require('./notification.service');

class NotificationWorker {
  constructor() {
    this.isRunning = false;
    this.pollIntervalMs = 5000;
    this.timer = null;
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log('[NotificationWorker] Started processing outbox queue...');
    this.runLoop();
  }

  stop() {
    this.isRunning = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    console.log('[NotificationWorker] Stopped.');
  }

  async runLoop() {
    try {
      await this.processPendingJobs();
    } catch (err) {
      console.error('[NotificationWorker] Error in job loop:', err.message);
    } finally {
      if (this.isRunning) {
        this.timer = setTimeout(() => this.runLoop(), this.pollIntervalMs);
      }
    }
  }

  async processPendingJobs(batchSize = 20) {
    const now = new Date();

    // Find pending or failed jobs due for execution
    const jobs = await prisma.notificationOutbox.findMany({
      where: {
        status: { in: ['PENDING', 'FAILED'] },
        retryCount: { lt: 3 },
        scheduledAt: { lte: now },
        OR: [{ nextRetryAt: null }, { nextRetryAt: { lte: now } }],
      },
      take: batchSize,
      orderBy: { scheduledAt: 'asc' },
    });

    if (jobs.length === 0) return;

    for (const job of jobs) {
      await this.processJob(job);
    }
  }

  async processJob(job) {
    // Mark as PROCESSING
    await prisma.notificationOutbox.update({
      where: { id: job.id },
      data: { status: 'PROCESSING' },
    });

    try {
      let result;
      if (job.channel === 'EMAIL') {
        const emailProvider = await notificationService.getEmailProvider();
        result = await emailProvider.sendEmail({
          to: job.recipient,
          subject: job.subject || 'Notifikasi MRMS PT Cemindo Gemilang',
          html: job.body,
          text: job.body.replace(/<[^>]+>/g, ''),
        });
      } else if (job.channel === 'WHATSAPP') {
        const waProvider = await notificationService.getWhatsAppProvider();
        result = await waProvider.sendMessage({
          to: job.recipient,
          message: job.body,
        });
      } else {
        throw new Error(`Unsupported channel: ${job.channel}`);
      }

      // Mark success
      await prisma.notificationOutbox.update({
        where: { id: job.id },
        data: {
          status: 'SENT',
          sentAt: new Date(),
          errorMessage: null,
        },
      });

      // Write log
      await prisma.notificationLog.create({
        data: {
          outboxId: job.id,
          eventType: job.eventType,
          channel: job.channel,
          recipient: job.recipient,
          status: result.isMock ? 'MOCK_SENT' : 'SENT',
          providerResponse: result?.response
            ? String(result.response)
            : result?.messageId
            ? String(result.messageId)
            : result?.message || null,
          isMock: Boolean(result.isMock),
        },
      });
    } catch (err) {
      console.error(`[NotificationWorker] Job ${job.id} failed:`, err.message);
      const nextRetryCount = job.retryCount + 1;
      const isMaxRetries = nextRetryCount >= job.maxRetries;

      // Exponential backoff: 1min, 4min, 16min
      const delayMinutes = Math.pow(4, nextRetryCount - 1);
      const nextRetryAt = new Date(Date.now() + delayMinutes * 60 * 1000);

      await prisma.notificationOutbox.update({
        where: { id: job.id },
        data: {
          status: isMaxRetries ? 'FAILED' : 'PENDING',
          retryCount: nextRetryCount,
          nextRetryAt: isMaxRetries ? null : nextRetryAt,
          errorMessage: err.message,
        },
      });

      await prisma.notificationLog.create({
        data: {
          outboxId: job.id,
          eventType: job.eventType,
          channel: job.channel,
          recipient: job.recipient,
          status: 'FAILED',
          errorMessage: err.message,
          isMock: false,
        },
      });
    }
  }

  async retryJob(jobId) {
    const job = await prisma.notificationOutbox.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      throw new Error('Notifikasi tidak ditemukan.');
    }

    await prisma.notificationOutbox.update({
      where: { id: jobId },
      data: {
        status: 'PENDING',
        retryCount: 0,
        nextRetryAt: new Date(),
        errorMessage: null,
      },
    });

    await this.processJob(job);
    return true;
  }
}

const notificationWorker = new NotificationWorker();
module.exports = notificationWorker;

