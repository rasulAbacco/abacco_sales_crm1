import { PrismaClient } from "@prisma/client";

const prismaExternalCRM = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL_EXTERNAL, // 👈 make sure it's in .env
    },
  },
});

export default prismaExternalCRM;
