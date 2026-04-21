import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import helmet from "helmet";
import cors from "cors";
import "dotenv/config";

import { generalLimiter } from "./src/api/middleware/rate-limit.middleware.js";
import authRoutes from "./src/api/routes/auth.routes.js";
import adminRoutes from "./src/api/routes/admin.routes.js";
import ordersRoutes from "./src/api/routes/orders.routes.js";
import paymentRoutes from "./src/api/routes/payment.routes.js";
import accountingRoutes from "./src/api/routes/accounting.routes.js";
import aiRoutes from "./src/api/routes/ai.routes.js";
import rsgeRoutes from "./src/api/routes/rsge.routes.js";
import messagesRoutes from "./src/api/routes/messages.routes.js";
import settingsRoutes from "./src/api/routes/settings.routes.js";
import returnsRoutes from "./src/api/routes/returns.routes.js";

// Optional fallback for Vercel CJS build vs ESM
let currentFileName = "";
let currentDirName = "";
try {
  currentFileName = fileURLToPath(import.meta.url);
  currentDirName = path.dirname(currentFileName);
} catch (e) {
  currentFileName = __filename;
  currentDirName = __dirname;
}

const app = express();
// Trust first proxy to fix express-rate-limit ERR_ERL_KEY_GEN_IPV6
app.set('trust proxy', 1);

async function setupApp() {
  const PORT = 3000;
  console.log(`[Server] Starting in ${process.env.NODE_ENV || 'development'} mode...`);
  console.log(`[Server] Directory: ${currentDirName}`);

  // CSP: disabled in development for hot-reloading, enabled in production for XSS protection
  const isProduction = process.env.NODE_ENV === 'production';
  app.use(helmet({
    contentSecurityPolicy: isProduction ? {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "https://cdn.jsdelivr.net"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"], // Tailwind requires inline styles
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "blob:", "https://*.supabase.co", "https://*.googleapis.com"],
        connectSrc: ["'self'", "https://*.supabase.co", "https://generativelanguage.googleapis.com", "https://api.bog.ge", "https://api.tbcbank.ge", "https://api.credobank.ge"],
        frameAncestors: ["'none'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
      },
    } : false,
  }));

  const allowedOrigins = [
    'https://kale-group.ge',
    'https://www.kale-group.ge',
    'https://admin.kale-group.ge',
    'https://kale-staging.vercel.app',
    process.env.APP_URL,
    ...(process.env.NODE_ENV === 'development' ? ['http://localhost:3000', 'http://localhost:5173'] : []),
  ].filter(Boolean) as string[];

  app.use(cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g., curl, Postman, same-origin Vercel serverless)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      console.warn(`[CORS] Blocked: ${origin}`);
      return callback(new Error(`CORS: origin '${origin}' not allowed`));
    },
    credentials: true,
  }));
  app.use(express.json({ limit: '10mb' }));

  // ── General Rate Limiting: All API endpoints ──
  app.use('/api/', generalLimiter);

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Mount modular routes
  app.use("/api/auth", authRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api/orders", ordersRoutes);
  app.use("/api/pay", paymentRoutes);
  app.use("/api/accounting", accountingRoutes);
  app.use("/api/ai", aiRoutes);
  app.use("/api/rs-ge", rsgeRoutes);
  app.use("/api/messages", messagesRoutes);
  app.use("/api/settings", settingsRoutes);
  app.use("/api/returns", returnsRoutes);

  // ── Global Error Handler (must be after all routes) ──
  app.use((err: any, req: any, res: any, next: any) => {
    // CORS errors
    if (err.message && err.message.includes('CORS')) {
      return res.status(403).json({ error: 'CORS: origin not allowed' });
    }
    // All other unhandled errors
    console.error('[Global Error Handler]', err.message || err);
    res.status(err.status || 500).json({ 
      error: process.env.NODE_ENV === 'production' 
        ? 'სერვერის შეცდომა. გთხოვთ, სცადოთ მოგვიანებით.' 
        : err.message || 'Internal Server Error'
    });
  });

  // Handle front-end static files or Vite only if NOT running as Vercel serverless function
  if (!process.env.VERCEL) {
    if (process.env.NODE_ENV !== "production") {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } else {
      const distPath = path.join(currentDirName, "dist");
      app.use(express.static(distPath));
      app.get("*", (req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    }

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
}

const setupPromise = setupApp();

export { setupPromise };
export default app;
