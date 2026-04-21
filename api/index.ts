// Vercel Serverless Function entry point
// Single Source of Truth: imports from server.ts
import "dotenv/config";
import app, { setupPromise } from "../server.js";

// Export an async handler to ensure routes are registered before handling requests
// without using top-level await (which can break Vercel builds)
export default async (req: any, res: any) => {
  await setupPromise;
  return app(req, res);
};
