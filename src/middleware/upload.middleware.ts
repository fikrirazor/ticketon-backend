import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../config/cloudinary.config";
import { AppError } from "../utils/error";

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, _file) => {
    const subDir = (req as any).uploadDir || "general";
    return {
      folder: `ticketon/${subDir}`,
      allowed_formats: ["jpg", "png", "jpeg"],
      public_id: `${Date.now()}-${Math.round(Math.random() * 1e9)}`,
    };
  },
});

const fileFilter = (_req: any, file: any, cb: any) => {
  const allowedTypes = ["image/jpeg", "image/png", "image/jpg"];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError(400, "Invalid file type. Only JPEG, JPG, and PNG are allowed."), false);
  }
};

export const upload = multer({
  storage,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB limit
  },
  fileFilter,
});
