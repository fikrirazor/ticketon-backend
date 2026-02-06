import cron from "node-cron";
import prisma from "../config/database";
import { logger } from "./logger";

export const initTransactionCron = () => {
  // Run every 10 minutes to check for both 2-hour and 3-day expirations
  cron.schedule("*/10 * * * *", async () => {
    logger.info("Running Transaction Auto-Expirations Cron Job...");

    try {
      // 1. Handle WAITING_PAYMENT auto-expire (> 2 hours)
      const expiredWaitingPayment = await prisma.transaction.findMany({
        where: {
          status: "WAITING_PAYMENT",
          expiresAt: { lt: new Date() },
        },
        include: { items: true },
      });

      for (const transaction of expiredWaitingPayment) {
        await prisma.$transaction(async (tx) => {
          // Restore seats
          const quantity = transaction.items.reduce((sum, item) => sum + item.quantity, 0);
          await tx.event.update({
            where: { id: transaction.eventId },
            data: { seatLeft: { increment: quantity } },
          });

          // Restore points (add 90 days to avoid setMonth overflow on month-end)
          if (transaction.pointsUsed > 0) {
            const restoreExpiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
            await tx.point.create({
              data: {
                userId: transaction.userId,
                amount: transaction.pointsUsed,
                expiresAt: restoreExpiresAt,
              },
            });
          }

          // Restore Voucher
          if (transaction.voucherId) {
            await tx.voucher.update({
              where: { id: transaction.voucherId },
              data: { usedCount: { decrement: 1 } },
            });
          }

          // Update status to EXPIRED
          await tx.transaction.update({
            where: { id: transaction.id },
            data: { status: "EXPIRED" },
          });

          logger.info(`Transaction ${transaction.id} (WAITING_PAYMENT) has been expired.`);
        });
      }

      // 2. Handle WAITING_ADMIN auto-cancel (> 3 days)
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      const staleWaitingAdmin = await prisma.transaction.findMany({
        where: {
          status: "WAITING_ADMIN",
          updatedAt: { lt: threeDaysAgo },
        },
        include: { items: true },
      });

      for (const transaction of staleWaitingAdmin) {
        await prisma.$transaction(async (tx) => {
          // Restore seats
          const quantity = transaction.items.reduce((sum, item) => sum + item.quantity, 0);
          await tx.event.update({
            where: { id: transaction.eventId },
            data: { seatLeft: { increment: quantity } },
          });

          // Restore points (add 90 days to avoid setMonth overflow on month-end)
          if (transaction.pointsUsed > 0) {
            const restoreExpiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
            await tx.point.create({
              data: {
                userId: transaction.userId,
                amount: transaction.pointsUsed,
                expiresAt: restoreExpiresAt,
              },
            });
          }

          // Restore Voucher
          if (transaction.voucherId) {
            await tx.voucher.update({
              where: { id: transaction.voucherId },
              data: { usedCount: { decrement: 1 } },
            });
          }

          // Update status to CANCELED
          await tx.transaction.update({
            where: { id: transaction.id },
            data: { status: "CANCELED" },
          });

          logger.info(`Transaction ${transaction.id} (WAITING_ADMIN) auto-canceled after 3 days.`);
        });
      }
    } catch (error) {
      logger.error("Error in Transaction Auto-Expirations Cron Job:", error);
    }
  });
};
