import dotenv from 'dotenv';

dotenv.config();

export const env = {
  DISCORD_TOKEN: process.env.DISCORD_TOKEN || '',
  GROQ_API_KEY: process.env.GROQ_API_KEY || '',
  MONGO_URI: process.env.MONGO_URI || '',
};