import { Request, Response, NextFunction } from "express";
import * as eventService from "../services/event.service";
import { AppError } from "../middleware/error.middleware";

export const createEvent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.id;
    // Ensure user is ORGANIZER
    if ((req as any).user.role !== 'ORGANIZER') {
        throw new AppError(403, "Only organizers can create events");
    }

    const event = await eventService.createEvent(userId, req.body);

    res.status(201).json({
      success: true,
      message: "Event created successfully",
      data: event,
    });
  } catch (error) {
    next(error);
  }
};

export const getEvents = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { events, total } = await eventService.getEvents(req.query);
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;

    res.status(200).json({
      success: true,
      data: events,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getEventById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const event = await eventService.getEventById(req.params.id);
    res.status(200).json({
      success: true,
      data: event,
    });
  } catch (error) {
    next(error);
  }
};
