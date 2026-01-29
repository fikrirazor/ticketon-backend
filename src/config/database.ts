import { PrismaPg } from "@prisma/adapter-pg";
import config from "../config/env";
import { PrismaClient } from "../generated/prisma/client";

// Create a singleton instance of PrismaClient
const prismaClientSingleton = () => {
  return new PrismaClient({
    // Konfigurasi logging Prisma
    // Development: hanya log error dan warning (query di-disable agar tidak terlalu verbose)
    // Production: hanya log error
    log:
      config.nodeEnv === "development" ? ["error", "warn"] : ["error"],
    adapter: new PrismaPg({
      connectionString: config.databaseUrl,
    }),
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
