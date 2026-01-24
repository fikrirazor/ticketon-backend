import cron from "node-cron";
import prisma from "../config/database";
import { logger } from "./logger";

export const initTransactionCron = () => {
  // Run every 10 minutes
  cron.schedule("*/10 * * * *", async () => {
    logger.info("Running Transaction Auto-Expire Cron Job...");

    try {
      const expiredTransactions = await prisma.transaction.findMany({
        where: {
          status: "WAITING_PAYMENT",
          expiresAt: { lt: new Date() },
        },
        include: {
          items: true,
        },
      });

      if (expiredTransactions.length === 0) {
        logger.info("No expired transactions found.");
        return;
      }

      logger.info(`Found ${expiredTransactions.length} expired transactions.`);

      for (const transaction of expiredTransactions) {
        await prisma.$transaction(async (tx) => {
          // 1. Restore seats
          const quantity = transaction.items.reduce((sum, item) => sum + item.quantity, 0);
          await tx.event.update({
            where: { id: transaction.eventId },
            data: { seatLeft: { increment: quantity } },
          });

          // 2. Restore points
          if (transaction.pointsUsed > 0) {
            const restoreExpiresAt = new Date();
            restoreExpiresAt.setMonth(restoreExpiresAt.getMonth() + 3);

            await tx.point.create({
              data: {
                userId: transaction.userId,
                amount: transaction.pointsUsed,
                expiresAt: restoreExpiresAt,
              },
            });
          }

          // 3. Update status to EXPIRED
          await tx.transaction.update({
            where: { id: transaction.id },
            data: { status: "EXPIRED" },
          });

          logger.info(`Transaction ${transaction.id} has been expired and resources restored.`);
        });
      }
    } catch (error) {
      logger.error("Error in Transaction Auto-Expire Cron Job:", error);
    }
  });
};
