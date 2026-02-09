/**
 * ============================================================================
 * REVIEW CONTROLLER - Mengelola Review/Rating Event
 * ============================================================================
 *
 * File ini berisi semua fungsi untuk mengelola review dan rating event.
 * Review hanya bisa dibuat oleh user yang sudah menghadiri event (status DONE).
 *
 * DAFTAR FUNGSI:
 * --------------
 * 1. createReview()           - Membuat review baru untuk event yang sudah selesai
 * 2. getEventReviews()        - Mengambil semua review untuk event tertentu (dengan pagination & sorting)
 * 3. getOrganizerReviews()    - Mengambil semua review untuk organizer tertentu
 * 4. getEligibleReviews()     - Mengambil daftar event yang bisa direview oleh user
 * 5. updateReview()           - Update review (hanya dalam 24 jam setelah dibuat)
 * 6. deleteReview()           - Hapus review (hanya pemilik review)
 *
 * HELPER FUNCTION:
 * ----------------
 * - updateRatings()           - Update rata-rata rating event dan organizer
 *
 * ATURAN BISNIS:
 * --------------
 * - User hanya bisa review event yang sudah mereka hadiri (transaction status = DONE)
 * - Event harus sudah selesai (endDate sudah lewat)
 * - Satu user hanya bisa review satu event sekali
 * - Review bisa diupdate dalam 24 jam pertama
 * - Setiap perubahan review akan update rating event dan organizer
 *
 * ============================================================================
 */

import { Request, Response, NextFunction } from "express";
import prisma from "../config/database";
import { AppError } from "../utils/error";
import { successResponse } from "../utils/apiResponse";
import { logger } from "../utils/logger";

/**
 * ============================================================================
 * HELPER FUNCTION: updateRatings
 * ============================================================================
 *
 * Fungsi ini digunakan untuk mengupdate rata-rata rating setelah ada perubahan review.
 * Akan mengupdate 2 hal:
 * 1. Rating event (rata-rata dari semua review event tersebut)
 * 2. Rating organizer (rata-rata dari semua review event yang dibuat organizer)
 *
 * @param tx - Prisma transaction object (untuk memastikan atomicity)
 * @param eventId - ID event yang reviewnya berubah
 *
 * CARA KERJA:
 * 1. Ambil data event untuk mendapatkan organizerId
 * 2. Hitung rata-rata rating untuk event tersebut
 * 3. Update field 'rating' di tabel Event
 * 4. Hitung rata-rata rating untuk semua event organizer
 * 5. Update field 'ratingSummary' di tabel User (organizer)
 * ============================================================================
 */
const updateRatings = async (tx: any, eventId: string) => {
  // Ambil data event untuk mendapatkan siapa organizernya
  const event = await tx.event.findUnique({
    where: { id: eventId },
    select: { organizerId: true },
  });

  // Jika event tidak ditemukan, keluar dari fungsi
  if (!event) return;

  const organizerId = event.organizerId;

  // 1. Hitung rata-rata rating untuk event ini
  // aggregate() digunakan untuk menghitung statistik (rata-rata, sum, dll)
  const eventRating = await tx.review.aggregate({
    where: { eventId }, // Ambil semua review untuk event ini
    _avg: { rating: true }, // Hitung rata-rata dari field 'rating'
  });

  // Update rating event dengan hasil perhitungan
  // Jika tidak ada review, set rating = 0
  await tx.event.update({
    where: { id: eventId },
    data: { rating: eventRating._avg.rating || 0 },
  });

  // 2. Hitung rata-rata rating untuk semua event yang dibuat organizer ini
  const organizerRating = await tx.review.aggregate({
    where: { event: { organizerId } }, // Ambil review dari semua event organizer ini
    _avg: { rating: true },
  });

  // Update ratingSummary organizer
  await tx.user.update({
    where: { id: organizerId },
    data: { ratingSummary: organizerRating._avg.rating || 0 },
  });
};

/**
 * ============================================================================
 * FUNCTION 1: createReview
 * ============================================================================
 *
 * Membuat review baru untuk event yang sudah selesai.
 *
 * REQUEST:
 * - Params: eventId (ID event yang akan direview)
 * - Body: { rating: number, comment: string }
 * - Auth: Required (user harus login)
 *
 * VALIDASI:
 * 1. Event harus ada
 * 2. Event harus sudah selesai (endDate sudah lewat)
 * 3. User harus pernah menghadiri event (punya transaction dengan status DONE)
 * 4. User belum pernah review event ini sebelumnya
 *
 * PROSES:
 * 1. Buat review baru
 * 2. Update rating event dan organizer
 *
 * RESPONSE:
 * - Success: Review yang baru dibuat
 * ============================================================================
 */
