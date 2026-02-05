import { Request, Response, NextFunction } from "express";
import prisma from "../config/database";
import { successResponse } from "../utils/apiResponse";

export const getDashboardStats = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const organizerId = (req as any).user.id;

        // 1. Get Event stats
        const events = await prisma.event.findMany({
            where: { organizerId, deletedAt: null },
            include: {
                transactions: {
                    where: { status: "DONE" },
                    select: { finalPrice: true, items: { select: { quantity: true } } }
                }
            }
        });

        const totalEvents = events.length;
        let totalRevenue = 0;
        let totalTicketsSold = 0;

        events.forEach((event: any) => {
            event.transactions.forEach((tx: any) => {
                totalRevenue += tx.finalPrice;
                tx.items.forEach((item: any) => {
                    totalTicketsSold += item.quantity;
                });
            });
        });

        const activeEvents = events.filter(e => new Date(e.endDate) > new Date()).length;

        successResponse(res, "Dashboard stats retrieved successfully", {
            totalEvents,
            activeEvents,
            totalRevenue,
            totalTicketsSold
        });
    } catch (error) {
        next(error);
    }
};

export const getOrganizerEvents = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const organizerId = (req as any).user.id;

        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const skip = (page - 1) * limit;

        const [events, total] = await Promise.all([
            prisma.event.findMany({
                where: { organizerId, deletedAt: null },
                skip,
                take: limit,
                orderBy: { createdAt: "desc" },
                include: {
                    location: { select: { city: true } },
                    _count: {
                        select: { transactions: { where: { status: "DONE" } } }
                    }
                }
            }),
            prisma.event.count({ where: { organizerId, deletedAt: null } })
        ]);

        const totalPages = Math.ceil(total / limit);

        successResponse(res, "Organizer events retrieved successfully", events, {
            page,
            limit,
            total,
            totalPages
        });
    } catch (error) {
        next(error);
    }
};

export const getOrganizerTransactions = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const organizerId = (req as any).user.id;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const skip = (page - 1) * limit;

        const [transactions, total] = await Promise.all([
            prisma.transaction.findMany({
                where: {
                    event: { organizerId }
                },
                skip,
                take: limit,
                orderBy: { createdAt: "desc" },
                include: {
                    event: { select: { title: true } },
                    user: { select: { name: true, email: true } }
                }
            }),
            prisma.transaction.count({
                where: {
                    event: { organizerId }
                }
            })
        ]);

        const totalPages = Math.ceil(total / limit);

        successResponse(res, "Organizer transactions retrieved successfully", transactions, {
            page,
            limit,
            total,
            totalPages
        });
    } catch (error) {
        next(error);
    }
};
