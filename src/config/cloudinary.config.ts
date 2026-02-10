import { v2 as cloudinary } from "cloudinary";

// Cloudinary automatically picks up CLOUDINARY_URL from process.env
cloudinary.config();

export default cloudinary;