export const createReview = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    // Ambil data dari request
    const { eventId } = req.params; // ID event dari URL parameter
    const { rating, comment } = req.body; // Rating dan comment dari request body
    const userId = (req as any).user.id; // ID user dari JWT token (sudah di-decode di middleware auth)

    // VALIDASI 1: Cek apakah event ada dan sudah selesai
    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    // Jika event tidak ditemukan, lempar error 404
    if (!event) {
      throw new AppError(404, "Event not found");
    }

    // Jika event belum selesai (tanggal sekarang masih sebelum endDate), lempar error
    /* 
    if (new Date() < event.endDate) {
      throw new AppError(400, "You can only review an event after it has ended");
    }
    */

    // VALIDASI 2: Cek apakah user pernah menghadiri event ini
    // User harus punya transaction dengan status DONE untuk event ini
    const transaction = await prisma.transaction.findFirst({
      where: {
        userId,
        eventId,
        status: "DONE", // Hanya transaction yang sudah selesai
      },
    });

    // Jika tidak ada transaction DONE, berarti user tidak menghadiri event
    if (!transaction) {
      throw new AppError(403, "You can only review events you have attended");
    }

    // VALIDASI 3: Cek apakah user sudah pernah review event ini
    // userId_eventId adalah composite unique key di database
    const existingReview = await prisma.review.findUnique({
      where: {
        userId_eventId: { userId, eventId },
      },
    });

    // Jika sudah ada review, lempar error (satu user hanya bisa review sekali)
    if (existingReview) {
      throw new AppError(400, "You have already reviewed this event");
    }

    // PROSES: Buat review dan update ratings dalam satu transaction
    // Transaction memastikan semua operasi berhasil atau gagal bersama-sama (atomicity)
    const review = await prisma.$transaction(async (tx: any) => {
      // Buat review baru
      const newReview = await tx.review.create({
        data: {
          userId,
          eventId,
          rating,
          comment,
        },
      });

      // Update rating event dan organizer
      await updateRatings(tx, eventId);

      return newReview;
    });

    // Kirim response sukses dengan data review yang baru dibuat
    successResponse(res, "Review created successfully", review);
  } catch (error) {
    // Log error untuk debugging
    logger.error("Error creating review", error);
    // Teruskan error ke error handler middleware
    next(error);
  }
};

/**
 * ============================================================================
 * FUNCTION 2: getEventReviews
 * ============================================================================
 *
 * Mengambil semua review untuk event tertentu dengan pagination dan sorting.
 *
 * REQUEST:
 * - Params: eventId (ID event)
 * - Query:
 *   - page (default: 1)
 *   - limit (default: 10)
 *   - sortBy ("newest" | "highest" | "lowest", default: "newest")
 *
 * FITUR:
 * - Pagination (membagi data menjadi halaman-halaman)
 * - Sorting (urutkan berdasarkan tanggal terbaru, rating tertinggi, atau terendah)
 * - Include data user (nama reviewer)
 *
 * RESPONSE:
 * - Data: Array of reviews dengan info user
 * - Meta: { page, limit, total, totalPages }
 * ============================================================================
 */
