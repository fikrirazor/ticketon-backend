import { Request, Response, NextFunction } from "express";
import { Prisma } from "../generated/prisma/client";
import prisma from "../config/database";
import { AppError } from "../utils/error";
import { successResponse } from "../utils/apiResponse";
import { logger } from "../utils/logger";

// Helper to calculate pagination
const getPagination = (page: number, limit: number) => {
  const skip = (page - 1) * limit;
  return { skip, take: limit };
};

export const getEvents = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const { category, location, search } = req.query;

    const { skip, take } = getPagination(page, limit);

    const where: Prisma.EventWhereInput = {
      deletedAt: null,
    };

    if (category) {
      where.category = category as any;
    }

    // Filter by related Location.city instead of a non-existent `location` string on Event
    if (location) {
      where.location = {
        city: { contains: location as string, mode: "insensitive" },
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
          createdAt: "desc",
        },
        include: {
          organizer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          location: {
            select: {
              id: true,
              city: true,
            },
          },
        },
      }),
      prisma.event.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    successResponse(res, "Events retrieved successfully", events, {
      page,
      limit,
      total,
      totalPages,
    });
  } catch (error) {
    logger.error("Error retrieving events", error);
    next(error);
  }
};

export const getEventById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;

    const event = await prisma.event.findFirst({
      where: { id, deletedAt: null },
      include: {
        organizer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        location: {
          select: { id: true, city: true },
        },
      },
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
  next: NextFunction,
): Promise<void> => {
  try {
    // support both locationId (int) or location (city string) + address
    const {
      title,
      description,
      locationId,
      location: locationCity,
      address,
      startDate,
      endDate,
      price,
      seatTotal,
      category,
      imageUrl: bodyImageUrl,
      isPromoted,
    } = req.body;

    const imageUrl = (req as any).file?.path || bodyImageUrl;

    const user = req.user!;
    if (user.role !== "ORGANIZER") {
      throw new AppError(403, "Access denied. Only organizers can create events.");
    }

    // address is required now
    if (!address) {
      throw new AppError(400, "Address is required for an event");
    }

    // Resolve Location: prefer explicit locationId, otherwise find/create by city
    let locationIdToUse: number | undefined;
    if (locationId) {
      locationIdToUse = parseInt(locationId as any);
    } else if (locationCity) {
      const city = (locationCity as string).trim();
      let locationRecord = await prisma.location.findUnique({ where: { city } });
      if (!locationRecord) {
        locationRecord = await prisma.location.create({ data: { city } });
      }
      locationIdToUse = locationRecord.id;
    }

    if (!locationIdToUse) {
      throw new AppError(400, "Location or locationId is required");
    }

    const priceInt = parseInt(price as any);
    const seatTotalInt = parseInt(seatTotal as any);

    const event = await prisma.event.create({
      data: {
        title,
        description,
        address,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        price: priceInt,
        seatTotal: seatTotalInt,
        seatLeft: seatTotalInt, // Initially seatLeft equals seatTotal
        category,
        imageUrl,
        isPromoted: isPromoted || false,
        organizerId: user.id,
        locationId: locationIdToUse,
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
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const user = req.user!;

    const event = await prisma.event.findUnique({ where: { id } });

    if (!event || event.deletedAt) {
      throw new AppError(404, "Event not found");
    }

    if (event.organizerId !== user.id) {
      throw new AppError(403, "You are not authorized to update this event");
    }

    // If updating capacity, check if there are any transactions
    if (updateData.seatTotal !== undefined && updateData.seatTotal !== event.seatTotal) {
      const transactionCount = await prisma.transaction.count({
        where: { eventId: id },
      });

      if (transactionCount > 0) {
        throw new AppError(
          400,
          "Cannot change capacity because transactions already exist for this event",
        );
      }

      // Update seatLeft as well if seatTotal changes
      const diff = updateData.seatTotal - event.seatTotal;
      updateData.seatLeft = event.seatLeft + diff;

      if (updateData.seatLeft < 0) {
        throw new AppError(400, "New capacity is less than sold seats");
      }
    }

    // Transform dates if present
    if (updateData.startDate) updateData.startDate = new Date(updateData.startDate);
    if (updateData.endDate) updateData.endDate = new Date(updateData.endDate);

    // Handle update of location by city string (create if necessary)
    if (updateData.location) {
      const city = (updateData.location as string).trim();
      let locationRecord = await prisma.location.findUnique({ where: { city } });
      if (!locationRecord) {
        locationRecord = await prisma.location.create({ data: { city } });
      }
      updateData.locationId = locationRecord.id;
      delete updateData.location;
    }

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
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const user = req.user!;

    const event = await prisma.event.findUnique({ where: { id } });

    if (!event || event.deletedAt) {
      throw new AppError(404, "Event not found");
    }

    if (event.organizerId !== user.id) {
      throw new AppError(403, "You are not authorized to delete this event");
    }

    // Soft Delete
    await prisma.event.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    successResponse(res, "Event deleted successfully (soft delete)");
  } catch (error) {
    logger.error(`Error deleting event with id ${req.params.id}`, error);
    next(error);
  }
};
