import * as yup from "yup";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Define the schema for environment variables
const envSchema = yup.object({
  NODE_ENV: yup.string().oneOf(["development", "production", "test"]).default("development"),
  PORT: yup.number().positive().integer().default(8000),
  DATABASE_URL: yup.string().required("DATABASE_URL is required"),
  DIRECT_URL: yup.string().required("DIRECT_URL is required"),
  JWT_SECRET: yup
    .string()
    .min(32, "JWT_SECRET must be at least 32 characters")
    .required("JWT_SECRET is required"),
  JWT_EXPIRES_IN: yup.string().default("7d"),
  CLOUDINARY_URL: yup.string().required("CLOUDINARY_URL is required"),
});

// Validate and parse environment variables
let env: yup.InferType<typeof envSchema>;

try {
  env = envSchema.validateSync(process.env, {
    abortEarly: false,
    stripUnknown: true,
  });
} catch (error) {
  if (error instanceof yup.ValidationError) {
    console.error("❌ Environment validation failed:");
    error.errors.forEach((err) => console.error(`  - ${err}`));
    process.exit(1);
  }
  throw error;
}

// Export validated environment variables
export const config = {
  nodeEnv: env.NODE_ENV,
  port: env.PORT,
  databaseUrl: env.DATABASE_URL,
  directUrl: env.DIRECT_URL,
  jwt: {
    secret: env.JWT_SECRET,
    expiresIn: env.JWT_EXPIRES_IN,
  },
  CLOUDINARY_URL: env.CLOUDINARY_URL,
} as const;

export default config;
