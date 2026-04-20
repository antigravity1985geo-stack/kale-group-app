import { GoogleGenAI } from "@google/genai";
import "dotenv/config";

if (!process.env.GEMINI_API_KEY) {
  console.warn('[Server] ⚠️ GEMINI_API_KEY is not set — AI features will be unavailable');
}

export const genAI = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY || ""
});
