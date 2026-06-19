import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "../server/routes";
import { poolReady } from "../server/db";
import { initializeDatabase } from "../server/initDb";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

const app = express();
app.set("trust proxy", 1);

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);

const isDev = process.env.NODE_ENV !== "production";

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many login attempts. Please try again in 15 minutes." },
  skip: () => isDev,
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests. Please slow down." },
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many upload requests. Please wait a moment." },
  skip: () => isDev,
});

const publicLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many profile requests. Please slow down." },
  skip: () => isDev,
});

app.use("/api/login", authLimiter);
app.use("/api/register", authLimiter);
app.use("/api/upload", uploadLimiter);
app.use("/api/public", publicLimiter);
app.use("/api", apiLimiter);

app.use(
  express.json({
    limit: "10mb",
  })
);
app.use(express.urlencoded({ extended: false, limit: "10mb" }));

let initialized = false;
let initPromise: Promise<void> | null = null;

async function ensureInitialized() {
  if (initialized) return;
  if (!initPromise) {
    initPromise = (async () => {
      await poolReady;
      await initializeDatabase();
      await registerRoutes(app);

      app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
        const status = err.status || err.statusCode || 500;
        const message = err.message || "Internal Server Error";
        if (res.headersSent) return next(err);
        return res.status(status).json({ message });
      });

      initialized = true;
    })();
  }
  await initPromise;
}

export default async function handler(req: Request, res: Response) {
  await ensureInitialized();
  return app(req, res);
}
