// Re-fetching prisma client
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import config from "../config/env";
import { PrismaClient } from "../generated/prisma";

// Create a singleton instance of PrismaClient
const prismaClientSingleton = () => {
  const pool = new Pool({ connectionString: config.databaseUrl });
  const adapter = new PrismaPg(pool);

  return new PrismaClient({
    // Konfigurasi logging Prisma
    // Development: hanya log error dan warning (query di-disable agar tidak terlalu verbose)
    // Production: hanya log error
    log: config.nodeEnv === "development" ? ["error", "warn"] : ["error"],
    adapter,
  });
};

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>;
}

const prisma = globalThis.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== "production") {
  globalThis.prisma = prisma;
}

export default prisma;
