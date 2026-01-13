import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import 'dotenv/config';
import { authRoutes } from "./routes/auth.js";
import tokenRoutes from "./routes/token.js";
import { generationRoutes } from "./routes/generation.js";
import { uploadRoutes } from "./routes/upload.js";
import productsRoutes from "./routes/products.js";
import { materialsRoutes } from "./routes/materials.js";
import { stylesRoutes } from "./routes/styles.js";
import { projectRoutes } from "./routes/projects.js";
import { chatRoutes } from "./routes/chat.js";
import { analyticsRoutes } from "./routes/analytics.js";
import { subscriptionRoutes } from "./routes/subscriptions.js";
import { stripeWebhookRoutes } from "./routes/stripe-webhook.js";
import { razorpayWebhookRoutes } from "./routes/razorpay-webhook.js";
import { Database } from "./db.js";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Initialize database
  await Database.initializeDatabase();

  // Register auth routes
  app.use("/api/auth", authRoutes);
  app.use("/api/token", tokenRoutes);

  // Register other routes
  app.use("/api/generations", generationRoutes);
  app.use("/api/upload", uploadRoutes);
  app.use("/api/products", productsRoutes);
  app.use("/api/materials", materialsRoutes);
  app.use("/api/styles", stylesRoutes);
  app.use("/api/projects", projectRoutes);
  app.use("/api/chat", chatRoutes);
  app.use("/api/analytics", analyticsRoutes);

  // Register subscription routes
  app.use("/api/subscriptions", subscriptionRoutes);
  app.use("/api/subscription", subscriptionRoutes);

  // Register Stripe webhook (must be before express.json middleware in some cases)
  app.use("/api/stripe", stripeWebhookRoutes);

  // Register Razorpay webhook
  app.use("/api/razorpay", razorpayWebhookRoutes);

  return httpServer;
}
