import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production"]),
  PORT: z.string().default("3000"),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default("7d"),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error("❌ Error en variables de entorno", _env.error.format());
  process.exit(1);
}

export const env = _env.data;
