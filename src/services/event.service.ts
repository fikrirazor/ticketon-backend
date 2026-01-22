import prisma from "../config/database";
import { AppError } from "../middleware/error.middleware";
import { EventType } from "../generated/prisma/client";

interface CreateEventData {
  title: string;
  description: string;
  location: string;
  image?: string;
  startDate: Date;
  endDate: Date;
  price: number;
  seatTotal: number;
  type: EventType;
}

export const createEvent = async (userId: string, data: CreateEventData) => {
  return await prisma.event.create({
    data: {
      ...data,
      organizerId: userId,
      seatLeft: data.seatTotal,
    },
  });
};

export const getEvents = async (query: any) => {
  const { search, category, location, page = 1, limit = 10 } = query;
  const skip = (Number(page) - 1) * Number(limit);
  const take = Number(limit);

  const where: any = {};

  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }

  if (location) {
    where.location = { contains: location, mode: "insensitive" };
  }
  
  // Note: 'category' is not in schema yet, assuming filter by type or future category field
  // For now, let's assume filtering by type if provided, or ignore
  if (category) {
       // if category maps to type
       if (['FREE', 'PAID'].includes(category)) {
           where.type = category;
       }
  }

  const events = await prisma.event.findMany({
    where,
    skip,
    take,
    orderBy: { startDate: "asc" },
    include: {
        organizer: {
            select: { name: true, email: true }
        }
    }
  });

  const total = await prisma.event.count({ where });

  return { events, total };
};

export const getEventById = async (id: string) => {
  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      organizer: {
        select: { name: true, email: true, avatar: true },
      },
      reviews: {
          include: {
              user: { select: { name: true, avatar: true } }
          }
      }
    },
  });

  if (!event) throw new AppError(404, "Event not found");

  return event;
};
