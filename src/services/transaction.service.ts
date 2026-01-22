import prisma from "../config/database";
import { TransactionStatus } from "../generated/prisma/client";
import { AppError } from "../middleware/error.middleware";

export const createTransaction = async (
  userId: string,
  data: {
    eventId: string;
    ticketQty: number;
    usePoints: boolean;
    voucherCode?: string;
    couponCode?: string;
  }
) => {
  return await prisma.$transaction(async (tx) => {
    // 1. Fetch Event & Check Seats
    const event = await tx.event.findUnique({
      where: { id: data.eventId },
    });

    if (!event) throw new AppError(404, "Event not found");
    if (event.seatLeft < data.ticketQty) {
         throw new AppError(400, "Not enough seats available");
    }

    // 2. Fetch User (for points)
    const user = await tx.user.findUnique({
      where: { id: userId },
    });
    if (!user) throw new AppError(404, "User not found");

    // 3. Calculate Price
    let totalPrice = event.price * data.ticketQty;
    let voucherId: string | null = null;
    let couponId: string | null = null;
    
    // Apply Voucher (if any)
    if (data.voucherCode) {
      const voucher = await tx.voucher.findUnique({
        where: { code: data.voucherCode, eventId: data.eventId },
      });
      
      const now = new Date();
      if (!voucher || now < voucher.startDate || now > voucher.endDate) {
        throw new AppError(400, "Invalid or expired voucher");
      }
      
      totalPrice -= voucher.discount;
      voucherId = voucher.id;
    }

    // Apply Coupon (if any)
    if (data.couponCode) {
         // Assuming Coupon is generic provided by system, or user specific?
         // Schema: Coupon { ... code, discount, expiresAt ... }
         // It does not have owner userId in schema. But referral logic created generic reusable code?
         // "Users registering with a referral get a discount coupon" -> usually implies unique use.
         // With current schema, "code" is unique.
         // Let's assume anyone who knows the code can use it, validation is just expiry.
         
         const coupon = await tx.coupon.findUnique({
             where: { code: data.couponCode }
         });
         
         const now = new Date();
         if (!coupon || now > coupon.expiresAt) {
             throw new AppError(400, "Invalid or expired coupon");
         }
         
         // Should check if already used? 
         // Schema: Coupon has transactions Transaction[]
         // If it's single use, we should check if used.
         // Requirement says: "Reward / Coupon Discount: ... can be used for all events."
         // Typically referral coupons are single use.
         // "Users registering ... get a discount coupon" implies single use.
         // Let's enforce single use if it comes from referral (based on logic).
         // But Schema doesn't have "isUsed" or similar.
         // We can check `transactions` usage count?
         // Let's check if this coupon has been used in any transaction.
         
         const usedCount = await tx.transaction.count({
             where: { couponId: coupon.id } // Transaction relation
         });
         
         if (usedCount > 0) {
             throw new AppError(400, "Coupon has already been used");
         }

         totalPrice -= coupon.discount;
         couponId = coupon.id;
    }

    // Apply Points
    let pointsUsed = 0;
    if (data.usePoints) {
        const validPoints = await tx.point.findMany({
            where: { userId, expiresAt: { gt: new Date() } }
        });
        const totalPoints = validPoints.reduce((sum, p) => sum + p.amount, 0);

        if (totalPoints > 0) {
            const deduction = Math.min(totalPrice, totalPoints);
            totalPrice -= deduction;
            pointsUsed = deduction;
        }
    }
    
    if (totalPrice < 0) totalPrice = 0;

    // 4. Create Transaction
    const transaction = await tx.transaction.create({
      data: {
        userId,
        eventId: data.eventId,
        totalPrice,
        pointsUsed,
        voucherId,
        couponId,
        status: TransactionStatus.WAITING_PAYMENT,
        items: {
             create: {
                 quantity: data.ticketQty,
                 price: event.price
             }
        },
        expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours expiry
      },
    });

    // 5. Decrement Seats
    await tx.event.update({
      where: { id: data.eventId },
      data: { seatLeft: { decrement: data.ticketQty } },
    });

    // 6. Deduct Points
    if (pointsUsed > 0) {
       const points = await tx.point.findMany({
           where: { userId, expiresAt: { gt: new Date() } },
           orderBy: { expiresAt: 'asc' }
       });
       
       let remainingToDeduct = pointsUsed;
       for (const point of points) {
           if (remainingToDeduct <= 0) break;
           
           if (point.amount <= remainingToDeduct) {
               await tx.point.delete({ where: { id: point.id } });
               remainingToDeduct -= point.amount;
           } else {
               await tx.point.update({
                   where: { id: point.id },
                   data: { amount: { decrement: remainingToDeduct } }
               });
               remainingToDeduct = 0;
           }
       }
    }

    return transaction;
  });
};

export const getUserTransactions = async (userId: string) => {
  return await prisma.transaction.findMany({
    where: { userId },
    include: {
      event: true,
      items: true
    },
    orderBy: { createdAt: "desc" },
  });
};

export const uploadPaymentProof = async (transactionId: string, userId: string, filePath: string) => {
    const transaction = await prisma.transaction.findUnique({
        where: { id: transactionId }
    });
    
    if (!transaction) throw new AppError(404, "Transaction not found");
    if (transaction.userId !== userId) throw new AppError(403, "Forbidden");

    return await prisma.transaction.update({
        where: { id: transactionId },
        data: {
            paymentProof: filePath,
            status: TransactionStatus.WAITING_ADMIN
        }
    });
};
