import { Request, Response, NextFunction } from "express";
import prisma from "../config/database";
import { AppError } from "../utils/error";
import { successResponse } from "../utils/apiResponse";
import { logger } from "../utils/logger";

// Helper to calculate pagination
const getPagination = (page: number, limit: number) => {
  const skip = (page - 1) * limit;
  return { skip, take: limit };
};

export const getEvents = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const { category, location, search } = req.query;

    const { skip, take } = getPagination(page, limit);

    const where: any = {};

    if (category) {
      where.category = category as string;
    }

    if (location) {
      where.location = {
        contains: location as string,
        mode: "insensitive",
      };
    }

    if (search) {
      where.OR = [
        { title: { contains: search as string, mode: "insensitive" } },
        { description: { contains: search as string, mode: "insensitive" } },
      ];
    }

    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        skip,
        take,
        orderBy: {
            createdAt: 'desc'
        },
        include: {
            organizer: {
                select: {
                    id: true,
                    name: true,
                    email: true
                }
            }
        }
      }),
      prisma.event.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    successResponse(res, "Events retrieved successfully", events, {
        page,
        limit,
        total,
        totalPages
    });
  } catch (error) {
    logger.error("Error retrieving events", error);
    next(error);
  }
};

export const getEventById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        organizer: {
            select: {
                id: true,
                name: true,
                email: true
            }
        }
    }
    });

    if (!event) {
      throw new AppError(404, "Event not found");
    }

    successResponse(res, "Event retrieved successfully", event);
  } catch (error) {
    logger.error(`Error retrieving event with id ${req.params.id}`, error);
    next(error);
  }
};

export const createEvent = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { title, description, location, startDate, endDate, price, seatTotal, category, imageUrl: bodyImageUrl, isPromoted } = req.body;
    const imageUrl = (req as any).file?.path || bodyImageUrl;
    
    // Assumes authMiddleware attaches user to req.user (and organizer only check if implemented there, or role check needed here?)
    // Requirement says "protected, organizer only". authMiddleware checks validity but maybe not role.
    // I will assume simple Role check if User model has role. User model from schema has Role enum.
    
    const user = (req as any).user;
    if (user.role !== "ORGANIZER") {
        throw new AppError(403, "Access denied. Only organizers can create events.");
    }

    // Convert string values to numbers (from frontend form data)
    const priceInt = parseInt(price as any);
    const seatTotalInt = parseInt(seatTotal as any);

    const event = await prisma.event.create({
      data: {
        title,
        description,
        location,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        price: priceInt,
        seatTotal: seatTotalInt,
        seatLeft: seatTotalInt, // Initially seatLeft equals seatTotal
        category,
        imageUrl,
        isPromoted: isPromoted || false,
        organizerId: user.id,
      },
    });

    successResponse(res, "Event created successfully", event);
  } catch (error) {
    logger.error("Error creating event", error);
    next(error);
  }
};

export const updateEvent = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const user = (req as any).user;

    const event = await prisma.event.findUnique({ where: { id } });

    if (!event) {
      throw new AppError(404, "Event not found");
    }

    if (event.organizerId !== user.id) {
        throw new AppError(403, "You are not authorized to update this event");
    }
    
    // Transform dates if present
    if (updateData.startDate) updateData.startDate = new Date(updateData.startDate);
    if (updateData.endDate) updateData.endDate = new Date(updateData.endDate);

    const updatedEvent = await prisma.event.update({
      where: { id },
      data: updateData,
    });

    successResponse(res, "Event updated successfully", updatedEvent);
  } catch (error) {
    logger.error(`Error updating event with id ${req.params.id}`, error);
    next(error);
  }
};

export const deleteEvent = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const user = (req as any).user;

    const event = await prisma.event.findUnique({ where: { id } });

    if (!event) {
      throw new AppError(404, "Event not found");
    }

    if (event.organizerId !== user.id) {
         throw new AppError(403, "You are not authorized to delete this event");
    }

    await prisma.event.delete({ where: { id } });

    successResponse(res, "Event deleted successfully");
  } catch (error) {
    logger.error(`Error deleting event with id ${req.params.id}`, error);
    next(error);
  }
};
