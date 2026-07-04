import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  DATABASE_URL: z.string().optional(),
  JWT_SECRET: z.string().default("dev-secret-change-in-production"),
  JWT_REFRESH_SECRET: z.string().default("dev-refresh-secret-change-in-production"),
  JWT_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
});

export const serverEnv = envSchema.parse(process.env);

export const isDev = serverEnv.NODE_ENV === "development";
