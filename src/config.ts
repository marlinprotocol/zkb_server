import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  RPC: z.string().url(),
  PRIVATE_KEY: z.string(),
  PORT: z.coerce.number(),
  API_KEY: z.string(),
  SERVER_MODE: z.enum(['DEV', 'PROD']),
  PROOF_REWARD: z.coerce.number(),
  MARKET_ID: z.coerce.number(),
  MATCHING_ENGINE_URL: z.string().url(),
  CHECK_INPUT_URL: z.string().url(),
  ASSIGNMENT_DELAY: z.coerce.number().default(10000000000),
  PROOF_GENERATION_DELAY: z.number().default(10000000000),
  CONFIRMATIONS: z.coerce.number().default(30),
  APP_URL: z.string().optional(),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  const formattedErrors = parsedEnv.error.format();

  Object.entries(formattedErrors).forEach(([key, error]) => {
    if (Array.isArray(error)) {
      console.error(`❌ Error for ${key}: ${error.join(', ')}`);
    } else if (error && '_errors' in error) {
      console.error(`❌ Error for ${key}: ${error._errors.join(', ')}`);
    }
  });

  throw new Error('Some environment variables are missing or invalid. Please check the log for details.');
}

const config = parsedEnv.data;

export default config;
