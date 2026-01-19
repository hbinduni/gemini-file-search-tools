import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error("Error: GEMINI_API_KEY environment variable is not set");
  console.error("Please set it with: export GEMINI_API_KEY=your_api_key");
  process.exit(1);
}

export const ai = new GoogleGenAI({ apiKey });

// Default model for queries
export const DEFAULT_MODEL = "gemini-2.5-flash";

// Poll interval for async operations (in ms)
export const POLL_INTERVAL = 3000;

// Maximum file size for direct upload (20MB)
export const MAX_DIRECT_UPLOAD_SIZE = 20 * 1024 * 1024;

// Chunk size for large file uploads (10MB)
export const CHUNK_SIZE = 10 * 1024 * 1024;
