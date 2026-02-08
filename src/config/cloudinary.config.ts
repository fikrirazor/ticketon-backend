import { v2 as cloudinary } from "cloudinary";

// Cloudinary will automatically use the CLOUDINARY_URL environment variable
// if it is present. No need for manual config if the URL is set.
cloudinary.config();

export default cloudinary;
