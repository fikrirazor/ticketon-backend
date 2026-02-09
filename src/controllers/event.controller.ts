import { Request, Response, NextFunction } from "express";
import { Prisma } from "../generated/prisma/client";
import prisma from "../config/database";
import { AppError } from "../utils/error";
import { successResponse } from "../utils/apiResponse";
import { logger } from "../utils/logger";
import { apiCache } from "../services/cache.service";

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

    // Create a unique cache key based on query parameters
    const cacheKey = `events:${JSON.stringify({ page, limit, category, location, search })}`;
    const cachedData = apiCache.get<{ events: any[]; total: number }>(cacheKey);

    if (cachedData) {
      const totalPages = Math.ceil(cachedData.total / limit);
      return successResponse(res, "Events retrieved successfully (from cache)", cachedData.events, {
        page,
        limit,
        total: cachedData.total,
        totalPages,
      });
    }

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

    // Store in cache for 5 minutes (default)
    apiCache.set(cacheKey, { events, total });

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

    const cacheKey = `event:${id}`;
    const cachedEvent = apiCache.get(cacheKey);

    if (cachedEvent) {
      return successResponse(res, "Event retrieved successfully (from cache)", cachedEvent);
    }

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

    apiCache.set(cacheKey, event);

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
      isPromoted: isPromotedInput,
    } = req.body;

    // Robust boolean parsing for isPromoted (FormData sends strings)
    const isPromoted = isPromotedInput === true || isPromotedInput === "true";

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

    const priceInt = parseInt(price as any) || 0;
    const seatTotalInt = parseInt(seatTotal as any) || 0;

    const event = await prisma.event.create({
      data: {
        title,
        description,
        address,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        price: priceInt,
        seatTotal: seatTotalInt,
        seatLeft: seatTotalInt,
        category,
        imageUrl,
        isPromoted,
        organizerId: user.id,
        locationId: locationIdToUse,
      },
    });

    // Invalidate events list cache
    apiCache.flush();

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

    // Handle Image Update: preserve existing imageUrl if no new file is uploaded
    const imageUrl = (req as any).file?.path || updateData.imageUrl || event.imageUrl;

    // Filter valid fields for Prisma update to avoid "invalid invocation" errors
    const validFields: Prisma.EventUpdateInput = {};
    const schemaFields = [
      "title",
      "description",
      "address",
      "startDate",
      "endDate",
      "price",
      "seatTotal",
      "seatLeft",
      "category",
      "isPromoted",
      "locationId",
    ];

    schemaFields.forEach((field) => {
      if (updateData[field] !== undefined) {
        (validFields as any)[field] = updateData[field];
      }
    });

    // Ensure numeric fields are correctly typed and handle nested fields
    if (validFields.price !== undefined) validFields.price = parseInt(validFields.price as any);
    if (validFields.seatTotal !== undefined)
      validFields.seatTotal = parseInt(validFields.seatTotal as any);
    if (validFields.seatLeft !== undefined)
      validFields.seatLeft = parseInt(validFields.seatLeft as any);

    // Ensure date fields are correctly typed
    if (validFields.startDate !== undefined)
      validFields.startDate = new Date(validFields.startDate as any);
    if (validFields.endDate !== undefined)
      validFields.endDate = new Date(validFields.endDate as any);

    // Prisma's UpdateInput uses nested objects for relations
    if (updateData.locationId !== undefined) {
      const locationId = parseInt(updateData.locationId as any);
      (validFields as any).location = { connect: { id: locationId } };
    }

    // Always set imageUrl even if it hasn't changed (or was already in updateData)
    validFields.imageUrl = imageUrl;

    const updatedEvent = await prisma.event.update({
      where: { id },
      data: validFields,
    });

    // Invalidate caches
    apiCache.del(`event:${id}`);
    apiCache.flush(); // Flush others for simplicity as filtering results might change

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

    // Invalidate caches
    apiCache.del(`event:${id}`);
    apiCache.flush();

    successResponse(res, "Event deleted successfully (soft delete)");
  } catch (error) {
    logger.error(`Error deleting event with id ${req.params.id}`, error);
    next(error);
  }
};

export const getEventAttendees = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const event = await prisma.event.findUnique({
      where: { id },
    });

    if (!event) {
      throw new AppError(404, "Event not found");
    }

    if (event.organizerId !== userId) {
      throw new AppError(403, "Not authorized to view attendees for this event");
    }

    const transactions = await prisma.transaction.findMany({
      where: {
        eventId: id,
        status: "DONE",
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        items: true,
      },
    });

    successResponse(res, "Event attendees retrieved successfully", transactions);
  } catch (error) {
    logger.error(`Error retrieving attendees for event ${req.params.id}`, error);
    next(error);
  }
};