export const getEventReviews = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    // Ambil parameter dari request
    const { eventId } = req.params;

    // Pagination: ambil query parameter atau gunakan default
    const page = parseInt(req.query.page as string) || 1; // Halaman ke berapa (default: 1)
    const limit = parseInt(req.query.limit as string) || 10; // Berapa data per halaman (default: 10)
    const sortBy = (req.query.sortBy as string) || "newest"; // Cara sorting (default: terbaru)
    const skip = (page - 1) * limit; // Berapa data yang di-skip (untuk pagination)

    // Tentukan cara sorting berdasarkan query parameter
    let orderBy: any = { createdAt: "desc" }; // Default: urutkan dari terbaru
    if (sortBy === "highest") orderBy = { rating: "desc" }; // Rating tertinggi dulu
    if (sortBy === "lowest") orderBy = { rating: "asc" }; // Rating terendah dulu

    // Jalankan 2 query sekaligus menggunakan Promise.all (lebih efisien)
    // Query 1: Ambil data reviews dengan pagination
    // Query 2: Hitung total reviews (untuk menghitung total halaman)
    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where: { eventId }, // Filter: hanya review untuk event ini
        include: {
          user: {
            select: { id: true, name: true }, // Include nama user yang review
          },
        },
        skip, // Skip data sesuai halaman
        take: limit, // Ambil sejumlah 'limit' data
        orderBy, // Urutkan sesuai pilihan user
      }),
      prisma.review.count({ where: { eventId } }), // Hitung total review
    ]);

    // Hitung total halaman (total data dibagi limit, dibulatkan ke atas)
    const totalPages = Math.ceil(total / limit);

    // Kirim response dengan data reviews dan metadata pagination
    successResponse(res, "Reviews retrieved successfully", reviews, {
      page,
      limit,
      total,
      totalPages,
    });
  } catch (error) {
    logger.error("Error retrieving event reviews", error);
    next(error);
  }
};

/**
 * ============================================================================
 * FUNCTION 3: getOrganizerReviews
 * ============================================================================
 *
 * Mengambil semua review untuk semua event yang dibuat oleh organizer tertentu.
 * Berguna untuk melihat reputasi organizer.
 *
 * REQUEST:
 * - Params: organizerId (ID organizer)
 * - Query: page, limit (untuk pagination)
 *
 * FITUR:
 * - Menampilkan review dari SEMUA event organizer
 * - Include info user (reviewer) dan event (judul event)
 * - Menampilkan rata-rata rating organizer
 *
 * RESPONSE:
 * - Data: Array of reviews
 * - Meta: { page, limit, total, totalPages, averageRating }
 * ============================================================================
 */
