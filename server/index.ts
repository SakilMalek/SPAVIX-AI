import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import ConnectPgSimple from "connect-pg-simple";
import { createServer } from "http";
import { validateRequiredSecrets, getSessionSecret } from "./config/secrets";
import { rateLimit, startRateLimitCleanup } from "./middleware/rateLimit";
import { errorHandler } from "./middleware/errorHandler";
import { securityHeaders, httpsRedirect } from "./middleware/securityHeaders";
import { requestLogger } from "./middleware/requestLogger";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { getPool } from "./db";
import { logger } from "./utils/logger";

const app = express();
const httpServer = createServer(app);

declare module "express-session" {
  interface SessionData {
    userId: string;
    username: string;
    profilePicture: string;
    oauthState?: string;
  }
}

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

const PgSession = ConnectPgSimple(session);

// CORS configuration for Vercel frontend
const allowedOrigins = [
  "https://spavix-ai.vercel.app",
  "https://spavix-vision.vercel.app",
  "http://localhost:5000",
  "http://localhost:3000",
  process.env.FRONTEND_URL, // Allow custom frontend URL via env variable
].filter((url): url is string => Boolean(url));

// HTTPS redirect in production
app.use(httpsRedirect);

// Security headers middleware
app.use(securityHeaders);

// Request logging middleware
app.use(requestLogger);

// Manual CORS middleware without external dependency
app.use((req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  
  if (req.method === "OPTIONS") {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Stricter rate limiting for authentication endpoints (must be BEFORE general /api limit)
const isProduction = process.env.NODE_ENV === 'production';
console.log(`[RateLimit] Environment: NODE_ENV=${process.env.NODE_ENV}, isProduction=${isProduction}`);

app.use(
  "/api/auth/login",
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: isProduction ? 5 : 50, // 5 attempts in production, 50 in development
    keyGenerator: (req) => {
      const email = req.body?.email || req.ip || "unknown";
      return `${req.ip}-${email}`;
    },
    message: "Too many login attempts, please try again later.",
  })
);

app.use(
  "/api/auth/signup",
  rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: isProduction ? 3 : 50, // 3 attempts in production, 50 in development
    keyGenerator: (req) => req.ip || "unknown",
    message: "Too many signup attempts, please try again later.",
  })
);

// Rate limiting middleware - general API rate limit (applied after specific routes)
// Disabled in development mode
if (isProduction) {
  app.use(
    "/api",
    rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // 100 requests per 15 minutes per user/IP
      keyGenerator: (req) => (req as any).user?.id || req.ip || "unknown",
      message: "Too many requests from this IP, please try again later.",
    })
  );
}

// Rate limiting for expensive operations (POST/PUT/DELETE only)
// GET requests for viewing history should not be rate limited
// Disabled in development mode, enabled in production
if (isProduction) {
  app.use(
    "/api/generations",
    (req, res, next) => {
      // Only apply strict rate limiting to POST (create), PUT, DELETE operations
      // GET requests are allowed freely
      if (req.method === "GET") {
        return next();
      }
      
      // Apply rate limiting to POST/PUT/DELETE in production only
      rateLimit({
        windowMs: 60 * 60 * 1000, // 1 hour
        max: 10, // 10 creations per hour per user
        keyGenerator: (req) => (req as any).user?.id || req.ip || "unknown",
        message: "Generation limit exceeded, please try again later.",
      })(req, res, next);
    }
  );
} else {
  console.log('[RateLimit] Generation rate limiting DISABLED in development mode');
}

app.use(
  session({
    store: new PgSession({
      pool: getPool(),
      tableName: 'session',
      createTableIfMissing: true,
    }),
    secret: getSessionSecret(),
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000,
    },
    name: 'sessionId',
  }),
);

app.use(
  express.json({
    limit: '50mb',
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false, limit: '50mb' }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Validate required secrets at startup
  validateRequiredSecrets();

  // Start rate limit cleanup
  startRateLimitCleanup();

  await registerRoutes(httpServer, app);

  // Standardized error handling middleware (must be last)
  app.use(errorHandler);

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();
