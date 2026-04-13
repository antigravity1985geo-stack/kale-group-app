// Vercel Serverless Function entry point
// Single Source of Truth: imports from server.ts
import "dotenv/config";
import app, { setupPromise } from "../server.js";

// Ensure routes are registered before Vercel starts handling requests
await setupPromise;

export default app;