export const getOrganizerReviews = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { organizerId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    // Jalankan 3 query sekaligus untuk efisiensi
    const [reviews, total, organizer] = await Promise.all([
      // Query 1: Ambil reviews dari semua event organizer ini
      prisma.review.findMany({
        where: { event: { organizerId } }, // Filter: event yang dibuat organizer ini
        include: {
          user: { select: { id: true, name: true, avatarUrl: true } }, // Info reviewer
          event: { select: { id: true, title: true } }, // Info event yang direview
        },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" }, // Urutkan dari terbaru
      }),
      // Query 2: Hitung total reviews organizer
      prisma.review.count({ where: { event: { organizerId } } }),
      // Query 3: Ambil rata-rata rating organizer
      prisma.user.findUnique({
        where: { id: organizerId },
        select: { ratingSummary: true }, // Field yang menyimpan rata-rata rating
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    // Kirim response dengan tambahan averageRating
    successResponse(res, "Organizer reviews retrieved successfully", reviews, {
      page,
      limit,
      total,
      totalPages,
      averageRating: organizer?.ratingSummary || 0, // Rata-rata rating organizer
    });
  } catch (error) {
    logger.error("Error retrieving organizer reviews", error);
    next(error);
  }
};

/**
 * ============================================================================
 * FUNCTION 4: getEligibleReviews
 * ============================================================================
 *
 * Mengambil daftar event yang BISA direview oleh user yang sedang login.
 * Berguna untuk menampilkan "Event yang belum direview" di frontend.
 *
 * REQUEST:
 * - Auth: Required (user harus login)
 *
 * KRITERIA EVENT YANG BISA DIREVIEW:
 * 1. Event sudah selesai (endDate sudah lewat)
 * 2. User punya transaction dengan status DONE untuk event tersebut
 * 3. User belum pernah review event tersebut
 *
 * RESPONSE:
 * - Data: Array of events yang memenuhi kriteria
 * ============================================================================
 */
export const getEligibleReviews = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = (req as any).user.id;

    // Cari event yang memenuhi 3 kriteria:
    const eligibleEvents = await prisma.event.findMany({
      where: {
        // Kriteria 1: Event sudah selesai
        endDate: { lt: new Date() }, // lt = less than (kurang dari tanggal sekarang)

        // Kriteria 2: User punya transaction DONE untuk event ini
        transactions: {
          some: {
            // some = ada setidaknya satu transaction yang memenuhi kondisi
            userId,
            status: "DONE",
          },
        },

        // Kriteria 3: User belum pernah review event ini
        reviews: {
          none: {
            // none = tidak ada review yang memenuhi kondisi
            userId,
          },
        },
      },
      orderBy: { endDate: "desc" }, // Urutkan dari yang baru selesai
    });

    successResponse(res, "Eligible reviews retrieved successfully", eligibleEvents);
  } catch (error) {
    logger.error("Error retrieving eligible reviews", error);
    next(error);
  }
};

/**
 * ============================================================================
 * FUNCTION 5: updateReview
 * ============================================================================
 *
 * Update review yang sudah dibuat (rating dan/atau comment).
 *
 * REQUEST:
 * - Params: id (ID review)
 * - Body: { rating?: number, comment?: string }
 * - Auth: Required
 *
 * VALIDASI:
 * 1. Review harus ada
 * 2. User harus pemilik review
 * 3. Review hanya bisa diupdate dalam 24 jam pertama setelah dibuat
 *
 * PROSES:
 * 1. Update review
 * 2. Update ulang rating event dan organizer (karena rating berubah)
 *
 * RESPONSE:
 * - Success: Review yang sudah diupdate
 * ============================================================================
 */
export const updateReview = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params; // ID review dari URL
    const { rating, comment } = req.body; // Data baru dari request body
    const userId = (req as any).user.id; // ID user yang sedang login

    // VALIDASI 1: Cek apakah review ada
    const review = await prisma.review.findUnique({
      where: { id },
    });

    if (!review) {
      throw new AppError(404, "Review not found");
    }

    // VALIDASI 2: Cek apakah user adalah pemilik review
    if (review.userId !== userId) {
      throw new AppError(403, "Not authorized to update this review");
    }

    // VALIDASI 3: Cek apakah masih dalam 24 jam setelah review dibuat
    const now = new Date();
    const reviewCreatedAt = new Date(review.createdAt);
    // Hitung selisih waktu dalam jam
    // getTime() mengubah tanggal menjadi milliseconds, lalu dibagi untuk dapat jam
    const diffHours = (now.getTime() - reviewCreatedAt.getTime()) / (1000 * 60 * 60);

    // Jika sudah lebih dari 24 jam, tidak bisa update
    if (diffHours > 24) {
      throw new AppError(400, "Review can only be updated within 24 hours of creation");
    }

    // PROSES: Update review dan rating dalam transaction
    const updatedReview = await prisma.$transaction(async (tx: any) => {
      // Update review dengan data baru
      const ur = await tx.review.update({
        where: { id },
        data: { rating, comment },
      });

      // Update ulang rating event dan organizer karena rating berubah
      await updateRatings(tx, review.eventId);

      return ur;
    });

    successResponse(res, "Review updated successfully", updatedReview);
  } catch (error) {
    logger.error("Error updating review", error);
    next(error);
  }
};

/**
 * ============================================================================
 * FUNCTION 6: deleteReview
 * ============================================================================
 *
 * Menghapus review.
 *
 * REQUEST:
 * - Params: id (ID review)
 * - Auth: Required
 *
 * VALIDASI:
 * 1. Review harus ada
 * 2. User harus pemilik review ATAU role ORGANIZER
 *
 * PROSES:
 * 1. Hapus review
 * 2. Update ulang rating event dan organizer (karena review berkurang)
 *
 * RESPONSE:
 * - Success: Message sukses
 * ============================================================================
 */
export const deleteReview = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params; // ID review dari URL
    const userId = (req as any).user.id; // ID user yang sedang login

    // VALIDASI 1: Cek apakah review ada
    const review = await prisma.review.findUnique({
      where: { id },
    });

    if (!review) {
      throw new AppError(404, "Review not found");
    }

    // VALIDASI 2: Cek authorization
    // User bisa delete review jika:
    // - Dia adalah pemilik review, ATAU
    // - Dia adalah ORGANIZER (moderator)
    if (review.userId !== userId && (req as any).user.role !== "ORGANIZER") {
      throw new AppError(403, "Not authorized to delete this review");
    }

    // PROSES: Hapus review dan update rating dalam transaction
    await prisma.$transaction(async (tx: any) => {
      // Hapus review
      await tx.review.delete({
        where: { id },
      });

      // Update ulang rating event dan organizer karena review berkurang
      await updateRatings(tx, review.eventId);
    });

    successResponse(res, "Review deleted successfully");
  } catch (error) {
    logger.error("Error deleting review", error);
    next(error);
  }
};
